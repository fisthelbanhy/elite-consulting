import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { SujetResume } from '$lib/types/questions';
import type { ReussiteResume } from '$lib/types/reussites';

export const load: PageServerLoad = async (event) => {
	const vide = { items: [], total: 0, page: 1, taille: 3 };
	const [sujets, reussites] = await Promise.all([
		chargerOuDefaut<SujetResume[]>(event, '/questions/derniers', [], { n: 5 }),
		chargerOuDefaut<Liste<ReussiteResume>>(event, '/reussites', vide, { taille: 3 })
	]);
	return { sujets, reussites: reussites.items };
};
