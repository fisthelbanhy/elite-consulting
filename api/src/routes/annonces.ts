/**
 * Petites annonces d'articles neufs ou d'occasion, offres et recherches, avec panier et paiement
 * (portage de `app/routers/annonces.py` ; legacy : choix3.php imbart=2, incl-choix3B.php,
 * incl-article.php, table `panier` typepnr=2).
 * Inventaire : F-S3-03, F-S3-29 à F-S3-46, F-PAY-08. Paiement : services/ecommerce.ts.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import {
	exigerMembre,
	membreRequis,
	pagination,
	peutModifier,
	verifierModification
} from '../deps.js';
import { Etat, NeufOccasion, OffreDemande, TypeInteret, TypeObjetPaye } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { article, lignePanier, paiement } from '../schema/commerce.js';
import { familleArticle } from '../schema/core.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, vueInterets, type InteretOut } from '../schemas/commun.js';
import { etatEntreeSchema, interetEntreeSchema } from '../schemas/immobilier.js';
import { contactsDe } from '../services/contacts.js';
import {
	lignesEnRupture,
	lignesPanier,
	MESSAGE_STOCK,
	total as totalPanier,
	type LigneAvecArticle
} from '../services/ecommerce.js';
import {
	changerEtat,
	compterVisite,
	exigerVisible,
	paginer,
	recherche,
	supprimer,
	visibilite
} from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	IMAGE,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import { deposer, lister as listerInterets } from '../services/interets.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/annonces';

const INTROUVABLE = "Cette annonce n'existe pas ou n'est plus publiée.";
const QUANTITE_MAX = 1_000_000;

type Article = typeof article.$inferSelect;

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const COLONNES_FICHE = { etat: article.etat, auteur: article.auteur_id };

const articleEntreeSchema = z.object({
	offre_ou_recherche: z.coerce.number().int().default(0),
	famille_id: z.coerce.number().int().nullable().optional(),
	libelle: z.string().max(200).default(''),
	prix: z.coerce.number().int().min(0).max(1_000_000_000_000).default(0),
	quantite: z.coerce.number().int().min(0).max(QUANTITE_MAX).default(0),
	neuf_ou_occasion: z.coerce.number().int().default(0),
	description: z.string().max(5000).default('')
});
type ArticleEntree = z.output<typeof articleEntreeSchema>;

const quantiteEntreeSchema = z.object({
	quantite: z.coerce.number().int().min(0).max(QUANTITE_MAX).default(0)
});

interface FamilleOut {
	id: number;
	libelle: string;
}

function tableFamilles(): Map<number, FamilleOut> {
	return new Map(
		db
			.select({ id: familleArticle.id, libelle: familleArticle.libelle })
			.from(familleArticle)
			.all()
			.map((f) => [f.id, f])
	);
}

function familleDe(a: Article, familles: Map<number, FamilleOut>): FamilleOut | null {
	return a.famille_id !== null ? (familles.get(a.famille_id) ?? null) : null;
}

function vueResume(a: Article, famille: FamilleOut | null) {
	return {
		id: a.id,
		reference: a.reference,
		offre_ou_recherche: a.offre_ou_recherche,
		famille,
		libelle: a.libelle,
		prix: a.prix,
		quantite: a.quantite,
		neuf_ou_occasion: a.neuf_ou_occasion,
		description: a.description,
		etat: a.etat,
		date_creation: a.date_creation,
		nombre_visites: a.nombre_visites,
		date_derniere_visite: a.date_derniere_visite,
		photo: a.photo,
		photo_url: url(a.photo)
	};
}

function obtenir(id: number, membre: Membre | null): Article {
	const fiche = db.select().from(article).where(eq(article.id, id)).get();
	return exigerVisible(fiche as never, membre, { message: INTROUVABLE }) as unknown as Article;
}

function entierQuery(valeur: unknown, min: number, max: number): number | null {
	const n = Number(valeur);
	if (!Number.isFinite(n)) return null;
	const e = Math.trunc(n);
	return e >= min && e <= max ? e : null;
}

// --- Liste et encarts -----------------------------------------------------------------------------

/**
 * Filtres legacy : famille, neuf/occasion, prix minimum, mot (libellé OU description,
 * correctement parenthésé — F-S3-30) ; + prix maximum. Tri legacy : famille puis prix.
 */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	if (membre && membre.type_compte === 1) {
		const etat = entierQuery(req.query.etat, 1, 4);
		conditions.push(etat ? eq(article.etat, etat) : ne(article.etat, Etat.SUPPRIME));
	}
	if (req.query.miennes === 'true' && membre) conditions.push(eq(article.auteur_id, membre.id));

	const type = entierQuery(req.query.type, 1, 2);
	if (type) conditions.push(eq(article.offre_ou_recherche, type));

	const familleId = entierQuery(req.query.famille_id, 1, Number.MAX_SAFE_INTEGER);
	if (familleId) conditions.push(eq(article.famille_id, familleId));

	const neuf = entierQuery(req.query.neuf_ou_occasion, 1, 2);
	if (neuf) conditions.push(eq(article.neuf_ou_occasion, neuf));

	const prixMin = entierQuery(req.query.prix_min, 1, Number.MAX_SAFE_INTEGER);
	if (prixMin) conditions.push(gte(article.prix, prixMin));

	const prixMax = entierQuery(req.query.prix_max, 1, Number.MAX_SAFE_INTEGER);
	if (prixMax) conditions.push(lte(article.prix, prixMax));

	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			article.libelle,
			article.description,
			article.reference
		)
	);

	const tri = String(req.query.tri ?? 'famille');
	let requete = db
		.select({ article })
		.from(article)
		.where(and(...conditions.filter(Boolean)))
		.$dynamic();

	if (tri === 'famille') {
		// Tri legacy : famille (libellé) puis prix.
		requete = db
			.select({ article })
			.from(article)
			.leftJoin(familleArticle, eq(familleArticle.id, article.famille_id))
			.where(and(...conditions.filter(Boolean)))
			.$dynamic()
			.orderBy(asc(familleArticle.libelle), asc(article.prix), desc(article.id));
	} else {
		const ordres = {
			recent: [desc(article.date_creation), desc(article.id)],
			prix: [asc(sql`${article.prix} = 0`), asc(article.prix), desc(article.id)],
			prix_desc: [desc(article.prix), desc(article.id)]
		} as const;
		requete = requete.orderBy(...(ordres[tri as keyof typeof ordres] ?? ordres.recent));
	}

	const liste = paginer<{ article: Article }>(requete, page);
	const familles = tableFamilles();
	res.json({
		items: liste.items.map((l) => vueResume(l.article, familleDe(l.article, familles))),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Compteur de l'onglet « Autres articles » (F-S3-03) : articles publiés. */
routeur.get('/compteurs', (_req, res) => {
	const lignes = db
		.select({ type: article.offre_ou_recherche, n: sql<number>`count(*)` })
		.from(article)
		.where(eq(article.etat, Etat.AUTORISE))
		.groupBy(article.offre_ou_recherche)
		.all();
	const par = new Map(lignes.map((l) => [l.type, l.n]));
	const offres = par.get(OffreDemande.OFFRE) ?? 0;
	const recherches = par.get(OffreDemande.DEMANDE) ?? 0;
	res.json({ offres, recherches, total: offres + recherches });
});

/** « Nouveautés » (tri par vraie date d'inscription, correctif F-S3-39) et « Les plus visités ». */
routeur.get('/encarts', (_req, res) => {
	const familles = tableFamilles();
	const cinq = (ordre: SQL[]) =>
		db
			.select()
			.from(article)
			.where(eq(article.etat, Etat.AUTORISE))
			.orderBy(...ordre)
			.limit(5)
			.all()
			.map((a) => vueResume(a, familleDe(a, familles)));

	res.json({
		nouveautes: cinq([desc(article.date_creation), desc(article.id)]),
		plus_visites: cinq([desc(article.nombre_visites), desc(article.id)])
	});
});

// --- Panier (déclaré avant /:id) ------------------------------------------------------------------

function vueArticlePanier(a: Article | null) {
	if (!a) return null;
	return {
		id: a.id,
		reference: a.reference,
		libelle: a.libelle,
		prix: a.prix,
		quantite: a.quantite,
		etat: a.etat,
		offre_ou_recherche: a.offre_ou_recherche,
		photo: a.photo,
		photo_url: url(a.photo)
	};
}

/**
 * Panier du membre ; le gestionnaire voit les lignes non payées de tous les membres, sans
 * pouvoir payer (F-S3-42 à F-S3-45).
 */
function construirePanier(membre: Membre) {
	const gestion = membre.type_compte === 1;
	const lignes = lignesPanier(gestion ? null : membre.id);
	const rupture = lignesEnRupture(lignes);

	const membres = gestion && lignes.length ? contactsDe(lignes.map((l) => l.membre_id)) : new Map();

	const sorties = lignes.map((l: LigneAvecArticle) => {
		const contact = gestion ? membres.get(l.membre_id) : undefined;
		return {
			id: l.id,
			article: vueArticlePanier(l.article),
			quantite: l.quantite,
			prix_unitaire: l.prix_unitaire,
			date_ajout: l.date_ajout,
			membre: contact ? { id: contact.id, pseudonyme: contact.pseudonyme, nom: contact.nom } : null,
			stock_insuffisant: rupture.has(l.id),
			montant: l.prix_unitaire * l.quantite
		};
	});

	const stockOk = rupture.size === 0;
	const montant = totalPanier(lignes);

	// Historique des achats déjà réglés (membre seulement).
	let achats: unknown[] = [];
	if (!gestion) {
		const payees = db
			.select({ ligne: lignePanier, article })
			.from(lignePanier)
			.leftJoin(article, eq(article.id, lignePanier.article_id))
			.where(
				and(
					eq(lignePanier.type_objet, TypeObjetPaye.ARTICLE),
					eq(lignePanier.membre_id, membre.id),
					eq(lignePanier.paye, true)
				)
			)
			.orderBy(desc(lignePanier.date_paiement), desc(lignePanier.id))
			.limit(20)
			.all();

		const idsPaiement = [
			...new Set(payees.map((p) => p.ligne.paiement_id).filter((id): id is number => !!id))
		];
		const etats = new Map(
			idsPaiement.length
				? db
						.select({ id: paiement.id, etat: paiement.etat })
						.from(paiement)
						.where(inArray(paiement.id, idsPaiement))
						.all()
						.map((p) => [p.id, p.etat])
				: []
		);

		achats = payees.map(({ ligne, article: a }) => ({
			id: ligne.id,
			article_id: ligne.article_id,
			libelle: a ? a.libelle : 'Article retiré',
			quantite: ligne.quantite,
			prix_unitaire: ligne.prix_unitaire,
			montant: ligne.quantite * ligne.prix_unitaire,
			date_paiement: ligne.date_paiement,
			etat_paiement: ligne.paiement_id !== null ? (etats.get(ligne.paiement_id) ?? null) : null
		}));
	}

	return {
		lignes: sorties,
		total_quantite: lignes.reduce((n, l) => n + l.quantite, 0),
		total_montant: montant,
		stock_suffisant: stockOk,
		peut_payer: !gestion && lignes.length > 0 && stockOk && montant > 0,
		message: stockOk ? null : MESSAGE_STOCK,
		achats
	};
}

routeur.get('/panier', membreRequis, (req, res) => {
	res.json(construirePanier(exigerMembre(req)));
});

function ligneDuPanier(ligneId: number, membre: Membre) {
	const ligne = db.select().from(lignePanier).where(eq(lignePanier.id, ligneId)).get();
	if (!ligne || ligne.type_objet !== TypeObjetPaye.ARTICLE) {
		throw introuvable("Cette ligne n'est plus dans le panier.");
	}
	// F-S3-43 : un membre ne touche qu'à ses propres lignes (le legacy ne contrôlait rien).
	if (ligne.membre_id !== membre.id && !peutModerer(membre)) {
		throw interdit("Cette ligne appartient au panier d'un autre membre.");
	}
	if (ligne.paye) {
		throw erreur('Cette ligne est déjà payée : elle ne peut plus être modifiée.');
	}
	return ligne;
}

routeur.put('/panier/:ligneId', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const ligne = ligneDuPanier(Number(req.params.ligneId), membre);
	const donnees = valider(quantiteEntreeSchema, req.body);
	if (donnees.quantite < 1) {
		throw erreur('Veuillez choisir une quantité.', {
			quantite: "1 au minimum (ou retirez l'article du panier)."
		});
	}
	db.update(lignePanier)
		.set({ quantite: donnees.quantite })
		.where(eq(lignePanier.id, ligne.id))
		.run();
	res.json(ok('Quantité modifiée.', ligne.id));
});

routeur.delete('/panier/:ligneId', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const ligne = ligneDuPanier(Number(req.params.ligneId), membre);
	// Suppression physique, comme le legacy.
	db.delete(lignePanier).where(eq(lignePanier.id, ligne.id)).run();
	res.json(ok('Article retiré du panier.', ligne.id));
});

// --- Fiches ---------------------------------------------------------------------------------------

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	// F-S3-33 : un article non publié n'est plus consultable par un tiers (le legacy l'affichait).
	const fiche = obtenir(Number(req.params.id), membre);
	// F-S3-32.
	compterVisite(article, fiche as never, membre);

	const proprietaire = !!membre && (membre.id === fiche.auteur_id || membre.type_compte === 1);
	const offre = fiche.offre_ou_recherche === OffreDemande.OFFRE;
	const recus = listerInterets('article_id', fiche.id);

	let interets: InteretOut[] | null = null;
	if (proprietaire) interets = vueInterets(recus, contactsDe(recus.map((i) => i.membre_id)));

	const tiers = !membre || (membre.type_compte !== 1 && membre.id !== fiche.auteur_id);
	const publie = fiche.etat === Etat.AUTORISE;

	let quantitePanier = 0;
	if (membre && !proprietaire) {
		quantitePanier =
			db
				.select({ n: sql<number>`coalesce(sum(${lignePanier.quantite}), 0)` })
				.from(lignePanier)
				.where(
					and(
						eq(lignePanier.type_objet, TypeObjetPaye.ARTICLE),
						eq(lignePanier.article_id, fiche.id),
						eq(lignePanier.membre_id, membre.id),
						eq(lignePanier.paye, false)
					)
				)
				.get()?.n ?? 0;
	}

	const auteurFiche =
		fiche.auteur_id !== null
			? auteur(db.select().from(tableMembre).where(eq(tableMembre.id, fiche.auteur_id)).get())
			: null;

	res.json({
		...vueResume(fiche, familleDe(fiche, tableFamilles())),
		famille_id: fiche.famille_id,
		auteur: auteurFiche,
		peut_modifier: peutModifier(membre, fiche.auteur_id),
		peut_moderer: peutModerer(membre),
		// Recherche : intéressement ; offre : ajout au panier.
		peut_manifester: tiers && publie && !offre,
		peut_acheter: tiers && publie && offre,
		mon_interet: !!membre && !proprietaire && recus.some((i) => i.membre_id === membre.id),
		quantite_panier: quantitePanier,
		interets
	});
});

/** Règles legacy (incl-article.php), unicité enfin opérante (F-S3-37/38). */
function validerArticle(d: ArticleEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};

	if (
		d.offre_ou_recherche !== OffreDemande.OFFRE &&
		d.offre_ou_recherche !== OffreDemande.DEMANDE
	) {
		champs.offre_ou_recherche = "Veuillez indiquer s'il s'agit d'une offre ou d'une recherche.";
	}
	const famille = d.famille_id
		? db
				.select({ id: familleArticle.id })
				.from(familleArticle)
				.where(eq(familleArticle.id, d.famille_id))
				.get()
		: null;
	if (!famille) champs.famille_id = "Veuillez indiquer la famille de l'article.";

	if (d.libelle.trim().length < 5) {
		champs.libelle = "Le libellé de l'article doit avoir 5 caractères minimum.";
	}
	if (d.neuf_ou_occasion !== NeufOccasion.NEUF && d.neuf_ou_occasion !== NeufOccasion.OCCASION) {
		champs.neuf_ou_occasion = "Veuillez indiquer si l'article est neuf ou d'occasion.";
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		eq(article.libelle, d.libelle.trim()),
		eq(article.description, d.description.trim()),
		ne(article.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(article.id, exclureId));
	const doublon = db
		.select({ id: article.id })
		.from(article)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Cet article est déjà enregistré.', {
			libelle: 'Un article avec le même libellé et la même description existe déjà.'
		});
	}
}

function champsArticle(d: ArticleEntree) {
	return {
		offre_ou_recherche: d.offre_ou_recherche,
		famille_id: d.famille_id ?? null,
		libelle: d.libelle.trim(),
		prix: d.prix,
		// Entier standard : plus de plafond à 127 (F-S3-40).
		quantite: d.quantite,
		neuf_ou_occasion: d.neuf_ou_occasion,
		description: d.description.trim()
	};
}

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(articleEntreeSchema, req.body);
	validerArticle(donnees);

	const cree = db.transaction(() =>
		db
			.insert(article)
			.values({
				auteur_id: membre.id,
				// Publié immédiatement (legacy, F-S3-39).
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.ARTICLE),
				...champsArticle(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	const donnees = valider(articleEntreeSchema, req.body);
	validerArticle(donnees, fiche.id);

	const misAJour = db
		.update(article)
		.set(champsArticle(donnees))
		.where(eq(article.id, fiche.id))
		.returning()
		.get();
	res.json(ok('Modification effectuée.', misAJour!.id, misAJour!.reference));
});

routeur.post('/:id/photo', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });

	const ancien = fiche.photo;
	const chemin = await enregistrerFichier(req.file.buffer, 'articles', new Set([IMAGE]), 'photo');
	db.update(article).set({ photo: chemin }).where(eq(article.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', fiche.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	// F-S3-41.
	changerEtat(article, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(article, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});

/**
 * Offre seulement : ajout au panier au prix courant figé (F-S3-34). Quantité ≤ stock restant
 * (lignes non payées déjà dans le panier comprises).
 */
routeur.post('/:id/panier', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);

	if (membre.type_compte === 1) {
		throw interdit("Les gestionnaires n'achètent pas depuis les petites annonces.");
	}
	if (fiche.auteur_id === membre.id) {
		throw erreur('Vous ne pouvez pas acheter votre propre article.');
	}
	if (fiche.offre_ou_recherche !== OffreDemande.OFFRE || fiche.etat !== Etat.AUTORISE) {
		throw erreur("Cet article n'est pas proposé à la vente.");
	}

	const donnees = valider(quantiteEntreeSchema, req.body);
	if (donnees.quantite < 1) {
		throw erreur('Veuillez choisir une quantité.', { quantite: 'Choisissez au moins 1 article.' });
	}

	const lignes = lignesPanier(membre.id).filter((l) => l.article_id === fiche.id);
	const deja = lignes.reduce((n, l) => n + l.quantite, 0);
	const reste = fiche.quantite - deja;
	if (donnees.quantite > reste) {
		const n = Math.max(reste, 0);
		let detail = `Il reste ${n} article${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`;
		if (deja) detail += ` (vous en avez déjà ${deja} dans votre panier)`;
		throw erreur('Stock insuffisant.', { quantite: `${detail}.` });
	}

	// Même article au même prix : on cumule la quantité plutôt que d'empiler les lignes.
	const existante = lignes.find((l) => l.prix_unitaire === fiche.prix);
	let ligneId: number;
	if (existante) {
		db.update(lignePanier)
			.set({ quantite: existante.quantite + donnees.quantite })
			.where(eq(lignePanier.id, existante.id))
			.run();
		ligneId = existante.id;
	} else {
		ligneId = db
			.insert(lignePanier)
			.values({
				type_objet: TypeObjetPaye.ARTICLE,
				membre_id: membre.id,
				article_id: fiche.id,
				quantite: donnees.quantite,
				prix_unitaire: fiche.prix,
				paye: false,
				etat: Etat.AUTORISE
			})
			.returning({ id: lignePanier.id })
			.get()!.id;
	}
	res.status(201).json(ok('Article ajouté à votre panier.', ligneId));
});

/**
 * Recherche seulement : « Intéressement » (5 caractères minimum), un seul par membre et par
 * article (F-S3-35).
 */
routeur.post('/:id/interet', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);

	if (membre.type_compte === 1) {
		throw interdit("Les gestionnaires ne déposent pas d'intéressement.");
	}
	if (fiche.offre_ou_recherche === OffreDemande.OFFRE) {
		throw erreur('Cet article est proposé à la vente : ajoutez-le à votre panier.');
	}

	const donnees = valider(interetEntreeSchema, req.body);
	if (donnees.message.trim().length < 5) {
		throw erreur('Intéressement doit avoir 5 caractères minimum.', {
			message: 'Intéressement : 5 caractères minimum.'
		});
	}

	deposer({
		membre,
		cible: 'article_id',
		cibleId: fiche.id,
		auteurFicheId: fiche.auteur_id,
		sousType: TypeInteret.INTERESSEMENT,
		message: donnees.message,
		libelleFiche: `${fiche.reference} — ${fiche.libelle}`,
		lien: `/annonces/${fiche.id}`,
		messageObligatoire: true
	});
	res.status(201).json(ok('Votre intéressement est pris en compte.', fiche.id));
});
