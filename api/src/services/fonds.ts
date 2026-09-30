/**
 * Logique métier du pilier « Financer & épargner », partie fonds (section 4 legacy) : agrégats des
 * appels de fonds, versements des apports, module d'épargne désactivable, et traitements de
 * paiement des types 5 (Likelemba), 7 (fond de soutien) et 8 (apport de fonds).
 * Portage de `app/services/fonds.py`.
 *
 * Importé par les routeurs `projets`, `likelemba` et `epargne` : l'import déclare les `Traitement`
 * auprès de `services/paiements` (ADR-0006).
 */
import { and, eq, max as maxSql, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { DonPlacement, Etat, EtatPaiement, ModePaiement, OuiNon, TypeObjetPaye } from '../enums.js';
import { ErreurMetier, erreur, interdit, introuvable } from '../erreurs.js';
import { paiement as tablePaiement } from '../schema/commerce.js';
import { parametre } from '../schema/core.js';
import {
	appelFond,
	collecteFond,
	cotisationLikelemba,
	fondDeSoutien,
	groupeLikelemba,
	membreLikelemba,
	versementCollecte
} from '../schema/fonds.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { declarer, type Paiement } from './paiements.js';
import { numeroRecuLikelemba } from './references.js';

export type AppelFond = typeof appelFond.$inferSelect;
export type CollecteFond = typeof collecteFond.$inferSelect;
export type FondDeSoutien = typeof fondDeSoutien.$inferSelect;
export type Adhesion = typeof membreLikelemba.$inferSelect;

/** État 3 d'un engagement = promesse annulée. */
export const ANNULE = Etat.SUPPRIME;

// --- Appels de fonds : agrégats et versements (ADR-0004, ADR-0007 S4a) ---------------------------

/**
 * Recalcule « promis » et « collecté » depuis les engagements (jamais d'incrément à la main).
 *
 * - promis = Σ montants promis des engagements actifs + Σ montants déjà versés des engagements
 *   annulés (une annulation ne retire que la part non versée : ADR-0004, trou fonctionnel) ;
 * - collecté = Σ montants versés de tous les engagements.
 *
 * Invariant : promis ≥ collecté.
 */
export function recalculerAppel(appelId: number): void {
	const ligne = db
		.select({
			promis: sql<number>`coalesce(sum(case when ${collecteFond.etat} = ${ANNULE} then ${collecteFond.montant_verse} else ${collecteFond.montant_promis} end), 0)`,
			collecte: sql<number>`coalesce(sum(${collecteFond.montant_verse}), 0)`
		})
		.from(collecteFond)
		.where(eq(collecteFond.appel_fond_id, appelId))
		.get();
	db.update(appelFond)
		.set({
			montant_promis: ligne?.promis ?? 0,
			montant_collecte: ligne?.collecte ?? 0
		})
		.where(eq(appelFond.id, appelId))
		.run();
}

/** Somme des versements déclarés par le créancier (paiement type 8) non encore confirmés. */
export function paiementsEnAttente(collecteId: number): number {
	return (
		db
			.select({ s: sql<number>`coalesce(sum(${tablePaiement.montant}), 0)` })
			.from(tablePaiement)
			.where(
				and(
					eq(tablePaiement.type_objet, TypeObjetPaye.APPORT_FOND),
					eq(tablePaiement.objet_id, collecteId),
					eq(tablePaiement.etat, EtatPaiement.NON_CONFIRME)
				)
			)
			.get()?.s ?? 0
	);
}

export function resteAVerser(c: CollecteFond, inclureAttente = false): number {
	if (c.etat === ANNULE) return 0;
	let reste = c.montant_promis - c.montant_verse;
	if (inclureAttente) reste -= paiementsEnAttente(c.id);
	return Math.max(0, reste);
}

/**
 * Enregistre un versement (journal append-only), met à jour le cumul de l'engagement puis les
 * agrégats de l'appel de fonds. Les contrôles (montant > 0, reste dû) sont faits par l'appelant.
 */
export function ajouterVersement(c: CollecteFond, montant: number, jour?: Date): void {
	if (c.etat === ANNULE) {
		throw erreur('Cet apport est annulé : aucun versement ne peut y être ajouté.');
	}
	// Un premier versement vaut validation de la promesse.
	if (c.etat === Etat.NON_TRAITE) {
		db.update(collecteFond).set({ etat: Etat.AUTORISE }).where(eq(collecteFond.id, c.id)).run();
		c.etat = Etat.AUTORISE;
	}
	db.insert(versementCollecte)
		.values({
			collecte_id: c.id,
			date_versement: jour ?? new Date(),
			montant,
			etat: Etat.AUTORISE
		})
		.run();
	const cumul = db
		.select({
			total: sql<number>`coalesce(sum(${versementCollecte.montant}), 0)`,
			dernier: maxSql(versementCollecte.date_versement)
		})
		.from(versementCollecte)
		.where(and(eq(versementCollecte.collecte_id, c.id), eq(versementCollecte.etat, Etat.AUTORISE)))
		.get();
	db.update(collecteFond)
		.set({
			montant_verse: cumul?.total ?? 0,
			date_dernier_versement: (cumul?.dernier as Date | null) ?? null
		})
		.where(eq(collecteFond.id, c.id))
		.run();
	c.montant_verse = cumul?.total ?? 0;
	recalculerAppel(c.appel_fond_id);
}

// --- Module d'épargne désactivable (ADR-0009) ----------------------------------------------------

export const MESSAGE_EPARGNE_DESACTIVEE =
	"L'épargne solidaire (dons, placements et carte de pointage) est momentanément désactivée. " +
	'Vos données sont conservées ; contactez la frangine pour toute question.';

export function epargneActive(): boolean {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	return !p || p.module_epargne_actif;
}

export function exigerModuleEpargne(): void {
	if (!epargneActive()) throw new ErreurMetier(MESSAGE_EPARGNE_DESACTIVEE, 403);
}

export function minimumPlacement(): number {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	return p ? p.montant_minimum_placement : 0;
}

/** « 100 000 » (séparateur de milliers espace, comme le legacy). */
export function montantLisible(v: number): string {
	return v.toLocaleString('fr-FR').replace(/ | /g, ' ');
}

// --- Paiement type 5 : cotisation Likelemba (ADR-0007 S4b) --------------------------------------

function adhesionPayable(membre: Membre, objetId: number | null): Adhesion {
	const a = objetId
		? db.select().from(membreLikelemba).where(eq(membreLikelemba.id, objetId)).get()
		: undefined;
	if (!a || a.etat === Etat.SUPPRIME) {
		throw introuvable("Choisissez l'adhésion Likelemba pour laquelle vous cotisez.");
	}
	const groupe = db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, a.groupe_id)).get();
	// L'adhérent, le responsable du groupe (qui collecte) ou un gestionnaire (F-S4-42).
	const autorise =
		membre.id === a.membre_id || membre.id === groupe?.responsable_id || membre.type_compte === 1;
	if (!autorise) {
		throw interdit(
			"Seul l'adhérent, le responsable du groupe ou un gestionnaire peut payer cette cotisation."
		);
	}
	return a;
}

function groupeDe(a: Adhesion) {
	return db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, a.groupe_id)).get()!;
}

function cotisationDuPaiement(p: Paiement) {
	return db
		.select()
		.from(cotisationLikelemba)
		.where(eq(cotisationLikelemba.paiement_id, p.id))
		.get();
}

declarer(TypeObjetPaye.LIKELEMBA, {
	libelle: (membre, objetId) => {
		const a = adhesionPayable(membre, objetId);
		const groupe = groupeDe(a);
		const adherent = a.membre_id
			? db.select().from(tableMembre).where(eq(tableMembre.id, a.membre_id)).get()
			: undefined;
		return (
			`Cotisation Likelemba ${groupe.code} — adhérent ${a.code || '—'}` +
			` (${adherent ? adherent.pseudonyme : 'membre'})`
		);
	},
	montant: (membre, objetId) => groupeDe(adhesionPayable(membre, objetId)).montant_cotisation,
	retour: (membre, objetId) => {
		const a = adhesionPayable(membre, objetId);
		return `/likelemba/${a.groupe_id}/cotiser?adhesion=${a.id}`;
	},
	verifier: (membre, objetId) => {
		const a = adhesionPayable(membre, objetId);
		if (groupeDe(a).etat !== Etat.AUTORISE) {
			throw erreur("Ce likelemba n'est pas ouvert aux cotisations.");
		}
		if (a.etat !== Etat.AUTORISE) {
			throw erreur(
				"Cette adhésion est en attente de confirmation : la cotisation n'est pas encore possible."
			);
		}
	},
	enregistrer: (p) => {
		const a = db.select().from(membreLikelemba).where(eq(membreLikelemba.id, p.objet_id!)).get()!;
		const groupe = groupeDe(a);
		db.insert(cotisationLikelemba)
			.values({
				groupe_id: groupe.id,
				adhesion_id: a.id,
				caissier_id: p.membre_id,
				numero_recu: numeroRecuLikelemba(groupe.id, groupe.code),
				date_paiement: new Date(),
				montant: p.montant,
				mode_paiement: p.mode,
				code_transfert: p.mode === ModePaiement.CHARDEN_FARELL ? p.remarque.slice(0, 30) : '',
				observation: p.remarque,
				etat: Etat.NON_TRAITE,
				paiement_id: p.id
			})
			.run();
	},
	confirmer: (p) => {
		const c = cotisationDuPaiement(p);
		if (c && c.etat === Etat.NON_TRAITE) {
			db.update(cotisationLikelemba)
				.set({ etat: Etat.AUTORISE })
				.where(eq(cotisationLikelemba.id, c.id))
				.run();
		}
	},
	rejeter: (p) => {
		// Le reçu reste consommé (numérotation continue) mais la cotisation est annulée.
		const c = cotisationDuPaiement(p);
		if (c) {
			db.update(cotisationLikelemba)
				.set({ etat: Etat.SUPPRIME })
				.where(eq(cotisationLikelemba.id, c.id))
				.run();
		}
	}
});

// --- Paiement type 7 : don / placement (ADR-0007 S4c) -------------------------------------------

export function peutVoirFond(membre: Membre, f: FondDeSoutien): boolean {
	return (
		membre.type_compte === 1 ||
		membre.id === f.membre_id ||
		membre.id === f.rapporteur_id ||
		membre.id === f.souscripteur_id
	);
}

function fondPayable(membre: Membre, objetId: number | null): FondDeSoutien {
	exigerModuleEpargne();
	const f = objetId
		? db.select().from(fondDeSoutien).where(eq(fondDeSoutien.id, objetId)).get()
		: undefined;
	if (!f || f.etat === Etat.SUPPRIME) throw introuvable('Cette épargne est introuvable.');
	if (!peutVoirFond(membre, f)) {
		throw interdit(
			'Seuls le souscripteur, le rapporteur ou un gestionnaire peuvent payer cette épargne.'
		);
	}
	return f;
}

declarer(TypeObjetPaye.FOND_SOUTIEN, {
	libelle: (membre, objetId) => {
		const f = fondPayable(membre, objetId);
		const quoi = f.type_fond === DonPlacement.DON ? 'Don' : `Placement sur ${f.duree_mois} mois`;
		return `${quoi} ${f.reference} — au nom de ${f.souscripteur_nom || 'vous-même'}`;
	},
	montant: (membre, objetId) => fondPayable(membre, objetId).montant,
	retour: (membre, objetId) => `/epargne/dons-placements/${fondPayable(membre, objetId).id}`,
	verifier: (membre, objetId) => {
		const f = fondPayable(membre, objetId);
		if (f.etat !== Etat.AUTORISE) {
			throw erreur("Cette épargne n'est pas active : le paiement n'est pas possible.");
		}
		if (f.confirme === OuiNon.OUI) throw erreur('Cette épargne est déjà payée.');
	},
	enregistrer: (p) => {
		// Legacy : « confirmé » dès la déclaration du paiement.
		db.update(fondDeSoutien)
			.set({ mode_paiement: p.mode, confirme: OuiNon.OUI })
			.where(eq(fondDeSoutien.id, p.objet_id!))
			.run();
	},
	rejeter: (p) => {
		if (!p.objet_id) return;
		db.update(fondDeSoutien)
			.set({ mode_paiement: 0, confirme: OuiNon.NON })
			.where(eq(fondDeSoutien.id, p.objet_id))
			.run();
	}
});

// --- Paiement type 8 : versement sur un apport de fonds (ADR-0007 S4a) ---------------------------

function collectePayable(membre: Membre, objetId: number | null): CollecteFond {
	const c = objetId
		? db.select().from(collecteFond).where(eq(collecteFond.id, objetId)).get()
		: undefined;
	if (!c) throw introuvable('Cet apport est introuvable.');
	if (membre.id !== c.membre_id) {
		throw interdit('Seul le membre qui a promis cet apport peut déclarer un versement.');
	}
	return c;
}

declarer(TypeObjetPaye.APPORT_FOND, {
	libelle: (membre, objetId) => {
		const c = collectePayable(membre, objetId);
		const appel = db.select().from(appelFond).where(eq(appelFond.id, c.appel_fond_id)).get();
		return `Versement sur votre apport ${c.reference} au projet « ${appel ? appel.nom_projet : ''} »`;
	},
	// Montant libre, plafonné au reste dû (voir `verifier`).
	montant: () => null,
	retour: (membre, objetId) => `/projets/apports/${collectePayable(membre, objetId).id}`,
	verifier: (membre, objetId, montant) => {
		const c = collectePayable(membre, objetId);
		if (c.etat === ANNULE) {
			throw erreur('Cet apport est annulé : aucun versement ne peut être déclaré.');
		}
		const reste = resteAVerser(c, true);
		if (reste <= 0) {
			throw erreur(
				'Votre apport est entièrement versé (ou déjà déclaré, en attente de confirmation).'
			);
		}
		if (montant > reste) {
			throw erreur('Le versement est supérieur au montant promis.', {
				montant: `Il vous reste ${montantLisible(reste)} FCFA à verser sur cet apport.`
			});
		}
	},
	/** La caisse confirme la réception : le versement est enregistré et compté comme collecté. */
	confirmer: (p) => {
		const c = p.objet_id
			? db.select().from(collecteFond).where(eq(collecteFond.id, p.objet_id)).get()
			: undefined;
		if (!c || c.etat === ANNULE) throw erreur('Cet apport est annulé : rejetez ce paiement.');
		if (p.montant > resteAVerser(c)) {
			throw erreur(
				"Ce versement dépasse le reste à verser de l'apport : rejetez-le ou corrigez-le."
			);
		}
		ajouterVersement(c, p.montant);
	}
});
