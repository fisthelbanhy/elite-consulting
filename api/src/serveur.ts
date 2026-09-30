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

/** Valeur de `LF_SITE_URL` par défaut : celle du serveur de développement de Vite. */
const SITE_URL_DEV = 'http://localhost:5173';

/**
 * SvelteKit refuse toute soumission de formulaire dont l'en-tête `Origin` ne correspond pas à
 * `ORIGIN` (protection CSRF). En production, `ORIGIN` vient de `LF_SITE_URL` : restée à sa valeur
 * de développement, **chaque envoi de formulaire répondrait 403** — connexion comprise — sans
 * qu'aucune trace n'explique pourquoi. Mieux vaut ne pas démarrer du tout.
 */
function verifierAdressePublique(): void {
	if (process.env.ORIGIN || config.siteUrl !== SITE_URL_DEV) return;
	if (config.environnement === 'dev' || config.environnement === 'test') {
		console.warn(
			`Attention : LF_SITE_URL vaut encore « ${SITE_URL_DEV} ». Les formulaires ne seront ` +
				"acceptés que sur cette adresse — posez l'adresse réelle avant de servir le site."
		);
		return;
	}
	throw new Error(
		`LF_SITE_URL doit porter l'adresse publique du site (reçu : « ${SITE_URL_DEV} », la valeur ` +
			'de développement). Sans elle, SvelteKit rejette tous les envois de formulaire en 403.'
	);
}

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
	if (!config.servirSite || !existsSync(entree)) return null;
	verifierAdressePublique();
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
	} else if (!config.servirSite) {
		console.log('Mode API seule (LF_SERVIR_SITE=0) : le site est servi par Vite.');
	} else {
		console.log(
			'Site non construit (frontend/build absent) : démarrage en mode API seule.\n' +
				'Lancez `npm run build` à la racine pour que ce processus serve aussi le site.'
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
