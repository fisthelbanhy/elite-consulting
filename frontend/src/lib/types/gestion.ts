/** Types du back-office « Gestion », alignés sur `app/schemas/gestion*.py`. */
import type { Liste } from '$lib/types';

export interface MembreCourt {
	id: number;
	pseudonyme: string;
	nom: string;
}

export interface VilleCourte {
	id: number;
	nom: string;
}

export interface Compteurs {
	nouveaux_membres: number;
	paiements_en_attente: number;
	fiches_en_attente: number;
	reinitialisations_en_attente: number;
	messages_non_lus: number;
	contacts_a_traiter: number;
}

export interface CompteurModule {
	cle: string;
	libelle: string;
	total: number;
}

export interface PointSerie {
	jour: string;
	visites: number;
	connexions: number;
}

export interface Inscrit {
	id: number;
	nom: string;
	pseudonyme: string;
	categorie: number;
	type_compte: number;
	etat: number;
	date_creation: string | null;
	ville: VilleCourte | null;
	photo_url: string | null;
}

export interface TableauDeBord extends Compteurs {
	membres: number;
	membres_en_ligne: number;
	montant_en_attente: number;
	suggestions_a_lire: number;
	courses_en_attente: number;
	modules_en_attente: CompteurModule[];
	visites_7j: number;
	visites_30j: number;
	connexions_7j: number;
	connexions_30j: number;
	serie: PointSerie[];
	derniers_inscrits: Inscrit[];
	droits: { attribution: boolean; caisse: boolean; activation: boolean };
}

export interface MembreLigne {
	id: number;
	type_compte: number;
	categorie: number;
	code_membre: string;
	nom: string;
	pseudonyme: string;
	telephone: string;
	email: string | null;
	ville: VilleCourte | null;
	etat: number;
	date_creation: string | null;
	derniere_connexion: string | null;
	droit_attribution: boolean;
	droit_caisse: boolean;
	droit_activation: boolean;
	point_caisse_actif: boolean;
	photo_url: string | null;
}

export interface MembreDetail extends MembreLigne {
	sexe: number;
	identifiant: string;
	adresse: string;
	observation: string;
	ville_id: number | null;
	numero_piece_identite: string;
	employeur: string;
	situation_matrimoniale: number | null;
	nombre_enfants: number;
	forme_juridique: number | null;
	type_partenaire: number | null;
	domaine_activite_id: number | null;
	date_limite_master: string | null;
	solde_point_caisse: number;
	date_dernier_pointage: string | null;
	derniere_activite: string | null;
	domaine_libelle: string | null;
	a_code_pointage: boolean;
	en_ligne: boolean;
	nombre_connexions: number;
	nombre_paiements: number;
	paiements_en_attente: number;
	demandes_reinitialisation: { id: number; canal: string; date_creation: string }[];
	est_moi: boolean;
	peut_modifier: boolean;
	peut_attribuer: boolean;
}

export interface LienReinitialisation {
	message: string;
	id: number | null;
	chemin: string;
	lien: string;
	expire: string;
	membre: MembreCourt;
	telephone: string;
	message_whatsapp: string;
}

export interface MembreCree {
	message: string;
	id: number;
	reference: string | null;
	activation: LienReinitialisation | null;
}

export interface CodePointage {
	message: string;
	id?: number | null;
	code: string;
}

export interface OptionMembre {
	value: number;
	label: string;
}

export type StatutReinitialisation = 'en_attente' | 'prise_en_charge' | 'ignoree' | 'lien_actif' | 'utilise' | 'expire';

export interface ReinitialisationLigne {
	id: number;
	canal: string;
	date_creation: string;
	date_expiration: string | null;
	date_utilisation: string | null;
	membre: MembreCourt & { telephone: string; email: string | null; categorie: number };
	traitee_par: string | null;
	statut: StatutReinitialisation;
}

export interface VisiteLigne {
	id: number;
	date_heure: string;
	adresse_ip: string;
	membre: MembreCourt | null;
}

export interface ConnexionLigne {
	id: number;
	date_connexion: string;
	adresse_ip: string;
	membre: MembreCourt | null;
}

export interface ElementModeration {
	module: string;
	module_libelle: string;
	id: number;
	reference: string;
	titre: string;
	auteur_id: number | null;
	auteur_pseudonyme: string | null;
	date: string | null;
	lien: string;
}

export interface FileModeration extends Liste<ElementModeration> {
	modules: CompteurModule[];
}

export interface ParametresGestion {
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
	description_section_1: string;
	description_section_2: string;
	description_section_3: string;
	description_section_4: string;
	description_section_5: string;
	description_section_6: string;
	description_section_7: string;
	module_epargne_actif: boolean;
	module_sante_actif: boolean;
}

/** Paiement de la caisse (`GET /api/paiements`, droit Caisse). */
export interface PaiementCaisse {
	id: number;
	type_objet: number;
	objet_id: number | null;
	date_paiement: string;
	mode: number;
	montant: number;
	remarque: string;
	etat: number;
	date_confirmation: string | null;
	membre: MembreCourt | null;
}

export interface ListePaiements extends Liste<PaiementCaisse> {
	somme: number;
}

// --- Référentiels ------------------------------------------------------------------------------

export interface ResumeReferentiel {
	cle: string;
	libelle: string;
	total: number;
}

export interface ProduitGestion {
	id: number;
	reference: string;
	nom: string;
	description: string;
	groupe: number;
	prix_distributeur: number;
	prix_non_distributeur: number;
	prix_public: number;
	quantite_stock: number;
	etat: number;
	photo_url: string | null;
}

export interface ConseilProduit {
	id: number;
	produit_id: number;
	produit: { id: number; nom: string; reference: string; groupe: number; etat: number } | null;
	posologie: string;
	ordre: number;
}

export interface MaladieGestion {
	id: number;
	libelle: string;
	description: string;
	etat: number;
	nombre_produits: number;
}

export interface MaladieDetail extends MaladieGestion {
	produits: ConseilProduit[];
}

/** Ligne générique d'un référentiel simple (villes, quartiers, secteurs…). */
export type LigneReferentiel = { id: number } & Record<string, unknown>;
