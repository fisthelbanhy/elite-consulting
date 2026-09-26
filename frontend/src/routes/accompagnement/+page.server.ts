import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { questionnaires } from '$lib/server/accompagnement';
import type { CompteursAccompagnement } from '$lib/types/accompagnement';

export const load: PageServerLoad = async (event) => {
	const [liste, compteurs] = await Promise.all([
		questionnaires(event),
		event.locals.membre
			? chargerOuDefaut<CompteursAccompagnement | null>(event, '/accompagnement/compteurs', null)
			: Promise.resolve(null)
	]);
	return { questionnaires: liste, compteurs };
};
