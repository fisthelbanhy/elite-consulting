import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { ArticleDetail } from '$lib/types/annonces';

export const load: PageServerLoad = async (event) => {
	const article = await charger<ArticleDetail>(event, `/annonces/${event.params.id}`);
	return { article, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/annonces/${p.id}`, '/annonces'),
	interet: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { message: 'texte' });
		const r = await soumettre<Ok>(event, `/annonces/${event.params.id}/interet`, { body: valeurs, valeurs, cle: 'interet' });
		if (!r.ok) return r.echec;
		return { cle: 'interet', succes: r.data.message };
	},
	panier: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { quantite: 'entier' });
		const r = await soumettre<Ok>(event, `/annonces/${event.params.id}/panier`, { body: valeurs, valeurs, cle: 'panier' });
		if (!r.ok) return r.echec;
		return { cle: 'panier', succes: r.data.message };
	}
};
