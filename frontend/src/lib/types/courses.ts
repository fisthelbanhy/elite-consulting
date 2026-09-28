/** Types des courses & livraison et du catalogue boutique, alignés sur `api/src/routes/courses.ts`. */
import type { Auteur } from '$lib/types';
import type { ContactMembre } from './immobilier';

export interface LigneCourse {
	id: number | null;
	article_catalogue_id: number | null;
	nom_article: string;
	prix_plafond: number;
	quantite: number;
	observation: string;
	montant: number;
}

export interface CourseResume {
	id: number;
	reference: string;
	client: Auteur | null;
	boutique: Auteur | null;
	date_creation: string | null;
	date_achat: string | null;
	date_livraison: string | null;
	lieu_achat: string;
	montant_achats: number;
	frais_service: number;
	net_a_payer: number;
	mode_paiement: number;
	paye: number;
	etat_course: number;
	etat: number;
	lignes: LigneCourse[];
}

export interface CourseDetail extends CourseResume {
	boutique_id: number | null;
	lieu_livraison: string;
	observation: string;
	contact_client: ContactMembre | null;
	paiement: { id: number; date_paiement: string; mode: number; montant: number; etat: number } | null;
	est_client: boolean;
	peut_modifier: boolean;
	peut_annuler: boolean;
	peut_gerer: boolean;
	peut_moderer: boolean;
	peut_payer: boolean;
	etats_possibles: number[];
}

export interface Recapitulatif {
	montant_achats: number;
	frais_service: number;
	net_a_payer: number;
	montant_minimum: number;
	nombre_articles: number;
	lignes: LigneCourse[];
	lieu_achat: string;
}

export interface Boutique {
	id: number;
	pseudonyme: string;
	nom: string;
	adresse: string;
	nombre_articles: number;
	photo_url: string | null;
}

export interface ArticleCatalogue {
	id: number;
	boutique_id: number | null;
	boutique: Auteur | null;
	code: string;
	nom: string;
	marque: string;
	prix: number;
	disponible: number;
	description: string;
	etat: number;
	photo_url: string | null;
}

export interface ArticleCatalogueDetail extends ArticleCatalogue {
	peut_modifier: boolean;
	peut_moderer: boolean;
}

/** Ligne de saisie du formulaire de course (valeurs brutes réaffichées après une erreur). */
export interface LigneSaisie {
	nom_article: string;
	prix_plafond: string | number;
	quantite: string | number;
	observation: string;
}
