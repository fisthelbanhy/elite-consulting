/**
 * Immobilier : offres et recherches de biens (portage de `tests/test_immobilier.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes, imagePng } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const OFFRE = {
	offre_ou_recherche: 1,
	type_transaction: 1,
	type_bien: 2,
	quartier_id: 1,
	localisation: '63 rue Primera, Poto-Poto',
	surface_m2: 1500,
	nombre_pieces: 4,
	nombre_chambres: 3,
	situation: 1,
	prix: 250000,
	description: 'Bel appartement lumineux avec balcon, proche du marché.'
};

const RECHERCHE = {
	offre_ou_recherche: 2,
	type_transaction: 2,
	type_bien: 3,
	surface_m2: 400,
	situation: 1,
	prix: 15000000,
	description: 'Je cherche un terrain titré à Brazzaville sud.'
};

describe('création', () => {
	it('applique les règles, la référence et l’unicité de la description', async () => {
		await creerMembre('proprio');
		const h = await entetes('proprio');

		const incomplet = await client()
			.post('/api/immobilier')
			.set(h)
			.send({ description: 'Incomplet' });
		expect(incomplet.status).toBe(400);
		const champs = incomplet.body.champs;
		expect(champs.type_transaction).toBe('Veuillez indiquer la transaction.');
		expect(champs.type_bien).toBe("Veuillez indiquer le type de l'immobilier.");
		expect(champs.surface_m2).toBe('Veuillez indiquer la surface.');
		expect(Object.keys(champs)).toEqual(
			expect.arrayContaining(['situation', 'offre_ou_recherche'])
		);

		const r = await client().post('/api/immobilier').set(h).send(OFFRE);
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^IMB/);
		expect(r.body.message).toBe('Enregistrement effectué.');

		const id = r.body.id;
		const fiche = await client().get(`/api/immobilier/${id}`).set(h);
		// Surface enregistrée sans troncature (le legacy la tronquait à 127), publiée immédiatement.
		expect(fiche.body.surface_m2).toBe(1500);
		expect(fiche.body.etat).toBe(2);
		expect(fiche.body.auteur.pseudonyme).toBe('proprio');

		// Unicité de la description (F-S3-22).
		const doublon = await client()
			.post('/api/immobilier')
			.set(h)
			.send({ ...OFFRE, prix: 1 });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette fiche existe déjà.');

		// Modifier la fiche elle-même n'est pas un doublon.
		const modif = await client()
			.put(`/api/immobilier/${id}`)
			.set(h)
			.send({ ...OFFRE, prix: 300000 });
		expect(modif.status).toBe(200);
		expect(modif.body.message).toBe('Modification effectuée.');
	});
});

describe('confidentialité', () => {
	it("masque l'adresse précise au public et ne compte que les visites de tiers", async () => {
		await creerMembre('proprio');
		await creerMembre('curieux');
		const h = await entetes('proprio');
		const id = (await client().post('/api/immobilier').set(h).send(OFFRE)).body.id;

		const publique = await client().get(`/api/immobilier/${id}`);
		expect(publique.body.localisation).toBeNull();
		expect(publique.body.interets).toBeNull();
		expect(publique.body.quartier.nom).toBe('Bacongo');
		expect(publique.body.quartier.ville.nom).toBe('Brazzaville');
		expect(publique.body.peut_modifier).toBe(false);
		expect(publique.body.peut_manifester).toBe(true);

		await client().get(`/api/immobilier/${id}`).set(await entetes('curieux'));

		const moi = await client().get(`/api/immobilier/${id}`).set(h);
		expect(moi.body.localisation).toBe(OFFRE.localisation);
		expect(moi.body.interets).toEqual([]);
		expect(moi.body.nombre_visites).toBe(2);
		expect(moi.body.peut_manifester).toBe(false);
	});
});

describe('liste', () => {
	it('combine les filtres, les compteurs et les encarts', async () => {
		await creerMembre('proprio');
		const h = await entetes('proprio');
		await client().post('/api/immobilier').set(h).send(OFFRE);
		await client()
			.post('/api/immobilier')
			.set(h)
			.send({
				...OFFRE,
				description: 'Studio meublé',
				prix: 80000,
				nombre_chambres: 1,
				quartier_id: null
			});
		await client().post('/api/immobilier').set(h).send(RECHERCHE);

		const total = async (url: string) => (await client().get(url)).body.total;
		expect(await total('/api/immobilier')).toBe(3);
		expect(await total('/api/immobilier?type=1')).toBe(2);
		expect(await total('/api/immobilier?type=2&transaction=2')).toBe(1);
		expect(await total('/api/immobilier?ville_id=2')).toBe(1);
		expect(await total('/api/immobilier?quartier_id=1&chambres=3')).toBe(1);
		expect(await total('/api/immobilier?prix_min=100000&prix_max=300000')).toBe(1);

		// Recherche texte correctement combinée aux autres critères (correctif du OU legacy).
		expect(await total('/api/immobilier?q=studio&type=2')).toBe(0);
		expect(await total('/api/immobilier?q=studio')).toBe(1);

		// Tri legacy : prix croissant.
		const prix = (await client().get('/api/immobilier?type=1')).body.items.map(
			(b: { prix: number }) => b.prix
		);
		expect(prix).toEqual([...prix].sort((a, b) => a - b));

		const compteurs = await client().get('/api/immobilier/compteurs');
		expect(compteurs.body).toEqual({ offres: 2, recherches: 1, total: 3 });

		const encarts = await client().get('/api/immobilier/encarts');
		expect(encarts.body.nouveautes).toHaveLength(3);
		expect(encarts.body.plus_visites).toHaveLength(3);
	});
});

describe('droits', () => {
	it('encadre la modification, la modération et la suppression', async () => {
		await creerMembre('proprio');
		await creerMembre('autre');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });

		const h = await entetes('proprio');
		const id = (await client().post('/api/immobilier').set(h).send(OFFRE)).body.id;
		const hAutre = await entetes('autre');

		expect((await client().put(`/api/immobilier/${id}`).set(hAutre).send(OFFRE)).status).toBe(403);
		expect((await client().delete(`/api/immobilier/${id}`).set(hAutre)).status).toBe(403);

		const sansDroit = await client()
			.post(`/api/immobilier/${id}/etat`)
			.set(await entetes('admin_sans_droit'))
			.send({ etat: 1 });
		expect(sansDroit.status).toBe(403);

		const ha = await entetes('admin');
		expect((await client().post(`/api/immobilier/${id}/etat`).set(ha).send({ etat: 1 })).status).toBe(200);

		// Dépubliée : invisible du public, toujours visible de son auteur.
		expect((await client().get(`/api/immobilier/${id}`)).status).toBe(404);
		expect((await client().get('/api/immobilier')).body.total).toBe(0);
		expect((await client().get('/api/immobilier').set(h)).body.total).toBe(1);

		const admin = await client().get(`/api/immobilier/${id}`).set(ha);
		expect(admin.body.peut_moderer).toBe(true);
		expect(admin.body.localisation).not.toBeNull();

		expect((await client().delete(`/api/immobilier/${id}`).set(h)).status).toBe(200);
		expect((await client().get(`/api/immobilier/${id}`).set(h)).status).toBe(404);
	});
});

describe('besoin et intéressement', () => {
	it('applique les règles de dépôt et prévient l’auteur', async () => {
		await creerMembre('proprio');
		await creerMembre('locataire', { telephone: '061234567' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });

		const hp = await entetes('proprio');
		const offre = (await client().post('/api/immobilier').set(hp).send(OFFRE)).body.id;
		const recherche = (await client().post('/api/immobilier').set(hp).send(RECHERCHE)).body.id;
		const h = await entetes('locataire');

		const tropCourt = await client()
			.post(`/api/immobilier/${offre}/interet`)
			.set(h)
			.send({ message: 'Oui' });
		expect(tropCourt.status).toBe(400);
		expect(tropCourt.body.message).toBe('Présentation de besoin doit avoir 5 caractères minimum.');

		const besoin = await client()
			.post(`/api/immobilier/${offre}/interet`)
			.set(h)
			.send({ message: 'Je souhaite visiter samedi.' });
		expect(besoin.status).toBe(201);
		expect(besoin.body.message).toBe('Votre présentation de besoin est prise en compte.');

		const deuxieme = await client()
			.post(`/api/immobilier/${offre}/interet`)
			.set(h)
			.send({ message: 'Encore moi !' });
		expect(deuxieme.status).toBe(400);

		const interessement = await client()
			.post(`/api/immobilier/${recherche}/interet`)
			.set(h)
			.send({ message: "J'ai un terrain à vendre." });
		expect(interessement.status).toBe(201);
		expect(interessement.body.message).toBe('Votre intéressement est pris en compte.');

		expect((await client().get(`/api/immobilier/${offre}`).set(h)).body.mon_interet).toBe(true);

		// L'auteur voit les contributions avec les coordonnées et a été prévenu (ADR-0007 S2d).
		const detail = await client().get(`/api/immobilier/${offre}`).set(hp);
		expect(detail.body.interets[0].membre.telephone).toBe('061234567');
		expect(detail.body.interets[0].sous_type).toBe(1);
		expect((await client().get('/api/espace/compteurs').set(hp)).body.messages_non_lus).toBe(2);

		// Ni sur sa propre fiche, ni par un gestionnaire, ni sans être connecté.
		expect(
			(await client().post(`/api/immobilier/${offre}/interet`).set(hp).send({ message: 'Mon bien' }))
				.status
		).toBe(400);
		const gestionnaire = await client()
			.post(`/api/immobilier/${offre}/interet`)
			.set(await entetes('admin'))
			.send({ message: 'Gestion' });
		expect(gestionnaire.status).toBe(403);
		expect(
			(await client().post(`/api/immobilier/${offre}/interet`).send({ message: 'Visiteur' })).status
		).toBe(401);
	});
});

describe('photo', () => {
	it("n'accepte qu'une vraie image et la ré-encode en JPEG", async () => {
		await creerMembre('proprio');
		const h = await entetes('proprio');
		const id = (await client().post('/api/immobilier').set(h).send(OFFRE)).body.id;

		// Un fichier nommé .jpg mais qui n'en est pas un : refusé (contrôle par signature).
		const faux = await client()
			.post(`/api/immobilier/${id}/photo`)
			.set(h)
			.attach('fichier', Buffer.from('pas une image'), 'x.jpg');
		expect(faux.status).toBe(400);
		expect(faux.body.champs).toHaveProperty('photo');

		const vraie = await client()
			.post(`/api/immobilier/${id}/photo`)
			.set(h)
			.attach('fichier', await imagePng(), 'p.png');
		expect(vraie.status, vraie.text).toBe(200);

		const fiche = await client().get(`/api/immobilier/${id}`);
		expect(fiche.body.photo_url).toMatch(/\.jpg$/);
	});
});
