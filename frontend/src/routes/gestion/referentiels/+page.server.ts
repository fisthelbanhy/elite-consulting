import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import type { ResumeReferentiel } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => ({
	sommaire: await charger<ResumeReferentiel[]>(event, '/gestion/referentiels')
});
