/**
 * Marchés (appels d'offres) et projets (portage de `tests/test_marches.py`).
 */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { marche } from '../src/schema/entreprises.js';

basePropre();

const jour = (decalage: number) => {
	const d = new Date();
	d.setDate(d.getDate() + decalage);
	return d;
};
const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MARCHE = {
	numero_appel_offre: 'AO-2026-014/MEF',
	type_marche: 2,
	libelle: 'Réhabilitation du marché Total de Bacongo',
	description: 'Travaux de gros œuvre et de plomberie.',
	montant: 150_000_000,
	date_limite: iso(jour(5)),
	dossier_a_fournir: 'Offre technique, offre financière, attestation de régularité fiscale.',
	lieu_depot: 'Direction des marchés publics, Brazzaville',
	email: 'marches@exemple.cg',
	maitre_ouvrage: 'Mairie de Brazzaville',
	publie_par: 'Les Dépêches de Brazzaville',
	beneficiaire: 'Commerçants'
};

const PROJET = {
	responsable: 'Ondoki',
	promoteur: 'Banque mondiale',
	objet: "Soutien à l'agriculture",
	libelle: 'PDAC',
	objectif: 'Promotion des activités agricoles',
	description: 'Appui aux coopératives.',
	adresse: 'Centre-ville, Brazzaville',
	duree_mois: 36,
	date_lancement: '2026-10-01',
	conditions: 'Être une coopérative agréée.'
};

describe('marchés — création', () => {
	it("valide, référence et impose l'unicité du numéro", async () => {
		await creerMembre('acheteur');
		const h = await entetes('acheteur');

		const incomplet = await client()
			.post('/api/marches')
			.set(h)
			.send({ numero_appel_offre: 'A1', libelle: 'abc', montant: 0 });
		expect(incomplet.status).toBe(400);
		expect(incomplet.body.champs).toEqual({
			numero_appel_offre: "Veuillez indiquer le numéro d'appel d'offres.",
			type_marche: 'Veuillez indiquer marché privé ou public.',
			libelle: 'Veuillez indiquer le libellé du marché.',
			montant: 'Veuillez indiquer le montant du marché.'
		});

		const passee = await client()
			.post('/api/marches')
			.set(h)
			.send({ ...MARCHE, date_limite: iso(jour(-1)) });
		expect(passee.status).toBe(400);
		expect(passee.body.champs).toHaveProperty('date_limite');

		expect(
			(
				await client()
					.post('/api/marches')
					.set(h)
					.send({ ...MARCHE, email: 'pas-un-mail' })
			).status
		).toBe(422);

		const r = await client().post('/api/marches').set(h).send(MARCHE);
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^MCH/);
		expect(r.body.message).toBe('Opération effectuée avec succès.');
		const id1 = r.body.id;

		const doublon = await client()
			.post('/api/marches')
			.set(h)
			.send({ ...MARCHE, numero_appel_offre: 'ao-2026-014/mef ' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce marché est déjà enregistré.');

		// Unicité aussi en modification (corrigé : le legacy ne contrôlait qu'à la création).
		const id2 = (
			await client()
				.post('/api/marches')
				.set(h)
				.send({ ...MARCHE, numero_appel_offre: 'AO-2026-020' })
		).body.id;
		const conflit = await client().put(`/api/marches/${id2}`).set(h).send(MARCHE);
		expect(conflit.status).toBe(400);
		expect(conflit.body.message).toBe('Ce marché est déjà enregistré.');

		const modif = await client()
			.put(`/api/marches/${id1}`)
			.set(h)
			.send({ ...MARCHE, montant: 160_000_000 });
		expect(modif.status).toBe(200);
		expect(modif.body.message).toBe('Opération effectuée avec succès.');

		const fiche = await client().get(`/api/marches/${id1}`);
		expect(fiche.body.montant).toBe(160_000_000);
		expect(fiche.body.jours_restants).toBe(5);
		expect(fiche.body.ouvert).toBe(true);
		expect(fiche.body.email).toBe('marches@exemple.cg');
		expect(fiche.body.auteur.pseudonyme).toBe('acheteur');
		expect(fiche.body.peut_modifier).toBe(false);
		expect(fiche.body.document_url).toBeNull();
	});
});

describe('marchés — liste', () => {
	it('filtre les marchés ouverts et trie par clôture', async () => {
		await creerMembre('acheteur');
		const h = await entetes('acheteur');
		await client().post('/api/marches').set(h).send(MARCHE);
		await client()
			.post('/api/marches')
			.set(h)
			.send({
				...MARCHE,
				numero_appel_offre: 'PRIVE-001',
				type_marche: 1,
				montant: 2_000_000,
				libelle: 'Fourniture de ciment',
				date_limite: null
			});
		const idClos = (
			await client()
				.post('/api/marches')
				.set(h)
				.send({
					...MARCHE,
					numero_appel_offre: 'AO-2025-001',
					libelle: 'Ancien marché',
					date_limite: iso(jour(30))
				})
		).body.id;

		// Date limite dépassée (reprise legacy).
		db.update(marche)
			.set({ date_limite: jour(-3) })
			.where(eq(marche.id, idClos))
			.run();

		expect((await client().get('/api/marches')).body.total).toBe(3);

		const ouverts = await client().get('/api/marches?ouverts=true&tri=cloture');
		expect(ouverts.body.total).toBe(2);
		// Les marchés sans date limite passent en dernier.
		expect(
			ouverts.body.items.map((i: { numero_appel_offre: string }) => i.numero_appel_offre)
		).toEqual(['AO-2026-014/MEF', 'PRIVE-001']);

		const clos = await client().get(`/api/marches/${idClos}`);
		expect(clos.body.ouvert).toBe(false);
		expect(clos.body.jours_restants).toBe(-3);

		expect((await client().get('/api/marches?type=1')).body.items[0].numero_appel_offre).toBe(
			'PRIVE-001'
		);
		expect((await client().get('/api/marches?montant_min=100000000')).body.total).toBe(2);
		expect((await client().get('/api/marches?q=ciment')).body.total).toBe(1);
		// Recherche dans le dossier à fournir.
		expect((await client().get('/api/marches?q=régularité')).body.total).toBe(3);
		const parMontant = await client().get('/api/marches?tri=montant');
		expect(parMontant.body.items[parMontant.body.items.length - 1].montant).toBe(2_000_000);

		expect((await client().get('/api/marches/compteurs')).body).toEqual({
			marches: 3,
			marches_ouverts: 2,
			projets: 0
		});
	});
});

describe('marchés — droits', () => {
	it('encadre modification, clôture et suppression', async () => {
		await creerMembre('acheteur');
		await creerMembre('autre');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('acheteur');
		const hAutre = await entetes('autre');
		const id = (await client().post('/api/marches').set(h).send(MARCHE)).body.id;

		expect((await client().put(`/api/marches/${id}`).set(hAutre).send(MARCHE)).status).toBe(403);
		expect(
			(
				await client()
					.post(`/api/marches/${id}/etat`)
					.set(await entetes('admin_sans_droit'))
					.send({ etat: 4 })
			).status
		).toBe(403);
		// Même l'auteur ne peut pas clôturer : c'est un acte de modération.
		expect((await client().post(`/api/marches/${id}/etat`).set(h).send({ etat: 4 })).status).toBe(
			403
		);

		const ha = await entetes('admin');
		expect((await client().post(`/api/marches/${id}/etat`).set(ha).send({ etat: 4 })).status).toBe(
			200
		);

		const fiche = await client().get(`/api/marches/${id}`).set(h);
		expect(fiche.body.ouvert).toBe(false);
		expect(fiche.body.etat).toBe(4);
		expect((await client().get('/api/marches?ouverts=true')).body.total).toBe(0);
		// État 4 ≠ publié : sort de la liste des autres membres.
		expect((await client().get('/api/marches').set(hAutre)).body.total).toBe(0);

		expect((await client().post(`/api/marches/${id}/etat`).set(ha).send({ etat: 2 })).status).toBe(
			200
		);
		expect((await client().delete(`/api/marches/${id}`).set(hAutre)).status).toBe(403);
		expect((await client().delete(`/api/marches/${id}`).set(h)).status).toBe(200);
		expect((await client().get(`/api/marches/${id}`)).status).toBe(404);
	});
});

describe('marchés — document', () => {
	it("n'accepte qu'un PDF et sait le retirer", async () => {
		await creerMembre('acheteur');
		const h = await entetes('acheteur');
		const id = (await client().post('/api/marches').set(h).send(MARCHE)).body.id;

		const pdf = Buffer.from('%PDF-1.4\n%fin\n');
		const r = await client()
			.post(`/api/marches/${id}/document`)
			.set(h)
			.attach('fichier', pdf, 'dao.pdf');
		expect(r.status, r.text).toBe(200);
		expect((await client().get(`/api/marches/${id}`)).body.document_url).toMatch(/\.pdf$/);

		const mauvais = await client()
			.post(`/api/marches/${id}/document`)
			.set(h)
			.attach('fichier', Buffer.from('texte'), 'x.txt');
		expect(mauvais.status).toBe(400);
		expect(mauvais.body.champs).toHaveProperty('document');

		expect((await client().delete(`/api/marches/${id}/document`).set(h)).status).toBe(200);
		expect((await client().get(`/api/marches/${id}`)).body.document_url).toBeNull();
	});
});

describe('projets', () => {
	it("valide et impose l'unicité responsable + objet", async () => {
		await creerMembre('porteur');
		const h = await entetes('porteur');

		const incomplet = await client()
			.post('/api/marches/projets')
			.set(h)
			.send({ responsable: 'Ok', duree_mois: 121 });
		expect(incomplet.status).toBe(400);
		expect(incomplet.body.champs).toEqual({
			responsable: 'Veuillez indiquer le responsable du projet.',
			promoteur: 'Veuillez indiquer le promoteur du projet.',
			objet: "Veuillez indiquer l'objet du projet.",
			libelle: 'Veuillez indiquer le libellé du projet.',
			duree_mois: 'Veuillez indiquer la durée du projet.'
		});

		// Durée 0 acceptée (legacy : select 0..120) ; champs de plus de 20 caractères acceptés
		// (F-S6-32).
		const r = await client()
			.post('/api/marches/projets')
			.set(h)
			.send({ ...PROJET, duree_mois: 0 });
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^PJT/);
		expect(r.body.message).toBe('Enregistrement effectué.');

		// Unicité responsable + objet, avec le bon libellé (le legacy parlait de « marché »).
		const doublon = await client()
			.post('/api/marches/projets')
			.set(h)
			.send({ ...PROJET, responsable: 'ONDOKI', libelle: 'Autre' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce projet est déjà enregistré.');

		expect(
			(
				await client()
					.post('/api/marches/projets')
					.set(h)
					.send({ ...PROJET, objet: 'Pistes rurales' })
			).status
		).toBe(201);
	});

	it('liste, affiche et encadre les droits', async () => {
		await creerMembre('porteur');
		await creerMembre('autre');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('porteur');
		const id = (await client().post('/api/marches/projets').set(h).send(PROJET)).body.id;
		await client()
			.post('/api/marches/projets')
			.set(h)
			.send({
				...PROJET,
				objet: 'Pistes rurales',
				libelle: 'Routes',
				description: 'Désenclavement'
			});

		expect((await client().get('/api/marches/projets')).body.total).toBe(2);
		expect((await client().get('/api/marches/projets?q=coopératives')).body.total).toBe(1);

		const fiche = await client().get(`/api/marches/projets/${id}`);
		expect(fiche.body.promoteur).toBe('Banque mondiale');
		expect(fiche.body.duree_mois).toBe(36);
		expect(fiche.body.conditions).toBeTruthy();
		expect((await client().get('/api/marches/compteurs')).body.projets).toBe(2);

		expect(
			(
				await client()
					.put(`/api/marches/projets/${id}`)
					.set(await entetes('autre'))
					.send(PROJET)
			).status
		).toBe(403);
		const modif = await client()
			.put(`/api/marches/projets/${id}`)
			.set(h)
			.send({ ...PROJET, duree_mois: 48 });
		expect(modif.status).toBe(200);
		expect(modif.body.message).toBe('Modification effectuée.');

		expect(
			(await client().post(`/api/marches/projets/${id}/etat`).set(h).send({ etat: 1 })).status
		).toBe(403);
		expect(
			(
				await client()
					.post(`/api/marches/projets/${id}/etat`)
					.set(await entetes('admin'))
					.send({ etat: 1 })
			).status
		).toBe(200);
		expect((await client().get('/api/marches/projets')).body.total).toBe(1);
		expect((await client().get(`/api/marches/projets/${id}`).set(h)).body.peut_modifier).toBe(true);
		expect((await client().delete(`/api/marches/projets/${id}`).set(h)).status).toBe(200);
		expect((await client().get(`/api/marches/projets/${id}`).set(h)).status).toBe(404);
	});
});

describe('routage', () => {
	it('ne masque pas /marches/projets derrière /marches/:id', async () => {
		await creerMembre('acheteur');
		const h = await entetes('acheteur');
		const id = (await client().post('/api/marches').set(h).send(MARCHE)).body.id;

		expect((await client().get('/api/marches/projets')).status).toBe(200);
		expect((await client().get('/api/marches/compteurs')).status).toBe(200);
		expect((await client().get(`/api/marches/${id}`)).status).toBe(200);
		expect((await client().get('/api/marches/999')).status).toBe(404);
	});
});
