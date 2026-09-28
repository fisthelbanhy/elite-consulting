#!/usr/bin/env node
/**
 * Installe l'environnement de développement, sur n'importe quel système (Windows, Linux, macOS) :
 * dépendances npm de l'API et du site, puis base de démonstration si aucune base n'existe. C'est
 * la commande lancée par une session cloud (`npm run setup`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';

/** Node 22 au minimum : `api/` s'appuie sur `better-sqlite3` et sur le `fetch` intégré. */
const NODE_MINIMUM = 22;

function lancer(cmd, args, options = {}) {
	console.log(`\n▸ ${cmd} ${args.join(' ')}`);
	const r = spawnSync(cmd, args, { stdio: 'inherit', shell: win, ...options });
	if (r.status !== 0) {
		console.error(`✗ Échec : ${cmd} ${args.join(' ')}`);
		process.exit(r.status ?? 1);
	}
}

/**
 * `npm ci` repart de zéro (environnement neuf) ; sinon `install`, qui n'efface pas `node_modules`
 * — un serveur de développement en cours verrouille des binaires natifs.
 */
function installer(paquet) {
	const dossier = join(racine, paquet);
	const dejaInstalle = existsSync(join(dossier, 'node_modules'));
	const aLock = existsSync(join(dossier, 'package-lock.json'));
	lancer(npm, [!dejaInstalle && aLock ? 'ci' : 'install'], { cwd: dossier });
}

// 0. Version de Node
const majeure = Number(process.versions.node.split('.')[0]);
if (majeure < NODE_MINIMUM) {
	console.error(
		`✗ Node ${NODE_MINIMUM} au minimum (trouvé : ${process.versions.node}). Installez une version récente.`
	);
	process.exit(1);
}

// 1. Dépendances
installer('api');
installer('frontend');

// 2. Données : base de démonstration si aucune base n'est présente
if (existsSync(join(racine, 'api', 'data', 'lafrangine.sqlite3'))) {
	console.log('\n▸ Base existante conservée (supprimez api/data pour repartir de zéro).');
} else {
	lancer(npm, ['--prefix', 'api', 'run', 'donnees:demo'], { cwd: racine });
}

console.log(`
✓ Installation terminée.

  npm run dev         API + site, un terminal    http://localhost:5173
  npm start           un seul processus Node     http://127.0.0.1:8000
  npm test            tests de l'API
`);
