import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { enregistrerArticleCatalogue } from '$lib/server/courses';
import type { Boutique } from '$lib/types/courses';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	const boutique = membre.categorie === 2 && membre.type_partenaire === 2;
	const gestion = membre.est_gestionnaire && membre.droit_activation;
	if (!boutique && !gestion) error(403, 'Le catalogue est réservé aux boutiques partenaires.');
	return { boutiques: boutique ? [] : await chargerOuDefaut<Boutique[]>(event, '/courses/boutiques', []) };
};

export const actions: Actions = {
	default: (event) => enregistrerArticleCatalogue(event)
};
