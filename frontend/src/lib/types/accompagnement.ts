import type { Auteur } from '$lib/types';

export interface Question {
	zone: number;
	libelle: string;
	aide: string;
}

export interface Groupe {
	/** Sous-section legacy (questions affichées en retrait), ou null. */
	titre: string | null;
	questions: Question[];
}

export interface Section {
	numero: number;
	titre: string;
	groupes: Groupe[];
}

export interface Questionnaire {
	type: number;
	slug: string;
	libelle: string;
	prefixe: string;
	accroche: string;
	description: string;
	pour_qui: string;
	nombre_questions: number;
	sections: Section[];
}

export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface DossierResume {
	id: number;
	type_dossier: number;
	reference: string;
	objet: string;
	date_creation: string | null;
	etat: number;
	membre: Auteur | null;
	nombre_questions: number;
	nombre_repondues: number;
}

export interface DossierDetail extends DossierResume {
	reponses: Record<string, string>;
	contact: ContactMembre | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
}

export interface CompteursAccompagnement {
	par_type: Record<string, number>;
	total: number;
}

/** États d'un dossier : 1 brouillon, 2 envoyé, 3 supprimé, 4 traité. */
export const ETATS_DOSSIER: Record<number, string> = {
	1: 'Brouillon',
	2: 'Envoyé au conseiller',
	3: 'Supprimé',
	4: 'Traité'
};
