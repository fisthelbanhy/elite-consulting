import { error, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { secteurs } from '$lib/server/referentiels';
import { enregistrerReussite } from '$lib/server/reussites';
import type { ReussiteDetail } from '$lib/types/reussites';

/** Le témoignage du membre connecté (création ou modification) ; `?fiche=ID` permet à un
 * gestionnaire habilité de corriger celui d'un membre. */
async function ficheCible(event: RequestEvent) {
	const autre = event.url.searchParams.get('fiche');
	if (autre && /^\d+$/.test(autre)) {
		const fiche = await charger<ReussiteDetail>(event, `/reussites/${autre}`);
		if (!fiche.peut_modifier) error(403, "Seul l'auteur ou un gestionnaire habilité peut modifier ce témoignage.");
		return fiche;
	}
	return charger<ReussiteDetail | null>(event, '/reussites/moi');
}

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const [fiche, sects] = await Promise.all([ficheCible(event), secteurs(event)]);
	return { fiche, secteurs: sects, autre: !!fiche && !fiche.est_auteur, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	default: async (event) => {
		exigerConnexion(event);
		const fiche = await ficheCible(event);
		return enregistrerReussite(event, fiche?.id);
	}
};
