import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { exigerGestionnaire, filtreEntier } from '$lib/server/contact';
import type { Liste } from '$lib/types';
import type { FilResume } from '$lib/types/messages';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	const u = event.url.searchParams;
	const filtres = { q: u.get('q') ?? '', tous: u.get('tous') === '1', page: filtreEntier(event.url, 'page') || '1' };
	const liste = await charger<Liste<FilResume>>(event, '/messages/fils', {
		q: filtres.q,
		tous: filtres.tous || undefined,
		page: filtres.page,
		taille: 50
	});
	return { liste, filtres };
};
