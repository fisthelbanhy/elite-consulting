import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { exigerEpargne } from '$lib/server/epargne';
import type { Liste } from '$lib/types';
import type { FondResume } from '$lib/types/epargne';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	await exigerEpargne(event);
	const q = event.url.searchParams;
	const filtres = {
		du: q.get('du') ?? '',
		type_fond: q.get('type_fond') ?? '',
		montant_min: q.get('montant_min') ?? '',
		confirme: q.get('confirme') ?? '',
		q: q.get('q') ?? '',
		page: q.get('page') ?? '1'
	};
	const liste = await charger<Liste<FondResume>>(event, '/epargne/fonds', { ...filtres, taille: 20 });
	return { liste, filtres };
};
