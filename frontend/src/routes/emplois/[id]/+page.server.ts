import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { AnnonceDetail } from '$lib/types/emplois';

export const load: PageServerLoad = async (event) => {
	const annonce = await charger<AnnonceDetail>(event, `/emplois/${event.params.id}`);
	return { annonce, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/emplois/${p.id}`, '/emplois'),
	interet: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { message: 'texte' });
		const r = await soumettre<Ok>(event, `/emplois/${event.params.id}/interet`, { body: valeurs, valeurs, cle: 'interet' });
		if (!r.ok) return r.echec;
		return { cle: 'interet', succes: r.data.message };
	}
};
