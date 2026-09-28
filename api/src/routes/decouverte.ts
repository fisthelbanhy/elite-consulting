/**
 * Découverte de soi (portage de `app/routers/decouverte.py` ; legacy « Lisungui » :
 * incl-choix1B.php, incl-sounga.php, table `soungangai`) et diagnostic gratuit (ADR-0008).
 * Inventaire : E-S1-04, F-S1-17 à F-S1-26.
 *
 * - Une seule fiche par membre, pour toujours (ADR-0004) ; une fiche clôturée se rouvre
 *   (ADR-0007 S1c) ; une fiche supprimée par un gestionnaire est reprise à blanc si le membre
 *   repart, en conservant sa référence.
 * - La fiche n'est visible que du membre concerné et des gestionnaires (jamais publique).
 * - « Correspondance la frangine » : écrite par un gestionnaire, lecture seule pour le membre.
 * - Deux états : `etat` (technique, 3 = supprimée) et `etat_fiche` (« État fiche » du formulaire
 *   legacy, suivi par le gestionnaire habilité).
 */
import { and, desc, eq, inArray, isNotNull, isNull, ne, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
	exigerDroit,
	exigerMembre,
	gestionnaireRequis,
	membreRequis,
	pagination
} from '../deps.js';
import { Etat, OuiNon } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage, soungangai } from '../schema/contenu.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { ok, valider } from '../schemas/commun.js';
import * as diag from '../services/decouverte.js';
import { paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/decouverte';

type Fiche = typeof soungangai.$inferSelect;

const INTROUVABLE = "Cette fiche de découverte de soi n'existe pas.";

const texte = () => z.string().max(5000).default('');
/** 0 = non renseigné, 1 = Oui, 2 = Non (valeurs legacy). */
const ouiNon = () => z.coerce.number().int().min(0).max(2).default(0);

/** Les 26 questions du legacy (incl-sounga.php) + la « Correspondance membre ». */
const ficheEntreeSchema = z.object({
	activite_actuelle: texte(), // 1
	savoir_faire: texte(), // 2
	activite_quotidienne: texte(), // 3
	secret_a_partager: texte(), // 4
	origine_idee: texte(), // 5
	idee_vue_chez_autrui: ouiNon(), // 6
	participation_idee_tierce: texte(), // 7
	est_sociable: ouiNon(), // 8
	interet_pour_autrui: ouiNon(), // 9
	a_deja_fait_commerce: ouiNon(), // 10
	se_fait_des_amis: ouiNon(), // 11
	garde_ses_relations: ouiNon(), // 12
	percu_comme_ouvert: ouiNon(), // 13
	perception_par_autrui: texte(), // 14
	est_meneur: ouiNon(), // 15 (1 = plutôt meneur, 2 = plutôt suiveur)
	prefere_entourage: ouiNon(), // 16 (1 = entouré de ses amis, 2 = seul)
	a_des_amis_proches: ouiNon(), // 17
	entourage_valorise_activite: ouiNon(), // 18
	entourage_proche: texte(), // 19
	personnes_consideration: texte(), // 20
	motivation: texte(), // 21
	pourcentage_implication: z.coerce.number().int().min(0).max(100).default(0), // 22
	moyens_disponibles: texte(), // 23
	soutien_conjoint: ouiNon(), // 24
	origine_soutien: texte(), // 25
	confronte_aux_faits: ouiNon(), // 26
	notes_membre: texte() // 27 « Correspondance membre »
});

type FicheEntree = z.output<typeof ficheEntreeSchema>;

const CHAMPS_QUESTIONNAIRE = Object.keys(ficheEntreeSchema.shape) as (keyof FicheEntree)[];

/** Valeurs par défaut du questionnaire, reprises telles quelles pour repartir à blanc. */
const QUESTIONNAIRE_VIDE = ficheEntreeSchema.parse({});

const correspondanceEntreeSchema = z.object({
	notes_conseillere: z.string().max(5000).default('')
});
/** `cloturee` est obligatoire, mais tolère les formes que produisent les formulaires. */
const clotureEntreeSchema = z.object({
	cloturee: z
		.union([
			z.boolean(),
			z.literal('true'),
			z.literal('false'),
			z.literal('on'),
			z.literal(1),
			z.literal(0),
			z.literal('1'),
			z.literal('0')
		])
		.transform((v) => v === true || v === 'true' || v === 'on' || v === 1 || v === '1')
});
const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(2) });

/** Le membre concerné : la fiche n'est visible que de lui et des gestionnaires. */
function membresDe(fiches: Fiche[]) {
	const ids = [...new Set(fiches.map((f) => f.membre_id))];
	if (ids.length === 0) return new Map<number, unknown>();
	return new Map(
		db
			.select({
				id: tableMembre.id,
				nom: tableMembre.nom,
				pseudonyme: tableMembre.pseudonyme,
				sexe: tableMembre.sexe,
				photo: tableMembre.photo
			})
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, { ...m, photo_url: url(m.photo) }])
	);
}

function vueResume(f: Fiche, membres: Map<number, unknown>) {
	return {
		id: f.id,
		reference: f.reference,
		date_creation: f.date_creation,
		etat: f.etat,
		etat_fiche: f.etat_fiche,
		cloturee: f.cloturee,
		pourcentage_implication: f.pourcentage_implication,
		date_diagnostic: f.date_diagnostic,
		membre: membres.get(f.membre_id) ?? null
	};
}

function vueDetail(f: Fiche, membre: Membre) {
	const detail: Record<string, unknown> = vueResume(f, membresDe([f]));
	for (const champ of CHAMPS_QUESTIONNAIRE) {
		detail[champ] = (f as unknown as Record<string, unknown>)[champ];
	}
	detail.notes_conseillere = f.notes_conseillere;
	detail.diagnostic = f.diagnostic;
	const proprietaire = f.membre_id === membre.id;
	detail.est_proprietaire = proprietaire;
	detail.peut_modifier =
		peutModerer(membre) || (proprietaire && f.cloturee !== OuiNon.OUI && f.etat !== Etat.SUPPRIME);
	detail.peut_moderer = peutModerer(membre);
	// « Correspondance la frangine » : réservée aux gestionnaires.
	detail.peut_repondre = membre.type_compte === 1;
	return detail;
}

/** Le membre concerné (sauf fiche supprimée) ou un gestionnaire ; 404 sinon. */
function obtenir(id: number, membre: Membre): Fiche {
	const fiche = db.select().from(soungangai).where(eq(soungangai.id, id)).get();
	if (!fiche) throw introuvable(INTROUVABLE);
	if (membre.type_compte === 1) return fiche;
	if (fiche.membre_id !== membre.id || fiche.etat === Etat.SUPPRIME) throw introuvable(INTROUVABLE);
	return fiche;
}

function ficheDuMembre(membre: Membre): Fiche | undefined {
	return db.select().from(soungangai).where(eq(soungangai.membre_id, membre.id)).get();
}

/**
 * Nouvelle fiche (référence LSG…), ou reprise à blanc d'une fiche supprimée : la contrainte
 * « une fiche par membre » est conservée, la référence aussi.
 */
function preparer(membre: Membre, existante: Fiche | undefined): Fiche {
	const remise = {
		...QUESTIONNAIRE_VIDE,
		notes_conseillere: '',
		diagnostic: null,
		date_diagnostic: null,
		etat: Etat.NON_TRAITE,
		etat_fiche: Etat.AUTORISE,
		cloturee: OuiNon.NON
	};
	if (!existante) {
		return db
			.insert(soungangai)
			.values({
				membre_id: membre.id,
				reference: nouvelleReference(Prefixe.SOUNGANGAI),
				...remise
			})
			.returning()
			.get()!;
	}
	return db
		.update(soungangai)
		.set({ date_creation: new Date(), ...remise })
		.where(eq(soungangai.id, existante.id))
		.returning()
		.get()!;
}

function champsFiche(d: FicheEntree) {
	const valeurs: Record<string, unknown> = {};
	for (const champ of CHAMPS_QUESTIONNAIRE) {
		const v = d[champ];
		valeurs[champ] = typeof v === 'string' ? v.trim() : v;
	}
	return valeurs;
}

// --- Diagnostic gratuit (public jusqu'à l'enregistrement) ----------------------------------------

/** Les 8 questions du diagnostic, avec leurs choix (une question par écran). */
routeur.get('/diagnostic/questions', (_req, res) => {
	res.json(diag.questions());
});

/** Restitution immédiate, sans compte et sans rien enregistrer. */
routeur.post('/diagnostic/restitution', (req, res) => {
	res.json(diag.restitution(diag.valider((req.body ?? {}) as Record<string, unknown>)));
});

/**
 * Crée ou complète la fiche Découverte de soi du membre avec son diagnostic, et dépose un message
 * « Nouveau diagnostic » dans son fil pour que la conseillère le rappelle.
 */
routeur.post('/diagnostic', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const codes = diag.valider((req.body ?? {}) as Record<string, unknown>);
	const r = diag.restitution(codes);
	const existante = ficheDuMembre(membre);

	// Double envoi (retour arrière, double clic) : pas de second message à la conseillère.
	const memesCodes = (stockes: unknown): boolean => {
		const anciens = (stockes ?? {}) as Record<string, unknown>;
		const cles = Object.keys(codes);
		return (
			Object.keys(anciens).length === cles.length && cles.every((c) => anciens[c] === codes[c])
		);
	};
	const veille = Date.now() - 24 * 60 * 60 * 1000;
	const dejaEnvoye =
		!!existante &&
		existante.etat !== Etat.SUPPRIME &&
		memesCodes((existante.diagnostic ?? {}).codes) &&
		existante.date_diagnostic !== null &&
		existante.date_diagnostic.getTime() > veille;

	const fiche = db.transaction(() => {
		let f =
			!existante || existante.etat === Etat.SUPPRIME ? preparer(membre, existante) : existante;
		// Un nouveau diagnostic relance le suivi.
		f = db
			.update(soungangai)
			.set({ cloturee: OuiNon.NON })
			.where(eq(soungangai.id, f.id))
			.returning()
			.get()!;
		diag.appliquer(f, codes, r);
		if (!dejaEnvoye) {
			db.insert(tableMessage)
				.values({
					membre_id: membre.id,
					auteur_id: membre.id,
					de_la_frangine: false,
					texte: diag.messageConseillere(r)
				})
				.run();
		}
		return f;
	});

	res
		.status(201)
		.json(
			ok(
				'Votre diagnostic est enregistré : votre conseillère vous rappelle très vite.',
				fiche.id,
				fiche.reference
			)
		);
});

// --- Fiche du membre -----------------------------------------------------------------------------

/** La fiche du membre connecté (ouverte ou clôturée), ou `null` s'il n'en a pas (F-S1-18/19). */
routeur.get('/moi', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = ficheDuMembre(membre);
	if (!fiche || fiche.etat === Etat.SUPPRIME) {
		res.json(null);
		return;
	}
	res.json(vueDetail(fiche, membre));
});

/** Toutes les fiches, pour les gestionnaires : « N Lisungui » (F-S1-24). */
routeur.get('/', gestionnaireRequis, (req, res) => {
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [ne(soungangai.etat, Etat.SUPPRIME)];

	const brutCloturee = Number(req.query.cloturee);
	if (Number.isFinite(brutCloturee) && brutCloturee >= 1 && brutCloturee <= 2) {
		conditions.push(eq(soungangai.cloturee, Math.trunc(brutCloturee)));
	}
	if (req.query.diagnostic !== undefined) {
		const avec = req.query.diagnostic !== 'false' && req.query.diagnostic !== '0';
		conditions.push(
			avec ? isNotNull(soungangai.date_diagnostic) : isNull(soungangai.date_diagnostic)
		);
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			soungangai.reference,
			tableMembre.nom,
			tableMembre.pseudonyme
		)
	);

	const requete = db
		.select({ fiche: soungangai })
		.from(soungangai)
		.innerJoin(tableMembre, eq(tableMembre.id, soungangai.membre_id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(soungangai.date_creation), desc(soungangai.id))
		.$dynamic();

	const liste = paginer<{ fiche: Fiche }>(requete, page);
	const fiches = liste.items.map((l) => l.fiche);
	const membres = membresDe(fiches);
	res.json({
		items: fiches.map((f) => vueResume(f, membres)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(ficheEntreeSchema, req.body);
	const existante = ficheDuMembre(membre);
	if (existante && existante.etat !== Etat.SUPPRIME) {
		throw erreur('Fiche de découverte de soi du membre déjà enregistrée.');
	}
	const fiche = db.transaction(() => {
		const f = preparer(membre, existante);
		return db
			.update(soungangai)
			.set(champsFiche(donnees))
			.where(eq(soungangai.id, f.id))
			.returning()
			.get()!;
	});
	res.status(201).json(ok('Enregistrement effectué.', fiche.id, fiche.reference));
});

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	res.json(vueDetail(obtenir(Number(req.params.id), membre), membre));
});

/** Le membre modifie sa fiche tant qu'elle est ouverte ; un gestionnaire habilité toujours. */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	if (fiche.membre_id !== membre.id && !peutModerer(membre)) {
		throw interdit(
			'Seul le membre concerné ou un gestionnaire habilité peut modifier cette fiche.'
		);
	}
	if (!peutModerer(membre) && fiche.cloturee === OuiNon.OUI) {
		throw erreur('Votre fiche est clôturée : rouvrez-la pour la modifier.');
	}
	const donnees = valider(ficheEntreeSchema, req.body);
	db.update(soungangai).set(champsFiche(donnees)).where(eq(soungangai.id, fiche.id)).run();
	res.json(ok('Modification effectuée.', fiche.id, fiche.reference));
});

/** « Correspondance la frangine » (F-S1-22) ; le membre est prévenu par sa messagerie. */
routeur.put('/:id/correspondance', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(correspondanceEntreeSchema, req.body);
	const texteNotes = donnees.notes_conseillere.trim();

	db.transaction(() => {
		if (texteNotes && texteNotes !== fiche.notes_conseillere) {
			db.insert(tableMessage)
				.values({
					membre_id: fiche.membre_id,
					auteur_id: membre.id,
					de_la_frangine: true,
					texte:
						'Votre conseillère a écrit sur votre fiche « Découverte de soi ». ' +
						'Retrouvez sa correspondance sur /decouverte-de-soi'
				})
				.run();
		}
		db.update(soungangai)
			.set({ notes_conseillere: texteNotes })
			.where(eq(soungangai.id, fiche.id))
			.run();
	});
	res.json(ok('Modification effectuée.', fiche.id));
});

/** Clôture ou réouverture par le membre ou un gestionnaire habilité (F-S1-23, ADR-0007 S1c). */
routeur.post('/:id/cloture', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	if (fiche.membre_id !== membre.id && !peutModerer(membre)) {
		throw interdit(
			'Seul le membre concerné ou un gestionnaire habilité peut clôturer cette fiche.'
		);
	}
	const donnees = valider(clotureEntreeSchema, req.body);
	db.update(soungangai)
		.set({ cloturee: donnees.cloturee ? OuiNon.OUI : OuiNon.NON })
		.where(eq(soungangai.id, fiche.id))
		.run();
	const message = donnees.cloturee
		? 'La fiche est clôturée.'
		: 'La fiche est rouverte : elle peut être complétée.';
	res.json(ok(message, fiche.id));
});

/** « État fiche » (suivi) : gestionnaire avec le droit Activation (F-S1-23). */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	exigerDroit(membre, 'activation');
	const donnees = valider(etatEntreeSchema, req.body);
	db.update(soungangai).set({ etat_fiche: donnees.etat }).where(eq(soungangai.id, fiche.id)).run();
	res.json(ok('Modification effectuée.', fiche.id));
});

/** Suppression logique par un gestionnaire habilité (F-S1-25). */
routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	exigerDroit(membre, 'activation');
	db.update(soungangai).set({ etat: Etat.SUPPRIME }).where(eq(soungangai.id, fiche.id)).run();
	res.json(ok('Fiche supprimée.', fiche.id));
});
