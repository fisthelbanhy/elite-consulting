import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerDossier, questionnaire } from '$lib/server/accompagnement';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { questionnaire: await questionnaire(event, event.params.type) };
};

export const actions: Actions = {
	default: async (event) => enregistrerDossier(event, await questionnaire(event, event.params.type))
};
