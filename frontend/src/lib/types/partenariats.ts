/** Partenariat & troc (schémas `app/schemas/partenariats.py`). */
import type { Auteur } from '$lib/types';

export interface PartenariatResume {
	id: number;
	reference: string;
	/** Ce que j'ai. */
	actif: string;
	description: string;
	/** Ce que je cherche. */
	recherche: string;
	objectif: string;
	etat: number;
	date_creation: string | null;
	auteur: Auteur | null;
}

export interface InteretPartenariat {
	id: number;
	message: string;
	date_creation: string;
	membre: { id: number; pseudonyme: string; nom: string; telephone: string; email: string | null } | null;
}

export interface PartenariatDetail extends PartenariatResume {
	peut_modifier: boolean;
	peut_moderer: boolean;
	mon_interet: boolean;
	interets: InteretPartenariat[] | null;
	nombre_interets: number;
}
