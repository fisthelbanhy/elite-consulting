/**
 * Paiements : préparation, déclaration par le membre, historique, confirmation / rejet par la
 * caisse (portage de `app/routers/paiements.py` ; legacy ppayement.php, droit « Caisse »).
 * Voir `services/paiements.ts`.
 */
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerDroit, exigerMembre, membreRequis, pagination } from '../deps.js';
import { introuvable } from '../erreurs.js';
import { paiement } from '../schema/commerce.js';
import { parametre } from '../schema/core.js';
import { entierFacultatifRequete, entierRequis, ok, valider } from '../schemas/commun.js';
import { contactsDe } from '../services/contacts.js';
import { paginer, recherche } from '../services/fiches.js';
import { confirmer, CONSIGNES, enregistrer, rejeter, traitement } from '../services/paiements.js';

export const routeur = Router();
export const prefixe = '/paiements';

type Paiement = typeof paiement.$inferSelect;

const declarationSchema = z.object({
	type_objet: z.coerce.number().int(),
	objet_id: z.coerce.number().int().nullable().optional(),
	mode: z.coerce.number().int().min(1).max(3),
	montant: z.coerce.number().int().nullable().optional(),
	remarque: z.string().max(500).default('')
});

/** Vue d'un paiement, avec l'identité du payeur (réservée à la caisse et au payeur lui-même). */
function vuePaiement(
	p: Paiement,
	payeurs: Map<number, { id: number; pseudonyme: string; nom: string }>
) {
	return {
		id: p.id,
		type_objet: p.type_objet,
		objet_id: p.objet_id,
		date_paiement: p.date_paiement,
		mode: p.mode,
		montant: p.montant,
		remarque: p.remarque,
		etat: p.etat,
		date_confirmation: p.date_confirmation,
		membre: p.membre_id !== null ? (payeurs.get(p.membre_id) ?? null) : null
	};
}

function payeursDe(paiements: Paiement[]) {
	const contacts = contactsDe(paiements.map((p) => p.membre_id));
	return new Map(
		[...contacts].map(([id, c]) => [id, { id: c.id, pseudonyme: c.pseudonyme, nom: c.nom }])
	);
}

/** `type_objet` est obligatoire, `objet_id` facultatif — comme la signature Python d'origine. */
const preparerSchema = z.object({
	type_objet: entierRequis(),
	objet_id: entierFacultatifRequete()
});

routeur.get('/preparer', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { type_objet: typeObjet, objet_id: objetId } = valider(preparerSchema, req.query);
	const t = traitement(typeObjet);
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();

	res.json({
		type_objet: typeObjet,
		objet_id: objetId,
		libelle: t.libelle(membre, objetId),
		montant: t.montant ? t.montant(membre, objetId) : null,
		retour: t.retour ? t.retour(membre, objetId) : '/espace/paiements',
		consignes: CONSIGNES,
		numeros: [p?.telephone_1, p?.telephone_2].filter((n): n is string => !!n)
	});
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(declarationSchema, req.body);
	const p = enregistrer({
		membre,
		typeObjet: donnees.type_objet,
		objetId: donnees.objet_id ?? null,
		mode: donnees.mode,
		montant: donnees.montant ?? null,
		remarque: donnees.remarque
	});
	res
		.status(201)
		.json(ok('Paiement enregistré. Il sera confirmé par notre caisse après vérification.', p.id));
});

routeur.get('/miens', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const requete = db
		.select()
		.from(paiement)
		.where(eq(paiement.membre_id, membre.id))
		.orderBy(desc(paiement.date_paiement))
		.$dynamic();

	const liste = paginer<Paiement>(requete, page);
	const payeurs = payeursDe(liste.items);
	res.json({
		items: liste.items.map((p) => vuePaiement(p, payeurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

function entierQuery(valeur: unknown, min = 1): number | null {
	const n = Number(valeur);
	return Number.isFinite(n) && Math.trunc(n) >= min ? Math.trunc(n) : null;
}

/** Début (00:00:00) ou fin (23:59:59.999) d'une journée donnée en `AAAA-MM-JJ`. */
function bornerJour(valeur: unknown, fin: boolean): Date | null {
	if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
	return new Date(`${valeur}T${fin ? '23:59:59.999' : '00:00:00.000'}`);
}

/**
 * Liste de la caisse (legacy ppayement.php) : réservée aux gestionnaires ayant le droit
 * « Caisse ».
 */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'caisse');
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const etat = entierQuery(req.query.etat);
	if (etat) conditions.push(eq(paiement.etat, etat));

	const mode = entierQuery(req.query.mode);
	if (mode) conditions.push(eq(paiement.mode, mode));

	const typeObjet = entierQuery(req.query.type_objet);
	if (typeObjet) conditions.push(eq(paiement.type_objet, typeObjet));

	const membreId = entierQuery(req.query.membre_id);
	if (membreId) conditions.push(eq(paiement.membre_id, membreId));

	const montantMax = entierQuery(req.query.montant_max, 0);
	if (montantMax !== null) conditions.push(lte(paiement.montant, montantMax));

	const du = bornerJour(req.query.du, false);
	if (du) conditions.push(gte(paiement.date_paiement, du));

	// Correctif legacy : le jour de fin est inclus.
	const au = bornerJour(req.query.au, true);
	if (au) conditions.push(lte(paiement.date_paiement, au));

	conditions.push(
		recherche(typeof req.query.q === 'string' ? req.query.q : null, paiement.remarque)
	);

	const filtre = and(...conditions.filter(Boolean));
	const somme =
		db
			.select({ total: sql<number>`coalesce(sum(${paiement.montant}), 0)` })
			.from(paiement)
			.where(filtre)
			.get()?.total ?? 0;

	const requete = db
		.select()
		.from(paiement)
		.where(filtre)
		.orderBy(desc(paiement.date_paiement))
		.$dynamic();

	const liste = paginer<Paiement>(requete, page);
	const payeurs = payeursDe(liste.items);
	res.json({
		items: liste.items.map((p) => vuePaiement(p, payeurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille,
		somme
	});
});

function lirePaiement(id: number): Paiement {
	const p = db.select().from(paiement).where(eq(paiement.id, id)).get();
	if (!p) throw introuvable('Paiement introuvable.');
	return p;
}

routeur.post('/:id/confirmer', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'caisse');
	const id = Number(req.params.id);
	confirmer(lirePaiement(id), membre);
	res.json(ok('Paiement confirmé.', id));
});

routeur.post('/:id/rejeter', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'caisse');
	const id = Number(req.params.id);
	rejeter(lirePaiement(id), membre);
	res.json(ok('Paiement rejeté : les effets de la commande ont été annulés.', id));
});
