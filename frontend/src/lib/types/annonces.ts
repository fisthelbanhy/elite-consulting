/** Types des petites annonces et du panier, alignés sur `api/src/routes/annonces.ts`. */
import type { Auteur } from '$lib/types';
import type { InteretRecu } from './immobilier';

export interface ArticleResume {
	id: number;
	reference: string;
	offre_ou_recherche: 1 | 2;
	famille: { id: number; libelle: string } | null;
	libelle: string;
	prix: number;
	quantite: number;
	neuf_ou_occasion: number;
	description: string;
	etat: number;
	date_creation: string | null;
	nombre_visites: number;
	date_derniere_visite: string | null;
	photo_url: string | null;
}

export interface ArticleDetail extends ArticleResume {
	famille_id: number | null;
	auteur: Auteur | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_manifester: boolean;
	peut_acheter: boolean;
	mon_interet: boolean;
	quantite_panier: number;
	interets: InteretRecu[] | null;
}

export interface LignePanier {
	id: number;
	article: {
		id: number;
		reference: string;
		libelle: string;
		prix: number;
		quantite: number;
		etat: number;
		offre_ou_recherche: number;
		photo_url: string | null;
	} | null;
	quantite: number;
	prix_unitaire: number;
	montant: number;
	date_ajout: string;
	membre: { id: number; pseudonyme: string; nom: string } | null;
	stock_insuffisant: boolean;
}

export interface Achat {
	id: number;
	article_id: number | null;
	libelle: string;
	quantite: number;
	prix_unitaire: number;
	montant: number;
	date_paiement: string | null;
	etat_paiement: number | null;
}

export interface Panier {
	lignes: LignePanier[];
	total_quantite: number;
	total_montant: number;
	stock_suffisant: boolean;
	peut_payer: boolean;
	message: string | null;
	achats: Achat[];
}
