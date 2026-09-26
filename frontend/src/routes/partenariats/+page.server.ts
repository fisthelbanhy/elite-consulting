import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { PartenariatResume } from '$lib/types/partenariats';

export const load: PageServerLoad = async (event) => {
	const u = event.url.searchParams;
	const filtres = { q: u.get('q') ?? '', miennes: u.get('miennes') ?? '', page: u.get('page') ?? '1' };
	const [liste, compteur] = await Promise.all([
		charger<Liste<PartenariatResume>>(event, '/partenariats', { ...filtres, taille: 20 }),
		chargerOuDefaut(event, '/partenariats/compteur', { publies: 0 })
	]);
	return { liste, compteur, filtres, supprime: u.has('supprime') };
};
