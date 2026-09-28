/**
 * Annuaire des entreprises (portage de `tests/test_entreprises.py`).
 */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { CategorieMembre, TypeMembre } from '../src/enums.js';
import { domaineActivite, secteurActivite } from '../src/schema/core.js';
import { entreprise } from '../src/schema/entreprises.js';

basePropre();

const ENTREPRISE = {
	domaine_id: 1,
	nom: 'Bomoye Services',
	forme_juridique: 2,
	capital_social: 1_000_000,
	description: 'Maintenance informatique et développement web à Brazzaville.',
	gerant: 'Grâce Mabiala',
	telephone: '06 123 45 67',
	email: 'contact@bomoye.cg',
	site_web: 'www.bomoye.cg',
	adresse: '59 rue Bétou, Moungali',
	ville_id: 2
};

function referentielSupplementaire() {
	db.insert(secteurActivite).values({ id: 2, libelle: 'Agriculture' }).run();
	db.insert(domaineActivite).values({ id: 2, secteur_id: 2, libelle: 'Maraîchage' }).run();
}

describe('création', () => {
	it('valide, référence et refuse les doublons', async () => {
		await creerMembre('patron');
		const h = await entetes('patron');

		const incomplet = await client()
			.post('/api/entreprises')
			.set(h)
			.send({ nom: 'Abc', telephone: '' });
		expect(incomplet.status).toBe(400);
		const champs = incomplet.body.champs;
		expect(Object.keys(champs)).toEqual(
			expect.arrayContaining(['domaine_id', 'nom', 'forme_juridique', 'ville_id'])
		);
		expect(champs.nom).toBe("Le nom de l'entreprise doit avoir au moins 4 caractères.");
		expect(champs.ville_id).toBe("Veuillez indiquer la ville où est située l'entreprise.");

		// Téléphone au format congolais.
		const mauvaisTel = await client()
			.post('/api/entreprises')
			.set(h)
			.send({ ...ENTREPRISE, telephone: '12345' });
		expect(mauvaisTel.status).toBe(422);
		expect(mauvaisTel.body.champs).toHaveProperty('telephone');

		const r = await client().post('/api/entreprises').set(h).send(ENTREPRISE);
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^ENT/);
		expect(r.body.message).toBe('Enregistrement effectué.');

		const fiche = await client().get(`/api/entreprises/${r.body.id}`);
		// Secteur déduit du domaine (ADR-0007).
		expect(fiche.body.domaine.secteur.id).toBe(1);
		// Site normalisé en https, téléphone normalisé.
		expect(fiche.body.site_web).toBe('https://www.bomoye.cg');
		expect(fiche.body.telephone).toBe('061234567');
		expect(db.select().from(entreprise).where(eq(entreprise.id, r.body.id)).get()!.secteur_id).toBe(1);

		// Unicité nom + domaine, insensible à la casse.
		const doublon = await client()
			.post('/api/entreprises')
			.set(h)
			.send({ ...ENTREPRISE, nom: 'BOMOYE  services' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette entreprise est déjà enregistrée.');

		// Même nom dans un autre domaine : accepté.
		referentielSupplementaire();
		expect(
			(
				await client()
					.post('/api/entreprises')
					.set(h)
					.send({ ...ENTREPRISE, domaine_id: 2 })
			).status
		).toBe(201);
	});

	it('refuse un site web dangereux', async () => {
		await creerMembre('patron');
		const r = await client()
			.post('/api/entreprises')
			.set(await entetes('patron'))
			.send({ ...ENTREPRISE, site_web: 'javascript:alert(1)' });
		expect(r.status).toBe(422);
		expect(r.body.champs).toHaveProperty('site_web');
	});
});

describe('pré-remplissage', () => {
	it('reprend le profil d’une personne morale (F-S6-06)', async () => {
		await creerMembre('societe', {
			categorie: CategorieMembre.MORALE,
			nom: 'Société Kongo Bois',
			telephone: '055123456',
			email: 'kongo@bois.cg',
			adresse: 'Mpila',
			domaine_activite_id: 1,
			forme_juridique: 1
		});
		await creerMembre('particulier', { telephone: '066000000' });

		const modele = await client()
			.get('/api/entreprises/modele')
			.set(await entetes('societe'));
		expect(modele.body).toEqual({
			nom: 'Société Kongo Bois',
			domaine_id: 1,
			forme_juridique: 1,
			telephone: '055123456',
			email: 'kongo@bois.cg',
			adresse: 'Mpila',
			ville_id: 2,
			personne_morale: true
		});

		const vide = await client()
			.get('/api/entreprises/modele')
			.set(await entetes('particulier'));
		expect(vide.body.personne_morale).toBe(false);
		expect(vide.body.telephone).toBe('');
		expect(vide.body.nom).toBe('');

		expect((await client().get('/api/entreprises/modele')).status).toBe(401);
	});
});

describe('liste', () => {
	it('filtre, trie par secteur puis nom, et respecte la visibilité', async () => {
		referentielSupplementaire();
		await creerMembre('patron');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('patron');

		const id1 = (await client().post('/api/entreprises').set(h).send(ENTREPRISE)).body.id;
		await client()
			.post('/api/entreprises')
			.set(h)
			.send({
				...ENTREPRISE,
				nom: 'Ferme du Pool',
				domaine_id: 2,
				ville_id: 3,
				description: 'Légumes bio'
			});
		await client()
			.post('/api/entreprises')
			.set(h)
			.send({ ...ENTREPRISE, nom: 'Atelier Web', description: 'Sites' });

		const total = async (url: string) => (await client().get(url)).body.total;
		expect(await total('/api/entreprises')).toBe(3);
		expect(await total('/api/entreprises?secteur_id=2')).toBe(1);
		expect(await total('/api/entreprises?domaine_id=1')).toBe(2);
		expect((await client().get('/api/entreprises?ville_id=3')).body.items[0].nom).toBe(
			'Ferme du Pool'
		);
		expect(await total('/api/entreprises?q=légumes')).toBe(1);

		// Tri legacy : secteur (libellé) puis nom.
		const noms = (await client().get('/api/entreprises')).body.items.map(
			(e: { nom: string }) => e.nom
		);
		expect(noms).toEqual(['Ferme du Pool', 'Atelier Web', 'Bomoye Services']);
		expect((await client().get('/api/entreprises?tri=nom')).body.items[0].nom).toBe('Atelier Web');

		// Une fiche retirée n'est plus publique, mais reste visible de son auteur.
		const retrait = await client()
			.post(`/api/entreprises/${id1}/etat`)
			.set(await entetes('admin'))
			.send({ etat: 1 });
		expect(retrait.status).toBe(200);
		expect(await total('/api/entreprises')).toBe(2);
		expect((await client().get('/api/entreprises').set(h)).body.total).toBe(3);
		expect((await client().get(`/api/entreprises/${id1}`)).status).toBe(404);
		expect((await client().get('/api/entreprises?miennes=true').set(h)).body.total).toBe(3);
	});
});

describe('fiche publique', () => {
	it('expose les coordonnées de l’entreprise et compte les visites de tiers', async () => {
		await creerMembre('patron');
		await creerMembre('curieux');
		const h = await entetes('patron');
		const id = (await client().post('/api/entreprises').set(h).send(ENTREPRISE)).body.id;

		const publique = await client().get(`/api/entreprises/${id}`);
		// Annuaire : les coordonnées de l'entreprise sont publiques ; l'auteur n'est montré que
		// par son pseudonyme.
		expect(publique.body.telephone).toBe('061234567');
		expect(publique.body.email).toBe('contact@bomoye.cg');
		expect(publique.body.auteur.pseudonyme).toBe('patron');
		expect(publique.body.auteur).not.toHaveProperty('telephone');
		expect(publique.body.peut_modifier).toBe(false);
		expect(publique.body.comparateur).toEqual({ offres: 0, demandes: 0 });

		await client()
			.get(`/api/entreprises/${id}`)
			.set(await entetes('curieux'));
		// L'auteur ne compte pas.
		await client().get(`/api/entreprises/${id}`).set(h);

		const fiche = await client().get(`/api/entreprises/${id}`).set(h);
		expect(fiche.body.nombre_visites).toBe(2);
		expect(fiche.body.date_derniere_visite).not.toBeNull();
		expect(fiche.body.peut_modifier).toBe(true);
	});
});

describe('droits', () => {
	it('réservent modification, suppression et modération', async () => {
		await creerMembre('patron');
		await creerMembre('autre');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('patron');
		const id = (await client().post('/api/entreprises').set(h).send(ENTREPRISE)).body.id;
		const hAutre = await entetes('autre');

		expect((await client().put(`/api/entreprises/${id}`).set(hAutre).send(ENTREPRISE)).status).toBe(403);
		expect((await client().delete(`/api/entreprises/${id}`).set(hAutre)).status).toBe(403);
		expect(
			(
				await client()
					.post(`/api/entreprises/${id}/etat`)
					.set(await entetes('admin_sans_droit'))
					.send({ etat: 3 })
			).status
		).toBe(403);

		const parAdmin = await client()
			.put(`/api/entreprises/${id}`)
			.set(await entetes('admin'))
			.send({ ...ENTREPRISE, gerant: 'Nouvelle gérante' });
		expect(parAdmin.status).toBe(200);
		expect(parAdmin.body.message).toBe('Modification effectuée.');

		// Modifier sa fiche sans changer de nom n'est pas un doublon.
		expect((await client().put(`/api/entreprises/${id}`).set(h).send(ENTREPRISE)).status).toBe(200);
		expect((await client().delete(`/api/entreprises/${id}`).set(h)).status).toBe(200);
	});
});
