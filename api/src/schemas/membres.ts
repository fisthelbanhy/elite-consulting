/**
 * Schémas et vues du domaine « membre » (portage de `app/schemas/membres.py`).
 * Mêmes contraintes et mêmes messages d'erreur en français que l'ancien backend.
 */
import { z } from 'zod';
import type { VerificationsCroisees } from './commun.js';
import { CategorieMembre, Sexe, TypeMembre } from '../enums.js';
import type { Membre } from '../schema/membres.js';
import { url } from '../services/fichiers.js';
import { normaliserTelephone, telephoneValide, MESSAGE_TELEPHONE } from '../services/validation.js';

export const connexionSchema = z.object({
	identifiant: z.string().min(1).max(120),
	mot_de_passe: z.string().min(1).max(200)
});

/** Téléphone obligatoire, normalisé et validé comme le faisait `verifier_telephone`. */
const telephoneObligatoire = z
	.string()
	.transform((v) => normaliserTelephone(v))
	.refine((v) => v.length > 0, { message: 'Le numéro de téléphone est obligatoire.' })
	.refine((v) => telephoneValide(v), { message: MESSAGE_TELEPHONE });

/** E-mail facultatif : une chaîne vide vaut « non renseigné ». */
const emailFacultatif = z
	.union([z.literal(''), z.null(), z.email()])
	.optional()
	.transform((v) => (v ? v : null));

/** Champs communs à l'inscription et à la mise à jour du profil. */
export const champsProfilSchema = z.object({
	nom: z.string().min(3).max(120),
	pseudonyme: z.string().max(50).default(''),
	telephone: telephoneObligatoire,
	email: emailFacultatif,
	ville_id: z.coerce.number().int(),
	adresse: z.string().default(''),
	sexe: z.coerce.number().int().nullable().optional(),
	situation_matrimoniale: z.coerce.number().int().nullable().optional(),
	nombre_enfants: z.coerce.number().int().min(0).max(20).default(0),
	employeur: z.string().default(''),
	numero_piece_identite: z.string().default(''),
	forme_juridique: z.coerce.number().int().nullable().optional(),
	type_partenaire: z.coerce.number().int().nullable().optional(),
	domaine_activite_id: z.coerce.number().int().nullable().optional()
});

export type ChampsProfil = z.output<typeof champsProfilSchema>;

/**
 * Inscription minimale (ADR-0008) : identifiant et pseudonyme facultatifs, déduits du
 * téléphone et du nom s'ils ne sont pas fournis.
 */
export const inscriptionSchema = champsProfilSchema.extend({
	categorie: z.coerce.number().int().min(1).max(2),
	identifiant: z
		.string()
		.max(50)
		.regex(/^([A-Za-z0-9_.\-@]{4,50})?$/, {
			message: 'Entre 4 et 50 caractères : lettres, chiffres, point, tiret, souligné ou arobase.'
		})
		.default(''),
	mot_de_passe: z.string().min(8).max(200),
	confirmation: z.string(),
	accepte_conditions: z.coerce.boolean().default(false),
	// Anti-robot (ADR-0005) : champ piège + délai de remplissage.
	site_web: z.string().default(''),
	duree_saisie_ms: z.coerce.number().int().default(0)
});

/**
 * Contrôles croisés de l'inscription, exécutés même si un champ a déjà échoué — c'est ce que
 * doit pouvoir tout signaler d'un coup, et non un champ à la fois.
 */
export const verificationsInscription: VerificationsCroisees = (brut, champs) => {
	const motDePasse = String(brut.mot_de_passe ?? '');
	const identifiant = String(brut.identifiant ?? '').toLowerCase();
	const telephone = normaliserTelephone(String(brut.telephone ?? '')).toLowerCase();
	const interdits = new Set([identifiant, telephone].filter(Boolean));

	if (motDePasse && interdits.has(motDePasse.toLowerCase())) {
		champs.mot_de_passe ??= "Le mot de passe doit être différent de l'identifiant et du téléphone.";
	}
	if (String(brut.confirmation ?? '') !== motDePasse) {
		champs.confirmation ??= 'La confirmation ne correspond pas au mot de passe.';
	}
	if (!brut.accepte_conditions) {
		champs.accepte_conditions ??= "Veuillez accepter les conditions d'utilisation.";
	}
};

export const miseAJourProfilSchema = champsProfilSchema;

export const changementMotDePasseSchema = z.object({
	actuel: z.string(),
	nouveau: z.string().min(8).max(200),
	confirmation: z.string()
});

/** La confirmation doit reprendre le nouveau mot de passe. */
export const verificationsNouveauMotDePasse: VerificationsCroisees = (brut, champs) => {
	if (String(brut.confirmation ?? '') !== String(brut.nouveau ?? '')) {
		champs.confirmation ??= 'La confirmation ne correspond pas au nouveau mot de passe.';
	}
};

/** Vérification d'identité reprise du legacy : catégorie + nom + pseudo + téléphone. */
export const motDePasseOublieSchema = z.object({
	categorie: z.coerce.number().int().min(1).max(2),
	nom: z.string().min(1),
	pseudonyme: z.string().min(1),
	telephone: z.string().min(1)
});

export const reinitialisationSchema = z.object({
	jeton: z.string().min(10),
	nouveau: z.string().min(8).max(200),
	confirmation: z.string()
});

// --- Vue « moi » -----------------------------------------------------------------------------

/** Profil complet du membre connecté (renvoyé uniquement à lui-même). */
export interface MembreMoi {
	id: number;
	type_compte: number;
	categorie: number;
	code_membre: string;
	nom: string;
	pseudonyme: string;
	sexe: number;
	telephone: string;
	email: string | null;
	ville_id: number | null;
	adresse: string;
	identifiant: string;
	etat: number;
	droit_attribution: boolean;
	droit_caisse: boolean;
	droit_activation: boolean;
	numero_piece_identite: string;
	employeur: string;
	situation_matrimoniale: number | null;
	nombre_enfants: number;
	forme_juridique: number | null;
	type_partenaire: number | null;
	domaine_activite_id: number | null;
	date_limite_master: Date | null;
	point_caisse_actif: boolean;
	solde_point_caisse: number;
	date_dernier_pointage: Date | null;
	photo: string | null;
	date_creation: Date | null;
	photo_url: string | null;
	est_gestionnaire: boolean;
	profil_complet: number;
}

/**
 * Pourcentage de complétion du profil (incite à compléter l'inscription progressive).
 * Mêmes champs comptés que dans l'ancienne version.
 */
function profilComplet(m: Membre): number {
	const champs: unknown[] = [m.nom, m.pseudonyme, m.telephone, m.ville_id, m.email, m.adresse];
	if (m.categorie === CategorieMembre.PHYSIQUE) {
		champs.push(
			m.sexe === Sexe.FEMININ || m.sexe === Sexe.MASCULIN,
			m.situation_matrimoniale,
			m.photo
		);
	} else {
		champs.push(m.domaine_activite_id, m.photo);
	}
	const remplis = champs.filter(Boolean).length;
	return Math.round((100 * remplis) / champs.length);
}

export function vueMembreMoi(m: Membre): MembreMoi {
	return {
		id: m.id,
		type_compte: m.type_compte,
		categorie: m.categorie,
		code_membre: m.code_membre,
		nom: m.nom,
		pseudonyme: m.pseudonyme,
		sexe: m.sexe,
		telephone: m.telephone,
		email: m.email,
		ville_id: m.ville_id,
		adresse: m.adresse,
		identifiant: m.identifiant,
		etat: m.etat,
		droit_attribution: m.droit_attribution,
		droit_caisse: m.droit_caisse,
		droit_activation: m.droit_activation,
		numero_piece_identite: m.numero_piece_identite,
		employeur: m.employeur,
		situation_matrimoniale: m.situation_matrimoniale,
		nombre_enfants: m.nombre_enfants,
		forme_juridique: m.forme_juridique,
		type_partenaire: m.type_partenaire,
		domaine_activite_id: m.domaine_activite_id,
		date_limite_master: m.date_limite_master,
		point_caisse_actif: m.point_caisse_actif,
		solde_point_caisse: m.solde_point_caisse,
		date_dernier_pointage: m.date_dernier_pointage,
		photo: m.photo,
		date_creation: m.date_creation,
		photo_url: url(m.photo),
		est_gestionnaire: m.type_compte === TypeMembre.GESTIONNAIRE,
		profil_complet: profilComplet(m)
	};
}
