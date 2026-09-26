/** Épargne solidaire — alignés sur `backend/app/schemas/epargne.py`. */
import type { Auteur, Liste } from '$lib/types';

export interface StatutEpargne {
	actif: boolean;
	message: string;
	don_minimum: number;
	placement_minimum: number;
	duree_min: number;
	duree_max: number;
}

export interface FondResume {
	id: number;
	reference: string;
	date_souscription: string | null;
	type_fond: number;
	montant: number;
	duree_mois: number;
	mode_paiement: number;
	confirme: number;
	etat: number;
	rapporteur_nom: string;
	souscripteur_nom: string;
	motivation: string;
}

export interface FondDetail extends FondResume {
	membre: Auteur | null;
	rapporteur: Auteur | null;
	souscripteur: Auteur | null;
	peut_payer: boolean;
	peut_modifier: boolean;
	peut_moderer: boolean;
	etat_paiement: number | null;
	date_paiement: string | null;
}

export interface MembreCourt {
	id: number;
	nom: string;
	pseudonyme: string;
}

export interface Pointage {
	id: number;
	reference: string;
	date_heure: string;
	operateur: MembreCourt | null;
	membre: MembreCourt;
	type_operation: number;
	montant: number;
	motif: string;
	solde_apres: number | null;
	type_caisse: number;
}

export interface ListePointages extends Liste<Pointage> {
	total_versements: number;
	total_retraits: number;
	net: number;
	rentabilite: number;
	encaisse: number | null;
	libelle_encaisse: string;
	afficher_solde: boolean;
	est_operateur: boolean;
	est_gestionnaire: boolean;
	mon_solde: number;
	date_dernier_pointage: string | null;
}

export interface Titulaire {
	id: number;
	nom: string;
	pseudonyme: string;
	photo_url: string | null;
}

export interface TitulaireDetail extends Titulaire {
	solde_point_caisse: number;
	date_dernier_pointage: string | null;
	point_caisse_actif: boolean;
	a_un_code: boolean;
}
