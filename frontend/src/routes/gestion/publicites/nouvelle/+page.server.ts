import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/contact';
import { enregistrerPublicite } from '$lib/server/publicites';
import type { ChoixPublicite } from '$lib/types/publicites';

export const load: PageServerLoad = async (event) => {
	const membre = exigerGestionnaire(event);
	const choix = await charger<ChoixPublicite>(event, '/publicites/choix');
	return { choix, choisirEtat: !!membre?.droit_activation };
};

export const actions: Actions = {
	default: (event) => enregistrerPublicite(event)
};
