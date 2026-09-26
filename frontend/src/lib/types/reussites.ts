/** Réussites entrepreneuriales (API `/reussites`). */

export interface AuteurReussite {
	id: number;
	pseudonyme: string;
	photo_url: string | null;
}

export interface ReussiteResume {
	id: number;
	reference: string;
	projet: string;
	succes: string;
	conseil: string;
	situation_avant: string;
	/** Libellé du secteur d'activité */
	secteur: string | null;
	secteur_id: number | null;
	auteur: AuteurReussite;
	photo_url: string | null;
	etat: number;
	date_creation: string | null;
}

export interface ReussiteDetail extends ReussiteResume {
	vision: string;
	fond_demarrage: number;
	besoin_reel_demarrage: number;
	strategie: string;
	difficultes: string;
	deploiement_efforts: string;
	est_auteur: boolean;
	peut_modifier: boolean;
	peut_moderer: boolean;
}
