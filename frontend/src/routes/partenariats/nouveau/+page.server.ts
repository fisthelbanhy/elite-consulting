import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { enregistrerPartenariat } from '$lib/server/partenariats';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (membre.est_gestionnaire) error(403, 'La publication d’une recherche de partenariat est réservée aux membres.');
	return {};
};

export const actions: Actions = {
	default: (event) => enregistrerPartenariat(event)
};
