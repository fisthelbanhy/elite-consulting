import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import type { FicheBienEtre } from '$lib/types/boutique';

export const load: PageServerLoad = async (event) => {
	const { parametres } = await event.parent();
	// Module désactivable (ADR-0009) : page explicative, pas d'erreur
	if (!parametres.module_sante_actif) return { actif: false, fiches: [] as FicheBienEtre[] };
	return { actif: true, fiches: await charger<FicheBienEtre[]>(event, '/bien-etre') };
};
