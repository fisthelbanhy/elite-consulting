/** Annuaire des entreprises — aligné sur `api/src/routes/entreprises.ts`. */
import type { Auteur } from '$lib/types';

export interface Libelle {
	id: number;
	libelle: string;
}

export interface VilleCourte {
	id: number;
	nom: string;
}

export interface DomaineEtSecteur extends Libelle {
	secteur: Libelle | null;
}

export interface EntrepriseResume {
	id: number;
	reference: string;
	nom: string;
	forme_juridique: number;
	description: string;
	domaine: DomaineEtSecteur | null;
	ville: VilleCourte | null;
	etat: number;
	date_creation: string | null;
	nombre_visites: number;
	logo_url: string | null;
}

export interface EntrepriseDetail extends EntrepriseResume {
	domaine_id: number | null;
	ville_id: number | null;
	capital_social: number;
	gerant: string;
	telephone: string;
	email: string;
	site_web: string;
	adresse: string;
	date_derniere_visite: string | null;
	auteur: Auteur | null;
	comparateur: { offres: number; demandes: number };
	peut_modifier: boolean;
	peut_moderer: boolean;
}

/** Entreprise du membre connecté (`GET /entreprises/miennes`). */
export interface EntrepriseOption {
	id: number;
	reference: string;
	nom: string;
	forme_juridique: number;
	etat: number;
	logo_url: string | null;
}

/** Valeurs de départ du formulaire de création (`GET /entreprises/modele`). */
export interface EntrepriseModele {
	nom: string;
	domaine_id: number | null;
	forme_juridique: number | null;
	telephone: string;
	email: string;
	adresse: string;
	ville_id: number | null;
	personne_morale: boolean;
}
