import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerBusinessPlan } from '$lib/server/business-plan';
import type { BusinessPlanDetail } from '$lib/types/business-plan';

export const load: PageServerLoad = async (event) => {
	const membre = event.locals.membre;
	// Les gestionnaires consultent les fiches de tous les membres
	if (membre?.est_gestionnaire) redirect(303, '/business-plan/fiches');
	const plan = membre ? await charger<BusinessPlanDetail | null>(event, '/business-plan/mien') : null;
	const u = event.url.searchParams;
	return { plan, enregistre: u.has('enregistre'), envoye: u.has('envoye') };
};

export const actions: Actions = {
	default: async (event) => {
		exigerConnexion(event);
		const plan = await charger<BusinessPlanDetail | null>(event, '/business-plan/mien');
		return enregistrerBusinessPlan(event, plan?.id);
	}
};
