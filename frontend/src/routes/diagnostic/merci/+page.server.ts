import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import type { FicheDetail } from '$lib/types/decouverte';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const fiche = await charger<FicheDetail | null>(event, '/decouverte/moi');
	if (!fiche?.diagnostic) redirect(303, '/diagnostic');
	return { fiche, diagnostic: fiche.diagnostic };
};
