/**
 * Forum « Questions & conseils » (portage de `app/routers/questions.py` ; legacy
 * « Informations utiles » : incl-choix1A.php, incl-conseil.php, table `conseil`).
 * Inventaire : E-S1-01 à E-S1-03, F-S1-01 à F-S1-16.
 *
 * Un sujet est une ligne `conseil` sans `sujet_id` ; ses réponses (« commentaires » du legacy)
 * pointent vers lui par `sujet_id` et gardent sa référence.
 *
 * Règle ADR-0007 S1a : un sujet **privé** (échange membre ↔ la frangine) n'est visible, texte
 * compris, que de son auteur et des gestionnaires. L'identité publique est le pseudonyme ; le nom
 * réel n'est montré qu'au gestionnaire, à l'auteur et au Master pour un sujet public (F-S1-05).
 */
import { and, asc, desc, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, peutModifier, verifierModification } from '../deps.js';
import { Confidentialite, Etat, TypeMembre } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { conseil, message as tableMessage } from '../schema/contenu.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, type Auteur } from '../schemas/commun.js';
import { changerEtat, paginer, recherche, supprimer } from '../services/fiches.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/questions';

type Conseil = typeof conseil.$inferSelect;

/**
 * Un sujet clôturé reste lisible (le legacy listait les états 1, 2 et 4) mais n'accepte plus de
 * réponse.
 */
const LISIBLES: number[] = [Etat.AUTORISE, Etat.CLOTURE];
const INTROUVABLE = "Ce sujet n'existe pas ou n'est plus publié.";

const sujetEntreeSchema = z.object({
	confidentialite: z.coerce.number().int().nullable().optional(),
	objet: z.string().max(120).default(''),
	texte: z.string().max(20000).default('')
});
type SujetEntree = z.output<typeof sujetEntreeSchema>;

const reponseEntreeSchema = z.object({ texte: z.string().max(5000).default('') });
const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

// --- Visibilité ---------------------------------------------------------------------------------

/** Filtre SQL des lignes (sujets ou réponses) lisibles par ce lecteur, ou `undefined` (tout). */
function conditionVisible(membre: Membre | null): SQL | undefined {
	if (membre && membre.type_compte === 1) return undefined;
	const publique = and(
		inArray(conseil.etat, LISIBLES),
		eq(conseil.confidentialite, Confidentialite.PUBLIC)
	)!;
	if (!membre) return publique;
	return or(publique, and(eq(conseil.auteur_id, membre.id), ne(conseil.etat, Etat.SUPPRIME)));
}

function estVisible(c: Conseil, membre: Membre | null): boolean {
	if (membre && membre.type_compte === 1) return true;
	if (LISIBLES.includes(c.etat) && c.confidentialite === Confidentialite.PUBLIC) return true;
	return !!membre && c.auteur_id === membre.id && c.etat !== Etat.SUPPRIME;
}

/** Le sujet étant déjà lisible, une réponse l'est si elle est publiée (ou si c'est la sienne). */
function reponseVisible(r: Conseil, membre: Membre | null): boolean {
	if (r.etat === Etat.SUPPRIME) return false;
	if (membre && (membre.type_compte === 1 || r.auteur_id === membre.id)) return true;
	return LISIBLES.includes(r.etat);
}

function lireSujet(id: number, membre: Membre | null): Conseil {
	const sujet = db.select().from(conseil).where(eq(conseil.id, id)).get();
	if (!sujet || sujet.sujet_id !== null || !estVisible(sujet, membre)) throw introuvable(INTROUVABLE);
	return sujet;
}

function lireReponse(id: number, membre: Membre): Conseil {
	const rep = db.select().from(conseil).where(eq(conseil.id, id)).get();
	if (!rep || rep.sujet_id === null || !reponseVisible(rep, membre)) {
		throw introuvable("Cette réponse n'existe pas ou a été supprimée.");
	}
	return rep;
}

// --- Sérialisation ------------------------------------------------------------------------------

interface InfoAuteur {
	identite: Auteur;
	nom: string;
	estGestionnaire: boolean;
	typeCompte: number;
}

function auteursDes(lignes: Conseil[]): Map<number, InfoAuteur> {
	const ids = [...new Set(lignes.map((c) => c.auteur_id).filter((id): id is number => !!id))];
	if (ids.length === 0) return new Map();
	return new Map(
		db
			.select()
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [
				m.id,
				{
					identite: auteur(m)!,
					nom: m.nom,
					estGestionnaire: m.type_compte === TypeMembre.GESTIONNAIRE,
					typeCompte: m.type_compte
				}
			])
	);
}

/** Nom réel : gestionnaire, auteur, et Master pour un sujet public (F-S1-05). */
function nomVisible(c: Conseil, membre: Membre | null, info: InfoAuteur | undefined): boolean {
	if (!membre || !info) return false;
	return (
		membre.type_compte === 1 ||
		membre.id === c.auteur_id ||
		(membre.type_compte === TypeMembre.MASTER && c.confidentialite === Confidentialite.PUBLIC)
	);
}

function extrait(texte: string, n = 280): string {
	const t = (texte ?? '').split(/\s+/).filter(Boolean).join(' ');
	return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

function vueResume(c: Conseil, membre: Membre | null, auteurs: Map<number, InfoAuteur>) {
	const info = c.auteur_id !== null ? auteurs.get(c.auteur_id) : undefined;
	return {
		id: c.id,
		reference: c.reference,
		objet: c.objet,
		extrait: extrait(c.texte),
		confidentialite: c.confidentialite,
		etat: c.etat,
		nombre_reponses: c.nombre_reponses,
		date_creation: c.date_creation,
		auteur: info?.identite ?? null,
		auteur_nom: nomVisible(c, membre, info) ? (info?.nom ?? null) : null
	};
}

function vueDetail(sujet: Conseil, membre: Membre | null) {
	const reponses = db
		.select()
		.from(conseil)
		.where(eq(conseil.sujet_id, sujet.id))
		.orderBy(asc(conseil.date_creation), asc(conseil.id))
		.all()
		.filter((r) => reponseVisible(r, membre));

	const auteurs = auteursDes([sujet, ...reponses]);

	return {
		...vueResume(sujet, membre, auteurs),
		texte: sujet.texte,
		reponses: reponses.map((r) => {
			const info = r.auteur_id !== null ? auteurs.get(r.auteur_id) : undefined;
			return {
				id: r.id,
				texte: r.texte,
				etat: r.etat,
				date_creation: r.date_creation,
				auteur: info?.identite ?? null,
				auteur_nom: nomVisible(r, membre, info) ? (info?.nom ?? null) : null,
				// Réponse d'une conseillère (gestionnaire) : badge « La frangine ».
				de_la_frangine: info?.estGestionnaire ?? false,
				peut_modifier: peutModifier(membre, r.auteur_id)
			};
		}),
		peut_modifier: peutModifier(membre, sujet.auteur_id),
		peut_moderer: peutModerer(membre),
		peut_repondre: !!membre && sujet.etat === Etat.AUTORISE,
		est_auteur: !!membre && membre.id === sujet.auteur_id
	};
}

/** `nombre_reponses` = réponses non supprimées (le legacy incrémentait sans jamais décompter). */
function recompter(sujetId: number): void {
	const n =
		db
			.select({ n: sql<number>`count(*)` })
			.from(conseil)
			.where(and(eq(conseil.sujet_id, sujetId), ne(conseil.etat, Etat.SUPPRIME)))
			.get()?.n ?? 0;
	db.update(conseil).set({ nombre_reponses: n }).where(eq(conseil.id, sujetId)).run();
}

/** Dépose un message dans le fil privé du membre pour que les gestionnaires le voient. */
function ecrireALaFrangine(membre: Membre, texte: string): void {
	db.insert(tableMessage)
		.values({ membre_id: membre.id, auteur_id: membre.id, de_la_frangine: false, texte })
		.run();
}

// --- Lecture ------------------------------------------------------------------------------------

/** Sujets du plus récent au plus ancien ; recherche dans l'objet ou le texte (F-S1-03/04). */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [isNull(conseil.sujet_id), conditionVisible(membre)];

	if (membre && membre.type_compte === 1) {
		const brut = Number(req.query.etat);
		const etat = Number.isFinite(brut) && brut >= 1 && brut <= 4 ? Math.trunc(brut) : null;
		conditions.push(etat ? eq(conseil.etat, etat) : ne(conseil.etat, Etat.SUPPRIME));
	}
	if (req.query.miens === 'true' && membre) conditions.push(eq(conseil.auteur_id, membre.id));

	const conf = Number(req.query.confidentialite);
	if (conf === 1 || conf === 2) conditions.push(eq(conseil.confidentialite, conf));

	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			conseil.objet,
			conseil.texte,
			conseil.reference
		)
	);

	const requete = db
		.select()
		.from(conseil)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(conseil.date_creation), desc(conseil.id))
		.$dynamic();

	const liste = paginer<Conseil>(requete, page);
	const auteurs = auteursDes(liste.items);
	res.json({
		items: liste.items.map((c) => vueResume(c, membre, auteurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Colonne de droite du legacy : les 10 derniers sujets publiés (F-S1-07). */
routeur.get('/derniers', (req, res) => {
	const membre = req.membre;
	const brut = Number(req.query.n);
	const n = Number.isFinite(brut) ? Math.min(20, Math.max(1, Math.trunc(brut))) : 10;

	const lignes = db
		.select()
		.from(conseil)
		.where(
			and(isNull(conseil.sujet_id), eq(conseil.etat, Etat.AUTORISE), conditionVisible(membre))
		)
		.orderBy(desc(conseil.date_creation), desc(conseil.id))
		.limit(n)
		.all();

	const auteurs = auteursDes(lignes);
	res.json(lignes.map((c) => vueResume(c, membre, auteurs)));
});

/** Compteur de l'onglet : sujets actifs (publiés) seulement, réponses exclues (F-S1-02). */
routeur.get('/compteurs', (req, res) => {
	const n =
		db
			.select({ n: sql<number>`count(*)` })
			.from(conseil)
			.where(
				and(
					isNull(conseil.sujet_id),
					eq(conseil.etat, Etat.AUTORISE),
					conditionVisible(req.membre)
				)
			)
			.get()?.n ?? 0;
	res.json({ sujets: n });
});

/**
 * Fil d'un sujet et ses réponses chronologiques (F-S1-08). Les visiteurs lisent les fils
 * publics (le texte du sujet l'était déjà dans la liste legacy) ; répondre exige un compte.
 */
routeur.get('/:id', (req, res) => {
	res.json(vueDetail(lireSujet(Number(req.params.id), req.membre), req.membre));
});

// --- Sujets -------------------------------------------------------------------------------------

/** Règles legacy (incl-conseil.php), toutes signalées en même temps (F-S1-10, F-S1-12). */
function validerSujet(
	d: SujetEntree,
	membre: Membre,
	exclureId?: number
): { objet: string; texte: string } {
	const objet = d.objet.split(/\s+/).filter(Boolean).join(' ');
	const texte = d.texte.trim();
	const champs: Record<string, string> = {};

	if (d.confidentialite !== Confidentialite.PRIVE && d.confidentialite !== Confidentialite.PUBLIC) {
		champs.confidentialite = 'Indiquez la confidentialité du conseil : privé ou public.';
	}
	if (objet.length < 5) champs.objet = "L'objet du conseil doit avoir 5 caractères minimum.";
	if (texte.length < 20) champs.texte = 'Le texte du conseil doit avoir 20 caractères minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Doublon : même objet qu'un de ses sujets ou qu'un sujet public existant.
	const conditions = [
		isNull(conseil.sujet_id),
		sql`lower(${conseil.objet}) = ${objet.toLowerCase()}`,
		ne(conseil.etat, Etat.SUPPRIME),
		or(eq(conseil.auteur_id, membre.id), eq(conseil.confidentialite, Confidentialite.PUBLIC))
	];
	if (exclureId) conditions.push(ne(conseil.id, exclureId));
	const doublon = db
		.select({ id: conseil.id })
		.from(conseil)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Cette fiche est déjà enregistrée.', {
			objet: 'Un sujet porte déjà cet objet : consultez-le ou reformulez votre question.'
		});
	}
	return { objet, texte };
}

/** Création d'un sujet, publié immédiatement (F-S1-10, F-S1-11). */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(sujetEntreeSchema, req.body);
	const { objet, texte } = validerSujet(donnees, membre);

	const sujet = db.transaction(() => {
		const s = db
			.insert(conseil)
			.values({
				reference: nouvelleReference(Prefixe.CONSEIL),
				sujet_id: null,
				objet,
				texte,
				auteur_id: membre.id,
				confidentialite: donnees.confidentialite!,
				etat: Etat.AUTORISE,
				nombre_reponses: 0
			})
			.returning()
			.get()!;
		if (s.confidentialite === Confidentialite.PRIVE) {
			ecrireALaFrangine(
				membre,
				`Nouvelle question privée pour la frangine : « ${objet} ». À lire sur /questions/${s.id}`
			);
		}
		return s;
	});

	res.status(201).json(ok('Enregistrement effectué.', sujet.id, sujet.reference));
});

/** Objet, texte et confidentialité : l'auteur ou un gestionnaire habilité (F-S1-13). */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = lireSujet(Number(req.params.id), membre);
	verifierModification(membre, sujet.auteur_id);

	const donnees = valider(sujetEntreeSchema, req.body);
	const { objet, texte } = validerSujet(donnees, membre, sujet.id);

	db.transaction(() => {
		db.update(conseil)
			.set({ objet, texte, confidentialite: donnees.confidentialite! })
			.where(eq(conseil.id, sujet.id))
			.run();
		// Les réponses héritent de la confidentialité du sujet (F-S1-15).
		if (sujet.confidentialite !== donnees.confidentialite) {
			db.update(conseil)
				.set({ confidentialite: donnees.confidentialite! })
				.where(eq(conseil.sujet_id, sujet.id))
				.run();
		}
	});
	res.json(ok('Modification effectuée.', sujet.id, sujet.reference));
});

/** Modération (gestionnaire + droit « Activation ») : F-S1-14. */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = lireSujet(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(conseil, sujet.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', sujet.id));
});

/** Suppression logique (état 3) : auteur ou gestionnaire habilité (F-S1-09). */
routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = lireSujet(Number(req.params.id), membre);
	supprimer(conseil, sujet as never, membre);
	res.json(ok('Sujet supprimé.', sujet.id));
});

// --- Réponses -----------------------------------------------------------------------------------

function texteReponse(corps: unknown): string {
	const texte = valider(reponseEntreeSchema, corps).texte.trim();
	if (texte.length < 2) {
		throw erreur('Veuillez corriger les champs signalés.', {
			texte: 'Le commentaire doit avoir 2 caractères minimum.'
		});
	}
	return texte;
}

/**
 * Réponse à un sujet lisible : hérite de sa confidentialité, publiée immédiatement, incrémente
 * le nombre de réponses (F-S1-15). L'auteur du sujet est prévenu.
 */
routeur.post('/:id/reponses', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const sujet = lireSujet(Number(req.params.id), membre);

	if (sujet.etat === Etat.CLOTURE) {
		throw erreur("Ce sujet est clôturé : il n'accepte plus de réponses.");
	}
	if (sujet.etat !== Etat.AUTORISE) {
		throw erreur("Ce sujet n'accepte pas de réponses pour le moment.");
	}

	const texte = texteReponse(req.body);
	const doublon = db
		.select({ id: conseil.id })
		.from(conseil)
		.where(
			and(
				eq(conseil.sujet_id, sujet.id),
				eq(conseil.auteur_id, membre.id),
				eq(conseil.texte, texte),
				ne(conseil.etat, Etat.SUPPRIME)
			)
		)
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Ce message est déjà enregistré.', {
			texte: 'Vous avez déjà publié cette réponse.'
		});
	}

	const reponse = db.transaction(() => {
		const r = db
			.insert(conseil)
			.values({
				reference: sujet.reference,
				sujet_id: sujet.id,
				objet: '',
				texte,
				auteur_id: membre.id,
				confidentialite: sujet.confidentialite,
				etat: Etat.AUTORISE,
				nombre_reponses: 0
			})
			.returning()
			.get()!;
		recompter(sujet.id);

		const lien = `/questions/${sujet.id}`;
		if (sujet.auteur_id && sujet.auteur_id !== membre.id) {
			db.insert(tableMessage)
				.values({
					membre_id: sujet.auteur_id,
					auteur_id: null,
					de_la_frangine: true,
					texte: `Nouvelle réponse à votre question « ${sujet.objet} ». Retrouvez-la sur ${lien}`
				})
				.run();
		} else if (sujet.confidentialite === Confidentialite.PRIVE && membre.type_compte !== 1) {
			// L'auteur relance sa question privée : la frangine doit le voir.
			ecrireALaFrangine(membre, `J'ai complété ma question privée « ${sujet.objet} » : ${lien}`);
		}
		return r;
	});

	res.status(201).json(ok('Enregistrement effectué.', reponse.id, sujet.reference));
});

/** Correction d'une réponse sans contrainte d'objet ni de 20 caractères (F-S1-16). */
routeur.put('/reponses/:rid', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const reponse = lireReponse(Number(req.params.rid), membre);
	verifierModification(membre, reponse.auteur_id);
	db.update(conseil)
		.set({ texte: texteReponse(req.body) })
		.where(eq(conseil.id, reponse.id))
		.run();
	res.json(ok('Modification effectuée.', reponse.id));
});

routeur.post('/reponses/:rid/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const reponse = lireReponse(Number(req.params.rid), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	db.transaction(() => {
		changerEtat(conseil, reponse.id, donnees.etat, membre);
		if (reponse.sujet_id !== null) recompter(reponse.sujet_id);
	});
	res.json(ok('Modification effectuée.', reponse.id));
});

routeur.delete('/reponses/:rid', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const reponse = lireReponse(Number(req.params.rid), membre);
	db.transaction(() => {
		supprimer(conseil, reponse as never, membre);
		if (reponse.sujet_id !== null) recompter(reponse.sujet_id);
	});
	res.json(ok('Réponse supprimée.', reponse.id));
});
