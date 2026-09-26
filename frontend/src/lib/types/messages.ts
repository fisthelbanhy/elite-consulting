/** Types de la messagerie privée membre ↔ la frangine (schémas `app/schemas/messages.py`). */

export interface MessageFil {
	id: number;
	texte: string;
	date_message: string;
	de_la_frangine: boolean;
	/** État de lecture avant l'ouverture du fil : `false` = nouveau message. */
	lu: boolean;
	/** Gestionnaire auteur de la réponse (vue gestion seulement). */
	auteur: { id: number; pseudonyme: string } | null;
}

export interface FilMembre {
	messages: MessageFil[];
	non_lus: number;
	frangine_en_ligne: boolean;
}

export interface MembreFil {
	id: number;
	nom: string;
	pseudonyme: string;
	telephone: string;
	email: string | null;
	categorie: number;
	photo_url: string | null;
	derniere_activite: string | null;
	en_ligne: boolean;
}

export interface FilResume {
	membre: MembreFil;
	total: number;
	non_lus: number;
	dernier_message: MessageFil | null;
}

export interface FilGestion {
	membre: MembreFil;
	messages: MessageFil[];
	non_lus: number;
}
