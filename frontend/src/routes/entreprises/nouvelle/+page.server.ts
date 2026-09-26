import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { enregistrerEntreprise } from '$lib/server/entreprises';
import { secteurs, villes } from '$lib/server/referentiels';
import type { EntrepriseModele } from '$lib/types/entreprises';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const [modele, sects, vils] = await Promise.all([
		charger<EntrepriseModele>(event, '/entreprises/modele'),
		secteurs(event),
		villes(event)
	]);
	return { modele, secteurs: sects, villes: vils };
};

export const actions: Actions = {
	default: (event) => enregistrerEntreprise(event)
};
