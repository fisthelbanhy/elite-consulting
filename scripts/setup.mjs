#!/usr/bin/env node
/**
 * Installe l'environnement de développement, sur n'importe quel système (Windows, Linux, macOS) :
 * environnement Python + dépendances, dépendances npm du frontend, puis base de démonstration
 * si aucune base n'existe. C'est la commande lancée par une session cloud (`npm run setup`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(racine, 'backend');
const win = process.platform === 'win32';
const pythonVenv = join(backend, '.venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python');

/**
 * Cherche un interpréteur ≥ 3.12 (exigence de `backend/pyproject.toml`). Sur certaines machines
 * — dont les conteneurs cloud — `python3` est une version plus ancienne alors qu'une version
 * récente est installée à côté : on essaie donc les noms versionnés avant le nom générique.
 */
function trouverPython() {
	const noms = win
		? ['py -3.13', 'py -3.12', 'python3.13', 'python3.12', 'python']
		: ['python3.13', 'python3.12', 'python3', 'python'];
	for (const nom of noms) {
		const [cmd, ...args] = nom.split(' ');
		const r = spawnSync(cmd, [...args, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
			encoding: 'utf8',
			shell: win
		});
		if (r.status !== 0 || !r.stdout) continue;
		const [majeure, mineure] = r.stdout.trim().split('.').map(Number);
		if (majeure === 3 && mineure >= 12) return { cmd, args };
	}
	console.error(
		'✗ Aucun Python ≥ 3.12 trouvé (exigé par backend/pyproject.toml). Installez Python 3.12 ou 3.13.'
	);
	process.exit(1);
}

function lancer(cmd, args, options = {}) {
	console.log(`\n▸ ${cmd} ${args.join(' ')}`);
	const r = spawnSync(cmd, args, { stdio: 'inherit', shell: win, ...options });
	if (r.status !== 0) {
		console.error(`✗ Échec : ${cmd} ${args.join(' ')}`);
		process.exit(r.status ?? 1);
	}
}

// 1. Environnement Python
if (!existsSync(pythonVenv)) {
	const systeme = trouverPython();
	lancer(systeme.cmd, [...systeme.args, '-m', 'venv', '.venv'], { cwd: backend });
}
lancer(pythonVenv, ['-m', 'pip', 'install', '--quiet', '--upgrade', 'pip'], { cwd: backend });
lancer(pythonVenv, ['-m', 'pip', 'install', '--quiet', '-e', '.[dev]'], { cwd: backend });

// 2. Frontend
const npm = win ? 'npm.cmd' : 'npm';
const frontend = join(racine, 'frontend');
// `npm ci` repart de zéro (environnement neuf) ; sinon `install`, qui n'efface pas node_modules
// (un serveur de développement en cours verrouille des binaires natifs).
const dejaInstalle = existsSync(join(frontend, 'node_modules'));
const aLock = existsSync(join(frontend, 'package-lock.json'));
lancer(npm, [!dejaInstalle && aLock ? 'ci' : 'install'], { cwd: frontend });

// 3. Données : base de démonstration si aucune base n'est présente
if (!existsSync(join(backend, 'data', 'lafrangine.sqlite3'))) {
	lancer(pythonVenv, ['scripts/donnees_demo.py'], { cwd: backend });
} else {
	console.log('\n▸ Base existante conservée (supprimez backend/data pour repartir de zéro).');
}

console.log(`
✓ Installation terminée.

  npm run dev:api     API FastAPI      http://127.0.0.1:8000/api/docs
  npm run dev:site    site SvelteKit   http://localhost:5173
  npm test            tests backend
`);
