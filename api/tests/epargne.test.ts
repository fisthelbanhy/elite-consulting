/**
 * Épargne solidaire : dons / placements (paiement type 7) et carte de pointage
 * (portage de `tests/test_epargne.py` ; F-S4-45 à F-S4-67, ADR-0004, ADR-0007 S4c/S4d, ADR-0009).
 */
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes, lireMembre } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { parametre } from '../src/schema/core.js';
import { membre } from '../src/schema/membres.js';
import { hacherMotDePasse } from '../src/securite.js';
import { boiteDeTest } from '../src/services/emails.js';

basePropre();

let PIN = '';

beforeEach(async () => {
	PIN = await hacherMotDePasse('1234');
	boiteDeTest.length = 0;
});

function compteurReference(): number {
	return db.select().from(parametre).where(eq(parametre.id, 1)).get()!.compteur_reference;
}

function solde(id: number): number {
	return lireMembre(id)!.solde_point_caisse;
}

describe('module désactivable (ADR-0009)', () => {
	it('refuse toutes les routes sauf le statut', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		expect((await client().get('/api/epargne/statut')).body.actif).toBe(true);

		db.update(parametre).set({ module_epargne_actif: false }).where(eq(parametre.id, 1)).run();
		const statut = (await client().get('/api/epargne/statut')).body;
		expect(statut.actif).toBe(false);
		expect(statut.message).toContain('désactivée');

		for (const r of [
			await client().get('/api/epargne/fonds').set(h),
			await client().get('/api/epargne/pointages').set(h),
			await client().post('/api/epargne/fonds').set(h).send({ type_fond: 1, montant: 500 })
		]) {
			expect(r.status).toBe(403);
			expect(r.body.message).toContain('désactivée');
		}
	});
});

describe('don et placement', () => {
	it('applique les seuils legacy et le minimum de placement (ADR-0007 S4c)', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const sansType = await client().post('/api/epargne/fonds').set(h).send({ montant: 500 });
		expect(sansType.status).toBe(400);
		expect(sansType.body.message).toBe("Veuillez indiquer le type de l'épargne : don ou placement.");

		const don = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({ type_fond: 1, montant: 99, souscripteur_nom: 'Jo' });
		expect(don.body.champs).toEqual({
			montant: 'Le montant ne doit pas être inférieur à 100 francs CFA.',
			souscripteur_nom: 'Veuillez indiquer le nom du souscripteur.'
		});

		const placement = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({ type_fond: 2, montant: 50_000, duree_mois: 6 });
		expect(placement.body.champs).toEqual({
			montant: 'Le montant ne doit pas être inférieur à 100 000 francs CFA.',
			duree_mois: 'La durée du placement doit être comprise entre 12 et 120 mois.'
		});

		const r = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({ type_fond: 1, montant: 5_000, duree_mois: 24, motivation: 'Soutien aux orphelins' });
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^FDS/);

		const fiche = (await client().get(`/api/epargne/fonds/${r.body.id}`).set(h)).body;
		expect(fiche.duree_mois).toBe(0);
		expect(fiche.confirme).toBe(2);
		expect(fiche.mode_paiement).toBe(0);
		expect(fiche.etat).toBe(2);
		expect(fiche.souscripteur.id).toBe(fiche.rapporteur.id);
		expect(fiche.peut_payer).toBe(true);

		// Anti-doublon : même jour, même motivation, même montant (F-S4-51).
		const doublon = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({ type_fond: 1, montant: 5_000, motivation: 'Soutien aux orphelins' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette épargne est déjà enregistrée.');
	});

	it('prévient le souscripteur désigné, par message et par e-mail (F-S4-53)', async () => {
		await creerMembre('rapporteur', { nom: 'Tonton Paul' });
		await creerMembre('filleule', {
			pseudonyme: 'mireille',
			email: 'mireille@example.com',
			telephone: '061234567'
		});
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('rapporteur');

		const inconnu = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({ type_fond: 2, montant: 100_000, duree_mois: 12, souscripteur_membre: 'inconnu' });
		expect(inconnu.status).toBe(400);
		expect(inconnu.body.champs).toHaveProperty('souscripteur_membre');

		const r = await client()
			.post('/api/epargne/fonds')
			.set(h)
			.send({
				type_fond: 2,
				montant: 150_000,
				duree_mois: 24,
				souscripteur_membre: '06 123 45 67'
			});
		expect(r.status).toBe(201);
		const id = r.body.id;

		expect(boiteDeTest).toHaveLength(1);
		expect(boiteDeTest[0]!.destinataire).toBe('mireille@example.com');
		expect(boiteDeTest[0]!.sujet).toBe('Souscription placement');
		expect(boiteDeTest[0]!.texte).toContain('150 000 francs CFA');
		expect(boiteDeTest[0]!.texte).toContain('24 mois');

		const hf = await entetes('filleule');
		expect((await client().get('/api/espace/compteurs').set(hf)).body.messages_non_lus).toBe(1);

		// Le souscripteur, le rapporteur et le gestionnaire voient la fiche ; pas un tiers.
		const fiche = (await client().get(`/api/epargne/fonds/${id}`).set(hf)).body;
		expect(fiche.souscripteur_nom).toBe('Awa Test');
		expect(fiche.rapporteur_nom).toBe('Tonton Paul');
		const hcur = await entetes('curieux');
		expect((await client().get(`/api/epargne/fonds/${id}`).set(hcur)).status).toBe(403);
		expect((await client().get('/api/epargne/fonds').set(hf)).body.total).toBe(1);
		expect((await client().get('/api/epargne/fonds').set(hcur)).body.total).toBe(0);

		const ha = await entetes('admin');
		expect((await client().get('/api/epargne/fonds').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/epargne/fonds?type_fond=1').set(ha)).body.total).toBe(0);
		expect((await client().get('/api/epargne/fonds?montant_min=200000').set(ha)).body.total).toBe(0);
	});
});

describe('paiement (type 7) et modification', () => {
	it('confirme dès la déclaration et revient en arrière au rejet', async () => {
		await creerMembre('awa');
		await creerMembre('curieux');
		await creerMembre('admin', {
			type_compte: TypeMembre.GESTIONNAIRE,
			droit_activation: true,
			droit_caisse: true
		});
		const h = await entetes('awa');
		const id = (
			await client().post('/api/epargne/fonds').set(h).send({ type_fond: 1, montant: 2_500 })
		).body.id;

		const prep = (await client().get(`/api/paiements/preparer?type_objet=7&objet_id=${id}`).set(h))
			.body;
		expect(prep.montant).toBe(2_500);
		expect(prep.retour).toBe(`/epargne/dons-placements/${id}`);

		const corps = { type_objet: 7, objet_id: id, mode: 3, remarque: 'MP987654321' };
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(await entetes('curieux'))
					.send(corps)
			).status
		).toBe(403);
		const paiement = (await client().post('/api/paiements').set(h).send(corps)).body.id;

		let fiche = (await client().get(`/api/epargne/fonds/${id}`).set(h)).body;
		expect(fiche.confirme).toBe(1);
		expect(fiche.mode_paiement).toBe(3);
		expect(fiche.etat_paiement).toBe(2);
		expect(fiche.peut_payer).toBe(false);

		const second = await client()
			.post('/api/paiements')
			.set(h)
			.send({ ...corps, remarque: 'MP111111111' });
		expect(second.status).toBe(400);
		expect(second.body.message).toBe('Cette épargne est déjà payée.');

		const ha = await entetes('admin');
		// F-S4-55 : modification réservée ; le montant d'une épargne payée n'est plus modifiable.
		expect(
			(await client().put(`/api/epargne/fonds/${id}`).set(h).send({ montant: 3_000 })).status
		).toBe(403);
		const bloque = await client()
			.put(`/api/epargne/fonds/${id}`)
			.set(ha)
			.send({ montant: 3_000 });
		expect(bloque.status).toBe(400);
		expect(bloque.body.champs).toHaveProperty('montant');

		// Rejet par la caisse : retour à « non payé », le montant redevient modifiable.
		expect((await client().post(`/api/paiements/${paiement}/rejeter`).set(ha)).status).toBe(200);
		fiche = (await client().get(`/api/epargne/fonds/${id}`).set(h)).body;
		expect(fiche.confirme).toBe(2);
		expect(fiche.mode_paiement).toBe(0);
		expect(fiche.peut_payer).toBe(true);

		expect(
			(
				await client()
					.put(`/api/epargne/fonds/${id}`)
					.set(ha)
					.send({ montant: 3_000, motivation: 'Cotisation solidaire' })
			).status
		).toBe(200);
		fiche = (await client().get(`/api/epargne/fonds/${id}`).set(h)).body;
		expect(fiche.montant).toBe(3_000);
		expect(fiche.motivation).toBe('Cotisation solidaire');
	});
});

async function basePointage() {
	const agent = await creerMembre('agent', { point_caisse_actif: true, nom: 'Agence Moungali' });
	const cliente = await creerMembre('cliente', {
		code_pointage_hash: PIN,
		pseudonyme: 'cliente'
	});
	const admin = await creerMembre('admin', {
		type_compte: TypeMembre.GESTIONNAIRE,
		droit_activation: true
	});
	return { agent, cliente, admin };
}

describe('carte de pointage', () => {
	it('réserve la saisie aux opérateurs et refuse un PIN erroné sans consommer de référence', async () => {
		const { agent, cliente } = await basePointage();
		await creerMembre('simple');
		expect(
			(
				await client()
					.post('/api/epargne/pointages')
					.set(await entetes('simple'))
					.send({})
			).status
		).toBe(403);

		const h = await entetes('agent');
		const vide = await client().post('/api/epargne/pointages').set(h).send({});
		expect(vide.status).toBe(400);
		expect(vide.body.champs).toEqual({
			type_operation: "Veuillez indiquer le type de l'opération.",
			membre_id: 'Veuillez indiquer le membre.',
			montant: 'Veuillez indiquer le montant.',
			code_pin: 'Veuillez indiquer le code de pointage.'
		});

		// Un agent ne pointe pas sa propre carte.
		const soi = await client()
			.post('/api/epargne/pointages')
			.set(h)
			.send({ type_operation: 1, membre_id: agent, montant: 100, code_pin: '1234' });
		expect(soi.status).toBe(400);
		expect(soi.body.champs).toHaveProperty('membre_id');

		// Mauvais PIN : refusé sans consommer de référence (ADR-0007 S4d).
		const avant = compteurReference();
		const mauvais = await client()
			.post('/api/epargne/pointages')
			.set(h)
			.send({ type_operation: 1, membre_id: cliente, montant: 10_000, code_pin: '0000' });
		expect(mauvais.status).toBe(400);
		expect(mauvais.body.message).toBe('Le code de pointage est incorrect.');
		expect(compteurReference()).toBe(avant);
		expect(solde(cliente)).toBe(0);
	});

	it('applique la règle des 97 % et l’effet miroir (ADR-0004)', async () => {
		const { agent, cliente } = await basePointage();
		const h = await entetes('agent');
		const versement = {
			type_operation: 1,
			membre_id: cliente,
			montant: 10_000,
			motif: 'Épargne du jour',
			code_pin: '1234'
		};

		const r = await client().post('/api/epargne/pointages').set(h).send(versement);
		expect(r.status).toBe(201);
		expect(r.body.message).toBe('Pointage effectué.');
		expect(r.body.reference).toMatch(/^PCS/);
		expect(solde(cliente)).toBe(10_000);
		expect(solde(agent)).toBe(10_000); // effet miroir

		const doublon = await client().post('/api/epargne/pointages').set(h).send(versement);
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce pointage est déjà enregistré.');

		// 9 700 = 97 % du solde → refusé (égalité refusée).
		const retrait = { ...versement, type_operation: 2, montant: 9_700 };
		const refus = await client().post('/api/epargne/pointages').set(h).send(retrait);
		expect(refus.status).toBe(400);
		expect(refus.body.message).toBe(
			'Impossible de faire un retrait, Le solde est inférieur au montant demandé.'
		);
		expect(
			(await client().post('/api/epargne/pointages').set(h).send({ ...retrait, montant: 9_699 }))
				.status
		).toBe(201);
		expect(solde(cliente)).toBe(301);
		expect(solde(agent)).toBe(301);

		// Le titulaire est prévenu de chaque opération.
		const hc = await entetes('cliente');
		expect((await client().get('/api/espace/compteurs').set(hc)).body.messages_non_lus).toBe(2);

		const liste = (await client().get('/api/epargne/pointages').set(hc)).body;
		expect(liste.total).toBe(2);
		expect(liste.mon_solde).toBe(301);
		expect(liste.afficher_solde).toBe(true);
		expect(liste.items[0].solde_apres).toBe(301);
		expect(liste.est_operateur).toBe(false);

		const vueAgent = (await client().get('/api/epargne/pointages').set(h)).body;
		expect(vueAgent.total_versements).toBe(10_000);
		expect(vueAgent.total_retraits).toBe(9_699);
		expect(vueAgent.net).toBe(301);
		// 3 % des versements.
		expect(vueAgent.rentabilite).toBe(300);
		expect(vueAgent.encaisse).toBe(301);
		expect(vueAgent.items[0].type_caisse).toBe(1);

		// Filtre par dates, jour maximum inclus.
		const maintenant = new Date();
		const deux = (n: number) => String(n).padStart(2, '0');
		const jour = `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
		expect(
			(await client().get(`/api/epargne/pointages?du=${jour}&au=${jour}`).set(h)).body.total
		).toBe(2);
		expect((await client().get('/api/epargne/pointages?type_operation=2').set(h)).body.total).toBe(
			1
		);
	});

	it('limite le gestionnaire aux caisses des agents (F-S4-61)', async () => {
		const { agent, cliente } = await basePointage();
		db.update(membre).set({ code_pointage_hash: PIN }).where(eq(membre.id, agent)).run();
		const hg = await entetes('admin');

		const refus = await client()
			.post('/api/epargne/pointages')
			.set(hg)
			.send({ type_operation: 1, membre_id: cliente, montant: 500, code_pin: '1234' });
		expect(refus.status).toBe(400);
		expect(refus.body.champs).toHaveProperty('membre_id');
		expect(
			(await client().get('/api/epargne/pointages/titulaires').set(hg)).body.map(
				(t: { id: number }) => t.id
			)
		).toEqual([agent]);

		expect(
			(
				await client()
					.post('/api/epargne/pointages')
					.set(hg)
					.send({ type_operation: 1, membre_id: agent, montant: 50_000, code_pin: '1234' })
			).status
		).toBe(201);

		const liste = (await client().get('/api/epargne/pointages').set(hg)).body;
		// Encaisse.
		expect(liste.items[0].type_caisse).toBe(2);
		expect(liste.est_gestionnaire).toBe(true);
		expect(liste.encaisse).toBe(50_000);
		expect((await client().get('/api/epargne/pointages?type_caisse=1').set(hg)).body.total).toBe(0);

		const detail = (await client().get(`/api/epargne/pointages/titulaires/${agent}`).set(hg)).body;
		expect(detail.solde_point_caisse).toBe(50_000);
		expect(detail.a_un_code).toBe(true);
	});

	it('bloque la carte après cinq codes erronés', async () => {
		const { cliente } = await basePointage();
		const h = await entetes('agent');
		const corps = { type_operation: 1, membre_id: cliente, montant: 1_000, code_pin: '9999' };

		for (let i = 0; i < 5; i++) {
			const r = await client().post('/api/epargne/pointages').set(h).send(corps);
			expect(r.body.message).toBe('Le code de pointage est incorrect.');
		}
		const bloque = await client()
			.post('/api/epargne/pointages')
			.set(h)
			.send({ ...corps, code_pin: '1234' });
		expect(bloque.status).toBe(400);
		expect(bloque.body.message).toContain('réessayez dans 15 minutes');
		expect(solde(cliente)).toBe(0);
	});
});
