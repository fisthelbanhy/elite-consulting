/** Devenir distributeur : souscription et suivi (schémas `app/schemas/distributeur.py`). */

export interface MembreSouscripteur {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface SouscriptionResume {
	id: number;
	reference: string;
	date_creation: string | null;
	/** ModeSouscription : 0 non choisi, 1 fonds propres, 2 crédit. */
	mode_souscription: number;
	montant: number;
	/** 1 à 9 : étape atteinte (blocs de `$arrayetapeadhesion`) ; 10 : souscription envoyée. */
	etape_courante: number;
	etat: number;
	membre: MembreSouscripteur | null;
	/** EtatPaiement du dernier paiement (null = aucun). */
	etat_paiement: number | null;
	envoyee: boolean;
}

export interface Formation {
	prestation: number;
	date: string;
	lieu: string;
	heure: string;
}

export interface Filleul {
	nom: string;
	email: string;
	adresse: string;
	montant: number;
	date_presentation: string;
}

export interface Prospect {
	id: number;
	nom_prenom: string;
	telephone: string;
	email: string;
	commentaire: string;
}

export interface LigneKit {
	produit_id: number;
	nom: string;
	prix_unitaire: number;
	quantite: number;
	montant: number;
}

export interface SouscriptionDetail extends SouscriptionResume {
	objectifs: string;
	mon_histoire: string;
	disponibilite_hebdo: number;
	formations: Formation[];
	nombre_rdv: number;
	filleuls: Filleul[];
	date_limite_complement: string | null;
	prospects: Prospect[];
	kit: LigneKit[];
	peut_moderer: boolean;
}

export interface ProduitKit {
	id: number;
	reference: string;
	nom: string;
	groupe: number;
	prix_distributeur: number;
	photo_url: string | null;
}

export interface Statut {
	connecte: boolean;
	gestionnaire: boolean;
	distributeur: boolean;
	souscription: SouscriptionResume | null;
}

export interface EtapeOk {
	message: string;
	id: number;
	reference: string;
	etape_courante: number;
	a_payer: boolean;
	montant: number;
}
