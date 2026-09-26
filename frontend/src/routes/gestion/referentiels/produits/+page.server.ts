import type { Actions, PageServerLoad } from './$types';
import { charger } from '$lib/server/api';
import { filtres, idFormulaire, supprimer, taillePage } from '$lib/server/gestion';
import type { Liste } from '$lib/types';
import type { ProduitGestion } from '$lib/types/gestion';

const FILTRES = ['q', 'groupe', 'etat', 'prix_distributeur_max', 'prix_public_max', 'quantite_max', 'page'] as const;

/** Produits (legacy `pproduit.php`, F-ADM-25 à F-ADM-27). */
export const load: PageServerLoad = async (event) => {
	const f = filtres(event.url, FILTRES);
	const taille = taillePage(event.url);
	const liste = await charger<Liste<ProduitGestion>>(event, '/gestion/referentiels/produits', { ...f, taille });
	return { liste, filtres: f, taille, enregistre: event.url.searchParams.get('ok') };
};

export const actions: Actions = {
	supprimer: async (event) => {
		const id = idFormulaire(await event.request.formData());
		return supprimer(event, `/gestion/referentiels/produits/${id}`);
	}
};
