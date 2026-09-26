#!/usr/bin/env node
/**
 * Lance le Python du projet, quel que soit le système (Windows : .venv\Scripts, Linux/macOS :
 * .venv/bin, sinon le python du système). Toujours exécuté depuis `backend/`.
 *
 *   node scripts/py.mjs -m pytest -q
 *   node scripts/py.mjs -m uvicorn app.main:app --port 8000 --reload
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(racine, 'backend');
const candidats = [
	join(backend, '.venv', 'Scripts', 'python.exe'),
	join(backend, '.venv', 'bin', 'python'),
	process.platform === 'win32' ? 'python' : 'python3'
];
const python = candidats.find((c) => !c.includes('.venv') || existsSync(c)) ?? 'python3';

const enfant = spawn(python, process.argv.slice(2), { cwd: backend, stdio: 'inherit', shell: false });
enfant.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
enfant.on('error', (e) => {
	console.error(`Python introuvable (${python}) : ${e.message}`);
	process.exit(1);
});
