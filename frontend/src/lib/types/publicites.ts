/** Types des publicités (schémas `app/schemas/publicites.py`). */

/** Genre du fichier réellement enregistré (la vignette suit le vrai type, F-TRV-47). */
export type GenrePublicite = 'image' | 'son' | 'video' | null;

export interface EntreprisePub {
	id: number;
	nom: string;
	nom_affiche: string;
}

export interface PubliciteDiffusee {
	id: number;
	texte: string;
	/** Texte sans balises ni entités HTML legacy, prêt à afficher (sauts de ligne conservés). */
	texte_affiche: string;
	lien: string;
	entreprise: EntreprisePub | null;
	annonceur: string | null;
	fichier_url: string | null;
	genre: GenrePublicite;
}

export interface PubliciteDetail extends PubliciteDiffusee {
	reference: string;
	date_debut: string | null;
	date_fin: string | null;
	type_fichier: number;
	etat: number;
	date_creation: string | null;
	en_diffusion: boolean;
	nombre_vues: number | null;
	date_derniere_vue: string | null;
	demandeur: { id: number; nom: string; pseudonyme: string } | null;
	peut_gerer: boolean;
	peut_moderer: boolean;
}

export interface PubliciteGestion {
	id: number;
	reference: string;
	demandeur_id: number | null;
	demandeur: { id: number; nom: string; pseudonyme: string } | null;
	entreprise_id: number | null;
	entreprise: EntreprisePub | null;
	objet: string;
	texte: string;
	texte_affiche: string;
	lien: string;
	date_debut: string | null;
	date_fin: string | null;
	type_fichier: number;
	nombre_vues: number;
	date_derniere_vue: string | null;
	etat: number;
	date_creation: string | null;
	en_diffusion: boolean;
	fichier_url: string | null;
	genre: GenrePublicite;
}

export interface ChoixPublicite {
	membres: { value: number; label: string }[];
	entreprises: { value: number; label: string }[];
}

/** Filtres de la liste de gestion (F-ADM-37) ; `vue` = « tableau » ou « cartes » (F-ADM-38). */
export type FiltresPublicites = Record<
	'q' | 'demandeur_id' | 'entreprise_id' | 'debut_du' | 'debut_au' | 'fin_du' | 'fin_au' | 'vues_min' | 'vues_max' | 'etat' | 'vue' | 'page',
	string
> & { en_diffusion: boolean };

/** Type déclaré (enums.TypeFichierPub) → genre attendu du fichier. */
export const GENRE_PAR_TYPE: Record<number, Exclude<GenrePublicite, null>> = { 1: 'image', 2: 'son', 3: 'video' };

export const ETATS_PUBLICITE: Record<number, string> = { 1: 'En attente', 2: 'Active', 3: 'Supprimée' };
