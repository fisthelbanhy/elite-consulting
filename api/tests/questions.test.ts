/**
 * Forum « Questions & conseils » (portage de `tests/test_questions.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const SUJET = {
	confidentialite: 2,
	objet: 'Ouvrir un compte bancaire',
	texte: "Quels papiers faut-il pour ouvrir un compte d'entreprise ?"
};

const PRIVE = {
	confidentialite: 1,
	objet: 'Mon projet de boulangerie',
	texte: "J'aimerais un avis confidentiel sur mon projet de boulangerie."
};

describe('création', () => {
	it('applique les règles, la référence et refuse les doublons', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		expect((await client().post('/api/questions').send(SUJET)).status).toBe(401);

		const incomplet = await client()
			.post('/api/questions')
			.set(h)
			.send({ confidentialite: null, objet: 'Aide', texte: 'Trop court' });
		expect(incomplet.status).toBe(400);
		expect(incomplet.body.champs.objet).toBe("L'objet du conseil doit avoir 5 caractères minimum.");
		expect(incomplet.body.champs.texte).toBe(
			'Le texte du conseil doit avoir 20 caractères minimum.'
		);
		expect(incomplet.body.champs).toHaveProperty('confidentialite');

		const r = await client().post('/api/questions').set(h).send(SUJET);
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^CSL/);

		// Même objet (casse différente) : refusé.
		const doublon = await client()
			.post('/api/questions')
			.set(h)
			.send({ ...SUJET, objet: 'ouvrir un COMPTE bancaire' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette fiche est déjà enregistrée.');

		const id = (await client().get('/api/questions')).body.items[0].id;
		// Publié immédiatement (F-S1-11).
		expect((await client().get(`/api/questions/${id}`)).body.etat).toBe(2);
	});
});

describe('sujet privé', () => {
	it("n'est visible que de son auteur et des gestionnaires (ADR-0007 S1a)", async () => {
		await creerMembre('awa');
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');

		const idPrive = (await client().post('/api/questions').set(h).send(PRIVE)).body.id;
		await client().post('/api/questions').set(h).send(SUJET);

		// Visiteur et autre membre : ni dans la liste, ni la recherche, ni le détail.
		expect((await client().get('/api/questions')).body.total).toBe(1);
		expect((await client().get('/api/questions?q=boulangerie')).body.total).toBe(0);
		expect((await client().get(`/api/questions/${idPrive}`)).status).toBe(404);

		const hc = await entetes('curieux');
		expect((await client().get(`/api/questions/${idPrive}`).set(hc)).status).toBe(404);
		expect(
			(await client().post(`/api/questions/${idPrive}/reponses`).set(hc).send({ texte: 'Coucou' }))
				.status
		).toBe(404);
		expect((await client().get('/api/questions/derniers')).body[0].objet).toBe(SUJET.objet);
		expect((await client().get('/api/questions/compteurs')).body).toEqual({ sujets: 1 });

		// Auteur et gestionnaire.
		expect((await client().get('/api/questions').set(h)).body.total).toBe(2);
		const ha = await entetes('admin');
		const admin = await client().get(`/api/questions/${idPrive}`).set(ha);
		expect(admin.body.texte).toBe(PRIVE.texte);
		expect(admin.body.auteur_nom).toBe('Awa Test');

		// La frangine est prévenue d'une question privée (message dans le fil de l'auteur).
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);
	});
});

describe('identité', () => {
	it('réserve le nom réel au gestionnaire, à l’auteur et au Master', async () => {
		await creerMembre('awa', { pseudonyme: 'awa_b' });
		await creerMembre('master', { type_compte: TypeMembre.MASTER });
		const id = (
			await client()
				.post('/api/questions')
				.set(await entetes('awa'))
				.send(SUJET)
		).body.id;

		const publique = await client().get(`/api/questions/${id}`);
		expect(publique.body.auteur.pseudonyme).toBe('awa_b');
		expect(publique.body.auteur_nom).toBeNull();
		expect(publique.body.auteur).not.toHaveProperty('telephone');

		const master = await client()
			.get(`/api/questions/${id}`)
			.set(await entetes('master'));
		expect(master.body.auteur_nom).toBe('Awa Test');
	});
});

describe('réponses', () => {
	it('héritent, comptent et notifient correctement', async () => {
		await creerMembre('awa');
		await creerMembre('bob');
		const ha = await entetes('awa');
		const hb = await entetes('bob');
		const id = (await client().post('/api/questions').set(ha).send(SUJET)).body.id;

		const courte = await client()
			.post(`/api/questions/${id}/reponses`)
			.set(hb)
			.send({ texte: 'x' });
		expect(courte.body.champs.texte).toBe('Le commentaire doit avoir 2 caractères minimum.');

		const r = await client()
			.post(`/api/questions/${id}/reponses`)
			.set(hb)
			.send({ texte: "Un Kbis et une pièce d'identité." });
		expect(r.status).toBe(201);
		const rid = r.body.id;

		expect(
			(
				await client()
					.post(`/api/questions/${id}/reponses`)
					.set(hb)
					.send({ texte: "Un Kbis et une pièce d'identité." })
			).status
		).toBe(400);

		const detail = await client().get(`/api/questions/${id}`);
		expect(detail.body.nombre_reponses).toBe(1);
		expect(detail.body.reponses[0].texte).toMatch(/^Un Kbis/);
		// Visiteur : il faut un compte pour répondre.
		expect(detail.body.peut_repondre).toBe(false);

		// L'auteur du sujet est prévenu.
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);

		// Modification de sa réponse (sans contrainte de 20 caractères, F-S1-16), pas celle des autres.
		expect(
			(await client().put(`/api/questions/reponses/${rid}`).set(hb).send({ texte: 'OK' })).status
		).toBe(200);
		expect(
			(await client().put(`/api/questions/reponses/${rid}`).set(ha).send({ texte: 'Pirate' })).status
		).toBe(403);

		// Suppression logique : le compteur est recalculé (le legacy ne décomptait jamais).
		expect((await client().delete(`/api/questions/reponses/${rid}`).set(hb)).status).toBe(200);
		const apres = await client().get(`/api/questions/${id}`);
		expect(apres.body.nombre_reponses).toBe(0);
		expect(apres.body.reponses).toEqual([]);
	});
});

describe('confidentialité', () => {
	it('est héritée par les réponses lors d’une modification (F-S1-15)', async () => {
		await creerMembre('awa');
		await creerMembre('bob');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const ha = await entetes('awa');
		const id = (await client().post('/api/questions').set(ha).send(SUJET)).body.id;
		await client()
			.post(`/api/questions/${id}/reponses`)
			.set(await entetes('bob'))
			.send({ texte: 'Réponse publique' });

		// Autre membre : interdit.
		expect(
			(
				await client()
					.put(`/api/questions/${id}`)
					.set(await entetes('bob'))
					.send({ ...SUJET, texte: 'x'.repeat(30) })
			).status
		).toBe(403);

		// L'auteur passe le sujet en privé : sujet et réponses disparaissent du public.
		const r = await client()
			.put(`/api/questions/${id}`)
			.set(ha)
			.send({ ...SUJET, confidentialite: 1 });
		expect(r.status).toBe(200);
		expect(r.body.message).toBe('Modification effectuée.');
		expect((await client().get(`/api/questions/${id}`)).status).toBe(404);

		const detail = await client()
			.get(`/api/questions/${id}`)
			.set(await entetes('admin'));
		expect(detail.body.confidentialite).toBe(1);
		expect(detail.body.reponses).toHaveLength(1);
	});
});

describe('modération', () => {
	it('gère clôture, retrait et suppression', async () => {
		await creerMembre('awa');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const ha = await entetes('awa');
		const id = (await client().post('/api/questions').set(ha).send(SUJET)).body.id;

		expect(
			(
				await client()
					.post(`/api/questions/${id}/etat`)
					.set(await entetes('admin_sans_droit'))
					.send({ etat: 3 })
			).status
		).toBe(403);

		const hadm = await entetes('admin');
		// Clôturé : toujours lisible, plus de réponse possible.
		expect((await client().post(`/api/questions/${id}/etat`).set(hadm).send({ etat: 4 })).status).toBe(200);
		expect((await client().get(`/api/questions/${id}`)).status).toBe(200);
		const cloture = await client()
			.post(`/api/questions/${id}/reponses`)
			.set(ha)
			.send({ texte: 'Encore une question' });
		expect(cloture.status).toBe(400);
		expect(cloture.body.message).toContain('clôturé');

		// Non traité : masqué au public, visible de l'auteur.
		await client().post(`/api/questions/${id}/etat`).set(hadm).send({ etat: 1 });
		expect((await client().get(`/api/questions/${id}`)).status).toBe(404);
		expect((await client().get(`/api/questions/${id}`).set(ha)).status).toBe(200);

		// Suppression logique par le gestionnaire habilité.
		expect((await client().delete(`/api/questions/${id}`).set(hadm)).status).toBe(200);
		expect((await client().get(`/api/questions/${id}`).set(ha)).status).toBe(404);
		expect((await client().get('/api/questions').set(hadm)).body.total).toBe(0);
		expect((await client().get('/api/questions?etat=3').set(hadm)).body.total).toBe(1);
	});
});
