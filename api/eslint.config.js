/**
 * Mêmes règles que `frontend/eslint.config.js`, sans ce qui touche à Svelte : l'API n'a que du
 * TypeScript Node. `eslint-config-prettier` vient en dernier pour désactiver les règles de mise en
 * forme, laissées à Prettier (`api/prettier.config.js`, décision I13 de l'ADR-0011).
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	globalIgnores(['data/**', 'media/**', 'migrations/**', 'node_modules/**']),
	js.configs.recommended,
	ts.configs.recommended,
	prettier,
	{
		languageOptions: { globals: { ...globals.node } },
		rules: {
			// Voir la FAQ de typescript-eslint : sur un projet TypeScript, `no-undef` fait doublon
			// avec le compilateur et signale à tort les globales.
			'no-undef': 'off',
			// Un argument ou une variable préfixé d'un souligné est volontairement inutilisé.
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			// Les espaces insécables du français sont voulus dans les expressions régulières :
			// c'est ce que `toLocaleString('fr-FR')` insère entre les milliers, et qu'il faut
			// justement pouvoir remplacer. Ailleurs, la règle reste active.
			'no-irregular-whitespace': ['error', { skipRegExps: true }]
		}
	}
);
