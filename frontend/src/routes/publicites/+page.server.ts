import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { chargerEncart } from '$lib/server/publicites';
import type { Liste } from '$lib/types';
import type { PubliciteGestion } from '$lib/types/publicites';

export const load: PageServerLoad = async (event) => {
	const membre = event.locals.membre;
	const [publicites, miennes] = await Promise.all([
		// Toutes les publicités actives de la période, en ordre aléatoire (F-TRV-44)
		chargerEncart(event, { limite: 50 }),
		// Un membre annonceur suit ses propres publicités (vues, période, état)
		membre && !membre.est_gestionnaire
			? chargerOuDefaut<Liste<PubliciteGestion> | null>(event, '/publicites', null, { taille: 20 })
			: Promise.resolve(null)
	]);
	return { publicites, miennes: miennes?.items.length ? miennes.items : [] };
};
