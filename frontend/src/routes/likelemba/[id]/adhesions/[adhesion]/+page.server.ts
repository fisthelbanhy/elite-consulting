import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import { lireAdhesion } from '$lib/server/likelemba';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { AdhesionDetail } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const adhesion = await charger<AdhesionDetail>(event, `/likelemba/adhesions/${event.params.adhesion}`);
	if (String(adhesion.groupe.id) !== event.params.id) error(404, "Cette adhésion n'appartient pas à ce likelemba.");
	return { adhesion, modifie: event.url.searchParams.has('modifie') };
};

export const actions: Actions = {
	etat: actionsModeration((p) => `/likelemba/adhesions/${p.adhesion}`, '/likelemba').etat,
	default: async (event) => {
		const { valeurs, corps } = lireAdhesion(await event.request.formData());
		const r = await soumettre<Ok>(event, `/likelemba/adhesions/${event.params.adhesion}`, { method: 'PUT', body: corps, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/likelemba/${event.params.id}/adhesions/${event.params.adhesion}?modifie=1`);
	}
};
