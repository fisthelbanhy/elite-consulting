import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { secteurs } from '$lib/server/referentiels';
import type { Liste } from '$lib/types';
import type { ReussiteResume } from '$lib/types/reussites';

export const load: PageServerLoad = async (event) => {
	const p = event.url.searchParams;
	const gestionnaire = !!event.locals.membre?.est_gestionnaire;
	const filtres = {
		q: p.get('q') ?? '',
		secteur_id: p.get('secteur_id') ?? '',
		// « À valider » : onglet réservé aux gestionnaires
		etat: gestionnaire && p.get('etat') === '1' ? '1' : '',
		page: p.get('page') ?? '1'
	};
	const [liste, compteurs, sects] = await Promise.all([
		charger<Liste<ReussiteResume>>(event, '/reussites', { ...filtres, taille: 12 }),
		chargerOuDefaut(event, '/reussites/compteurs', { publiees: 0, a_valider: 0 }),
		secteurs(event)
	]);
	return { liste, compteurs, secteurs: sects, filtres, supprime: p.has('supprime') };
};
