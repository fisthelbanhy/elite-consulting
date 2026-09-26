import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { Boutique, CourseResume } from '$lib/types/courses';

const FILTRES = ['etat_course', 'commande_min', 'commande_max', 'achat_min', 'achat_max', 'livraison_min', 'livraison_max', 'q', 'role'];

export const load: PageServerLoad = async (event) => {
	const p = event.url.searchParams;
	const filtres = Object.fromEntries(FILTRES.map((k) => [k, p.get(k) ?? ''])) as Record<string, string>;
	const vue = p.get('vue') === 'general' ? 'general' : 'synthese';
	const boutiques = await chargerOuDefaut<Boutique[]>(event, '/courses/boutiques', []);
	if (!event.locals.membre) {
		// Visiteur : présentation du service (le legacy affichait une liste toujours vide)
		return { liste: null, filtres, vue, boutiques, supprime: false };
	}
	const liste = await charger<Liste<CourseResume>>(event, '/courses', { ...filtres, page: p.get('page') ?? 1, taille: 20 });
	return { liste, filtres, vue, boutiques, supprime: p.has('supprime') };
};
