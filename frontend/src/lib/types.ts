/** Types partagés, alignés sur les schémas de l'API. */

export interface Option {
	value: number;
	label: string;
}

export type Enums = Record<string, Option[]>;

export interface Liste<T> {
	items: T[];
	total: number;
	page: number;
	taille: number;
}

export interface Ok {
	message: string;
	id?: number | null;
	reference?: string | null;
}

export interface Auteur {
	id: number;
	pseudonyme: string;
	categorie: number;
	photo_url: string | null;
}

export interface MembreMoi {
	id: number;
	type_compte: number;
	categorie: number;
	code_membre: string;
	nom: string;
	pseudonyme: string;
	sexe: number;
	telephone: string;
	email: string | null;
	ville_id: number | null;
	adresse: string;
	identifiant: string;
	etat: number;
	droit_attribution: boolean;
	droit_caisse: boolean;
	droit_activation: boolean;
	numero_piece_identite: string;
	employeur: string;
	situation_matrimoniale: number | null;
	nombre_enfants: number;
	forme_juridique: number | null;
	type_partenaire: number | null;
	domaine_activite_id: number | null;
	date_limite_master: string | null;
	point_caisse_actif: boolean;
	solde_point_caisse: number;
	date_dernier_pointage: string | null;
	photo_url: string | null;
	date_creation: string | null;
	est_gestionnaire: boolean;
	profil_complet: number;
}

export interface Parametres {
	nom_site: string;
	adresse: string;
	telephone_1: string;
	telephone_2: string;
	email: string;
	whatsapp: string;
	texte_aide: string;
	montant_minimum_placement: number;
	montant_minimum_course: number;
	commission_course: number;
	conditions_course: string;
	module_epargne_actif: boolean;
	module_sante_actif: boolean;
	[cle: `description_section_${number}`]: string;
}

export interface Ville {
	id: number;
	nom: string;
	quartiers: { id: number; nom: string }[];
}

export interface Secteur {
	id: number;
	libelle: string;
	domaines: { id: number; libelle: string }[];
}

/** Erreur renvoyée par l'API : `{message, champs}`. */
export interface ErreurApi {
	message: string;
	champs: Record<string, string>;
}
