/**
 * Schémas et vues du module Emplois (portage de `app/schemas/emplois.py`).
 * Module de référence : les autres suivent cette structure (voir docs/CONVENTIONS.md).
 */
import { z } from 'zod';
import type { annonceEmploi } from '../schema/rh.js';
import type { interet } from '../schema/rh.js';
import type { Membre } from '../schema/membres.js';
import { auteur, type Auteur } from './commun.js';
import { url } from '../services/fichiers.js';
import { normaliserTelephone, telephoneValide, MESSAGE_TELEPHONE } from '../services/validation.js';

export type Annonce = typeof annonceEmploi.$inferSelect;
export type Interet = typeof interet.$inferSelect;

export interface Domaine {
	id: number;
	libelle: string;
}

export interface AnnonceResume {
	id: number;
	type_annonce: number;
	reference: string;
	domaine: Domaine | null;
	poste_a_pourvoir: string;
	diplomes: string;
	competences: string;
	sexe: number;
	date_naissance: Date | null;
	etat: number;
	date_creation: Date | null;
	nombre_visites: number;
	photo: string | null;
	photo_url: string | null;
}

/** Coordonnées d'un membre, visibles seulement de l'auteur de la fiche et des gestionnaires. */
export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

export interface InteretOut {
	id: number;
	sous_type: number;
	message: string;
	date_creation: Date;
	membre: ContactMembre | null;
}

export interface AnnonceDetail extends AnnonceResume {
	secteur_id: number | null;
	domaine_id: number | null;
	experience: string;
	savoir_faire: string;
	autres_informations: string;
	date_derniere_visite: Date | null;
	auteur: Auteur | null;
	cv: string | null;
	cv_url: string | null;
	// Renseignés seulement pour l'auteur et les gestionnaires (ADR-0007 S2c).
	nom: string | null;
	prenom: string | null;
	adresse: string | null;
	telephone: string | null;
	email: string | null;
	// Contexte du lecteur.
	peut_modifier: boolean;
	peut_moderer: boolean;
	mon_interet: boolean;
	interets: InteretOut[] | null;
}

export function vueResume(a: Annonce, domaine: Domaine | null): AnnonceResume {
	return {
		id: a.id,
		type_annonce: a.type_annonce,
		reference: a.reference,
		domaine,
		poste_a_pourvoir: a.poste_a_pourvoir,
		diplomes: a.diplomes,
		competences: a.competences,
		sexe: a.sexe,
		date_naissance: a.date_naissance,
		etat: a.etat,
		date_creation: a.date_creation,
		nombre_visites: a.nombre_visites,
		photo: a.photo,
		photo_url: url(a.photo)
	};
}

export interface ContexteDetail {
	domaine: Domaine | null;
	auteurFiche: Membre | null;
	/** Vrai pour l'auteur de la fiche et les gestionnaires. */
	proprietaire: boolean;
	peutModifier: boolean;
	peutModerer: boolean;
	monInteret: boolean;
	interets: InteretOut[] | null;
}

export function vueDetail(a: Annonce, contexte: ContexteDetail): AnnonceDetail {
	const { proprietaire } = contexte;
	return {
		...vueResume(a, contexte.domaine),
		secteur_id: a.secteur_id,
		domaine_id: a.domaine_id,
		experience: a.experience,
		savoir_faire: a.savoir_faire,
		autres_informations: a.autres_informations,
		date_derniere_visite: a.date_derniere_visite,
		auteur: auteur(contexte.auteurFiche),
		cv: a.cv,
		cv_url: url(a.cv),
		// Identité et coordonnées du candidat : auteur et gestionnaires seulement (ADR-0007 S2c).
		nom: proprietaire ? a.nom : null,
		prenom: proprietaire ? a.prenom : null,
		adresse: proprietaire ? a.adresse : null,
		telephone: proprietaire ? a.telephone : null,
		email: proprietaire ? a.email : null,
		peut_modifier: contexte.peutModifier,
		peut_moderer: contexte.peutModerer,
		mon_interet: contexte.monInteret,
		interets: contexte.interets
	};
}

// --- Entrées ---------------------------------------------------------------------------------

/** Téléphone facultatif ici (l'obligation dépend du type d'annonce, voir le routeur). */
const telephoneFacultatif = z
	.string()
	.default('')
	.transform((v) => normaliserTelephone(v))
	.refine((v) => telephoneValide(v), { message: MESSAGE_TELEPHONE });

const emailFacultatif = z
	.union([z.literal(''), z.null(), z.email()])
	.optional()
	.transform((v) => (v ? v : null));

export const annonceEntreeSchema = z.object({
	type_annonce: z.coerce.number().int().min(1).max(2),
	domaine_id: z.coerce.number().int().nullable().optional(),
	nom: z.string().default(''),
	prenom: z.string().default(''),
	sexe: z.coerce.number().int().nullable().optional(),
	date_naissance: z
		.union([z.literal(''), z.null(), z.iso.date()])
		.optional()
		.transform((v) => (v ? new Date(`${v}T00:00:00`) : null)),
	adresse: z.string().default(''),
	telephone: telephoneFacultatif,
	email: emailFacultatif,
	poste_a_pourvoir: z.string().default(''),
	diplomes: z.string().default(''),
	competences: z.string().default(''),
	experience: z.string().default(''),
	autres_informations: z.string().default('')
});

export type AnnonceEntree = z.output<typeof annonceEntreeSchema>;

export const interetEntreeSchema = z.object({
	message: z.string().max(2000).default('')
});

export const etatEntreeSchema = z.object({
	etat: z.coerce.number().int().min(1).max(4)
});

export interface Compteurs {
	demandes: number;
	offres: number;
}
