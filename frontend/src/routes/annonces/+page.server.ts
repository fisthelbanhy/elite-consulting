import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { famillesArticles } from '$lib/server/referentiels';
import type { Liste } from '$lib/types';
import type { ArticleResume, Panier } from '$lib/types/annonces';
import type { CompteursOffres, Encarts } from '$lib/types/immobilier';

const FILTRES = ['type', 'famille_id', 'neuf_ou_occasion', 'prix_min', 'prix_max', 'q', 'tri', 'miennes'];

export const load: PageServerLoad = async (event) => {
	const p = event.url.searchParams;
	const filtres = Object.fromEntries(FILTRES.map((k) => [k, p.get(k) ?? ''])) as Record<string, string>;
	const membre = event.locals.membre;
	const gestion = !!membre?.est_gestionnaire;
	const [liste, compteurs, encarts, familles, panier] = await Promise.all([
		charger<Liste<ArticleResume>>(event, '/annonces', { ...filtres, miennes: filtres.miennes ? true : undefined, page: p.get('page') ?? 1, taille: 24 }),
		chargerOuDefaut<CompteursOffres>(event, '/annonces/compteurs', { offres: 0, recherches: 0, total: 0 }),
		gestion ? Promise.resolve(null) : chargerOuDefaut<Encarts<ArticleResume> | null>(event, '/annonces/encarts', null),
		famillesArticles(event).catch(() => []),
		membre ? chargerOuDefaut<Panier | null>(event, '/annonces/panier', null) : Promise.resolve(null)
	]);
	return { liste, compteurs, encarts, familles, filtres, gestion, quantitePanier: panier?.total_quantite ?? 0, supprime: p.has('supprime') };
};
