/**
 * Tarifs bancaires — « Bench marking » (portage de `app/routers/tarifs_bancaires.py` ; legacy
 * incl-choix7C.php, incl-benchmarking.php, pbenchmarking-2.php ; tables benchmarking1/2/3).
 * Inventaire : S7-15 à S7-17, F-S7-41 à F-S7-43, ADR-0007 S7b.
 *
 * Référentiel à 3 niveaux : type d'opération → opération → tarif par banque (texte libre).
 * Consultation par les membres connectés sous forme de tableau comparatif par banque ; gestion du
 * référentiel par les gestionnaires habilités ; saisie des tarifs par ces gestionnaires ou par le
 * membre « banque » rattaché à la banque (`banque.membre_id`). Un seul tarif actif par banque et
 * par opération (la règle legacy banque + opération + tarif est donc toujours respectée).
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerDroit, exigerMembre, membreRequis } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { banque as tableBanque } from '../schema/core.js';
import { benchOperation, benchTarif, benchType } from '../schema/finance.js';
import { peutModerer, type Membre } from '../schema/membres.js';
import { entierFacultatif, ok, valider } from '../schemas/commun.js';
import { initialiser, referentielVide } from '../services/tarifs-bancaires.js';
import { estAutres, type Banque } from '../services/tresorerie.js';

export const routeur = Router();
export const prefixe = '/tarifs-bancaires';

const ACTIF = Etat.AUTORISE;

const libelleEntreeSchema = z.object({ libelle: z.string().max(120).default('') });
const operationEntreeSchema = z.object({
	type_id: entierFacultatif,
	libelle: z.string().max(120).default('')
});
const tarifEntreeSchema = z.object({
	operation_id: entierFacultatif,
	banque_id: entierFacultatif,
	tarif: z.string().max(100).default('')
});
const tarifModificationSchema = z.object({ tarif: z.string().max(100).default('') });
/**
 * Saisie de tous les tarifs d'une banque en une fois : `{operation_id: tarif}` ; un tarif vide
 * retire le tarif existant.
 */
const grilleEntreeSchema = z.object({
	tarifs: z.record(z.string(), z.string()).default({})
});

/** Banques actives du comparatif ; « Autres » n'est pas une colonne. */
function banquesActives(): Banque[] {
	return db
		.select()
		.from(tableBanque)
		.where(eq(tableBanque.etat, ACTIF))
		.orderBy(asc(tableBanque.nom))
		.all()
		.filter((b) => !estAutres(b));
}

function banquesGerees(membre: Membre): number[] {
	if (peutModerer(membre)) return banquesActives().map((b) => b.id);
	return db
		.select({ id: tableBanque.id })
		.from(tableBanque)
		.where(and(eq(tableBanque.membre_id, membre.id), eq(tableBanque.etat, ACTIF)))
		.all()
		.map((b) => b.id);
}

/** Saisie des tarifs : un gestionnaire habilité, ou la banque elle-même. */
function verifierSaisie(membre: Membre, banqueId: number): Banque {
	const banque = db.select().from(tableBanque).where(eq(tableBanque.id, banqueId)).get();
	if (!banque || banque.etat !== ACTIF || estAutres(banque)) {
		throw erreur('Veuillez indiquer la banque concernée.', {
			banque_id: 'Veuillez indiquer la banque concernée.'
		});
	}
	if (!peutModerer(membre) && banque.membre_id !== membre.id) {
		throw interdit(
			'Seuls un gestionnaire habilité ou la banque elle-même peuvent saisir ses tarifs.'
		);
	}
	return banque;
}

/** Consultation par banque (filtre `banque_id`, répétable) et/ou par type d'opération (F-S7-41). */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	let banques = banquesActives();

	const brut = req.query.banque_id;
	const filtre = (Array.isArray(brut) ? brut : brut === undefined ? [] : [brut])
		.map((v) => Number(v))
		.filter((n) => Number.isFinite(n) && n > 0)
		.map(Math.trunc);
	if (filtre.length) banques = banques.filter((b) => filtre.includes(b.id));
	const idsBanques = new Set(banques.map((b) => b.id));

	const typeId = Number(req.query.type_id);
	const conditionsTypes = [eq(benchType.etat, ACTIF)];
	if (Number.isFinite(typeId) && typeId > 0) {
		conditionsTypes.push(eq(benchType.id, Math.trunc(typeId)));
	}
	const types = db
		.select()
		.from(benchType)
		.where(and(...conditionsTypes))
		.orderBy(asc(benchType.id))
		.all();

	const operations = types.length
		? db
				.select()
				.from(benchOperation)
				.where(
					and(
						eq(benchOperation.etat, ACTIF),
						inArray(
							benchOperation.type_id,
							types.map((t) => t.id)
						)
					)
				)
				.orderBy(asc(benchOperation.id))
				.all()
		: [];
	const tarifs = operations.length
		? db
				.select()
				.from(benchTarif)
				.where(
					and(
						eq(benchTarif.etat, ACTIF),
						inArray(
							benchTarif.operation_id,
							operations.map((o) => o.id)
						)
					)
				)
				.orderBy(asc(benchTarif.id))
				.all()
		: [];

	const parOperation = new Map<number, { id: number; banque_id: number; tarif: string }[]>();
	let nombreTarifs = 0;
	for (const t of tarifs) {
		if (!idsBanques.has(t.banque_id)) continue;
		const liste = parOperation.get(t.operation_id) ?? [];
		liste.push({ id: t.id, banque_id: t.banque_id, tarif: t.tarif });
		parOperation.set(t.operation_id, liste);
		nombreTarifs += 1;
	}

	res.json({
		banques: banques.map((b) => ({ id: b.id, sigle: b.sigle, nom: b.nom })),
		types: types.map((ty) => ({
			id: ty.id,
			libelle: ty.libelle,
			operations: operations
				.filter((o) => o.type_id === ty.id)
				.map((o) => ({
					id: o.id,
					libelle: o.libelle,
					type_id: o.type_id,
					tarifs: parOperation.get(o.id) ?? []
				}))
		})),
		nombre_tarifs: nombreTarifs,
		referentiel_vide: referentielVide(),
		// Contexte du lecteur.
		peut_gerer_referentiel: peutModerer(membre),
		banques_gerees: banquesGerees(membre)
	});
});

routeur.post('/initialiser', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	if (!referentielVide()) {
		throw erreur("Le référentiel contient déjà des types d'opérations.");
	}
	const n = db.transaction(() => initialiser());
	res.status(201).json(ok(`Référentiel initialisé : ${n.types} types et ${n.operations} opérations.`));
});

// --- Niveau 1 : types d'opérations ---------------------------------------------------------------

function validerType(libelle: string, exclureId?: number): void {
	if (libelle.length < 4) {
		throw erreur("Le type de l'opération doit avoir 4 caractères minimum.", {
			libelle: "Le type de l'opération doit avoir 4 caractères minimum."
		});
	}
	const conditions = [
		sql`lower(${benchType.libelle}) = ${libelle.toLowerCase()}`,
		ne(benchType.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(benchType.id, exclureId));
	const doublon = db
		.select({ id: benchType.id })
		.from(benchType)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur("Ce type d'opération est déjà enregistré.", {
			libelle: "Ce type d'opération est déjà enregistré."
		});
	}
}

routeur.post('/types', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const donnees = valider(libelleEntreeSchema, req.body);
	const libelle = donnees.libelle.trim();
	validerType(libelle);
	const ty = db.insert(benchType).values({ libelle, etat: ACTIF }).returning().get()!;
	res.status(201).json(ok('Enregistrement effectué.', ty.id));
});

function obtenirType(id: number) {
	const ty = db.select().from(benchType).where(eq(benchType.id, id)).get();
	if (!ty || ty.etat === Etat.SUPPRIME) throw introuvable("Ce type d'opération n'existe pas.");
	return ty;
}

routeur.put('/types/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const ty = obtenirType(Number(req.params.id));
	const donnees = valider(libelleEntreeSchema, req.body);
	const libelle = donnees.libelle.trim();
	validerType(libelle, ty.id);
	db.update(benchType).set({ libelle }).where(eq(benchType.id, ty.id)).run();
	res.json(ok('Modification effectuée.', ty.id));
});

routeur.delete('/types/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const ty = obtenirType(Number(req.params.id));
	db.transaction(() => {
		db.update(benchType).set({ etat: Etat.SUPPRIME }).where(eq(benchType.id, ty.id)).run();
		// Les opérations rattachées suivent le type.
		db.update(benchOperation)
			.set({ etat: Etat.SUPPRIME })
			.where(eq(benchOperation.type_id, ty.id))
			.run();
	});
	res.json(ok("Type d'opération supprimé.", ty.id));
});

// --- Niveau 2 : opérations -----------------------------------------------------------------------

function validerOperation(
	d: z.output<typeof operationEntreeSchema>,
	exclureId?: number
): string {
	const libelle = d.libelle.trim();
	const champs: Record<string, string> = {};
	const ty = d.type_id
		? db.select().from(benchType).where(eq(benchType.id, d.type_id)).get()
		: undefined;
	if (!d.type_id || !ty || ty.etat === Etat.SUPPRIME) {
		champs.type_id = 'Chaque opération doit être liée à un type.';
	}
	if (libelle.length < 4) champs.libelle = "L'opération doit avoir 4 caractères minimum.";
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		eq(benchOperation.type_id, d.type_id!),
		sql`lower(${benchOperation.libelle}) = ${libelle.toLowerCase()}`,
		ne(benchOperation.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(benchOperation.id, exclureId));
	const doublon = db
		.select({ id: benchOperation.id })
		.from(benchOperation)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Opération déjà enregistrée.', { libelle: 'Opération déjà enregistrée.' });
	}
	return libelle;
}

routeur.post('/operations', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const donnees = valider(operationEntreeSchema, req.body);
	const libelle = validerOperation(donnees);
	const op = db
		.insert(benchOperation)
		.values({ type_id: donnees.type_id!, libelle, etat: ACTIF })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', op.id));
});

function obtenirOperation(id: number) {
	const op = db.select().from(benchOperation).where(eq(benchOperation.id, id)).get();
	if (!op || op.etat === Etat.SUPPRIME) throw introuvable("Cette opération n'existe pas.");
	return op;
}

routeur.put('/operations/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const op = obtenirOperation(Number(req.params.id));
	const donnees = valider(operationEntreeSchema, req.body);
	const libelle = validerOperation(donnees, op.id);
	db.update(benchOperation)
		.set({ type_id: donnees.type_id!, libelle })
		.where(eq(benchOperation.id, op.id))
		.run();
	res.json(ok('Modification effectuée.', op.id));
});

routeur.delete('/operations/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const op = obtenirOperation(Number(req.params.id));
	db.update(benchOperation)
		.set({ etat: Etat.SUPPRIME })
		.where(eq(benchOperation.id, op.id))
		.run();
	res.json(ok('Opération supprimée.', op.id));
});

// --- Niveau 3 : tarifs par banque ----------------------------------------------------------------

function tarifActif(operationId: number, banqueId: number) {
	return db
		.select()
		.from(benchTarif)
		.where(
			and(
				eq(benchTarif.operation_id, operationId),
				eq(benchTarif.banque_id, banqueId),
				eq(benchTarif.etat, ACTIF)
			)
		)
		.limit(1)
		.get();
}

routeur.post('/tarifs', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(tarifEntreeSchema, req.body);
	if (!donnees.banque_id) {
		throw erreur('Veuillez indiquer la banque concernée.', {
			banque_id: 'Veuillez indiquer la banque concernée.'
		});
	}
	const banque = verifierSaisie(membre, donnees.banque_id);

	const champs: Record<string, string> = {};
	const op = donnees.operation_id
		? db.select().from(benchOperation).where(eq(benchOperation.id, donnees.operation_id)).get()
		: undefined;
	if (!donnees.operation_id || !op || op.etat !== ACTIF) {
		champs.operation_id = "Veuillez indiquer l'opération.";
	}
	const tarif = donnees.tarif.trim();
	if (!tarif) champs.tarif = 'Le tarif doit avoir 1 caractère minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	if (tarifActif(donnees.operation_id!, banque.id)) {
		throw erreur(
			'Un tarif est déjà enregistré pour cette banque et cette opération : modifiez-le.'
		);
	}
	const t = db
		.insert(benchTarif)
		.values({ operation_id: donnees.operation_id!, banque_id: banque.id, tarif, etat: ACTIF })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', t.id));
});

function obtenirTarif(id: number, membre: Membre) {
	const t = db.select().from(benchTarif).where(eq(benchTarif.id, id)).get();
	if (!t || t.etat === Etat.SUPPRIME) throw introuvable("Ce tarif n'existe pas.");
	verifierSaisie(membre, t.banque_id);
	return t;
}

/** Modification effective (le legacy visait une colonne inexistante, F-S7-42). */
routeur.put('/tarifs/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const t = obtenirTarif(Number(req.params.id), membre);
	const donnees = valider(tarifModificationSchema, req.body);
	const tarif = donnees.tarif.trim();
	if (!tarif) {
		throw erreur('Le tarif doit avoir 1 caractère minimum.', {
			tarif: 'Le tarif doit avoir 1 caractère minimum.'
		});
	}
	db.update(benchTarif).set({ tarif }).where(eq(benchTarif.id, t.id)).run();
	res.json(ok('Modification effectuée.', t.id));
});

routeur.delete('/tarifs/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const t = obtenirTarif(Number(req.params.id), membre);
	db.update(benchTarif).set({ etat: Etat.SUPPRIME }).where(eq(benchTarif.id, t.id)).run();
	res.json(ok('Tarif retiré.', t.id));
});

/** Saisie de tous les tarifs d'une banque (une ligne par opération). */
routeur.put('/banques/:banqueId', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const banque = verifierSaisie(membre, Number(req.params.banqueId));
	const donnees = valider(grilleEntreeSchema, req.body);
	const operations = new Set(
		db
			.select({ id: benchOperation.id })
			.from(benchOperation)
			.where(eq(benchOperation.etat, ACTIF))
			.all()
			.map((o) => o.id)
	);

	const changes = db.transaction(() => {
		let n = 0;
		for (const [cle, valeur] of Object.entries(donnees.tarifs)) {
			const operationId = Number(cle);
			if (!Number.isFinite(operationId) || !operations.has(operationId)) continue;
			const tarif = (valeur || '').trim().slice(0, 100);
			const existant = tarifActif(operationId, banque.id);
			if (existant && !tarif) {
				db.update(benchTarif)
					.set({ etat: Etat.SUPPRIME })
					.where(eq(benchTarif.id, existant.id))
					.run();
				n += 1;
			} else if (existant && existant.tarif !== tarif) {
				db.update(benchTarif).set({ tarif }).where(eq(benchTarif.id, existant.id)).run();
				n += 1;
			} else if (!existant && tarif) {
				db.insert(benchTarif)
					.values({ operation_id: operationId, banque_id: banque.id, tarif, etat: ACTIF })
					.run();
				n += 1;
			}
		}
		return n;
	});

	res.json(
		ok(
			`Tarifs de ${banque.nom} enregistrés (${changes} modification${changes > 1 ? 's' : ''}).`,
			banque.id
		)
	);
});
