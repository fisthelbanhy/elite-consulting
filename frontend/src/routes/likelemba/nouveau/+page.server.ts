import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import { lireGroupe } from '$lib/server/likelemba';
import type { Ok } from '$lib/types';
import type { MembreChoix } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire || !membre.droit_activation) {
		error(403, "La création d'un likelemba est réservée à la frangine. Écrivez-nous pour installer votre groupe.");
	}
	return { membres: await charger<MembreChoix[]>(event, '/likelemba/membres') };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireGroupe(await event.request.formData());
		const r = await soumettre<Ok>(event, '/likelemba', { body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/likelemba/${r.data.id}?enregistre=1`);
	}
};
