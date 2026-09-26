import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerPartenariat } from '$lib/server/partenariats';
import type { PartenariatDetail } from '$lib/types/partenariats';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const fiche = await charger<PartenariatDetail>(event, `/partenariats/${event.params.id}`);
	if (!fiche.peut_modifier) error(403, "Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.");
	return { fiche };
};

export const actions: Actions = {
	default: (event) => enregistrerPartenariat(event, event.params.id)
};
