/**
 * Appels de fonds et engagements d'apport (portage de `tests/test_projets.py` ;
 * F-S4-05 à F-S4-26, ADR-0004, ADR-0007 S4a).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { entreprise } from '../src/schema/entreprises.js';

basePropre();

const PROJET = {
	secteur_id: 1,
	ville_id: 2,
	nom_projet: 'Boulangerie de Bacongo',
	objet_projet: "Achat d'un four à pain",
	description_activite: 'Boulangerie artisanale ouverte depuis 2019 à Bacongo, 4 employés.',
	description_projet: 'Remplacer le vieux four pour doubler la production quotidienne de pain.',
	devis_projet: 2_000_000,
	apport_fond_propre: 500_000,
	besoin_financement: 1_500_000,
	niveau_realisation: 30,
	nom_promoteur: 'Mabiala Grâce',
	telephone_promoteur: '06 123 45 67',
	email_promoteur: 'grace@example.com',
	adresse_promoteur: '59 rue Bétou - Moungali - Brazzaville'
};

async function creerProjet(h: Record<string, string>, remplacements: Record<string, unknown> = {}) {
	const r = await client()
		.post('/api/projets')
		.set(h)
		.send({ ...PROJET, ...remplacements });
	expect(r.status).toBe(201);
	return r.body.id as number;
}

describe('création', () => {
	it('signale toutes les erreurs ensemble (correctif F-S4-11)', async () => {
		await creerMembre('porteur');
		const h = await entetes('porteur');

		const mauvais = {
			...PROJET,
			nom_projet: 'Court',
			objet_projet: 'Four',
			secteur_id: null,
			ville_id: null,
			description_activite: 'Trop court',
			description_projet: 'Trop court',
			devis_projet: 10_000,
			besoin_financement: 5_000,
			nom_promoteur: 'Awa',
			telephone_promoteur: '0712'
		};
		const r = await client().post('/api/projets').set(h).send(mauvais);
		expect(r.status).toBe(400);
		expect(Object.keys(r.body.champs)).toEqual(
			expect.arrayContaining([
				'nom_projet',
				'objet_projet',
				'secteur_id',
				'ville_id',
				'description_activite',
				'description_projet',
				'devis_projet',
				'besoin_financement',
				'nom_promoteur',
				'telephone_promoteur'
			])
		);
		expect(r.body.champs.nom_projet).toBe('Le nom du projet doit avoir plus de 10 caractères.');

		// Cohérence du plan de financement (F-S4-13).
		const besoinTropGrand = await client()
			.post('/api/projets')
			.set(h)
			.send({ ...PROJET, besoin_financement: 1_600_000 });
		expect(besoinTropGrand.status).toBe(400);
		expect(besoinTropGrand.body.champs.besoin_financement).toContain('différence');

		const apportTropGrand = await client()
			.post('/api/projets')
			.set(h)
			.send({ ...PROJET, apport_fond_propre: 2_500_000 });
		expect(apportTropGrand.status).toBe(400);
		expect(apportTropGrand.body.champs.devis_projet).toContain('inférieur');

		const bon = await client().post('/api/projets').set(h).send(PROJET);
		expect(bon.status).toBe(201);
		expect(bon.body.reference).toMatch(/^ALF/);

		// Nom unique, insensible à la casse (F-S4-14).
		const doublon = await client()
			.post('/api/projets')
			.set(h)
			.send({ ...PROJET, nom_projet: PROJET.nom_projet.toUpperCase() });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce projet est déjà enregistré.');
	});
});

describe('publication', () => {
	it("publie d'emblée, garde le promoteur privé et compte les visites des tiers", async () => {
		await creerMembre('porteur');
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('porteur');
		const id = await creerProjet(h);

		const moi = (await client().get(`/api/projets/${id}`).set(h)).body;
		// F-S4-15 : publié immédiatement, totaux à 0, e-mail et adresse dans les bons champs.
		expect(moi.etat).toBe(2);
		expect(moi.montant_promis).toBe(0);
		expect(moi.montant_collecte).toBe(0);
		expect(moi.email_promoteur).toBe('grace@example.com');
		expect(moi.adresse_promoteur.startsWith('59 rue')).toBe(true);
		expect(moi.telephone_promoteur).toBe('061234567');
		expect(moi.peut_modifier).toBe(true);
		expect(moi.reste_a_collecter).toBe(1_500_000);
		expect(moi.apports).toEqual([]);

		const public_ = (await client().get(`/api/projets/${id}`)).body;
		expect(public_.nom_promoteur).toBeNull();
		expect(public_.telephone_promoteur).toBeNull();
		expect(public_.apports).toBeNull();

		const autre = (
			await client()
				.get(`/api/projets/${id}`)
				.set(await entetes('curieux'))
		).body;
		expect(autre.peut_apporter).toBe(true);
		expect(autre.peut_modifier).toBe(false);
		expect(autre.email_promoteur).toBeNull();

		const admin = (
			await client()
				.get(`/api/projets/${id}`)
				.set(await entetes('admin'))
		).body;
		expect(admin.nom_promoteur).toBe('Mabiala Grâce');
		expect(admin.peut_moderer).toBe(true);

		// F-S4-20 : visites comptées pour les tiers seulement.
		expect((await client().get(`/api/projets/${id}`).set(h)).body.nombre_visites).toBe(2);
		const liste = (await client().get('/api/projets')).body;
		expect(liste.total).toBe(1);
		expect(liste.items[0].nom_promoteur).toBeNull();
		expect((await client().get('/api/projets').set(h)).body.items[0].nom_promoteur).toBe(
			'Mabiala Grâce'
		);
	});

	it('filtre la liste par montant, réalisation, secteur et texte', async () => {
		await creerMembre('porteur');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('porteur');
		const id1 = await creerProjet(h);
		await creerProjet(h, {
			nom_projet: 'Élevage de poulets à Kintélé',
			devis_projet: 300_000,
			apport_fond_propre: 0,
			besoin_financement: 200_000,
			niveau_realisation: 0,
			description_projet: 'Poulailler de 500 sujets pour la vente.'
		});

		expect((await client().get('/api/projets?devis_min=1000000')).body.total).toBe(1);
		expect((await client().get('/api/projets?besoin_min=250000')).body.total).toBe(1);
		expect((await client().get('/api/projets?realisation_min=20')).body.total).toBe(1);
		expect((await client().get('/api/projets?q=poulailler')).body.total).toBe(1);
		expect((await client().get('/api/projets?secteur_id=1')).body.total).toBe(2);

		await client()
			.post(`/api/projets/${id1}/etat`)
			.set(await entetes('admin'))
			.send({ etat: 1 });
		// Le public ne voit plus le projet non publié ; le porteur le voit toujours.
		expect((await client().get('/api/projets')).body.total).toBe(1);
		expect((await client().get('/api/projets').set(h)).body.total).toBe(2);
		expect((await client().get('/api/projets/compteurs')).body.projets).toBe(1);
	});

	it("n'accepte qu'une entreprise du membre", async () => {
		const porteur = await creerMembre('porteur');
		const autre = await creerMembre('autre');
		db.insert(entreprise)
			.values([
				{ id: 1, membre_id: porteur, nom: 'Pains du Congo', etat: 2 },
				{ id: 2, membre_id: autre, nom: 'Autre SARL', etat: 2 }
			])
			.run();
		const h = await entetes('porteur');

		expect(
			(await client().get('/api/projets/mes-entreprises').set(h)).body.map(
				(e: { nom: string }) => e.nom
			)
		).toEqual(['Pains du Congo']);
		const refus = await client()
			.post('/api/projets')
			.set(h)
			.send({ ...PROJET, entreprise_id: 2 });
		expect(refus.status).toBe(400);
		expect(refus.body.champs).toHaveProperty('entreprise_id');
		expect(
			(
				await client()
					.post('/api/projets')
					.set(h)
					.send({ ...PROJET, entreprise_id: 1 })
			).status
		).toBe(201);
	});
});

describe('modération', () => {
	it('réserve modification, évaluation et état', async () => {
		await creerMembre('porteur');
		await creerMembre('autre');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const id = await creerProjet(await entetes('porteur'));
		const ha = await entetes('autre');

		expect((await client().put(`/api/projets/${id}`).set(ha).send(PROJET)).status).toBe(403);
		expect(
			(await client().post(`/api/projets/${id}/evaluation`).set(ha).send({ appreciation: 8 }))
				.status
		).toBe(403);

		const hg = await entetes('admin_sans_droit');
		expect((await client().post(`/api/projets/${id}/etat`).set(hg).send({ etat: 3 })).status).toBe(
			403
		);

		// L'appréciation /10 est saisie par un gestionnaire et visible de tous (F-S4-19).
		expect(
			(
				await client()
					.post(`/api/projets/${id}/evaluation`)
					.set(hg)
					.send({ observation_gestionnaire: 'Dossier solide.', appreciation: 8 })
			).status
		).toBe(200);
		expect(
			(await client().post(`/api/projets/${id}/evaluation`).set(hg).send({ appreciation: 11 }))
				.status
		).toBe(422);

		const public_ = (await client().get(`/api/projets/${id}`)).body;
		expect(public_.appreciation).toBe(8);
		expect(public_.observation_gestionnaire).toBe('Dossier solide.');

		// Le porteur modifie son projet.
		expect(
			(
				await client()
					.put(`/api/projets/${id}`)
					.set(await entetes('porteur'))
					.send({ ...PROJET, niveau_realisation: 50 })
			).status
		).toBe(200);
		expect((await client().get(`/api/projets/${id}`)).body.niveau_realisation).toBe(50);
	});
});

describe("promesse d'apport", () => {
	it('est comptée immédiatement dans « promis » (ADR-0007 S4a)', async () => {
		await creerMembre('porteur');
		await creerMembre('bailleur', { pseudonyme: 'tonton' });
		const hp = await entetes('porteur');
		const id = await creerProjet(hp);
		const hb = await entetes('bailleur');

		// F-S4-24 : pas d'apport sur son propre projet.
		expect(
			(
				await client()
					.post(`/api/projets/${id}/apports`)
					.set(hp)
					.send({ type_apport: 1, montant_promis: 1000 })
			).status
		).toBe(400);

		const vide = await client()
			.post(`/api/projets/${id}/apports`)
			.set(hb)
			.send({ type_apport: null, montant_promis: 0 });
		expect(vide.status).toBe(400);
		expect(Object.keys(vide.body.champs)).toEqual(
			expect.arrayContaining(['type_apport', 'montant_promis'])
		);

		const trop = await client()
			.post(`/api/projets/${id}/apports`)
			.set(hb)
			.send({ type_apport: 2, montant_promis: 1_600_000 });
		expect(trop.body.champs.montant_promis).toBe(
			"Le montant de l'apport ne peut être supérieur au besoin de fonds."
		);

		const apport = {
			type_apport: 2,
			montant_promis: 300_000,
			echeance_mois: 6,
			remarque: 'Remboursable en 6 mois'
		};
		const r = await client().post(`/api/projets/${id}/apports`).set(hb).send(apport);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^ATF/);

		// F-S4-22 : doublon (même projet, membre, jour, montant).
		const doublon = await client().post(`/api/projets/${id}/apports`).set(hb).send(apport);
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette fiche est déjà enregistrée.');

		const projet = (await client().get(`/api/projets/${id}`).set(hp)).body;
		expect(projet.montant_promis).toBe(300_000);
		expect(projet.nombre_apports).toBe(1);
		expect(projet.apports[0].creancier.pseudonyme).toBe('tonton');
		expect(projet.apports[0].etat).toBe(1);

		const vuBailleur = (await client().get(`/api/projets/${id}`).set(hb)).body;
		expect(vuBailleur.apports).toBeNull();
		expect(vuBailleur.mes_apports).toHaveLength(1);

		const mes = (await client().get('/api/projets/apports').set(hb)).body;
		expect(mes.total).toBe(1);
		expect(mes.total_promis).toBe(300_000);
		expect(mes.items[0].creancier).toBeNull();

		// Le porteur est prévenu par la messagerie.
		expect((await client().get('/api/espace/compteurs').set(hp)).body.messages_non_lus).toBe(1);
	});
});

describe('versements', () => {
	it('annule tardivement sans retirer la part déjà versée (ADR-0004)', async () => {
		await creerMembre('porteur');
		await creerMembre('bailleur');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const id = await creerProjet(await entetes('porteur'));
		const hb = await entetes('bailleur');
		const apport = (
			await client()
				.post(`/api/projets/${id}/apports`)
				.set(hb)
				.send({ type_apport: 1, montant_promis: 100_000 })
		).body.id;
		const hg = await entetes('admin');

		expect(
			(
				await client()
					.post(`/api/projets/apports/${apport}/versements`)
					.set(hb)
					.send({ montant: 10 })
			).status
		).toBe(403);
		expect(
			(
				await client()
					.post(`/api/projets/apports/${apport}/versements`)
					.set(await entetes('admin_sans_droit'))
					.send({ montant: 10 })
			).status
		).toBe(403);

		const trop = await client()
			.post(`/api/projets/apports/${apport}/versements`)
			.set(hg)
			.send({ montant: 150_000 });
		expect(trop.status).toBe(400);
		expect(trop.body.message).toBe('Le versement est supérieur au montant promis.');

		expect(
			(
				await client()
					.post(`/api/projets/apports/${apport}/versements`)
					.set(hg)
					.send({ montant: 40_000 })
			).status
		).toBe(201);
		// Doublon de saisie refusé.
		expect(
			(
				await client()
					.post(`/api/projets/apports/${apport}/versements`)
					.set(hg)
					.send({ montant: 40_000 })
			).status
		).toBe(400);

		const fiche = (await client().get(`/api/projets/apports/${apport}`).set(hb)).body;
		expect(fiche.montant_verse).toBe(40_000);
		expect(fiche.reste_a_verser).toBe(60_000);
		expect(fiche.etat).toBe(2);
		expect(fiche.versements).toHaveLength(1);
		expect(fiche.peut_declarer).toBe(true);

		let projet = (await client().get(`/api/projets/${id}`)).body;
		expect(projet.montant_promis).toBe(100_000);
		expect(projet.montant_collecte).toBe(40_000);

		// ADR-0004 : l'annulation tardive ne retire que la part non versée ; promis ≥ collecté.
		expect((await client().post(`/api/projets/apports/${apport}/annuler`).set(hg)).status).toBe(
			200
		);
		projet = (await client().get(`/api/projets/${id}`)).body;
		expect(projet.montant_promis).toBe(40_000);
		expect(projet.montant_collecte).toBe(40_000);
		expect(
			(
				await client()
					.post(`/api/projets/apports/${apport}/versements`)
					.set(hg)
					.send({ montant: 1_000 })
			).status
		).toBe(400);
		expect((await client().post(`/api/projets/apports/${apport}/annuler`).set(hg)).status).toBe(
			400
		);
	});

	it('laisse le créancier déclarer son versement par un paiement (type 8)', async () => {
		await creerMembre('porteur');
		await creerMembre('bailleur');
		await creerMembre('intrus');
		await creerMembre('caisse', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const id = await creerProjet(await entetes('porteur'));
		const hb = await entetes('bailleur');
		const apport = (
			await client()
				.post(`/api/projets/${id}/apports`)
				.set(hb)
				.send({ type_apport: 3, montant_promis: 50_000 })
		).body.id;

		const prep = (
			await client().get(`/api/paiements/preparer?type_objet=8&objet_id=${apport}`).set(hb)
		).body;
		expect(prep.montant).toBeNull();
		expect(prep.retour).toBe(`/projets/apports/${apport}`);

		const corps = { type_objet: 8, objet_id: apport, mode: 3, remarque: 'MP240101.1234' };
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(await entetes('intrus'))
					.send({ ...corps, montant: 1000 })
			).status
		).toBe(403);

		const trop = await client()
			.post('/api/paiements')
			.set(hb)
			.send({ ...corps, montant: 60_000 });
		expect(trop.status).toBe(400);
		expect(trop.body.message).toBe('Le versement est supérieur au montant promis.');

		const paiement = (
			await client()
				.post('/api/paiements')
				.set(hb)
				.send({ ...corps, montant: 30_000 })
		).body.id;

		// En attente : pas encore collecté, mais le reste déclarable diminue.
		let fiche = (await client().get(`/api/projets/apports/${apport}`).set(hb)).body;
		expect(fiche.en_attente).toBe(30_000);
		expect(fiche.montant_verse).toBe(0);
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(hb)
					.send({ ...corps, montant: 25_000, remarque: 'MP240101.9999' })
			).status
		).toBe(400);
		expect((await client().get(`/api/projets/${id}`)).body.montant_collecte).toBe(0);

		// Confirmation par la caisse → versement créé et compté.
		expect(
			(
				await client()
					.post(`/api/paiements/${paiement}/confirmer`)
					.set(await entetes('caisse'))
			).status
		).toBe(200);
		fiche = (await client().get(`/api/projets/apports/${apport}`).set(hb)).body;
		expect(fiche.montant_verse).toBe(30_000);
		expect(fiche.en_attente).toBe(0);
		expect(fiche.versements).toHaveLength(1);
		expect((await client().get(`/api/projets/${id}`)).body.montant_collecte).toBe(30_000);
	});
});
