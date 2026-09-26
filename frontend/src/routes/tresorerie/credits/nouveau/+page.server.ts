import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerCredit } from '$lib/server/tresorerie';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return {};
};

export const actions: Actions = { default: (event) => enregistrerCredit(event) };
