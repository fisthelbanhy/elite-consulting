/**
 * Boîte à idées (portage de `app/routers/suggestions.py` ; legacy psugest.php).
 * Inventaire : E-TRV-12, E-ADM-12, F-TRV-59 à F-TRV-63 ; arbitrage ADR-0007 T8 : dépôt réservé
 * aux connectés, anonyme en base, module « Accueil » (0) autorisé, doublon (module + texte)
 * refusé, liste et état réservés aux gestionnaires.
 */
import { and, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat, Module } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { suggestion } from '../schema/contenu.js';
import { ok, valider } from '../schemas/commun.js';
import { paginer, recherche } from '../services/fiches.js';

export const routeur = Router();
export const prefixe = '/suggestions';

type Suggestion = typeof suggestion.$inferSelect;

const MODULES_CONNUS: number[] = Object.values(Module);

const suggestionEntreeSchema = z.object({
	// `enums.Module` : 0 (Accueil) à 8 (Tous les modules).
	module: z.coerce.number().int().nullable().optional(),
	texte: z.string().max(3000).default('')
});

const etatSuggestionSchema = z.object({
	// 1 = à lire, 2 = prise en compte, 3 = supprimée.
	etat: z.coerce.number().int().min(1).max(3)
});

routeur.post('/', membreRequis, (req, res) => {
	const donnees = valider(suggestionEntreeSchema, req.body);
	const champs: Record<string, string> = {};

	// Correctif F-TRV-60 : « Accueil » (0) est un module valide.
	if (donnees.module === null || donnees.module === undefined || !MODULES_CONNUS.includes(donnees.module)) {
		champs.module = 'Veuillez indiquer le module concerné.';
	}
	const texte = donnees.texte.trim();
	if (texte.length < 10) {
		champs.texte = 'Votre suggestion doit contenir au moins 10 caractères.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Correctif F-TRV-61 : l'anti-doublon compare bien le module et le texte.
	const doublon = db
		.select({ id: suggestion.id })
		.from(suggestion)
		.where(and(eq(suggestion.module, donnees.module!), eq(suggestion.texte, texte)))
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette suggestion est déjà enregistrée.');

	// Anonyme : aucune trace de l'auteur n'est conservée.
	db.insert(suggestion)
		.values({ module: donnees.module!, texte, date: new Date(), etat: Etat.NON_TRAITE })
		.run();
	res
		.status(201)
		.json(ok("Enregistrement effectué. Merci pour votre idée : l'équipe la lira avec attention."));
});

/** Liste de gestion (F-TRV-62, F-TRV-63) : plus récentes d'abord. */
routeur.get('/', gestionnaireRequis, (req, res) => {
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const module = Number(req.query.module);
	if (Number.isFinite(module) && module >= 0 && module <= 8) {
		conditions.push(eq(suggestion.module, Math.trunc(module)));
	}
	const etat = Number(req.query.etat);
	conditions.push(
		Number.isFinite(etat) && etat >= 1
			? eq(suggestion.etat, Math.trunc(etat))
			: ne(suggestion.etat, Etat.SUPPRIME)
	);
	conditions.push(recherche(typeof req.query.q === 'string' ? req.query.q : null, suggestion.texte));

	const requete = db
		.select()
		.from(suggestion)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(suggestion.date), desc(suggestion.id))
		.$dynamic();

	res.json(paginer<Suggestion>(requete, page));
});

routeur.get('/compteurs', gestionnaireRequis, (_req, res) => {
	const n = (condition: SQL) =>
		db.select({ n: sql<number>`count(*)` }).from(suggestion).where(condition).get()?.n ?? 0;
	res.json({
		a_lire: n(eq(suggestion.etat, Etat.NON_TRAITE)),
		total: n(ne(suggestion.etat, Etat.SUPPRIME))
	});
});

routeur.post('/:id/etat', gestionnaireRequis, (req, res) => {
	const id = Number(req.params.id);
	const existe = db.select({ id: suggestion.id }).from(suggestion).where(eq(suggestion.id, id)).get();
	if (!existe) throw introuvable("Cette suggestion n'existe pas.");

	const donnees = valider(etatSuggestionSchema, req.body);
	db.update(suggestion).set({ etat: donnees.etat }).where(eq(suggestion.id, id)).run();
	res.json(ok('Modification effectuée.', id));
});
