/**
 * Configuration lue dans l'environnement, préfixe `LF_` (équivalent de l'ancien `app/config.py`).
 * Les noms de variables sont **inchangés** pour que les déploiements existants continuent de
 * fonctionner : LF_DATABASE_URL, LF_MEDIA_DIR, LF_SMTP_HOST…
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

/** Racine du paquet `api/` (et non `src/` ni `dist/`). */
export const BASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Charge `api/.env` s'il existe, sans écraser les variables déjà posées par l'hébergeur. */
function chargerFichierEnv(chemin: string): void {
	if (!existsSync(chemin)) return;
	for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
		const nette = ligne.trim();
		if (!nette || nette.startsWith('#')) continue;
		const separateur = nette.indexOf('=');
		if (separateur < 1) continue;
		const cle = nette.slice(0, separateur).trim();
		if (process.env[cle] !== undefined) continue;
		let valeur = nette.slice(separateur + 1).trim();
		if (
			(valeur.startsWith('"') && valeur.endsWith('"')) ||
			(valeur.startsWith("'") && valeur.endsWith("'"))
		) {
			valeur = valeur.slice(1, -1);
		}
		process.env[cle] = valeur;
	}
}

chargerFichierEnv(join(BASE_DIR, '.env'));

function texte(cle: string, defaut: string): string {
	const v = process.env[`LF_${cle}`];
	return v === undefined || v === '' ? defaut : v;
}

function entier(cle: string, defaut: number): number {
	const v = process.env[`LF_${cle}`];
	if (v === undefined || v.trim() === '') return defaut;
	const n = Number(v);
	if (!Number.isFinite(n)) throw new Error(`LF_${cle} doit être un nombre (reçu : « ${v} »).`);
	return Math.trunc(n);
}

/** Drapeau `LF_…` : `0`, `false` et `non` valent faux, tout le reste vaut la valeur par défaut. */
function drapeau(cle: string, defaut: boolean): boolean {
	const v = process.env[`LF_${cle}`];
	if (v === undefined || v.trim() === '') return defaut;
	return !['0', 'false', 'non'].includes(v.trim().toLowerCase());
}

const databaseUrl = texte(
	'DATABASE_URL',
	`sqlite:///${join(BASE_DIR, 'data', 'lafrangine.sqlite3').replaceAll('\\', '/')}`
);

export const config = {
	environnement: texte('ENVIRONNEMENT', 'dev'),
	databaseUrl,
	/** Racine des fichiers téléversés (photos des fiches, pièces jointes). */
	mediaDir: resolve(texte('MEDIA_DIR', join(BASE_DIR, 'media'))),
	mediaUrl: texte('MEDIA_URL', '/media'),

	/** Durée de vie d'une session (jours) et d'un lien de réinitialisation (minutes). */
	sessionJours: entier('SESSION_JOURS', 30),
	resetMinutes: entier('RESET_MINUTES', 60),

	/** Téléversements (le legacy limitait à ~4 Mo). */
	uploadMaxOctets: entier('UPLOAD_MAX_OCTETS', 4 * 1024 * 1024),
	photoLargeurMax: entier('PHOTO_LARGEUR_MAX', 1200),

	/** Limitation des tentatives de connexion. */
	loginMaxEchecs: entier('LOGIN_MAX_ECHECS', 5),
	loginFenetreMinutes: entier('LOGIN_FENETRE_MINUTES', 15),

	/** E-mails sortants (SMTP) — si smtpHost est vide, les e-mails sont journalisés (dev). */
	smtpHost: texte('SMTP_HOST', ''),
	smtpPort: entier('SMTP_PORT', 587),
	smtpUser: texte('SMTP_USER', ''),
	smtpPassword: texte('SMTP_PASSWORD', ''),
	smtpFrom: texte('SMTP_FROM', 'La Frangine <contact@lafrangine.com>'),

	/** URL publique du site (liens dans les e-mails). */
	siteUrl: texte('SITE_URL', 'http://localhost:5173'),

	/**
	 * Port d'écoute du processus (site + API, ADR-0013).
	 *
	 * Le défaut reste **8000**, le port de l'ancien backend : c'est celui que le BFF appelle quand
	 * `BACKEND_URL` n'est pas posée (`frontend/src/lib/server/api.ts`), et celui que la
	 * documentation existante indique. En production, l'hébergeur impose son port par `PORT`.
	 */
	port: entier('PORT', Number(process.env.PORT) || 8000),

	/**
	 * Servir aussi le site construit (`frontend/build`) depuis ce processus.
	 *
	 * Vrai par défaut : c'est le mode de production (ADR-0013). En développement, `npm run dev`
	 * pose `LF_SERVIR_SITE=0`, car c'est Vite qui sert le site, avec le rechargement à chaud ; sans
	 * cela, un `frontend/build` laissé par une construction précédente servirait sur le port de
	 * l'API une version figée du site, sans qu'on comprenne d'où elle sort.
	 */
	servirSite: drapeau('SERVIR_SITE', true),

	get estSqlite(): boolean {
		return databaseUrl.startsWith('sqlite');
	},

	/** Chemin du fichier SQLite, déduit de `databaseUrl`. */
	get cheminSqlite(): string {
		return databaseUrl.replace(/^sqlite:\/\/\//, '');
	},

	get estTest(): boolean {
		return this.environnement === 'test';
	}
};

export type Config = typeof config;
