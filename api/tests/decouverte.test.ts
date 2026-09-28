/**
 * Découverte de soi et diagnostic gratuit (portage de `tests/test_decouverte.py`).
 */
import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { message } from '../src/schema/contenu.js';

basePropre();

const FICHE = {
	activite_actuelle: 'Vendeuse de pagnes au marché Total',
	savoir_faire: 'Couture',
	idee_vue_chez_autrui: 2,
	est_meneur: 1,
	pourcentage_implication: 80,
	soutien_conjoint: 1,
	confronte_aux_faits: 2,
	notes_membre: 'Je voudrais être rappelée le matin.'
};

const DIAGNOSTIC = {
	activite: 'independant',
	savoir_faire: 'beaute',
	stade: 'debut',
	besoin: 'financement',
	disponibilite: 'plein',
	moyens: 'rien',
	soutien: 'oui',
	ville: '2'
};

function messages(membreId: number) {
	return db.select().from(message).where(eq(message.membre_id, membreId)).orderBy(asc(message.id)).all();
}

describe('fiche du membre', () => {
	it('est unique, référencée LSG, et restitue fidèlement les réponses', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		expect((await client().get('/api/decouverte/moi').set(h)).body).toBeNull();

		const r = await client().post('/api/decouverte').set(h).send(FICHE);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^LSG/);

		// Une seule fiche par membre.
		const r2 = await client().post('/api/decouverte').set(h).send(FICHE);
		expect(r2.status).toBe(400);
		expect(r2.body.message).toBe('Fiche de découverte de soi du membre déjà enregistrée.');

		const moi = (await client().get('/api/decouverte/moi').set(h)).body;
		// Oui/Non, pourcentage et question 26 restitués fidèlement (F-S1-21, bug legacy zone 26).
		expect(moi.idee_vue_chez_autrui).toBe(2);
		expect(moi.soutien_conjoint).toBe(1);
		expect(moi.confronte_aux_faits).toBe(2);
		expect(moi.pourcentage_implication).toBe(80);
		expect(moi.peut_modifier).toBe(true);
		expect(moi.est_proprietaire).toBe(true);
		expect(moi.notes_conseillere).toBe('');
		expect(moi.cloturee).toBe(2);

		// Valeurs hors bornes refusées.
		const hors = await client()
			.put(`/api/decouverte/${moi.id}`)
			.set(h)
			.send({ ...FICHE, pourcentage_implication: 120, est_sociable: 5 });
		expect(hors.status).toBe(422);
		expect(Object.keys(hors.body.champs)).toEqual(
			expect.arrayContaining(['pourcentage_implication', 'est_sociable'])
		);
	});
});

describe('confidentialité', () => {
	it('réserve la fiche au membre concerné et aux gestionnaires', async () => {
		await creerMembre('awa');
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });

		const id = (
			await client()
				.post('/api/decouverte')
				.set(await entetes('awa'))
				.send(FICHE)
		).body.id;

		expect((await client().get(`/api/decouverte/${id}`)).status).toBe(401);
		const hc = await entetes('curieux');
		expect((await client().get(`/api/decouverte/${id}`).set(hc)).status).toBe(404);
		expect((await client().get('/api/decouverte').set(hc)).status).toBe(403);

		const ha = await entetes('admin');
		const liste = await client().get('/api/decouverte').set(ha);
		expect(liste.body.total).toBe(1);
		expect(liste.body.items[0].membre.nom).toBe('Awa Test');
		expect((await client().get('/api/decouverte?q=awa').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/decouverte?q=zzz').set(ha)).body.total).toBe(0);
	});
});

describe('correspondance la frangine', () => {
	it("n'est écrite que par un gestionnaire et prévient le membre", async () => {
		const membreId = await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');
		const id = (await client().post('/api/decouverte').set(h).send(FICHE)).body.id;

		const refus = await client()
			.put(`/api/decouverte/${id}/correspondance`)
			.set(h)
			.send({ notes_conseillere: 'Moi' });
		expect(refus.status).toBe(403);

		// Le membre ne peut pas non plus la glisser dans sa propre modification.
		await client()
			.put(`/api/decouverte/${id}`)
			.set(h)
			.send({ ...FICHE, notes_conseillere: 'Tentative' });
		expect((await client().get('/api/decouverte/moi').set(h)).body.notes_conseillere).toBe('');

		const r = await client()
			.put(`/api/decouverte/${id}/correspondance`)
			.set(await entetes('admin'))
			.send({ notes_conseillere: 'Passez au bureau mardi.' });
		expect(r.status).toBe(200);
		expect((await client().get('/api/decouverte/moi').set(h)).body.notes_conseillere).toBe(
			'Passez au bureau mardi.'
		);
		expect(messages(membreId).at(-1)!.de_la_frangine).toBe(true);
	});
});

describe('clôture et réouverture', () => {
	it('gèle la fiche puis la rouvre (ADR-0007 S1c)', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');
		const id = (await client().post('/api/decouverte').set(h).send(FICHE)).body.id;

		expect(
			(await client().post(`/api/decouverte/${id}/cloture`).set(h).send({ cloturee: true })).status
		).toBe(200);
		const moi = (await client().get('/api/decouverte/moi').set(h)).body;
		expect(moi.cloturee).toBe(1);
		expect(moi.peut_modifier).toBe(false);

		const bloque = await client().put(`/api/decouverte/${id}`).set(h).send(FICHE);
		expect(bloque.status).toBe(400);
		expect(bloque.body.message).toContain('rouvrez');

		// Pas de nouvelle fiche possible, mais réouverture.
		expect((await client().post('/api/decouverte').set(h).send(FICHE)).status).toBe(400);
		expect(
			(await client().post(`/api/decouverte/${id}/cloture`).set(h).send({ cloturee: false })).status
		).toBe(200);
		expect((await client().put(`/api/decouverte/${id}`).set(h).send(FICHE)).status).toBe(200);

		// État de suivi : gestionnaire habilité seulement.
		expect((await client().post(`/api/decouverte/${id}/etat`).set(h).send({ etat: 1 })).status).toBe(
			403
		);
		const ha = await entetes('admin');
		expect((await client().post(`/api/decouverte/${id}/etat`).set(ha).send({ etat: 1 })).status).toBe(
			200
		);
		expect((await client().get(`/api/decouverte/${id}`).set(ha)).body.etat_fiche).toBe(1);
	});
});

describe('suppression', () => {
	it('est réservée au gestionnaire habilité et la fiche est reprise à blanc', async () => {
		await creerMembre('awa');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');
		const id = (await client().post('/api/decouverte').set(h).send(FICHE)).body.id;

		expect((await client().delete(`/api/decouverte/${id}`).set(h)).status).toBe(403);
		expect(
			(await client().delete(`/api/decouverte/${id}`).set(await entetes('admin_sans_droit'))).status
		).toBe(403);
		const ha = await entetes('admin');
		expect((await client().delete(`/api/decouverte/${id}`).set(ha)).status).toBe(200);
		expect((await client().get('/api/decouverte').set(ha)).body.total).toBe(0);
		expect((await client().get('/api/decouverte/moi').set(h)).body).toBeNull();

		// Le membre peut repartir : la fiche (unique) est reprise à blanc, même référence.
		const reprise = await client().post('/api/decouverte').set(h).send({ savoir_faire: 'Cuisine' });
		expect(reprise.status).toBe(201);
		expect(reprise.body.id).toBe(id);
		expect((await client().get('/api/decouverte/moi').set(h)).body.activite_actuelle).toBe('');
	});
});

describe('diagnostic gratuit', () => {
	it('expose ses questions et sa restitution sans compte', async () => {
		const questions = (await client().get('/api/decouverte/diagnostic/questions')).body;
		expect(questions.map((q: { cle: string }) => q.cle)).toEqual([
			'activite',
			'savoir_faire',
			'stade',
			'besoin',
			'disponibilite',
			'moyens',
			'soutien',
			'ville'
		]);
		expect(questions.at(-1).options[0].libelle).toBe('Brazzaville');

		const sansStade = await client()
			.post('/api/decouverte/diagnostic/restitution')
			.send({ ...DIAGNOSTIC, stade: '' });
		expect(sansStade.status).toBe(400);
		expect(sansStade.body.champs).toHaveProperty('stade');

		const codeInconnu = await client()
			.post('/api/decouverte/diagnostic/restitution')
			.send({ ...DIAGNOSTIC, besoin: 'pirater' });
		expect(codeInconnu.status).toBe(400);
		expect(codeInconnu.body.champs).toHaveProperty('besoin');

		const res = (await client().post('/api/decouverte/diagnostic/restitution').send(DIAGNOSTIC)).body;
		expect(res.profil.titre).toBe('Entrepreneur·e qui démarre');
		expect(res.etapes).toHaveLength(3);
		expect(res.etapes[0].href).toBe('/likelemba');
		expect(res.etapes.every((e: { href: string }) => e.href.startsWith('/'))).toBe(true);
		expect(res.resume).toContain('Brazzaville');
		expect(res.reponses).toHaveLength(8);
	});

	it('crée puis complète la fiche et prévient la conseillère une seule fois', async () => {
		const membreId = await creerMembre('awa');
		const h = await entetes('awa');
		expect((await client().post('/api/decouverte/diagnostic').send(DIAGNOSTIC)).status).toBe(401);

		const r = await client().post('/api/decouverte/diagnostic').set(h).send(DIAGNOSTIC);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^LSG/);

		const moi = (await client().get('/api/decouverte/moi').set(h)).body;
		expect(moi.activite_actuelle).toBe("J'ai déjà une petite activité");
		expect(moi.entourage_valorise_activite).toBe(1);
		expect(moi.a_deja_fait_commerce).toBe(1);
		expect(moi.diagnostic.codes.besoin).toBe('financement');
		expect(moi.date_diagnostic).toBeTruthy();

		const fil = messages(membreId);
		expect(fil).toHaveLength(1);
		expect(fil[0]!.de_la_frangine).toBe(false);
		expect(fil[0]!.texte.startsWith('Nouveau diagnostic')).toBe(true);

		// Double envoi : pas de second message.
		await client().post('/api/decouverte/diagnostic').set(h).send(DIAGNOSTIC);
		expect(messages(membreId)).toHaveLength(1);
	});

	it('ne remplace pas les réponses déjà écrites par le membre', async () => {
		const membreId = await creerMembre('awa');
		const h = await entetes('awa');
		const id = (await client().post('/api/decouverte').set(h).send(FICHE)).body.id;
		await client().post(`/api/decouverte/${id}/cloture`).set(h).send({ cloturee: true });

		const r = await client()
			.post('/api/decouverte/diagnostic')
			.set(h)
			.send({ ...DIAGNOSTIC, besoin: 'clients' });
		expect(r.body.id).toBe(id);

		const moi = (await client().get('/api/decouverte/moi').set(h)).body;
		expect(moi.activite_actuelle).toBe(FICHE.activite_actuelle); // conservé
		expect(moi.moyens_disponibles).toBe("Rien pour l'instant"); // complété
		expect(moi.cloturee).toBe(2); // un nouveau diagnostic rouvre le suivi
		expect(moi.diagnostic.etapes[0].href).toBe('/marches');
		expect(messages(membreId)).toHaveLength(1);
	});
});
