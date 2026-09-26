import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { exigerGestionnaire, filtreDate, filtreEntier } from '$lib/server/contact';
import type { Liste } from '$lib/types';
import type { ChoixPublicite, FiltresPublicites, PubliciteGestion } from '$lib/types/publicites';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	const u = event.url;
	const filtres: FiltresPublicites = {
		q: u.searchParams.get('q') ?? '',
		demandeur_id: filtreEntier(u, 'demandeur_id'),
		entreprise_id: filtreEntier(u, 'entreprise_id'),
		debut_du: filtreDate(u, 'debut_du'),
		debut_au: filtreDate(u, 'debut_au'),
		fin_du: filtreDate(u, 'fin_du'),
		fin_au: filtreDate(u, 'fin_au'),
		vues_min: filtreEntier(u, 'vues_min'),
		vues_max: filtreEntier(u, 'vues_max'),
		etat: filtreEntier(u, 'etat'),
		en_diffusion: u.searchParams.get('en_diffusion') === '1',
		vue: u.searchParams.get('vue') === 'cartes' ? 'cartes' : 'tableau',
		page: filtreEntier(u, 'page') || '1'
	};
	// `vue` ne concerne que l'affichage ; 50 lignes par page en gestion (ADR-0007 T2)
	const requete = { ...filtres, vue: undefined, en_diffusion: filtres.en_diffusion || undefined, taille: 50 };
	const [liste, choix] = await Promise.all([
		charger<Liste<PubliciteGestion>>(event, '/publicites', requete),
		chargerOuDefaut<ChoixPublicite>(event, '/publicites/choix', { membres: [], entreprises: [] })
	]);
	return { liste, choix, filtres, supprime: u.searchParams.has('supprime') };
};
