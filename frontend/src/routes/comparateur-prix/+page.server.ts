import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { chargerAcces, envoyerEmail } from '$lib/server/comparateur';
import type { Liste } from '$lib/types';
import type { LigneComparee, Produit } from '$lib/types/comparateur';
import type { CompteursMarches } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		type: q.get('type') ?? '',
		produit_id: q.get('produit_id') ?? '',
		q: q.get('q') ?? '',
		entreprise_id: q.get('entreprise_id') ?? '',
		tri: q.get('tri') ?? '',
		page: q.get('page') ?? '1'
	};
	const [acces, compteurs] = await Promise.all([
		chargerAcces(event),
		chargerOuDefaut<CompteursMarches | null>(event, '/marches/compteurs', null)
	]);
	const projets = compteurs?.projets ?? null;
	if (!acces.acces) return { acces, filtres, projets, lignes: null, produits: [] as Produit[] };
	const [lignes, produits] = await Promise.all([
		charger<Liste<LigneComparee>>(event, '/comparateur/lignes', { ...filtres, taille: 50 }),
		chargerOuDefaut<Produit[]>(event, '/comparateur/produits', [])
	]);
	return { acces, filtres, projets, lignes, produits };
};

export const actions: Actions = {
	email: envoyerEmail
};
