import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { ajouterAuPanier } from '$lib/server/boutique';
import type { ProduitDetail } from '$lib/types/boutique';

export const load: PageServerLoad = async (event) => {
	const produit = await charger<ProduitDetail>(event, `/boutique/produits/${event.params.id}`);
	return { produit };
};

export const actions: Actions = {
	ajouter: ajouterAuPanier
};
