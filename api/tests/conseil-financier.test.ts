/**
 * Forum « Conseil financier » (portage de `tests/test_conseil_financier.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const SUJET = {
	rubrique: 1,
	objet: 'Ouvrir un compte épargne',
	texte: 'Quelle banque choisir pour épargner ?'
};

function gestionnaire(identifiant = 'conseiller', activation = true) {
	return creerMembre(identifiant, {
		type_compte: TypeMembre.GESTIONNAIRE,
		droit_activation: activation
	});
}

describe('accès', () => {
	it('est réservé aux membres connectés (F-S7-02)', async () => {
		expect((await client().get('/api/conseil-financier')).status).toBe(401);
		expect((await client().post('/api/conseil-financier').send(SUJET)).status).toBe(401);
	});
});

describe('création', () => {
	it('applique la référence, la confidentialité et les règles legacy', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const court = await client()
			.post('/api/conseil-financier')
			.set(h)
			.send({ ...SUJET, objet: 'x', texte: '' });
		expect(court.status).toBe(400);
		expect(Object.keys(court.body.champs)).toEqual(expect.arrayContaining(['objet', 'texte']));

		const r = await client().post('/api/conseil-financier').set(h).send(SUJET);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^CFR/);
		const sujet = (await client().get(`/api/conseil-financier/${r.body.id}`).set(h)).body;
		expect(sujet.confidentialite).toBe(1);
		expect(sujet.etat).toBe(2);
		expect(sujet.peut_modifier).toBe(true);

		// Un seul sujet ouvert par rubrique pour un membre (F-S7-03).
		const second = await client()
			.post('/api/conseil-financier')
			.set(h)
			.send({ ...SUJET, objet: 'Autre question' });
		expect(second.status).toBe(400);
		expect(second.body.message).toContain('clôturer le précédent');

		// … mais la rubrique « Rumeurs » est indépendante, et toujours publique.
		const rumeur = await client()
			.post('/api/conseil-financier')
			.set(h)
			.send({ ...SUJET, rubrique: 2, confidentialite: 1 });
		expect(rumeur.status).toBe(201);
		expect(
			(await client().get(`/api/conseil-financier/${rumeur.body.id}`).set(h)).body.confidentialite
		).toBe(2);
	});

	it('signale le doublon d’objet, que le legacy refusait sans message (F-S7-05)', async () => {
		await creerMembre('awa');
		await gestionnaire();
		await client()
			.post('/api/conseil-financier')
			.set(await entetes('awa'))
			.send(SUJET);
		const r = await client()
			.post('/api/conseil-financier')
			.set(await entetes('conseiller'))
			.send({ ...SUJET, objet: SUJET.objet.toUpperCase() });
		expect(r.status).toBe(400);
		expect(r.body.message).toContain('même objet');
	});
});

describe('confidentialité', () => {
	it("réserve un sujet privé à son auteur et aux gestionnaires (F-S7-07)", async () => {
		await creerMembre('awa');
		await creerMembre('curieux');
		await gestionnaire();
		const id = (
			await client()
				.post('/api/conseil-financier')
				.set(await entetes('awa'))
				.send(SUJET)
		).body.id;

		const hc = await entetes('curieux');
		expect((await client().get(`/api/conseil-financier/${id}`).set(hc)).status).toBe(404);
		expect((await client().get('/api/conseil-financier?rubrique=1').set(hc)).body.total).toBe(0);
		expect(
			(
				await client()
					.get('/api/conseil-financier?rubrique=1')
					.set(await entetes('conseiller'))
			).body.total
		).toBe(1);

		// Un sujet public est lisible et ouvert aux réponses de tous les membres.
		const pub = (
			await client()
				.post('/api/conseil-financier')
				.set(await entetes('awa'))
				.send({ ...SUJET, rubrique: 2 })
		).body.id;
		expect((await client().get(`/api/conseil-financier/${pub}`).set(hc)).body.peut_modifier).toBe(
			false
		);
		expect(
			(
				await client()
					.post(`/api/conseil-financier/${pub}/reponses`)
					.set(hc)
					.send({ texte: 'Très utile' })
			).status
		).toBe(201);
	});
});

describe('réponses', () => {
	it('héritent du sujet, refusent le doublon, comptent et notifient', async () => {
		await creerMembre('awa');
		await gestionnaire();
		const h = await entetes('awa');
		const id = (await client().post('/api/conseil-financier').set(h).send(SUJET)).body.id;
		const hg = await entetes('conseiller');

		expect(
			(await client().post(`/api/conseil-financier/${id}/reponses`).set(hg).send({ texte: 'x' }))
				.status
		).toBe(400);
		const r = await client()
			.post(`/api/conseil-financier/${id}/reponses`)
			.set(hg)
			.send({ texte: 'Regardez les dépôts à terme.' });
		expect(r.status).toBe(201);

		const doublon = await client()
			.post(`/api/conseil-financier/${id}/reponses`)
			.set(hg)
			.send({ texte: 'Regardez les dépôts à terme.' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce message est déjà envoyé.');

		const sujet = (await client().get(`/api/conseil-financier/${id}`).set(h)).body;
		expect(sujet.nombre_reponses).toBe(1);
		expect(sujet.repondu_par_conseiller).toBe(true);
		expect(sujet.reponses[0].de_la_frangine).toBe(true);

		// L'auteur est prévenu dans sa messagerie.
		expect((await client().get('/api/espace/compteurs').set(h)).body.messages_non_lus).toBe(1);
	});
});

describe('modification et clôture', () => {
	it('laisse un simple membre modifier son sujet (F-S7-08) puis le clôturer', async () => {
		await creerMembre('awa');
		await creerMembre('autre');
		await gestionnaire('sans_droit', false);
		const h = await entetes('awa');
		const id = (await client().post('/api/conseil-financier').set(h).send(SUJET)).body.id;
		const modif = { objet: 'Ouvrir un compte épargne rémunéré', texte: 'Précision' };

		expect((await client().put(`/api/conseil-financier/${id}`).set(h).send(modif)).status).toBe(200);
		expect(
			(
				await client()
					.put(`/api/conseil-financier/${id}`)
					.set(await entetes('autre'))
					.send(modif)
			).status
		).toBe(404);

		// La clôture est réservée à l'auteur et aux gestionnaires ; un sujet clôturé refuse les
		// réponses.
		expect(
			(
				await client()
					.post(`/api/conseil-financier/${id}/etat`)
					.set(await entetes('sans_droit'))
					.send({ etat: 4 })
			).status
		).toBe(403);
		expect((await client().post(`/api/conseil-financier/${id}/cloture`).set(h)).status).toBe(200);
		expect(
			(
				await client()
					.post(`/api/conseil-financier/${id}/reponses`)
					.set(h)
					.send({ texte: 'Encore une question' })
			).status
		).toBe(400);

		// Une fois clôturé, un nouveau sujet est possible.
		expect(
			(
				await client()
					.post('/api/conseil-financier')
					.set(h)
					.send({ ...SUJET, objet: 'Nouvelle question' })
			).status
		).toBe(201);
		const compteurs = (await client().get('/api/conseil-financier/compteurs').set(h)).body;
		expect(compteurs.conseil).toBe(2);
		expect(compteurs.sujet_ouvert_conseil).not.toBeNull();
	});
});

describe('recherche et suppression', () => {
	it('retrouve un sujet par son texte et décompte la réponse supprimée', async () => {
		await creerMembre('awa');
		await gestionnaire();
		const h = await entetes('awa');
		const id = (
			await client()
				.post('/api/conseil-financier')
				.set(h)
				.send({ ...SUJET, rubrique: 2 })
		).body.id;
		const rep = (
			await client().post(`/api/conseil-financier/${id}/reponses`).set(h).send({ texte: 'Mon avis' })
		).body.id;

		expect((await client().get('/api/conseil-financier?q=épargner').set(h)).body.total).toBe(1);
		expect((await client().get('/api/conseil-financier?q=introuvable').set(h)).body.total).toBe(0);
		expect((await client().delete(`/api/conseil-financier/${rep}`).set(h)).status).toBe(200);
		expect(
			(await client().get(`/api/conseil-financier/${id}`).set(h)).body.nombre_reponses
		).toBe(0);
	});
});
