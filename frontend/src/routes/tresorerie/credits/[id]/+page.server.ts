import type { Actions, PageServerLoad } from './$types';
import { actionsFiche, chargerFiche, enregistrerCredit } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { CreditDetail } from '$lib/types/tresorerie';

export const load: PageServerLoad = (event) => chargerFiche<CreditDetail>(event, 'credits');

export const actions: Actions = { ...actionsFiche('credits', enregistrerCredit), dialogue: actionDialogue };
