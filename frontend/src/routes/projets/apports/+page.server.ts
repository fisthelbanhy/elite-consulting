import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import type { ListeApports } from '$lib/types/projets';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const q = event.url.searchParams;
	const filtres = { q: q.get('q') ?? '', etat: q.get('etat') ?? '', appel_fond_id: q.get('projet') ?? '', page: q.get('page') ?? '1' };
	const liste = await charger<ListeApports>(event, '/projets/apports', {
		q: filtres.q,
		etat: filtres.etat,
		appel_fond_id: filtres.appel_fond_id,
		page: filtres.page,
		taille: 20
	});
	return { liste, filtres };
};
