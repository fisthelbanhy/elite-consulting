import type { Actions, PageServerLoad } from './$types';
import { charger, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { GroupeDetail } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	const groupe = await charger<GroupeDetail>(event, `/likelemba/${event.params.id}`);
	const p = event.url.searchParams;
	return { groupe, enregistre: p.has('enregistre'), modifie: p.has('modifie'), adhere: p.get('adhere') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/likelemba/${p.id}`, '/likelemba'),
	valider: async (event) => {
		const id = Number((await event.request.formData()).get('cotisation'));
		const r = await soumettre<Ok>(event, `/likelemba/cotisations/${id}/valider`, { cle: 'valider' });
		if (!r.ok) return r.echec;
		return { cle: 'valider', succes: r.data.message };
	}
};
