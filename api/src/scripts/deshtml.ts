/**
 * Décodage des entités HTML, reproduction de `html.unescape` de Python.
 *
 * Utilisé uniquement par la reprise des données legacy : le PHP d'origine stockait les saisies
 * déjà encodées (« &amp;amp; », « &eacute; », « &#039; »), et l'ancien script de reprise les
 * rendait lisibles avec `html.unescape`. Le même algorithme, appliqué à la même table
 * (`entites-html.ts`, engendrée depuis Python), donne les mêmes textes.
 *
 * L'algorithme est celui de CPython, lui-même tiré de la norme HTML :
 * - une référence numérique (`&#233;`, `&#xE9;`) donne le caractère de ce code, sauf pour les
 *   codes 0x80–0x9F que la norme réinterprète en Windows-1252, et sauf les codes interdits ;
 * - une référence nommée est cherchée telle quelle, puis — le point-virgule étant facultatif dans
 *   la norme — en repliant le nom caractère par caractère jusqu'à trouver la plus longue entité
 *   connue, le reste étant rendu tel quel ;
 * - ce qui n'est reconnu d'aucune façon reste littéral.
 */
import { CODES_SUPPRIMES, ENTITES_HTML, REFERENCES_INVALIDES } from './entites-html.js';

/** Même expression que `html._charref` de CPython. */
const REFERENCE = /&(#[0-9]+;?|#[xX][0-9a-fA-F]+;?|[^\t\n\f <&#;]{1,32};?)/g;

/** U+FFFD, le « caractère de remplacement ». Nommé, car invisible dans un littéral. */
const REMPLACEMENT = String.fromCharCode(0xfffd);

function remplacerNumerique(corps: string): string {
	const nombre =
		corps[1] === 'x' || corps[1] === 'X'
			? Number.parseInt(corps.slice(2).replace(/;$/, ''), 16)
			: Number.parseInt(corps.slice(1).replace(/;$/, ''), 10);

	const remplacement = REFERENCES_INVALIDES[nombre];
	if (remplacement !== undefined) return remplacement;
	// Les demi-codets ne sont pas des caractères, et rien n'existe au-delà du plan 16.
	if ((nombre >= 0xd800 && nombre <= 0xdfff) || nombre > 0x10ffff) return REMPLACEMENT;
	if (CODES_SUPPRIMES.has(nombre)) return '';
	return String.fromCodePoint(nombre);
}

function remplacerNomme(corps: string): string {
	const connu = ENTITES_HTML[corps];
	if (connu !== undefined) return connu;
	// Plus longue entité connue en préfixe : `&notit;` vaut `¬it;`.
	for (let x = corps.length - 1; x > 1; x -= 1) {
		const debut = ENTITES_HTML[corps.slice(0, x)];
		if (debut !== undefined) return debut + corps.slice(x);
	}
	return `&${corps}`;
}

/** Équivalent de `html.unescape` : décode toutes les entités d'une chaîne. */
export function deshtml(texte: string): string {
	if (!texte.includes('&')) return texte;
	REFERENCE.lastIndex = 0;
	return texte.replace(REFERENCE, (_tout, corps: string) =>
		corps.startsWith('#') ? remplacerNumerique(corps) : remplacerNomme(corps)
	);
}
