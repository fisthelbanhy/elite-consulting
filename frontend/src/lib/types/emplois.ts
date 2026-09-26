import type { Auteur } from '$lib/types';

export interface AnnonceResume {
	id: number;
	type_annonce: 1 | 2;
	reference: string;
	domaine: { id: number; libelle: string } | null;
	poste_a_pourvoir: string;
	diplomes: string;
	competences: string;
	sexe: number;
	date_naissance: string | null;
	etat: number;
	date_creation: string | null;
	nombre_visites: number;
	photo_url: string | null;
}

export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface Interet {
	id: number;
	sous_type: number;
	message: string;
	date_creation: string;
	membre: ContactMembre | null;
}

export interface AnnonceDetail extends AnnonceResume {
	secteur_id: number | null;
	domaine_id: number | null;
	experience: string;
	savoir_faire: string;
	autres_informations: string;
	date_derniere_visite: string | null;
	auteur: Auteur | null;
	cv_url: string | null;
	nom: string | null;
	prenom: string | null;
	adresse: string | null;
	telephone: string | null;
	email: string | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
	mon_interet: boolean;
	interets: Interet[] | null;
}
