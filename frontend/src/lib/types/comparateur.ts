/** Comparateur de prix B2B — aligné sur `api/src/routes/comparateur.ts`. */
import type { EntrepriseOption, VilleCourte } from '$lib/types/entreprises';

export type MotifRefus = 'visiteur' | 'personne_physique' | 'sans_entreprise';

export interface Acces {
	acces: boolean;
	motif: MotifRefus | null;
	message: string | null;
	gestionnaire: boolean;
	entreprises: EntrepriseOption[];
}

export interface Produit {
	id: number;
	nom: string;
	etat: number;
	offres: number;
	demandes: number;
}

export interface Ligne {
	id: number;
	/** 1 Offre (je vends), 2 Demande (j'achète) */
	offre_ou_demande: 1 | 2;
	produit: { id: number; nom: string };
	unite_vente: string;
	prix: number;
	quantite_mensuelle: number;
	fournisseur_ou_client: string;
}

export interface EntrepriseContact {
	id: number;
	nom: string;
	forme_juridique: number;
	telephone: string;
	email: string;
	ville: VilleCourte | null;
	logo_url: string | null;
}

export interface LigneComparee extends Ligne {
	entreprise: EntrepriseContact;
}

export interface EnTeteFiche {
	id: number;
	reference: string;
	nom: string;
	forme_juridique: number;
	adresse: string;
	telephone: string;
	email: string;
	site_web: string;
	ville: VilleCourte | null;
	logo_url: string | null;
}

export interface FicheDetail {
	entreprise: EnTeteFiche;
	sigle: string;
	fiche_id: number | null;
	offres: Ligne[];
	demandes: Ligne[];
	entreprises: EntrepriseOption[];
	peut_modifier: boolean;
}
