import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { ajouterAuPanier } from '$lib/server/boutique';
import type { FicheBienEtreDetail } from '$lib/types/boutique';

export const load: PageServerLoad = async (event) => {
	const { parametres } = await event.parent();
	if (!parametres.module_sante_actif) return { actif: false, fiche: null };
	const fiche = await charger<FicheBienEtreDetail>(event, `/bien-etre/${event.params.id}`);
	return { actif: true, fiche };
};

export const actions: Actions = {
	ajouter: ajouterAuPanier
};
