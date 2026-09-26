import type { PageServerLoad } from './$types';
import { statutEpargne } from '$lib/server/epargne';

export const load: PageServerLoad = async (event) => {
	return { statut: await statutEpargne(event) };
};
