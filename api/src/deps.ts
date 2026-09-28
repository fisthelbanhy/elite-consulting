/**
 * Middlewares Express : membre courant, contrôles de droits, pagination
 * (portage de `app/deps.py`).
 *
 * Règle non négociable reprise de l'ADR-0005 : **les droits sont vérifiés ici, côté serveur**.
 * Le site legacy ne vérifiait rien — n'importe qui pouvait s'attribuer les droits de gestionnaire
 * en modifiant un champ caché.
 */
import { eq, lt } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.js';
import { Etat } from './enums.js';
import { interdit, nonAuthentifie } from './erreurs.js';
import { membre as tableMembre, peutModerer, session as tableSession, type Membre } from './schema/membres.js';
import { hashJeton } from './securite.js';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			/** Membre connecté, ou `null` pour un visiteur. Posé par `membreOptionnel`. */
			membre: Membre | null;
		}
	}
}

/** Droits attribuables à un gestionnaire (colonnes `droit_*` de `membre`). */
export type Droit = 'attribution' | 'caisse' | 'activation';

const LIBELLES_DROITS: Record<Droit, string> = {
	attribution: "d'attribution des droits",
	caisse: 'de caisse (confirmation des paiements)',
	activation: "d'activation des fiches"
};

/** Une minute, en millisecondes. */
const UNE_MINUTE = 60 * 1000;

/**
 * Résout le membre porté par l'en-tête `Authorization: Bearer …`.
 * Retourne `null` si le jeton est absent, inconnu, expiré, ou si le compte est supprimé.
 */
function membreDepuisJeton(authorization: string | undefined): Membre | null {
	if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) return null;
	const jeton = authorization.slice(7).trim();
	if (!jeton) return null;

	const ligne = db
		.select({ session: tableSession, membre: tableMembre })
		.from(tableSession)
		.innerJoin(tableMembre, eq(tableMembre.id, tableSession.membre_id))
		.where(eq(tableSession.jeton_hash, hashJeton(jeton)))
		.get();
	if (!ligne) return null;
	if (ligne.session.date_expiration.getTime() < Date.now()) return null;
	if (ligne.membre.etat === Etat.SUPPRIME) return null;

	// Présence en ligne (ADR-0007 T3), écrite au plus une fois par minute.
	const maintenant = new Date();
	const derniere = ligne.membre.derniere_activite;
	if (!derniere || derniere.getTime() < maintenant.getTime() - UNE_MINUTE) {
		db.update(tableMembre)
			.set({ derniere_activite: maintenant })
			.where(eq(tableMembre.id, ligne.membre.id))
			.run();
		ligne.membre.derniere_activite = maintenant;
	}
	return ligne.membre;
}

/** Pose `req.membre` (éventuellement `null`). Monté en amont de toutes les routes. */
export function membreOptionnel(req: Request, _res: Response, next: NextFunction) {
	req.membre = membreDepuisJeton(req.headers.authorization);
	next();
}

/** Exige un membre connecté (401 sinon). */
export function membreRequis(req: Request, _res: Response, next: NextFunction) {
	if (!req.membre) throw nonAuthentifie();
	next();
}

/** Exige un gestionnaire (403 sinon). */
export function gestionnaireRequis(req: Request, _res: Response, next: NextFunction) {
	if (!req.membre) throw nonAuthentifie();
	if (req.membre.type_compte !== 1) throw interdit('Espace réservé aux gestionnaires.');
	next();
}

/** Le membre connecté, ou une erreur 401 — à utiliser dans une route montée après `membreRequis`. */
export function exigerMembre(req: Request): Membre {
	if (!req.membre) throw nonAuthentifie();
	return req.membre;
}

/** Vérifie qu'un gestionnaire porte le droit demandé (403 sinon). */
export function exigerDroit(membre: Membre | null, droit: Droit): void {
	const accorde = !!membre && membre.type_compte === 1 && membre[`droit_${droit}`];
	if (!accorde) throw interdit(`Cette action nécessite le droit ${LIBELLES_DROITS[droit]}.`);
}

/**
 * Règle legacy répétée partout : l'auteur de la fiche, ou un gestionnaire ayant le droit
 * « Activation ».
 */
export function peutModifier(membre: Membre | null, auteurId: number | null | undefined): boolean {
	if (!membre) return false;
	return membre.id === auteurId || peutModerer(membre);
}

export function verifierModification(membre: Membre | null, auteurId: number | null | undefined): void {
	if (!peutModifier(membre, auteurId)) {
		throw interdit('Seul l’auteur de la fiche ou un gestionnaire habilité peut la modifier.');
	}
}

// --- Pagination ----------------------------------------------------------------------------------

export interface Pagination {
	page: number;
	taille: number;
	offset: number;
}

/**
 * Lit `?page=&taille=` avec les mêmes bornes que FastAPI (`page ≥ 1`, `1 ≤ taille ≤ 100`).
 * Une valeur hors bornes est ramenée dans l'intervalle plutôt que refusée — c'est ce que faisait
 * déjà le frontend en construisant ses liens de pagination.
 */
export function pagination(req: Request, defautTaille = 20): Pagination {
	const brutPage = Number(req.query.page);
	const brutTaille = Number(req.query.taille);
	const page = Number.isFinite(brutPage) && brutPage >= 1 ? Math.trunc(brutPage) : 1;
	const taille = Number.isFinite(brutTaille)
		? Math.min(100, Math.max(1, Math.trunc(brutTaille)))
		: defautTaille;
	return { page, taille, offset: (page - 1) * taille };
}

/** Purge les sessions expirées (appelée au démarrage ; le legacy ne nettoyait jamais). */
export function purgerSessionsExpirees(): number {
	return db.delete(tableSession).where(lt(tableSession.date_expiration, new Date())).run().changes;
}
