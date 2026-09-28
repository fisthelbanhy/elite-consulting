/**
 * Référentiels, paramètres, statistiques, journal des visites.
 *
 * L'ancien backend n'avait pas de test dédié pour ce module ; il est pourtant lu par presque
 * toutes les pages du site, d'où cette couverture ajoutée à la migration.
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre } from './aides.js';
import { db } from '../src/db.js';
import { Etat } from '../src/enums.js';
import { article } from '../src/schema/commerce.js';
import { banque, diplome, familleArticle, secteurActivite, visite } from '../src/schema/core.js';
import { annonceEmploi } from '../src/schema/rh.js';

basePropre();

describe('énumérations', () => {
	it('expose chaque énumération sous la forme attendue par le frontend', async () => {
		const r = await client().get('/api/referentiels/enums');
		expect(r.status).toBe(200);
		// Le frontend appelle libelle(enums, 'TypeBien', v) : la clé garde le nom de la classe Python.
		expect(r.body.TypeBien).toContainEqual({ value: 1, label: 'Maison' });
		expect(r.body.Etat).toContainEqual({ value: 2, label: 'Autorisé' });
		// NiveauDiplome est construit depuis la liste, indices à partir de 0.
		expect(r.body.NiveauDiplome[0]).toEqual({ value: 0, label: 'Sans diplôme' });
		expect(Object.keys(r.body)).toHaveLength(41); // 40 énumérations + NiveauDiplome
	});
});

describe('villes et secteurs', () => {
	it('renvoie les villes avec leurs quartiers', async () => {
		const r = await client().get('/api/referentiels/villes');
		expect(r.status).toBe(200);
		const brazzaville = r.body.find((v: { nom: string }) => v.nom === 'Brazzaville');
		expect(brazzaville.quartiers).toEqual([{ id: 1, nom: 'Bacongo' }]);
		// Triées par nom.
		expect(r.body.map((v: { nom: string }) => v.nom)).toEqual(['Brazzaville', 'Pointe-Noire']);
	});

	it('masque les secteurs et domaines supprimés', async () => {
		db.insert(secteurActivite).values({ id: 2, libelle: 'Supprimé', etat: Etat.SUPPRIME }).run();
		const r = await client().get('/api/referentiels/secteurs');
		expect(r.body.map((s: { libelle: string }) => s.libelle)).toEqual(['Informatique']);
		expect(r.body[0].domaines).toEqual([{ id: 1, libelle: 'Développement web' }]);
	});
});

describe('banques', () => {
	it('ne liste que les banques autorisées, sans données internes', async () => {
		db.insert(banque).values([
			{ nom: 'BGFI', sigle: 'BGFI', etat: Etat.AUTORISE },
			{ nom: 'Banque fermée', sigle: 'BF', etat: Etat.SUPPRIME }
		]).run();
		const r = await client().get('/api/referentiels/banques');
		expect(r.body).toHaveLength(1);
		expect(r.body[0].nom).toBe('BGFI');
		// L'observation interne et le contact ne sont pas exposés publiquement.
		expect(r.body[0]).not.toHaveProperty('observation');
		expect(r.body[0]).not.toHaveProperty('nom_contact');
	});
});

describe('paramètres', () => {
	it('expose les paramètres publics sans les compteurs de séquences', async () => {
		const r = await client().get('/api/referentiels/parametres');
		expect(r.status).toBe(200);
		expect(r.body.nom_site).toBe('La Frangine');
		expect(r.body.montant_minimum_course).toBe(5000);
		expect(r.body).not.toHaveProperty('compteur_reference');
		expect(r.body).not.toHaveProperty('compteur_membre');
	});
});

describe('statistiques', () => {
	it("compte les fiches publiées de chaque section", async () => {
		await creerMembre('statisticien');
		db.insert(annonceEmploi).values([
			{ type_annonce: 2, etat: Etat.AUTORISE },
			{ type_annonce: 2, etat: Etat.NON_TRAITE }, // non publiée : exclue
			{ type_annonce: 1, etat: Etat.AUTORISE }
		]).run();
		db.insert(article).values({ libelle: 'Chaise', etat: Etat.AUTORISE }).run();

		const r = await client().get('/api/referentiels/stats');
		expect(r.status).toBe(200);
		expect(r.body.offres_emploi).toBe(1);
		expect(r.body.demandes_emploi).toBe(1);
		expect(r.body.annonces_articles).toBe(1);
		expect(r.body.membres).toBe(1);
		expect(r.body.annee_creation).toBe(2016);
	});
});

describe('à la une', () => {
	it('mélange les sections et respecte la limite', async () => {
		db.insert(article).values([
			{ libelle: 'Annonce A', description: 'Une description', etat: Etat.AUTORISE },
			{ libelle: 'Annonce B', etat: Etat.AUTORISE }
		]).run();
		db.insert(annonceEmploi).values({
			type_annonce: 2, poste_a_pourvoir: 'Comptable', etat: Etat.AUTORISE
		}).run();

		const r = await client().get('/api/referentiels/a-la-une?limite=2');
		expect(r.status).toBe(200);
		expect(r.body).toHaveLength(2);
		expect(r.body[0]).toHaveProperty('href');
		expect(r.body[0]).toHaveProperty('type');
	});

	it('ignore les fiches non publiées', async () => {
		db.insert(article).values({ libelle: 'Brouillon', etat: Etat.NON_TRAITE }).run();
		const r = await client().get('/api/referentiels/a-la-une');
		expect(r.body).toHaveLength(0);
	});
});

describe('journal des visites', () => {
	it("n'enregistre qu'une visite par adresse et par tranche de 30 minutes", async () => {
		await client().post('/api/visites').set('X-Client-IP', '10.0.0.1');
		await client().post('/api/visites').set('X-Client-IP', '10.0.0.1');
		expect(db.select().from(visite).all()).toHaveLength(1);

		// Une autre adresse est bien comptée séparément.
		await client().post('/api/visites').set('X-Client-IP', '10.0.0.2');
		expect(db.select().from(visite).all()).toHaveLength(2);
	});
});

describe('listes simples', () => {
	it('trie les diplômes et les familles d\'articles par libellé', async () => {
		db.insert(diplome).values([{ libelle: 'Licence' }, { libelle: 'BAC' }]).run();
		db.insert(familleArticle).values([{ libelle: 'Mobilier' }, { libelle: 'Électronique' }]).run();

		const d = await client().get('/api/referentiels/diplomes');
		expect(d.body.map((x: { libelle: string }) => x.libelle)).toEqual(['BAC', 'Licence']);

		// « Électronique » après « Mobilier » : SQLite trie sur les octets et place les lettres
		// accentuées après tout l'alphabet non accentué. Comportement identique à l'ancien backend
		// (même moteur, même ORDER BY) — conservé tel quel pour ne pas mélanger migration et
		// correction. À traiter, le cas échéant, dans un chantier « tri français » séparé.
		const f = await client().get('/api/referentiels/familles-articles');
		expect(f.body.map((x: { libelle: string }) => x.libelle)).toEqual(['Mobilier', 'Électronique']);
	});
});
