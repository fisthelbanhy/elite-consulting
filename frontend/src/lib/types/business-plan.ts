/** Business plan « auto-diagnostic » (schémas `app/schemas/business_plan.py`). */

export interface MembreBP {
	id: number;
	pseudonyme: string;
	nom: string;
	sexe: number;
	photo_url: string | null;
}

export interface BusinessPlanResume {
	id: number;
	reference: string;
	date_creation: string | null;
	type_activite: string;
	description_projet: string;
	niveau_realisation: number;
	/** 1 brouillon (non traité), 2 envoyé, 3 supprimé, 4 clôturé. */
	etat: number;
	membre: MembreBP | null;
}

export interface BusinessPlanDetail extends BusinessPlanResume {
	moyens_actuels: string;
	ressources_disponibles: string;
	possessions: string;
	organisation_actuelle: string;
	organisation_souhaitee: string;
	detail_besoin: string;
	apport_actuel: string;
	ambition: string;
	strategie_resultats: string;
	valeur_ajoutee: string;
	prevision_ca_benefice: string;
	processus_activite: string;
	estimation_charges: string;
	composantes_ca: string;
	repartition_ca: string;
	elements_environnementaux: string;
	strategie_attaque: string;
	devis_chiffre_besoin: string;
	apport_prevu: string;
	difficultes_realisation: string;
	planning_execution: string;
	difficultes_futures: string;
	peut_modifier: boolean;
	peut_moderer: boolean;
}
