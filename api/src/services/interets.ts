/**
 * Expressions d'intérêt / de besoin déposées sous une fiche (legacy `besoin`), communes à
 * l'emploi, l'immobilier, les articles et les partenariats (ADR-0007 S2d).
 * Portage de `app/services/interets.py`.
 */
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { erreur } from '../erreurs.js';
import { interet as tableInteret } from '../schema/rh.js';
import type { Membre } from '../schema/membres.js';
import { notifier } from './messages.js';

/** `besoin.typebsn` legacy. */
export const TYPE_EMPLOI = 2;
/** Immobilier et articles. */
export const TYPE_ANNONCE = 3;
export const TYPE_PARTENARIAT = 6;

/** Colonnes de `interet` pouvant porter la cible, et le `type_objet` legacy correspondant. */
export const CIBLES = {
	annonce_emploi_id: TYPE_EMPLOI,
	immobilier_id: TYPE_ANNONCE,
	article_id: TYPE_ANNONCE,
	partenariat_id: TYPE_PARTENARIAT
} as const;

export type Cible = keyof typeof CIBLES;

export interface DepotInteret {
	membre: Membre;
	cible: Cible;
	cibleId: number;
	auteurFicheId: number | null | undefined;
	sousType: number;
	message: string;
	libelleFiche: string;
	lien: string;
	messageObligatoire?: boolean;
}

/**
 * Une seule contribution par membre et par fiche ; jamais sur sa propre fiche.
 * L'auteur de la fiche est prévenu par la messagerie privée.
 */
export function deposer(depot: DepotInteret) {
	const { membre, cible, cibleId, auteurFicheId, sousType, libelleFiche, lien } = depot;
	if (auteurFicheId === membre.id) {
		throw erreur('Vous ne pouvez pas vous manifester sur votre propre fiche.');
	}
	const message = depot.message.trim();
	if (depot.messageObligatoire && message.length < 5) {
		throw erreur('Message trop court.', {
			message: 'Présentez votre besoin en quelques mots (5 caractères minimum).'
		});
	}

	const colonne = tableInteret[cible];
	const deja = db
		.select({ id: tableInteret.id })
		.from(tableInteret)
		.where(and(eq(colonne, cibleId), eq(tableInteret.membre_id, membre.id)))
		.limit(1)
		.get();
	if (deja) {
		throw erreur('Opération déjà effectuée.', {
			message: 'Vous vous êtes déjà manifesté·e sur cette fiche.'
		});
	}

	return db.transaction(() => {
		const cree = db
			.insert(tableInteret)
			.values({
				type_objet: CIBLES[cible],
				sous_type: sousType,
				membre_id: membre.id,
				message,
				[cible]: cibleId
			})
			.returning()
			.get();
		if (auteurFicheId) {
			notifier(
				auteurFicheId,
				`Bonne nouvelle : ${membre.pseudonyme} s'intéresse à votre fiche « ${libelleFiche} ». ` +
					`Retrouvez son message sur ${lien}`
			);
		}
		return cree;
	});
}

export function lister(cible: Cible, cibleId: number) {
	return db
		.select()
		.from(tableInteret)
		.where(eq(tableInteret[cible], cibleId))
		.orderBy(desc(tableInteret.date_creation))
		.all();
}

/** Nombre de personnes intéressées par une fiche (compteur affiché à son auteur). */
export function compter(cible: Cible, cibleId: number): number {
	return lister(cible, cibleId).length;
}
