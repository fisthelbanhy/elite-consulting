import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { SujetResume } from '$lib/types/questions';

export const load: PageServerLoad = async (event) => {
	const p = event.url.searchParams;
	const filtres = {
		q: p.get('q') ?? '',
		miens: p.get('miens') === '1' ? '1' : '',
		etat: p.get('etat') ?? '',
		page: p.get('page') ?? '1'
	};
	const [liste, derniers, compteurs] = await Promise.all([
		charger<Liste<SujetResume>>(event, '/questions', {
			q: filtres.q,
			miens: filtres.miens ? true : undefined,
			etat: filtres.etat,
			page: filtres.page,
			taille: 20
		}),
		chargerOuDefaut<SujetResume[]>(event, '/questions/derniers', [], { n: 10 }),
		chargerOuDefaut(event, '/questions/compteurs', { sujets: 0 })
	]);
	return { liste, derniers, compteurs, filtres, supprime: p.has('supprime') };
};
