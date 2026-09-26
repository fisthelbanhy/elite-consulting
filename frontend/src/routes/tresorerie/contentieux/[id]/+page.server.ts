import type { Actions, PageServerLoad } from './$types';
import { actionsFiche, chargerFiche, enregistrerContentieux } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { ContentieuxDetail } from '$lib/types/tresorerie';

export const load: PageServerLoad = (event) => chargerFiche<ContentieuxDetail>(event, 'contentieux');

export const actions: Actions = { ...actionsFiche('contentieux', enregistrerContentieux), dialogue: actionDialogue };
