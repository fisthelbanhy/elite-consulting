/**
 * Boutique bien-être (portage de `app/routers/boutique.py` ; pilier « Bien-être », ADR-0008) :
 * catalogue Forever Living Products, panier produits, fiches bien-être.
 *
 * Legacy : incl-venteproduit.php (S5-2, F-S5-07 à F-S5-19) et incl-choix1C.php (S1 « Santé »,
 * F-S1-27 à F-S1-40), qui partageaient le même panier. Paiement : `services/boutique.ts` (type 1).
 */
import { and, asc, desc, eq, inArray, notInArray, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat, EtatPaiement, GroupeProduit, libelle, TypeObjetPaye } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import {
	lignePanier,
	paiement as tablePaiement,
	produit as tableProduit
} from '../schema/commerce.js';
import { maladie, maladieProduit } from '../schema/contenu.js';
import { parametre } from '../schema/core.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { entier, ok, valider } from '../schemas/commun.js';
import * as svc from '../services/boutique.js';
import { estDistributeur } from '../services/distributeur.js';
import { compterVisite, paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';

export const routeur = Router();
export const prefixe = '/boutique';

/** Panier produits : monté séparément, sous `/api/panier`. */
export const routeurPanier = Router();
export const prefixePanier = '/panier';

/** Fiches bien-être (legacy « Santé »), montées sous `/api/bien-etre`. */
export const routeurBienEtre = Router();
export const prefixeBienEtre = '/bien-etre';

type Produit = typeof tableProduit.$inferSelect;
type Ligne = typeof lignePanier.$inferSelect;

const GROUPES: number[] = Object.values(GroupeProduit);

/** `groupe = 0` : produits rangés hors des 20 groupes FLP (données legacy). */
function conditionGroupe(groupe: number): SQL {
	return groupe === 0
		? notInArray(tableProduit.groupe, GROUPES)
		: eq(tableProduit.groupe, groupe);
}

function vueProduit(p: Produit, distributeur: boolean) {
	return {
		id: p.id,
		reference: p.reference,
		nom: p.nom,
		description: p.description,
		groupe: p.groupe,
		prix_distributeur: p.prix_distributeur,
		prix_public: p.prix_public,
		quantite_stock: p.quantite_stock,
		nombre_visites: p.nombre_visites,
		photo: p.photo,
		photo_url: url(p.photo),
		// Prix payé par le lecteur (ADR-0007 S5a) : distributeur → prix distributeur, sinon public.
		prix: svc.prixPour(p, distributeur)
	};
}

// --- Catalogue -----------------------------------------------------------------------------------

/** Les 20 groupes FLP (F-S5-10) avec le nombre de produits proposés. */
routeur.get('/groupes', (_req, res) => {
	const comptes = new Map(
		db
			.select({ groupe: tableProduit.groupe, n: sql<number>`count(*)` })
			.from(tableProduit)
			.where(eq(tableProduit.etat, Etat.AUTORISE))
			.groupBy(tableProduit.groupe)
			.all()
			.map((l) => [l.groupe, l.n])
	);
	const sortie = GROUPES.map((g) => ({
		groupe: g,
		libelle: libelle('GroupeProduit', g),
		nombre: comptes.get(g) ?? 0
	}));
	let autres = 0;
	for (const [g, n] of comptes) if (!GROUPES.includes(g)) autres += n;
	if (autres) sortie.push({ groupe: 0, libelle: 'Autres produits Forever', nombre: autres });
	res.json(sortie);
});

const TRIS = ['', 'prix', 'prix_desc', 'populaires', 'nom'] as const;

/**
 * Catalogue public (décision F-S5-07/F-S5-08 : consultable sans compte ni adhésion) ; seuls les
 * produits actifs sont proposés. Recherche dans la référence, le nom et la description.
 */
routeur.get('/produits', (req, res) => {
	const page = pagination(req);
	const distributeur = estDistributeur(req.membre);
	const colonnePrix = distributeur ? tableProduit.prix_distributeur : tableProduit.prix_public;

	const conditions: (SQL | undefined)[] = [eq(tableProduit.etat, Etat.AUTORISE)];
	const brutGroupe = Number(req.query.groupe);
	if (req.query.groupe !== undefined && Number.isFinite(brutGroupe) && brutGroupe >= 0 && brutGroupe <= 20) {
		conditions.push(conditionGroupe(Math.trunc(brutGroupe)));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableProduit.nom,
			tableProduit.reference,
			tableProduit.description
		)
	);

	const brutTri = typeof req.query.tri === 'string' ? req.query.tri : '';
	const tri = (TRIS as readonly string[]).includes(brutTri) ? brutTri : '';
	const avecPrix = desc(sql`${colonnePrix} > 0`);
	const ordres: Record<string, SQL[]> = {
		prix: [avecPrix, asc(colonnePrix), asc(tableProduit.nom)],
		prix_desc: [desc(colonnePrix), asc(tableProduit.nom)],
		populaires: [desc(tableProduit.nombre_visites), asc(tableProduit.nom)],
		nom: [asc(tableProduit.nom)],
		// Par défaut : produits disponibles à la vente d'abord (prix connu, en stock).
		'': [avecPrix, desc(sql`${tableProduit.quantite_stock} > 0`), asc(tableProduit.nom)]
	};

	const requete = db
		.select()
		.from(tableProduit)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(...ordres[tri]!)
		.$dynamic();

	const liste = paginer<Produit>(requete, page);
	res.json({
		items: liste.items.map((p) => vueProduit(p, distributeur)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille,
		distributeur
	});
});

/** « Les plus demandés » (F-S5-09), corrigé : vraiment triés par consultations. */
routeur.get('/produits/populaires', (req, res) => {
	const brut = Number(req.query.limite);
	const limite = Number.isFinite(brut) && brut >= 1 && brut <= 20 ? Math.trunc(brut) : 10;
	const distributeur = estDistributeur(req.membre);
	const produits = db
		.select()
		.from(tableProduit)
		.where(eq(tableProduit.etat, Etat.AUTORISE))
		.orderBy(desc(tableProduit.nombre_visites), asc(tableProduit.nom))
		.limit(limite)
		.all();
	res.json(produits.map((p) => vueProduit(p, distributeur)));
});

/**
 * Fiche produit (F-S5-19, F-S1-30) : photo, description, 3 prix, stock ; chaque consultation par un
 * visiteur ou un membre incrémente le compteur.
 */
routeur.get('/produits/:id', (req, res) => {
	const membre = req.membre;
	const p = db
		.select()
		.from(tableProduit)
		.where(eq(tableProduit.id, Number(req.params.id)))
		.get();
	const visible = !!p && (p.etat === Etat.AUTORISE || (!!membre && membre.type_compte === 1));
	if (!p || !visible) throw introuvable("Ce produit n'existe pas ou n'est plus proposé.");

	// Un produit n'a pas d'auteur : seuls les gestionnaires échappent au compteur.
	compterVisite(tableProduit, p, membre);
	const distributeur = estDistributeur(membre);
	res.json({
		...vueProduit(p, distributeur),
		prix_non_distributeur: p.prix_non_distributeur,
		date_derniere_visite: p.date_derniere_visite,
		distributeur
	});
});

// --- Panier produits -----------------------------------------------------------------------------

function vueLigne(ligne: Ligne, produit: Produit | null, bloquante: boolean) {
	return {
		id: ligne.id,
		produit: produit
			? {
					id: produit.id,
					reference: produit.reference,
					nom: produit.nom,
					quantite_stock: produit.quantite_stock,
					etat: produit.etat,
					photo: produit.photo,
					photo_url: url(produit.photo)
				}
			: null,
		quantite: ligne.quantite,
		prix_unitaire: ligne.prix_unitaire,
		date_ajout: ligne.date_ajout,
		montant: ligne.prix_unitaire * ligne.quantite,
		// Quantité demandée (toutes lignes du produit) supérieure au stock, ou produit retiré.
		bloquante
	};
}

function vuePanier(membre: Membre) {
	const lignes = svc.lignesNonPayees(membre.id);
	const { bloquantes, message } = svc.lignesBloquantes(lignes);
	const montant = svc.total(lignes);
	return {
		lignes: lignes.map(({ ligne, produit }) => vueLigne(ligne, produit, bloquantes.has(ligne.id))),
		quantite_totale: lignes.reduce((n, { ligne }) => n + ligne.quantite, 0),
		total: montant,
		payable: lignes.length > 0 && montant > 0 && bloquantes.size === 0,
		message,
		distributeur: estDistributeur(membre)
	};
}

/**
 * Panier produits du membre (F-S5-14, F-S1-33) ; `payable` = faux si une quantité dépasse le stock
 * (F-S5-16, message legacy dans `message`).
 */
routeurPanier.get('/', membreRequis, (req, res) => {
	res.json(vuePanier(exigerMembre(req)));
});

/** Ajout multiple en une action (legacy : sélecteurs de quantité + bouton « Panier »). */
const ajoutPanierSchema = z.object({
	lignes: z
		.array(z.object({ produit_id: entier, quantite: entier.min(0).max(999) }))
		.min(1)
		.max(200)
});

routeurPanier.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(ajoutPanierSchema, req.body);
	const n = db.transaction(() => svc.ajouter(membre, donnees.lignes));
	const s = n > 1 ? 's' : '';
	res.status(201).json(ok(`${n} article${s} ajouté${s} à votre panier.`));
});

function maLigne(id: number, membre: Membre): Ligne {
	const ligne = db.select().from(lignePanier).where(eq(lignePanier.id, id)).get();
	if (!ligne || ligne.type_objet !== TypeObjetPaye.PRODUIT) {
		throw introuvable("Cette ligne n'est plus dans votre panier.");
	}
	// Correctif F-S5-15 : seul le propriétaire agit sur sa ligne (le legacy ne vérifiait rien).
	if (ligne.membre_id !== membre.id) {
		throw interdit("Cette ligne appartient au panier d'un autre membre.");
	}
	if (ligne.paye) throw erreur('Cette ligne est déjà payée : elle ne peut plus être modifiée.');
	return ligne;
}

/** Ajustement de la quantité (le prix figé à l'ajout est conservé). */
routeurPanier.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const ligne = maLigne(Number(req.params.id), membre);
	const donnees = valider(z.object({ quantite: entier.min(1).max(999) }), req.body);
	db.update(lignePanier)
		.set({ quantite: donnees.quantite })
		.where(eq(lignePanier.id, ligne.id))
		.run();
	res.json(ok('Quantité modifiée.', ligne.id));
});

/** Annulation d'une ligne : suppression physique, comme le legacy (ligne non payée seulement). */
routeurPanier.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const ligne = maLigne(Number(req.params.id), membre);
	db.delete(lignePanier).where(eq(lignePanier.id, ligne.id)).run();
	res.json(ok('Produit retiré du panier.', ligne.id));
});

/**
 * Paniers produits de tous les membres avec leur état de paiement (F-S1-40 : N.P., P.N.C., P.C.),
 * réservé aux gestionnaires. Lecture seule (le legacy laissait le gestionnaire supprimer les
 * lignes).
 */
routeurPanier.get('/suivi', gestionnaireRequis, (req, res) => {
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [eq(lignePanier.type_objet, TypeObjetPaye.PRODUIT)];

	const brutEtat = Number(req.query.etat_paiement);
	const etatPaiement =
		Number.isFinite(brutEtat) && brutEtat >= 1 && brutEtat <= 3 ? Math.trunc(brutEtat) : null;
	if (etatPaiement === EtatPaiement.NON_PAYE) {
		conditions.push(
			or(eq(lignePanier.paye, false), eq(tablePaiement.etat, EtatPaiement.NON_PAYE))
		);
	} else if (etatPaiement) {
		conditions.push(eq(lignePanier.paye, true), eq(tablePaiement.etat, etatPaiement));
	}
	const brutMembre = Number(req.query.membre_id);
	if (Number.isFinite(brutMembre) && brutMembre > 0) {
		conditions.push(eq(lignePanier.membre_id, Math.trunc(brutMembre)));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableProduit.nom,
			tableMembre.nom,
			tableMembre.pseudonyme
		)
	);
	const filtre = and(...conditions.filter(Boolean));

	const base = () =>
		db
			.select({ ligne: lignePanier, produit: tableProduit })
			.from(lignePanier)
			.leftJoin(tablePaiement, eq(lignePanier.paiement_id, tablePaiement.id))
			.innerJoin(tableMembre, eq(lignePanier.membre_id, tableMembre.id))
			.leftJoin(tableProduit, eq(lignePanier.produit_id, tableProduit.id))
			.where(filtre);

	const somme =
		db
			.select({ s: sql<number>`coalesce(sum(${lignePanier.prix_unitaire} * ${lignePanier.quantite}), 0)` })
			.from(lignePanier)
			.leftJoin(tablePaiement, eq(lignePanier.paiement_id, tablePaiement.id))
			.innerJoin(tableMembre, eq(lignePanier.membre_id, tableMembre.id))
			.leftJoin(tableProduit, eq(lignePanier.produit_id, tableProduit.id))
			.where(filtre)
			.get()?.s ?? 0;

	const requete = base()
		.orderBy(desc(lignePanier.date_ajout), desc(lignePanier.id))
		.$dynamic();
	const liste = paginer<{ ligne: Ligne; produit: Produit | null }>(requete, page);

	// Coordonnées d'un acheteur : réservées aux gestionnaires.
	const membresIds = [...new Set(liste.items.map((l) => l.ligne.membre_id))];
	const acheteurs = new Map(
		membresIds.length
			? db
					.select({
						id: tableMembre.id,
						pseudonyme: tableMembre.pseudonyme,
						nom: tableMembre.nom,
						telephone: tableMembre.telephone
					})
					.from(tableMembre)
					.where(inArray(tableMembre.id, membresIds))
					.all()
					.map((m) => [m.id, m])
			: []
	);
	const paiementsIds = [
		...new Set(liste.items.map((l) => l.ligne.paiement_id).filter((i): i is number => !!i))
	];
	const etats = new Map(
		paiementsIds.length
			? db
					.select({ id: tablePaiement.id, etat: tablePaiement.etat })
					.from(tablePaiement)
					.where(inArray(tablePaiement.id, paiementsIds))
					.all()
					.map((p) => [p.id, p.etat])
			: []
	);

	res.json({
		items: liste.items.map(({ ligne, produit }) => ({
			...vueLigne(ligne, produit, false),
			membre_id: ligne.membre_id,
			membre: acheteurs.get(ligne.membre_id) ?? null,
			paye: ligne.paye,
			date_paiement: ligne.date_paiement,
			paiement_id: ligne.paiement_id,
			// `EtatPaiement` : 1 Non payé, 2 Paiement non confirmé, 3 Paiement confirmé.
			etat_paiement: ligne.paye
				? (etats.get(ligne.paiement_id ?? 0) ?? EtatPaiement.NON_PAYE)
				: EtatPaiement.NON_PAYE
		})),
		total: liste.total,
		page: liste.page,
		taille: liste.taille,
		somme
	});
});

// --- Fiches bien-être (legacy « Santé », désactivables : ADR-0009) -------------------------------

function exigerModuleActif(): void {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	if (p && !p.module_sante_actif) {
		throw introuvable('Les fiches bien-être ne sont pas disponibles pour le moment.');
	}
}

/** Grille des fiches actives (F-S1-27, corrigé : les fiches non publiées ne sont plus montrées). */
routeurBienEtre.get('/', (_req, res) => {
	exigerModuleActif();
	const nombres = new Map(
		db
			.select({ maladie_id: maladieProduit.maladie_id, n: sql<number>`count(*)` })
			.from(maladieProduit)
			.innerJoin(tableProduit, eq(maladieProduit.produit_id, tableProduit.id))
			.where(eq(tableProduit.etat, Etat.AUTORISE))
			.groupBy(maladieProduit.maladie_id)
			.all()
			.map((l) => [l.maladie_id, l.n])
	);
	const fiches = db
		.select()
		.from(maladie)
		.where(eq(maladie.etat, Etat.AUTORISE))
		.orderBy(asc(maladie.libelle))
		.all();
	res.json(
		fiches.map((m) => ({
			id: m.id,
			libelle: m.libelle,
			description: m.description,
			nombre_produits: nombres.get(m.id) ?? 0
		}))
	);
});

/**
 * Fiche : libellé, description, produits conseillés actifs avec leur « conseil d'utilisation »
 * (F-S1-28/29 ; liste unique `maladie_produit`, ADR-0007 S1b).
 */
routeurBienEtre.get('/:id', (req, res) => {
	exigerModuleActif();
	const m = db
		.select()
		.from(maladie)
		.where(eq(maladie.id, Number(req.params.id)))
		.get();
	if (!m || m.etat !== Etat.AUTORISE) {
		throw introuvable("Cette fiche n'existe pas ou n'est plus publiée.");
	}
	const distributeur = estDistributeur(req.membre);
	const liens = db
		.select({ lien: maladieProduit, produit: tableProduit })
		.from(maladieProduit)
		.innerJoin(tableProduit, eq(maladieProduit.produit_id, tableProduit.id))
		.where(and(eq(maladieProduit.maladie_id, m.id), eq(tableProduit.etat, Etat.AUTORISE)))
		.orderBy(asc(maladieProduit.ordre), asc(maladieProduit.id))
		.all();
	res.json({
		id: m.id,
		libelle: m.libelle,
		description: m.description,
		produits: liens.map(({ lien, produit }) => ({
			produit: vueProduit(produit, distributeur),
			// Legacy « posologie » : renommé « conseil d'utilisation » (ADR-0009).
			conseil_utilisation: lien.posologie.trim()
		})),
		distributeur
	});
});
