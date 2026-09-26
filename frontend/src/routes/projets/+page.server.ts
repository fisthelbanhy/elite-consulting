import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { secteurs } from '$lib/server/referentiels';
import { chargerEncart } from '$lib/server/publicites';
import type { Liste } from '$lib/types';
import type { CompteursProjets, ProjetResume } from '$lib/types/projets';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		q: q.get('q') ?? '',
		secteur_id: q.get('secteur_id') ?? '',
		devis_min: q.get('devis_min') ?? '',
		besoin_min: q.get('besoin_min') ?? '',
		realisation_min: q.get('realisation_min') ?? '',
		miens: q.get('miens') ?? '',
		page: q.get('page') ?? '1'
	};
	const [liste, compteurs, sects, publicites] = await Promise.all([
		charger<Liste<ProjetResume>>(event, '/projets', { ...filtres, miens: filtres.miens ? 'true' : '', taille: 20 }),
		chargerOuDefaut<CompteursProjets>(event, '/projets/compteurs', { projets: 0, besoin_total: 0, montant_promis: 0, montant_collecte: 0 }),
		secteurs(event),
		// Colonne « LES PUBLICITES » du legacy (F-S4-03), masquée pour les gestionnaires
		event.locals.membre?.est_gestionnaire ? Promise.resolve([]) : chargerEncart(event, { limite: 4 })
	]);
	return { liste, compteurs, secteurs: sects, filtres, supprime: q.has('supprime'), publicites };
};
