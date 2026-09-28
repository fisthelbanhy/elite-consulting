/**
 * Emplois — module de référence (portage de `tests/test_emplois.py`).
 * Mêmes cas, mêmes assertions que la suite pytest.
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const DEMANDE = {
	type_annonce: 1,
	domaine_id: 1,
	nom: 'Mabiala',
	prenom: 'grace',
	sexe: 1,
	telephone: '061234567',
	diplomes: 'BAC',
	competences: 'Webdesign, infographie'
};

const OFFRE = {
	type_annonce: 2,
	domaine_id: 1,
	poste_a_pourvoir: 'Développeur web',
	competences: 'Svelte'
};

describe('création', () => {
	it('applique les règles et les formats de référence du legacy', async () => {
		await creerMembre('candidat');
		const h = await entetes('candidat');

		const mauvais = await client()
			.post('/api/emplois')
			.set(h)
			.send({ ...DEMANDE, nom: 'Ma', sexe: null, telephone: '' });
		expect(mauvais.status).toBe(400);
		expect(Object.keys(mauvais.body.champs)).toEqual(
			expect.arrayContaining(['nom', 'sexe', 'telephone'])
		);

		const r = await client().post('/api/emplois').set(h).send(DEMANDE);
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^DEI/);

		// Doublon refusé.
		expect((await client().post('/api/emplois').set(h).send(DEMANDE)).status).toBe(400);

		// L'offre n'exige pas le sexe (ADR-0007 S2b).
		const offre = await client().post('/api/emplois').set(h).send(OFFRE);
		expect(offre.status).toBe(201);
		expect(offre.body.reference).toMatch(/^OE1/);
	});
});

describe('confidentialité des coordonnées', () => {
	it("ne les montre qu'à l'auteur et aux gestionnaires", async () => {
		await creerMembre('candidat');
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });

		const creation = await client()
			.post('/api/emplois')
			.set(await entetes('candidat'))
			.send(DEMANDE);
		const id = creation.body.id;

		const publique = await client().get(`/api/emplois/${id}`);
		expect(publique.body.telephone).toBeNull();
		expect(publique.body.nom).toBeNull();

		const autre = await client().get(`/api/emplois/${id}`).set(await entetes('curieux'));
		expect(autre.body.telephone).toBeNull();
		expect(autre.body.peut_modifier).toBe(false);

		const moi = await client().get(`/api/emplois/${id}`).set(await entetes('candidat'));
		expect(moi.body.telephone).toBe('061234567');
		// Normalisations legacy : nom en majuscules, prénom capitalisé (F-S2-18).
		expect(moi.body.nom).toBe('MABIALA');
		expect(moi.body.prenom).toBe('Grace');

		const admin = await client().get(`/api/emplois/${id}`).set(await entetes('admin'));
		expect(admin.body.peut_moderer).toBe(true);
		expect(admin.body.telephone).toBe('061234567');
	});
});

describe('compteur de visites', () => {
	it('ne compte que les consultations par des tiers', async () => {
		await creerMembre('candidat');
		const h = await entetes('candidat');
		const id = (await client().post('/api/emplois').set(h).send(DEMANDE)).body.id;

		await client().get(`/api/emplois/${id}`).set(h); // auteur : non compté
		await client().get(`/api/emplois/${id}`); // visiteur : compté
		await client().get(`/api/emplois/${id}`); // visiteur : compté

		const detail = await client().get(`/api/emplois/${id}`).set(h);
		expect(detail.body.nombre_visites).toBe(2);
	});
});

describe('droits', () => {
	it('réserve la modification et la modération', async () => {
		await creerMembre('candidat');
		await creerMembre('autre');
		const id = (
			await client()
				.post('/api/emplois')
				.set(await entetes('candidat'))
				.send(DEMANDE)
		).body.id;

		const vol = await client()
			.put(`/api/emplois/${id}`)
			.set(await entetes('autre'))
			.send({ ...DEMANDE, competences: 'Pirate' });
		expect(vol.status).toBe(403);

		// Modération : un gestionnaire sans droit « Activation » est refusé.
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const moderation = await client()
			.post(`/api/emplois/${id}/etat`)
			.set(await entetes('admin_sans_droit'))
			.send({ etat: 3 });
		expect(moderation.status).toBe(403);
	});
});

describe('expressions d’intérêt', () => {
	it('sont uniques, notifient l’auteur, et interdites sur sa propre fiche', async () => {
		await creerMembre('recruteur');
		await creerMembre('candidat');
		const hr = await entetes('recruteur');
		const id = (await client().post('/api/emplois').set(hr).send(OFFRE)).body.id;

		const h = await entetes('candidat');
		const premier = await client().post(`/api/emplois/${id}/interet`).set(h).send({ message: '' });
		expect(premier.status).toBe(201);
		expect(premier.body.message).toContain('Intéressement');

		const second = await client()
			.post(`/api/emplois/${id}/interet`)
			.set(h)
			.send({ message: 'encore' });
		expect(second.status).toBe(400);

		// L'auteur voit la contribution et a reçu un message de la frangine.
		const detail = await client().get(`/api/emplois/${id}`).set(hr);
		expect(detail.body.interets).toHaveLength(1);
		expect(detail.body.interets[0].membre.pseudonyme).toBe('candidat');

		const compteurs = await client().get('/api/espace/compteurs').set(hr);
		expect(compteurs.body.messages_non_lus).toBe(1);

		// Impossible sur sa propre fiche.
		const soiMeme = await client().post(`/api/emplois/${id}/interet`).set(hr).send({});
		expect(soiMeme.status).toBe(400);
	});
});

describe('liste publique', () => {
	it('filtre, recherche et respecte la visibilité', async () => {
		await creerMembre('candidat');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('candidat');
		const id = (await client().post('/api/emplois').set(h).send(DEMANDE)).body.id;
		await client().post('/api/emplois').set(h).send(OFFRE);

		expect((await client().get('/api/emplois?type=2')).body.total).toBe(1);
		expect((await client().get('/api/emplois?q=webdesign')).body.total).toBe(1);

		// Dépubliée par un gestionnaire habilité.
		await client()
			.post(`/api/emplois/${id}/etat`)
			.set(await entetes('admin'))
			.send({ etat: 1 });

		expect((await client().get('/api/emplois')).body.total).toBe(1); // le public ne la voit plus
		expect((await client().get('/api/emplois').set(h)).body.total).toBe(2); // l'auteur la voit

		const compteurs = await client().get('/api/emplois/compteurs');
		expect(compteurs.body).toEqual({ demandes: 0, offres: 1 });
	});
});
