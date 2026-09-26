import type { Actions, PageServerLoad } from './$types';
import { chargerListe } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { PlacementResume } from '$lib/types/tresorerie';

export const load: PageServerLoad = (event) => chargerListe<PlacementResume>(event, 'placements');

export const actions: Actions = { dialogue: actionDialogue };
