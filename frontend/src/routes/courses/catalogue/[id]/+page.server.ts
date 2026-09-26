import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerArticleCatalogue } from '$lib/server/courses';
import { actionsModeration } from '$lib/server/moderation';
import type { ArticleCatalogueDetail } from '$lib/types/courses';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const article = await charger<ArticleCatalogueDetail>(event, `/courses/catalogue/${event.params.id}`);
	if (!article.peut_modifier) error(403, 'Seule la boutique ou un gestionnaire habilité peut modifier cet article.');
	return { article };
};

export const actions: Actions = {
	...actionsModeration((p) => `/courses/catalogue/${p.id}`, '/courses/catalogue'),
	default: (event) => enregistrerArticleCatalogue(event, event.params.id)
};
