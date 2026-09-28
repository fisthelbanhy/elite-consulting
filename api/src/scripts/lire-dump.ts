/**
 * Lecture d'un dump phpMyAdmin/MySQL (portage de `backend/scripts/sqldump.py`).
 *
 * Renvoie les lignes de chaque table sous forme d'objets. Gère les chaînes échappées de MySQL
 * (`\'` `\\` `\n` `\r` `\0` `\Z` et `''`), `NULL`, les nombres, et les `INSERT` multi-lignes de la
 * forme `INSERT INTO \`t\` (\`a\`, \`b\`) VALUES (…), (…);`.
 *
 * Écrit à la main plutôt qu'avec une bibliothèque : le dump de production fait plusieurs dizaines
 * de méga-octets et ne contient qu'une seule construction, `INSERT`. Un analyseur complet de SQL
 * serait plus lourd, plus lent, et surtout plus difficile à comparer à l'original.
 */
import { readFileSync } from 'node:fs';

/** Une valeur de dump, telle qu'elle sort de l'analyse. */
export type ValeurDump = string | number | null;

/** Une ligne : les colonnes de l'`INSERT` associées à leurs valeurs. */
export type LigneDump = Record<string, ValeurDump>;

const ECHAPPEMENTS: Record<string, string> = {
	'0': '\0',
	n: '\n',
	r: '\r',
	t: '\t',
	Z: '\x1a',
	b: '\b'
};

const INSERT = /INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*/g;

const BLANCS = ' \n\r\t';

/**
 * Lit les tuples à partir de l'index `i`, jusqu'au `;` final.
 * Retourne les tuples et l'index qui suit ce `;`.
 */
function lireValeurs(texte: string, depart: number): [ValeurDump[][], number] {
	const tuples: ValeurDump[][] = [];
	let i = depart;
	const n = texte.length;

	while (i < n) {
		const c = texte[i]!;
		if (c === '(') {
			i += 1;
			const ligne: ValeurDump[] = [];
			for (;;) {
				while (BLANCS.includes(texte[i]!)) i += 1;
				if (texte[i] === "'") {
					i += 1;
					const morceaux: string[] = [];
					for (;;) {
						const d = texte[i]!;
						if (d === '\\') {
							const suivant = texte[i + 1]!;
							morceaux.push(ECHAPPEMENTS[suivant] ?? suivant);
							i += 2;
						} else if (d === "'") {
							// `''` à l'intérieur d'une chaîne : une apostrophe littérale.
							if (texte[i + 1] === "'") {
								morceaux.push("'");
								i += 2;
							} else {
								i += 1;
								break;
							}
						} else {
							let j = i;
							while (texte[j] !== '\\' && texte[j] !== "'") j += 1;
							morceaux.push(texte.slice(i, j));
							i = j;
						}
					}
					ligne.push(morceaux.join(''));
				} else {
					let j = i;
					while (texte[j] !== ',' && texte[j] !== ')') j += 1;
					const brut = texte.slice(i, j).trim();
					i = j;
					if (brut.toUpperCase() === 'NULL') ligne.push(null);
					else if (/^[+-]?\d+$/.test(brut)) ligne.push(Number(brut));
					else if (brut !== '' && Number.isFinite(Number(brut))) ligne.push(Number(brut));
					else ligne.push(brut);
				}
				while (BLANCS.includes(texte[i]!)) i += 1;
				if (texte[i] === ',') {
					i += 1;
					continue;
				}
				if (texte[i] === ')') {
					i += 1;
					break;
				}
			}
			tuples.push(ligne);
		} else if (c === ';') {
			return [tuples, i + 1];
		} else {
			i += 1;
		}
	}
	return [tuples, i];
}

/** Analyse le dump et regroupe les lignes par table. */
export function analyserDump(texte: string): Record<string, LigneDump[]> {
	const tables: Record<string, LigneDump[]> = {};
	INSERT.lastIndex = 0;
	for (;;) {
		const m = INSERT.exec(texte);
		if (!m) break;
		const table = m[1]!;
		const colonnes = m[2]!.split(',').map((c) => c.trim().replaceAll('`', ''));
		const [tuples, suite] = lireValeurs(texte, m.index + m[0].length);
		INSERT.lastIndex = suite;
		for (const t of tuples) {
			if (t.length !== colonnes.length) {
				throw new Error(`${table} : ${t.length} valeurs pour ${colonnes.length} colonnes`);
			}
			const ligne: LigneDump = {};
			colonnes.forEach((nom, k) => (ligne[nom] = t[k]!));
			(tables[table] ??= []).push(ligne);
		}
	}
	return tables;
}

/** Lit le fichier puis l'analyse. */
export function lireDump(chemin: string): Record<string, LigneDump[]> {
	return analyserDump(readFileSync(chemin, 'utf8'));
}
