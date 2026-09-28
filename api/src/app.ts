/**
 * Application Express de La Frangine (portage de `app/main.py`).
 * Toutes les routes métier sont préfixées par `/api` ; les fichiers téléversés sont servis
 * sous `/media`.
 */
import express, { Router, type Express } from 'express';
import { mkdirSync } from 'node:fs';
import { config } from './config.js';
import { membreOptionnel } from './deps.js';
import { gestionnaireDErreurs, routeInconnue } from './erreurs.js';
import { ROUTEURS } from './routes/index.js';
import { chargerTraitements } from './services/traitements.js';

export function creerApp(): Express {
	chargerTraitements();

	const app = express();

	// Derrière un reverse proxy : nécessaire pour que `req.ip` soit l'adresse du visiteur.
	app.set('trust proxy', true);
	// Pas d'en-tête « X-Powered-By: Express » (ne rien dire de l'infrastructure).
	app.disable('x-powered-by');

	const api = Router();
	api.use(express.json({ limit: '1mb' }));
	api.use(express.urlencoded({ extended: false, limit: '1mb' }));
	api.use(membreOptionnel);

	api.get('/sante', (_req, res) => {
		res.json({ statut: 'ok' });
	});

	for (const routeur of ROUTEURS) api.use(routeur.prefixe, routeur.routeur);

	api.use(routeInconnue);
	app.use('/api', api);

	// Fichiers téléversés. `immutable` est sûr : les noms sont des empreintes aléatoires,
	// un fichier donné n'est jamais remplacé par un autre contenu.
	mkdirSync(config.mediaDir, { recursive: true });
	app.use(
		config.mediaUrl,
		express.static(config.mediaDir, {
			maxAge: '30d',
			immutable: true,
			index: false,
			dotfiles: 'deny'
		})
	);

	app.use(gestionnaireDErreurs);
	return app;
}
