import type { LayoutServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';

/** « Mon espace » est réservé aux membres connectés (F-TRV-25). */
export const load: LayoutServerLoad = async (event) => {
	exigerConnexion(event);
	return {};
};
