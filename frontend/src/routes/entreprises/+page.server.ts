import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { secteurs, villes } from '$lib/server/referentiels';
import { chargerEncart } from '$lib/server/publicites';
import type { Liste } from '$lib/types';
import type { EntrepriseResume } from '$lib/types/entreprises';
import type { CompteursMarches } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		q: q.get('q') ?? '',
		secteur_id: q.get('secteur_id') ?? '',
		domaine_id: q.get('domaine_id') ?? '',
		ville_id: q.get('ville_id') ?? '',
		tri: q.get('tri') ?? '',
		page: q.get('page') ?? '1'
	};
	const [liste, sects, vils, compteurs, publicites] = await Promise.all([
		charger<Liste<EntrepriseResume>>(event, '/entreprises', { ...filtres, taille: 20 }),
		secteurs(event),
		villes(event),
		chargerOuDefaut<CompteursMarches | null>(event, '/marches/compteurs', null),
		event.locals.membre?.est_gestionnaire ? Promise.resolve([]) : chargerEncart(event, { limite: 4 })
	]);
	return {
		liste,
		secteurs: sects,
		villes: vils,
		filtres,
		projets: compteurs?.projets ?? null,
		supprime: q.has('supprime'),
		publicites
	};
};
