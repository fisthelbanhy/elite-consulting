#!/usr/bin/env node
/** Lance les deux serveurs de développement (API FastAPI + site SvelteKit) dans un seul terminal. */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';

const serveurs = [
	{ nom: 'api ', couleur: '\x1b[36m', cmd: 'node', args: ['scripts/py.mjs', '-m', 'uvicorn', 'app.main:app', '--port', '8000', '--reload', '--reload-dir', 'app'] },
	{ nom: 'site', couleur: '\x1b[35m', cmd: win ? 'npm.cmd' : 'npm', args: ['--prefix', 'frontend', 'run', 'dev'] }
];

const enfants = serveurs.map(({ nom, couleur, cmd, args }) => {
	const p = spawn(cmd, args, { cwd: racine, shell: win });
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
enfants.forEach((p) => p.on('exit', (code) => { if (code) { arreter(); process.exit(code); } }));

console.log('\x1b[32mAPI  \x1b[0m http://127.0.0.1:8000/api/docs\n\x1b[32mSite \x1b[0m http://localhost:5173\n');
