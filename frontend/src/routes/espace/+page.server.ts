import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import type { TableauEspace } from '$lib/types/espace';

export const load: PageServerLoad = async (event) => {
	const tableau = await charger<TableauEspace>(event, '/espace/tableau');
	return { tableau, bienvenue: event.url.searchParams.has('bienvenue') };
};
