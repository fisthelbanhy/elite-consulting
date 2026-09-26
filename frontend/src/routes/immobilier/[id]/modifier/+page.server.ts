import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerBien } from '$lib/server/immobilier';
import { villes } from '$lib/server/referentiels';
import type { BienDetail } from '$lib/types/immobilier';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const bien = await charger<BienDetail>(event, `/immobilier/${event.params.id}`);
	if (!bien.peut_modifier) error(403, "Seul l'auteur de l'annonce ou un gestionnaire habilité peut la modifier.");
	return { bien, villes: await villes(event) };
};

export const actions: Actions = {
	default: (event) => enregistrerBien(event, event.params.id)
};
