import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerSujet } from '$lib/server/questions';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { confidentialite: event.url.searchParams.get('confidentialite') === '1' ? '1' : '2' };
};

export const actions: Actions = {
	default: (event) => enregistrerSujet(event)
};
