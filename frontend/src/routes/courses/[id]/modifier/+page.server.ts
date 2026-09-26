import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { aujourdhui, enregistrerCourse, verifierCourse } from '$lib/server/courses';
import type { Liste } from '$lib/types';
import type { ArticleCatalogue, Boutique, CourseDetail } from '$lib/types/courses';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const course = await charger<CourseDetail>(event, `/courses/${event.params.id}`);
	if (!course.peut_modifier) error(403, "Cette course n'est plus modifiable (elle n'est plus en attente ou elle est déjà payée).");
	const boutiques = await chargerOuDefaut<Boutique[]>(event, '/courses/boutiques', []);
	const demandee = event.url.searchParams.get('boutique') ?? (course.boutique_id ? String(course.boutique_id) : '');
	const choisie = boutiques.find((b) => String(b.id) === demandee) ?? null;
	const catalogue = choisie
		? (await chargerOuDefaut<Liste<ArticleCatalogue>>(event, '/courses/catalogue', { items: [], total: 0, page: 1, taille: 100 }, { boutique_id: choisie.id, taille: 100 })).items
		: [];
	return { course, boutiques, boutique: choisie, catalogue, aujourdhui: aujourdhui() };
};

export const actions: Actions = {
	verifier: (event) => verifierCourse(event, event.params.id),
	enregistrer: (event) => enregistrerCourse(event, event.params.id)
};
