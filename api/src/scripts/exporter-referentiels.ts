/**
 * Exporte les référentiels **non personnels** de la base locale vers `api/fixtures/referentiels.json`.
 * Portage de `backend/scripts/exporter_referentiels.py`.
 *
 * Ce fichier est versionné : il permet à une session cloud (ou à un nouveau poste) d'avoir un site
 * utilisable sans le dump de production, qui contient des données personnelles et ne doit jamais
 * être publié (ADR-0012).
 *
 * Sont exportés : paramètres du site, villes et quartiers, secteurs et domaines d'activité,
 * diplômes, familles d'articles, banques (sans les contacts nominatifs), catalogue produits et
 * fiches bien-être. Aucun membre, aucune annonce, aucun message.
 *
 * Usage (depuis `api/`) : `npm run referentiels:exporter`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { BASE_DIR } from '../config.js';
import { db, serialiserDate } from '../db.js';
import * as S from '../schema/index.js';

const CIBLE = join(BASE_DIR, 'fixtures', 'referentiels.json');

/**
 * Colonnes volontairement laissées de côté : contacts nominatifs des banques (données
 * personnelles), compteurs de séquences et d'audience (propres à chaque installation).
 */
const EXCLUS: Record<string, Set<string>> = {
	banque: new Set(['membre_id', 'nom_contact', 'telephone_contact', 'observation']),
	parametre: new Set(['compteur_membre', 'compteur_reference']),
	produit: new Set(['nombre_visites', 'date_derniere_visite', 'photo'])
};

/** Tables exportées, dans l'ordre des dépendances (c'est celui que relit le script de démo). */
const TABLES: [string, SQLiteTable][] = [
	['parametre', S.parametre],
	['ville', S.ville],
	['quartier', S.quartier],
	['secteur_activite', S.secteurActivite],
	['domaine_activite', S.domaineActivite],
	['diplome', S.diplome],
	['famille_article', S.familleArticle],
	['banque', S.banque],
	['produit', S.produit],
	['maladie', S.maladie],
	['maladie_produit', S.maladieProduit]
];

function lignes(nom: string, table: SQLiteTable): Record<string, unknown>[] {
	const exclus = EXCLUS[nom] ?? new Set<string>();
	const colonnes = Object.keys(getTableColumns(table)).filter((c) => !exclus.has(c));
	const brutes = db.select().from(table).all() as Record<string, unknown>[];
	return brutes.map((brute) => {
		const ligne: Record<string, unknown> = {};
		for (const colonne of colonnes) {
			const valeur = brute[colonne];
			// `isoformat()` côté Python : une date sort en texte, le reste tel quel.
			ligne[colonne] = valeur instanceof Date ? serialiserDate(valeur) : valeur;
		}
		return ligne;
	});
}

const donnees: Record<string, Record<string, unknown>[]> = {};
for (const [nom, table] of TABLES) donnees[nom] = lignes(nom, table);

mkdirSync(dirname(CIBLE), { recursive: true });
writeFileSync(CIBLE, `${JSON.stringify(donnees, null, 1)}\n`, 'utf8');

const total = Object.values(donnees).reduce((n, v) => n + v.length, 0);
console.log(`${total} lignes exportées vers ${CIBLE}`);
for (const [nom, v] of Object.entries(donnees)) console.log(`  ${nom.padEnd(20)} ${v.length}`);
