/**
 * Accompagnement : 4 questionnaires de préparation de dossier bancable (portage de
 * `app/routers/accompagnement.py` ; legacy choix7.php cgb=1&recf=3, incl-choix7A3.php,
 * incl-acomp*.php). Inventaire : S7-2 à S7-7, F-S7-12 à F-S7-21.
 *
 * Correctifs (ADR-0007 S7a) : toutes les réponses sont enregistrées (dont la question 48 de la
 * restructuration) et rechargées ; la modification fonctionne ; « Sauvegarder » garde un brouillon
 * (état 1) et « Envoyer » transmet au conseiller (état 2), comme pour le Business plan (ADR-0004).
 * États : 1 brouillon, 2 envoyé, 3 supprimé, 4 traité (clôturé par le conseiller).
 */
import { and, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, verifierModification } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { dossierAccompagnement } from '../schema/finance.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, type Auteur } from '../schemas/commun.js';
import { changerEtat, paginer, recherche, supprimer } from '../services/fiches.js';
import * as qa from '../services/questionnaires-accompagnement.js';
import { nouvelleReference } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/accompagnement';

type Dossier = typeof dossierAccompagnement.$inferSelect;

/** Message déposé dans la messagerie du membre quand son conseiller change l'état du dossier. */
const NOTIFICATIONS: Record<number, string> = {
	[Etat.NON_TRAITE]:
		'Votre dossier {ref} ({libelle}) est repassé en brouillon : complétez-le puis envoyez-le à votre conseiller.',
	[Etat.AUTORISE]:
		'Votre dossier {ref} ({libelle}) est bien pris en charge par votre conseiller. Il revient vers vous rapidement.',
	[Etat.CLOTURE]:
		'Votre conseiller a traité votre dossier {ref} ({libelle}). Il vous recontacte pour la suite.',
	[Etat.SUPPRIME]:
		"Votre dossier {ref} ({libelle}) a été retiré par la frangine. Écrivez-nous si c'est une erreur."
};

const reponsesSchema = z.record(z.string(), z.string()).default({});

const dossierEntreeSchema = z.object({
	type_dossier: z.coerce.number().int().min(1).max(4),
	objet: z.string().max(250).default(''),
	reponses: reponsesSchema,
	// « Sauvegarder » (brouillon, état 1) ou « Envoyer » au conseiller (état 2) — ADR-0004 / S5d.
	envoyer: z.coerce.boolean().default(false)
});

const dossierModificationSchema = z.object({
	objet: z.string().max(250).default(''),
	reponses: reponsesSchema,
	envoyer: z.coerce.boolean().default(false)
});

const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

/** Vue publique du questionnaire (sert aussi la page de présentation). */
function vueQuestionnaire(q: qa.Questionnaire) {
	return {
		type: q.type,
		slug: q.slug,
		libelle: q.libelle,
		prefixe: q.prefixe,
		accroche: q.accroche,
		description: q.description,
		pour_qui: q.pour_qui,
		nombre_questions: q.nombre_questions,
		sections: q.sections
	};
}

/** Membre : ses dossiers (hors supprimés) ; gestionnaire : tous (F-S7-12). */
function conditionsVisibles(membre: Membre): (SQL | undefined)[] {
	if (membre.type_compte === 1) return [];
	return [
		eq(dossierAccompagnement.membre_id, membre.id),
		ne(dossierAccompagnement.etat, Etat.SUPPRIME)
	];
}

function auteursDe(dossiers: Dossier[]) {
	const ids = [...new Set(dossiers.map((d) => d.membre_id).filter((i): i is number => i !== null))];
	if (ids.length === 0) return new Map<number, typeof tableMembre.$inferSelect>();
	return new Map(
		db
			.select()
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, m])
	);
}

function vueResume(d: Dossier, membres: Map<number, typeof tableMembre.$inferSelect>) {
	const q = qa.questionnaire(d.type_dossier);
	const porteur: Auteur | null = d.membre_id !== null ? auteur(membres.get(d.membre_id)) : null;
	return {
		id: d.id,
		type_dossier: d.type_dossier,
		reference: d.reference,
		objet: d.objet,
		date_creation: d.date_creation,
		etat: d.etat,
		membre: porteur,
		nombre_questions: q ? q.nombre_questions : 0,
		nombre_repondues: q ? qa.nombreRepondues(q, d.reponses) : 0
	};
}

/** L'auteur (sauf dossier supprimé) ou un gestionnaire ; 404 sinon (correctif S7-3). */
function obtenir(id: number, membre: Membre): Dossier {
	const fiche = db
		.select()
		.from(dossierAccompagnement)
		.where(eq(dossierAccompagnement.id, id))
		.get();
	if (!fiche) throw introuvable("Ce dossier n'existe pas.");
	if (membre.type_compte === 1) return fiche;
	if (fiche.membre_id === membre.id && fiche.etat !== Etat.SUPPRIME) return fiche;
	throw introuvable("Ce dossier n'existe pas ou ne vous est pas accessible.");
}

function peutModifierDossier(fiche: Dossier, membre: Membre): boolean {
	if (peutModerer(membre)) return true;
	return (
		fiche.membre_id === membre.id &&
		(fiche.etat === Etat.NON_TRAITE || fiche.etat === Etat.AUTORISE)
	);
}

/** Objet d'au moins 10 caractères et unique par membre et par type (messages legacy, F-S7-18). */
function validerObjet(
	q: qa.Questionnaire,
	objet: string,
	membreId: number,
	exclureId?: number
): void {
	if (objet.length < qa.OBJET_MIN) {
		throw erreur(qa.MESSAGE_OBJET, { objet: qa.MESSAGE_OBJET });
	}
	const conditions = [
		eq(dossierAccompagnement.type_dossier, q.type),
		eq(dossierAccompagnement.membre_id, membreId),
		eq(dossierAccompagnement.objet, objet),
		ne(dossierAccompagnement.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(dossierAccompagnement.id, exclureId));
	const doublon = db
		.select({ id: dossierAccompagnement.id })
		.from(dossierAccompagnement)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur(q.message_doublon, {
			objet: 'Vous avez déjà un dossier avec cet objet : ouvrez-le pour le compléter.'
		});
	}
}

/** Libellés exacts et découpage des 4 questionnaires (public : sert la page de présentation). */
routeur.get('/questionnaires', (_req, res) => {
	res.json([...qa.QUESTIONNAIRES.values()].map(vueQuestionnaire));
});

routeur.get('/questionnaires/:slug', (req, res) => {
	const q = qa.PAR_SLUG.get(req.params.slug!);
	if (!q) throw introuvable("Ce type d'accompagnement n'existe pas.");
	res.json(vueQuestionnaire(q));
});

routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions = conditionsVisibles(membre);

	const type = Number(req.query.type);
	if (Number.isFinite(type) && type >= 1 && type <= 4) {
		conditions.push(eq(dossierAccompagnement.type_dossier, Math.trunc(type)));
	}
	const etat = Number(req.query.etat);
	if (Number.isFinite(etat) && etat >= 1 && etat <= 4) {
		conditions.push(eq(dossierAccompagnement.etat, Math.trunc(etat)));
	} else if (membre.type_compte === 1) {
		conditions.push(ne(dossierAccompagnement.etat, Etat.SUPPRIME));
	}
	const membreId = Number(req.query.membre_id);
	if (Number.isFinite(membreId) && membreId > 0 && membre.type_compte === 1) {
		conditions.push(eq(dossierAccompagnement.membre_id, Math.trunc(membreId)));
	}
	// Recherche legacy (cht01) sur l'objet, élargie à la référence.
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			dossierAccompagnement.objet,
			dossierAccompagnement.reference
		)
	);

	const requete = db
		.select()
		.from(dossierAccompagnement)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(dossierAccompagnement.date_creation), desc(dossierAccompagnement.id))
		.$dynamic();

	const liste = paginer<Dossier>(requete, page);
	const membres = auteursDe(liste.items);
	res.json({
		items: liste.items.map((d) => vueResume(d, membres)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Nombre de dossiers visibles par type (clé = `type_dossier`). */
routeur.get('/compteurs', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const conditions = conditionsVisibles(membre);
	if (membre.type_compte === 1) conditions.push(ne(dossierAccompagnement.etat, Etat.SUPPRIME));

	const parType: Record<number, number> = {};
	for (const type of qa.QUESTIONNAIRES.keys()) parType[type] = 0;
	const lignes = db
		.select({ type: dossierAccompagnement.type_dossier, n: sql<number>`count(*)` })
		.from(dossierAccompagnement)
		.where(and(...conditions.filter(Boolean)))
		.groupBy(dossierAccompagnement.type_dossier)
		.all();
	for (const { type, n } of lignes) parType[type] = n;
	res.json({
		par_type: parType,
		total: Object.values(parType).reduce((a, b) => a + b, 0)
	});
});

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const q = qa.questionnaire(fiche.type_dossier);
	const detail: Record<string, unknown> = vueResume(fiche, auteursDe([fiche]));
	// Toutes les réponses enregistrées sont rechargées (correctif S7a : le legacy les effaçait).
	detail.reponses = q ? qa.nettoyerReponses(q, fiche.reponses) : { ...fiche.reponses };
	// Coordonnées du membre : visibles des seuls gestionnaires (le conseiller le rappelle).
	detail.contact = null;
	if (membre.type_compte === 1 && fiche.membre_id !== null) {
		const m = auteursDe([fiche]).get(fiche.membre_id);
		if (m) {
			detail.contact = {
				id: m.id,
				pseudonyme: m.pseudonyme,
				nom: m.nom,
				telephone: m.telephone,
				email: m.email
			};
		}
	}
	detail.peut_modifier = peutModifierDossier(fiche, membre);
	detail.peut_moderer = peutModerer(membre);
	res.json(detail);
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(dossierEntreeSchema, req.body);
	const q = qa.questionnaire(donnees.type_dossier);
	if (!q) {
		throw erreur("Type d'accompagnement inconnu.", {
			type_dossier: "Type d'accompagnement inconnu."
		});
	}
	const objet = donnees.objet.trim();
	validerObjet(q, objet, membre.id);

	const fiche = db
		.insert(dossierAccompagnement)
		.values({
			type_dossier: q.type,
			membre_id: membre.id,
			objet,
			reponses: qa.nettoyerReponses(q, donnees.reponses),
			etat: donnees.envoyer ? Etat.AUTORISE : Etat.NON_TRAITE,
			reference: nouvelleReference(q.prefixe)
		})
		.returning()
		.get()!;

	res.status(201).json(
		ok(donnees.envoyer ? q.message_envoi : q.message_sauvegarde, fiche.id, fiche.reference)
	);
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.membre_id);
	if (!peutModifierDossier(fiche, membre)) {
		throw erreur('Ce dossier est clôturé : écrivez à votre conseiller pour le rouvrir.');
	}
	const q = qa.questionnaire(fiche.type_dossier);
	if (!q) throw erreur("Type d'accompagnement inconnu.");
	const donnees = valider(dossierModificationSchema, req.body);
	const objet = donnees.objet.trim();
	validerObjet(q, objet, fiche.membre_id ?? membre.id, fiche.id);

	const valeurs: Record<string, unknown> = {
		objet,
		reponses: qa.nettoyerReponses(q, donnees.reponses)
	};
	if (donnees.envoyer && fiche.etat === Etat.NON_TRAITE) valeurs.etat = Etat.AUTORISE;
	db.update(dossierAccompagnement)
		.set(valeurs)
		.where(eq(dossierAccompagnement.id, fiche.id))
		.run();

	res.json(
		ok(donnees.envoyer ? q.message_envoi : 'Modification effectuée.', fiche.id, fiche.reference)
	);
});

/**
 * Validation par le conseiller (gestionnaire avec le droit « Activation ») ; le membre est prévenu
 * dans sa messagerie.
 */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	const ancien = fiche.etat;

	db.transaction(() => {
		changerEtat(dossierAccompagnement, fiche.id, donnees.etat, membre);
		const q = qa.questionnaire(fiche.type_dossier);
		if (fiche.membre_id !== null && donnees.etat !== ancien && fiche.membre_id !== membre.id) {
			db.insert(tableMessage)
				.values({
					membre_id: fiche.membre_id,
					auteur_id: null,
					de_la_frangine: true,
					texte: NOTIFICATIONS[donnees.etat]!.replace('{ref}', fiche.reference).replace(
						'{libelle}',
						q ? q.libelle : 'accompagnement'
					)
				})
				.run();
		}
	});
	res.json(ok('Modification effectuée.', fiche.id, fiche.reference));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(dossierAccompagnement, fiche, membre, 'membre_id');
	res.json(ok('Dossier supprimé.', fiche.id));
});
