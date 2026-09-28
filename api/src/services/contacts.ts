/**
 * Coordonnées des membres, chargées en une fois pour les vues qui en affichent plusieurs
 * (contributions reçues sous une fiche, listes du back-office).
 *
 * Ces données sont **réservées** à l'auteur d'une fiche et aux gestionnaires (ADR-0005, ADR-0007) :
 * n'appeler ces fonctions qu'après avoir vérifié le droit du lecteur.
 */
import { inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { membre as tableMembre } from '../schema/membres.js';
import { auteur, type Auteur, type ContactMembre } from '../schemas/commun.js';

/** Coordonnées des membres dont l'identifiant figure dans la liste, indexées par identifiant. */
export function contactsDe(ids: (number | null | undefined)[]): Map<number, ContactMembre> {
	const recherches = [...new Set(ids.filter((id): id is number => typeof id === 'number'))];
	if (recherches.length === 0) return new Map();
	const lignes = db
		.select({
			id: tableMembre.id,
			pseudonyme: tableMembre.pseudonyme,
			nom: tableMembre.nom,
			telephone: tableMembre.telephone,
			email: tableMembre.email
		})
		.from(tableMembre)
		.where(inArray(tableMembre.id, recherches))
		.all();
	return new Map(lignes.map((m) => [m.id, m]));
}

/**
 * Identités **publiques** des auteurs d'une liste de fiches (pseudonyme et photo, jamais le
 * téléphone ni l'e-mail). Contrairement à `contactsDe`, ces données peuvent être montrées à tous.
 */
export function auteursDe(ids: (number | null | undefined)[]): Map<number, Auteur> {
	const recherches = [...new Set(ids.filter((id): id is number => typeof id === 'number'))];
	if (recherches.length === 0) return new Map();
	const lignes = db
		.select({
			id: tableMembre.id,
			pseudonyme: tableMembre.pseudonyme,
			categorie: tableMembre.categorie,
			photo: tableMembre.photo
		})
		.from(tableMembre)
		.where(inArray(tableMembre.id, recherches))
		.all();
	return new Map(lignes.map((m) => [m.id, auteur(m)!]));
}
