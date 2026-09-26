import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { ajouterAuPanier } from '$lib/server/boutique';
import type { Catalogue, Groupe, ProduitResume } from '$lib/types/boutique';

export const load: PageServerLoad = async (event) => {
	const u = event.url.searchParams;
	const filtres = {
		q: u.get('q') ?? '',
		groupe: u.get('groupe') ?? '',
		tri: u.get('tri') ?? '',
		page: u.get('page') ?? '1'
	};
	const [catalogue, groupes, populaires] = await Promise.all([
		charger<Catalogue>(event, '/boutique/produits', { ...filtres, taille: 24 }),
		chargerOuDefaut<Groupe[]>(event, '/boutique/groupes', []),
		chargerOuDefaut<ProduitResume[]>(event, '/boutique/produits/populaires', [], { limite: 10 })
	]);
	return { catalogue, groupes, populaires, filtres };
};

export const actions: Actions = {
	ajouter: ajouterAuPanier
};
