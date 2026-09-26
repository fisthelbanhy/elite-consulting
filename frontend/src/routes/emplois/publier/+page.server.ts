import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerAnnonce } from '$lib/server/emplois';
import { secteurs } from '$lib/server/referentiels';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { secteurs: await secteurs(event), type: event.url.searchParams.get('type') ?? '1' };
};

export const actions: Actions = {
	default: (event) => enregistrerAnnonce(event)
};
