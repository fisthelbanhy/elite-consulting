/** Boutique bien-être : catalogue, panier produits, fiches bien-être (schémas `app/schemas/boutique.py`). */
import type { Liste } from '$lib/types';

export interface ProduitResume {
	id: number;
	reference: string;
	nom: string;
	description: string;
	groupe: number;
	prix_distributeur: number;
	prix_public: number;
	quantite_stock: number;
	nombre_visites: number;
	photo_url: string | null;
	/** Prix payé par le lecteur (distributeur → prix distributeur, sinon prix public). */
	prix: number;
}

export interface ProduitDetail extends ProduitResume {
	prix_non_distributeur: number;
	date_derniere_visite: string | null;
	distributeur: boolean;
}

export interface Catalogue extends Liste<ProduitResume> {
	distributeur: boolean;
}

export interface Groupe {
	groupe: number;
	libelle: string;
	nombre: number;
}

export interface ProduitPanier {
	id: number;
	reference: string;
	nom: string;
	quantite_stock: number;
	etat: number;
	photo_url: string | null;
}

export interface LignePanier {
	id: number;
	produit: ProduitPanier | null;
	quantite: number;
	prix_unitaire: number;
	date_ajout: string;
	bloquante: boolean;
	montant: number;
}

export interface Panier {
	lignes: LignePanier[];
	quantite_totale: number;
	total: number;
	payable: boolean;
	message: string | null;
	distributeur: boolean;
}

export interface LigneSuivi extends LignePanier {
	membre_id: number;
	membre: { id: number; pseudonyme: string; nom: string; telephone: string } | null;
	paye: boolean;
	date_paiement: string | null;
	paiement_id: number | null;
	etat_paiement: 1 | 2 | 3;
}

export interface ListeSuivi extends Liste<LigneSuivi> {
	somme: number;
}

export interface FicheBienEtre {
	id: number;
	libelle: string;
	description: string;
	nombre_produits: number;
}

export interface ProduitConseille {
	produit: ProduitResume;
	conseil_utilisation: string;
}

export interface FicheBienEtreDetail {
	id: number;
	libelle: string;
	description: string;
	produits: ProduitConseille[];
	distributeur: boolean;
}
