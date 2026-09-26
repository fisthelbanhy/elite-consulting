import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { executer, idFormulaire, taillePage } from '$lib/server/gestion';
import type { Liste, Ok } from '$lib/types';
import type { LienReinitialisation, ReinitialisationLigne } from '$lib/types/gestion';

/** Demandes « mot de passe oublié » des membres sans e-mail (ADR-0005 §3, F-ADM-14). */
export const load: PageServerLoad = async (event) => {
	const statut = event.url.searchParams.get('statut') === 'toutes' ? 'toutes' : 'attente';
	const liste = await charger<Liste<ReinitialisationLigne>>(event, '/gestion/reinitialisations', {
		statut,
		page: event.url.searchParams.get('page'),
		taille: taillePage(event.url)
	});
	return { liste, statut };
};

export const actions: Actions = {
	traiter: async (event) => {
		const id = idFormulaire(await event.request.formData());
		const r = await executer<LienReinitialisation & Ok>(event, `/gestion/reinitialisations/${id}/traiter`, { cle: 'reinit' });
		return 'donnees' in r ? { cle: 'reinit', succes: r.succes, lien: r.donnees } : r;
	},
	ignorer: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return executer(event, `/gestion/reinitialisations/${id}/ignorer`, { cle: 'reinit' });
	}
};
