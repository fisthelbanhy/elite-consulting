import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { GroupeResume } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		montant_min: q.get('montant_min') ?? '',
		montant_max: q.get('montant_max') ?? '',
		q: q.get('q') ?? '',
		miens: q.get('miens') ?? '',
		page: q.get('page') ?? '1'
	};
	const [liste, compteurs] = await Promise.all([
		charger<Liste<GroupeResume>>(event, '/likelemba', { ...filtres, miens: filtres.miens ? 'true' : '', taille: 20 }),
		chargerOuDefaut(event, '/likelemba/compteurs', { groupes: 0, adherents: 0 })
	]);
	return { liste, compteurs, filtres, supprime: q.has('supprime') };
};
