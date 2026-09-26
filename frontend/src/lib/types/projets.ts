/** Appels de fonds et engagements d'apport — alignés sur `backend/app/schemas/projets.py`. */
import type { Auteur, Liste } from '$lib/types';

export interface ProjetResume {
	id: number;
	reference: string;
	nom_projet: string;
	objet_projet: string;
	secteur: { id: number; libelle: string } | null;
	ville: { id: number; nom: string } | null;
	devis_projet: number;
	apport_fond_propre: number;
	besoin_financement: number;
	niveau_realisation: number;
	montant_promis: number;
	montant_collecte: number;
	appreciation: number;
	etat: number;
	date_creation: string | null;
	nombre_visites: number;
	photo_url: string | null;
	nom_promoteur: string | null;
	est_auteur: boolean;
	reste_a_collecter: number;
}

export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface ProjetCourt {
	id: number;
	reference: string;
	nom_projet: string;
	besoin_financement: number;
	montant_promis: number;
	montant_collecte: number;
	etat: number;
}

export interface Versement {
	id: number;
	date_versement: string;
	montant: number;
	etat: number;
}

export interface ApportResume {
	id: number;
	reference: string;
	date_engagement: string | null;
	type_apport: number;
	montant_promis: number;
	echeance_mois: number;
	montant_verse: number;
	date_dernier_versement: string | null;
	remarque: string;
	etat: number;
	appel_fond: ProjetCourt;
	creancier: ContactMembre | null;
	reste_a_verser: number;
	en_attente: number;
}

export interface ApportDetail extends ApportResume {
	observation_mediateur: string;
	versements: Versement[];
	peut_gerer: boolean;
	peut_declarer: boolean;
	est_creancier: boolean;
}

export interface ListeApports extends Liste<ApportResume> {
	total_promis: number;
	total_verse: number;
}

export interface ProjetDetail extends ProjetResume {
	secteur_id: number | null;
	ville_id: number | null;
	entreprise_id: number | null;
	entreprise: { id: number; nom: string } | null;
	auteur: Auteur | null;
	description_activite: string;
	description_projet: string;
	observation_gestionnaire: string;
	presentation_url: string | null;
	date_derniere_visite: string | null;
	telephone_promoteur: string | null;
	email_promoteur: string | null;
	adresse_promoteur: string | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_evaluer: boolean;
	peut_apporter: boolean;
	nombre_apports: number;
	mes_apports: ApportResume[];
	apports: ApportResume[] | null;
}

export interface CompteursProjets {
	projets: number;
	besoin_total: number;
	montant_promis: number;
	montant_collecte: number;
}

/** États d'un engagement (réinterprétation de l'état générique, ADR-0007 S4a). */
export const ETATS_APPORT: Record<number, string> = { 1: 'Promesse', 2: 'Validé', 3: 'Annulé', 4: 'Clôturé' };
