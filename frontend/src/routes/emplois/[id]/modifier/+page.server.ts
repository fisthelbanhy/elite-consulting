import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerAnnonce } from '$lib/server/emplois';
import { secteurs } from '$lib/server/referentiels';
import type { AnnonceDetail } from '$lib/types/emplois';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const annonce = await charger<AnnonceDetail>(event, `/emplois/${event.params.id}`);
	if (!annonce.peut_modifier) error(403, "Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.");
	return { annonce, secteurs: await secteurs(event) };
};

export const actions: Actions = {
	default: (event) => enregistrerAnnonce(event, event.params.id)
};
