import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { banques } from '$lib/server/referentiels';
import { chargerListe } from '$lib/server/tresorerie';
import { actionDialogue } from '$lib/server/dialogues';
import type { OperationResume, SyntheseLigne } from '$lib/types/tresorerie';

const FILTRES_GESTION = ['date_min', 'date_max', 'banque_id', 'type_operation', 'montant_min', 'montant_max', 'reference'] as const;

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const gestion = !!event.locals.membre?.est_gestionnaire;
	const extra: Record<string, string> = {};
	for (const k of FILTRES_GESTION) extra[k] = (q.get(k) ?? '').replace(/\s/g, '');
	// Vue gestionnaire (S7-11) : 50 opérations par page, totaux Débit / Crédit par devise
	const [donnees, synthese, liste] = await Promise.all([
		chargerListe<OperationResume>(event, 'operations', extra, gestion ? 50 : 20),
		gestion
			? chargerOuDefaut<SyntheseLigne[]>(event, '/tresorerie/operations/synthese', [], { ...extra, q: q.get('q') ?? '', etat: q.get('etat') ?? '' })
			: Promise.resolve([] as SyntheseLigne[]),
		banques(event)
	]);
	return { ...donnees, synthese, gestion, banques: liste.filter((b) => !/^autres?$/i.test(b.nom.trim())) };
};

export const actions: Actions = { dialogue: actionDialogue };
