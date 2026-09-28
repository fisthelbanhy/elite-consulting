/**
 * Outil de migration : compare les routes réellement montées par Express au contrat OpenAPI gelé
 * avant la bascule (`docs/migration-express-parite.md`).
 *
 * Il répond à une seule question : « le nouveau backend expose-t-il exactement les mêmes
 * opérations que l'ancien ? ». À lancer avec `npx tsx scripts/verifier-routes.ts` ; il sort en
 * erreur dès qu'une route manque ou qu'une route inattendue apparaît.
 *
 * Comme `scripts/verifier-schema.ts`, il n'a plus d'utilité une fois la migration terminée.
 */
import { readFileSync } from 'node:fs';
import { ROUTEURS } from '../src/routes/index.js';

/** Une couche du routeur Express : soit une route, soit un middleware. */
interface Couche {
	route?: { path: string; methods: Record<string, boolean> };
}

/** `/membres/:id` → `/membres/{x}` : les noms de paramètres diffèrent entre les deux backends. */
function normaliser(chemin: string): string {
	return chemin.replace(/:[A-Za-z_]+/g, '{x}').replace(/\{[^}]+\}/g, '{x}');
}

function routesMontees(): Set<string> {
	const trouvees = new Set<string>(['GET /api/sante']);
	for (const { prefixe, routeur } of ROUTEURS) {
		const pile = (routeur as unknown as { stack: Couche[] }).stack;
		for (const couche of pile) {
			if (!couche.route) continue;
			const chemin = couche.route.path === '/' ? '' : couche.route.path;
			for (const methode of Object.keys(couche.route.methods)) {
				trouvees.add(`${methode.toUpperCase()} /api${prefixe}${normaliser(chemin)}`);
			}
		}
	}
	return trouvees;
}

function routesAttendues(fichier: string): Set<string> {
	const attendues = new Set<string>();
	for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
		const m = /^- \[[ x]\] `([A-Z]+) ([^`]+)`/.exec(ligne);
		if (m) attendues.add(`${m[1]} ${normaliser(m[2]!)}`);
	}
	return attendues;
}

const montees = routesMontees();
const attendues = routesAttendues(
	new URL('../../docs/migration-express-parite.md', import.meta.url).pathname
);

const manquantes = [...attendues].filter((r) => !montees.has(r)).sort();
const enTrop = [...montees].filter((r) => !attendues.has(r)).sort();

console.log(`Routes montées par Express : ${montees.size}`);
console.log(`Contrat de l'ancien backend : ${attendues.size}`);
for (const r of manquantes) console.log(`  MANQUANTE  ${r}`);
for (const r of enTrop) console.log(`  EN TROP    ${r}`);

if (manquantes.length || enTrop.length) {
	console.log(`\n${manquantes.length} manquante(s), ${enTrop.length} en trop.`);
	process.exit(1);
}
console.log('\nParité des routes vérifiée : aucune différence.');
