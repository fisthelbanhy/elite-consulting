import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerArticle } from '$lib/server/annonces';
import { famillesArticles } from '$lib/server/referentiels';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { familles: await famillesArticles(event), type: event.url.searchParams.get('type') === '2' ? '2' : '1' };
};

export const actions: Actions = {
	default: (event) => enregistrerArticle(event)
};
