/** Likelemba (tontines) — alignés sur `api/src/routes/likelemba.ts`. */
import type { Auteur } from '$lib/types';

export interface GroupeResume {
	id: number;
	code: string;
	responsable: Auteur | null;
	montant_cotisation: number;
	periodicite: number;
	date_debut: string | null;
	observation: string;
	compteur_entrees: number;
	etat: number;
	nombre_adherents: number;
	est_responsable: boolean;
	mon_adhesion_id: number | null;
}

export interface GroupeCourt {
	id: number;
	code: string;
	montant_cotisation: number;
	periodicite: number;
	responsable_id: number | null;
	etat: number;
}

export interface AdhesionResume {
	id: number;
	code: string;
	membre: Auteur | null;
	date_entree: string | null;
	etat: number;
	ordre: number | null;
}

export interface Echeance {
	tour: number;
	date: string | null;
	beneficiaire: string;
	adhesion_id: number;
	passee: boolean;
}

export interface Cotisation {
	id: number;
	numero_recu: string;
	date_paiement: string | null;
	montant: number;
	mode_paiement: number;
	etat: number;
	adhesion_id: number | null;
	adherent: string;
	code_adherent: string;
	nom_caissier: string;
	observation: string | null;
	recu_valide: boolean;
	peut_valider: boolean;
}

export interface GroupeDetail extends GroupeResume {
	adhesions: AdhesionResume[];
	calendrier: Echeance[];
	cagnotte: number;
	cotisations: Cotisation[] | null;
	total_cotisations: number | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_gerer: boolean;
	peut_adherer: boolean;
}

export interface Temoin {
	nom: string;
	telephone: string;
	emploi: string;
	est_membre: boolean;
}

export interface AdhesionDetail extends AdhesionResume {
	groupe: GroupeCourt;
	observation: string;
	caution_nom: string;
	caution_est_membre: boolean;
	caution_piece_identite: string;
	caution_adresse: string;
	caution_activite: string;
	caution_telephone: string;
	temoins: Temoin[];
	cotisations: Cotisation[];
	total_cotisations: number;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_cotiser: boolean;
}

export interface MembreChoix {
	id: number;
	pseudonyme: string;
	nom: string;
}

export interface MesAdhesions {
	id: number;
	code: string;
	etat: number;
	date_entree: string | null;
	groupe: GroupeCourt;
}

/** États d'une cotisation (1 en attente de confirmation, 2 validée, 3 annulée). */
export const ETATS_COTISATION: Record<number, string> = { 1: 'En attente', 2: 'Validée', 3: 'Annulée', 4: 'Clôturée' };
