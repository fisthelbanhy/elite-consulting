import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import { actionsReponses } from '$lib/server/questions';
import type { SujetDetail } from '$lib/types/questions';

export const load: PageServerLoad = async (event) => {
	const sujet = await charger<SujetDetail>(event, `/questions/${event.params.id}`);
	const q = event.url.searchParams;
	return { sujet, enregistre: q.has('enregistre'), modifie: q.has('modifie') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/questions/${p.id}`, '/questions'),
	...actionsReponses
};
