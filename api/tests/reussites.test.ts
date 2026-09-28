/**
 * Réussites entrepreneuriales (portage de `tests/test_reussites.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes, imagePng } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const REUSSITE = {
	secteur_id: 1,
	situation_avant: 'Sans emploi après mes études.',
	projet: 'Une agence de création de sites web pour les commerçants de Poto-Poto.',
	fond_demarrage: 150000,
	besoin_reel_demarrage: 400000,
	succes: 'Vingt clients fidèles en deux ans et deux salariés.',
	conseil: 'Commencez petit et notez chaque dépense.'
};

async function publier(id: number) {
	await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
	const r = await client()
		.post(`/api/reussites/${id}/etat`)
		.set(await entetes('admin'))
		.send({ etat: 2 });
	expect(r.status).toBe(200);
}

describe('création', () => {
	it('applique les règles et n’autorise qu’une fiche par membre', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const incomplet = await client()
			.post('/api/reussites')
			.set(h)
			.send({ ...REUSSITE, secteur_id: null, projet: 'Web' });
		expect(incomplet.status).toBe(400);
		expect(incomplet.body.champs).toEqual({
			secteur_id: "Veuillez indiquer le secteur d'activité.",
			projet: 'Veuillez décrire votre projet avec 10 caractères minimum.'
		});

		const r = await client().post('/api/reussites').set(h).send(REUSSITE);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^RST/);

		const seconde = await client().post('/api/reussites').set(h).send(REUSSITE);
		expect(seconde.status).toBe(400);
		expect(seconde.body.message).toBe('Cette fiche de réussite du membre est déjà enregistrée.');

		const moi = await client().get('/api/reussites/moi').set(h);
		expect(moi.body.etat).toBe(1);
		expect(moi.body.est_auteur).toBe(true);
		expect(moi.body.fond_demarrage).toBe(150000);
	});
});

describe('publication', () => {
	it('exige une validation et respecte le contrat de l’accueil', async () => {
		await creerMembre('awa', { pseudonyme: 'awa_web' });
		const h = await entetes('awa');
		const id = (await client().post('/api/reussites').set(h).send(REUSSITE)).body.id;

		// En attente : invisible du public, visible de l'auteur.
		expect((await client().get('/api/reussites')).body.total).toBe(0);
		expect((await client().get(`/api/reussites/${id}`)).status).toBe(404);
		expect((await client().get(`/api/reussites/${id}`).set(h)).status).toBe(200);

		// L'auteur ne peut pas se publier lui-même.
		expect((await client().post(`/api/reussites/${id}/etat`).set(h).send({ etat: 2 })).status).toBe(403);
		await publier(id);

		const liste = await client().get('/api/reussites?taille=3');
		expect(liste.body.total).toBe(1);
		expect(liste.body.taille).toBe(3);
		expect(liste.body.page).toBe(1);

		const item = liste.body.items[0];
		expect(Object.keys(item)).toEqual(
			expect.arrayContaining(['id', 'projet', 'succes', 'conseil', 'auteur', 'secteur'])
		);
		expect(item.auteur).toEqual({
			id: item.auteur.id,
			pseudonyme: 'awa_web',
			photo_url: null
		});
		expect(item.secteur).toBe('Informatique');

		// Recherche (projet ou pseudonyme) et filtre secteur.
		expect((await client().get('/api/reussites?q=poto')).body.total).toBe(1);
		expect((await client().get('/api/reussites?q=awa_web')).body.total).toBe(1);
		expect((await client().get('/api/reussites?q=boulangerie')).body.total).toBe(0);
		expect((await client().get('/api/reussites?secteur_id=99')).body.total).toBe(0);
		expect((await client().get('/api/reussites/compteurs')).body).toEqual({
			publiees: 1,
			a_valider: 0
		});
	});
});

describe('modification', () => {
	it('par l’auteur renvoie la fiche en relecture', async () => {
		await creerMembre('awa');
		await creerMembre('autre');
		const h = await entetes('awa');
		const id = (await client().post('/api/reussites').set(h).send(REUSSITE)).body.id;
		await publier(id);

		expect(
			(
				await client()
					.put(`/api/reussites/${id}`)
					.set(await entetes('autre'))
					.send(REUSSITE)
			).status
		).toBe(403);

		const r = await client()
			.put(`/api/reussites/${id}`)
			.set(h)
			.send({ ...REUSSITE, conseil: 'Soyez patients.' });
		expect(r.status).toBe(200);
		expect(r.body.message).toContain('relecture');
		expect((await client().get('/api/reussites')).body.total).toBe(0);

		const ha = await entetes('admin');
		expect((await client().get('/api/reussites?etat=1').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/reussites/compteurs').set(ha)).body.a_valider).toBe(1);
		// Un gestionnaire ne voit pas les fiches en attente dans la vitrine sans filtre explicite.
		expect((await client().get('/api/reussites').set(ha)).body.total).toBe(0);
	});
});

describe('photo et suppression', () => {
	it('gère le portrait et la reprise d’une fiche supprimée', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		const id = (await client().post('/api/reussites').set(h).send(REUSSITE)).body.id;

		const photo = await client()
			.post(`/api/reussites/${id}/photo`)
			.set(h)
			.attach('fichier', await imagePng(40, 40), 'moi.png');
		expect(photo.status, photo.text).toBe(200);

		const moi = await client().get('/api/reussites/moi').set(h);
		expect(moi.body.photo_url).toBeTruthy();
		expect(moi.body.auteur.photo_url).toBe(moi.body.photo_url);

		expect((await client().delete(`/api/reussites/${id}`).set(h)).status).toBe(200);
		expect((await client().get('/api/reussites/moi').set(h)).body).toBeNull();

		// Une nouvelle fiche reprend la fiche supprimée (une seule par membre).
		const reprise = await client().post('/api/reussites').set(h).send(REUSSITE);
		expect(reprise.status).toBe(201);
		expect(reprise.body.id).toBe(id);
	});
});
