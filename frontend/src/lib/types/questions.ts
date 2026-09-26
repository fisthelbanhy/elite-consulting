/** Forum « Questions & conseils » (API `/questions`). */
import type { Auteur } from '$lib/types';

export interface SujetResume {
	id: number;
	reference: string;
	objet: string;
	extrait: string;
	/** 1 = Privé (membre ↔ la frangine), 2 = Public */
	confidentialite: 1 | 2;
	etat: number;
	nombre_reponses: number;
	date_creation: string | null;
	auteur: Auteur | null;
	/** Nom réel : gestionnaire, auteur, Master pour un sujet public */
	auteur_nom: string | null;
}

export interface Reponse {
	id: number;
	texte: string;
	etat: number;
	date_creation: string | null;
	auteur: Auteur | null;
	auteur_nom: string | null;
	de_la_frangine: boolean;
	peut_modifier: boolean;
}

export interface SujetDetail extends SujetResume {
	texte: string;
	reponses: Reponse[];
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_repondre: boolean;
	est_auteur: boolean;
}
