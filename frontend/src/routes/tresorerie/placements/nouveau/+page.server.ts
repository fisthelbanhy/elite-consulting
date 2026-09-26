import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { banques } from '$lib/server/referentiels';
import { enregistrerPlacement } from '$lib/server/tresorerie';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { banques: (await banques(event)).filter((b) => !/^autres?$/i.test(b.nom.trim())) };
};

export const actions: Actions = { default: (event) => enregistrerPlacement(event) };
