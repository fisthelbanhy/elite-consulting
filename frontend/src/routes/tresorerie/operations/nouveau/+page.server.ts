import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/api';
import { banques } from '$lib/server/referentiels';
import { enregistrerOperations, LIGNES_MAX } from '$lib/server/tresorerie';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const lignes = Math.min(LIGNES_MAX, Math.max(1, Number(event.url.searchParams.get('lignes')) || 1));
	return { lignes, banques: (await banques(event)).filter((b) => !/^autres?$/i.test(b.nom.trim())) };
};

export const actions: Actions = { default: enregistrerOperations };
