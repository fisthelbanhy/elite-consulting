import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import type { ListeSuivi } from '$lib/types/boutique';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const u = event.url.searchParams;
	const filtres = { q: u.get('q') ?? '', etat_paiement: u.get('etat_paiement') ?? '', page: u.get('page') ?? '1' };
	const liste = await charger<ListeSuivi>(event, '/panier/suivi', { ...filtres, taille: 50 });
	return { liste, filtres };
};
