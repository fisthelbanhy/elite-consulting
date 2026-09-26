/**
 * Rendu sûr du texte d'aide paramétré (`parametre.texte_aide`, F-TRV-33/34).
 *
 * Le legacy affichait ce texte sans échappement (HTML saisi à la main, `nl2br`). Ici, tout est
 * échappé, puis seules quelques balises de mise en forme **sans attribut** sont rétablies :
 * aucun script, lien ni style ne peut être injecté. Les sauts de ligne deviennent des
 * paragraphes (ligne vide) ou des retours à la ligne.
 */
const BALISES = ['strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'p', 'br'];

function echapper(t: string): string {
	return t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function texteAideHtml(brut: string | null | undefined): string {
	const texte = (brut ?? '').replace(/\r\n?/g, '\n').trim();
	if (!texte) return '';
	let html = echapper(texte);
	// Balises autorisées, strictement sans attribut : &lt;strong&gt; → <strong>
	const motif = new RegExp(`&lt;(/?)(${BALISES.join('|')})\\s*/?&gt;`, 'gi');
	html = html.replace(motif, (_, fermeture: string, nom: string) => {
		const n = nom.toLowerCase();
		return n === 'br' ? '<br>' : `<${fermeture}${n}>`;
	});
	// Entités usuelles du legacy restées échappées deux fois (&amp;eacute; …)
	html = html.replace(/&amp;(#\d+|[a-z]+);/gi, '&$1;');
	return html
		.split(/\n{2,}/)
		.map((bloc) => bloc.trim())
		.filter(Boolean)
		.map((bloc) => (/^<(ul|ol|p)>/.test(bloc) ? bloc : `<p>${bloc.replace(/\n/g, '<br>')}</p>`))
		.join('\n');
}
