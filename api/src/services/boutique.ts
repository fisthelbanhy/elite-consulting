/**
 * Boutique bien-être : prix selon le statut, panier produits et paiement (type 1).
 * Portage de `app/services/boutique.py`.
 *
 * Legacy : incl-venteproduit.php (S5, prix distributeur) et incl-choix1C.php (santé, prix public),
 * qui partageaient le même panier (`panier.typepnr = 1`). Décisions :
 * - ADR-0007 S5a : **un seul panier** ; un distributeur (souscription validée) paie le prix
 *   distributeur, les autres le prix public ; le prix est figé à l'ajout ;
 * - ADR-0004 : paiement bloqué si une quantité dépasse le stock (message legacy) ;
 * - ADR-0007 S3b : stock décrémenté et lignes marquées payées à la **déclaration** du paiement ;
 *   restitution si la caisse **rejette** le paiement.
 *
 * Les lignes d'articles (type 2) appartiennent au module Petites annonces.
 */
import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db.js';
import { Etat, TypeObjetPaye } from '../enums.js';
import { erreur } from '../erreurs.js';
import {
	lignePanier,
	paiement as tablePaiement,
	produit as tableProduit
} from '../schema/commerce.js';
import type { Membre } from '../schema/membres.js';
import { estDistributeur } from './distributeur.js';
import { declarer } from './paiements.js';

export const MESSAGE_STOCK =
	'Certaines quantités des produits dans le panier sont supérieures aux quantités en stock. ' +
	'Veuillez les supprimer dans le panier et prendre une nouvelle quantité en rapport avec le stock.';
export const MESSAGE_RETIRE =
	"Un produit de votre panier n'est plus proposé : retirez-le pour pouvoir payer.";
export const QUANTITE_MAX = 999;

export type Produit = typeof tableProduit.$inferSelect;
export type Ligne = typeof lignePanier.$inferSelect;

/** Une ligne de panier accompagnée de son produit (chargé en une requête, comme le `selectinload`). */
export interface LigneAvecProduit {
	ligne: Ligne;
	produit: Produit | null;
}

/**
 * Prix unique de panier (ADR-0007 S5a). Sans prix distributeur renseigné, un distributeur paie le
 * prix public ; un prix nul signifie « prix non communiqué ».
 */
export function prixPour(produit: Produit, distributeur: boolean): number {
	if (distributeur && produit.prix_distributeur > 0) return produit.prix_distributeur;
	return produit.prix_public;
}

function lignesAvecProduit(condition: SQL | undefined): LigneAvecProduit[] {
	return db
		.select({ ligne: lignePanier, produit: tableProduit })
		.from(lignePanier)
		.leftJoin(tableProduit, eq(tableProduit.id, lignePanier.produit_id))
		.where(condition)
		.orderBy(asc(lignePanier.date_ajout), asc(lignePanier.id))
		.all();
}

export function lignesNonPayees(membreId: number): LigneAvecProduit[] {
	return lignesAvecProduit(
		and(
			eq(lignePanier.membre_id, membreId),
			eq(lignePanier.type_objet, TypeObjetPaye.PRODUIT),
			eq(lignePanier.paye, false),
			eq(lignePanier.etat, Etat.AUTORISE)
		)
	);
}

/**
 * Lignes empêchant le paiement : produit retiré du catalogue, ou quantité demandée (cumulée sur
 * toutes les lignes du même produit) supérieure au stock.
 */
export function lignesBloquantes(lignes: LigneAvecProduit[]): {
	bloquantes: Set<number>;
	message: string | null;
} {
	const demandes = new Map<number, number>();
	for (const { ligne } of lignes) {
		if (ligne.produit_id) {
			demandes.set(ligne.produit_id, (demandes.get(ligne.produit_id) ?? 0) + ligne.quantite);
		}
	}
	const bloquantes = new Set<number>();
	let message: string | null = null;
	for (const { ligne, produit } of lignes) {
		if (!produit || produit.etat !== Etat.AUTORISE) {
			bloquantes.add(ligne.id);
			message ??= MESSAGE_RETIRE;
		} else if ((demandes.get(produit.id) ?? 0) > produit.quantite_stock) {
			bloquantes.add(ligne.id);
			message = MESSAGE_STOCK;
		}
	}
	return { bloquantes, message };
}

export function total(lignes: LigneAvecProduit[]): number {
	return lignes.reduce((n, { ligne }) => n + ligne.prix_unitaire * ligne.quantite, 0);
}

export interface LigneAjout {
	produit_id: number;
	quantite: number;
}

/**
 * Ajout multiple (F-S5-13, F-S1-31). Aucun contrôle de stock à l'ajout (règle legacy : le contrôle
 * a lieu au paiement). Une ligne existante du même produit au même prix est complétée au lieu d'en
 * créer une nouvelle. Retourne le nombre d'articles ajoutés.
 */
export function ajouter(membre: Membre, lignes: LigneAjout[]): number {
	const demandes = lignes.filter((li) => li.quantite > 0);
	if (demandes.length === 0) {
		throw erreur('Choisissez au moins une quantité.', {
			lignes: 'Choisissez au moins une quantité.'
		});
	}
	const distributeur = estDistributeur(membre);
	const existantes = new Map<string, Ligne>(
		lignesNonPayees(membre.id).map(({ ligne }) => [
			`${ligne.produit_id}:${ligne.prix_unitaire}`,
			ligne
		])
	);
	let ajoutes = 0;

	for (const demande of demandes) {
		const produit = db
			.select()
			.from(tableProduit)
			.where(eq(tableProduit.id, demande.produit_id))
			.get();
		if (!produit || produit.etat !== Etat.AUTORISE) {
			throw erreur("Ce produit n'est plus disponible.");
		}
		const prix = prixPour(produit, distributeur);
		if (prix <= 0) {
			throw erreur(
				`« ${produit.nom} » n'a pas encore de prix en ligne : demandez-le à votre frangine sur WhatsApp.`
			);
		}
		const cle = `${produit.id}:${prix}`;
		const ligne = existantes.get(cle);
		if (ligne) {
			const quantite = Math.min(QUANTITE_MAX, ligne.quantite + demande.quantite);
			db.update(lignePanier).set({ quantite }).where(eq(lignePanier.id, ligne.id)).run();
			ligne.quantite = quantite;
		} else {
			const creee = db
				.insert(lignePanier)
				.values({
					type_objet: TypeObjetPaye.PRODUIT,
					membre_id: membre.id,
					produit_id: produit.id,
					quantite: demande.quantite,
					prix_unitaire: prix,
					etat: Etat.AUTORISE
				})
				.returning()
				.get()!;
			existantes.set(cle, creee);
		}
		ajoutes += demande.quantite;
	}
	return ajoutes;
}

// --- Paiement du panier produits (type 1) --------------------------------------------------------

declarer(TypeObjetPaye.PRODUIT, {
	libelle: (membre) => {
		const n = lignesNonPayees(membre.id).reduce((t, { ligne }) => t + ligne.quantite, 0);
		return `Commande de produits Forever — ${n} article${n > 1 ? 's' : ''}`;
	},
	montant: (membre) => total(lignesNonPayees(membre.id)),
	retour: () => '/panier',
	verifier: (membre) => {
		const lignes = lignesNonPayees(membre.id);
		if (lignes.length === 0) throw erreur('Votre panier est vide.');
		const { bloquantes, message } = lignesBloquantes(lignes);
		if (bloquantes.size) throw erreur(message ?? MESSAGE_STOCK);
	},
	/** Effets immédiats (legacy incl-enregpaye.php, typepnr=1) : stock décrémenté, lignes payées. */
	enregistrer: (p) => {
		if (p.membre_id === null) return;
		for (const { ligne, produit } of lignesNonPayees(p.membre_id)) {
			if (produit) {
				db.update(tableProduit)
					.set({ quantite_stock: produit.quantite_stock - ligne.quantite })
					.where(eq(tableProduit.id, produit.id))
					.run();
			}
			db.update(lignePanier)
				.set({ paye: true, date_paiement: new Date(), paiement_id: p.id })
				.where(eq(lignePanier.id, ligne.id))
				.run();
		}
	},
	/** Paiement rejeté par la caisse (ADR-0007 S3b) : stock restitué, lignes de nouveau à payer. */
	rejeter: (p) => {
		const lignes = lignesAvecProduit(
			and(eq(lignePanier.paiement_id, p.id), eq(lignePanier.type_objet, TypeObjetPaye.PRODUIT))
		);
		for (const { ligne, produit } of lignes) {
			if (produit) {
				db.update(tableProduit)
					.set({ quantite_stock: produit.quantite_stock + ligne.quantite })
					.where(eq(tableProduit.id, produit.id))
					.run();
			}
			db.update(lignePanier)
				.set({ paye: false, date_paiement: null, paiement_id: null })
				.where(eq(lignePanier.id, ligne.id))
				.run();
		}
	}
});

/** Réexporté pour les écrans de suivi, qui lisent l'état de paiement d'une ligne. */
export function etatDuPaiement(paiementId: number | null): number | null {
	if (!paiementId) return null;
	const p = db
		.select({ etat: tablePaiement.etat })
		.from(tablePaiement)
		.where(eq(tablePaiement.id, paiementId))
		.get();
	return p ? p.etat : null;
}
