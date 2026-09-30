/**
 * Même style que `frontend/prettier.config.js` — tabulations, apostrophes simples, 100 colonnes —
 * pour qu'un aller-retour entre le site et l'API ne change pas de mise en forme. Les greffons
 * Svelte et Tailwind n'ont pas lieu d'être ici : l'API n'a ni composant ni feuille de style.
 *
 * @type {import("prettier").Config}
 */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100
};

export default config;
