/**
 * Comportements communs à toutes les « fiches » du site (annonces, projets, entreprises…) :
 * pagination, recherche plein texte, compteur de consultations, modération, suppression logique.
 *
 * Portage de `app/services/fiches.py`.
 */
import { eq, ne, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { db } from '../db.js';
import { exigerDroit, type Pagination } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { peutModerer, type Membre } from '../schema/membres.js';

/** Enveloppe de liste attendue par le frontend : `{items, total, page, taille}`. */
export interface Liste<T> {
	items: T[];
	total: number;
	page: number;
	taille: number;
}

/**
 * Exécute une requête paginée et compte le total.
 *
 * Le total est obtenu en enveloppant la requête dans un `select count(*)`, ce qui reprend
 * exactement le comportement de l'ancienne version (mêmes filtres, mêmes jointures).
 */
export function paginer<T>(requete: Requete, page: Pagination): Liste<T> {
	const compte = db
		.select({ n: sql<number>`count(*)` })
		.from(sql`(${requete.getSQL()})`)
		.get();
	// Les types publics de Drizzle décrivent le constructeur de requête et acceptent mal un
	// paramètre générique ; la forme réellement disponible à l'exécution est `RequetePaginable`.
	const q = requete as unknown as RequetePaginable;
	const items = q.limit(page.taille).offset(page.offset).all() as T[];
	return { items, total: compte?.n ?? 0, page: page.page, taille: page.taille };
}

/** Toute requête Drizzle : c'est le seul membre dont `paginer` a besoin au typage. */
export interface Requete {
	getSQL(): SQL;
}

interface RequetePaginable {
	limit(n: number): RequetePaginable;
	offset(n: number): RequetePaginable;
	all(): unknown[];
}

/**
 * Condition « q apparaît dans une des colonnes » (insensible à la casse), ou `undefined`.
 *
 * Recherche insensible à la casse : `lower(colonne) LIKE lower(motif)`, comme auparavant —
 * comme dans l'ancien backend, l'insensibilité à la casse ne vaut que pour l'ASCII (SQLite ne
 * connaît pas la casse des caractères accentués).
 */
export function recherche(
	q: string | null | undefined,
	...colonnes: SQLiteColumn[]
): SQL | undefined {
	const terme = (q ?? '').trim();
	if (!terme || colonnes.length === 0) return undefined;
	const motif = `%${terme}%`;
	const conditions = colonnes.map((c) => sql`lower(${c}) like lower(${motif})`);
	return conditions.length === 1 ? conditions[0] : or(...conditions);
}

/** Une fiche porte au minimum un état et (presque toujours) un auteur. */
interface ColonnesFiche {
	etat: SQLiteColumn;
	auteur: SQLiteColumn | null;
}

/**
 * Filtre de visibilité standard : le public voit les fiches publiées (état 2) ; l'auteur voit
 * aussi les siennes (sauf supprimées) ; un gestionnaire voit tout (`undefined` = aucun filtre).
 */
export function visibilite(colonnes: ColonnesFiche, membre: Membre | null): SQL | undefined {
	if (membre && membre.type_compte === 1) return undefined;
	const publie = eq(colonnes.etat, Etat.AUTORISE);
	if (!membre || !colonnes.auteur) return publie;
	return or(
		publie,
		sql`${colonnes.auteur} = ${membre.id} and ${colonnes.etat} <> ${Etat.SUPPRIME}`
	);
}

/** Une fiche telle que manipulée par les helpers génériques. */
export interface FicheChargee {
	id: number;
	etat: number;
	[colonne: string]: unknown;
}

/**
 * Vrai si `membre` a le droit de voir cette fiche : elle est publiée, ou il en est l'auteur
 * (et elle n'est pas supprimée), ou il est gestionnaire.
 */
export function estVisible(
	fiche: FicheChargee,
	membre: Membre | null,
	colonneAuteur = 'auteur_id'
): boolean {
	if (membre && membre.type_compte === 1) return true;
	if (fiche.etat === Etat.AUTORISE) return true;
	const auteur = fiche[colonneAuteur] as number | null | undefined;
	return !!membre && auteur === membre.id && fiche.etat !== Etat.SUPPRIME;
}

/** Lève un 404 si la fiche est absente ou non visible (on ne révèle pas son existence). */
export function exigerVisible<T extends FicheChargee>(
	fiche: T | undefined | null,
	membre: Membre | null,
	{ colonneAuteur = 'auteur_id', message = 'Fiche introuvable.' } = {}
): T {
	if (!fiche) throw introuvable(message);
	if (!estVisible(fiche, membre, colonneAuteur)) throw introuvable(message);
	return fiche;
}

/**
 * Legacy : chaque consultation par un tiers (ni auteur ni gestionnaire) incrémente le compteur.
 * Écrit directement en base et met la fiche chargée à jour, pour que la réponse soit cohérente.
 */
export function compterVisite(
	table: {
		nombre_visites: SQLiteColumn;
		date_derniere_visite: SQLiteColumn;
		id: SQLiteColumn;
	},
	fiche: FicheChargee & { nombre_visites?: number | null },
	membre: Membre | null,
	colonneAuteur = 'auteur_id'
): void {
	const auteur = fiche[colonneAuteur] as number | null | undefined;
	if (membre && (membre.type_compte === 1 || auteur === membre.id)) return;
	const maintenant = new Date();
	const nouveau = (fiche.nombre_visites ?? 0) + 1;
	db.update(table as never)
		.set({ nombre_visites: nouveau, date_derniere_visite: maintenant })
		.where(eq(table.id, fiche.id))
		.run();
	fiche.nombre_visites = nouveau;
	fiche.date_derniere_visite = maintenant;
}

/** Les états connus, pour valider une demande de modération. */
const ETATS_CONNUS: number[] = Object.values(Etat);

/** Modération : réservée au gestionnaire ayant le droit « Activation ». */
export function changerEtat(
	table: { id: SQLiteColumn; etat: SQLiteColumn },
	ficheId: number,
	etat: number,
	membre: Membre | null
): void {
	exigerDroit(membre, 'activation');
	if (!ETATS_CONNUS.includes(etat)) throw erreur('État inconnu.', { etat: 'État inconnu.' });
	db.update(table as never)
		.set({ etat })
		.where(eq(table.id, ficheId))
		.run();
}

/** Suppression logique (état 3) par l'auteur ou un gestionnaire habilité. */
export function supprimer(
	table: { id: SQLiteColumn; etat: SQLiteColumn },
	fiche: FicheChargee,
	membre: Membre | null,
	colonneAuteur = 'auteur_id'
): void {
	const auteur = fiche[colonneAuteur] as number | null | undefined;
	if (!(membre && (auteur === membre.id || peutModerer(membre)))) {
		throw interdit("Seul l'auteur de la fiche ou un gestionnaire habilité peut la supprimer.");
	}
	db.update(table as never)
		.set({ etat: Etat.SUPPRIME })
		.where(eq(table.id, fiche.id))
		.run();
	fiche.etat = Etat.SUPPRIME;
}

/** Condition « fiche non supprimée », utilisée par les listes publiques. */
export function nonSupprimee(colonneEtat: SQLiteColumn): SQL {
	return ne(colonneEtat, Etat.SUPPRIME);
}
