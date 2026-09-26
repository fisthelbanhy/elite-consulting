import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { EntrepriseDetail } from '$lib/types/entreprises';

export const load: PageServerLoad = async (event) => {
	const entreprise = await charger<EntrepriseDetail>(event, `/entreprises/${event.params.id}`);
	const q = event.url.searchParams;
	return { entreprise, enregistre: q.has('enregistre'), fichierRefuse: q.get('fichier') === 'refuse' };
};

export const actions: Actions = {
	...actionsModeration((p) => `/entreprises/${p.id}`, '/entreprises')
};
