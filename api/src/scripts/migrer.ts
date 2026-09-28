/**
 * Applique les migrations de schéma en attente (ADR-0013).
 *
 * Usage : `npm run migrer` — ou, en déploiement, appelé au démarrage du serveur.
 */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db } from '../db.js';

const DOSSIER_MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

/** Met la base au niveau du schéma courant. Sans effet si elle l'est déjà. */
export function appliquerMigrations(): void {
	migrate(db, { migrationsFolder: DOSSIER_MIGRATIONS });
}

/** Vrai si ce fichier est lancé directement (`npm run migrer`), et non simplement importé. */
function lanceDirectement(): boolean {
	const argument = process.argv[1];
	if (!argument) return false;
	try {
		return import.meta.url === pathToFileURL(realpathSync(argument)).href;
	} catch {
		return false;
	}
}

if (lanceDirectement()) {
	appliquerMigrations();
	console.log('✓ Base à jour.');
}
