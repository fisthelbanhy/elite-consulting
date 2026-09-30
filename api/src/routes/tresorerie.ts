/**
 * Trésorerie : placement, opération bancaire, demande de crédit, contentieux (portage de
 * `app/routers/tresorerie.py` ; legacy choix7.php cgb=2, incl-choix7B.php, incl-choix7B1.php,
 * incl-placement.php, incl-operationbanque.php, incl-dmdcredit.php, incl-contentcredit.php).
 * Inventaire : S7-8 à S7-13, F-S7-22 à F-S7-36.
 *
 * Réservé aux membres connectés. Un membre ne voit que ses fiches ; un gestionnaire les voit
 * toutes. Annulation (état 3) par le titulaire ou un gestionnaire habilité, y compris pour le
 * contentieux (correctif F-S7-24) ; changement d'état par un gestionnaire habilité
 * (correctif F-S7-28).
 */
import { and, desc, eq, gte, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination } from '../deps.js';
import { Devise, Etat, TypeOperationBanque, TypePlacement } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { banque as tableBanque, parametre } from '../schema/core.js';
import { contentieuxCredit, demandeCredit, operationBanque, placement } from '../schema/finance.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import {
	auteur,
	dateFacultative,
	entier,
	entierFacultatif,
	ok,
	valider,
	type Auteur
} from '../schemas/commun.js';
import { envoyerEnArrierePlan } from '../services/emails.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import { nouvelleReference, Prefixe } from '../services/references.js';
import * as t from '../services/tresorerie.js';

export const routeur = Router();
export const prefixe = '/tresorerie';

type Placement = typeof placement.$inferSelect;
type Operation = typeof operationBanque.$inferSelect;
type Credit = typeof demandeCredit.$inferSelect;
type Contentieux = typeof contentieuxCredit.$inferSelect;

const LIBELLES_ETAT: Record<number, string> = {
	1: 'en attente',
	2: 'enregistrée',
	3: 'annulée',
	4: 'traitée'
};

/** Une rubrique de trésorerie : sa table, son libellé dans les messages et son lien de retour. */
interface Rubrique {
	chemin: string;
	table: SQLiteTable & { id: SQLiteColumn; etat: SQLiteColumn; membre_id: SQLiteColumn };
	libelle: string;
	lien: string;
}

/** Toute fiche de trésorerie : identifiant, titulaire, état, référence. */
interface Fiche {
	id: number;
	membre_id: number | null;
	etat: number;
	reference: string;
}

const PLACEMENT: Rubrique = {
	chemin: 'placements',
	table: placement as never,
	libelle: 'demande de placement',
	lien: '/tresorerie/placements'
};
const OPERATION: Rubrique = {
	chemin: 'operations',
	table: operationBanque as never,
	libelle: 'opération bancaire',
	lien: '/tresorerie/operations'
};
const CREDIT: Rubrique = {
	chemin: 'credits',
	table: demandeCredit as never,
	libelle: 'demande de crédit',
	lien: '/tresorerie/credits'
};
const CONTENTIEUX: Rubrique = {
	chemin: 'contentieux',
	table: contentieuxCredit as never,
	libelle: 'dossier de contentieux',
	lien: '/tresorerie/contentieux'
};

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

// --- Règles communes -----------------------------------------------------------------------------

/** Filtre de visibilité : ses fiches pour un membre, toutes pour un gestionnaire. */
function conditionsVisibles(
	colonnes: { etat: SQLiteColumn; membre_id: SQLiteColumn },
	membre: Membre,
	etat: number | null
): (SQL | undefined)[] {
	if (membre.type_compte === 1) {
		return [etat ? eq(colonnes.etat, etat) : ne(colonnes.etat, Etat.SUPPRIME)];
	}
	const conditions: (SQL | undefined)[] = [
		eq(colonnes.membre_id, membre.id),
		ne(colonnes.etat, Etat.SUPPRIME)
	];
	if (etat && etat !== Etat.SUPPRIME) conditions.push(eq(colonnes.etat, etat));
	return conditions;
}

function obtenir<T extends Fiche>(r: Rubrique, id: number, membre: Membre): T {
	const fiche = db.select().from(r.table).where(eq(r.table.id, id)).get() as unknown as
		T | undefined;
	if (
		fiche &&
		(membre.type_compte === 1 || (fiche.membre_id === membre.id && fiche.etat !== Etat.SUPPRIME))
	) {
		return fiche;
	}
	throw introuvable("Cette fiche n'existe pas ou ne vous est pas accessible.");
}

function peutModifierFiche(fiche: Fiche, membre: Membre): boolean {
	return (
		peutModerer(membre) ||
		(fiche.membre_id === membre.id &&
			(fiche.etat === Etat.NON_TRAITE || fiche.etat === Etat.AUTORISE))
	);
}

function verifierModificationFiche(fiche: Fiche, membre: Membre): void {
	if (!peutModifierFiche(fiche, membre)) {
		throw interdit(
			"Seul le titulaire de la fiche (tant qu'elle n'est pas traitée) ou un gestionnaire habilité " +
				'peut la modifier.'
		);
	}
}

/** Droits du lecteur sur une fiche de trésorerie. */
function contexte(fiche: Fiche, membre: Membre) {
	return {
		peut_modifier: peutModifierFiche(fiche, membre),
		peut_moderer: peutModerer(membre),
		peut_annuler:
			fiche.etat !== Etat.SUPPRIME && (fiche.membre_id === membre.id || peutModerer(membre))
	};
}

/** `POST /{id}/etat` (gestionnaire habilité, membre prévenu) et `DELETE /{id}` (annulation). */
function routesCommunes(r: Rubrique): void {
	routeur.post(`/${r.chemin}/:id/etat`, membreRequis, (req, res) => {
		const membre = exigerMembre(req);
		const fiche = obtenir(r, Number(req.params.id), membre);
		const donnees = valider(etatEntreeSchema, req.body);

		db.transaction(() => {
			changerEtat(r.table, fiche.id, donnees.etat, membre);
			if (fiche.membre_id && fiche.membre_id !== membre.id && donnees.etat !== fiche.etat) {
				db.insert(tableMessage)
					.values({
						membre_id: fiche.membre_id,
						auteur_id: null,
						de_la_frangine: true,
						texte:
							`Votre ${r.libelle} ${fiche.reference} est désormais ` +
							`« ${LIBELLES_ETAT[donnees.etat]} ». Détails sur ${r.lien}/${fiche.id}`
					})
					.run();
			}
		});
		res.json(ok('Modification effectuée.', fiche.id, fiche.reference));
	});

	routeur.delete(`/${r.chemin}/:id`, membreRequis, (req, res) => {
		const membre = exigerMembre(req);
		const fiche = obtenir(r, Number(req.params.id), membre);
		if (fiche.etat === Etat.SUPPRIME) throw erreur('Cette fiche est déjà annulée.');
		if (fiche.membre_id !== membre.id && !peutModerer(membre)) {
			throw interdit("Seul le titulaire de la fiche ou un gestionnaire habilité peut l'annuler.");
		}
		db.update(r.table)
			.set({ etat: Etat.SUPPRIME } as never)
			.where(eq(r.table.id, fiche.id))
			.run();
		res.json(ok('La fiche est annulée.', fiche.id, fiche.reference));
	});
}

routeur.get('/compteurs', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const compter = (table: Rubrique['table']) =>
		db
			.select({ n: sql<number>`count(*)` })
			.from(table)
			.where(and(...conditionsVisibles(table, membre, null).filter(Boolean)))
			.get()?.n ?? 0;
	res.json({
		placements: compter(PLACEMENT.table),
		operations: compter(OPERATION.table),
		credits: compter(CREDIT.table),
		contentieux: compter(CONTENTIEUX.table)
	});
});

function banques(): Map<number, t.Banque> {
	return new Map(
		db
			.select()
			.from(tableBanque)
			.all()
			.map((b) => [b.id, b])
	);
}

function banqueCourte(b: t.Banque) {
	return { id: b.id, sigle: b.sigle, nom: b.nom };
}

function titulaire(id: number | null): Auteur | null {
	if (!id) return null;
	return auteur(db.select().from(tableMembre).where(eq(tableMembre.id, id)).get());
}

function nombreQuery(req: { query: Record<string, unknown> }, cle: string): number | null {
	const v = Number(req.query[cle]);
	return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
}

function jourQuery(valeur: unknown): Date | null {
	if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
	const [a, m, j] = valeur.split('-').map(Number);
	return new Date(a!, m! - 1, j!);
}

// --- Placement (S7-9) ----------------------------------------------------------------------------

const placementEntreeSchema = z.object({
	type_placement: entierFacultatif,
	montant: entierFacultatif,
	duree_mois: entierFacultatif,
	taux: z
		.union([z.literal(''), z.null(), z.coerce.number().min(0)])
		.optional()
		.transform((v) => (v === '' || v === null || v === undefined ? null : v)),
	banques: z.array(entier).default([]),
	secteur_activite: z.string().max(120).default(''),
	observation: z.string().max(3000).default('')
});

type PlacementEntree = z.output<typeof placementEntreeSchema>;

function vuePlacement(f: Placement, refs: Map<number, t.Banque>) {
	const ids = t.idsBanques(f.banque);
	return {
		id: f.id,
		reference: f.reference,
		date_placement: f.date_placement,
		type_placement: f.type_placement,
		montant: f.montant,
		duree_mois: f.duree_mois,
		taux: f.taux,
		etat: f.etat,
		membre: titulaire(f.membre_id),
		banques: ids.filter((i) => refs.has(i)).map((i) => banqueCourte(refs.get(i)!))
	};
}

routeur.get('/placements', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const brutEtat = nombreQuery(req, 'etat');
	const etat = brutEtat && brutEtat <= 4 ? brutEtat : null;
	const conditions = conditionsVisibles(placement, membre, etat);

	const typePlacement = nombreQuery(req, 'type_placement');
	if (typePlacement && typePlacement <= 2) {
		conditions.push(eq(placement.type_placement, typePlacement));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			placement.reference,
			placement.observation,
			placement.secteur_activite
		)
	);

	const requete = db
		.select()
		.from(placement)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(placement.date_placement), desc(placement.id))
		.$dynamic();
	const liste = paginer<Placement>(requete, page);
	const refs = banques();
	res.json({
		items: liste.items.map((f) => vuePlacement(f, refs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/placements/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Placement & Fiche>(PLACEMENT, Number(req.params.id), membre);
	res.json({
		...vuePlacement(f, banques()),
		secteur_activite: f.secteur_activite,
		observation: f.observation,
		banques_ids: t.idsBanques(f.banque),
		...contexte(f, membre)
	});
});

function validerPlacement(d: PlacementEntree, membreId: number, exclureId?: number): number[] {
	const champs: Record<string, string> = {};
	const typesConnus: number[] = Object.values(TypePlacement);
	if (!d.type_placement || !typesConnus.includes(d.type_placement)) {
		champs.type_placement = 'Indiquez le type de placement.';
	}
	if (!d.montant) champs.montant = 'Veuillez indiquer le montant à placer.';
	if (!d.duree_mois) champs.duree_mois = 'Veuillez indiquer la durée du placement.';
	else if (d.duree_mois > 120) {
		champs.duree_mois = 'La durée du placement ne peut pas dépasser 120 mois.';
	}
	if (!d.taux) champs.taux = 'Veuillez indiquer le taux escompté.';
	else if (d.taux > 100) champs.taux = 'Le taux doit être inférieur ou égal à 100 %.';

	const ids = d.banques
		.map((i) => t.banqueValide(i))
		.filter((b): b is t.Banque => b !== null)
		.map((b) => b.id);
	// Contrôle jamais déclenché dans le legacy (F-S7-25).
	if (ids.length === 0) champs.banques = 'Veuillez indiquer la ou les banques.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Anti-doublon clarifié (F-S7-27) : même membre, même placement — plus sur la seule observation.
	const conditions = [
		eq(placement.membre_id, membreId),
		eq(placement.type_placement, d.type_placement!),
		eq(placement.montant, d.montant!),
		eq(placement.duree_mois, d.duree_mois!),
		eq(placement.taux, d.taux!),
		eq(placement.banque, t.serialiserBanques(ids)),
		ne(placement.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(placement.id, exclureId));
	const doublon = db
		.select({ id: placement.id })
		.from(placement)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Placement déjà effectué.');
	return ids;
}

function champsPlacement(d: PlacementEntree, ids: number[]) {
	return {
		type_placement: d.type_placement || TypePlacement.DEPOT_A_TERME,
		montant: d.montant || 0,
		duree_mois: d.duree_mois || 0,
		taux: d.taux || 0,
		banque: t.serialiserBanques(ids),
		// Le secteur d'activité n'a de sens que pour un investissement.
		secteur_activite:
			d.type_placement === TypePlacement.INVESTISSEMENT ? d.secteur_activite.trim() : '',
		observation: d.observation.trim()
	};
}

routeur.post('/placements', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(placementEntreeSchema, req.body);
	const ids = validerPlacement(donnees, membre.id);
	const f = db
		.insert(placement)
		.values({
			membre_id: membre.id,
			etat: Etat.AUTORISE,
			date_placement: new Date(),
			reference: nouvelleReference(Prefixe.PLACEMENT),
			...champsPlacement(donnees, ids)
		})
		.returning()
		.get()!;
	res.status(201).json(ok('Le placement est enregistré.', f.id, f.reference));
});

routeur.put('/placements/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Placement & Fiche>(PLACEMENT, Number(req.params.id), membre);
	verifierModificationFiche(f, membre);
	const donnees = valider(placementEntreeSchema, req.body);
	const ids = validerPlacement(donnees, f.membre_id ?? membre.id, f.id);
	db.update(placement).set(champsPlacement(donnees, ids)).where(eq(placement.id, f.id)).run();
	res.json(ok('Modification effectuée.', f.id, f.reference));
});

routesCommunes(PLACEMENT);

// --- Opération bancaire (S7-10, S7-11) -----------------------------------------------------------

const operationLigneSchema = z.object({
	date_operation: dateFacultative,
	montant: entierFacultatif,
	devise: entierFacultatif,
	type_operation: entierFacultatif,
	banque_emettrice_id: entierFacultatif,
	banque_emettrice_nom: z.string().max(130).default(''),
	banque_emettrice_email: z.string().max(250).default(''),
	beneficiaire: z.string().max(120).default(''),
	banque_beneficiaire_id: entierFacultatif,
	banque_beneficiaire_nom: z.string().max(130).default(''),
	banque_beneficiaire_adresse: z.string().max(250).default('')
});

type OperationLigne = z.output<typeof operationLigneSchema>;

/**
 * Saisie en grille (jusqu'à 15 ordres, comme le legacy) ; les lignes entièrement vides sont
 * ignorées, les lignes incomplètes sont signalées (correctif F-S7-30).
 */
const operationsEntreeSchema = z.object({
	lignes: z.array(operationLigneSchema).max(15).default([])
});

function vueOperation(f: Operation) {
	const lire = (id: number | null) =>
		id ? db.select().from(tableBanque).where(eq(tableBanque.id, id)).get() : undefined;
	return {
		id: f.id,
		reference: f.reference,
		date_saisie: f.date_saisie,
		date_operation: f.date_operation,
		montant: f.montant,
		devise: f.devise,
		type_operation: f.type_operation,
		beneficiaire: f.beneficiaire,
		etat: f.etat,
		membre: titulaire(f.membre_id),
		sens: t.sens(f.type_operation),
		// Noms résolus (saisie libre « banque non listée » ou référentiel).
		nom_banque_emettrice: t.nomBanque(lire(f.banque_emettrice_id), f.banque_emettrice_nom),
		nom_banque_beneficiaire: t.nomBanque(lire(f.banque_beneficiaire_id), f.banque_beneficiaire_nom)
	};
}

/**
 * Filtres de la vue gestionnaire (S7-11), chacun utilisable seul (correctif) ; `banque_id` porte
 * sur la banque émettrice **ou** bénéficiaire.
 */
function conditionsOperations(
	req: { query: Record<string, unknown> },
	membre: Membre,
	avecReference: boolean
): (SQL | undefined)[] {
	const brutEtat = nombreQuery(req, 'etat');
	const etat = brutEtat && brutEtat <= 4 ? brutEtat : null;
	const conditions = conditionsVisibles(operationBanque, membre, etat);

	const dateMin = jourQuery(req.query.date_min);
	if (dateMin) conditions.push(gte(operationBanque.date_operation, dateMin));
	const dateMax = jourQuery(req.query.date_max);
	if (dateMax) conditions.push(lte(operationBanque.date_operation, dateMax));
	const banqueId = nombreQuery(req, 'banque_id');
	if (banqueId) {
		conditions.push(
			or(
				eq(operationBanque.banque_emettrice_id, banqueId),
				eq(operationBanque.banque_beneficiaire_id, banqueId)
			)
		);
	}
	const typeOperation = nombreQuery(req, 'type_operation');
	if (typeOperation && typeOperation <= 6) {
		conditions.push(eq(operationBanque.type_operation, typeOperation));
	}
	const montantMin = nombreQuery(req, 'montant_min');
	if (montantMin) conditions.push(gte(operationBanque.montant, montantMin));
	const montantMax = nombreQuery(req, 'montant_max');
	if (montantMax) conditions.push(lte(operationBanque.montant, montantMax));
	if (avecReference && typeof req.query.reference === 'string' && req.query.reference) {
		conditions.push(eq(operationBanque.reference, req.query.reference));
	}
	const membreId = nombreQuery(req, 'membre_id');
	if (membreId && membre.type_compte === 1) {
		conditions.push(eq(operationBanque.membre_id, membreId));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			operationBanque.reference,
			operationBanque.beneficiaire,
			operationBanque.banque_emettrice_nom,
			operationBanque.banque_beneficiaire_nom
		)
	);
	return conditions;
}

routeur.get('/operations', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const requete = db
		.select()
		.from(operationBanque)
		.where(and(...conditionsOperations(req, membre, true).filter(Boolean)))
		.orderBy(desc(operationBanque.date_operation), desc(operationBanque.id))
		.$dynamic();
	const liste = paginer<Operation>(requete, page);
	res.json({
		items: liste.items.map(vueOperation),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Totaux « Débit / Crédit » par devise, sur les mêmes filtres que la liste. */
routeur.get('/operations/synthese', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const lignes = db
		.select({
			type_operation: operationBanque.type_operation,
			devise: operationBanque.devise,
			n: sql<number>`count(*)`,
			total: sql<number>`coalesce(sum(${operationBanque.montant}), 0)`
		})
		.from(operationBanque)
		.where(and(...conditionsOperations(req, membre, false).filter(Boolean)))
		.groupBy(operationBanque.type_operation, operationBanque.devise)
		.all();

	const totaux = new Map<string, { sens: string; devise: number; nombre: number; total: number }>();
	for (const l of lignes) {
		const sens = t.sens(l.type_operation);
		const cle = `${sens}:${l.devise}`;
		const acc = totaux.get(cle) ?? { sens, devise: l.devise, nombre: 0, total: 0 };
		acc.nombre += l.n;
		acc.total += l.total;
		totaux.set(cle, acc);
	}
	res.json(
		[...totaux.values()].sort((a, b) => a.sens.localeCompare(b.sens) || a.devise - b.devise)
	);
});

routeur.get('/operations/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Operation & Fiche>(OPERATION, Number(req.params.id), membre);
	const lot = t
		.lot(f.reference, f.id)
		.filter((o) => membre.type_compte === 1 || o.membre_id === membre.id);
	res.json({
		...vueOperation(f),
		banque_emettrice_id: f.banque_emettrice_id,
		banque_emettrice_nom: f.banque_emettrice_nom,
		banque_emettrice_email: f.banque_emettrice_email,
		banque_beneficiaire_id: f.banque_beneficiaire_id,
		banque_beneficiaire_nom: f.banque_beneficiaire_nom,
		banque_beneficiaire_adresse: f.banque_beneficiaire_adresse,
		email_destinataire: t.destinataires(f).length > 0,
		lot: lot.map((o) => ({
			id: o.id,
			date_operation: o.date_operation,
			montant: o.montant,
			devise: o.devise,
			type_operation: o.type_operation,
			beneficiaire: o.beneficiaire
		})),
		...contexte(f, membre)
	});
});

function ligneVide(l: OperationLigne): boolean {
	return !(
		l.date_operation ||
		l.montant ||
		l.devise ||
		l.type_operation ||
		l.banque_emettrice_id ||
		l.banque_emettrice_nom.trim() ||
		l.banque_emettrice_email.trim() ||
		l.beneficiaire.trim() ||
		l.banque_beneficiaire_id ||
		l.banque_beneficiaire_nom.trim() ||
		l.banque_beneficiaire_adresse.trim()
	);
}

interface ValeursOperation {
	date_operation: Date | null;
	montant: number;
	devise: number;
	type_operation: number;
	banque_emettrice_id: number | null;
	banque_emettrice_nom: string;
	banque_emettrice_email: string;
	beneficiaire: string;
	banque_beneficiaire_id: number | null;
	banque_beneficiaire_nom: string;
	banque_beneficiaire_adresse: string;
}

/** Valide un ordre de virement ; renvoie les valeurs et les erreurs par champ. */
function normaliserOperation(
	ligne: OperationLigne,
	prefixeChamp = '',
	numero?: number
): { valeurs: ValeursOperation; champs: Record<string, string> } {
	const avant = numero ? `Ligne ${numero} : ` : '';
	const champs: Record<string, string> = {};
	const err = (champ: string, message: string) => {
		champs[`${prefixeChamp}${champ}`] = avant + message;
	};

	if (!ligne.date_operation) err('date_operation', "Veuillez indiquer la date de l'opération.");
	if (!ligne.montant) err('montant', 'Veuillez indiquer le montant de la transaction.');
	const devisesConnues: number[] = Object.values(Devise);
	if (!ligne.devise || !devisesConnues.includes(ligne.devise)) {
		err('devise', 'Veuillez indiquer la devise.');
	}
	const typesConnus: number[] = Object.values(TypeOperationBanque);
	if (!ligne.type_operation || !typesConnus.includes(ligne.type_operation)) {
		err('type_operation', "Veuillez indiquer le type d'opération.");
	}
	// Banque du référentiel, sinon « banque non listée » saisie librement (≥ 3 caractères).
	const emettrice = t.banqueValide(ligne.banque_emettrice_id);
	const nomEmettrice = emettrice ? '' : ligne.banque_emettrice_nom.trim();
	if (!emettrice && nomEmettrice.length < 3) {
		err('banque_emettrice_id', 'Veuillez indiquer la banque émettrice.');
	}
	if (!t.adressesValides(ligne.banque_emettrice_email)) {
		err('banque_emettrice_email', "L'adresse e-mail de la banque émettrice n'est pas valide.");
	}
	const beneficiaire = ligne.beneficiaire.trim();
	if (beneficiaire.length < 3) err('beneficiaire', 'Veuillez indiquer le nom du bénéficiaire.');
	const recevante = t.banqueValide(ligne.banque_beneficiaire_id);
	const nomRecevante = recevante ? '' : ligne.banque_beneficiaire_nom.trim();
	if (
		!recevante &&
		nomRecevante.length < 3 &&
		(!ligne.type_operation || !t.SANS_BANQUE_BENEFICIAIRE.includes(ligne.type_operation))
	) {
		err('banque_beneficiaire_id', 'Veuillez indiquer la banque bénéficiaire.');
	}

	return {
		valeurs: {
			date_operation: ligne.date_operation,
			montant: ligne.montant ?? 0,
			devise: ligne.devise ?? Devise.FCFA,
			type_operation: ligne.type_operation ?? 0,
			banque_emettrice_id: emettrice ? emettrice.id : null,
			banque_emettrice_nom: nomEmettrice,
			banque_emettrice_email: t.adresses(ligne.banque_emettrice_email).join('; '),
			beneficiaire,
			banque_beneficiaire_id: recevante ? recevante.id : null,
			banque_beneficiaire_nom: nomRecevante,
			banque_beneficiaire_adresse: ligne.banque_beneficiaire_adresse.trim()
		},
		champs
	};
}

function cleDoublon(v: ValeursOperation): string {
	return [
		v.date_operation ? v.date_operation.getTime() : '',
		v.montant,
		v.banque_emettrice_id ?? '',
		v.banque_emettrice_nom.toLowerCase(),
		v.beneficiaire.toLowerCase()
	].join('|');
}

/** Anti-doublon legacy : membre + date d'opération + montant + banque émettrice + bénéficiaire. */
function existeOperation(membreId: number, v: ValeursOperation, exclureId?: number): boolean {
	const conditions: (SQL | undefined)[] = [
		eq(operationBanque.membre_id, membreId),
		v.date_operation
			? eq(operationBanque.date_operation, v.date_operation)
			: sql`${operationBanque.date_operation} is null`,
		eq(operationBanque.montant, v.montant),
		eq(operationBanque.beneficiaire, v.beneficiaire),
		ne(operationBanque.etat, Etat.SUPPRIME),
		v.banque_emettrice_id
			? eq(operationBanque.banque_emettrice_id, v.banque_emettrice_id)
			: eq(operationBanque.banque_emettrice_nom, v.banque_emettrice_nom)
	];
	if (exclureId) conditions.push(ne(operationBanque.id, exclureId));
	return (
		db
			.select({ id: operationBanque.id })
			.from(operationBanque)
			.where(and(...conditions.filter(Boolean)))
			.limit(1)
			.get() !== undefined
	);
}

/** Envoie l'ordre par e-mail à chaque banque émettrice concernée ; retourne le nombre d'envois. */
function programmerEmails(operations: Operation[], membre: Membre | null | undefined): number {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	const nomSite = p?.nom_site || 'La Frangine';
	const groupes = t.regrouperParDestinataire(operations);
	for (const [adresse, ops] of groupes) {
		envoyerEnArrierePlan(
			adresse,
			t.SUJET_MAIL,
			t.corpsMail(ops, membre, nomSite),
			membre?.email || undefined
		);
	}
	return groupes.size;
}

routeur.post('/operations', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(operationsEntreeSchema, req.body);
	const lignes = donnees.lignes
		.map((ligne, i) => ({ numero: i + 1, ligne }))
		.filter(({ ligne }) => !ligneVide(ligne));
	if (lignes.length === 0) throw erreur('Veuillez saisir au moins une opération.');

	const champs: Record<string, string> = {};
	const valeurs: ValeursOperation[] = [];
	const vues = new Set<string>();
	for (const { numero, ligne } of lignes) {
		const r = normaliserOperation(ligne, `lignes.${numero - 1}.`, numero);
		Object.assign(champs, r.champs);
		if (Object.keys(r.champs).length === 0) {
			const cle = cleDoublon(r.valeurs);
			if (vues.has(cle) || existeOperation(membre.id, r.valeurs)) {
				champs[`lignes.${numero - 1}.montant`] =
					`Ligne ${numero} : cette opération est déjà enregistrée.`;
			}
			vues.add(cle);
		}
		valeurs.push(r.valeurs);
	}
	// Le legacy ignorait silencieusement les lignes incomplètes : on les signale (F-S7-30).
	if (Object.keys(champs).length) {
		throw erreur('Veuillez corriger les opérations signalées.', champs);
	}

	// Une référence commune à toutes les opérations d'une même saisie (legacy, décision F-S7-31).
	const operations = db.transaction(() => {
		const reference = nouvelleReference(Prefixe.OPERATION_BANQUE);
		const maintenant = new Date();
		return db
			.insert(operationBanque)
			.values(
				valeurs.map((v) => ({
					membre_id: membre.id,
					reference,
					date_saisie: maintenant,
					etat: Etat.AUTORISE,
					...v
				}))
			)
			.returning()
			.all();
	});

	const envois = programmerEmails(operations, membre);
	const nb = operations.length;
	let message =
		nb === 1 ? 'Enregistrement effectué.' : `Enregistrement effectué : ${nb} opérations.`;
	if (envois) message += " L'ordre a été transmis par e-mail à la banque émettrice.";
	res.status(201).json({
		message,
		id: operations[0]!.id,
		reference: operations[0]!.reference,
		ids: operations.map((o) => o.id),
		emails: envois
	});
});

routeur.put('/operations/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Operation & Fiche>(OPERATION, Number(req.params.id), membre);
	verifierModificationFiche(f, membre);
	const donnees = valider(operationLigneSchema, req.body);
	const { valeurs, champs } = normaliserOperation(donnees);
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
	if (existeOperation(f.membre_id ?? membre.id, valeurs, f.id)) {
		throw erreur('Cette opération est déjà enregistrée.');
	}
	// La date d'opération est enfin enregistrée en modification (correctif F-S7-33).
	db.update(operationBanque).set(valeurs).where(eq(operationBanque.id, f.id)).run();
	res.json(ok('Modification effectuée.', f.id, f.reference));
});

/**
 * Bouton « Envoyer Mail » : réservé au titulaire et aux gestionnaires (le legacy l'ouvrait à tous).
 */
routeur.post('/operations/:id/mail', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Operation & Fiche>(OPERATION, Number(req.params.id), membre);
	if (f.membre_id !== membre.id && membre.type_compte !== 1) throw interdit();
	if (f.etat === Etat.SUPPRIME) throw erreur('Cette opération est annulée.');
	if (t.destinataires(f).length === 0) {
		throw erreur("Aucune adresse e-mail n'est renseignée pour la banque émettrice.", {
			banque_emettrice_email: "Indiquez l'adresse e-mail de la banque émettrice puis enregistrez."
		});
	}
	programmerEmails(
		[f],
		f.membre_id ? db.select().from(tableMembre).where(eq(tableMembre.id, f.membre_id)).get() : null
	);
	res.json(ok('Mail envoyé.', f.id, f.reference));
});

routesCommunes(OPERATION);

// --- Demande de crédit (S7-12) -------------------------------------------------------------------

const creditEntreeSchema = z.object({
	montant: entierFacultatif,
	objet: z.string().max(3000).default(''),
	duree_mois: entierFacultatif,
	niveau_realisation: z.coerce.number().min(0).max(100).default(0),
	garantie: z.string().max(3000).default(''),
	delai_reponse_jours: entier.min(0).max(366).default(0),
	observation: z.string().max(3000).default(''),
	devis_global: z.string().max(3000).default(''),
	apport_propre: z.string().max(3000).default('')
});

type CreditEntree = z.output<typeof creditEntreeSchema>;

function vueCredit(f: Credit) {
	return {
		id: f.id,
		reference: f.reference,
		date_demande: f.date_demande,
		montant: f.montant,
		objet: f.objet,
		duree_mois: f.duree_mois,
		niveau_realisation: f.niveau_realisation,
		garantie: f.garantie,
		etat: f.etat,
		membre: titulaire(f.membre_id)
	};
}

routeur.get('/credits', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const brutEtat = nombreQuery(req, 'etat');
	const conditions = conditionsVisibles(
		demandeCredit,
		membre,
		brutEtat && brutEtat <= 4 ? brutEtat : null
	);
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			demandeCredit.reference,
			demandeCredit.objet,
			demandeCredit.garantie
		)
	);
	const requete = db
		.select()
		.from(demandeCredit)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(demandeCredit.date_demande), desc(demandeCredit.id))
		.$dynamic();
	const liste = paginer<Credit>(requete, page);
	res.json({
		items: liste.items.map(vueCredit),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/credits/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Credit & Fiche>(CREDIT, Number(req.params.id), membre);
	res.json({
		...vueCredit(f),
		delai_reponse_jours: f.delai_reponse_jours,
		observation: f.observation,
		devis_global: f.devis_global,
		apport_propre: f.apport_propre,
		...contexte(f, membre)
	});
});

function validerCredit(d: CreditEntree, membreId: number, exclureId?: number): void {
	const champs: Record<string, string> = {};
	if (!d.montant) champs.montant = 'Indiquez le montant du crédit.';
	if (!d.objet.trim()) champs.objet = "Veuillez indiquer l'objet.";
	if (!d.duree_mois) champs.duree_mois = 'Veuillez indiquer la durée de remboursement.';
	else if (d.duree_mois > 120) {
		champs.duree_mois = 'La durée de remboursement ne peut pas dépasser 120 mois.';
	}
	if (!d.garantie.trim()) champs.garantie = 'Veuillez indiquer la garantie.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Anti-doublon clarifié : même montant et même objet (le legacy comparait l'observation).
	const conditions = [
		eq(demandeCredit.membre_id, membreId),
		eq(demandeCredit.montant, d.montant!),
		eq(demandeCredit.objet, d.objet.trim()),
		ne(demandeCredit.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(demandeCredit.id, exclureId));
	const doublon = db
		.select({ id: demandeCredit.id })
		.from(demandeCredit)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette demande de crédit est déjà effectuée.');
}

function champsCredit(d: CreditEntree) {
	return {
		montant: d.montant || 0,
		objet: d.objet.trim(),
		duree_mois: d.duree_mois || 0,
		niveau_realisation: d.niveau_realisation,
		garantie: d.garantie.trim(),
		delai_reponse_jours: d.delai_reponse_jours,
		observation: d.observation.trim(),
		devis_global: d.devis_global.trim(),
		// Affiché avec sa propre valeur (correctif F-S7-35).
		apport_propre: d.apport_propre.trim()
	};
}

routeur.post('/credits', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(creditEntreeSchema, req.body);
	validerCredit(donnees, membre.id);
	const maintenant = new Date();
	const f = db
		.insert(demandeCredit)
		.values({
			membre_id: membre.id,
			etat: Etat.AUTORISE,
			date_demande: new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()),
			reference: nouvelleReference(Prefixe.DEMANDE_CREDIT),
			...champsCredit(donnees)
		})
		.returning()
		.get()!;
	res.status(201).json(ok('Votre demande de crédit est enregistrée.', f.id, f.reference));
});

routeur.put('/credits/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Credit & Fiche>(CREDIT, Number(req.params.id), membre);
	verifierModificationFiche(f, membre);
	const donnees = valider(creditEntreeSchema, req.body);
	validerCredit(donnees, f.membre_id ?? membre.id, f.id);
	db.update(demandeCredit).set(champsCredit(donnees)).where(eq(demandeCredit.id, f.id)).run();
	res.json(ok('Modification effectuée.', f.id, f.reference));
});

routesCommunes(CREDIT);

// --- Contentieux (S7-13) -------------------------------------------------------------------------

const montant = () => entier.min(0).default(0);
const texte3000 = () => z.string().max(3000).default('');

const contentieuxEntreeSchema = z.object({
	dette_compromise: montant(),
	dette_compromise_detail: texte3000(),
	revenus_journaliers: montant(),
	revenus_journaliers_detail: texte3000(),
	revenus_hebdomadaires: montant(),
	revenus_hebdomadaires_detail: texte3000(),
	revenus_mensuels: montant(),
	revenus_mensuels_detail: texte3000(),
	charges_fixes: montant(),
	charges_fixes_detail: texte3000(),
	charges_variables: montant(),
	charges_variables_detail: texte3000(),
	activites_en_cours: texte3000(),
	entrees_activite_en_cours: montant(),
	entrees_activite_en_cours_detail: texte3000(),
	activite_previsionnelle: texte3000(),
	entrees_previsionnelles: montant(),
	entrees_previsionnelles_detail: texte3000(),
	entrees_totales: montant(),
	entrees_totales_detail: texte3000(),
	echeance_actuelle: texte3000(),
	echeance_supportable: montant(),
	echeance_supportable_detail: texte3000(),
	elements_favorables: texte3000()
});

type ContentieuxEntree = z.output<typeof contentieuxEntreeSchema>;

const CHAMPS_CONTENTIEUX = Object.keys(
	contentieuxEntreeSchema.shape
) as (keyof ContentieuxEntree)[];

function vueContentieux(f: Contentieux) {
	return {
		id: f.id,
		reference: f.reference,
		date_dossier: f.date_dossier,
		dette_compromise: f.dette_compromise,
		revenus_mensuels: f.revenus_mensuels,
		charges_fixes: f.charges_fixes,
		charges_variables: f.charges_variables,
		entrees_previsionnelles: f.entrees_previsionnelles,
		echeance_supportable: f.echeance_supportable,
		etat: f.etat,
		membre: titulaire(f.membre_id)
	};
}

routeur.get('/contentieux', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const brutEtat = nombreQuery(req, 'etat');
	const conditions = conditionsVisibles(
		contentieuxCredit,
		membre,
		brutEtat && brutEtat <= 4 ? brutEtat : null
	);
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			contentieuxCredit.reference,
			contentieuxCredit.dette_compromise_detail,
			contentieuxCredit.activites_en_cours
		)
	);
	const requete = db
		.select()
		.from(contentieuxCredit)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(contentieuxCredit.date_dossier), desc(contentieuxCredit.id))
		.$dynamic();
	const liste = paginer<Contentieux>(requete, page);
	res.json({
		items: liste.items.map(vueContentieux),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/contentieux/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Contentieux & Fiche>(CONTENTIEUX, Number(req.params.id), membre);
	const detail: Record<string, unknown> = vueContentieux(f);
	for (const champ of CHAMPS_CONTENTIEUX) {
		detail[champ] = (f as unknown as Record<string, unknown>)[champ];
	}
	res.json({ ...detail, ...contexte(f, membre) });
});

function validerContentieux(d: ContentieuxEntree, membreId: number, exclureId?: number): void {
	const champs: Record<string, string> = {};
	if (d.dette_compromise <= 0) {
		champs.dette_compromise = 'Veuillez indiquer le montant de la dette compromise.';
	}
	if (d.revenus_mensuels <= 0) {
		champs.revenus_mensuels = 'Veuillez indiquer le montant des revenus mensuels.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		eq(contentieuxCredit.membre_id, membreId),
		eq(contentieuxCredit.dette_compromise, d.dette_compromise),
		ne(contentieuxCredit.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(contentieuxCredit.id, exclureId));
	const doublon = db
		.select({ id: contentieuxCredit.id })
		.from(contentieuxCredit)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce contentieux de crédit est déjà enregistré.');
}

function champsContentieux(d: ContentieuxEntree) {
	const valeurs: Record<string, unknown> = {};
	for (const champ of CHAMPS_CONTENTIEUX) {
		const v = d[champ];
		valeurs[champ] = typeof v === 'string' ? v.trim() : v;
	}
	return valeurs;
}

routeur.post('/contentieux', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(contentieuxEntreeSchema, req.body);
	validerContentieux(donnees, membre.id);
	const f = db
		.insert(contentieuxCredit)
		.values({
			membre_id: membre.id,
			etat: Etat.AUTORISE,
			date_dossier: new Date(),
			reference: nouvelleReference(Prefixe.CONTENTIEUX),
			...champsContentieux(donnees)
		})
		.returning()
		.get()!;
	res.status(201).json(ok('Ce contentieux est enregistré.', f.id, f.reference));
});

routeur.put('/contentieux/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenir<Contentieux & Fiche>(CONTENTIEUX, Number(req.params.id), membre);
	// Plus de boutons ouverts à tout connecté (F-S7-36).
	verifierModificationFiche(f, membre);
	const donnees = valider(contentieuxEntreeSchema, req.body);
	validerContentieux(donnees, f.membre_id ?? membre.id, f.id);
	db.update(contentieuxCredit)
		.set(champsContentieux(donnees))
		.where(eq(contentieuxCredit.id, f.id))
		.run();
	res.json(ok('Modification effectuée.', f.id, f.reference));
});

routesCommunes(CONTENTIEUX);
