import type { Actions, PageServerLoad } from './$types';
import { banques } from '$lib/server/referentiels';
import { actionsFiche, chargerFiche, enregistrerPlacement } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { PlacementDetail } from '$lib/types/tresorerie';

export const load: PageServerLoad = async (event) => {
	const [donnees, liste] = await Promise.all([chargerFiche<PlacementDetail>(event, 'placements'), banques(event)]);
	return { ...donnees, banques: liste.filter((b) => !/^autres?$/i.test(b.nom.trim())) };
};

export const actions: Actions = { ...actionsFiche('placements', enregistrerPlacement), dialogue: actionDialogue };
