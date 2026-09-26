import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { filtres, idFormulaire, supprimer, taillePage } from '$lib/server/gestion';
import type { Liste } from '$lib/types';
import type { MaladieGestion } from '$lib/types/gestion';

/** Fiches bien-être (legacy `pmaladie.php`, F-ADM-22 à F-ADM-24). */
export const load: PageServerLoad = async (event) => {
	const f = filtres(event.url, ['q', 'etat', 'page'] as const);
	const taille = taillePage(event.url);
	const liste = await charger<Liste<MaladieGestion>>(event, '/gestion/referentiels/maladies', { ...f, taille });
	return { liste, filtres: f, taille, enregistre: event.url.searchParams.get('ok') };
};

export const actions: Actions = {
	supprimer: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return supprimer(event, `/gestion/referentiels/maladies/${id}`);
	}
};
