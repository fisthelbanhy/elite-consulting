import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { PaiementMien } from '$lib/types/espace';

export const load: PageServerLoad = async (event) => {
	const paiements = await charger<Liste<PaiementMien>>(event, '/paiements/miens', {
		page: event.url.searchParams.get('page'),
		taille: 20
	});
	// Retour de la page de paiement générique (`/paiement/{type}` → `/espace/paiements?paye=1`)
	return { paiements, paye: event.url.searchParams.has('paye') };
};
