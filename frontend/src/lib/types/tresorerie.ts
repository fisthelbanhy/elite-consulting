import type { Auteur } from '$lib/types';

export interface BanqueCourte {
	id: number;
	sigle: string;
	nom: string;
}

interface Contexte {
	peut_modifier: boolean;
	peut_moderer: boolean;
	peut_annuler: boolean;
}

export interface CompteursTresorerie {
	placements: number;
	operations: number;
	credits: number;
	contentieux: number;
}

export interface PlacementResume {
	id: number;
	reference: string;
	date_placement: string | null;
	type_placement: number;
	montant: number;
	duree_mois: number;
	taux: number;
	etat: number;
	membre: Auteur | null;
	banques: BanqueCourte[];
}

export interface PlacementDetail extends PlacementResume, Contexte {
	secteur_activite: string;
	observation: string;
	banques_ids: number[];
}

export interface OperationResume {
	id: number;
	reference: string;
	date_saisie: string | null;
	date_operation: string | null;
	montant: number;
	devise: number;
	type_operation: number;
	beneficiaire: string;
	etat: number;
	membre: Auteur | null;
	sens: 'debit' | 'credit';
	nom_banque_emettrice: string;
	nom_banque_beneficiaire: string;
}

export interface OperationDetail extends OperationResume, Contexte {
	banque_emettrice_id: number | null;
	banque_emettrice_nom: string;
	banque_emettrice_email: string;
	banque_beneficiaire_id: number | null;
	banque_beneficiaire_nom: string;
	banque_beneficiaire_adresse: string;
	email_destinataire: boolean;
	lot: { id: number; date_operation: string | null; montant: number; devise: number; type_operation: number; beneficiaire: string }[];
}

export interface SyntheseLigne {
	sens: 'debit' | 'credit';
	devise: number;
	nombre: number;
	total: number;
}

export interface OperationsOk {
	message: string;
	id: number | null;
	reference: string | null;
	ids: number[];
	emails: number;
}

export interface CreditResume {
	id: number;
	reference: string;
	date_demande: string | null;
	montant: number;
	objet: string;
	duree_mois: number;
	niveau_realisation: number;
	garantie: string;
	etat: number;
	membre: Auteur | null;
}

export interface CreditDetail extends CreditResume, Contexte {
	delai_reponse_jours: number;
	observation: string;
	devis_global: string;
	apport_propre: string;
}

export interface ContentieuxResume {
	id: number;
	reference: string;
	date_dossier: string | null;
	dette_compromise: number;
	revenus_mensuels: number;
	charges_fixes: number;
	charges_variables: number;
	entrees_previsionnelles: number;
	echeance_supportable: number;
	etat: number;
	membre: Auteur | null;
}

export interface ContentieuxDetail extends ContentieuxResume, Contexte {
	dette_compromise_detail: string;
	revenus_journaliers: number;
	revenus_journaliers_detail: string;
	revenus_hebdomadaires: number;
	revenus_hebdomadaires_detail: string;
	revenus_mensuels_detail: string;
	charges_fixes_detail: string;
	charges_variables_detail: string;
	activites_en_cours: string;
	entrees_activite_en_cours: number;
	entrees_activite_en_cours_detail: string;
	activite_previsionnelle: string;
	entrees_previsionnelles_detail: string;
	entrees_totales: number;
	entrees_totales_detail: string;
	echeance_actuelle: string;
	echeance_supportable_detail: string;
	elements_favorables: string;
}

/** Sous-rubriques de trésorerie = type de dialogue (ADR-0007 T9). */
export type CleRubrique = 'placements' | 'operations' | 'credits' | 'contentieux';

export const RUBRIQUES_TRESORERIE: Record<CleRubrique, { type: 1 | 2 | 3 | 4; titre: string; nouveau: string; description: string }> = {
	placements: {
		type: 1,
		titre: 'Placements',
		nouveau: 'Nouveau placement',
		description: 'Dépôt à terme ou investissement : comparez les propositions des banques.'
	},
	operations: {
		type: 2,
		titre: 'Opérations bancaires',
		nouveau: 'Nouvelle opération',
		description: 'Programmez vos virements : votre banque reçoit l’ordre par e-mail.'
	},
	credits: {
		type: 3,
		titre: 'Demandes de crédit',
		nouveau: 'Nouvelle demande de crédit',
		description: 'Présentez votre besoin une fois, nous le portons auprès des banques.'
	},
	contentieux: {
		type: 4,
		titre: 'Contentieux',
		nouveau: 'Nouveau dossier',
		description: 'Crédit en difficulté : préparons ensemble une restructuration.'
	}
};

/** États d'une fiche de trésorerie (libellés adaptés au contexte). */
export const ETATS_TRESORERIE: Record<number, string> = { 1: 'En attente', 2: 'Enregistrée', 3: 'Annulée', 4: 'Traitée' };
