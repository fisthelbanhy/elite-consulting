/**
 * Briques de la reprise des données legacy : lecture du dump MySQL et décodage des entités HTML.
 *
 * La reprise complète, elle, se vérifie en comparant les deux scripts sur un dump de synthèse
 * (`scripts/dump-synthetique.ts` puis `scripts/comparer-reprise.ts`) : elle écrit dans la base et
 * ne se prête pas à un test unitaire. Les valeurs attendues ci-dessous ont toutes été relevées sur
 * l'ancien backend Python.
 */
import { describe, expect, it } from 'vitest';
import { analyserDump } from '../src/scripts/lire-dump.js';
import { deshtml } from '../src/scripts/deshtml.js';

/**
 * L'accent grave entoure les noms de table et de colonne dans un dump MySQL. Il est nommé plutôt
 * qu'écrit : c'est aussi le délimiteur des gabarits JavaScript.
 */
const T = '`';

describe('lecture du dump MySQL', () => {
	it('rend les valeurs de chaque ligne, avec les échappements de MySQL', () => {
		const dump = [
			`INSERT INTO ${T}membre${T} (${T}indexmbr${T}, ${T}nom${T}, ${T}mail${T}, ${T}solde${T}) VALUES`,
			"(1, 'Mabiala', 'a@b.cg', 0),",
			"(2, 'O\\'Connor', NULL, -5),",
			"(3, 'Ligne\\ndeux\\ttab', 'x@y.cg', 1234567),",
			"(4, 'Deux '' apostrophes', '', 3.5);"
		].join('\n');
		expect(analyserDump(dump)).toEqual({
			membre: [
				{ indexmbr: 1, nom: 'Mabiala', mail: 'a@b.cg', solde: 0 },
				{ indexmbr: 2, nom: "O'Connor", mail: null, solde: -5 },
				{ indexmbr: 3, nom: 'Ligne\ndeux\ttab', mail: 'x@y.cg', solde: 1234567 },
				{ indexmbr: 4, nom: "Deux ' apostrophes", mail: '', solde: 3.5 }
			]
		});
	});

	it('supporte plusieurs tables, les espaces et les accents', () => {
		const dump =
			`INSERT INTO ${T}ville${T} (${T}id${T}, ${T}nom${T}) VALUES (1, 'Brazzaville'), (2, 'Pointe-Noire');\n` +
			`INSERT INTO ${T}t${T} (${T}a${T}, ${T}b${T}) VALUES\n   (  1  ,   'Café — « oui »'   )  ;`;
		const lu = analyserDump(dump);
		expect(lu.ville).toHaveLength(2);
		expect(lu.ville![1]).toEqual({ id: 2, nom: 'Pointe-Noire' });
		expect(lu.t![0]).toEqual({ a: 1, b: 'Café — « oui »' });
	});

	it("refuse une ligne dont le nombre de valeurs ne correspond pas à l'en-tête", () => {
		const dump = `INSERT INTO ${T}t${T} (${T}a${T}, ${T}b${T}) VALUES (1);`;
		expect(() => analyserDump(dump)).toThrow(/1 valeurs pour 2 colonnes/);
	});

	it("ignore ce qui n'est pas un INSERT", () => {
		expect(analyserDump(`CREATE TABLE ${T}t${T} (${T}a${T} int);\n-- commentaire\n`)).toEqual({});
	});
});

describe('décodage des entités HTML', () => {
	it('reproduit `html.unescape` de Python', () => {
		// Les artefacts de `htmlspecialchars()`, y compris appliqué deux fois.
		expect(deshtml('&amp;amp;')).toBe('&amp;');
		expect(deshtml('l&#039;apostrophe')).toBe("l'apostrophe");
		expect(deshtml('&lt;script&gt;')).toBe('<script>');
		// Les accents encodés par `htmlentities()`.
		expect(deshtml('Caf&eacute; &laquo;&nbsp;test&nbsp;&raquo;')).toBe('Café « test »');
		// Références numériques, décimales et hexadécimales.
		expect(deshtml('&#233;&#xE9;&#XE9;')).toBe('ééé');
		// Le point-virgule est facultatif : on prend la plus longue entité connue.
		expect(deshtml('&amp')).toBe('&');
		expect(deshtml('&notit;')).toBe('¬it;');
		// Les codes 0x80–0x9F sont relus comme du Windows-1252, pas comme de l'Unicode.
		expect(deshtml('&#128;')).toBe('€');
		// Ce qui n'est pas une entité reste littéral.
		expect(deshtml('&inconnue;')).toBe('&inconnue;');
		expect(deshtml('a&b')).toBe('a&b');
		expect(deshtml('sans entité')).toBe('sans entité');
	});
});
