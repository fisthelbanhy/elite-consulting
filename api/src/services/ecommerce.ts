/**
 * Services e-commerce (section 3 legacy) : panier des petites annonces, contrôle de stock et
 * paiement des articles et des courses. Portage de `app/services/ecommerce.py`.
 *
 * Déclare au chargement les `Traitement` de paiement (ADR-0006) :
 * - type 2 « Article » : montant = total du panier articles non payé du membre ; à
 *   l'enregistrement, stock décrémenté et lignes marquées payées ; au rejet, stock restitué et
 *   lignes remises impayées (ADR-0007 S3a/S3b) ;
 * - type 4 « Course » : montant = achats + frais de service ; à l'enregistrement, course payée ;
 *   au rejet, course de nouveau à payer.
 */
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '../db.js';
import { Etat, EtatCourse, EtatPaiement, OffreDemande, OuiNon, TypeObjetPaye } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { article, course, lignePanier, paiement } from '../schema/commerce.js';
import type { Membre } from '../schema/membres.js';
import { notifier } from './messages.js';
import { declarer, type Paiement } from './paiements.js';

export const MESSAGE_STOCK =
	'Certaines quantités des articles du panier sont supérieures aux quantités en stock. ' +
	'Veuillez les retirer du panier ou choisir une quantité en rapport avec le stock.';

export function fcfa(montant: number): string {
	return `${montant.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

/** Message privé de la frangine (messagerie du membre). */
export function prevenir(membreId: number | null | undefined, texte: string): void {
	if (membreId) notifier(membreId, texte);
}

// --- Panier des petites annonces ---------------------------------------------------------------

export type LigneAvecArticle = typeof lignePanier.$inferSelect & {
	article: typeof article.$inferSelect | null;
};

/** Lignes articles non payées d'un membre (ou de tous les membres si `membreId` est absent). */
export function lignesPanier(membreId?: number | null): LigneAvecArticle[] {
	const conditions = [
		eq(lignePanier.type_objet, TypeObjetPaye.ARTICLE),
		eq(lignePanier.paye, false)
	];
	if (membreId !== undefined && membreId !== null) {
		conditions.push(eq(lignePanier.membre_id, membreId));
	}
	return db
		.select({ ligne: lignePanier, article })
		.from(lignePanier)
		.leftJoin(article, eq(article.id, lignePanier.article_id))
		.where(and(...conditions))
		.orderBy(asc(lignePanier.date_ajout), asc(lignePanier.id))
		.all()
		.map((l) => ({ ...l.ligne, article: l.article }));
}

export function total(lignes: LigneAvecArticle[]): number {
	return lignes.reduce((n, l) => n + l.prix_unitaire * l.quantite, 0);
}

/**
 * Identifiants des lignes non servables : article retiré, plus en offre, ou quantité totale
 * demandée (toutes lignes du même article cumulées) supérieure au stock.
 */
export function lignesEnRupture(lignes: LigneAvecArticle[]): Set<number> {
	const demande = new Map<number, number>();
	for (const l of lignes) {
		if (l.article_id) demande.set(l.article_id, (demande.get(l.article_id) ?? 0) + l.quantite);
	}
	const rupture = new Set<number>();
	for (const l of lignes) {
		const a = l.article;
		if (
			!a ||
			a.etat !== Etat.AUTORISE ||
			a.offre_ou_recherche !== OffreDemande.OFFRE ||
			(demande.get(a.id) ?? 0) > a.quantite
		) {
			rupture.add(l.id);
		}
	}
	return rupture;
}

function verifierPanier(membre: Membre): LigneAvecArticle[] {
	const lignes = lignesPanier(membre.id);
	if (lignes.length === 0) throw erreur('Votre panier est vide.');
	// ADR-0007 S3a : paiement bloqué, comme pour les produits.
	if (lignesEnRupture(lignes).size > 0) throw erreur(MESSAGE_STOCK);
	return lignes;
}

// --- Courses -------------------------------------------------------------------------------------

/** Dernier paiement déclaré (non confirmé ou confirmé) d'une course. */
export function paiementEnCours(courseId: number) {
	return (
		db
			.select()
			.from(paiement)
			.where(
				and(
					eq(paiement.type_objet, TypeObjetPaye.COURSE),
					eq(paiement.objet_id, courseId),
					ne(paiement.etat, EtatPaiement.NON_PAYE)
				)
			)
			.orderBy(desc(paiement.date_paiement), desc(paiement.id))
			.limit(1)
			.get() ?? null
	);
}

function courseAPayer(membre: Membre, objetId: number | null) {
	const c = objetId ? db.select().from(course).where(eq(course.id, objetId)).get() : null;
	if (!c || c.etat === Etat.SUPPRIME) throw introuvable('Course introuvable.');
	if (c.client_id !== membre.id) throw interdit('Seul le client peut payer sa course.');
	if (c.etat_course === EtatCourse.SUPPRIMEE) {
		throw erreur('Cette course est annulée : elle ne peut pas être payée.');
	}
	if (c.paye === OuiNon.OUI || paiementEnCours(c.id) !== null) {
		throw erreur('Cette course est déjà payée.');
	}
	return c;
}

// --- Déclaration des traitements de paiement -------------------------------------------------------

declarer(TypeObjetPaye.ARTICLE, {
	libelle: (membre) => {
		const lignes = verifierPanier(membre);
		const n = lignes.reduce((s, l) => s + l.quantite, 0);
		return `Panier des petites annonces : ${n} article${n > 1 ? 's' : ''}`;
	},
	montant: (membre) => total(lignesPanier(membre.id)),
	retour: () => '/annonces/panier',
	verifier: (membre) => {
		verifierPanier(membre);
	},
	/** Effet à la déclaration (legacy conservé, ADR-0007 S3b) : réservation du stock. */
	enregistrer: (p: Paiement) => {
		for (const ligne of lignesPanier(p.membre_id)) {
			if (ligne.article) {
				db.update(article)
					.set({ quantite: Math.max(0, ligne.article.quantite - ligne.quantite) })
					.where(eq(article.id, ligne.article.id))
					.run();
			}
			db.update(lignePanier)
				.set({ paye: true, date_paiement: new Date(), paiement_id: p.id })
				.where(eq(lignePanier.id, ligne.id))
				.run();
		}
	},
	/** Paiement rejeté par la caisse : stock restitué, lignes de nouveau impayées. */
	rejeter: (p: Paiement) => {
		const lignes = db
			.select({ ligne: lignePanier, article })
			.from(lignePanier)
			.leftJoin(article, eq(article.id, lignePanier.article_id))
			.where(
				and(
					eq(lignePanier.paiement_id, p.id),
					eq(lignePanier.type_objet, TypeObjetPaye.ARTICLE)
				)
			)
			.all();

		for (const { ligne, article: a } of lignes) {
			if (a) {
				db.update(article)
					.set({ quantite: a.quantite + ligne.quantite })
					.where(eq(article.id, a.id))
					.run();
			}
			db.update(lignePanier)
				.set({ paye: false, date_paiement: null, paiement_id: null })
				.where(eq(lignePanier.id, ligne.id))
				.run();
		}
		prevenir(
			p.membre_id,
			`Votre paiement de ${fcfa(p.montant)} pour le panier des petites annonces n'a pas pu ` +
				'être validé par notre caisse. Les articles sont de nouveau dans votre panier : ' +
				'/annonces/panier'
		);
	}
});

declarer(TypeObjetPaye.COURSE, {
	libelle: (membre, objetId) => {
		const c = courseAPayer(membre, objetId);
		return `Course ${c.reference} : achats ${fcfa(c.montant_achats)} + frais de service ${fcfa(c.frais_service)}`;
	},
	// « Net à payer » (correctif : le legacy oubliait les frais).
	montant: (membre, objetId) => {
		const c = courseAPayer(membre, objetId);
		return c.montant_achats + c.frais_service;
	},
	retour: (_membre, objetId) => (objetId ? `/courses/${objetId}` : '/courses'),
	verifier: (membre, objetId) => {
		courseAPayer(membre, objetId);
	},
	enregistrer: (p: Paiement) => {
		const c = p.objet_id ? db.select().from(course).where(eq(course.id, p.objet_id)).get() : null;
		if (!c) return;
		db.update(course)
			.set({ paye: OuiNon.OUI, mode_paiement: p.mode })
			.where(eq(course.id, c.id))
			.run();
		prevenir(
			c.boutique_id,
			`La course ${c.reference} a été payée par le client ` +
				`(paiement en cours de vérification) : /courses/${c.id}`
		);
	},
	rejeter: (p: Paiement) => {
		const c = p.objet_id ? db.select().from(course).where(eq(course.id, p.objet_id)).get() : null;
		if (!c) return;
		db.update(course).set({ paye: OuiNon.NON, mode_paiement: 0 }).where(eq(course.id, c.id)).run();
		prevenir(
			c.client_id,
			`Votre paiement de ${fcfa(p.montant)} pour la course ${c.reference} n'a pas pu ` +
				`être validé par notre caisse. Vous pouvez le déclarer de nouveau : /courses/${c.id}`
		);
	}
});
