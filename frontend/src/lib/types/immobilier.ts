/** Types de l'immobilier, alignés sur `backend/app/schemas/immobilier.py`. */
import type { Auteur } from '$lib/types';

export interface QuartierBien {
	id: number;
	nom: string;
	ville: { id: number; nom: string } | null;
}

export interface BienResume {
	id: number;
	reference: string;
	offre_ou_recherche: 1 | 2;
	type_transaction: number;
	type_bien: number;
	quartier: QuartierBien | null;
	surface_m2: number;
	nombre_pieces: number;
	nombre_chambres: number;
	situation: number;
	prix: number;
	description: string;
	etat: number;
	date_creation: string | null;
	nombre_visites: number;
	date_derniere_visite: string | null;
	photo_url: string | null;
}

/** Coordonnées d'un membre : visibles de l'auteur de la fiche et des gestionnaires seulement. */
export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface InteretRecu {
	id: number;
	sous_type: number;
	message: string;
	date_creation: string;
	membre: ContactMembre | null;
}

export interface BienDetail extends BienResume {
	quartier_id: number | null;
	auteur: Auteur | null;
	localisation: string | null;
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_manifester: boolean;
	mon_interet: boolean;
	interets: InteretRecu[] | null;
}

export interface CompteursOffres {
	offres: number;
	recherches: number;
	total: number;
}

export interface Encarts<T> {
	nouveautes: T[];
	plus_visites: T[];
}
