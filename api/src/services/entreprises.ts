/**
 * Règles partagées de la section « Entreprises - Marchés » : entreprises d'un membre, accès
 * « compte entreprise » au comparateur de prix (ADR-0007 S6a), catalogue libre des produits.
 *
 * Portage de `app/services/entreprises.py`.
 */
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { CategorieMembre, Etat } from '../enums.js';
import { ErreurMetier, erreur, interdit } from '../erreurs.js';
import { entreprise, produitProspective } from '../schema/entreprises.js';
import type { Membre } from '../schema/membres.js';

export const MESSAGE_COMPTE_ENTREPRISE = "Il faut avoir un compte entreprise pour y avoir accès.";
export const LONGUEUR_MIN_PRODUIT = 3;

/** Entreprises créées par le membre (hors fiches supprimées), par nom. */
export function entreprisesDe(membre: Membre) {
	return db
		.select()
		.from(entreprise)
		.where(and(eq(entreprise.membre_id, membre.id), ne(entreprise.etat, Etat.SUPPRIME)))
		.orderBy(asc(entreprise.nom))
		.all();
}

/**
 * Compte entreprise = gestionnaire, ou membre personne morale ayant au moins une entreprise
 * dans l'annuaire.
 */
export function estCompteEntreprise(membre: Membre | null): boolean {
	if (!membre) return false;
	if (membre.type_compte === 1) return true;
	if (membre.categorie !== CategorieMembre.MORALE) return false;
	const n =
		db
			.select({ n: sql<number>`count(*)` })
			.from(entreprise)
			.where(and(eq(entreprise.membre_id, membre.id), ne(entreprise.etat, Etat.SUPPRIME)))
			.get()?.n ?? 0;
	return n > 0;
}

export function exigerCompteEntreprise(membre: Membre | null): Membre {
	if (!membre) throw new ErreurMetier(MESSAGE_COMPTE_ENTREPRISE, 401);
	if (!estCompteEntreprise(membre)) throw interdit(MESSAGE_COMPTE_ENTREPRISE);
	return membre;
}

/**
 * Espaces superflus retirés, première lettre en majuscule
 * (« ciment  50 kg » → « Ciment 50 kg »).
 */
export function normaliserNomProduit(nom: string | null | undefined): string {
	const n = (nom ?? '').replace(/\s+/g, ' ').trim();
	return n.slice(0, 1).toUpperCase() + n.slice(1);
}

export function produitParNom(nom: string, exclureId?: number) {
	const conditions = [sql`lower(${produitProspective.nom}) = ${nom.toLowerCase()}`];
	if (exclureId) conditions.push(ne(produitProspective.id, exclureId));
	return (
		db
			.select()
			.from(produitProspective)
			.where(and(...conditions))
			.limit(1)
			.get() ?? null
	);
}

export function verifierNomProduit(nom: string, champ = 'nom'): void {
	if (nom.length < LONGUEUR_MIN_PRODUIT) {
		const msg = `Le nom du produit doit avoir au moins ${LONGUEUR_MIN_PRODUIT} caractères.`;
		throw erreur(msg, { [champ]: msg });
	}
}

/**
 * Produit choisi dans la liste ou tapé : s'il existe déjà (même nom), il est réutilisé, sinon il
 * est créé à la volée, publié (legacy incl-prospective.php). La liste l'emporte si les deux sont
 * renseignés (comme le legacy).
 */
export function resoudreProduit(produitId: number | null | undefined, nouveau: string) {
	if (produitId) {
		const produit = db
			.select()
			.from(produitProspective)
			.where(eq(produitProspective.id, produitId))
			.get();
		if (!produit || produit.etat !== Etat.AUTORISE) {
			throw erreur('Veuillez indiquer le produit.', {
				produit_id: "Ce produit n'est plus disponible."
			});
		}
		return produit;
	}

	const nom = normaliserNomProduit(nouveau);
	if (!nom) {
		throw erreur('Veuillez indiquer le produit.', {
			produit_id: 'Choisissez un produit ou tapez son nom.'
		});
	}
	verifierNomProduit(nom, 'nouveau_produit');

	const existant = produitParNom(nom);
	if (existant) {
		if (existant.etat !== Etat.AUTORISE) {
			throw erreur("Ce produit n'est pas disponible.", {
				nouveau_produit: 'Ce produit a été retiré du comparateur.'
			});
		}
		return existant;
	}
	return db
		.insert(produitProspective)
		.values({ nom, etat: Etat.AUTORISE })
		.returning()
		.get()!;
}
