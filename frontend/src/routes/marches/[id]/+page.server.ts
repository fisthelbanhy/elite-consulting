import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { MarcheDetail } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	const marche = await charger<MarcheDetail>(event, `/marches/${event.params.id}`);
	const q = event.url.searchParams;
	return { marche, enregistre: q.has('enregistre'), fichierRefuse: q.get('fichier') === 'refuse' };
};

export const actions: Actions = {
	...actionsModeration((p) => `/marches/${p.id}`, '/marches')
};
