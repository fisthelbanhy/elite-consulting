/**
 * Partenariat & troc : « J'ai… (actif), je cherche… » (portage de
 * `app/routers/partenariats.py` ; legacy choix5.php?opaf=3, incl-choix5C.php,
 * incl-partenariat.php ; F-S5-46 à F-S5-53).
 */
import { and, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
	exigerMembre,
	membreRequis,
	pagination,
	peutModifier,
	verifierModification
} from '../deps.js';
import { Etat, TypeInteret } from '../enums.js';
import { erreur, interdit } from '../erreurs.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { partenariat } from '../schema/opportunite.js';
import {
	auteur,
	ok,
	valider,
	vueInterets,
	type Auteur,
	type InteretOut
} from '../schemas/commun.js';
import { etatEntreeSchema, interetEntreeSchema } from '../schemas/immobilier.js';
import { auteursDe, contactsDe } from '../services/contacts.js';
import {
	changerEtat,
	exigerVisible,
	paginer,
	recherche,
	supprimer,
	visibilite
} from '../services/fiches.js';
import { deposer, lister as listerInterets } from '../services/interets.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/partenariats';

const INTROUVABLE = "Cette recherche de partenariat n'existe pas ou n'est plus publiée.";
const ENREGISTREE = 'Votre recherche de partenariat & troc a bien été enregistrée.';

type Partenariat = typeof partenariat.$inferSelect;

const COLONNES_FICHE = { etat: partenariat.etat, auteur: partenariat.auteur_id };

const partenariatEntreeSchema = z.object({
	actif: z.string().default(''),
	description: z.string().default(''),
	recherche: z.string().default(''),
	objectif: z.string().default('')
});
type PartenariatEntree = z.output<typeof partenariatEntreeSchema>;

function vueResume(p: Partenariat, auteurFiche: Auteur | null) {
	return {
		id: p.id,
		reference: p.reference,
		actif: p.actif,
		description: p.description,
		recherche: p.recherche,
		objectif: p.objectif,
		etat: p.etat,
		date_creation: p.date_creation,
		auteur: auteurFiche
	};
}

function obtenir(id: number, membre: Membre | null): Partenariat {
	const fiche = db.select().from(partenariat).where(eq(partenariat.id, id)).get();
	return exigerVisible(fiche as never, membre, { message: INTROUVABLE }) as unknown as Partenariat;
}

/**
 * Liste publique des fiches publiées (F-S5-46) ; l'auteur voit aussi les siennes, le gestionnaire
 * toutes. Recherche correctement parenthésée (F-S5-47) dans l'actif, la description, la recherche
 * et l'objectif ; tri par date décroissante.
 */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	if (membre && membre.type_compte === 1) {
		const brut = Number(req.query.etat);
		const etat = Number.isFinite(brut) && brut >= 1 && brut <= 4 ? Math.trunc(brut) : null;
		conditions.push(etat ? eq(partenariat.etat, etat) : ne(partenariat.etat, Etat.SUPPRIME));
	}
	if (req.query.miennes === 'true' && membre) {
		conditions.push(eq(partenariat.auteur_id, membre.id));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			partenariat.actif,
			partenariat.description,
			partenariat.recherche,
			partenariat.objectif,
			partenariat.reference
		)
	);

	const requete = db
		.select()
		.from(partenariat)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(partenariat.date_creation), desc(partenariat.id))
		.$dynamic();

	const liste = paginer<Partenariat>(requete, page);
	const auteurs = auteursDe(liste.items.map((p) => p.auteur_id));
	res.json({
		items: liste.items.map((p) =>
			vueResume(p, p.auteur_id !== null ? (auteurs.get(p.auteur_id) ?? null) : null)
		),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Nombre de fiches publiées (onglet « Partenariat & troc (n) », F-S5-01). */
routeur.get('/compteur', (_req, res) => {
	const n =
		db
			.select({ n: sql<number>`count(*)` })
			.from(partenariat)
			.where(eq(partenariat.etat, Etat.AUTORISE))
			.get()?.n ?? 0;
	res.json({ publies: n });
});

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenir(Number(req.params.id), membre);
	const recus = listerInterets('partenariat_id', fiche.id);
	const proprietaire = !!membre && (membre.id === fiche.auteur_id || membre.type_compte === 1);

	let interets: InteretOut[] | null = null;
	if (proprietaire) interets = vueInterets(recus, contactsDe(recus.map((i) => i.membre_id)));

	const auteurFiche =
		fiche.auteur_id !== null
			? auteur(db.select().from(tableMembre).where(eq(tableMembre.id, fiche.auteur_id)).get())
			: null;

	res.json({
		...vueResume(fiche, auteurFiche),
		nombre_interets: recus.length,
		peut_modifier: peutModifier(membre, fiche.auteur_id),
		peut_moderer: peutModerer(membre),
		mon_interet: !!membre && !proprietaire && recus.some((i) => i.membre_id === membre.id),
		interets
	});
});

/**
 * Actif obligatoire (≥ 5 caractères ; le message legacy annonçait 3 à tort) et anti-doublon de
 * l'actif pour un même auteur.
 */
function validerPartenariat(d: PartenariatEntree, auteurId: number, exclureId?: number): void {
	const actif = d.actif.trim();
	if (actif.length < 5) {
		throw erreur('Veuillez corriger les champs signalés.', {
			actif: "Veuillez saisir l'actif avec 5 caractères minimum."
		});
	}
	const conditions = [
		sql`lower(${partenariat.actif}) = ${actif.toLowerCase()}`,
		eq(partenariat.auteur_id, auteurId),
		ne(partenariat.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(partenariat.id, exclureId));
	const doublon = db
		.select({ id: partenariat.id })
		.from(partenariat)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette recherche de partenariat & troc est déjà enregistrée.');
}

function champsPartenariat(d: PartenariatEntree) {
	return {
		actif: d.actif.trim(),
		description: d.description.trim(),
		recherche: d.recherche.trim(),
		objectif: d.objectif.trim()
	};
}

/** Création par un membre (F-S5-48) : publication immédiate (état 2), référence `PTR…`. */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	if (membre.type_compte === 1) {
		throw interdit("La publication d'une recherche de partenariat est réservée aux membres.");
	}
	const donnees = valider(partenariatEntreeSchema, req.body);
	validerPartenariat(donnees, membre.id);

	const cree = db.transaction(() =>
		db
			.insert(partenariat)
			.values({
				auteur_id: membre.id,
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.PARTENARIAT),
				...champsPartenariat(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok(ENREGISTREE, cree!.id, cree!.reference));
});

/** Modification par l'auteur ou un gestionnaire habilité (F-S5-49). */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);

	const donnees = valider(partenariatEntreeSchema, req.body);
	validerPartenariat(donnees, fiche.auteur_id ?? membre.id, fiche.id);

	const misAJour = db
		.update(partenariat)
		.set(champsPartenariat(donnees))
		.where(eq(partenariat.id, fiche.id))
		.returning()
		.get();
	res.json(ok(ENREGISTREE, misAJour!.id, misAJour!.reference));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(partenariat, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(partenariat, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});

/**
 * Intéressement d'un membre non auteur (F-S5-51) : 5 caractères minimum, un seul par membre et
 * par fiche (correctif : le legacy testait la mauvaise colonne), auteur prévenu par la messagerie.
 */
routeur.post('/:id/interet', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);

	if (membre.type_compte === 1) throw interdit("L'intéressement est réservé aux membres.");
	if (fiche.etat !== Etat.AUTORISE) {
		throw erreur("Cette fiche n'est pas publiée : l'intéressement n'est pas possible.");
	}

	const donnees = valider(interetEntreeSchema, req.body);
	if (donnees.message.trim().length < 5) {
		throw erreur('Veuillez corriger les champs signalés.', {
			message: "L'intéressement doit avoir 5 caractères minimum."
		});
	}

	deposer({
		membre,
		cible: 'partenariat_id',
		cibleId: fiche.id,
		auteurFicheId: fiche.auteur_id,
		sousType: TypeInteret.INTERESSEMENT,
		message: donnees.message,
		libelleFiche: `${fiche.reference} — ${fiche.actif}`,
		lien: `/partenariats/${fiche.id}`,
		messageObligatoire: true
	});
	res.status(201).json(ok('Votre intéressement est pris en compte.', fiche.id));
});
