import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { executer, filtres, idFormulaire, taillePage } from '$lib/server/gestion';
import { villes } from '$lib/server/referentiels';
import type { MembreLigne } from '$lib/types/gestion';
import type { Liste } from '$lib/types';

const FILTRES = ['q', 'type_compte', 'categorie', 'ville_id', 'etat', 'tri', 'page'] as const;

export const load: PageServerLoad = async (event) => {
	const f = filtres(event.url, FILTRES);
	const taille = taillePage(event.url);
	const [liste, vils] = await Promise.all([
		charger<Liste<MembreLigne>>(event, '/gestion/membres', { ...f, taille }),
		villes(event)
	]);
	return { liste, villes: vils, filtres: f, taille };
};

export const actions: Actions = {
	/** Validation rapide depuis la liste (F-ADM-15). */
	valider: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return executer(event, `/gestion/membres/${id}/etat`, { body: { etat: 2 }, cle: `valider-${id}` });
	}
};
