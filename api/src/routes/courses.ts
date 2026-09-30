/**
 * Courses & livraison (portage de `app/routers/courses.py`) : commande de courses en saisie libre,
 * avec choix optionnel dans le catalogue d'une boutique partenaire (ADR-0007 S3c), et catalogue
 * « Vos articles » des boutiques.
 *
 * Legacy : choix3.php imbart=3, incl-choix3C.php, incl-course-1.php (actif), incl-course.php
 * (mort), particlecourse.php. Inventaire : F-S3-47 à F-S3-75. Paiement (type 4) :
 * `services/ecommerce.ts`.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import {
	exigerDroit,
	exigerMembre,
	membreRequis,
	pagination,
	peutModifier,
	verifierModification
} from '../deps.js';
import { BanqueBoutique, CategorieMembre, Etat, EtatCourse, libelle, OuiNon } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { articleCourse, course, ligneCourse } from '../schema/commerce.js';
import { parametre } from '../schema/core.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import {
	auteur,
	dateFacultative,
	dateHeureFacultative,
	entier,
	entierFacultatif,
	ok,
	valider,
	type Auteur
} from '../schemas/commun.js';
import * as ecommerce from '../services/ecommerce.js';
import { changerEtat, paginer, recherche, visibilite } from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	IMAGE,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/courses';

type Course = typeof course.$inferSelect;
type LigneCourse = typeof ligneCourse.$inferSelect;
type ArticleCatalogue = typeof articleCourse.$inferSelect;

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

/** Créneau de livraison legacy : 10 h à 18 h (sélecteur d'heure), minutes 0 à 59. */
const HEURE_MIN = 10;
const HEURE_MAX = 18;
/** Grille legacy de 25 articles. */
const LIGNES_MAX = 25;

/** Boutique partenaire : personne morale de type « Boutique » (legacy banqboutqmbr=2). */
export function estBoutique(m: Membre | null | undefined): boolean {
	return (
		!!m &&
		m.categorie === CategorieMembre.MORALE &&
		m.type_partenaire === BanqueBoutique.BOUTIQUE &&
		m.etat !== Etat.SUPPRIME
	);
}

function parametres(): {
	montant_minimum_course: number;
	commission_course: number;
} {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	return {
		montant_minimum_course: p?.montant_minimum_course ?? 0,
		commission_course: p?.commission_course ?? 0
	};
}

function lireMembre(id: number | null | undefined): Membre | undefined {
	if (!id) return undefined;
	return db.select().from(tableMembre).where(eq(tableMembre.id, id)).get();
}

// --- Boutiques partenaires -----------------------------------------------------------------------

/**
 * Boutiques partenaires proposées dans le formulaire de course, avec leur nombre d'articles
 * disponibles au catalogue.
 */
routeur.get('/boutiques', (_req, res) => {
	const membres = db
		.select()
		.from(tableMembre)
		.where(
			and(
				eq(tableMembre.categorie, CategorieMembre.MORALE),
				eq(tableMembre.type_partenaire, BanqueBoutique.BOUTIQUE),
				ne(tableMembre.etat, Etat.SUPPRIME)
			)
		)
		.orderBy(asc(tableMembre.pseudonyme), asc(tableMembre.nom))
		.all();
	const comptes = new Map(
		db
			.select({
				boutique_id: articleCourse.boutique_id,
				n: sql<number>`count(*)`
			})
			.from(articleCourse)
			.where(and(eq(articleCourse.etat, Etat.AUTORISE), eq(articleCourse.disponible, OuiNon.OUI)))
			.groupBy(articleCourse.boutique_id)
			.all()
			.map((l) => [l.boutique_id, l.n])
	);
	res.json(
		membres.map((m) => ({
			id: m.id,
			pseudonyme: m.pseudonyme || m.nom,
			nom: m.nom,
			adresse: m.adresse,
			nombre_articles: comptes.get(m.id) ?? 0,
			photo: m.photo,
			photo_url: url(m.photo)
		}))
	);
});

// --- Catalogue « Vos articles » (particlecourse.php) ---------------------------------------------

const articleEntreeSchema = z.object({
	// Imposé pour une boutique ; choisi par un gestionnaire.
	boutique_id: entierFacultatif,
	code: z.string().max(15).default(''),
	nom: z.string().max(200).default(''),
	marque: z.string().max(30).default(''),
	prix: entier.min(0).max(1_000_000_000).default(0),
	disponible: entier.min(1).max(2).default(1),
	description: z.string().max(2000).default('')
});

type ArticleEntree = z.output<typeof articleEntreeSchema>;

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

function vueArticle(a: ArticleCatalogue, boutiques: Map<number, Auteur | null>) {
	return {
		id: a.id,
		boutique_id: a.boutique_id,
		boutique: a.boutique_id !== null ? (boutiques.get(a.boutique_id) ?? null) : null,
		code: a.code,
		nom: a.nom,
		marque: a.marque,
		prix: a.prix,
		disponible: a.disponible,
		description: a.description,
		etat: a.etat,
		photo: a.photo,
		photo_url: url(a.photo)
	};
}

function boutiquesDe(articles: ArticleCatalogue[]): Map<number, Auteur | null> {
	const ids = [...new Set(articles.map((a) => a.boutique_id).filter((i): i is number => !!i))];
	if (ids.length === 0) return new Map();
	return new Map(
		db
			.select()
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, auteur(m)])
	);
}

/**
 * Public : articles publiés (pour composer une course). Boutique : aussi les siens non publiés ;
 * `miens=true` pour sa liste de gestion. Gestionnaire : tout (F-S3-70). Chaque borne de prix
 * s'applique seule et les filtres « disponibilité » et « mot » fonctionnent (correctifs).
 */
routeur.get('/catalogue', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [
		visibilite({ etat: articleCourse.etat, auteur: articleCourse.boutique_id }, membre)
	];

	if (membre && membre.type_compte === 1) {
		const brutEtat = Number(req.query.etat);
		const etat = Number.isFinite(brutEtat) && brutEtat > 0 ? Math.trunc(brutEtat) : null;
		conditions.push(etat ? eq(articleCourse.etat, etat) : ne(articleCourse.etat, Etat.SUPPRIME));
	}
	if (
		membre &&
		req.query.miens !== undefined &&
		req.query.miens !== 'false' &&
		req.query.miens !== '0'
	) {
		conditions.push(eq(articleCourse.boutique_id, membre.id));
	}
	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};
	const boutiqueId = nombre('boutique_id');
	if (boutiqueId) conditions.push(eq(articleCourse.boutique_id, boutiqueId));
	const disponible = nombre('disponible');
	if (disponible && disponible <= 2) conditions.push(eq(articleCourse.disponible, disponible));
	const prixMin = nombre('prix_min');
	if (prixMin) conditions.push(gte(articleCourse.prix, prixMin));
	const prixMax = nombre('prix_max');
	if (prixMax) conditions.push(lte(articleCourse.prix, prixMax));
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			articleCourse.code,
			articleCourse.nom,
			articleCourse.description,
			articleCourse.marque
		)
	);

	const requete = db
		.select()
		.from(articleCourse)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(articleCourse.nom), asc(articleCourse.id))
		.$dynamic();

	const liste = paginer<ArticleCatalogue>(requete, page);
	const boutiques = boutiquesDe(liste.items);
	res.json({
		items: liste.items.map((a) => vueArticle(a, boutiques)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

const ARTICLE_INTROUVABLE = "Cet article n'existe pas ou n'est plus proposé.";

function obtenirArticle(id: number, membre: Membre | null): ArticleCatalogue {
	const a = db.select().from(articleCourse).where(eq(articleCourse.id, id)).get();
	if (!a) throw introuvable(ARTICLE_INTROUVABLE);
	if (membre && membre.type_compte === 1) return a;
	if (a.etat === Etat.AUTORISE) return a;
	if (membre && a.boutique_id === membre.id && a.etat !== Etat.SUPPRIME) return a;
	throw introuvable(ARTICLE_INTROUVABLE);
}

routeur.get('/catalogue/:id', (req, res) => {
	const membre = req.membre;
	const a = obtenirArticle(Number(req.params.id), membre);
	res.json({
		...vueArticle(a, boutiquesDe([a])),
		peut_modifier: peutModifier(membre, a.boutique_id),
		peut_moderer: !!membre && peutModerer(membre)
	});
});

/** Règles legacy (particlecourse.php), messages harmonisés (F-S3-72/73). */
function validerArticle(d: ArticleEntree, boutiqueId: number | null, exclureId?: number): void {
	const champs: Record<string, string> = {};
	if (!boutiqueId || !estBoutique(lireMembre(boutiqueId))) {
		champs.boutique_id = 'Veuillez indiquer la boutique.';
	}
	if (d.nom.trim().length < 3) {
		champs.nom = "Le nom de l'article doit avoir 3 caractères minimum.";
	}
	if (d.prix < 1) champs.prix = 'Veuillez indiquer le prix de vente.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		eq(articleCourse.boutique_id, boutiqueId!),
		eq(articleCourse.nom, d.nom.trim()),
		eq(articleCourse.description, d.description.trim()),
		ne(articleCourse.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(articleCourse.id, exclureId));
	const doublon = db
		.select({ id: articleCourse.id })
		.from(articleCourse)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Cet article est déjà enregistré.', {
			nom: 'Votre catalogue contient déjà cet article.'
		});
	}
}

function champsArticle(d: ArticleEntree) {
	return {
		code: d.code.trim(),
		nom: d.nom.trim(),
		marque: d.marque.trim(),
		prix: d.prix,
		disponible: d.disponible,
		description: d.description.trim()
	};
}

/**
 * Une boutique ajoute un article à son catalogue ; un gestionnaire habilité peut le faire pour une
 * boutique (le legacy l'en empêchait).
 */
routeur.post('/catalogue', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(articleEntreeSchema, req.body);
	let boutiqueId: number | null;
	if (estBoutique(membre)) boutiqueId = membre.id;
	else if (peutModerer(membre)) boutiqueId = donnees.boutique_id;
	else throw interdit('Le catalogue est réservé aux boutiques partenaires.');

	validerArticle(donnees, boutiqueId);
	const a = db
		.insert(articleCourse)
		.values({
			boutique_id: boutiqueId,
			etat: Etat.AUTORISE,
			...champsArticle(donnees)
		})
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', a.id));
});

routeur.put('/catalogue/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const a = obtenirArticle(Number(req.params.id), membre);
	verifierModification(membre, a.boutique_id);
	const donnees = valider(articleEntreeSchema, req.body);
	validerArticle(donnees, a.boutique_id, a.id);
	db.update(articleCourse).set(champsArticle(donnees)).where(eq(articleCourse.id, a.id)).run();
	res.json(ok('Modification effectuée.', a.id));
});

routeur.post(
	'/catalogue/:id/photo',
	membreRequis,
	televersement.single('fichier'),
	async (req, res) => {
		const membre = exigerMembre(req);
		const a = obtenirArticle(Number(req.params.id), membre);
		verifierModification(membre, a.boutique_id);
		if (!req.file)
			throw erreur('Aucun fichier reçu.', {
				photo: 'Veuillez choisir une image.'
			});

		const ancien = a.photo;
		const photo = await enregistrerFichier(req.file.buffer, 'courses', new Set([IMAGE]), 'photo');
		db.update(articleCourse).set({ photo }).where(eq(articleCourse.id, a.id)).run();
		supprimerFichier(ancien);
		res.json(ok('Photo enregistrée.', a.id));
	}
);

/** F-S3-74 : état de la fiche réservé au gestionnaire ayant le droit « Activation ». */
routeur.post('/catalogue/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const a = obtenirArticle(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(articleCourse, a.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', a.id));
});

routeur.delete('/catalogue/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const a = obtenirArticle(Number(req.params.id), membre);
	verifierModification(membre, a.boutique_id);
	db.update(articleCourse).set({ etat: Etat.SUPPRIME }).where(eq(articleCourse.id, a.id)).run();
	res.json(ok('Article retiré du catalogue.', a.id));
});

// --- Courses : validation ------------------------------------------------------------------------

const ligneCourseSchema = z.object({
	article_catalogue_id: entierFacultatif,
	nom_article: z.string().max(200).default(''),
	prix_plafond: entier.min(0).max(1_000_000_000).default(0),
	quantite: entier.min(0).max(100_000).default(0),
	observation: z.string().max(250).default('')
});

const courseEntreeSchema = z.object({
	boutique_id: entierFacultatif,
	lieu_achat: z.string().max(500).default(''),
	date_achat: dateFacultative,
	date_livraison: dateHeureFacultative,
	lieu_livraison: z.string().max(500).default(''),
	observation: z.string().max(2000).default(''),
	lignes: z.array(ligneCourseSchema).default([])
});

type CourseEntree = z.output<typeof courseEntreeSchema>;

const etatCourseEntreeSchema = z.object({ etat_course: entier.min(1).max(4) });

interface LignePreparee {
	article_catalogue_id: number | null;
	nom_article: string;
	prix_plafond: number;
	quantite: number;
	observation: string;
}

interface Preparation {
	lignes: LignePreparee[];
	montant: number;
	boutique: Membre | null;
	lieuAchat: string;
}

/** Minuit local d'une date, pour comparer des jours sans tenir compte de l'heure. */
function jour(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `30/09/2026 à 11 h 05` — format du `strftime` legacy, minutes sur deux chiffres. */
function enFrancais(d: Date): string {
	const deux = (n: number) => String(n).padStart(2, '0');
	return (
		`${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()} ` +
		`à ${deux(d.getHours())} h ${deux(d.getMinutes())}`
	);
}

/** Les secondes de la livraison sont toujours remises à zéro (créneaux à la minute). */
function creneau(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
}

/**
 * Règles legacy (incl-course-1.php), appliquées côté serveur et corrigées (F-S3-53 à 58) : la date
 * du jour est acceptée, l'heure est contrôlée, une ligne incomplète est bloquante, le montant ne
 * compte que les lignes réellement enregistrées.
 */
function preparer(d: CourseEntree): Preparation {
	const champs: Record<string, string> = {};
	let boutique: Membre | null = null;
	if (d.boutique_id) {
		const m = lireMembre(d.boutique_id);
		if (estBoutique(m)) boutique = m!;
		else champs.boutique_id = 'Veuillez choisir une boutique partenaire de la liste.';
	}

	let lieuAchat = d.lieu_achat.trim();
	if (!lieuAchat && boutique) {
		lieuAchat = [boutique.nom.trim(), boutique.adresse.trim()].filter(Boolean).join(' — ');
	}
	if (lieuAchat.length < 10) {
		champs.lieu_achat = 'Veuillez indiquer le lieu des achats avec 10 caractères minimum.';
	}

	const aujourdHui = jour(new Date());
	if (!d.date_achat) {
		champs.date_achat = 'Veuillez indiquer la date des achats.';
	} else if (jour(d.date_achat) < aujourdHui) {
		champs.date_achat = 'La date des courses ne peut être antérieure à la date du jour.';
	}
	if (!d.date_livraison) {
		champs.date_livraison = "Veuillez indiquer la date de livraison ainsi que l'heure.";
	} else {
		const livraison = creneau(d.date_livraison);
		if (jour(livraison) < aujourdHui) {
			champs.date_livraison = 'La date de livraison ne peut être antérieure à la date du jour.';
		} else if (livraison.getHours() < HEURE_MIN || livraison.getHours() > HEURE_MAX) {
			champs.date_livraison = 'Les livraisons se font entre 10 h 00 et 18 h 59.';
		} else if (d.date_achat && jour(livraison) < jour(d.date_achat)) {
			champs.date_livraison = 'La date de livraison ne peut être antérieure à la date des courses.';
		} else if (livraison.getTime() < Date.now()) {
			champs.date_livraison =
				'Cette heure de livraison est déjà passée : choisissez un créneau à venir.';
		}
	}
	if (d.lieu_livraison.trim().length < 10) {
		champs.lieu_livraison = 'Veuillez indiquer le numéro de téléphone et le lieu de livraison.';
	}

	const lignes: LignePreparee[] = [];
	let montant = 0;
	if (d.lignes.length > LIGNES_MAX) {
		champs.lignes = `${LIGNES_MAX} articles au maximum par course.`;
	}
	d.lignes.slice(0, LIGNES_MAX).forEach((ligne, index) => {
		const i = index + 1;
		const cle = `ligne_${i}`;
		let nom: string;
		let prix: number;
		if (ligne.article_catalogue_id) {
			// Article du catalogue non choisi.
			if (ligne.quantite < 1) return;
			const art = db
				.select()
				.from(articleCourse)
				.where(eq(articleCourse.id, ligne.article_catalogue_id))
				.get();
			if (!art || art.etat !== Etat.AUTORISE || !boutique || art.boutique_id !== boutique.id) {
				champs[cle] = `Ligne ${i} : cet article n'est pas proposé par la boutique choisie.`;
				return;
			}
			if (art.disponible !== OuiNon.OUI) {
				champs[cle] = `Ligne ${i} : « ${art.nom} » n'est plus disponible.`;
				return;
			}
			nom = art.nom;
			prix = art.prix;
		} else {
			nom = ligne.nom_article.trim();
			prix = ligne.prix_plafond;
			// Ligne vide.
			if (!nom && prix === 0 && ligne.quantite === 0) return;
			if (nom.length < 3 || prix < 1 || ligne.quantite < 1) {
				champs[cle] =
					`Ligne ${i} incomplète : indiquez l'article (3 caractères minimum), ` +
					'le prix maxi et la quantité.';
				return;
			}
		}
		lignes.push({
			article_catalogue_id: ligne.article_catalogue_id || null,
			nom_article: nom,
			prix_plafond: prix,
			quantite: ligne.quantite,
			observation: ligne.observation.trim()
		});
		montant += prix * ligne.quantite;
	});

	const minimum = parametres().montant_minimum_course;
	if (!('lignes' in champs) && !Object.keys(champs).some((k) => k.startsWith('ligne_'))) {
		if (montant === 0) {
			champs.lignes = 'Veuillez indiquer le montant des achats.';
		} else if (montant < minimum) {
			champs.lignes = `Le montant des courses ne doit pas être inférieur à ${ecommerce.fcfa(minimum)}.`;
		}
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
	return { lignes, montant, boutique, lieuAchat };
}

/** F-S3-63 : les lignes sont réellement remplacées en modification. */
function appliquer(courseId: number, d: CourseEntree, p: Preparation): void {
	db.update(course)
		.set({
			boutique_id: p.boutique ? p.boutique.id : null,
			lieu_achat: p.lieuAchat,
			date_achat: d.date_achat,
			date_livraison: d.date_livraison ? creneau(d.date_livraison) : null,
			lieu_livraison: d.lieu_livraison.trim(),
			observation: d.observation.trim(),
			montant_achats: p.montant
		})
		.where(eq(course.id, courseId))
		.run();
	db.delete(ligneCourse).where(eq(ligneCourse.course_id, courseId)).run();
	if (p.lignes.length) {
		db.insert(ligneCourse)
			.values(
				p.lignes.map((l) => ({
					course_id: courseId,
					etat: Etat.AUTORISE,
					...l
				}))
			)
			.run();
	}
}

// --- Courses : vues ------------------------------------------------------------------------------

function lignesDe(courseIds: number[]): Map<number, LigneCourse[]> {
	const parCourse = new Map<number, LigneCourse[]>();
	if (courseIds.length === 0) return parCourse;
	for (const l of db
		.select()
		.from(ligneCourse)
		.where(inArray(ligneCourse.course_id, courseIds))
		.orderBy(asc(ligneCourse.id))
		.all()) {
		const liste = parCourse.get(l.course_id) ?? [];
		liste.push(l);
		parCourse.set(l.course_id, liste);
	}
	return parCourse;
}

function vueLigne(l: LigneCourse | LignePreparee) {
	return {
		id: 'id' in l ? l.id : null,
		article_catalogue_id: l.article_catalogue_id,
		nom_article: l.nom_article,
		prix_plafond: l.prix_plafond,
		quantite: l.quantite,
		observation: l.observation,
		montant: l.prix_plafond * l.quantite
	};
}

function vueResume(c: Course, lignes: LigneCourse[], acteurs: Map<number, Auteur | null>) {
	return {
		id: c.id,
		reference: c.reference,
		client: c.client_id !== null ? (acteurs.get(c.client_id) ?? null) : null,
		boutique: c.boutique_id !== null ? (acteurs.get(c.boutique_id) ?? null) : null,
		date_creation: c.date_creation,
		date_achat: c.date_achat,
		date_livraison: c.date_livraison,
		lieu_achat: c.lieu_achat,
		montant_achats: c.montant_achats,
		frais_service: c.frais_service,
		mode_paiement: c.mode_paiement,
		paye: c.paye,
		etat_course: c.etat_course,
		etat: c.etat,
		lignes: lignes.map(vueLigne),
		net_a_payer: c.montant_achats + c.frais_service
	};
}

function acteursDe(courses: Course[]): Map<number, Auteur | null> {
	const ids = [
		...new Set(courses.flatMap((c) => [c.client_id, c.boutique_id]).filter((i): i is number => !!i))
	];
	if (ids.length === 0) return new Map();
	return new Map(
		db
			.select()
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, auteur(m)])
	);
}

function vueDetail(c: Course, membre: Membre) {
	const lignes = lignesDe([c.id]).get(c.id) ?? [];
	const estClient = membre.id === c.client_id;
	const moderateur = peutModerer(membre);
	const estLaBoutique = c.boutique_id !== null && membre.id === c.boutique_id;
	const enAttente = c.etat_course === EtatCourse.EN_ATTENTE;
	const payee = c.paye === OuiNon.OUI;
	const p = ecommerce.paiementEnCours(c.id);

	const peutGerer = (moderateur || estLaBoutique) && c.etat !== Etat.SUPPRIME;
	const peutAnnuler = estClient && enAttente && !payee;
	let etatsPossibles: number[] = [];
	if (peutGerer) etatsPossibles = Object.values(EtatCourse);
	else if (peutAnnuler) etatsPossibles = [EtatCourse.SUPPRIMEE];

	// Coordonnées du client : boutique concernée et gestionnaires seulement.
	let contactClient = null;
	if ((estLaBoutique || membre.type_compte === 1) && c.client_id) {
		const client = lireMembre(c.client_id);
		if (client) {
			contactClient = {
				id: client.id,
				pseudonyme: client.pseudonyme,
				nom: client.nom,
				telephone: client.telephone,
				email: client.email
			};
		}
	}

	return {
		...vueResume(c, lignes, acteursDe([c])),
		boutique_id: c.boutique_id,
		lieu_livraison: c.lieu_livraison,
		observation: c.observation,
		contact_client: contactClient,
		paiement: p
			? {
					id: p.id,
					date_paiement: p.date_paiement,
					mode: p.mode,
					montant: p.montant,
					etat: p.etat
				}
			: null,
		est_client: estClient,
		peut_modifier: (estClient || moderateur) && enAttente && !payee && c.etat !== Etat.SUPPRIME,
		peut_annuler: peutAnnuler,
		peut_gerer: peutGerer,
		peut_moderer: moderateur,
		peut_payer:
			estClient &&
			!payee &&
			p === null &&
			c.etat_course !== EtatCourse.SUPPRIMEE &&
			c.etat !== Etat.SUPPRIME,
		etats_possibles: etatsPossibles
	};
}

// --- Courses : routes (déclarées après /boutiques, /catalogue) -----------------------------------

/**
 * Un membre voit ses courses (et une boutique celles qui lui sont adressées), le gestionnaire
 * toutes (F-S3-47). Chaque borne de date s'applique seule, jour inclus ; « Livrée » est filtrable
 * (correctifs F-S3-48). Tri : les plus récentes d'abord.
 */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};

	if (membre.type_compte === 1) {
		const etat = nombre('etat');
		conditions.push(etat ? eq(course.etat, etat) : ne(course.etat, Etat.SUPPRIME));
		const boutiqueId = nombre('boutique_id');
		if (boutiqueId) conditions.push(eq(course.boutique_id, boutiqueId));
	} else {
		conditions.push(ne(course.etat, Etat.SUPPRIME));
		const role = req.query.role;
		if (role === 'client') conditions.push(eq(course.client_id, membre.id));
		else if (role === 'boutique') conditions.push(eq(course.boutique_id, membre.id));
		else {
			conditions.push(or(eq(course.client_id, membre.id), eq(course.boutique_id, membre.id)));
		}
	}

	const etatCourse = nombre('etat_course');
	if (etatCourse && etatCourse <= 4) conditions.push(eq(course.etat_course, etatCourse));

	/** Bornes de date : la journée entière est incluse (`00:00:00` → `23:59:59.999999`). */
	const borneJour = (cle: string): Date | null => {
		const v = req.query[cle];
		if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
		const [a, m, j] = v.split('-').map(Number);
		return new Date(a!, m! - 1, j!);
	};
	const debutJournee = borneJour('commande_min');
	if (debutJournee) conditions.push(gte(course.date_creation, debutJournee));
	const finJournee = borneJour('commande_max');
	if (finJournee) {
		conditions.push(lte(course.date_creation, new Date(finJournee.getTime() + 86_400_000 - 1)));
	}
	const achatMin = borneJour('achat_min');
	if (achatMin) conditions.push(gte(course.date_achat, achatMin));
	const achatMax = borneJour('achat_max');
	if (achatMax) conditions.push(lte(course.date_achat, achatMax));
	const livraisonMin = borneJour('livraison_min');
	if (livraisonMin) conditions.push(gte(course.date_livraison, livraisonMin));
	const livraisonMax = borneJour('livraison_max');
	if (livraisonMax) {
		conditions.push(lte(course.date_livraison, new Date(livraisonMax.getTime() + 86_400_000 - 1)));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			course.reference,
			course.lieu_achat,
			course.lieu_livraison
		)
	);

	const requete = db
		.select()
		.from(course)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(course.date_creation), desc(course.id))
		.$dynamic();

	const liste = paginer<Course>(requete, page);
	const lignes = lignesDe(liste.items.map((c) => c.id));
	const acteurs = acteursDe(liste.items);
	res.json({
		items: liste.items.map((c) => vueResume(c, lignes.get(c.id) ?? [], acteurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

function obtenirCourse(id: number, membre: Membre): Course {
	const c = db.select().from(course).where(eq(course.id, id)).get();
	if (!c) throw introuvable("Cette course n'existe pas.");
	if (membre.type_compte === 1) return c;
	if (c.etat === Etat.SUPPRIME || (membre.id !== c.client_id && membre.id !== c.boutique_id)) {
		throw introuvable("Cette course n'existe pas ou ne vous concerne pas.");
	}
	return c;
}

/**
 * 1er temps de la validation (« Vérification ») : contrôle et calcule montant, frais et net à
 * payer, sans rien enregistrer (F-S3-58/59/61).
 */
routeur.post('/verifier', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = parametres();
	let frais = p.commission_course;
	const courseId = Number(req.query.course_id);
	if (Number.isFinite(courseId) && courseId > 0) {
		const c = obtenirCourse(Math.trunc(courseId), membre);
		verifierModification(membre, c.client_id);
		// Frais figés à la création.
		frais = c.frais_service;
	}
	const donnees = valider(courseEntreeSchema, req.body);
	const prep = preparer(donnees);
	res.json({
		montant_achats: prep.montant,
		frais_service: frais,
		net_a_payer: prep.montant + frais,
		montant_minimum: p.montant_minimum_course,
		nombre_articles: prep.lignes.reduce((n, l) => n + l.quantite, 0),
		lignes: prep.lignes.map(vueLigne),
		lieu_achat: prep.lieuAchat
	});
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(courseEntreeSchema, req.body);
	const prep = preparer(donnees);

	// Anti-doublon (legacy : même instant + même lieu) : commande identique encore en attente.
	const doublon = db
		.select({ id: course.id })
		.from(course)
		.where(
			and(
				eq(course.client_id, membre.id),
				eq(course.lieu_achat, prep.lieuAchat),
				donnees.date_achat
					? eq(course.date_achat, donnees.date_achat)
					: sql`${course.date_achat} is null`,
				eq(course.montant_achats, prep.montant),
				eq(course.etat_course, EtatCourse.EN_ATTENTE),
				ne(course.etat, Etat.SUPPRIME),
				eq(course.lieu_livraison, donnees.lieu_livraison.trim())
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette course est déjà faite.');

	const c = db.transaction(() => {
		const cree = db
			.insert(course)
			.values({
				client_id: membre.id,
				etat: Etat.AUTORISE,
				etat_course: EtatCourse.EN_ATTENTE,
				paye: OuiNon.NON,
				mode_paiement: 0,
				// Frais figés (F-S3-59).
				frais_service: parametres().commission_course,
				reference: nouvelleReference(Prefixe.COURSE)
			})
			.returning()
			.get()!;
		appliquer(cree.id, donnees, prep);
		if (prep.boutique) {
			const livraison = donnees.date_livraison ? enFrancais(creneau(donnees.date_livraison)) : '';
			ecommerce.prevenir(
				prep.boutique.id,
				`Nouvelle commande de courses ${cree.reference} pour votre boutique : ` +
					`${ecommerce.fcfa(prep.montant)} d'achats, livraison le ${livraison}. ` +
					`Détails : /courses/${cree.id}`
			);
		}
		return cree;
	});

	res.status(201).json(ok('Votre course est bien enregistrée.', c.id, c.reference));
});

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	res.json(vueDetail(obtenirCourse(Number(req.params.id), membre), membre));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirCourse(Number(req.params.id), membre);
	verifierModification(membre, c.client_id);
	// F-S3-65.
	if (c.etat_course !== EtatCourse.EN_ATTENTE) {
		throw erreur("Cette course n'est plus en attente : elle ne peut plus être modifiée.");
	}
	if (c.paye === OuiNon.OUI) {
		throw erreur('Cette course est déjà payée : elle ne peut plus être modifiée.');
	}
	const donnees = valider(courseEntreeSchema, req.body);
	const prep = preparer(donnees);
	db.transaction(() => appliquer(c.id, donnees, prep));
	res.json(ok('Modification effectuée.', c.id, c.reference));
});

/**
 * Machine à états (F-S3-64) : le client peut seulement annuler une course en attente et non payée ;
 * la boutique concernée et le gestionnaire habilité choisissent librement.
 */
routeur.post('/:id/etat-course', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirCourse(Number(req.params.id), membre);
	const donnees = valider(etatCourseEntreeSchema, req.body);
	const nouvel = donnees.etat_course;
	const gerant = peutModerer(membre) || (c.boutique_id !== null && c.boutique_id === membre.id);

	if (!gerant) {
		if (membre.id !== c.client_id) {
			throw interdit("Seuls la boutique concernée et la frangine gèrent l'état d'une course.");
		}
		if (c.etat_course !== EtatCourse.EN_ATTENTE || nouvel !== EtatCourse.SUPPRIMEE) {
			throw interdit('Vous pouvez seulement annuler une course encore en attente.');
		}
		if (c.paye === OuiNon.OUI) {
			throw erreur("Cette course est déjà payée : contactez la frangine pour l'annuler.");
		}
	}

	db.transaction(() => {
		db.update(course).set({ etat_course: nouvel }).where(eq(course.id, c.id)).run();
		if (c.etat_course !== nouvel) {
			if (gerant && membre.id !== c.client_id) {
				ecommerce.prevenir(
					c.client_id,
					`Votre course ${c.reference} est maintenant « ${libelle('EtatCourse', nouvel)} ». ` +
						`Suivi : /courses/${c.id}`
				);
			} else if (c.boutique_id && nouvel === EtatCourse.SUPPRIMEE) {
				ecommerce.prevenir(c.boutique_id, `Le client a annulé la course ${c.reference}.`);
			}
		}
	});

	const message =
		nouvel === EtatCourse.SUPPRIMEE && !gerant
			? 'Votre course est annulée.'
			: 'Modification effectuée.';
	res.json(ok(message, c.id));
});

/** État de la fiche : gestionnaire ayant le droit « Activation ». */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirCourse(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(course, c.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', c.id));
});

/** Suppression logique réservée au gestionnaire habilité (le client, lui, annule sa course). */
routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirCourse(Number(req.params.id), membre);
	exigerDroit(membre, 'activation');
	db.update(course).set({ etat: Etat.SUPPRIME }).where(eq(course.id, c.id)).run();
	res.json(ok('Fiche supprimée.', c.id));
});
