import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { BienDetail } from '$lib/types/immobilier';

export const load: PageServerLoad = async (event) => {
	const bien = await charger<BienDetail>(event, `/immobilier/${event.params.id}`);
	return { bien, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/immobilier/${p.id}`, '/immobilier'),
	interet: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { message: 'texte' });
		const r = await soumettre<Ok>(event, `/immobilier/${event.params.id}/interet`, { body: valeurs, valeurs, cle: 'interet' });
		if (!r.ok) return r.echec;
		return { cle: 'interet', succes: r.data.message };
	}
};
