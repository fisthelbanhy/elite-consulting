import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lireFormulaire, soumettre } from '$lib/server/api';
import { CHAMPS_MEMBRE } from '$lib/server/gestion';
import { secteurs, villes } from '$lib/server/referentiels';
import type { MembreCree } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => {
	const [vils, sects] = await Promise.all([villes(event), secteurs(event)]);
	return { villes: vils, secteurs: sects };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), CHAMPS_MEMBRE);
		const r = await soumettre<MembreCree>(event, '/gestion/membres', { body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		if (r.data.activation) {
			// Le lien d'activation n'est affiché qu'une fois : il reste sur cette page
			return { succes: r.data.message, creation: r.data };
		}
		redirect(303, `/gestion/membres/${r.data.id}?enregistre=1`);
	}
};
