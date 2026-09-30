#!/usr/bin/env node
/**
 * Fabrique l'archive de déploiement pour l'hébergeur (`elite-consulting-hostinger.zip`).
 *
 *     npm run paquet                  # code compilé + données de production locales
 *     npm run paquet -- sans-donnees  # code seul (archive publiable)
 *
 * Le mot-clé est écrit **sans tirets** : npm retire les arguments en `--xxx` avant de les remettre
 * au script, et le paquet serait parti avec les données malgré la demande contraire.
 *
 * Contenu : l'arborescence du projet (sources, `api/dist`, `frontend/build`, migrations,
 * documentation), **sans** `node_modules` — les binaires natifs de Windows ne fonctionneraient pas
 * chez l'hébergeur (DEPLOIEMENT-HOSTINGER.md) — et sans rien de ce que le dépôt n'a pas le droit
 * de publier (dump legacy, `site.txt`, code PHP de l'ancien site).
 *
 * Les données de production ne sont pas déposées dans `api/data`, qu'un redéploiement écrase :
 * elles vont dans un dossier `donnees-production/` à part, avec la marche à suivre pour les
 * installer à l'emplacement persistant (ADR-0014).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const avecDonnees = !process.argv.slice(2).some((a) => a.replace(/^-+/, '') === 'sans-donnees');
const archive = join(racine, 'elite-consulting-hostinger.zip');
const chantier = join(racine, '.paquet');

/** Dossiers jamais embarqués : lourds, propres au poste, ou interdits de publication. */
const DOSSIERS_EXCLUS = new Set([
	'node_modules',
	'.git',
	'.svelte-kit',
	'.tmp-tests',
	'.paquet',
	'.ancien-fastapi',
	'lafrangine', // code PHP legacy : contient les identifiants de la base de production
	'data', // api/data : la base va dans donnees-production/
	'media' // api/media : idem
]);

/** Fichiers jamais embarqués. */
function fichierExclu(nom) {
	return (
		nom.endsWith('.zip') ||
		nom === 'site.txt' ||
		nom === 'cp1019011_lafrangine.sql' ||
		// `.env.example` reste : c'est la liste des variables à saisir chez l'hébergeur.
		(nom.startsWith('.env') && nom !== '.env.example') ||
		// L'API s'installe sans verrou pour que les binaires natifs se résolvent chez l'hébergeur.
		nom === 'package-lock.json'
	);
}

function copier(source, cible, estRacine = false) {
	mkdirSync(cible, { recursive: true });
	for (const nom of readdirSync(source)) {
		const de = join(source, nom);
		if (statSync(de).isDirectory()) {
			if (DOSSIERS_EXCLUS.has(nom)) continue;
			copier(de, join(cible, nom));
		} else {
			// `package-lock.json` est légitime à la racine (le site s'installe depuis son verrou)
			// et indésirable dans `api/`.
			if (fichierExclu(nom) && !(estRacine && nom === 'package-lock.json')) continue;
			cpSync(de, join(cible, nom));
		}
	}
}

function exiger(chemin, message) {
	if (!existsSync(join(racine, chemin))) {
		console.error(`✗ ${chemin} manquant. ${message}`);
		process.exit(1);
	}
}

exiger('api/dist/serveur.js', 'Lancez `npm run build` avant de fabriquer le paquet.');
exiger('frontend/build/index.js', 'Lancez `npm run build` avant de fabriquer le paquet.');

if (existsSync(chantier)) rmSync(chantier, { recursive: true, force: true });
copier(racine, chantier, true);

if (avecDonnees) {
	const base = join(racine, 'api', 'data', 'lafrangine.sqlite3');
	exiger(
		'api/data/lafrangine.sqlite3',
		'Reprenez les données (`npm run donnees:legacy`) ou passez --sans-donnees.'
	);
	// Un journal WAL laissé à côté signifie des écritures non repliées dans le fichier copié.
	for (const suffixe of ['-wal', '-shm']) {
		if (existsSync(base + suffixe)) {
			console.error(
				`✗ ${base + suffixe} existe : arrêtez le serveur avant de fabriquer le paquet,\n` +
					'  sinon la base embarquée serait incomplète.'
			);
			process.exit(1);
		}
	}
	const donnees = join(chantier, 'donnees-production');
	mkdirSync(donnees, { recursive: true });
	cpSync(base, join(donnees, 'lafrangine.sqlite3'));
	cpSync(join(racine, 'docs', 'LISEZ-MOI-donnees-production.md'), join(donnees, 'LISEZ-MOI.md'));
	for (const [source, cible] of [
		[join(racine, 'api', 'data', 'rapport-reprise.md'), join(donnees, 'rapport-reprise.md')],
		[join(racine, 'api', 'media'), join(donnees, 'media')]
	]) {
		if (existsSync(source)) cpSync(source, cible, { recursive: true });
	}
}

/**
 * `tar -a` (bsdtar, fourni par Windows 10+ et macOS) écrit un ZIP aux chemins POSIX. GNU tar, lui,
 * ne sait pas écrire de ZIP : sous Linux on passe par `zip`.
 */
const entrees = readdirSync(chantier);
const commandes = [
	['tar', ['-a', '-c', '-f', archive, '-C', chantier, ...entrees]],
	['zip', ['-q', '-r', '-X', archive, ...entrees]]
];
let fait = false;
for (const [cmd, args] of commandes) {
	const r = spawnSync(cmd, args, {
		cwd: cmd === 'zip' ? chantier : racine,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	if (r.status === 0) {
		fait = true;
		break;
	}
}
rmSync(chantier, { recursive: true, force: true });

if (!fait) {
	console.error('✗ Aucun outil d’archivage disponible (ni `tar -a`, ni `zip`).');
	process.exit(1);
}

const mo = (statSync(archive).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ ${archive} — ${mo} Mo${avecDonnees ? ', données de production incluses' : ', sans données'}.`);
if (avecDonnees) {
	console.log(
		'  Cette archive contient des données personnelles : ne la publiez pas, ne la versionnez pas.'
	);
}
