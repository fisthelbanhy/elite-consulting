import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerEntreprise } from '$lib/server/entreprises';
import { secteurs, villes } from '$lib/server/referentiels';
import type { EntrepriseDetail } from '$lib/types/entreprises';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const entreprise = await charger<EntrepriseDetail>(event, `/entreprises/${event.params.id}`);
	if (!entreprise.peut_modifier) error(403, "Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.");
	const [sects, vils] = await Promise.all([secteurs(event), villes(event)]);
	return { entreprise, secteurs: sects, villes: vils };
};

export const actions: Actions = {
	default: (event) => enregistrerEntreprise(event, event.params.id)
};
