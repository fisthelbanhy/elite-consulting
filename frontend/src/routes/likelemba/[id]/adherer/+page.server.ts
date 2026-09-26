import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion, soumettre } from '$lib/server/api';
import { lireAdhesion } from '$lib/server/likelemba';
import type { Ok } from '$lib/types';
import type { GroupeDetail, MembreChoix } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const groupe = await charger<GroupeDetail>(event, `/likelemba/${event.params.id}`);
	if (!groupe.peut_adherer && !groupe.peut_gerer) {
		if (groupe.mon_adhesion_id) redirect(303, `/likelemba/${groupe.id}/adhesions/${groupe.mon_adhesion_id}`);
		error(403, "Ce likelemba n'accepte pas de nouveaux membres pour le moment.");
	}
	const membres = groupe.peut_gerer ? await chargerOuDefaut<MembreChoix[] | null>(event, '/likelemba/membres', null) : null;
	return { groupe, membres };
};

export const actions: Actions = {
	default: async (event) => {
		const { valeurs, corps } = lireAdhesion(await event.request.formData());
		const r = await soumettre<Ok>(event, `/likelemba/${event.params.id}/adhesions`, { body: corps, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/likelemba/${event.params.id}?adhere=${encodeURIComponent(r.data.reference ?? '')}`);
	}
};
