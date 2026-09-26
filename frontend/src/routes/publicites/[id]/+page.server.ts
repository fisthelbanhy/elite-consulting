import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { chargerEncart } from '$lib/server/publicites';
import type { PubliciteDetail } from '$lib/types/publicites';

export const load: PageServerLoad = async (event) => {
	if (!/^\d+$/.test(event.params.id)) error(404, "Cette publicité n'existe pas.");
	const id = Number(event.params.id);
	// L'affichage compte une vue (F-TRV-46) ; les autres annonces forment la colonne latérale
	const [pub, autres] = await Promise.all([
		charger<PubliciteDetail>(event, `/publicites/${id}`),
		chargerEncart(event, { limite: 20, exclure: id })
	]);
	return { pub, autres };
};
