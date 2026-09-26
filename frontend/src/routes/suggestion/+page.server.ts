import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { filtreEntier } from '$lib/server/contact';
import type { Ok } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	// Module prérempli depuis un lien contextuel (?module=2 depuis les emplois, par exemple)
	return { module: filtreEntier(event.url, 'module') };
};

export const actions: Actions = {
	default: async (event) => {
		exigerConnexion(event); // dépôt réservé aux connectés (ADR-0007 T8)
		const valeurs = lireFormulaire(await event.request.formData(), { module: 'entier?', texte: 'texte' });
		const r = await soumettre<Ok>(event, '/suggestions', { body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		return { succes: r.data.message };
	}
};
