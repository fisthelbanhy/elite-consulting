import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { chargerEncart } from '$lib/server/publicites';

export interface Stats {
	membres: number;
	offres_emploi: number;
	demandes_emploi: number;
	annonces_immobilier: number;
	annonces_articles: number;
	projets_financement: number;
	montant_promis: number;
	montant_collecte: number;
	groupes_likelemba: number;
	entreprises: number;
	partenariats: number;
	produits: number;
	reussites: number;
	annee_creation: number;
}

export interface ALaUne {
	type: string;
	titre: string;
	detail: string;
	href: string;
	date: string | null;
}

export interface Temoignage {
	id: number;
	projet: string;
	succes: string;
	conseil: string;
	auteur: { pseudonyme: string; photo_url: string | null };
	secteur: string | null;
}

export const load: PageServerLoad = async (event) => {
	const [stats, aLaUne, temoignages, publicites] = await Promise.all([
		chargerOuDefaut<Stats | null>(event, '/referentiels/stats', null),
		chargerOuDefaut<ALaUne[]>(event, '/referentiels/a-la-une', []),
		chargerOuDefaut<{ items: Temoignage[] }>(event, '/reussites', { items: [] }, { taille: 3 }),
		chargerEncart(event, { limite: 4 })
	]);
	return { stats, aLaUne, temoignages: temoignages.items, publicites };
};
