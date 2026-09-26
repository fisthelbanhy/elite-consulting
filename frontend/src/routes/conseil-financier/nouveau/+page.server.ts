import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerSujet } from '$lib/server/conseil-financier';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { rubrique: event.url.searchParams.get('rubrique') === '2' ? '2' : '1' };
};

export const actions: Actions = { default: (event) => enregistrerSujet(event) };
