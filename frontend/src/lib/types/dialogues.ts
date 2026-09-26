import type { Auteur, Liste } from '$lib/types';

export interface MessageDialogue {
	id: number;
	type_dialogue: number;
	texte: string;
	date_message: string | null;
	auteur: Auteur | null;
	destinataire: Auteur | null;
	de_moi: boolean;
	de_la_frangine: boolean;
	a_la_frangine: boolean;
}

export interface Conversation {
	membre: Auteur;
	nombre: number;
	dernier_message: string;
	date_dernier: string | null;
	en_attente: boolean;
}

/** Données du fil « Écrire à la frangine » préparées par `chargerDialogue()`. */
export interface DonneesDialogue {
	type: number;
	messages: Liste<MessageDialogue>;
	conversations: Conversation[];
	/** Gestionnaire : membre dont le fil est ouvert (réponse adressée à ce membre). */
	fil: number | null;
	recherche: string;
	gestionnaire: boolean;
}
