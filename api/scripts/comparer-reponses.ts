/**
 * Outil de migration : interroge **les deux backends** avec le même jeu de données de
 * démonstration et compare les réponses JSON octet par octet.
 *
 * `scripts/verifier-schema.ts` prouve que les tables sont les mêmes, `scripts/verifier-routes.ts`
 * que les routes sont les mêmes ; celui-ci prouve que les *réponses* sont les mêmes — c'est la
 * seule vérification qui couvre le calcul, l'ordre de tri et le format des dates.
 *
 * Mode d'emploi :
 *   1. `npx tsx src/scripts/donnees-demo.ts`         (base Express, port 8000)
 *   2. l'ancien backend sur une base de démo identique (port 8001)
 *   3. `npx tsx scripts/comparer-reponses.ts`
 *
 * Il n'interroge que les routes de lecture (`GET`) : aucune écriture, donc les deux bases restent
 * comparables d'un bout à l'autre.
 *
 * Il a besoin de l'ancien backend Python, supprimé le 28/09/2026 : pour le rejouer, restaurer
 * `backend/` depuis l'historique (`git checkout 51ecdba -- backend`) et le lancer sur le
 * port 8001.
 */
import { readFileSync } from 'node:fs';

const EXPRESS = process.env.URL_EXPRESS ?? 'http://127.0.0.1:8000';
const PYTHON = process.env.URL_PYTHON ?? 'http://127.0.0.1:8001';

/**
 * Valeurs qui diffèrent forcément d'une base à l'autre : jetons, et tout horodatage posé au moment
 * où la donnée de démonstration a été créée. Seule leur valeur est neutralisée — l'ordre des
 * listes qu'elles trient, lui, reste comparé (c'est ce qui révèle une erreur de tri).
 */
const VOLATILES =
	/^(jeton|expire|date|date_connexion|date_creation|date_envoi|date_message|date_modification|derniere_connexion|derniere_activite)$/;

/**
 * Routes dont l'écart vient du **jeu de démonstration** et non du backend.
 *
 * `/referentiels/a-la-une` remonte les fiches les plus récentes tous modules confondus. Les deux
 * scripts de démonstration créent pourtant les mêmes fiches dans le même ordre : c'est SQLAlchemy
 * qui, au moment du `flush`, réordonne les insertions par table (article, immobilier, marché…)
 * alors que Drizzle écrit dans l'ordre du script. Les horodatages de création ne tombent donc pas
 * dans le même ordre, et le fil « à la une » ne commence pas par la même fiche. Le tri lui-même
 * est identique des deux côtés — vérifié en comparant l'ordre d'insertion des deux bases.
 */
const ARTEFACTS_DE_SEMIS = new Set(['/api/referentiels/a-la-une']);

/**
 * Remplace les valeurs volatiles par un marqueur et **trie les clés** : l'ordre des clés d'un
 * objet JSON n'a aucune signification, seule leur présence et leur valeur en ont une.
 */
function neutraliser(valeur: unknown): unknown {
	if (Array.isArray(valeur)) return valeur.map(neutraliser);
	if (valeur && typeof valeur === 'object') {
		const sortie: Record<string, unknown> = {};
		for (const cle of Object.keys(valeur as Record<string, unknown>).sort()) {
			const v = (valeur as Record<string, unknown>)[cle];
			sortie[cle] = VOLATILES.test(cle) ? '«volatile»' : neutraliser(v);
		}
		return sortie;
	}
	return valeur;
}

/** Liste les écarts entre deux réponses, chemin par chemin (`items[0].photo_url`…). */
function ecarts(a: unknown, b: unknown, chemin = ''): string[] {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return [`${chemin} : ${a.length} élément(s) / ${b.length}`];
		return a.flatMap((v, i) => ecarts(v, b[i], `${chemin}[${i}]`));
	}
	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const oa = a as Record<string, unknown>;
		const ob = b as Record<string, unknown>;
		const cles = [...new Set([...Object.keys(oa), ...Object.keys(ob)])].sort();
		return cles.flatMap((cle) => {
			const sous = chemin ? `${chemin}.${cle}` : cle;
			if (!(cle in oa)) return [`${sous} : absent côté Express`];
			if (!(cle in ob)) return [`${sous} : absent côté Python`];
			return ecarts(oa[cle], ob[cle], sous);
		});
	}
	if (JSON.stringify(a) === JSON.stringify(b)) return [];
	return [`${chemin || '(racine)'} : ${JSON.stringify(a)} / ${JSON.stringify(b)}`];
}

async function connecter(base: string): Promise<string> {
	const rep = await fetch(`${base}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ identifiant: 'demo.gestion', mot_de_passe: 'demo1234' })
	});
	if (!rep.ok) throw new Error(`Connexion impossible sur ${base} : ${rep.status}`);
	return ((await rep.json()) as { jeton: string }).jeton;
}

/** Les routes `GET` du contrat gelé, paramètres remplacés par les identifiants de la démo. */
function routesLecture(): string[] {
	const fichier = new URL('../../docs/migration-express-parite.md', import.meta.url).pathname;
	const routes: string[] = [];
	for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
		const m = /^- \[[ x]\] `GET (\/api\/[^`]+)`/.exec(ligne);
		if (!m) continue;
		// `{annee}` vaut l'année en cours, tout le reste vaut 1 : la démo crée une fiche par module.
		const chemin = m[1]!
			.replace(/\{annee\}/g, String(new Date().getFullYear()))
			.replace(/\{[^}]+\}/g, '1');
		routes.push(chemin);
	}
	return routes;
}

async function lire(base: string, chemin: string, jeton: string) {
	const rep = await fetch(base + chemin, { headers: { Authorization: `Bearer ${jeton}` } });
	const brut = await rep.text();
	let corps: unknown = brut;
	try {
		corps = neutraliser(JSON.parse(brut));
	} catch {
		/* réponse non JSON (un fichier, par exemple) : comparée telle quelle */
	}
	return { statut: rep.status, corps };
}

const [jetonExpress, jetonPython] = await Promise.all([connecter(EXPRESS), connecter(PYTHON)]);

const routes = routesLecture();
const differences: string[] = [];

for (const chemin of routes) {
	const [e, p] = await Promise.all([
		lire(EXPRESS, chemin, jetonExpress),
		lire(PYTHON, chemin, jetonPython)
	]);
	const lignes = ecarts(e.corps, p.corps);
	if (e.statut !== p.statut || lignes.length) {
		if (ARTEFACTS_DE_SEMIS.has(chemin)) {
			console.log(`--- GET ${chemin} : écart connu, dû au jeu de démonstration (voir l'en-tête).`);
			continue;
		}
		differences.push(chemin);
		console.log(`--- GET ${chemin}`);
		if (e.statut !== p.statut) console.log(`  statut : ${e.statut} / ${p.statut}`);
		// Format : « chemin : valeur Express / valeur Python ».
		for (const l of lignes.slice(0, 8)) console.log(`  ${l}`);
		if (lignes.length > 8) console.log(`  … ${lignes.length - 8} autre(s) écart(s)`);
	}
}

console.log(`\n${routes.length} route(s) de lecture comparée(s).`);
if (differences.length) {
	console.log(`${differences.length} différence(s).`);
	process.exit(1);
}
console.log('Réponses identiques sur les deux backends.');
