import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { secteurs } from '$lib/server/referentiels';
import { chargerEncart } from '$lib/server/publicites';
import type { Liste } from '$lib/types';
import type { AnnonceResume } from '$lib/types/emplois';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		type: q.get('type') ?? '',
		q: q.get('q') ?? '',
		secteur_id: q.get('secteur_id') ?? '',
		domaine_id: q.get('domaine_id') ?? '',
		page: q.get('page') ?? '1'
	};
	const [liste, compteurs, sects, publicites] = await Promise.all([
		charger<Liste<AnnonceResume>>(event, '/emplois', { ...filtres, taille: 20 }),
		chargerOuDefaut(event, '/emplois/compteurs', { demandes: 0, offres: 0 }),
		secteurs(event),
		// Colonne « LES PUBLICITES » du legacy, masquée pour les gestionnaires (F-S2-08, F-S2-10)
		event.locals.membre?.est_gestionnaire ? Promise.resolve([]) : chargerEncart(event, { limite: 5 })
	]);
	return { liste, compteurs, secteurs: sects, filtres, supprime: q.has('supprime'), publicites };
};
