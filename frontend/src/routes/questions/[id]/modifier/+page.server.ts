import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerSujet } from '$lib/server/questions';
import type { SujetDetail } from '$lib/types/questions';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const sujet = await charger<SujetDetail>(event, `/questions/${event.params.id}`);
	if (!sujet.peut_modifier) error(403, "Seul l'auteur du sujet ou un gestionnaire habilité peut le modifier.");
	return { sujet };
};

export const actions: Actions = {
	default: (event) => enregistrerSujet(event, event.params.id)
};
