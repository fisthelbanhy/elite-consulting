import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import { enregistrerDossier, questionnaire, questionnaires } from '$lib/server/accompagnement';
import type { DossierDetail } from '$lib/types/accompagnement';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const [dossier, liste] = await Promise.all([
		charger<DossierDetail>(event, `/accompagnement/${event.params.id}`),
		questionnaires(event)
	]);
	const q = liste.find((x) => x.type === dossier.type_dossier);
	// URL cohérente avec le type réel du dossier
	if (q && q.slug !== event.params.type) redirect(301, `/accompagnement/${q.slug}/${dossier.id}`);
	return { dossier, questionnaire: q ?? (await questionnaire(event, event.params.type)), statut: event.url.searchParams.get('statut') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/accompagnement/${p.id}`, '/accompagnement'),
	default: async (event) => enregistrerDossier(event, await questionnaire(event, event.params.type), event.params.id)
};
