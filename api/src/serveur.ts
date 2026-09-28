/**
 * Point d'entrée du processus (ADR-0013).
 *
 * Un seul processus Node sert **à la fois** l'API et le site :
 *
 *     Navigateur ──▶ Node
 *                     ├── Express : /api/*   (routes métier)
 *                     ├── Express : /media/* (fichiers téléversés)
 *                     └── handler SvelteKit : tout le reste (SSR, form actions)
 *
 * C'est ce qui permet de n'héberger **qu'un seul service** : c'est le nombre de services, et non
 * le langage, qui détermine le coût d'un hébergement.
 *
 * Si le site n'a pas encore été construit (`frontend/build`), le serveur démarre quand même en
 * mode API seule — c'est le cas en développement, où Vite sert le site sur son propre port.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { RequestHandler } from 'express';
import { creerApp } from './app.js';
import { config } from './config.js';
import { purgerSessionsExpirees } from './deps.js';
import { appliquerMigrations } from './scripts/migrer.js';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUILD_SITE = join(RACINE, 'frontend', 'build');

/**
 * Charge le handler produit par `@sveltejs/adapter-node`, s'il existe.
 * L'import est dynamique : le fichier n'existe qu'après `npm run build`.
 */
async function chargerSite(): Promise<RequestHandler | null> {
	const entree = join(BUILD_SITE, 'handler.js');
	if (!existsSync(entree)) return null;
	const module = (await import(pathToFileURL(entree).href)) as { handler: RequestHandler };
	return module.handler;
}

async function demarrer(): Promise<void> {
	appliquerMigrations();
	const purgees = purgerSessionsExpirees();
	if (purgees > 0) console.log(`${purgees} session(s) expirée(s) purgée(s).`);

	const app = creerApp();

	const site = await chargerSite();
	if (site) {
		// Monté en dernier : l'API et les médias ont la priorité sur les routes du site.
		app.use(site);
		console.log('Site SvelteKit servi par le même processus.');
	} else {
		console.log(
			'Site non construit (frontend/build absent) : démarrage en mode API seule.\n' +
				'En développement, le site est servi par Vite sur http://localhost:5173.'
		);
	}

	app.listen(config.port, () => {
		console.log(`La Frangine écoute sur http://127.0.0.1:${config.port}`);
		console.log(`  API    : http://127.0.0.1:${config.port}/api/sante`);
		console.log(`  Base   : ${config.cheminSqlite}`);
		console.log(`  Médias : ${config.mediaDir}`);
	});
}

demarrer().catch((e) => {
	console.error('Démarrage impossible :', e);
	process.exit(1);
});
