/** Découverte de soi (API `/decouverte`) et diagnostic gratuit. */

export interface ReponsesQuestionnaire {
	activite_actuelle: string;
	savoir_faire: string;
	activite_quotidienne: string;
	secret_a_partager: string;
	origine_idee: string;
	idee_vue_chez_autrui: number;
	participation_idee_tierce: string;
	est_sociable: number;
	interet_pour_autrui: number;
	a_deja_fait_commerce: number;
	se_fait_des_amis: number;
	garde_ses_relations: number;
	percu_comme_ouvert: number;
	perception_par_autrui: string;
	est_meneur: number;
	prefere_entourage: number;
	a_des_amis_proches: number;
	entourage_valorise_activite: number;
	entourage_proche: string;
	personnes_consideration: string;
	motivation: string;
	pourcentage_implication: number;
	moyens_disponibles: string;
	soutien_conjoint: number;
	origine_soutien: string;
	confronte_aux_faits: number;
	notes_membre: string;
}

export type ChampQuestionnaire = keyof ReponsesQuestionnaire;

export interface MembreFiche {
	id: number;
	nom: string;
	pseudonyme: string;
	sexe: number;
	photo_url: string | null;
}

export interface FicheResume {
	id: number;
	reference: string;
	date_creation: string | null;
	etat: number;
	/** « État fiche » legacy : 1 à étudier, 2 suivie */
	etat_fiche: number;
	/** 1 = clôturée, 2 = ouverte */
	cloturee: number;
	pourcentage_implication: number;
	date_diagnostic: string | null;
	membre: MembreFiche;
}

export interface FicheDetail extends FicheResume, ReponsesQuestionnaire {
	notes_conseillere: string;
	diagnostic: DiagnosticEnregistre | null;
	est_proprietaire: boolean;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_repondre: boolean;
}

// --- Diagnostic -------------------------------------------------------------------------------

export interface OptionDiagnostic {
	code: string;
	libelle: string;
	description: string | null;
}

export interface QuestionDiagnostic {
	cle: string;
	question: string;
	aide: string | null;
	options: OptionDiagnostic[];
}

/** Réponses en cours (codes), conservées dans un cookie signé. */
export type ReponsesDiagnostic = Record<string, string>;

export interface Restitution {
	profil: { titre: string; texte: string };
	forces: string[];
	attentions: string[];
	etapes: { titre: string; texte: string; href: string }[];
	reponses: { question: string; reponse: string }[];
	resume: string;
}

export interface DiagnosticEnregistre extends Restitution {
	version: number;
	codes: ReponsesDiagnostic;
}
