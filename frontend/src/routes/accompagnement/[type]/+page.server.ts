import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { questionnaire } from '$lib/server/accompagnement';
import type { Liste } from '$lib/types';
import type { DossierResume } from '$lib/types/accompagnement';

export const load: PageServerLoad = async (event) => {
	const q = await questionnaire(event, event.params.type);
	const p = event.url.searchParams;
	const filtres = { q: p.get('q') ?? '', etat: p.get('etat') ?? '', page: p.get('page') ?? '1' };
	// Visiteur : présentation du questionnaire ; membre : ses dossiers ; gestionnaire : tous (F-S7-12)
	const dossiers = event.locals.membre
		? await charger<Liste<DossierResume>>(event, '/accompagnement', { type: q.type, ...filtres, taille: 20 })
		: null;
	return { questionnaire: q, dossiers, filtres, supprime: p.has('supprime') };
};
