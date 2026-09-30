/**
 * Messagerie privée membre ↔ « la frangine » : présence en ligne et notifications système.
 * Portage de `app/services/messages.py`.
 *
 * Présence (ADR-0007 T3) : un membre est « en ligne » s'il a fait une requête authentifiée il y a
 * moins de 5 minutes (`membre.derniere_activite`, mise à jour par `src/deps.ts`). « La frangine »
 * est en ligne dès qu'un gestionnaire l'est.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { TypeMembre } from '../enums.js';
import { message as tableMessage } from '../schema/contenu.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';

/** Durée de présence, en millisecondes (5 minutes). */
export const PRESENCE_MS = 5 * 60 * 1000;

export function enLigne(
	membre: Pick<Membre, 'derniere_activite'> | null | undefined,
	maintenant?: Date
): boolean {
	if (!membre?.derniere_activite) return false;
	const reference = (maintenant ?? new Date()).getTime() - PRESENCE_MS;
	return membre.derniere_activite.getTime() >= reference;
}

export function frangineEnLigne(): boolean {
	const ligne = db
		.select({ n: sql<number>`count(*)` })
		.from(tableMembre)
		.where(
			and(
				eq(tableMembre.type_compte, TypeMembre.GESTIONNAIRE),
				gte(tableMembre.derniere_activite, new Date(Date.now() - PRESENCE_MS))
			)
		)
		.get();
	return (ligne?.n ?? 0) > 0;
}

/**
 * Marque lus les messages non lus d'un fil, dans un sens donné. Renvoie le nombre modifié.
 *
 * - ouverture par le membre : `deLaFrangine = true` (les réponses qu'il a reçues) ;
 * - ouverture ou réponse par un gestionnaire : `deLaFrangine = false` (les messages du membre).
 */
export function marquerLus(membreId: number, deLaFrangine: boolean): number {
	return db
		.update(tableMessage)
		.set({ lu: true })
		.where(
			and(
				eq(tableMessage.membre_id, membreId),
				eq(tableMessage.de_la_frangine, deLaFrangine),
				eq(tableMessage.lu, false)
			)
		)
		.run().changes;
}

/** Message système de la frangine vers un membre (visible dans « Mes messages »). */
export function notifier(membreId: number, texte: string, auteurId: number | null = null) {
	return db
		.insert(tableMessage)
		.values({ membre_id: membreId, auteur_id: auteurId, de_la_frangine: true, texte, lu: false })
		.returning()
		.get();
}

/** Nombre de messages non lus reçus par un membre (pastille de la navigation). */
export function nombreNonLus(membreId: number): number {
	const ligne = db
		.select({ n: sql<number>`count(*)` })
		.from(tableMessage)
		.where(
			and(
				eq(tableMessage.membre_id, membreId),
				eq(tableMessage.de_la_frangine, true),
				eq(tableMessage.lu, false)
			)
		)
		.get();
	return ligne?.n ?? 0;
}
