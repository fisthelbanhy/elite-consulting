import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import type { Statut } from '$lib/types/distributeur';

export const load: PageServerLoad = async (event) => {
	const defaut: Statut = { connecte: !!event.locals.membre, gestionnaire: false, distributeur: false, souscription: null };
	const statut = await chargerOuDefaut<Statut>(event, '/distributeur/statut', defaut);
	return { statut };
};
