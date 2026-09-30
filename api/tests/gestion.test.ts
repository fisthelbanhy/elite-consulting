/**
 * Back-office : accès, membres, droits, code de pointage, réinitialisations, tableau de bord, file
 * de modération (portage de `tests/test_gestion.py` ; F-ADM-05 à F-ADM-15, F-ADM-39, F-ADM-40,
 * F-TRV-06, F-TRV-70).
 */
import {} from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes, lireMembre } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { immobilier, paiement } from '../src/schema/commerce.js';
import { visite } from '../src/schema/core.js';
import { annonceEmploi } from '../src/schema/rh.js';
import { verifierMotDePasse } from '../src/securite.js';

basePropre();

const G = TypeMembre.GESTIONNAIRE;
const TOUS_DROITS = { droit_attribution: true, droit_caisse: true, droit_activation: true };

const NOUVEAU = {
	type_compte: 3,
	categorie: 1,
	nom: 'Mabiala Grace',
	pseudonyme: 'gracem',
	identifiant: 'grace.m',
	telephone: '06 123 45 67',
	ville_id: 2,
	etat: 2
};

/** Compte système n° 1 (masqué) puis un gestionnaire « admin » (tous droits par défaut). */
async function preparer(droits: Record<string, unknown> = {}) {
	await creerMembre('systeme', { type_compte: G, ...TOUS_DROITS });
	await creerMembre('admin', {
		type_compte: G,
		...(Object.keys(droits).length ? droits : TOUS_DROITS)
	});
	return entetes('admin');
}

describe('accès', () => {
	it('est réservé aux gestionnaires (F-ADM-39)', async () => {
		await creerMembre('systeme', { type_compte: G });
		await creerMembre('simple');
		const h = await entetes('simple');
		for (const url of [
			'/api/gestion/tableau-de-bord',
			'/api/gestion/membres',
			'/api/gestion/referentiels/villes',
			'/api/gestion/journaux/visites',
			'/api/gestion/parametres',
			'/api/gestion/moderation',
			'/api/gestion/reinitialisations'
		]) {
			expect((await client().get(url)).status, url).toBe(401);
			expect((await client().get(url).set(h)).status, url).toBe(403);
		}
		expect((await client().post('/api/gestion/membres').set(h).send(NOUVEAU)).status).toBe(403);
	});
});

describe('liste des membres', () => {
	it('filtre et masque le compte système (F-ADM-05 à F-ADM-08)', async () => {
		const h = await preparer();
		await creerMembre('nouveau1', { nom: 'Zola Kiminou', telephone: '061112233', etat: 1 });
		await creerMembre('entrep', { nom: 'AGRI CONGO', categorie: 2, observation: 'client fidèle' });
		await creerMembre('parti', { nom: 'Parti Ancien', etat: 3 });

		const liste = (await client().get('/api/gestion/membres').set(h)).body;
		// Supprimés et compte n° 1 exclus.
		expect(liste.total).toBe(3);
		expect(liste.items.map((x: { nom: string }) => x.nom)).not.toContain('Parti Ancien');

		expect((await client().get('/api/gestion/membres?etat=3').set(h)).body.total).toBe(1);
		expect((await client().get('/api/gestion/membres?etat=1').set(h)).body.items[0].nom).toBe(
			'Zola Kiminou'
		);
		// Téléphone, observation, personnalité, type.
		expect((await client().get('/api/gestion/membres?q=06 111 22').set(h)).body.total).toBe(1);
		expect((await client().get('/api/gestion/membres?q=fidèle').set(h)).body.total).toBe(1);
		expect((await client().get('/api/gestion/membres?categorie=2').set(h)).body.total).toBe(1);
		expect((await client().get('/api/gestion/membres?type_compte=1').set(h)).body.total).toBe(1);
		expect((await client().get('/api/gestion/membres?tri=recents').set(h)).body.items[0].nom).toBe(
			'AGRI CONGO'
		);

		// Masqué des listes, mais sa fiche reste consultable.
		expect((await client().get('/api/gestion/membres/1').set(h)).status).toBe(200);
		// Le compte système se voit lui-même.
		const hs = await entetes('systeme');
		expect((await client().get('/api/gestion/membres').set(hs)).body.total).toBe(4);
	});
});

describe('création', () => {
	it("génère un lien d'activation quand aucun mot de passe n'est fourni", async () => {
		const h = await preparer();
		const mauvais = await client()
			.post('/api/gestion/membres')
			.set(h)
			.send({ ...NOUVEAU, pseudonyme: 'gra', identifiant: 'a b' });
		expect(mauvais.status).toBe(400);
		expect(Object.keys(mauvais.body.champs)).toEqual(
			expect.arrayContaining(['pseudonyme', 'identifiant'])
		);

		const r = await client().post('/api/gestion/membres').set(h).send(NOUVEAU);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^MBR/);
		const lien = r.body.activation;
		expect(lien.chemin.startsWith('/reinitialiser/')).toBe(true);
		expect(lien.message_whatsapp).toContain('grace.m');

		// Le mot de passe n'existe pas encore : le membre le choisit avec le lien.
		const jeton = lien.chemin.split('/').at(-1);
		expect(
			(
				await client()
					.post('/api/auth/reinitialiser')
					.send({ jeton, nouveau: 'monsecret1', confirmation: 'monsecret1' })
			).status
		).toBe(200);
		expect(
			(
				await client()
					.post('/api/auth/login')
					.send({ identifiant: 'grace.m', mot_de_passe: 'monsecret1' })
			).status
		).toBe(200);

		// Doublons (identifiant, téléphone).
		const doublon = await client()
			.post('/api/gestion/membres')
			.set(h)
			.send({ ...NOUVEAU, pseudonyme: 'autrepseudo' });
		expect(doublon.status).toBe(400);
		expect(Object.keys(doublon.body.champs)).toEqual(
			expect.arrayContaining(['identifiant', 'telephone'])
		);

		// Mot de passe fourni : pas de lien.
		const morale = await client()
			.post('/api/gestion/membres')
			.set(h)
			.send({
				...NOUVEAU,
				identifiant: 'comptoir',
				pseudonyme: 'SGC',
				categorie: 2,
				nom: 'Société Générale',
				telephone: '',
				type_partenaire: 1,
				mot_de_passe: 'unmotdepasse'
			});
		expect(morale.status).toBe(201);
		expect(morale.body.activation).toBeNull();

		// F-TRV-23 : une personne morale « Banque » alimente le référentiel des banques.
		const banques = (await client().get('/api/gestion/referentiels/banques').set(h)).body;
		expect(
			banques.items.filter((b: { membre_id: number }) => b.membre_id === morale.body.id)
		).toHaveLength(1);
	});

	it("exige le droit d'attribution pour créer un gestionnaire", async () => {
		const h = await preparer({ droit_activation: true });
		expect(
			(
				await client()
					.post('/api/gestion/membres')
					.set(h)
					.send({ ...NOUVEAU, type_compte: 1 })
			).status
		).toBe(403);
		expect((await client().post('/api/gestion/membres').set(h).send(NOUVEAU)).status).toBe(201);

		// Sans droit Activation, aucune écriture.
		await creerMembre('lecteur', { type_compte: G });
		expect(
			(
				await client()
					.post('/api/gestion/membres')
					.set(await entetes('lecteur'))
					.send({ ...NOUVEAU, identifiant: 'x1234', pseudonyme: 'xxxxxx', telephone: '' })
			).status
		).toBe(403);
	});
});

describe('modification', () => {
	it('ne touche jamais aux droits (correctif F-ADM-12)', async () => {
		const h = await preparer();
		const id = await creerMembre('gest2', { type_compte: G, droit_caisse: true });

		let fiche = (await client().get(`/api/gestion/membres/${id}`).set(h)).body;
		expect(fiche.peut_modifier).toBe(true);
		expect(fiche).not.toHaveProperty('mot_de_passe_hash');
		expect(fiche).not.toHaveProperty('code_pointage_hash');

		const corps = {
			...NOUVEAU,
			type_compte: 1,
			identifiant: 'gest2',
			pseudonyme: 'gestionnaire2',
			nom: 'Nouveau Nom',
			telephone: '',
			observation: 'Caissière du samedi'
		};
		expect((await client().put(`/api/gestion/membres/${id}`).set(h).send(corps)).status).toBe(200);
		fiche = (await client().get(`/api/gestion/membres/${id}`).set(h)).body;
		expect(fiche.nom).toBe('Nouveau Nom');
		expect(fiche.droit_caisse).toBe(true);

		// Rétrogradé en membre : il perd ses droits d'administration.
		await client()
			.put(`/api/gestion/membres/${id}`)
			.set(h)
			.send({ ...corps, type_compte: 3 });
		expect((await client().get(`/api/gestion/membres/${id}`).set(h)).body.droit_caisse).toBe(false);
	});
});

describe('droits', () => {
	it("sont réservés au droit d'attribution (F-ADM-11/12)", async () => {
		const h = await preparer();
		const id = await creerMembre('gest2', { type_compte: G, droit_activation: true });
		const simple = await creerMembre('simple');
		const h2 = await entetes('gest2');
		const droits = { droit_attribution: false, droit_caisse: true, droit_activation: true };

		expect(
			(await client().put(`/api/gestion/membres/${id}/droits`).set(h2).send(droits)).status
		).toBe(403);
		expect(
			(await client().put(`/api/gestion/membres/${id}/droits`).set(h).send(droits)).status
		).toBe(200);
		expect((await client().get(`/api/gestion/membres/${id}`).set(h)).body.droit_caisse).toBe(true);
		expect(
			(await client().put(`/api/gestion/membres/${simple}/droits`).set(h).send(droits)).status
		).toBe(400);

		const moi = (await client().get('/api/auth/me').set(h)).body.id;
		const soi = await client().put(`/api/gestion/membres/${moi}/droits`).set(h).send(droits);
		expect(soi.status).toBe(403);
		expect(soi.body.message).toContain('propre droit');

		// gest2 (activation sans attribution) ne peut pas agir sur le compte d'un gestionnaire.
		expect(
			(await client().post(`/api/gestion/membres/${moi}/reinitialisation`).set(h2)).status
		).toBe(403);
		expect(
			(await client().post(`/api/gestion/membres/${moi}/etat`).set(h2).send({ etat: 3 })).status
		).toBe(403);
	});
});

describe('validation et suppression', () => {
	it('prévient le membre et le déconnecte (F-ADM-15)', async () => {
		const h = await preparer();
		const id = await creerMembre('nouveau', { etat: 1 });
		const hm = await entetes('nouveau');

		expect(
			(await client().post(`/api/gestion/membres/${id}/etat`).set(h).send({ etat: 2 })).body.message
		).toBe('Membre validé.');
		expect((await client().get('/api/espace/compteurs').set(hm)).body.messages_non_lus).toBe(1);
		expect((await client().delete(`/api/gestion/membres/${id}`).set(h)).status).toBe(200);
		expect((await client().get('/api/auth/me').set(hm)).status).toBe(401);

		const moi = (await client().get('/api/auth/me').set(h)).body.id;
		expect((await client().delete(`/api/gestion/membres/${moi}`).set(h)).status).toBe(403);
	});
});

describe('code de pointage', () => {
	it("fait 4 chiffres et n'est stocké que haché (F-ADM-13)", async () => {
		const h = await preparer();
		const id = await creerMembre('epargnant', { point_caisse_actif: true });
		const r = await client().post(`/api/gestion/membres/${id}/code-pointage`).set(h);
		expect(r.status).toBe(200);
		const code = r.body.code;
		expect(code).toMatch(/^\d{4}$/);

		const hash = lireMembre(id)!.code_pointage_hash;
		expect(hash).not.toBe(code);
		expect(await verifierMotDePasse(code, hash)).toBe(true);
		expect((await client().get(`/api/gestion/membres/${id}`).set(h)).body.a_code_pointage).toBe(
			true
		);
	});
});

describe('réinitialisations', () => {
	it('traite les demandes « mot de passe oublié » sans e-mail (ADR-0005 §3)', async () => {
		const h = await preparer();
		await creerMembre('oubli', {
			nom: 'Oubli Test',
			pseudonyme: 'oublieux',
			telephone: '061112233'
		});
		await creerMembre('autre', {
			nom: 'Autre Test',
			pseudonyme: 'autre1',
			telephone: '061112244'
		});
		for (const [nom, pseudonyme, telephone] of [
			['oubli test', 'oublieux', '061112233'],
			['autre test', 'autre1', '061112244']
		]) {
			await client()
				.post('/api/auth/mot-de-passe-oublie')
				.send({ categorie: 1, nom, pseudonyme, telephone });
		}

		const attente = (await client().get('/api/gestion/reinitialisations').set(h)).body;
		expect(attente.total).toBe(2);
		expect(attente.items[0].statut).toBe('en_attente');
		expect(
			(await client().get('/api/gestion/compteurs').set(h)).body.reinitialisations_en_attente
		).toBe(2);

		const demande = attente.items.find(
			(x: { membre: { pseudonyme: string } }) => x.membre.pseudonyme === 'oublieux'
		);
		const lien = (
			await client().post(`/api/gestion/reinitialisations/${demande.id}/traiter`).set(h)
		).body;
		expect(JSON.stringify(lien)).not.toContain('motdepasse1');
		expect(lien.telephone).toBe('061112233');

		const autre = attente.items.find(
			(x: { membre: { pseudonyme: string } }) => x.membre.pseudonyme === 'autre1'
		);
		expect(
			(await client().post(`/api/gestion/reinitialisations/${autre.id}/ignorer`).set(h)).status
		).toBe(200);
		expect((await client().get('/api/gestion/reinitialisations').set(h)).body.total).toBe(0);

		// Un second lien invalide le premier.
		const lien2 = (
			await client().post(`/api/gestion/membres/${demande.membre.id}/reinitialisation`).set(h)
		).body;
		const ancien = lien.chemin.split('/').at(-1);
		expect(
			(
				await client()
					.post('/api/auth/reinitialiser')
					.send({ jeton: ancien, nouveau: 'nouveau123', confirmation: 'nouveau123' })
			).status
		).toBe(400);
		const jeton = lien2.chemin.split('/').at(-1);
		expect(
			(
				await client()
					.post('/api/auth/reinitialiser')
					.send({ jeton, nouveau: 'nouveau123', confirmation: 'nouveau123' })
			).status
		).toBe(200);
		expect(
			(
				await client()
					.post('/api/auth/login')
					.send({ identifiant: 'oubli', mot_de_passe: 'nouveau123' })
			).status
		).toBe(200);

		const historique = (await client().get('/api/gestion/reinitialisations?statut=toutes').set(h))
			.body.items;
		for (const attendu of ['utilise', 'expire', 'prise_en_charge', 'ignoree']) {
			expect(historique.map((x: { statut: string }) => x.statut)).toContain(attendu);
		}
	});
});

describe('tableau de bord et modération', () => {
	it('compte les fiches en attente et les visites (F-TRV-06)', async () => {
		const h = await preparer();
		const auteur = await creerMembre('auteur', { etat: 1 });
		db.insert(annonceEmploi)
			.values({
				auteur_id: auteur,
				type_annonce: 2,
				reference: 'OE1',
				poste_a_pourvoir: 'Comptable',
				etat: 1
			})
			.run();
		db.insert(immobilier)
			.values([
				{ auteur_id: auteur, reference: 'IMB1', description: 'Villa à Bacongo', etat: 1 },
				{ auteur_id: auteur, reference: 'IMB2', description: 'Déjà publiée', etat: 2 }
			])
			.run();
		db.insert(paiement)
			.values({ membre_id: auteur, type_objet: 4, mode: 1, montant: 5000, etat: 2 })
			.run();
		db.insert(visite)
			.values([
				{ adresse_ip: '1.2.3.4', date_heure: new Date(Date.now() - 2 * 86_400_000) },
				{ adresse_ip: '1.2.3.5', date_heure: new Date(Date.now() - 20 * 86_400_000) }
			])
			.run();

		const t = (await client().get('/api/gestion/tableau-de-bord').set(h)).body;
		expect(t.nouveaux_membres).toBe(1);
		expect(t.paiements_en_attente).toBe(1);
		expect(t.montant_en_attente).toBe(5000);
		expect(t.fiches_en_attente).toBe(2);
		expect(t.visites_7j).toBe(1);
		expect(t.visites_30j).toBe(2);
		expect(t.serie).toHaveLength(30);
		expect(t.derniers_inscrits[0].pseudonyme).toBe('auteur');
		expect(t.droits.attribution).toBe(true);

		const file = (await client().get('/api/gestion/moderation').set(h)).body;
		expect(file.total).toBe(2);
		expect(file.items.map((x: { lien: string }) => x.lien)).toContain('/emplois/1');
		expect(file.items[0].auteur_pseudonyme).toBe('auteur');

		const immo = (await client().get('/api/gestion/moderation?module=immobilier').set(h)).body;
		expect(immo.total).toBe(1);
		expect(immo.items[0].titre).toBe('Villa à Bacongo');
		expect((await client().get('/api/gestion/moderation?module=inconnu').set(h)).status).toBe(400);
	});
});

describe('export CSV', () => {
	it('neutralise les formules de tableur (F-ADM-40)', async () => {
		const h = await preparer();
		await creerMembre('formule', { nom: '=HYPERLINK(1)' });
		const r = await client().get('/api/gestion/membres/export').set(h);
		expect(r.status).toBe(200);
		expect(r.headers['content-type']).toMatch(/^text\/csv/);
		const texte = r.text.replace(/^﻿/, '');
		expect(texte.startsWith('Code;Type')).toBe(true);
		expect(texte).toContain("'=HYPERLINK(1)");
	});
});
