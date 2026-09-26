import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { enregistrerProjet } from '$lib/server/projets';
import { secteurs, villes } from '$lib/server/referentiels';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const [sects, vils, entreprises] = await Promise.all([
		secteurs(event),
		villes(event),
		chargerOuDefaut<{ id: number; nom: string }[]>(event, '/projets/mes-entreprises', [])
	]);
	return { secteurs: sects, villes: vils, entreprises };
};

export const actions: Actions = {
	default: (event) => enregistrerProjet(event)
};
