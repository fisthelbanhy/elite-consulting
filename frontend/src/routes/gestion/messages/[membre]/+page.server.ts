import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/contact';
import { actionEnvoyer } from '$lib/server/messages';
import type { FilGestion } from '$lib/types/messages';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	if (!/^\d+$/.test(event.params.membre)) error(404, "Ce membre n'existe pas.");
	// L'ouverture marque lus les messages du membre (F-TRV-53)
	const fil = await charger<FilGestion>(event, `/messages/fils/${event.params.membre}`);
	return { fil };
};

export const actions: Actions = {
	envoyer: actionEnvoyer((event) => `/messages/fils/${event.params.membre}`)
};
