import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { actionEnvoyer } from '$lib/server/messages';
import type { FilMembre } from '$lib/types/messages';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	// Les gestionnaires répondent depuis la messagerie de gestion
	if (membre?.est_gestionnaire) redirect(303, '/gestion/messages');
	// L'ouverture marque lues les réponses reçues (F-TRV-50)
	const fil = await charger<FilMembre>(event, '/messages');
	return { fil };
};

export const actions: Actions = {
	envoyer: actionEnvoyer(() => '/messages')
};
