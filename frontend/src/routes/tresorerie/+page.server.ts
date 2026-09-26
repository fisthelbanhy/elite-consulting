import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import type { CompteursTresorerie } from '$lib/types/tresorerie';

export const load: PageServerLoad = async (event) => {
	const compteurs = event.locals.membre
		? await chargerOuDefaut<CompteursTresorerie | null>(event, '/tresorerie/compteurs', null)
		: null;
	return { compteurs };
};
