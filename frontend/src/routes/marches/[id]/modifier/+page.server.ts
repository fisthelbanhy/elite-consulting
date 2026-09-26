import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerMarche } from '$lib/server/marches';
import type { MarcheDetail } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const marche = await charger<MarcheDetail>(event, `/marches/${event.params.id}`);
	if (!marche.peut_modifier) error(403, "Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.");
	return { marche };
};

export const actions: Actions = {
	default: (event) => enregistrerMarche(event, event.params.id)
};
