/**
 * Service central des paiements (ADR-0006 ; legacy `incl-formulairepaye.php` /
 * `incl-enregpaye.php` / `ppayement.php`). Portage de `app/services/paiements.py`.
 *
 * Chaque module métier déclare, pour son type d'objet payé (`TypeObjetPaye`), un `Traitement` :
 * montant attendu, vérifications, et effets à l'enregistrement / à la confirmation / au rejet.
 * Comme dans le legacy, les effets métier ont lieu **à l'enregistrement** (paiement « non
 * confirmé ») ; la caisse confirme ensuite. Nouveauté (ADR-0007 S3b) : un paiement peut être
 * **rejeté** (retour à « Non payé ») et le module annule alors ses effets.
 */
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { EtatPaiement, ModePaiement, TypeObjetPaye } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { paiement as tablePaiement } from '../schema/commerce.js';
import type { Membre } from '../schema/membres.js';

export type Paiement = typeof tablePaiement.$inferSelect;

/**
 * Contrat que chaque module remplit pour son type d'objet payé. Toutes les fonctions sont
 * synchrones : elles s'exécutent dans la transaction du paiement (voir `enregistrer`).
 *
 * À l'intérieur de ces fonctions, écrivez simplement avec `db` : SQLite ouvre la transaction sur
 * la connexion, donc toute écriture faite pendant l'appel en fait partie et sera annulée avec
 * elle. Il n'y a pas de `tx` à faire circuler.
 */
export interface Traitement {
	/** Intitulé affiché sur l'écran de paiement. */
	libelle: (membre: Membre, objetId: number | null) => string;
	/** Montant dû ; `null` = montant libre, saisi par le payeur. */
	montant?: (membre: Membre, objetId: number | null) => number | null;
	/** Lien de retour après paiement (page de l'objet payé). */
	retour?: (membre: Membre, objetId: number | null) => string;
	/** Contrôles métier préalables (stock disponible, fiche encore ouverte…). */
	verifier?: (membre: Membre, objetId: number | null, montant: number) => void;
	/** Effets métier, appliqués dès l'enregistrement (comme le legacy). */
	enregistrer?: (paiement: Paiement) => void;
	/** Effets à la confirmation par la caisse. */
	confirmer?: (paiement: Paiement) => void;
	/** Annulation des effets, quand la caisse rejette le paiement (ADR-0007 S3b). */
	rejeter?: (paiement: Paiement) => void;
	/** Données supplémentaires exposées à l'écran de paiement. */
	extras?: Record<string, unknown>;
}

const TRAITEMENTS = new Map<number, Traitement>();

/** Appelé par chaque module au chargement (ex. `declarer(TypeObjetPaye.COURSE, …)`). */
export function declarer(typeObjet: number, traitement: Traitement): void {
	TRAITEMENTS.set(typeObjet, traitement);
}

export function traitement(typeObjet: number): Traitement {
	const t = TRAITEMENTS.get(typeObjet);
	if (!t) throw introuvable("Ce type de paiement n'est pas disponible.");
	return t;
}

/** Vrai si un type d'objet payé a été déclaré (utilisé par les tests et l'écran de paiement). */
export function estDeclare(typeObjet: number): boolean {
	return TRAITEMENTS.has(typeObjet);
}

export const CONSIGNES: Record<number, string> = {
	[ModePaiement.CASH]: 'Vous pouvez saisir une remarque ou observation (lieu, personne remise…).',
	[ModePaiement.CHARDEN_FARELL]:
		"Indiquez le nom, le téléphone et l'agence de l'expéditeur, ainsi que le code Charden Farell.",
	[ModePaiement.MOBILE_MONEY]:
		"Envoyez le montant sur l'un de nos numéros, puis indiquez votre numéro et la référence de la transaction."
};

const MODES_CONNUS: number[] = Object.values(ModePaiement);

/** Règles legacy (`incl-formulairepaye.php`). */
export function verifierRemarque(mode: number, remarque: string): void {
	const r = remarque.trim();
	if (mode === ModePaiement.CHARDEN_FARELL && r.length < 12) {
		throw erreur('Code Charden Farell incomplet.', {
			remarque: 'Veuillez indiquer au moins 12 caractères pour le code de Charden Farell.'
		});
	}
	if (mode === ModePaiement.MOBILE_MONEY && r.length < 9) {
		throw erreur('Numéro Mobile Money incomplet.', {
			remarque:
				'Veuillez indiquer au moins 9 caractères pour le numéro de téléphone ou de transaction.'
		});
	}
}

export interface DemandePaiement {
	membre: Membre;
	typeObjet: number;
	objetId: number | null;
	mode: number;
	/** Ignoré si le traitement impose un montant. */
	montant: number | null;
	remarque: string;
}

/**
 * Enregistre un paiement « non confirmé » et applique les effets métier du module.
 *
 * Le tout est fait dans une transaction : si un effet métier échoue (stock épuisé entre-temps,
 * fiche fermée…), le paiement n'est pas créé — le legacy pouvait laisser un paiement orphelin.
 */
export function enregistrer(demande: DemandePaiement): Paiement {
	const { membre, typeObjet, objetId, mode, remarque } = demande;
	const t = traitement(typeObjet);
	if (!MODES_CONNUS.includes(mode)) {
		throw erreur('Mode de paiement inconnu.', { mode: 'Choisissez un mode de paiement.' });
	}

	const du = t.montant ? t.montant(membre, objetId) : null;
	const montantFinal = du !== null && du !== undefined ? du : Math.trunc(demande.montant || 0);
	if (montantFinal <= 0) {
		throw erreur('Le montant ne peut être zéro.', { montant: 'Le montant ne peut être zéro.' });
	}
	verifierRemarque(mode, remarque);
	t.verifier?.(membre, objetId, montantFinal);

	const remarqueNette = remarque.trim();
	// Anti-doublon legacy : même payeur, même montant, même remarque (si la remarque est renseignée).
	if (remarqueNette) {
		const doublon = db
			.select({ id: tablePaiement.id })
			.from(tablePaiement)
			.where(
				and(
					eq(tablePaiement.membre_id, membre.id),
					eq(tablePaiement.montant, montantFinal),
					eq(tablePaiement.remarque, remarqueNette),
					ne(tablePaiement.etat, EtatPaiement.NON_PAYE)
				)
			)
			.limit(1)
			.get();
		if (doublon) throw erreur('Ce paiement est déjà enregistré.');
	}

	return db.transaction((tx) => {
		const cree = tx
			.insert(tablePaiement)
			.values({
				membre_id: membre.id,
				type_objet: typeObjet,
				objet_id: objetId,
				mode,
				montant: montantFinal,
				remarque: remarqueNette,
				etat: EtatPaiement.NON_CONFIRME
			})
			.returning()
			.get();
		t.enregistrer?.(cree);
		return cree;
	});
}

export function confirmer(paiement: Paiement, gestionnaire: Membre): void {
	if (paiement.etat !== EtatPaiement.NON_CONFIRME) {
		throw erreur('Seul un paiement en attente peut être confirmé.');
	}
	db.transaction((tx) => {
		tx.update(tablePaiement)
			.set({
				etat: EtatPaiement.CONFIRME,
				confirme_par_id: gestionnaire.id,
				date_confirmation: new Date()
			})
			.where(eq(tablePaiement.id, paiement.id))
			.run();
		paiement.etat = EtatPaiement.CONFIRME;
		traitement(paiement.type_objet).confirmer?.(paiement);
	});
}

export function rejeter(paiement: Paiement, gestionnaire: Membre): void {
	if (paiement.etat !== EtatPaiement.NON_CONFIRME) {
		throw erreur('Seul un paiement en attente peut être rejeté.');
	}
	db.transaction((tx) => {
		tx.update(tablePaiement)
			.set({
				etat: EtatPaiement.NON_PAYE,
				confirme_par_id: gestionnaire.id,
				date_confirmation: new Date()
			})
			.where(eq(tablePaiement.id, paiement.id))
			.run();
		paiement.etat = EtatPaiement.NON_PAYE;
		traitement(paiement.type_objet).rejeter?.(paiement);
	});
}

/** Somme des paiements confirmés pour un objet donné (utilisé par plusieurs modules). */
export function totalConfirme(typeObjet: number, objetId: number): number {
	const ligne = db
		.select({ total: sql<number>`coalesce(sum(${tablePaiement.montant}), 0)` })
		.from(tablePaiement)
		.where(
			and(
				eq(tablePaiement.type_objet, typeObjet),
				eq(tablePaiement.objet_id, objetId),
				eq(tablePaiement.etat, EtatPaiement.CONFIRME)
			)
		)
		.get();
	return ligne?.total ?? 0;
}

export { TypeObjetPaye };
