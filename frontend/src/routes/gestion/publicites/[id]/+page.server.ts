import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/contact';
import { actionsModeration } from '$lib/server/moderation';
import { enregistrerPublicite } from '$lib/server/publicites';
import type { ChoixPublicite, PubliciteDetail } from '$lib/types/publicites';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	if (!/^\d+$/.test(event.params.id)) error(404, "Cette publicité n'existe pas.");
	// Consultée par un gestionnaire : aucune vue n'est comptée
	const [pub, choix] = await Promise.all([
		charger<PubliciteDetail>(event, `/publicites/${event.params.id}`),
		charger<ChoixPublicite>(event, '/publicites/choix')
	]);
	const q = event.url.searchParams;
	return {
		pub,
		choix,
		enregistre: q.has('enregistre'),
		modifie: q.has('modifie'),
		fichierRefuse: q.get('fichier_refuse')
	};
};

export const actions: Actions = {
	// ?/etat et ?/supprimer (droit Activation, contrôlé par l'API)
	...actionsModeration((p) => `/publicites/${p.id}`, '/gestion/publicites'),
	enregistrer: (event) => enregistrerPublicite(event, event.params.id)
};
