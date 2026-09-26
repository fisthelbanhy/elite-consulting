import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { aujourdhui, enregistrerCourse, verifierCourse } from '$lib/server/courses';
import type { Liste } from '$lib/types';
import type { ArticleCatalogue, Boutique } from '$lib/types/courses';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const boutiques = await chargerOuDefaut<Boutique[]>(event, '/courses/boutiques', []);
	const choisie = boutiques.find((b) => String(b.id) === event.url.searchParams.get('boutique')) ?? null;
	const catalogue = choisie
		? (await chargerOuDefaut<Liste<ArticleCatalogue>>(event, '/courses/catalogue', { items: [], total: 0, page: 1, taille: 100 }, { boutique_id: choisie.id, taille: 100 })).items
		: [];
	return { boutiques, boutique: choisie, catalogue, aujourdhui: aujourdhui() };
};

export const actions: Actions = {
	verifier: (event) => verifierCourse(event),
	enregistrer: (event) => enregistrerCourse(event)
};
