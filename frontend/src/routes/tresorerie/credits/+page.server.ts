import type { Actions, PageServerLoad } from './$types';
import { chargerListe } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { CreditResume } from '$lib/types/tresorerie';

export const load: PageServerLoad = (event) => chargerListe<CreditResume>(event, 'credits');

export const actions: Actions = { dialogue: actionDialogue };
