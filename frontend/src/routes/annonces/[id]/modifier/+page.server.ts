import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerArticle } from '$lib/server/annonces';
import { famillesArticles } from '$lib/server/referentiels';
import type { ArticleDetail } from '$lib/types/annonces';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const article = await charger<ArticleDetail>(event, `/annonces/${event.params.id}`);
	if (!article.peut_modifier) error(403, "Seul l'auteur de l'annonce ou un gestionnaire habilité peut la modifier.");
	return { article, familles: await famillesArticles(event) };
};

export const actions: Actions = {
	default: (event) => enregistrerArticle(event, event.params.id)
};
