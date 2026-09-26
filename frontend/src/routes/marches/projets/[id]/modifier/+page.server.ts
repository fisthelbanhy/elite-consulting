import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerProjet } from '$lib/server/marches';
import type { ProjetDetail } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const projet = await charger<ProjetDetail>(event, `/marches/projets/${event.params.id}`);
	if (!projet.peut_modifier) error(403, "Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.");
	return { projet };
};

export const actions: Actions = {
	default: (event) => enregistrerProjet(event, event.params.id)
};
