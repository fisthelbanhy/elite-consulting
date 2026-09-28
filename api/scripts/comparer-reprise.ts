/**
 * Outil de migration : compare les bases produites par **les deux scripts de reprise** des données
 * legacy, ligne par ligne et colonne par colonne.
 *
 * C'est le pendant de `comparer-reponses.ts` pour la reprise : le dump de production n'étant pas
 * versionné (ADR-0012), la parité se prouve sur le dump de synthèse de `dump-synthetique.ts`, qui
 * exerce à dessein toutes les corrections que la reprise applique.
 *
 * Mode d'emploi, depuis `api/` :
 *   npx tsx scripts/dump-synthetique.ts /tmp/legacy.sql
 *   (cd ../backend && LF_DATABASE_URL="sqlite:///tmp/py.sqlite3" LF_MEDIA_DIR=/tmp/py-media \
 *      .venv/bin/python scripts/reprise_legacy.py /tmp/legacy.sql --rapport /tmp/py-rapport.md)
 *   LF_DATABASE_URL="sqlite:///tmp/ts.sqlite3" LF_MEDIA_DIR=/tmp/ts-media \
 *      npx tsx src/scripts/reprise-legacy.ts /tmp/legacy.sql --rapport /tmp/ts-rapport.md
 *   npx tsx scripts/comparer-reprise.ts /tmp/ts.sqlite3 /tmp/py.sqlite3
 *
 * Il compare deux bases déjà constituées : produire celle de Python demande de restaurer
 * `backend/` depuis l'historique (`git checkout 51ecdba -- backend`).
 */
import Database from 'better-sqlite3';

/**
 * Colonnes qui ne peuvent pas coïncider : Argon2 tire un sel au hasard à chaque hachage, si bien
 * que deux hachages du même mot de passe diffèrent — c'est le propre d'un bon hachage. Ce que l'on
 * veut vérifier, c'est que le mot de passe reste valide, et `verifier-hachages.ts` s'en charge.
 */
const VOLATILES = /hash$/;

/** Tables de service des deux outils de migration, absentes du schéma métier. */
const HORS_SCHEMA = new Set(['alembic_version', '__drizzle_migrations']);

/**
 * Python écrit son JSON avec des espaces après les deux-points et échappe le non-ASCII
 * (`{"nom": "Couturière"}`), là où `JSON.stringify` est compact et laisse l'UTF-8 tel quel.
 * Les deux se relisent à l'identique : on compare donc le contenu, pas son écriture.
 */
function normaliser(v: unknown): unknown {
	if (typeof v !== 'string') return v;
	try {
		const o: unknown = JSON.parse(v);
		if (o && typeof o === 'object') return JSON.stringify(o);
	} catch {
		/* ce n'est pas du JSON : comparé tel quel */
	}
	return v;
}

function tables(db: Database.Database): string[] {
	const lignes = db
		.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
		.all() as { name: string }[];
	return lignes
		.map((l) => l.name)
		.filter((n) => !HORS_SCHEMA.has(n))
		.sort();
}

const [cheminTs, cheminPy] = [process.argv[2], process.argv[3]];
if (!cheminTs || !cheminPy) {
	throw new Error(
		'Usage : npx tsx scripts/comparer-reprise.ts <base-ts.sqlite3> <base-py.sqlite3>'
	);
}

const ts = new Database(cheminTs, { readonly: true });
const py = new Database(cheminPy, { readonly: true });

const toutes = [...new Set([...tables(ts), ...tables(py)])].sort();
let lignesComparees = 0;
const ecarts = new Map<string, number>();

for (const table of toutes) {
	const a = ts.prepare(`select * from "${table}" order by rowid`).all() as Record<
		string,
		unknown
	>[];
	const b = py.prepare(`select * from "${table}" order by rowid`).all() as Record<
		string,
		unknown
	>[];
	if (a.length !== b.length) {
		console.log(`--- ${table} : ${a.length} ligne(s) côté Express, ${b.length} côté Python`);
		ecarts.set(table, (ecarts.get(table) ?? 0) + 1);
		continue;
	}
	lignesComparees += a.length;
	if (!a.length) continue;
	for (const colonne of Object.keys(a[0]!).filter((c) => !VOLATILES.test(c))) {
		for (let i = 0; i < a.length; i += 1) {
			const x = JSON.stringify(normaliser(a[i]![colonne]));
			const y = JSON.stringify(normaliser(b[i]![colonne]));
			if (x === y) continue;
			const cle = `${table}.${colonne}`;
			ecarts.set(cle, (ecarts.get(cle) ?? 0) + 1);
			if (ecarts.get(cle) === 1) {
				console.log(`${cle} (ligne ${i + 1}) : ${x?.slice(0, 160)} / ${y?.slice(0, 160)}`);
			}
		}
	}
}

console.log(`\n${toutes.length} table(s), ${lignesComparees} ligne(s) comparée(s).`);
if (ecarts.size) {
	const total = [...ecarts.values()].reduce((x, y) => x + y, 0);
	console.log(`${total} écart(s) sur ${ecarts.size} colonne(s).`);
	process.exit(1);
}
console.log('Reprises identiques (hors hachages, par nature aléatoires).');
