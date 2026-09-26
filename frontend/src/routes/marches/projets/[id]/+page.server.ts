import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { ProjetDetail } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	const projet = await charger<ProjetDetail>(event, `/marches/projets/${event.params.id}`);
	return { projet, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	// Après suppression : /marches/projets redirige vers l'onglet « Projets » en gardant `supprime=1`
	...actionsModeration((p) => `/marches/projets/${p.id}`, '/marches/projets')
};
