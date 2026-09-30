#!/usr/bin/env node
/**
 * Relais vers la reprise des données de production (`api/src/scripts/reprise-legacy.ts`).
 *
 * Pourquoi ce fichier : npm retire les arguments en `--xxx` avant de les remettre au script,
 * si bien que `--images` n'arrivait jamais à la reprise. Les photos des membres, produits et
 * publicités n'étaient alors pas reprises — silencieusement, sans le moindre avertissement.
 * Le dossier d'images est donc ici un **argument positionnel**, à l'abri de npm.
 *
 * Les chemins sont relatifs à la **racine du dépôt** (et non à `api/`) :
 *     npm run donnees:legacy -- cp1019011_lafrangine.sql lafrangine/V04/image/ig
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(racine, 'api');

// `--images` / `--rapport` sont acceptés s'ils parviennent jusqu'ici (appel direct par `node`),
// mais la forme à retenir est positionnelle : <dump.sql> [<dossier d'images>] [<rapport.md>].
const positionnels = [];
const drapeaux = new Map();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
	if (argv[i] === '--images' || argv[i] === '--rapport') drapeaux.set(argv[i], argv[++i]);
	else positionnels.push(argv[i]);
}

const [dump, images = drapeaux.get('--images'), rapport = drapeaux.get('--rapport')] = [
	positionnels[0],
	drapeaux.get('--images') ?? positionnels[1],
	drapeaux.get('--rapport') ?? positionnels[2]
];

if (!dump) {
	console.error(
		'Usage : npm run donnees:legacy -- <dump.sql> [<dossier des images legacy>] [<rapport.md>]\n' +
			'Exemple : npm run donnees:legacy -- cp1019011_lafrangine.sql lafrangine/V04/image/ig'
	);
	process.exit(1);
}

// Les chemins sont résolus depuis la racine, où la commande est lancée, car la reprise s'exécute
// dans `api/`.
const arguments_ = [resolve(dump)];
if (images) arguments_.push('--images', resolve(images));
if (rapport) arguments_.push('--rapport', resolve(rapport));

const r = spawnSync(
	process.platform === 'win32' ? 'npx.cmd' : 'npx',
	['tsx', 'src/scripts/reprise-legacy.ts', ...arguments_],
	{ cwd: api, stdio: 'inherit', shell: process.platform === 'win32' }
);
process.exit(r.status ?? 1);
