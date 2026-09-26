/** Types du domaine « communication » : contact et suggestions (schémas `app/schemas/contact.py`,
 * `app/schemas/suggestions.py`). */

export interface ContactMessage {
	id: number;
	membre_id: number | null;
	membre: { id: number; pseudonyme: string; type_compte: number } | null;
	nom: string;
	email: string;
	telephone: string;
	objet: string;
	texte: string;
	date_envoi: string;
	reponse: string;
	date_reponse: string | null;
	/** 1 à traiter, 2 traité, 3 supprimé */
	etat: number;
	repondu: boolean;
}

export interface ContactDetail extends ContactMessage {
	peut_repondre: boolean;
}

export interface Suggestion {
	id: number;
	date: string;
	module: number;
	texte: string;
	/** 1 à lire, 2 prise en compte, 3 supprimée */
	etat: number;
}

/** Libellés d'état propres au suivi des messages de contact (l'état ne publie rien). */
export const ETATS_CONTACT: Record<number, string> = { 1: 'À traiter', 2: 'Traité', 3: 'Supprimé' };

/** Libellés d'état des suggestions. */
export const ETATS_SUGGESTION: Record<number, string> = { 1: 'À lire', 2: 'Prise en compte', 3: 'Supprimée' };
