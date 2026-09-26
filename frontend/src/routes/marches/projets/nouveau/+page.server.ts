import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerProjet } from '$lib/server/marches';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return {};
};

export const actions: Actions = {
	default: (event) => enregistrerProjet(event)
};
