import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { filtres, taillePage } from '$lib/server/gestion';
import type { FileModeration } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => {
	const f = filtres(event.url, ['module', 'page'] as const);
	const file = await charger<FileModeration>(event, '/gestion/moderation', { ...f, taille: taillePage(event.url) });
	return { file, filtres: f };
};
