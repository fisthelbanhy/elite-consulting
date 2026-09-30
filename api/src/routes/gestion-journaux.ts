/**
 * Journaux des visites anonymes et des connexions de membres (portage de
 * `app/routers/gestion_journaux.py` ; legacy `pvisite.php`). Inventaire : E-ADM-11, F-ADM-30 à
 * F-ADM-33.
 *
 * Correctifs : filtre par période fonctionnel (erreur fatale `datefr3()` dans le legacy), plage
 * horaire qui peut passer minuit, purge confirmée et réservée au droit Activation (suppression
 * physique, comme le legacy : ce sont des journaux techniques).
 */
import { and, desc, eq, gte, inArray, like, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerDroit, exigerMembre, gestionnaireRequis } from '../deps.js';
import { erreur } from '../erreurs.js';
import { visite } from '../schema/core.js';
import { membre as tableMembre, visiteMembre } from '../schema/membres.js';
import { dateFacultative, entier, ok, valider } from '../schemas/commun.js';
import { paginer } from '../services/fiches.js';
import * as svc from '../services/gestion.js';

export const routeur = Router();
export const prefixe = '/gestion/journaux';

routeur.use(gestionnaireRequis);

type Visite = typeof visite.$inferSelect;
type Connexion = typeof visiteMembre.$inferSelect;

const HEURE = /^([01]?\d|2[0-3])[:hH]?([0-5]\d)?$/;

/** « 08:30 », « 8h30 », « 8 » → minutes depuis minuit. */
function minutes(valeur: unknown, champ: string): number | null {
	const v = typeof valeur === 'string' ? valeur.trim() : '';
	if (!v) return null;
	const m = HEURE.exec(v);
	if (!m) {
		throw erreur('Heure invalide.', { [champ]: 'Heure attendue au format HH:MM (ex. 08:30).' });
	}
	return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

function jour(valeur: unknown): Date | null {
	if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
	const [a, m, j] = valeur.split('-').map(Number);
	return new Date(a!, m! - 1, j!);
}

/** Filtres de période et de plage horaire communs aux deux journaux. */
function filtres(
	colonne: SQLiteColumn,
	req: { query: Record<string, unknown> }
): (SQL | undefined)[] {
	const conditions: (SQL | undefined)[] = [];
	const du = jour(req.query.du);
	const au = jour(req.query.au);
	if (du && au && du.getTime() > au.getTime()) {
		throw erreur('Période invalide.', { au: 'La date de fin doit suivre la date de début.' });
	}
	if (du) conditions.push(gte(colonne, du));
	// Jour de fin inclus.
	if (au) conditions.push(lte(colonne, new Date(au.getTime() + 86_400_000 - 1)));

	let debut = minutes(req.query.heure_debut, 'heure_debut');
	let fin = minutes(req.query.heure_fin, 'heure_fin');
	if (debut !== null || fin !== null) {
		const minuteDuJour = sql`cast(strftime('%H', ${colonne}) as integer) * 60 + cast(strftime('%M', ${colonne}) as integer)`;
		debut = debut ?? 0;
		fin = fin ?? 24 * 60 - 1;
		conditions.push(
			debut <= fin
				? and(sql`${minuteDuJour} >= ${debut}`, sql`${minuteDuJour} <= ${fin}`)
				: // Plage qui passe minuit (ex. 22:00 → 06:00).
					or(sql`${minuteDuJour} >= ${debut}`, sql`${minuteDuJour} <= ${fin}`)
		);
	}
	return conditions;
}

/** Le legacy rattachait toutes les visites anonymes au compte système n° 1. */
function membreAffiche(membreId: number | null): boolean {
	return !!membreId && membreId !== svc.ID_COMPTE_SYSTEME;
}

function membresCourts(ids: number[]) {
	if (ids.length === 0) return new Map<number, unknown>();
	return new Map(
		db
			.select({
				id: tableMembre.id,
				pseudonyme: tableMembre.pseudonyme,
				nom: tableMembre.nom
			})
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, m])
	);
}

/** F-ADM-30 : visites anonymes (une ligne par IP et par tranche de 30 minutes). */
routeur.get('/visites', (req, res) => {
	const page = svc.paginationGestion(req);
	const conditions = filtres(visite.date_heure, req);
	const ip = typeof req.query.ip === 'string' ? req.query.ip.trim() : '';
	if (ip) conditions.push(like(visite.adresse_ip, `%${ip}%`));

	const requete = db
		.select()
		.from(visite)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(visite.date_heure), desc(visite.id))
		.$dynamic();
	const liste = paginer<Visite>(requete, page);
	const membres = membresCourts(
		liste.items.map((v) => v.membre_id).filter((i): i is number => membreAffiche(i))
	);
	res.json({
		items: liste.items.map((v) => ({
			id: v.id,
			date_heure: v.date_heure,
			adresse_ip: v.adresse_ip,
			membre: v.membre_id !== null ? (membres.get(v.membre_id) ?? null) : null
		})),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** F-ADM-31 : connexions des membres (membre, date, IP), aussi affichées sur la fiche membre. */
routeur.get('/connexions', (req, res) => {
	const moi = exigerMembre(req);
	const page = svc.paginationGestion(req);
	const conditions = filtres(visiteMembre.date_connexion, req);
	const ip = typeof req.query.ip === 'string' ? req.query.ip.trim() : '';
	if (ip) conditions.push(like(visiteMembre.adresse_ip, `%${ip}%`));
	const membreId = Number(req.query.membre_id);
	if (Number.isFinite(membreId) && membreId > 0) {
		conditions.push(eq(visiteMembre.membre_id, Math.trunc(membreId)));
	}
	if (moi.id !== svc.ID_COMPTE_SYSTEME) {
		conditions.push(ne(visiteMembre.membre_id, svc.ID_COMPTE_SYSTEME));
	}

	const requete = db
		.select()
		.from(visiteMembre)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(visiteMembre.date_connexion), desc(visiteMembre.id))
		.$dynamic();
	const liste = paginer<Connexion>(requete, page);
	const membres = membresCourts(
		liste.items.map((c) => c.membre_id).filter((i): i is number => !!i)
	);
	res.json({
		items: liste.items.map((c) => ({
			id: c.id,
			date_connexion: c.date_connexion,
			adresse_ip: c.adresse_ip,
			membre: c.membre_id !== null ? (membres.get(c.membre_id) ?? null) : null
		})),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Purge des lignes cochées (`ids`) ou de toutes les lignes antérieures à `avant`. */
const purgeEntreeSchema = z.object({
	ids: z.array(entier).max(500).default([]),
	avant: dateFacultative
});

/**
 * F-ADM-33 : purge des lignes cochées, ou de tout l'historique antérieur à une date (confirmation
 * demandée par l'interface).
 */
routeur.post('/:journal/purger', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const journal = req.params.journal;
	if (journal !== 'visites' && journal !== 'connexions') {
		throw erreur('Journal inconnu.', { journal: 'Journal inconnu.' });
	}
	const donnees = valider(purgeEntreeSchema, req.body);

	const table = journal === 'visites' ? visite : visiteMembre;
	const colonne = journal === 'visites' ? visite.date_heure : visiteMembre.date_connexion;
	let condition: SQL;
	if (donnees.ids.length) condition = inArray(table.id, donnees.ids);
	else if (donnees.avant) condition = lte(colonne, new Date(donnees.avant.getTime() - 1));
	else throw erreur('Sélectionnez au moins une ligne, ou indiquez une date.');

	const n = db.delete(table).where(condition).run().changes;
	const s = n > 1 ? 's' : '';
	res.json(ok(`${n} ligne${s} supprimée${s}.`));
});
