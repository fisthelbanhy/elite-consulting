import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsTarifs } from '$lib/server/tarifs-bancaires';
import type { Comparatif } from '$lib/types/tarifs-bancaires';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = { type_id: q.get('type_id') ?? '', banque_id: q.getAll('banque_id').filter(Boolean) };
	const saisie = Number(q.get('saisie')) || null;
	const gestion = q.has('gestion');
	// Visiteur : présentation, consultation réservée aux membres connectés (ADR-0007 S7b)
	if (!event.locals.membre) return { comparatif: null, tous: null, grille: null, filtres, saisie, gestion };
	const [comparatif, tous, grille] = await Promise.all([
		charger<Comparatif>(event, '/tarifs-bancaires', { type_id: filtres.type_id, banque_id: filtres.banque_id }),
		// Référentiel complet (listes de filtres, gestion)
		charger<Comparatif>(event, '/tarifs-bancaires'),
		saisie ? charger<Comparatif>(event, '/tarifs-bancaires', { banque_id: saisie }) : Promise.resolve(null)
	]);
	return { comparatif, tous, grille, filtres, saisie, gestion };
};

export const actions: Actions = actionsTarifs;
