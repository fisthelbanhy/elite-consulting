/** Petites aides d'affichage de l'annuaire (sans dépendance serveur). */

/** Lien sûr vers le site d'une entreprise : uniquement http(s), jamais `javascript:`. */
export function lienSite(site: string | null | undefined): string | null {
	const s = (site ?? '').trim();
	if (!s || /\s/.test(s)) return null;
	const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
	try {
		const u = new URL(url);
		return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
	} catch {
		return null;
	}
}

/** « https://www.exemple.cg/ » → « www.exemple.cg ». */
export function siteLisible(site: string | null | undefined): string {
	return (site ?? '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** Libellé de ville pour les titres et descriptions SEO (Brazzaville par défaut). */
export function villeOuCongo(ville: { nom: string } | null | undefined): string {
	return ville?.nom ?? 'Brazzaville';
}
