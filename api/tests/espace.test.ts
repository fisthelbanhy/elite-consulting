/**
 * « Mon espace » : tableau de bord, identifiant, code de pointage (F-TRV-25 à F-TRV-30).
 * Portage de `tests/test_espace.py`.
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes, lireMembre } from './aides.js';
import { db } from '../src/db.js';
import { Etat } from '../src/enums.js';
import { immobilier, paiement } from '../src/schema/commerce.js';
import { message } from '../src/schema/contenu.js';
import { groupeLikelemba, membreLikelemba } from '../src/schema/fonds.js';
import { verifierMotDePasse } from '../src/securite.js';

basePropre();

const OFFRE = {
	type_annonce: 2,
	domaine_id: 1,
	poste_a_pourvoir: 'Développeur web',
	competences: 'Svelte'
};

describe('accès', () => {
	it('réserve le tableau de bord aux membres connectés', async () => {
		expect((await client().get('/api/espace/tableau')).status).toBe(401);
	});
});

describe('tableau de bord', () => {
	it('présente le profil, les fiches par module et les paiements', async () => {
		const moi = await creerMembre('awa2024', {
			pseudonyme: 'Awa K.',
			email: 'awa@exemple.cg',
			sexe: 1
		});
		const autre = await creerMembre('autre');
		const h = await entetes('awa2024');

		await client().post('/api/emplois').set(h).send(OFFRE);
		await client()
			.post('/api/emplois')
			.set(h)
			.send({ ...OFFRE, poste_a_pourvoir: 'Comptable' });

		db.insert(immobilier)
			.values([
				{
					auteur_id: moi,
					reference: 'IMB1',
					description: 'Studio à Bacongo',
					etat: Etat.NON_TRAITE
				},
				{ auteur_id: moi, reference: 'IMB2', description: 'Supprimée', etat: Etat.SUPPRIME },
				{ auteur_id: autre, reference: 'IMB3', description: 'Pas à moi', etat: Etat.AUTORISE }
			])
			.run();

		const groupe = db
			.insert(groupeLikelemba)
			.values({ code: 'LKB0512025', responsable_id: autre })
			.returning()
			.get()!;
		db.insert(membreLikelemba)
			.values({
				groupe_id: groupe.id,
				membre_id: moi,
				code: '1LKB0512025',
				date_entree: new Date()
			})
			.run();

		db.insert(paiement)
			.values([
				{ membre_id: moi, type_objet: 4, mode: 3, montant: 5000, remarque: 'MP123456789', etat: 2 },
				{ membre_id: autre, type_objet: 4, mode: 3, montant: 7000, etat: 2 }
			])
			.run();
		db.insert(message).values({ membre_id: moi, de_la_frangine: true, texte: 'Bienvenue' }).run();

		const t = (await client().get('/api/espace/tableau').set(h)).body;

		expect(t.profil.pseudonyme).toBe('Awa K.');
		expect(t.profil.profil_complet).toBeGreaterThan(0);
		expect(t.profil.profil_complet).toBeLessThan(100);
		expect(t.profil.champs_manquants).toContain('Adresse');
		expect(t.profil.champs_manquants).not.toContain('E-mail');

		const modules = Object.fromEntries(t.modules.map((m: { cle: string }) => [m.cle, m]));
		expect(modules.emplois.total).toBe(2);
		expect(modules.emplois.fiches[0].lien).toMatch(/^\/emplois\//);
		// La fiche supprimée et celle d'un autre membre sont exclues.
		expect(modules.immobilier.total).toBe(1);
		expect(modules.immobilier.fiches[0].statut).toBe('En attente');
		expect(modules.likelemba.fiches[0].lien).toBe(`/likelemba/${groupe.id}`);
		// Seuls les modules réellement utilisés sont renvoyés.
		expect(modules).not.toHaveProperty('annonces');

		// Une source sans colonne de date déclarée est datée par `date_creation`, et la date sort
		// toujours au format date-heure — même quand elle vient d'une colonne DATE.
		expect(modules.emplois.fiches[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		expect(modules.likelemba.fiches[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

		// Deux fiches créées coup sur coup gardent un ordre stable : leurs dates diffèrent.
		expect(modules.emplois.fiches[0].date).not.toBe(modules.emplois.fiches[1].date);

		expect(t.paiements).toHaveLength(1);
		expect(t.paiements_en_attente).toBe(1);
		expect(t.messages_non_lus).toBe(1);

		// L'endpoint des compteurs de l'en-tête est inchangé.
		const compteurs = await client().get('/api/espace/compteurs').set(h);
		expect(compteurs.body.messages_non_lus).toBe(1);
	});
});

describe('identifiant', () => {
	it("contrôle le mot de passe, le format et l'unicité", async () => {
		await creerMembre('awa2024');
		await creerMembre('pris');
		const h = await entetes('awa2024');

		const mauvaisMdp = await client()
			.put('/api/espace/identifiant')
			.set(h)
			.send({ identifiant: 'awa.k', mot_de_passe: 'faux' });
		expect(mauvaisMdp.status).toBe(400);
		expect(mauvaisMdp.body.champs).toHaveProperty('mot_de_passe');

		// Unicité insensible à la casse.
		const dejaPris = await client()
			.put('/api/espace/identifiant')
			.set(h)
			.send({ identifiant: 'PRIS', mot_de_passe: 'motdepasse1' });
		expect(dejaPris.status).toBe(400);
		expect(dejaPris.body.champs).toHaveProperty('identifiant');

		const mauvaisFormat = await client()
			.put('/api/espace/identifiant')
			.set(h)
			.send({ identifiant: 'a b', mot_de_passe: 'motdepasse1' });
		expect(mauvaisFormat.status).toBe(422);

		const bon = await client()
			.put('/api/espace/identifiant')
			.set(h)
			.send({ identifiant: 'awa.k', mot_de_passe: 'motdepasse1' });
		expect(bon.status).toBe(200);

		// Le nouvel identifiant fonctionne pour se connecter.
		const connexion = await client()
			.post('/api/auth/login')
			.send({ identifiant: 'awa.k', mot_de_passe: 'motdepasse1' });
		expect(connexion.status).toBe(200);
	});
});

describe('code de pointage', () => {
	it('est réservé au titulaire et stocké haché', async () => {
		const sans = await creerMembre('sanscarte');
		const avec = await creerMembre('titulaire', { point_caisse_actif: true });
		const corps = { mot_de_passe: 'motdepasse1', code: '0427', confirmation: '0427' };

		const sansCarte = await client()
			.put('/api/espace/code-pointage')
			.set(await entetes('sanscarte'))
			.send(corps);
		expect(sansCarte.status).toBe(400);

		const h = await entetes('titulaire');
		expect(
			(
				await client()
					.put('/api/espace/code-pointage')
					.set(h)
					.send({ ...corps, code: '12a4' })
			).status
		).toBe(422);
		expect(
			(
				await client()
					.put('/api/espace/code-pointage')
					.set(h)
					.send({ ...corps, confirmation: '0428' })
			).status
		).toBe(422);
		expect((await client().put('/api/espace/code-pointage').set(h).send(corps)).status).toBe(200);

		// Stocké haché, jamais en clair (ADR-0005 §7).
		const titulaire = lireMembre(avec)!;
		expect(titulaire.code_pointage_hash).not.toBe('0427');
		expect(await verifierMotDePasse('0427', titulaire.code_pointage_hash)).toBe(true);
		expect(lireMembre(sans)!.code_pointage_hash).toBeNull();

		const tableau = await client().get('/api/espace/tableau').set(h);
		expect(tableau.body.profil.a_code_pointage).toBe(true);
	});
});
