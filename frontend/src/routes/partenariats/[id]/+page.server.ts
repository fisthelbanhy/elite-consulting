import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { PartenariatDetail } from '$lib/types/partenariats';

export const load: PageServerLoad = async (event) => {
	const fiche = await charger<PartenariatDetail>(event, `/partenariats/${event.params.id}`);
	return { fiche, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/partenariats/${p.id}`, '/partenariats'),
	interet: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { message: 'texte' });
		const r = await soumettre<Ok>(event, `/partenariats/${event.params.id}/interet`, { body: valeurs, valeurs, cle: 'interet' });
		if (!r.ok) return r.echec;
		return { cle: 'interet', succes: r.data.message };
	}
};
