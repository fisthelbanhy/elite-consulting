/**
 * Forum « Conseil financier » (portage de `app/routers/conseil_financier.py` ; legacy
 * choix7.php cgb=1, incl-choix7A.php, incl-conseilfinance.php). Inventaire : S7-1, F-S7-03 à
 * F-S7-11.
 *
 * Rubriques : 1 Conseil financier (privé par défaut : échange membre ↔ conseiller), 2 Rumeurs
 * économiques (public, affiché « Actus & décryptages »). La rubrique « Accompagnement » renvoie
 * vers le module accompagnement.
 *
 * Un sujet a `sujet_id` NULL ; ses réponses pointent vers lui (même référence, même rubrique, même
 * confidentialité — correctif F-S7-10). Réservé aux membres connectés (F-S7-02).
 */
import { and, asc, desc, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, verifierModification } from '../deps.js';
import { Confidentialite, Etat, RubriqueConseilFinance, TypeMembre } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { conseilFinance } from '../schema/finance.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, type Auteur } from '../schemas/commun.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/conseil-financier';

type Fiche = typeof conseilFinance.$inferSelect;

/** États dans lesquels un sujet accepte encore des réponses. */
const OUVERTS: number[] = [Etat.NON_TRAITE, Etat.AUTORISE];
/** États dans lesquels un sujet public est lisible par tous les membres. */
const LISIBLES: number[] = [Etat.AUTORISE, Etat.CLOTURE];

const NOMS: Record<number, string> = {
	[RubriqueConseilFinance.CONSEIL]: 'Conseil financier',
	[RubriqueConseilFinance.RUMEURS]: 'Actus & décryptages'
};

const confidentialiteFacultative = z
	.union([z.null(), z.undefined(), z.literal(''), z.coerce.number().int().min(1).max(2)])
	.transform((v) => (v === '' || v === null || v === undefined ? null : v))
	.optional();

const sujetEntreeSchema = z.object({
	rubrique: z.coerce.number().int().min(1).max(2),
	objet: z.string().max(120).default(''),
	texte: z.string().max(5000).default(''),
	// Conseil financier : privé par défaut ; Rumeurs : toujours public.
	confidentialite: confidentialiteFacultative
});

const sujetModificationSchema = z.object({
	objet: z.string().max(120).default(''),
	texte: z.string().max(5000).default(''),
	confidentialite: confidentialiteFacultative
});

const reponseEntreeSchema = z.object({ texte: z.string().max(5000).default('') });
const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

/**
 * Gestionnaire : tout sauf supprimé. Membre : ses sujets (hors supprimés) et les sujets publics
 * publiés ou clôturés. Un sujet privé n'est visible que de son auteur et des gestionnaires
 * (décision F-S7-07, cf. ADR-0007 S1a).
 */
function conditionVisibilite(membre: Membre): SQL {
	if (membre.type_compte === 1) return ne(conseilFinance.etat, Etat.SUPPRIME);
	return or(
		and(eq(conseilFinance.auteur_id, membre.id), ne(conseilFinance.etat, Etat.SUPPRIME)),
		and(
			eq(conseilFinance.confidentialite, Confidentialite.PUBLIC),
			inArray(conseilFinance.etat, LISIBLES)
		)
	)!;
}

function peutVoir(sujet: Fiche, membre: Membre): boolean {
	if (membre.type_compte === 1) return true;
	if (sujet.auteur_id === membre.id) return sujet.etat !== Etat.SUPPRIME;
	return sujet.confidentialite === Confidentialite.PUBLIC && LISIBLES.includes(sujet.etat);
}

function lire(id: number): Fiche | undefined {
	return db.select().from(conseilFinance).where(eq(conseilFinance.id, id)).get();
}

function obtenirSujet(id: number, membre: Membre): Fiche {
	const sujet = lire(id);
	if (!sujet || sujet.sujet_id !== null || !peutVoir(sujet, membre)) {
		throw introuvable("Ce sujet n'existe pas ou ne vous est pas accessible.");
	}
	return sujet;
}

function auteursDe(fiches: Fiche[]) {
	const ids = [...new Set(fiches.map((f) => f.auteur_id).filter((i): i is number => i !== null))];
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

/** Sujets du lot auxquels un gestionnaire a déjà répondu (pastille « un conseiller a répondu »). */
function sujetsRepondusParConseiller(ids: number[]): Set<number> {
	if (ids.length === 0) return new Set();
	const lignes = db
		.selectDistinct({ sujet_id: conseilFinance.sujet_id })
		.from(conseilFinance)
		.innerJoin(tableMembre, eq(tableMembre.id, conseilFinance.auteur_id))
		.where(
			and(
				inArray(conseilFinance.sujet_id, ids),
				ne(conseilFinance.etat, Etat.SUPPRIME),
				eq(tableMembre.type_compte, TypeMembre.GESTIONNAIRE)
			)
		)
		.all();
	return new Set(lignes.map((l) => l.sujet_id).filter((i): i is number => i !== null));
}

function vueResume(
	f: Fiche,
	membres: Map<number, typeof tableMembre.$inferSelect>,
	reponduParConseiller = false
) {
	const redacteur: Auteur | null = f.auteur_id !== null ? auteur(membres.get(f.auteur_id)) : null;
	return {
		id: f.id,
		rubrique: f.rubrique,
		reference: f.reference,
		objet: f.objet,
		texte: f.texte,
		confidentialite: f.confidentialite,
		nombre_reponses: f.nombre_reponses,
		etat: f.etat,
		date_creation: f.date_creation,
		auteur: redacteur,
		repondu_par_conseiller: reponduParConseiller
	};
}

function vueDetail(sujet: Fiche, membre: Membre) {
	const reponses = db
		.select()
		.from(conseilFinance)
		.where(and(eq(conseilFinance.sujet_id, sujet.id), ne(conseilFinance.etat, Etat.SUPPRIME)))
		.orderBy(asc(conseilFinance.date_creation), asc(conseilFinance.id))
		.all();
	const membres = auteursDe([sujet, ...reponses]);

	const vues = reponses.map((r) => {
		const redacteur = r.auteur_id !== null ? membres.get(r.auteur_id) : undefined;
		return {
			id: r.id,
			texte: r.texte,
			etat: r.etat,
			date_creation: r.date_creation,
			auteur: auteur(redacteur),
			de_la_frangine: !!redacteur && redacteur.type_compte === 1,
			peut_modifier: r.auteur_id === membre.id || peutModerer(membre)
		};
	});

	const estAuteur = sujet.auteur_id === membre.id;
	return {
		...vueResume(sujet, membres, vues.some((v) => v.de_la_frangine)),
		reponses: vues,
		est_auteur: estAuteur,
		peut_modifier: estAuteur || peutModerer(membre),
		peut_moderer: peutModerer(membre),
		// Un sujet clôturé est fermé aux réponses (correctif F-S7-11).
		peut_repondre: OUVERTS.includes(sujet.etat),
		peut_cloturer: OUVERTS.includes(sujet.etat) && (estAuteur || membre.type_compte === 1)
	};
}

/** Sujet encore ouvert du membre dans une rubrique (règle « un sujet ouvert à la fois »). */
function sujetOuvert(rubrique: number, membreId: number): number | null {
	const ligne = db
		.select({ id: conseilFinance.id })
		.from(conseilFinance)
		.where(
			and(
				isNull(conseilFinance.sujet_id),
				eq(conseilFinance.rubrique, rubrique),
				eq(conseilFinance.auteur_id, membreId),
				inArray(conseilFinance.etat, OUVERTS)
			)
		)
		.limit(1)
		.get();
	return ligne ? ligne.id : null;
}

function validerSujet(rubrique: number, objet: string, texte: string, exclureId?: number): void {
	const champs: Record<string, string> = {};
	if (objet.length < 2) champs.objet = "L'objet du conseil doit avoir 2 caractères minimum.";
	if (texte.length < 2) champs.texte = 'Le texte doit avoir 2 caractères minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		isNull(conseilFinance.sujet_id),
		eq(conseilFinance.rubrique, rubrique),
		sql`lower(${conseilFinance.objet}) = ${objet.toLowerCase()}`,
		ne(conseilFinance.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(conseilFinance.id, exclureId));
	const doublon = db
		.select({ id: conseilFinance.id })
		.from(conseilFinance)
		.where(and(...conditions))
		.limit(1)
		.get();
	// Le legacy refusait sans aucun message (F-S7-05).
	if (doublon) {
		throw erreur('Un sujet portant le même objet existe déjà.', {
			objet: 'Un sujet portant le même objet existe déjà : choisissez un objet plus précis.'
		});
	}
}

function confidentialiteDe(rubrique: number, demandee: number | null | undefined): number {
	if (rubrique === RubriqueConseilFinance.RUMEURS) return Confidentialite.PUBLIC;
	return demandee || Confidentialite.PRIVE;
}

routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [
		isNull(conseilFinance.sujet_id),
		conditionVisibilite(membre)
	];

	const brutRubrique = Number(req.query.rubrique);
	const rubrique =
		Number.isFinite(brutRubrique) && brutRubrique >= 1 && brutRubrique <= 2
			? Math.trunc(brutRubrique)
			: null;
	if (rubrique) conditions.push(eq(conseilFinance.rubrique, rubrique));

	const brutEtat = Number(req.query.etat);
	if (Number.isFinite(brutEtat) && brutEtat >= 1 && brutEtat <= 4 && membre.type_compte === 1) {
		conditions.push(eq(conseilFinance.etat, Math.trunc(brutEtat)));
	}
	if (req.query.miens !== undefined && req.query.miens !== 'false' && req.query.miens !== '0') {
		conditions.push(eq(conseilFinance.auteur_id, membre.id));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			conseilFinance.objet,
			conseilFinance.texte,
			conseilFinance.reference
		)
	);

	// Tri legacy : chronologique pour le conseil financier, antéchronologique pour les rumeurs
	// (F-S7-06).
	const ordre =
		rubrique === RubriqueConseilFinance.CONSEIL
			? asc(conseilFinance.date_creation)
			: desc(conseilFinance.date_creation);

	const requete = db
		.select()
		.from(conseilFinance)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(ordre, asc(conseilFinance.id))
		.$dynamic();

	const liste = paginer<Fiche>(requete, page);
	const membres = auteursDe(liste.items);
	const repondus = sujetsRepondusParConseiller(liste.items.map((i) => i.id));
	res.json({
		items: liste.items.map((f) => vueResume(f, membres, repondus.has(f.id))),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/compteurs', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const visibilite = conditionVisibilite(membre);
	const compter = (rubrique: number) =>
		db
			.select({ n: sql<number>`count(*)` })
			.from(conseilFinance)
			.where(
				and(isNull(conseilFinance.sujet_id), eq(conseilFinance.rubrique, rubrique), visibilite)
			)
			.get()?.n ?? 0;

	res.json({
		conseil: compter(RubriqueConseilFinance.CONSEIL),
		rumeurs: compter(RubriqueConseilFinance.RUMEURS),
		sujet_ouvert_conseil: sujetOuvert(RubriqueConseilFinance.CONSEIL, membre.id),
		sujet_ouvert_rumeurs: sujetOuvert(RubriqueConseilFinance.RUMEURS, membre.id)
	});
});

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	res.json(vueDetail(obtenirSujet(Number(req.params.id), membre), membre));
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(sujetEntreeSchema, req.body);
	const objet = donnees.objet.trim();
	const texte = donnees.texte.trim();

	// Un membre ne garde qu'un sujet ouvert par rubrique (F-S7-03) ; le gestionnaire n'est pas
	// limité.
	if (membre.type_compte !== 1 && sujetOuvert(donnees.rubrique, membre.id) !== null) {
		throw erreur('Pour entamer un nouveau sujet, il faut clôturer le précédent.');
	}
	validerSujet(donnees.rubrique, objet, texte);

	const sujet = db
		.insert(conseilFinance)
		.values({
			rubrique: donnees.rubrique,
			objet,
			texte,
			auteur_id: membre.id,
			confidentialite: confidentialiteDe(donnees.rubrique, donnees.confidentialite),
			etat: Etat.AUTORISE,
			reference: nouvelleReference(Prefixe.CONSEIL_FINANCE)
		})
		.returning()
		.get()!;

	res.status(201).json(ok('Enregistrement effectué.', sujet.id, sujet.reference));
});

/**
 * Sujet : son auteur (y compris un simple membre — correctif F-S7-08) ou un gestionnaire habilité.
 * Réponse : son auteur ou un gestionnaire habilité (seul le texte compte).
 */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = lire(Number(req.params.id));
	if (!fiche) throw introuvable("Ce message n'existe pas.");
	const sujet = fiche.sujet_id === null ? fiche : lire(fiche.sujet_id);
	if (!sujet || !peutVoir(sujet, membre) || fiche.etat === Etat.SUPPRIME) {
		throw introuvable("Ce message n'existe pas ou ne vous est pas accessible.");
	}
	verifierModification(membre, fiche.auteur_id);
	const donnees = valider(sujetModificationSchema, req.body);
	const texte = donnees.texte.trim();

	db.transaction(() => {
		if (fiche.sujet_id !== null) {
			if (texte.length < 2) {
				throw erreur('La réponse doit avoir 2 caractères minimum.', {
					texte: 'La réponse doit avoir 2 caractères minimum.'
				});
			}
			db.update(conseilFinance).set({ texte }).where(eq(conseilFinance.id, fiche.id)).run();
			return;
		}
		const objet = donnees.objet.trim();
		validerSujet(fiche.rubrique, objet, texte, fiche.id);
		const valeurs: Record<string, unknown> = { objet, texte };
		if (donnees.confidentialite) {
			const nouvelle = confidentialiteDe(fiche.rubrique, donnees.confidentialite);
			valeurs.confidentialite = nouvelle;
			// Les réponses héritent de la confidentialité du sujet.
			db.update(conseilFinance)
				.set({ confidentialite: nouvelle })
				.where(eq(conseilFinance.sujet_id, fiche.id))
				.run();
		}
		db.update(conseilFinance).set(valeurs).where(eq(conseilFinance.id, fiche.id)).run();
	});

	res.json(ok('Modification effectuée.', sujet.id, fiche.reference));
});

routeur.post('/:id/reponses', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = obtenirSujet(Number(req.params.id), membre);
	if (!OUVERTS.includes(sujet.etat)) {
		throw erreur("Ce sujet est clôturé : il n'accepte plus de réponse.");
	}
	const donnees = valider(reponseEntreeSchema, req.body);
	const texte = donnees.texte.trim();
	if (texte.length < 2) {
		throw erreur('La réponse doit avoir 2 caractères minimum.', {
			texte: 'La réponse doit avoir 2 caractères minimum.'
		});
	}
	const deja = db
		.select({ id: conseilFinance.id })
		.from(conseilFinance)
		.where(
			and(
				eq(conseilFinance.sujet_id, sujet.id),
				eq(conseilFinance.texte, texte),
				ne(conseilFinance.etat, Etat.SUPPRIME)
			)
		)
		.limit(1)
		.get();
	if (deja) throw erreur('Ce message est déjà envoyé.', { texte: 'Ce message est déjà envoyé.' });

	const reponse = db.transaction(() => {
		const r = db
			.insert(conseilFinance)
			.values({
				rubrique: sujet.rubrique,
				reference: sujet.reference,
				sujet_id: sujet.id,
				objet: '',
				texte,
				auteur_id: membre.id,
				auteur_sujet_id: sujet.auteur_id,
				// Héritée (le legacy y mettait le n° de rubrique).
				confidentialite: sujet.confidentialite,
				etat: Etat.AUTORISE
			})
			.returning()
			.get()!;
		db.update(conseilFinance)
			.set({ nombre_reponses: sujet.nombre_reponses + 1 })
			.where(eq(conseilFinance.id, sujet.id))
			.run();
		// L'auteur est prévenu quand un conseiller lui répond (« Un conseiller vous répond »).
		if (membre.type_compte === 1 && sujet.auteur_id && sujet.auteur_id !== membre.id) {
			db.insert(tableMessage)
				.values({
					membre_id: sujet.auteur_id,
					auteur_id: null,
					de_la_frangine: true,
					texte:
						`Un conseiller a répondu à votre sujet « ${sujet.objet} » ` +
						`(${NOMS[sujet.rubrique] ?? 'Conseil financier'}). ` +
						`Retrouvez sa réponse sur /conseil-financier/${sujet.id}`
				})
				.run();
		}
		return r;
	});

	res.status(201).json(ok('Votre réponse est enregistrée.', reponse.id, sujet.reference));
});

/**
 * « Clôture sujet » : réservée à l'auteur et aux gestionnaires (correctif F-S7-11), dans les deux
 * rubriques (sinon un membre ne pourrait jamais rouvrir de sujet en « Rumeurs »).
 */
routeur.post('/:id/cloture', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = obtenirSujet(Number(req.params.id), membre);
	if (sujet.auteur_id !== membre.id && membre.type_compte !== 1) {
		throw interdit("Seul l'auteur du sujet ou un gestionnaire peut le clôturer.");
	}
	if (!OUVERTS.includes(sujet.etat)) throw erreur('Ce sujet est déjà clôturé.');
	db.update(conseilFinance)
		.set({ etat: Etat.CLOTURE })
		.where(eq(conseilFinance.id, sujet.id))
		.run();
	res.json(ok('Le sujet est clôturé.', sujet.id, sujet.reference));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = lire(Number(req.params.id));
	if (!fiche) throw introuvable("Ce message n'existe pas.");
	const donnees = valider(etatEntreeSchema, req.body);

	db.transaction(() => {
		changerEtat(conseilFinance, fiche.id, donnees.etat, membre);
		if (fiche.sujet_id !== null) ajusterCompteur(fiche.sujet_id, fiche.etat, donnees.etat);
	});
	res.json(ok('Modification effectuée.', fiche.id));
});

/** Le compteur de réponses du sujet suit les suppressions et les restaurations de ses réponses. */
function ajusterCompteur(sujetId: number, ancien: number, nouveau: number): void {
	const sujet = lire(sujetId);
	if (!sujet) return;
	if (ancien !== Etat.SUPPRIME && nouveau === Etat.SUPPRIME) {
		db.update(conseilFinance)
			.set({ nombre_reponses: Math.max(0, sujet.nombre_reponses - 1) })
			.where(eq(conseilFinance.id, sujet.id))
			.run();
	} else if (ancien === Etat.SUPPRIME && nouveau !== Etat.SUPPRIME) {
		db.update(conseilFinance)
			.set({ nombre_reponses: sujet.nombre_reponses + 1 })
			.where(eq(conseilFinance.id, sujet.id))
			.run();
	}
}

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = lire(Number(req.params.id));
	if (!fiche || fiche.etat === Etat.SUPPRIME) throw introuvable("Ce message n'existe pas.");
	if (fiche.auteur_id !== membre.id && !peutModerer(membre)) {
		throw interdit("Seul l'auteur ou un gestionnaire habilité peut supprimer ce message.");
	}
	db.transaction(() => {
		db.update(conseilFinance)
			.set({ etat: Etat.SUPPRIME })
			.where(eq(conseilFinance.id, fiche.id))
			.run();
		if (fiche.sujet_id !== null) ajusterCompteur(fiche.sujet_id, fiche.etat, Etat.SUPPRIME);
	});
	res.json(
		ok(fiche.sujet_id ? 'Message supprimé.' : 'Sujet supprimé.', fiche.sujet_id ?? fiche.id)
	);
});
