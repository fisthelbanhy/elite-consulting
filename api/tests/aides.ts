/**
 * Fixtures partagées par les tests (portage de `tests/conftest.py`).
 *
 * Chaque fichier de test tourne dans son propre processus avec sa propre base SQLite en mémoire
 * (voir `vitest.config.ts`) : `basePropre()` recrée simplement un jeu de référentiels minimal
 * avant chaque test.
 */
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeEach } from 'vitest';
import { creerApp } from '../src/app.js';
import { db, sqlite } from '../src/db.js';
import { Etat, TypeMembre } from '../src/enums.js';
import {
	domaineActivite,
	parametre,
	quartier,
	secteurActivite,
	ville
} from '../src/schema/core.js';
import { membre as tableMembre } from '../src/schema/membres.js';
import { appliquerMigrations } from '../src/scripts/migrer.js';
import { hacherMotDePasse } from '../src/securite.js';

export const app = creerApp();
export const client = () => request(app);

let migre = false;

/** Vide les tables et repose les référentiels de test. Appelé avant chaque test. */
export function reinitialiserBase(): void {
	if (!migre) {
		appliquerMigrations();
		migre = true;
	}
	const tables = sqlite
		.prepare(
			"select name from sqlite_master where type='table' " +
				"and name not like 'sqlite_%' and name <> '__drizzle_migrations'"
		)
		.all() as { name: string }[];
	sqlite.pragma('foreign_keys = OFF');
	for (const { name } of tables) sqlite.prepare(`delete from "${name}"`).run();
	sqlite.pragma('foreign_keys = ON');

	db.insert(parametre)
		.values({
			id: 1,
			compteur_reference: 100,
			montant_minimum_placement: 100_000,
			montant_minimum_course: 5_000,
			commission_course: 4_000
		})
		.run();
	db.insert(ville).values([
		{ id: 2, nom: 'Brazzaville' },
		{ id: 3, nom: 'Pointe-Noire' }
	]).run();
	db.insert(quartier).values({ id: 1, ville_id: 2, nom: 'Bacongo' }).run();
	db.insert(secteurActivite).values({ id: 1, libelle: 'Informatique' }).run();
	db.insert(domaineActivite).values({ id: 1, secteur_id: 1, libelle: 'Développement web' }).run();
}

/** À appeler en tête de chaque fichier de test. */
export function basePropre(): void {
	beforeEach(() => reinitialiserBase());
}

export interface OptionsMembre {
	mdp?: string;
	type_compte?: number;
	nom?: string;
	pseudonyme?: string;
	telephone?: string;
	etat?: number;
	[colonne: string]: unknown;
}

/** Crée un membre de test et renvoie son identifiant technique. */
export async function creerMembre(
	identifiant = 'awa2024',
	options: OptionsMembre = {}
): Promise<number> {
	const {
		mdp = 'motdepasse1',
		type_compte = TypeMembre.MEMBRE,
		nom = 'Awa Test',
		pseudonyme = identifiant,
		telephone = '',
		etat = Etat.AUTORISE,
		...reste
	} = options;

	const cree = db
		.insert(tableMembre)
		.values({
			identifiant,
			mot_de_passe_hash: await hacherMotDePasse(mdp),
			nom,
			pseudonyme,
			telephone,
			ville_id: 2,
			type_compte,
			etat,
			...reste
		})
		.returning({ id: tableMembre.id })
		.get();
	return cree!.id;
}

/** Connecte un membre et renvoie l'en-tête `Authorization` à réutiliser. */
export async function entetes(
	identifiant: string,
	mdp = 'motdepasse1'
): Promise<{ Authorization: string }> {
	const r = await client().post('/api/auth/login').send({ identifiant, mot_de_passe: mdp });
	if (r.status !== 200) throw new Error(`Connexion échouée (${r.status}) : ${r.text}`);
	return { Authorization: `Bearer ${r.body.jeton}` };
}

/** Relit un membre en base (pour vérifier un effet de bord). */
export function lireMembre(id: number) {
	return db.select().from(tableMembre).where(eq(tableMembre.id, id)).get();
}

/** Petite image PNG valide, pour les tests de téléversement. */
export async function imagePng(largeur = 40, hauteur = 30): Promise<Buffer> {
	const sharp = (await import('sharp')).default;
	return sharp({
		create: {
			width: largeur,
			height: hauteur,
			channels: 3,
			background: { r: 255, g: 140, b: 0 }
		}
	})
		.png()
		.toBuffer();
}
