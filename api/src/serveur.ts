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
 *
 * Deux variables sont posées **avant** l'import, car le handler les lit à son chargement :
 * - `ORIGIN` : l'adresse publique du site, dont SvelteKit se sert pour sa protection CSRF ;
 * - `BACKEND_URL` : l'adresse que le BFF appelle pour joindre l'API. Elle pointe sur ce même
 *   processus : le aller-retour reste local (boucle locale, jamais le réseau) et la frontière BFF
 *   de l'ADR-0002 est conservée telle quelle — le navigateur ne parle toujours qu'au site, et le
 *   jeton de session ne quitte pas le serveur.
 */
async function chargerSite(): Promise<RequestHandler | null> {
	const entree = join(BUILD_SITE, 'handler.js');
	if (!existsSync(entree)) return null;
	process.env.ORIGIN ??= config.siteUrl;
	process.env.BACKEND_URL ??= `http://127.0.0.1:${config.port}`;
	const module = (await import(pathToFileURL(entree).href)) as {
		handler: RequestHandler;
	};
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
