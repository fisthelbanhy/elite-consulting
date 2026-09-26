import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { ArticleCatalogue, Boutique } from '$lib/types/courses';

const FILTRES = ['boutique_id', 'disponible', 'prix_min', 'prix_max', 'q'];

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	const gestion = membre.est_gestionnaire;
	const boutique = membre.categorie === 2 && membre.type_partenaire === 2;
	const p = event.url.searchParams;
	const filtres = Object.fromEntries(FILTRES.map((k) => [k, p.get(k) ?? ''])) as Record<string, string>;
	const base = { enregistre: p.has('enregistre'), supprime: p.has('supprime'), filtres, gestion, boutique };
	if (!gestion && !boutique) return { ...base, liste: null, boutiques: [] as Boutique[] };
	const [liste, boutiques] = await Promise.all([
		charger<Liste<ArticleCatalogue>>(event, '/courses/catalogue', {
			...filtres,
			miens: gestion ? undefined : true,
			page: p.get('page') ?? 1,
			taille: 50
		}),
		gestion ? chargerOuDefaut<Boutique[]>(event, '/courses/boutiques', []) : Promise.resolve([] as Boutique[])
	]);
	return { ...base, liste, boutiques };
};
