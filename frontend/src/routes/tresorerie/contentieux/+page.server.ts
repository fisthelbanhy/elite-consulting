import type { Actions, PageServerLoad } from './$types';
import { chargerListe } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { ContentieuxResume } from '$lib/types/tresorerie';

export const load: PageServerLoad = (event) => chargerListe<ContentieuxResume>(event, 'contentieux');

export const actions: Actions = { dialogue: actionDialogue };
