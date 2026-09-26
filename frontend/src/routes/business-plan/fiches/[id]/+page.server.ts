import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { BusinessPlanDetail } from '$lib/types/business-plan';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const plan = await charger<BusinessPlanDetail>(event, `/business-plan/${event.params.id}`);
	return { plan };
};

export const actions: Actions = {
	etat: async (event) => {
		const fd = await event.request.formData();
		const r = await soumettre<Ok>(event, `/business-plan/${event.params.id}/etat`, {
			body: { etat: Number(fd.get('etat')) },
			cle: 'moderation'
		});
		if (!r.ok) return r.echec;
		return { cle: 'moderation', succes: r.data.message };
	}
};
