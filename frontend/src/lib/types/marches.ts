/** Marchés (appels d'offres) et projets — aligné sur `api/src/routes/marches.ts`. */
import type { Auteur } from '$lib/types';

export interface MarcheResume {
	id: number;
	reference: string;
	numero_appel_offre: string;
	/** 1 Privé, 2 Public (énumération `Confidentialite`) */
	type_marche: 1 | 2;
	libelle: string;
	montant: number;
	date_limite: string | null;
	maitre_ouvrage: string;
	etat: number;
	date_creation: string | null;
	/** Jours avant la date limite (négatif : dépassée ; null : non précisée) */
	jours_restants: number | null;
	ouvert: boolean;
}

export interface MarcheDetail extends MarcheResume {
	description: string;
	dossier_a_fournir: string;
	lieu_depot: string;
	email: string;
	publie_par: string;
	beneficiaire: string;
	document_url: string | null;
	auteur: Auteur | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
}

export interface ProjetResume {
	id: number;
	reference: string;
	responsable: string;
	promoteur: string;
	objet: string;
	libelle: string;
	duree_mois: number;
	date_lancement: string | null;
	etat: number;
	date_creation: string | null;
}

export interface ProjetDetail extends ProjetResume {
	objectif: string;
	description: string;
	adresse: string;
	conditions: string;
	auteur: Auteur | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
}

export interface CompteursMarches {
	marches: number;
	marches_ouverts: number;
	projets: number;
}
