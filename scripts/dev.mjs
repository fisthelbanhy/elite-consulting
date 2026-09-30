#!/usr/bin/env node
/**
 * Lance les serveurs de développement dans un seul terminal.
 *
 * En production, un seul processus Node sert l'API **et** le site (ADR-0013). En développement on
 * en garde deux : Vite a besoin de son propre serveur pour recharger les composants à chaud. Le
 * site appelle l'API sur le port 8000, comme il le fera en production sur la boucle locale.
 *
 * `LF_SERVIR_SITE=0` est posé ici plutôt que dans `api/package.json` : un préfixe `VAR=valeur`
 * devant une commande npm ne fonctionne pas sous Windows, alors que l'environnement d'un processus
 * fils, lui, est portable.
 *
 * Usage : `node scripts/dev.mjs [api|site]` — sans argument, les deux.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';

const SERVEURS = {
	api: {
		nom: 'api ',
		couleur: '\x1b[36m',
		args: ['--prefix', 'api', 'run', 'dev'],
		// Le site est servi par Vite : sans cela, un `frontend/build` laissé par une construction
		// précédente servirait sur le port de l'API une version figée du site.
		env: { LF_SERVIR_SITE: '0' }
	},
	site: { nom: 'site', couleur: '\x1b[35m', args: ['--prefix', 'frontend', 'run', 'dev'], env: {} }
};

const demandes = process.argv.slice(2).filter((a) => a in SERVEURS);
const choisis = demandes.length ? demandes : Object.keys(SERVEURS);

const enfants = choisis.map((cle) => {
	const { nom, couleur, args, env } = SERVEURS[cle];
	const p = spawn(npm, args, { cwd: racine, shell: win, env: { ...process.env, ...env } });
	const ecrire = (flux) => (d) =>
		String(d)
			.split('\n')
			.filter((l) => l.trim())
			.forEach((l) => flux.write(`${couleur}[${nom}]\x1b[0m ${l}\n`));
	p.stdout.on('data', ecrire(process.stdout));
	p.stderr.on('data', ecrire(process.stderr));
	return p;
});

const arreter = () => enfants.forEach((p) => !p.killed && p.kill());
process.on('SIGINT', () => {
	arreter();
	process.exit(0);
});
process.on('exit', arreter);
enfants.forEach((p) =>
	p.on('exit', (code) => {
		if (code) {
			arreter();
			process.exit(code);
		}
	})
);

const adresses = {
	api: '\x1b[32mAPI  \x1b[0m http://127.0.0.1:8000/api/sante',
	site: '\x1b[32mSite \x1b[0m http://localhost:5173'
};
console.log(`${choisis.map((c) => adresses[c]).join('\n')}\n`);
