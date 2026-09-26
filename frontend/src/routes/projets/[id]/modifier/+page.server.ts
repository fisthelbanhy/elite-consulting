import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { enregistrerProjet } from '$lib/server/projets';
import { secteurs, villes } from '$lib/server/referentiels';
import type { ProjetDetail } from '$lib/types/projets';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const projet = await charger<ProjetDetail>(event, `/projets/${event.params.id}`);
	if (!projet.peut_modifier) error(403, "Seul le porteur du projet ou un gestionnaire habilité peut le modifier.");
	const [sects, vils, entreprises] = await Promise.all([
		secteurs(event),
		villes(event),
		chargerOuDefaut<{ id: number; nom: string }[]>(event, '/projets/mes-entreprises', [])
	]);
	return { projet, secteurs: sects, villes: vils, entreprises };
};

export const actions: Actions = {
	default: (event) => enregistrerProjet(event, event.params.id)
};
