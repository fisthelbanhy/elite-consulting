import type { Actions, PageServerLoad } from './$types';
import { soumettre } from '$lib/server/api';
import { banques } from '$lib/server/referentiels';
import { actionsFiche, chargerFiche, enregistrerOperation } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { Ok } from '$lib/types';
import type { OperationDetail } from '$lib/types/tresorerie';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const [donnees, liste] = await Promise.all([chargerFiche<OperationDetail>(event, 'operations'), banques(event)]);
	return {
		...donnees,
		banques: liste.filter((b) => !/^autres?$/i.test(b.nom.trim())),
		lot: Number(q.get('lot')) || 0,
		emails: Number(q.get('emails')) || 0
	};
};

export const actions: Actions = {
	...actionsFiche('operations', enregistrerOperation),
	dialogue: actionDialogue,
	// Bouton « Envoyer Mail » : renvoie l'ordre à la banque émettrice (F-S7-32)
	mail: async (event) => {
		const r = await soumettre<Ok>(event, `/tresorerie/operations/${event.params.id}/mail`, { cle: 'mail' });
		if (!r.ok) return r.echec;
		return { cle: 'mail', succes: r.data.message };
	}
};
