/**
 * Connexion à la base et types de colonnes communs.
 *
 * Moteur : SQLite (ADR-0013). Le schéma, les noms de colonnes **et les formats de stockage**
 * sont ceux de la base de production existante, pour qu'elle reste lisible sans conversion.
 *
 * Point de vigilance : les dates y sont stockées sous forme de **texte**
 * (`2026-09-28 14:30:00.000000`), pas d'entiers Unix comme le ferait Drizzle par défaut. Les types
 * `dateHeure` et `dateSeule` ci-dessous reproduisent exactement ce format.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { customType, integer, text } from 'drizzle-orm/sqlite-core';
import { config } from './config.js';

// --- Types de colonnes reproduisant le stockage de la base existante -------------------------

function deuxChiffres(n: number): string {
	return String(n).padStart(2, '0');
}

/** `2026-09-28 14:30:00.000000` — heure locale, sans fuseau, comme dans la base existante. */
export function formaterDateHeure(d: Date): string {
	const micro = String(d.getMilliseconds()).padStart(3, '0') + '000';
	return (
		`${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())} ` +
		`${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}:${deuxChiffres(d.getSeconds())}.${micro}`
	);
}

/** `2026-09-28` — date seule, heure locale. */
export function formaterDate(d: Date): string {
	return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/**
 * Relit une date de la base. Le texte est interprété en heure **locale** et non UTC : c'est
 * ainsi qu'il a été écrit, et l'interpréter en UTC décalerait toutes les dates existantes.
 */
export function analyserDateHeure(valeur: string): Date {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?/.exec(
		valeur
	);
	if (!m) return new Date(valeur);
	const [, a, mo, j, h, mi, s, frac] = m;
	return new Date(
		Number(a),
		Number(mo) - 1,
		Number(j),
		Number(h ?? 0),
		Number(mi ?? 0),
		Number(s ?? 0),
		frac ? Number(frac.slice(0, 3).padEnd(3, '0')) : 0
	);
}

let derniereHorodate = 0;

/**
 * Horodatage de création, **strictement croissant** au sein du processus.
 *
 * Toutes les listes de fiches sont triées par `date_creation desc` et rien d'autre. L'ancien
 * backend stockait des microsecondes : deux fiches créées coup sur coup avaient toujours des dates
 * différentes, donc un ordre stable. Une `Date` JavaScript s'arrête à la milliseconde, si bien que
 * deux écritures rapprochées (un script de reprise, un envoi groupé) porteraient la même date et
 * ressortiraient dans un ordre arbitraire, variable d'une requête à l'autre.
 *
 * On avance donc d'une milliseconde à chaque appel plutôt que de rendre deux fois la même. Le
 * décalage ne peut apparaître qu'au-delà de mille créations par seconde et se résorbe seul.
 */
export function maintenant(): Date {
	derniereHorodate = Math.max(Date.now(), derniereHorodate + 1);
	return new Date(derniereHorodate);
}

/** Colonne `DATETIME` stockée en texte, comme dans la base existante. */
export const dateHeure = customType<{ data: Date; driverData: string }>({
	dataType: () => 'DATETIME',
	toDriver: (valeur) => formaterDateHeure(valeur),
	fromDriver: (valeur) => analyserDateHeure(valeur)
});

/**
 * Date **sans heure**, distinguée d'une date-heure par son type pour que la réponse JSON porte
 * `2026-10-15` et non `2026-10-15T00:00:00` (voir `serialiserDate`). C'est une vraie `Date` : les
 * comparaisons, les tris et l'écriture en base fonctionnent comme avant.
 */
export class JourSeul extends Date {}

/**
 * Format JSON d'une date : heure **locale, sans fuseau**, sans « Z » — ce que le site attend.
 *
 * `JSON.stringify` écrirait `2026-09-28T13:30:00.000Z` là où l'ancien backend écrivait
 * `2026-09-28T14:30:00` : le site, qui relit ces chaînes avec `new Date(…)`, afficherait une heure
 * — voire un jour — décalée, et un `<input type="date">` resterait vide.
 */
export function serialiserDate(d: Date): string {
	if (d instanceof JourSeul) return formaterDate(d);
	const base = formaterDateHeure(d).replace(' ', 'T');
	// Millisecondes seulement si elles sont significatives.
	return d.getMilliseconds() === 0 ? base.slice(0, 19) : base.slice(0, 23);
}

/** Colonne `DATE` (sans heure) stockée en texte, comme dans la base existante. */
export const dateSeule = customType<{ data: Date; driverData: string }>({
	dataType: () => 'DATE',
	toDriver: (valeur) => formaterDate(valeur),
	fromDriver: (valeur) => {
		const d = analyserDateHeure(valeur);
		return new JourSeul(d.getTime());
	}
});

/**
 * Colonne `JSON`, déclarée avec le type SQL `JSON` (et non `TEXT`, ce qu'écrirait
 * le mode json de Drizzle) : le contenu est identique, mais le type déclaré est conservé pour que
 * le schéma de la base de production reste exactement le même.
 */
export function json<T>(nom: string) {
	return customType<{ data: T; driverData: string }>({
		dataType: () => 'JSON',
		toDriver: (valeur) => JSON.stringify(valeur),
		fromDriver: (valeur) => (typeof valeur === 'string' ? JSON.parse(valeur) : valeur) as T
	})(nom);
}

/** Booléen stocké en 0/1, comme dans la base existante. */
export function booleen(nom?: string) {
	return nom ? integer(nom, { mode: 'boolean' }) : integer({ mode: 'boolean' });
}

// --- Fragments de colonnes répétés --------------------------------------------------------------

/** Date de création renseignée automatiquement (mixin `Horodatage`). */
export const horodatage = {
	date_creation: dateHeure('date_creation').notNull().$defaultFn(maintenant)
};

/** Compteur de consultations (motif `nbvisiteX`/`datevisiteX` répété dans tout le legacy). */
export const consultable = {
	nombre_visites: integer('nombre_visites').notNull().default(0),
	date_derniere_visite: dateHeure('date_derniere_visite')
};

/** Colonne texte non nulle par défaut vide — le cas le plus fréquent du schéma legacy. */
export function texteVide(nom: string) {
	return text(nom).notNull().default('');
}

// --- Connexion ---------------------------------------------------------------------------------

if (!config.estSqlite) {
	throw new Error(
		`LF_DATABASE_URL doit pointer vers SQLite (ADR-0013) — reçu : « ${config.databaseUrl} ».`
	);
}

const chemin = config.cheminSqlite;
if (chemin !== ':memory:') mkdirSync(dirname(chemin), { recursive: true });

export const sqlite = new Database(chemin);
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');
// Laisse SQLite patienter au lieu d'échouer si une écriture concurrente tient le verrou.
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite);

export type Db = typeof db;
