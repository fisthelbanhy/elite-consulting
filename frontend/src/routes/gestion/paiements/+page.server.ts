import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { executer, filtres, idFormulaire, taillePage } from '$lib/server/gestion';
import type { ListePaiements, OptionMembre } from '$lib/types/gestion';

const FILTRES = ['etat', 'mode', 'type_objet', 'membre_id', 'q', 'du', 'au', 'montant_max', 'page'] as const;

/** Caisse (legacy `ppayement.php`, inventaire §4.5) : réservée au droit « Caisse ». */
export const load: PageServerLoad = async (event) => {
	const f = filtres(event.url, FILTRES);
	const taille = taillePage(event.url);
	if (!event.locals.membre?.droit_caisse) return { caisse: false as const, filtres: f, taille, liste: null, membres: [] };
	const [liste, membres] = await Promise.all([
		charger<ListePaiements>(event, '/paiements', { ...f, taille }),
		chargerOuDefaut<OptionMembre[]>(event, '/gestion/membres/options', [])
	]);
	return { caisse: true as const, filtres: f, taille, liste, membres };
};

export const actions: Actions = {
	confirmer: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return executer(event, `/paiements/${id}/confirmer`, { cle: `paiement-${id}` });
	},
	rejeter: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return executer(event, `/paiements/${id}/rejeter`, { cle: `paiement-${id}` });
	}
};
