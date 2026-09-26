import type { Auteur } from '$lib/types';

/** Rubriques du forum : 1 Conseil financier, 2 Rumeurs économiques (« Actus & décryptages »). */
export type Rubrique = 1 | 2;

export interface SujetResume {
	id: number;
	rubrique: Rubrique;
	reference: string;
	objet: string;
	texte: string;
	confidentialite: 1 | 2;
	nombre_reponses: number;
	etat: number;
	date_creation: string | null;
	auteur: Auteur | null;
	repondu_par_conseiller: boolean;
}

export interface Reponse {
	id: number;
	texte: string;
	etat: number;
	date_creation: string | null;
	auteur: Auteur | null;
	de_la_frangine: boolean;
	peut_modifier: boolean;
}

export interface SujetDetail extends SujetResume {
	reponses: Reponse[];
	est_auteur: boolean;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_repondre: boolean;
	peut_cloturer: boolean;
}

export interface CompteursConseil {
	conseil: number;
	rumeurs: number;
	sujet_ouvert_conseil: number | null;
	sujet_ouvert_rumeurs: number | null;
}

export const RUBRIQUES: Record<Rubrique, { titre: string; court: string; description: string }> = {
	1: {
		titre: 'Conseil financier',
		court: 'Conseil financier',
		description: 'Posez votre question en privé : un conseiller vous répond.'
	},
	2: {
		titre: 'Actus & décryptages',
		court: 'Actus & décryptages',
		description: "L'actualité économique et financière, expliquée et discutée entre membres."
	}
};
