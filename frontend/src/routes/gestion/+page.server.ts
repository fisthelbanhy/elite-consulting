import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import type { TableauDeBord } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => {
	const tableau = await charger<TableauDeBord>(event, '/gestion/tableau-de-bord');
	return { tableau };
};
