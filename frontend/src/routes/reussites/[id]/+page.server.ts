import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { ReussiteDetail } from '$lib/types/reussites';

export const load: PageServerLoad = async (event) => {
	const reussite = await charger<ReussiteDetail>(event, `/reussites/${event.params.id}`);
	return { reussite, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/reussites/${p.id}`, '/reussites')
};
