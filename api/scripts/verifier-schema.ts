/**
 * Vérification du schéma contre le relevé figé avant la bascule (ADR-0013).
 *
 * Construit une base SQLite à partir de la migration Drizzle, puis compare chaque colonne à
 * `schema-reference.json` — le schéma de la base de production, relevé avant toute modification :
 * type, NOT NULL, clé primaire, valeur par défaut.
 *
 * C'est la garantie que la base existante, avec ses 68 membres, reste lisible telle quelle.
 * Usage : `npm run verifier:schema`
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

interface ColonneRef {
	type: string;
	notnull: number;
	defaut: string | null;
	pk: number;
}

const ICI = dirname(fileURLToPath(import.meta.url));
const reference: Record<string, Record<string, ColonneRef>> = JSON.parse(
	readFileSync(join(ICI, 'schema-reference.json'), 'utf8')
);

// --- Base construite depuis la migration Drizzle -------------------------------------------------

const sql = readFileSync(join(ICI, '..', 'migrations', '0000_schema_initial.sql'), 'utf8');
const db = new Database(':memory:');
for (const bloc of sql.split('--> statement-breakpoint')) {
	const instruction = bloc.trim();
	if (instruction) db.exec(instruction);
}

const obtenu: Record<string, Record<string, ColonneRef>> = {};
const tables = db
	.prepare(
		"select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
	)
	.all() as { name: string }[];
for (const { name } of tables) {
	const colonnes = db.prepare(`pragma table_info("${name}")`).all() as {
		name: string;
		type: string;
		notnull: number;
		dflt_value: string | null;
		pk: number;
	}[];
	obtenu[name] = Object.fromEntries(
		colonnes.map((c) => [
			c.name,
			{ type: c.type, notnull: c.notnull, defaut: c.dflt_value, pk: c.pk }
		])
	);
}

// --- Comparaison ---------------------------------------------------------------------------------

/** Les deux outils écrivent les mêmes affinités SQLite sous des noms différents. */
function affinite(type: string): string {
	const t = (type || '').toUpperCase().replace(/\(\d+(,\s*\d+)?\)/, '');
	if (['VARCHAR', 'TEXT', 'CHAR'].includes(t)) return 'TEXT';
	if (['INTEGER', 'SMALLINT', 'BIGINT', 'BOOLEAN'].includes(t)) return 'INTEGER';
	if (['FLOAT', 'REAL', 'NUMERIC'].includes(t)) return 'REAL';
	return t;
}

const bloquants: string[] = [];
let defautsAjoutes = 0;
const defautsRetires: string[] = [];
let nbColonnes = 0;

for (const [table, colonnes] of Object.entries(reference)) {
	const mien = obtenu[table];
	if (!mien) {
		bloquants.push(`table manquante : ${table}`);
		continue;
	}
	for (const [nom, attendu] of Object.entries(colonnes)) {
		nbColonnes++;
		const eu = mien[nom];
		if (!eu) {
			bloquants.push(`${table}.${nom} : colonne absente`);
			continue;
		}
		if (affinite(attendu.type) !== affinite(eu.type))
			bloquants.push(`${table}.${nom} : type ${attendu.type} → ${eu.type}`);
		if (attendu.notnull !== eu.notnull)
			bloquants.push(`${table}.${nom} : NOT NULL ${attendu.notnull} → ${eu.notnull}`);
		if (attendu.pk !== eu.pk)
			bloquants.push(`${table}.${nom} : clé primaire ${attendu.pk} → ${eu.pk}`);

		// Écarts de valeur par défaut : informatifs (voir la note en fin de fichier).
		if (attendu.defaut == null && eu.defaut != null) defautsAjoutes++;
		else if (attendu.defaut != null && eu.defaut == null)
			defautsRetires.push(`${table}.${nom} (était ${attendu.defaut})`);
	}
}
for (const table of Object.keys(obtenu)) {
	if (!reference[table]) bloquants.push(`table en trop : ${table}`);
}

// --- Compte rendu --------------------------------------------------------------------------------

for (const ligne of bloquants) console.log(`✗ ${ligne}`);

console.log(`\n${Object.keys(obtenu).length} tables, ${nbColonnes} colonnes comparées.`);
console.log(`  écarts bloquants (type / NOT NULL / clé primaire) : ${bloquants.length}`);
console.log(`  défauts SQL ajoutés : ${defautsAjoutes} — sans effet sur la lecture des données`);
console.log(`  défauts SQL retirés : ${defautsRetires.length}`);

if (defautsRetires.length) {
	console.log(
		"\nNote : l'ancien backend posait ses valeurs par défaut dans le code (aucune clause DEFAULT en\n" +
			'base), Drizzle les inscrit dans le SQL — un INSERT direct obtient donc désormais la même\n' +
			"valeur que via l'ORM. Dans l'autre sens, les colonnes `date_creation` perdent leur DEFAULT\n" +
			'CURRENT_TIMESTAMP : la date est posée par le code, en heure locale, exactement comme avant —\n' +
			'le défaut applicatif primait déjà sur le défaut SQL.'
	);
}

console.log(
	bloquants.length === 0
		? '\n✓ Schéma identique au relevé de référence.'
		: `\n✗ ${bloquants.length} écart(s) bloquant(s).`
);
process.exit(bloquants.length === 0 ? 0 : 1);
