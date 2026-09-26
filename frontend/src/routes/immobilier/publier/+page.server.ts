import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerBien } from '$lib/server/immobilier';
import { villes } from '$lib/server/referentiels';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { villes: await villes(event), type: event.url.searchParams.get('type') === '2' ? '2' : '1' };
};

export const actions: Actions = {
	default: (event) => enregistrerBien(event)
};
