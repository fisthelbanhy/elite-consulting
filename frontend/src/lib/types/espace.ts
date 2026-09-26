/** Types de « Mon espace », alignés sur `app/schemas/espace.py`. */

export interface ProfilResume {
	id: number;
	pseudonyme: string;
	nom: string;
	categorie: number;
	type_compte: number;
	etat: number;
	code_membre: string;
	photo_url: string | null;
	profil_complet: number;
	champs_manquants: string[];
	date_creation: string | null;
	date_limite_master: string | null;
	point_caisse_actif: boolean;
	solde_point_caisse: number;
	date_dernier_pointage: string | null;
	a_code_pointage: boolean;
}

export interface FicheCourte {
	id: number;
	titre: string;
	reference: string;
	statut: string;
	etat: number | null;
	date: string | null;
	lien: string;
}

export interface ModuleEspace {
	cle: string;
	libelle: string;
	total: number;
	lien_liste: string;
	lien_nouveau: string | null;
	fiches: FicheCourte[];
}

export interface PaiementCourt {
	id: number;
	type_objet: number;
	objet_id: number | null;
	date_paiement: string;
	mode: number;
	montant: number;
	remarque: string;
	etat: number;
}

export interface TableauEspace {
	profil: ProfilResume;
	modules: ModuleEspace[];
	paiements: PaiementCourt[];
	paiements_en_attente: number;
	messages_non_lus: number;
}

/** `GET /api/paiements/miens`. */
export interface PaiementMien extends PaiementCourt {
	date_confirmation: string | null;
}
