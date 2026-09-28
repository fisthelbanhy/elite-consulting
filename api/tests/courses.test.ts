/**
 * Courses & livraison, et catalogue des boutiques partenaires
 * (portage de `tests/test_courses.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { BanqueBoutique, CategorieMembre, TypeMembre } from '../src/enums.js';

basePropre();

/** `2026-09-30` en heure locale, comme les dates du formulaire. */
function iso(d: Date): string {
	const deux = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

function dans(jours: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + jours);
	return d;
}

const AUJOURD_HUI = iso(new Date());
const DEMAIN = iso(dans(1));
const APRES_DEMAIN = iso(dans(2));
const DANS_TROIS_JOURS = iso(dans(3));

function course(remplacements: Record<string, unknown> = {}) {
	return {
		lieu_achat: 'Marché Total, Bacongo',
		date_achat: DEMAIN,
		date_livraison: `${APRES_DEMAIN}T11:05`,
		lieu_livraison: 'Rue Mbemba 12, Moungali — 06 123 45 67',
		lignes: [
			{ nom_article: 'Sac de riz 25 kg', prix_plafond: 18000, quantite: 1 },
			{ nom_article: 'Huile 5 L', prix_plafond: 6500, quantite: 2, observation: 'Marque locale' },
			{}
		],
		...remplacements
	};
}

function boutique(identifiant = 'boutique') {
	return creerMembre(identifiant, {
		nom: 'Épicerie du Plateau',
		categorie: CategorieMembre.MORALE,
		type_partenaire: BanqueBoutique.BOUTIQUE,
		adresse: 'Avenue de la Paix, Plateau des 15 ans'
	});
}

describe('validation', () => {
	it('applique les règles legacy corrigées', async () => {
		await creerMembre('client');
		const h = await entetes('client');

		const vide = await client().post('/api/courses/verifier').set(h).send({ lignes: [] });
		expect(vide.status).toBe(400);
		expect(vide.body.champs).toEqual({
			lieu_achat: 'Veuillez indiquer le lieu des achats avec 10 caractères minimum.',
			date_achat: 'Veuillez indiquer la date des achats.',
			date_livraison: 'Veuillez indiquer la date de livraison ainsi que l’heure.',
			lieu_livraison: 'Veuillez indiquer le numéro de téléphone et le lieu de livraison.',
			lignes: 'Veuillez indiquer le montant des achats.'
		});

		const verifier = (donnees: Record<string, unknown>) =>
			client().post('/api/courses/verifier').set(h).send(donnees);

		expect((await verifier(course({ date_achat: iso(dans(-1)) }))).body.champs.date_achat).toBe(
			'La date des courses ne peut être antérieure à la date du jour.'
		);
		expect(
			(await verifier(course({ date_livraison: `${APRES_DEMAIN}T20:00` }))).body.champs
				.date_livraison
		).toBe('Les livraisons se font entre 10 h 00 et 18 h 59.');
		expect(
			(
				await verifier(
					course({ date_achat: APRES_DEMAIN, date_livraison: `${DEMAIN}T12:00` })
				)
			).body.champs.date_livraison
		).toBe('La date de livraison ne peut être antérieure à la date des courses.');

		// Ligne incomplète signalée (et bloquante).
		expect(
			(await verifier(course({ lignes: [{ nom_article: 'Pain', quantite: 2 }] }))).body.champs
		).toHaveProperty('ligne_1');
		expect(
			(
				await verifier(
					course({ lignes: [{ nom_article: 'Pain', prix_plafond: 500, quantite: 2 }] })
				)
			).body.champs.lignes
		).toBe('Le montant des courses ne doit pas être inférieur à 5 000 FCFA.');

		// La date du jour est acceptée (correctif : le legacy la refusait).
		expect((await verifier(course({ date_achat: AUJOURD_HUI }))).status).toBe(200);
	});
});

describe('vérification puis enregistrement', () => {
	it('calcule le récapitulatif puis enregistre la course', async () => {
		await creerMembre('client');
		const h = await entetes('client');

		const recap = (await client().post('/api/courses/verifier').set(h).send(course())).body;
		expect(recap.montant_achats).toBe(31000);
		expect(recap.frais_service).toBe(4000);
		expect(recap.net_a_payer).toBe(35000);
		expect(recap.nombre_articles).toBe(3);
		expect(recap.lignes).toHaveLength(2);

		const r = await client().post('/api/courses').set(h).send(course());
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^CRS/);
		expect(r.body.message).toBe('Votre course est bien enregistrée.');
		const id = r.body.id;

		expect((await client().post('/api/courses').set(h).send(course())).body.message).toBe(
			'Cette course est déjà faite.'
		);

		let d = (await client().get(`/api/courses/${id}`).set(h)).body;
		expect(d.etat_course).toBe(1);
		expect(d.paye).toBe(2);
		expect(d.frais_service).toBe(4000);
		expect(d.net_a_payer).toBe(35000);
		// Minutes sur 2 chiffres, vrai datetime.
		expect(d.date_livraison.startsWith(`${APRES_DEMAIN}T11:05`)).toBe(true);
		expect(d.peut_modifier).toBe(true);
		expect(d.peut_annuler).toBe(true);
		expect(d.peut_payer).toBe(true);
		expect(d.peut_gerer).toBe(false);
		expect(d.contact_client).toBeNull();

		// Modification : les lignes sont réellement remplacées (F-S3-63).
		const lignes = [{ nom_article: 'Sac de riz 50 kg', prix_plafond: 30000, quantite: 1 }];
		expect(
			(await client().put(`/api/courses/${id}`).set(h).send(course({ lignes }))).status
		).toBe(200);
		d = (await client().get(`/api/courses/${id}`).set(h)).body;
		expect(d.lignes.map((li: { nom_article: string }) => li.nom_article)).toEqual([
			'Sac de riz 50 kg'
		]);
		expect(d.montant_achats).toBe(30000);
	});
});

describe('visibilité et filtres', () => {
	it('cloisonne les courses et applique chaque borne seule', async () => {
		await creerMembre('client');
		await creerMembre('voisin');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('client');

		const id = (await client().post('/api/courses').set(h).send(course())).body.id;
		await client()
			.post('/api/courses')
			.set(h)
			.send(course({ lieu_achat: "Supermarché Park'n'Shop, centre-ville" }));

		expect((await client().get('/api/courses')).status).toBe(401);
		const hv = await entetes('voisin');
		expect((await client().get('/api/courses').set(hv)).body.total).toBe(0);
		expect((await client().get(`/api/courses/${id}`).set(hv)).status).toBe(404);

		const admin = await entetes('admin');
		expect((await client().get('/api/courses').set(admin)).body.total).toBe(2);
		expect(
			(await client().get(`/api/courses/${id}`).set(admin)).body.contact_client.pseudonyme
		).toBe('client');

		// Filtres corrigés : chaque borne seule, jour inclus, livraison et « Livrée » filtrables.
		expect(
			(
				await client()
					.get(`/api/courses?commande_min=${AUJOURD_HUI}&commande_max=${AUJOURD_HUI}`)
					.set(h)
			).body.total
		).toBe(2);
		expect((await client().get(`/api/courses?achat_min=${APRES_DEMAIN}`).set(h)).body.total).toBe(0);
		expect(
			(await client().get(`/api/courses?livraison_max=${APRES_DEMAIN}`).set(h)).body.total
		).toBe(2);
		expect(
			(await client().get(`/api/courses?livraison_min=${DANS_TROIS_JOURS}`).set(h)).body.total
		).toBe(0);
		expect((await client().get('/api/courses?q=park').set(h)).body.total).toBe(1);

		await client().post(`/api/courses/${id}/etat-course`).set(admin).send({ etat_course: 4 });
		expect((await client().get('/api/courses?etat_course=4').set(h)).body.total).toBe(1);
	});
});

describe('états de course', () => {
	it("limite le client à l'annulation (F-S3-64/65)", async () => {
		await creerMembre('client');
		await boutique();
		const hc = await entetes('client');
		const hb = await entetes('boutique');
		const id = (await client().post('/api/courses').set(hc).send(course({ boutique_id: null })))
			.body.id;

		// Le client ne peut qu'annuler.
		expect(
			(await client().post(`/api/courses/${id}/etat-course`).set(hc).send({ etat_course: 3 }))
				.status
		).toBe(403);
		// Une boutique non concernée ne voit pas la course.
		expect(
			(await client().post(`/api/courses/${id}/etat-course`).set(hb).send({ etat_course: 3 }))
				.status
		).toBe(404);

		const r = await client()
			.post(`/api/courses/${id}/etat-course`)
			.set(hc)
			.send({ etat_course: 2 });
		expect(r.status).toBe(200);
		expect(r.body.message).toBe('Votre course est annulée.');

		const d = (await client().get(`/api/courses/${id}`).set(hc)).body;
		expect(d.etat_course).toBe(2);
		expect(d.peut_modifier).toBe(false);
		expect(d.peut_payer).toBe(false);

		// Plus en attente : plus modifiable (F-S3-65).
		expect((await client().put(`/api/courses/${id}`).set(hc).send(course())).status).toBe(400);
		// Suppression de la fiche : gestionnaire habilité seulement.
		expect((await client().delete(`/api/courses/${id}`).set(hc)).status).toBe(403);
	});
});

describe('catalogue et commande à une boutique', () => {
	it('réserve le catalogue aux boutiques et reprend le prix du catalogue', async () => {
		await creerMembre('client');
		const idBoutique = await boutique();
		await creerMembre('particulier');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const hc = await entetes('client');
		const hb = await entetes('boutique');

		const article = {
			code: 'RIZ25',
			nom: 'Riz parfumé 25 kg',
			marque: 'Mama',
			prix: 17500,
			disponible: 1
		};
		expect(
			(
				await client()
					.post('/api/courses/catalogue')
					.set(await entetes('particulier'))
					.send(article)
			).status
		).toBe(403);

		const court = await client().post('/api/courses/catalogue').set(hb).send({ nom: 'Ri' });
		expect(court.body.champs).toEqual({
			nom: "Le nom de l'article doit avoir 3 caractères minimum.",
			prix: 'Veuillez indiquer le prix de vente.'
		});

		const riz = (await client().post('/api/courses/catalogue').set(hb).send(article)).body.id;
		expect(
			(await client().post('/api/courses/catalogue').set(hb).send(article)).body.message
		).toBe('Cet article est déjà enregistré.');

		const ha = await entetes('admin');
		expect(
			(
				await client()
					.post('/api/courses/catalogue')
					.set(ha)
					.send({ ...article, nom: 'Savon' })
			).body.champs.boutique_id
		).toBe('Veuillez indiquer la boutique.');
		const savon = (
			await client()
				.post('/api/courses/catalogue')
				.set(ha)
				.send({ ...article, nom: 'Savon', prix: 500, disponible: 2, boutique_id: idBoutique })
		).body.id;

		expect((await client().get('/api/courses/catalogue?disponible=1')).body.total).toBe(1);
		// Une seule borne suffit.
		expect((await client().get('/api/courses/catalogue?prix_min=1000')).body.total).toBe(1);
		expect((await client().get('/api/courses/catalogue?q=mama')).body.total).toBe(2);
		expect((await client().get('/api/courses/boutiques')).body[0].nombre_articles).toBe(1);

		// Commande mixte : article du catalogue (prix du catalogue) + saisie libre ; lieu déduit.
		const lignes = [
			{ article_catalogue_id: riz, quantite: 2, prix_plafond: 1 },
			{ article_catalogue_id: savon, quantite: 0 },
			{ nom_article: 'Tomates fraîches', prix_plafond: 2000, quantite: 1 }
		];
		const r = await client()
			.post('/api/courses')
			.set(hc)
			.send(course({ boutique_id: idBoutique, lieu_achat: '', lignes }));
		expect(r.status).toBe(201);
		const id = r.body.id;

		const d = (await client().get(`/api/courses/${id}`).set(hc)).body;
		expect(d.montant_achats).toBe(37000);
		expect(d.lieu_achat.startsWith('Épicerie du Plateau')).toBe(true);
		expect(d.boutique.id).toBe(idBoutique);
		expect(d.lignes[0].article_catalogue_id).toBe(riz);

		// Article indisponible refusé.
		const indispo = await client()
			.post('/api/courses/verifier')
			.set(hc)
			.send(
				course({ boutique_id: idBoutique, lignes: [{ article_catalogue_id: savon, quantite: 1 }] })
			);
		expect(indispo.body.champs).toHaveProperty('ligne_1');

		// La boutique est prévenue, voit la commande et les coordonnées du client, et la fait avancer.
		expect((await client().get('/api/espace/compteurs').set(hb)).body.messages_non_lus).toBe(1);
		expect((await client().get('/api/courses?role=boutique').set(hb)).body.total).toBe(1);
		const vue = (await client().get(`/api/courses/${id}`).set(hb)).body;
		expect(vue.peut_gerer).toBe(true);
		expect(vue.peut_modifier).toBe(false);
		expect(vue.contact_client.pseudonyme).toBe('client');
		expect(
			(await client().post(`/api/courses/${id}/etat-course`).set(hb).send({ etat_course: 3 }))
				.status
		).toBe(200);
		expect((await client().get('/api/espace/compteurs').set(hc)).body.messages_non_lus).toBe(1);
	});
});

describe('paiement de la course', () => {
	it('bloque un second paiement et revient à « à payer » après un rejet', async () => {
		await creerMembre('client');
		await creerMembre('autre');
		await creerMembre('caisse', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const h = await entetes('client');
		const id = (await client().post('/api/courses').set(h).send(course())).body.id;

		expect(
			(
				await client()
					.get(`/api/paiements/preparer?type_objet=4&objet_id=${id}`)
					.set(await entetes('autre'))
			).status
		).toBe(403);
		const prep = (await client().get(`/api/paiements/preparer?type_objet=4&objet_id=${id}`).set(h))
			.body;
		// Achats + frais.
		expect(prep.montant).toBe(35000);
		expect(prep.retour).toBe(`/courses/${id}`);

		const r = await client()
			.post('/api/paiements')
			.set(h)
			.send({ type_objet: 4, objet_id: id, mode: 1 });
		expect(r.status).toBe(201);
		const paiementId = r.body.id;

		let d = (await client().get(`/api/courses/${id}`).set(h)).body;
		expect(d.paye).toBe(1);
		expect(d.mode_paiement).toBe(1);
		expect(d.paiement.etat).toBe(2);
		expect(d.peut_payer).toBe(false);
		expect(d.peut_modifier).toBe(false);
		expect(d.peut_annuler).toBe(false);

		const second = await client()
			.post('/api/paiements')
			.set(h)
			.send({ type_objet: 4, objet_id: id, mode: 1 });
		expect(second.status).toBe(400);
		expect(second.body.message).toBe('Cette course est déjà payée.');
		expect(
			(await client().post(`/api/courses/${id}/etat-course`).set(h).send({ etat_course: 2 })).status
		).toBe(400);

		// Rejet par la caisse : la course est de nouveau à payer.
		expect(
			(
				await client()
					.post(`/api/paiements/${paiementId}/rejeter`)
					.set(await entetes('caisse'))
			).status
		).toBe(200);
		d = (await client().get(`/api/courses/${id}`).set(h)).body;
		expect(d.paye).toBe(2);
		expect(d.peut_payer).toBe(true);
		expect(d.paiement).toBeNull();
	});
});
