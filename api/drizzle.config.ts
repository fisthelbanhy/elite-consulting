/**
 * Configuration de drizzle-kit : génération des migrations de schéma (remplace Alembic, ADR-0013).
 *
 *   npm run migration -- --name description_du_changement   → écrit un fichier dans migrations/
 *   npm run migrer                                          → applique les migrations en attente
 */
import { defineConfig } from 'drizzle-kit';
import { config } from './src/config.js';

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/schema/index.ts',
	out: './migrations',
	dbCredentials: { url: config.cheminSqlite },
	casing: 'snake_case',
	verbose: true,
	strict: true
});
