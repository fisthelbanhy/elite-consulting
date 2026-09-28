/**
 * Business plan « auto-diagnostic » (portage de `app/routers/business_plan.py` ; legacy
 * choix5.php?opaf=2, incl-choix5B.php, incl-businessplan.php ; F-S5-40 à F-S5-45).
 *
 * Un seul business plan par membre. « Sauvegarder » = brouillon (état 1), « Envoyer » = soumis au
 * conseiller (état 2) : la distinction que le legacy suggérait est réelle (ADR-0004, ADR-0007 S5d).
 * Liste invisible des visiteurs : un membre voit le sien, un gestionnaire les voit tous.
 */
import { and, desc, eq, inArray, ne, type SQL } from 'drizzle-orm';
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
import { Etat } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { businessPlan } from '../schema/opportunite.js';
import { ok, valider } from '../schemas/commun.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/business-plan';

type BusinessPlan = typeof businessPlan.$inferSelect;

const INTROUVABLE = "Ce business plan n'existe pas ou ne vous est pas accessible.";

/**
 * Les 24 zones de texte du legacy (zone02 à zone26, hors `niveau_realisation`), dans l'ordre du
 * formulaire.
 */
const CHAMPS_TEXTE = [
	'description_projet',
	'moyens_actuels',
	'ressources_disponibles',
	'possessions',
	'organisation_actuelle',
	'organisation_souhaitee',
	'detail_besoin',
	'apport_actuel',
	'ambition',
	'strategie_resultats',
	'valeur_ajoutee',
	'prevision_ca_benefice',
	'processus_activite',
	'estimation_charges',
	'composantes_ca',
	'repartition_ca',
	'elements_environnementaux',
	'strategie_attaque',
	'devis_chiffre_besoin',
	'apport_prevu',
	'difficultes_realisation',
	'planning_execution',
	'difficultes_futures'
] as const;

const texteLong = () => z.string().max(5000).default('');

const businessPlanEntreeSchema = z.object({
	type_activite: z.string().max(120).default(''),
	description_projet: texteLong(),
	moyens_actuels: texteLong(),
	ressources_disponibles: texteLong(),
	possessions: texteLong(),
	organisation_actuelle: texteLong(),
	organisation_souhaitee: texteLong(),
	detail_besoin: texteLong(),
	apport_actuel: texteLong(),
	ambition: texteLong(),
	strategie_resultats: texteLong(),
	valeur_ajoutee: texteLong(),
	prevision_ca_benefice: texteLong(),
	processus_activite: texteLong(),
	estimation_charges: texteLong(),
	composantes_ca: texteLong(),
	repartition_ca: texteLong(),
	elements_environnementaux: texteLong(),
	strategie_attaque: texteLong(),
	devis_chiffre_besoin: texteLong(),
	apport_prevu: texteLong(),
	difficultes_realisation: texteLong(),
	planning_execution: texteLong(),
	difficultes_futures: texteLong(),
	niveau_realisation: z.coerce.number().int().min(0).max(100).default(0),
	// « Sauvegarder » (`envoyer = false`) = brouillon ; « Envoyer » = soumis au conseiller.
	envoyer: z.coerce.boolean().default(false)
});

type BusinessPlanEntree = z.output<typeof businessPlanEntreeSchema>;

const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

/** Porteur du business plan : visible de lui-même et des gestionnaires seulement. */
function porteursDe(fiches: BusinessPlan[]) {
	const ids = [...new Set(fiches.map((f) => f.membre_id))];
	if (ids.length === 0) return new Map<number, unknown>();
	return new Map(
		db
			.select({
				id: tableMembre.id,
				pseudonyme: tableMembre.pseudonyme,
				nom: tableMembre.nom,
				sexe: tableMembre.sexe,
				photo: tableMembre.photo
			})
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, { ...m, photo_url: url(m.photo) }])
	);
}

function vueResume(f: BusinessPlan, porteurs: Map<number, unknown>) {
	return {
		id: f.id,
		reference: f.reference,
		date_creation: f.date_creation,
		type_activite: f.type_activite,
		description_projet: f.description_projet,
		niveau_realisation: f.niveau_realisation,
		etat: f.etat,
		membre: porteurs.get(f.membre_id) ?? null
	};
}

function vueDetail(f: BusinessPlan, membre: Membre) {
	const detail: Record<string, unknown> = vueResume(f, porteursDe([f]));
	for (const champ of CHAMPS_TEXTE) {
		detail[champ] = (f as unknown as Record<string, unknown>)[champ];
	}
	detail.peut_modifier = peutModifier(membre, f.membre_id);
	detail.peut_moderer = peutModerer(membre);
	return detail;
}

/** Le porteur (sauf fiche supprimée) ou un gestionnaire ; 404 sinon (correctif F-S5-53). */
function obtenir(id: number, membre: Membre): BusinessPlan {
	const fiche = db.select().from(businessPlan).where(eq(businessPlan.id, id)).get();
	if (!fiche) throw introuvable(INTROUVABLE);
	if (membre.type_compte === 1) return fiche;
	if (fiche.membre_id === membre.id && fiche.etat !== Etat.SUPPRIME) return fiche;
	throw introuvable(INTROUVABLE);
}

/** Règles legacy (messages exacts, orthographe corrigée). */
function validerBusinessPlan(d: BusinessPlanEntree): void {
	const champs: Record<string, string> = {};
	if (d.type_activite.trim().length < 5) {
		champs.type_activite = "Veuillez indiquer le type d'activité avec 5 caractères minimum.";
	}
	if (d.description_projet.trim().length < 10) {
		champs.description_projet = 'Veuillez décrire votre projet avec 10 caractères minimum.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
}

function champsBusinessPlan(d: BusinessPlanEntree) {
	const valeurs: Record<string, unknown> = {
		type_activite: d.type_activite.trim(),
		niveau_realisation: d.niveau_realisation
	};
	for (const champ of CHAMPS_TEXTE) valeurs[champ] = d[champ].trim();
	return valeurs;
}

/**
 * « Envoyer » : la fiche passe à l'état 2 et la frangine est prévenue dans la messagerie du
 * porteur (une seule fois, au premier envoi).
 */
function soumettre(fiche: BusinessPlan, membre: Membre, typeActivite: string): void {
	if (fiche.etat === Etat.AUTORISE) return;
	db.update(businessPlan).set({ etat: Etat.AUTORISE }).where(eq(businessPlan.id, fiche.id)).run();
	if (membre.id === fiche.membre_id) {
		db.insert(tableMessage)
			.values({
				membre_id: fiche.membre_id,
				auteur_id: membre.id,
				de_la_frangine: false,
				texte:
					`[Message automatique] Je viens d'envoyer mon business plan ${fiche.reference} ` +
					`(« ${typeActivite} ») : merci de le relire.`
			})
			.run();
	}
}

/**
 * F-S5-40 : un membre voit son business plan, un gestionnaire les voit tous (supprimés exclus
 * sauf filtre `etat=3`). Recherche dans la description du projet (legacy), le type d'activité et
 * la référence ; tri par date décroissante.
 */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	if (membre.type_compte === 1) {
		const brut = Number(req.query.etat);
		const etat = Number.isFinite(brut) && brut >= 1 && brut <= 4 ? Math.trunc(brut) : null;
		conditions.push(etat ? eq(businessPlan.etat, etat) : ne(businessPlan.etat, Etat.SUPPRIME));
	} else {
		conditions.push(eq(businessPlan.membre_id, membre.id), ne(businessPlan.etat, Etat.SUPPRIME));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			businessPlan.description_projet,
			businessPlan.type_activite,
			businessPlan.reference
		)
	);

	const requete = db
		.select()
		.from(businessPlan)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(businessPlan.date_creation), desc(businessPlan.id))
		.$dynamic();

	const liste = paginer<BusinessPlan>(requete, page);
	const porteurs = porteursDe(liste.items);
	res.json({
		items: liste.items.map((f) => vueResume(f, porteurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Business plan du membre connecté (pour pré-remplir le formulaire), ou `null`. */
routeur.get('/mien', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = db.select().from(businessPlan).where(eq(businessPlan.membre_id, membre.id)).get();
	if (!fiche || fiche.etat === Etat.SUPPRIME) {
		res.json(null);
		return;
	}
	res.json(vueDetail(fiche, membre));
});

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	res.json(vueDetail(obtenir(Number(req.params.id), membre), membre));
});

/** Création réservée aux membres (F-S5-41), une seule fiche par membre. */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	if (membre.type_compte === 1) {
		throw interdit("La création d'un business plan est réservée aux membres.");
	}
	const donnees = valider(businessPlanEntreeSchema, req.body);
	validerBusinessPlan(donnees);

	const existante = db
		.select()
		.from(businessPlan)
		.where(eq(businessPlan.membre_id, membre.id))
		.get();
	if (existante && existante.etat !== Etat.SUPPRIME) {
		throw erreur('La fiche de business plan du membre est déjà enregistrée.');
	}

	const fiche = db.transaction(() => {
		let f: BusinessPlan;
		if (!existante) {
			f = db
				.insert(businessPlan)
				.values({
					membre_id: membre.id,
					reference: nouvelleReference(Prefixe.BUSINESS_PLAN),
					etat: Etat.NON_TRAITE,
					...champsBusinessPlan(donnees)
				})
				.returning()
				.get()!;
		} else {
			// Une fiche supprimée par la modération est réutilisée (contrainte « 1 par membre »).
			f = db
				.update(businessPlan)
				.set({ etat: Etat.NON_TRAITE, ...champsBusinessPlan(donnees) })
				.where(eq(businessPlan.id, existante.id))
				.returning()
				.get()!;
		}
		if (donnees.envoyer) soumettre(f, membre, donnees.type_activite.trim());
		return f;
	});

	const message = donnees.envoyer
		? 'Votre business plan est envoyé à votre frangine.'
		: 'Enregistrement effectué.';
	res.status(201).json(ok(message, fiche.id, fiche.reference));
});

/**
 * Modification par le porteur ou un gestionnaire habilité. « Sauvegarder » ne retire pas une
 * fiche déjà envoyée ; « Envoyer » soumet un brouillon.
 */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.membre_id);
	const donnees = valider(businessPlanEntreeSchema, req.body);
	validerBusinessPlan(donnees);

	db.transaction(() => {
		db.update(businessPlan)
			.set(champsBusinessPlan(donnees))
			.where(eq(businessPlan.id, fiche.id))
			.run();
		if (donnees.envoyer) soumettre(fiche, membre, donnees.type_activite.trim());
	});

	const message = donnees.envoyer
		? 'Votre business plan est envoyé à votre frangine.'
		: 'Modification effectuée.';
	res.json(ok(message, fiche.id, fiche.reference));
});

/** État de la fiche : gestionnaire avec le droit « Activation » (F-S5-43). */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(businessPlan, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});
