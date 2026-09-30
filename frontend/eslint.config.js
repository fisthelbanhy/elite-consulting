import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// `resolve()` protège les liens écrits en dur quand le site est servi sous un
			// sous-chemin (`base`). Ici il est servi à la racine du domaine (`LF_SITE_URL`,
			// ADR-0013) et le projet n'importe nulle part `$app/paths` : la règle n'apporterait
			// que du bruit sur les ~260 liens du site. À réactiver si un `base` est introduit.
			'svelte/no-navigation-without-resolve': 'off',

			// La typographie française demande une espace fine insécable avant « FCFA » et
			// avant les deux-points : elle est écrite telle quelle dans les gabarits de
			// `format.ts`. Hors gabarits, une espace exotique reste une erreur.
			'no-irregular-whitespace': ['error', { skipTemplates: true }]
		}
	}
);
