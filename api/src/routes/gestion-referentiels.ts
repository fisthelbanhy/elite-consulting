/**
 * Référentiels et paramètres du site administrés par les gestionnaires (portage de
 * `app/routers/gestion_referentiels.py` ; legacy `pparametre`, `pvilqtr`, `pdiplome`, `psatdat`,
 * `pfamilart`, `pmaladie`, `pproduit`, `pproduitptpv`, `pbanque`).
 * Inventaire : E-ADM-01 à E-ADM-10, F-ADM-01 à F-ADM-04, F-ADM-16 à F-ADM-29.
 *
 * Suppression (le legacy n'en proposait aucune) :
 * - référentiel avec état (secteurs, domaines, maladies, produits, produits du comparateur,
 *   banques) : suppression **logique** (état 3), réversible depuis la fiche ;
 * - référentiel sans état (villes, quartiers, diplômes, familles d'articles) : suppression
 *   physique seulement s'il n'est utilisé nulle part, sinon refus motivé.
 */
import { and, asc, eq, lte, ne, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, type Pagination } from '../deps.js';
import { Etat, GroupeProduit } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { article, immobilier, produit } from '../schema/commerce.js';
import { maladie, maladieProduit } from '../schema/contenu.js';
import {
	banque,
	diplome,
	domaineActivite,
	familleArticle,
	parametre,
	quartier,
	secteurActivite,
	ville
} from '../schema/core.js';
import { entreprise, ligneProspective, produitProspective } from '../schema/entreprises.js';
import { appelFond } from '../schema/fonds.js';
import { membre as tableMembre } from '../schema/membres.js';
import { entier, entierFacultatif, booleen, ok, valider } from '../schemas/commun.js';
import { paginer, recherche } from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	IMAGE,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import { paginationGestion } from '../services/gestion.js';
import { normaliserTelephone, telephoneValide } from '../services/validation.js';

export const routeur = Router();
export const prefixe = '/gestion';

routeur.use(gestionnaireRequis);

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

// --- Outils communs ------------------------------------------------------------------------------

type Table = SQLiteTable & { id: SQLiteColumn };

function charger<T>(table: Table, id: number, message = 'Élément introuvable.'): T {
	const obj = db.select().from(table).where(eq(table.id, id)).get() as T | undefined;
	if (!obj) throw introuvable(message);
	return obj;
}

/**
 * Doublon insensible à la casse, accents compris (« Électroménager » = « électroménager ») :
 * comparaison faite en JavaScript, car `lower()` de SQLite ignore les lettres accentuées. Les
 * référentiels comptent au plus quelques centaines de lignes.
 */
function doublon(
	table: Table,
	colonne: SQLiteColumn,
	valeur: string,
	options: { condition?: SQL; exclureId?: number } = {}
): boolean {
	const normaliser = (v: string) =>
		v.split(/\s+/).filter(Boolean).join(' ').toLocaleLowerCase('fr');
	const cible = normaliser(valeur);
	const conditions: (SQL | undefined)[] = [options.condition];
	if (options.exclureId) conditions.push(ne(table.id, options.exclureId));
	const lignes = db
		.select({ valeur: colonne })
		.from(table)
		.where(and(...conditions.filter(Boolean)))
		.all();
	return lignes.some((l) => normaliser(String(l.valeur ?? '')) === cible);
}

function compter(table: Table, condition?: SQL): number {
	return (
		db
			.select({ n: sql<number>`count(*)` })
			.from(table)
			.where(condition)
			.get()?.n ?? 0
	);
}

/** Libellés « 3 membres », « 1 entreprise »… des utilisations non nulles. */
function usages(liste: [string, Table, SQL][]): string[] {
	const out: string[] = [];
	for (const [libelle, table, condition] of liste) {
		const n = compter(table, condition);
		if (n) out.push(`${n} ${libelle}`);
	}
	return out;
}

function supprimerSansEtat(table: Table, id: number, quoi: string, utilisations: string[]) {
	if (utilisations.length) {
		throw erreur(`Suppression impossible : ${quoi} est utilisé(e) par ${utilisations.join(', ')}.`);
	}
	db.delete(table).where(eq(table.id, id)).run();
	return ok('Suppression effectuée.', id);
}

function supprimerAvecEtat(table: Table & { etat: SQLiteColumn }, id: number) {
	db.update(table)
		.set({ etat: Etat.SUPPRIME } as never)
		.where(eq(table.id, id))
		.run();
	return ok(
		"Fiche supprimée (état « Supprimé ») : elle n'est plus proposée. " +
			'Vous pouvez la réactiver en modifiant son état.',
		id
	);
}

function enveloppe<T>(items: T[], total: number, page: Pagination) {
	return { items, total, page: page.page, taille: page.taille };
}

function longueurMin(valeur: string, n: number): boolean {
	return valeur.trim().length >= n;
}

function filtreEtat(
	colonne: SQLiteColumn,
	req: { query: Record<string, unknown> }
): SQL | undefined {
	const v = Number(req.query.etat);
	return Number.isFinite(v) && v > 0 ? eq(colonne, Math.trunc(v)) : undefined;
}

function nombreQuery(req: { query: Record<string, unknown> }, cle: string): number | null {
	const v = Number(req.query[cle]);
	return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : null;
}

function motQuery(req: { query: Record<string, unknown> }): string | null {
	return typeof req.query.q === 'string' ? req.query.q : null;
}

/** Page d'accueil des référentiels : nombre d'éléments actifs de chacun. */
routeur.get('/referentiels', (_req, res) => {
	const actif = (colonne: SQLiteColumn) => ne(colonne, Etat.SUPPRIME);
	res.json([
		{ cle: 'villes', libelle: 'Villes', total: compter(ville) },
		{ cle: 'quartiers', libelle: 'Quartiers', total: compter(quartier) },
		{
			cle: 'secteurs',
			libelle: "Secteurs d'activité",
			total: compter(secteurActivite, actif(secteurActivite.etat))
		},
		{
			cle: 'domaines',
			libelle: "Domaines d'activité",
			total: compter(domaineActivite, actif(domaineActivite.etat))
		},
		{ cle: 'diplomes', libelle: 'Diplômes', total: compter(diplome) },
		{ cle: 'familles', libelle: "Familles d'articles", total: compter(familleArticle) },
		{ cle: 'maladies', libelle: 'Fiches bien-être', total: compter(maladie, actif(maladie.etat)) },
		{ cle: 'produits', libelle: 'Produits', total: compter(produit, actif(produit.etat)) },
		{
			cle: 'produits-comparateur',
			libelle: 'Produits du comparateur',
			total: compter(produitProspective, actif(produitProspective.etat))
		},
		{ cle: 'banques', libelle: 'Banques', total: compter(banque, actif(banque.etat)) }
	]);
});

// --- Villes (F-ADM-16) ---------------------------------------------------------------------------

type Ville = typeof ville.$inferSelect;

const villeEntreeSchema = z.object({ nom: z.string().max(80).default('') });

function vueVille(v: Ville) {
	return {
		id: v.id,
		nom: v.nom,
		nombre_quartiers: compter(quartier, eq(quartier.ville_id, v.id)),
		nombre_membres: compter(
			tableMembre,
			and(eq(tableMembre.ville_id, v.id), ne(tableMembre.etat, Etat.SUPPRIME))
		)
	};
}

routeur.get('/referentiels/villes', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(ville)
		.where(recherche(motQuery(req), ville.nom))
		.orderBy(asc(ville.nom))
		.$dynamic();
	const liste = paginer<Ville>(requete, page);
	res.json(enveloppe(liste.items.map(vueVille), liste.total, page));
});

routeur.get('/referentiels/villes/:id', (req, res) => {
	res.json(vueVille(charger<Ville>(ville, Number(req.params.id), 'Ville introuvable.')));
});

function validerVille(nom: string, exclureId?: number): void {
	if (!longueurMin(nom, 4)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			nom: 'Le nom doit avoir 4 caractères minimum.'
		});
	}
	if (doublon(ville, ville.nom, nom, { exclureId })) {
		throw erreur('Cette ville est déjà enregistrée.', {
			nom: 'Cette ville est déjà enregistrée.'
		});
	}
}

routeur.post('/referentiels/villes', (req, res) => {
	const d = valider(villeEntreeSchema, req.body);
	validerVille(d.nom);
	const v = db.insert(ville).values({ nom: d.nom.trim() }).returning().get()!;
	res.status(201).json(ok('Enregistrement effectué.', v.id));
});

routeur.put('/referentiels/villes/:id', (req, res) => {
	const v = charger<Ville>(ville, Number(req.params.id), 'Ville introuvable.');
	const d = valider(villeEntreeSchema, req.body);
	validerVille(d.nom, v.id);
	db.update(ville).set({ nom: d.nom.trim() }).where(eq(ville.id, v.id)).run();
	res.json(ok('Modification effectuée.', v.id));
});

routeur.delete('/referentiels/villes/:id', (req, res) => {
	const v = charger<Ville>(ville, Number(req.params.id), 'Ville introuvable.');
	res.json(
		supprimerSansEtat(ville, v.id, 'cette ville', [
			...usages([
				['quartier(s)', quartier, eq(quartier.ville_id, v.id)],
				['membre(s)', tableMembre, eq(tableMembre.ville_id, v.id)],
				['entreprise(s)', entreprise, eq(entreprise.ville_id, v.id)],
				['appel(s) de fonds', appelFond, eq(appelFond.ville_id, v.id)]
			])
		])
	);
});

// --- Quartiers (F-ADM-17) ------------------------------------------------------------------------

type Quartier = typeof quartier.$inferSelect;

const quartierEntreeSchema = z.object({
	ville_id: entierFacultatif,
	nom: z.string().max(80).default('')
});

function vueQuartier(x: Quartier) {
	const v = db
		.select({ id: ville.id, nom: ville.nom })
		.from(ville)
		.where(eq(ville.id, x.ville_id))
		.get();
	return {
		id: x.id,
		nom: x.nom,
		ville_id: x.ville_id,
		ville: v ?? null,
		nombre_annonces: compter(immobilier, eq(immobilier.quartier_id, x.id))
	};
}

routeur.get('/referentiels/quartiers', (req, res) => {
	const page = paginationGestion(req);
	const conditions: (SQL | undefined)[] = [];
	const villeId = nombreQuery(req, 'ville_id');
	if (villeId) conditions.push(eq(quartier.ville_id, villeId));
	conditions.push(recherche(motQuery(req), quartier.nom));

	const requete = db
		.select({ quartier })
		.from(quartier)
		.innerJoin(ville, eq(quartier.ville_id, ville.id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(ville.nom), asc(quartier.nom))
		.$dynamic();
	const liste = paginer<{ quartier: Quartier }>(requete, page);
	res.json(
		enveloppe(
			liste.items.map((l) => vueQuartier(l.quartier)),
			liste.total,
			page
		)
	);
});

routeur.get('/referentiels/quartiers/:id', (req, res) => {
	res.json(
		vueQuartier(charger<Quartier>(quartier, Number(req.params.id), 'Quartier introuvable.'))
	);
});

function validerQuartier(d: z.output<typeof quartierEntreeSchema>, exclureId?: number): void {
	const champs: Record<string, string> = {};
	const v = d.ville_id ? db.select().from(ville).where(eq(ville.id, d.ville_id)).get() : undefined;
	if (!d.ville_id || !v) champs.ville_id = 'Chaque quartier doit être lié à une ville.';
	if (!longueurMin(d.nom, 4)) champs.nom = 'Le nom doit avoir 4 caractères minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	if (
		doublon(quartier, quartier.nom, d.nom, {
			condition: eq(quartier.ville_id, d.ville_id!),
			exclureId
		})
	) {
		throw erreur('Ce quartier est déjà enregistré pour cette ville.', {
			nom: 'Ce quartier est déjà enregistré pour cette ville.'
		});
	}
}

routeur.post('/referentiels/quartiers', (req, res) => {
	const d = valider(quartierEntreeSchema, req.body);
	validerQuartier(d);
	const x = db
		.insert(quartier)
		.values({ ville_id: d.ville_id!, nom: d.nom.trim() })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/quartiers/:id', (req, res) => {
	const x = charger<Quartier>(quartier, Number(req.params.id), 'Quartier introuvable.');
	const d = valider(quartierEntreeSchema, req.body);
	validerQuartier(d, x.id);
	db.update(quartier)
		.set({ ville_id: d.ville_id!, nom: d.nom.trim() })
		.where(eq(quartier.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/quartiers/:id', (req, res) => {
	const x = charger<Quartier>(quartier, Number(req.params.id), 'Quartier introuvable.');
	res.json(
		supprimerSansEtat(
			quartier,
			x.id,
			'ce quartier',
			usages([['annonce(s) immobilière(s)', immobilier, eq(immobilier.quartier_id, x.id)]])
		)
	);
});

// --- Diplômes (F-ADM-18) -------------------------------------------------------------------------

type Diplome = typeof diplome.$inferSelect;

const diplomeEntreeSchema = z.object({
	code: z.string().max(20).default(''),
	libelle: z.string().max(100).default('')
});

routeur.get('/referentiels/diplomes', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(diplome)
		.where(recherche(motQuery(req), diplome.libelle, diplome.code))
		.orderBy(asc(diplome.libelle))
		.$dynamic();
	const liste = paginer<Diplome>(requete, page);
	res.json(enveloppe(liste.items, liste.total, page));
});

routeur.get('/referentiels/diplomes/:id', (req, res) => {
	res.json(charger<Diplome>(diplome, Number(req.params.id), 'Diplôme introuvable.'));
});

function validerDiplome(libelle: string, exclureId?: number): void {
	if (!longueurMin(libelle, 5)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			libelle: 'Le libellé doit avoir 5 caractères minimum.'
		});
	}
	if (doublon(diplome, diplome.libelle, libelle, { exclureId })) {
		throw erreur('Ce diplôme est déjà enregistré.', {
			libelle: 'Ce diplôme est déjà enregistré.'
		});
	}
}

routeur.post('/referentiels/diplomes', (req, res) => {
	const d = valider(diplomeEntreeSchema, req.body);
	validerDiplome(d.libelle);
	// Code en majuscules (legacy).
	const x = db
		.insert(diplome)
		.values({ code: d.code.trim().toUpperCase(), libelle: d.libelle.trim() })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/diplomes/:id', (req, res) => {
	const x = charger<Diplome>(diplome, Number(req.params.id), 'Diplôme introuvable.');
	const d = valider(diplomeEntreeSchema, req.body);
	validerDiplome(d.libelle, x.id);
	db.update(diplome)
		.set({ code: d.code.trim().toUpperCase(), libelle: d.libelle.trim() })
		.where(eq(diplome.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/diplomes/:id', (req, res) => {
	const x = charger<Diplome>(diplome, Number(req.params.id), 'Diplôme introuvable.');
	// Les fiches RH saisissent les diplômes en texte libre : aucune dépendance en base.
	res.json(supprimerSansEtat(diplome, x.id, 'ce diplôme', []));
});

// --- Secteurs d'activité (F-ADM-19) --------------------------------------------------------------

type Secteur = typeof secteurActivite.$inferSelect;

const secteurEntreeSchema = z.object({
	libelle: z.string().max(200).default(''),
	etat: entier.min(1).max(3).default(2)
});

function vueSecteur(x: Secteur) {
	return {
		id: x.id,
		libelle: x.libelle,
		etat: x.etat,
		nombre_domaines: compter(
			domaineActivite,
			and(eq(domaineActivite.secteur_id, x.id), ne(domaineActivite.etat, Etat.SUPPRIME))
		)
	};
}

routeur.get('/referentiels/secteurs', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(secteurActivite)
		.where(
			and(filtreEtat(secteurActivite.etat, req), recherche(motQuery(req), secteurActivite.libelle))
		)
		.orderBy(asc(secteurActivite.libelle))
		.$dynamic();
	const liste = paginer<Secteur>(requete, page);
	res.json(enveloppe(liste.items.map(vueSecteur), liste.total, page));
});

routeur.get('/referentiels/secteurs/:id', (req, res) => {
	res.json(
		vueSecteur(charger<Secteur>(secteurActivite, Number(req.params.id), 'Secteur introuvable.'))
	);
});

function validerSecteur(libelle: string, exclureId?: number): void {
	if (!longueurMin(libelle, 5)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			libelle: 'Le libellé doit avoir 5 caractères minimum.'
		});
	}
	if (doublon(secteurActivite, secteurActivite.libelle, libelle, { exclureId })) {
		throw erreur('Cette fiche est déjà enregistrée.', {
			libelle: 'Ce secteur est déjà enregistré.'
		});
	}
}

routeur.post('/referentiels/secteurs', (req, res) => {
	const d = valider(secteurEntreeSchema, req.body);
	validerSecteur(d.libelle);
	const x = db
		.insert(secteurActivite)
		.values({ libelle: d.libelle.trim(), etat: d.etat })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/secteurs/:id', (req, res) => {
	const x = charger<Secteur>(secteurActivite, Number(req.params.id), 'Secteur introuvable.');
	const d = valider(secteurEntreeSchema, req.body);
	validerSecteur(d.libelle, x.id);
	db.update(secteurActivite)
		.set({ libelle: d.libelle.trim(), etat: d.etat })
		.where(eq(secteurActivite.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/secteurs/:id', (req, res) => {
	const x = charger<Secteur>(secteurActivite, Number(req.params.id), 'Secteur introuvable.');
	res.json(supprimerAvecEtat(secteurActivite, x.id));
});

// --- Domaines d'activité (F-ADM-20) --------------------------------------------------------------

type Domaine = typeof domaineActivite.$inferSelect;

const domaineEntreeSchema = z.object({
	secteur_id: entierFacultatif,
	libelle: z.string().max(200).default(''),
	etat: entier.min(1).max(3).default(2)
});

function vueDomaine(x: Domaine) {
	const s = x.secteur_id
		? db
				.select({ id: secteurActivite.id, libelle: secteurActivite.libelle })
				.from(secteurActivite)
				.where(eq(secteurActivite.id, x.secteur_id))
				.get()
		: undefined;
	return {
		id: x.id,
		libelle: x.libelle,
		etat: x.etat,
		secteur_id: x.secteur_id,
		secteur: s ?? null
	};
}

routeur.get('/referentiels/domaines', (req, res) => {
	const page = paginationGestion(req);
	const conditions: (SQL | undefined)[] = [];
	const secteurId = nombreQuery(req, 'secteur_id');
	if (secteurId) conditions.push(eq(domaineActivite.secteur_id, secteurId));
	conditions.push(filtreEtat(domaineActivite.etat, req));
	conditions.push(recherche(motQuery(req), domaineActivite.libelle));

	const requete = db
		.select({ domaine: domaineActivite })
		.from(domaineActivite)
		.leftJoin(secteurActivite, eq(domaineActivite.secteur_id, secteurActivite.id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(secteurActivite.libelle), asc(domaineActivite.libelle))
		.$dynamic();
	const liste = paginer<{ domaine: Domaine }>(requete, page);
	res.json(
		enveloppe(
			liste.items.map((l) => vueDomaine(l.domaine)),
			liste.total,
			page
		)
	);
});

routeur.get('/referentiels/domaines/:id', (req, res) => {
	res.json(
		vueDomaine(charger<Domaine>(domaineActivite, Number(req.params.id), 'Domaine introuvable.'))
	);
});

function validerDomaine(d: z.output<typeof domaineEntreeSchema>, exclureId?: number): void {
	const champs: Record<string, string> = {};
	// Correctif F-ADM-20 : plus de secteur n° 1 choisi par défaut.
	const s = d.secteur_id
		? db.select().from(secteurActivite).where(eq(secteurActivite.id, d.secteur_id)).get()
		: undefined;
	if (!d.secteur_id || !s) {
		champs.secteur_id =
			"Tout domaine d'activité est lié à un secteur. Veuillez indiquer le secteur.";
	}
	if (!longueurMin(d.libelle, 5)) champs.libelle = 'Le libellé doit avoir 5 caractères minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	if (
		doublon(domaineActivite, domaineActivite.libelle, d.libelle, {
			condition: eq(domaineActivite.secteur_id, d.secteur_id!),
			exclureId
		})
	) {
		throw erreur('Cette fiche est déjà enregistrée.', {
			libelle: 'Ce domaine existe déjà dans ce secteur.'
		});
	}
}

routeur.post('/referentiels/domaines', (req, res) => {
	const d = valider(domaineEntreeSchema, req.body);
	validerDomaine(d);
	const x = db
		.insert(domaineActivite)
		.values({ secteur_id: d.secteur_id!, libelle: d.libelle.trim(), etat: d.etat })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/domaines/:id', (req, res) => {
	const x = charger<Domaine>(domaineActivite, Number(req.params.id), 'Domaine introuvable.');
	const d = valider(domaineEntreeSchema, req.body);
	validerDomaine(d, x.id);
	db.update(domaineActivite)
		.set({ secteur_id: d.secteur_id!, libelle: d.libelle.trim(), etat: d.etat })
		.where(eq(domaineActivite.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/domaines/:id', (req, res) => {
	const x = charger<Domaine>(domaineActivite, Number(req.params.id), 'Domaine introuvable.');
	res.json(supprimerAvecEtat(domaineActivite, x.id));
});

// --- Familles d'articles (F-ADM-21) --------------------------------------------------------------

type Famille = typeof familleArticle.$inferSelect;

const familleEntreeSchema = z.object({ libelle: z.string().max(100).default('') });

function vueFamille(x: Famille) {
	return {
		id: x.id,
		libelle: x.libelle,
		nombre_articles: compter(article, eq(article.famille_id, x.id))
	};
}

routeur.get('/referentiels/familles', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(familleArticle)
		.where(recherche(motQuery(req), familleArticle.libelle))
		.orderBy(asc(familleArticle.libelle))
		.$dynamic();
	const liste = paginer<Famille>(requete, page);
	res.json(enveloppe(liste.items.map(vueFamille), liste.total, page));
});

routeur.get('/referentiels/familles/:id', (req, res) => {
	res.json(
		vueFamille(charger<Famille>(familleArticle, Number(req.params.id), 'Famille introuvable.'))
	);
});

function validerFamille(libelle: string, exclureId?: number): void {
	if (!longueurMin(libelle, 5)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			libelle: 'Le libellé doit avoir 5 caractères minimum.'
		});
	}
	// Correctif F-ADM-21 : le legacy parlait de « famille de maladie ».
	if (doublon(familleArticle, familleArticle.libelle, libelle, { exclureId })) {
		throw erreur("Cette famille d'article est déjà enregistrée.", {
			libelle: "Cette famille d'article est déjà enregistrée."
		});
	}
}

routeur.post('/referentiels/familles', (req, res) => {
	const d = valider(familleEntreeSchema, req.body);
	validerFamille(d.libelle);
	const x = db.insert(familleArticle).values({ libelle: d.libelle.trim() }).returning().get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/familles/:id', (req, res) => {
	const x = charger<Famille>(familleArticle, Number(req.params.id), 'Famille introuvable.');
	const d = valider(familleEntreeSchema, req.body);
	validerFamille(d.libelle, x.id);
	db.update(familleArticle)
		.set({ libelle: d.libelle.trim() })
		.where(eq(familleArticle.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/familles/:id', (req, res) => {
	const x = charger<Famille>(familleArticle, Number(req.params.id), 'Famille introuvable.');
	res.json(
		supprimerSansEtat(
			familleArticle,
			x.id,
			'cette famille',
			usages([['annonce(s)', article, eq(article.famille_id, x.id)]])
		)
	);
});

// --- Produits (F-ADM-25 à F-ADM-27) --------------------------------------------------------------

type Produit = typeof produit.$inferSelect;

const produitEntreeSchema = z.object({
	// Groupe FLP (`GroupeProduit`) ; les groupes hors liste de la reprise (0, 100) restent acceptés
	// sur un produit qui les porte déjà.
	groupe: entier.min(0).max(999).default(0),
	reference: z.string().max(30).default(''),
	nom: z.string().max(200).default(''),
	description: z.string().max(10000).default(''),
	prix_distributeur: entier.min(0).default(0),
	prix_non_distributeur: entier.min(0).default(0),
	prix_public: entier.min(0).default(0),
	quantite_stock: entier.min(0).default(0),
	etat: entier.min(1).max(3).default(2)
});

function vueProduit(x: Produit) {
	return {
		id: x.id,
		reference: x.reference,
		nom: x.nom,
		description: x.description,
		groupe: x.groupe,
		prix_distributeur: x.prix_distributeur,
		prix_non_distributeur: x.prix_non_distributeur,
		prix_public: x.prix_public,
		quantite_stock: x.quantite_stock,
		etat: x.etat,
		photo: x.photo,
		photo_url: url(x.photo)
	};
}

routeur.get('/referentiels/produits', (req, res) => {
	const page = paginationGestion(req);
	const conditions: (SQL | undefined)[] = [];
	const groupe = nombreQuery(req, 'groupe');
	if (groupe !== null) conditions.push(eq(produit.groupe, groupe));
	conditions.push(filtreEtat(produit.etat, req));
	const prixDistributeurMax = nombreQuery(req, 'prix_distributeur_max');
	if (prixDistributeurMax !== null) {
		conditions.push(lte(produit.prix_distributeur, prixDistributeurMax));
	}
	const prixPublicMax = nombreQuery(req, 'prix_public_max');
	if (prixPublicMax !== null) conditions.push(lte(produit.prix_public, prixPublicMax));
	const quantiteMax = nombreQuery(req, 'quantite_max');
	if (quantiteMax !== null) conditions.push(lte(produit.quantite_stock, quantiteMax));
	conditions.push(recherche(motQuery(req), produit.nom, produit.description, produit.reference));

	const requete = db
		.select()
		.from(produit)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(produit.nom))
		.$dynamic();
	const liste = paginer<Produit>(requete, page);
	res.json(enveloppe(liste.items.map(vueProduit), liste.total, page));
});

routeur.get('/referentiels/produits/:id', (req, res) => {
	res.json(vueProduit(charger<Produit>(produit, Number(req.params.id), 'Produit introuvable.')));
});

function validerProduit(d: z.output<typeof produitEntreeSchema>, actuel?: Produit): void {
	const champs: Record<string, string> = {};
	const groupes: number[] = Object.values(GroupeProduit);
	if (!groupes.includes(d.groupe) && !(actuel && actuel.groupe === d.groupe)) {
		champs.groupe = 'Veuillez choisir le groupe du produit.';
	}
	if (!longueurMin(d.nom, 3)) champs.nom = 'Le nom du produit doit avoir 3 caractères minimum.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Correctif F-ADM-26 : l'anti-doublon legacy (colonne inexistante) ne fonctionnait pas.
	if (
		doublon(produit, produit.nom, d.nom, {
			condition: eq(produit.groupe, d.groupe),
			exclureId: actuel?.id
		})
	) {
		throw erreur('Ce produit est déjà enregistré.', {
			nom: 'Un produit de ce groupe porte déjà ce nom.'
		});
	}
}

function champsProduit(d: z.output<typeof produitEntreeSchema>) {
	return {
		groupe: d.groupe,
		reference: d.reference.trim(),
		nom: d.nom.trim(),
		description: d.description.trim(),
		prix_distributeur: d.prix_distributeur,
		prix_non_distributeur: d.prix_non_distributeur,
		prix_public: d.prix_public,
		quantite_stock: d.quantite_stock,
		etat: d.etat
	};
}

routeur.post('/referentiels/produits', (req, res) => {
	const d = valider(produitEntreeSchema, req.body);
	validerProduit(d);
	const x = db.insert(produit).values(champsProduit(d)).returning().get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id, x.reference || null));
});

routeur.put('/referentiels/produits/:id', (req, res) => {
	const x = charger<Produit>(produit, Number(req.params.id), 'Produit introuvable.');
	const d = valider(produitEntreeSchema, req.body);
	validerProduit(d, x);
	db.update(produit).set(champsProduit(d)).where(eq(produit.id, x.id)).run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.post(
	'/referentiels/produits/:id/photo',
	televersement.single('fichier'),
	async (req, res) => {
		const x = charger<Produit>(produit, Number(req.params.id), 'Produit introuvable.');
		if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });
		const ancien = x.photo;
		const chemin = await enregistrerFichier(req.file.buffer, 'produits', new Set([IMAGE]), 'photo');
		db.update(produit).set({ photo: chemin }).where(eq(produit.id, x.id)).run();
		supprimerFichier(ancien);
		res.json(ok('Photo enregistrée.', x.id));
	}
);

routeur.delete('/referentiels/produits/:id', (req, res) => {
	const x = charger<Produit>(produit, Number(req.params.id), 'Produit introuvable.');
	res.json(supprimerAvecEtat(produit, x.id));
});

// --- Maladies / fiches bien-être (F-ADM-22 à F-ADM-24) -------------------------------------------

type Maladie = typeof maladie.$inferSelect;

const maladieEntreeSchema = z.object({
	libelle: z.string().max(200).default(''),
	description: z.string().max(10000).default(''),
	etat: entier.min(1).max(3).default(2),
	produits: z
		.array(
			z.object({
				produit_id: entier,
				// « Conseil d'utilisation » (ADR-0009 : le mot « posologie » n'est plus affiché).
				posologie: z.string().max(2000).default('')
			})
		)
		.max(50)
		.default([])
});

function conseilsDe(maladieId: number) {
	return db
		.select({ lien: maladieProduit, produit })
		.from(maladieProduit)
		.leftJoin(produit, eq(maladieProduit.produit_id, produit.id))
		.where(eq(maladieProduit.maladie_id, maladieId))
		.orderBy(asc(maladieProduit.ordre), asc(maladieProduit.id))
		.all()
		.map(({ lien, produit: p }) => ({
			id: lien.id,
			produit_id: lien.produit_id,
			produit: p
				? { id: p.id, nom: p.nom, reference: p.reference, groupe: p.groupe, etat: p.etat }
				: null,
			posologie: lien.posologie,
			ordre: lien.ordre
		}));
}

function vueMaladie(x: Maladie) {
	return {
		id: x.id,
		libelle: x.libelle,
		description: x.description,
		etat: x.etat,
		nombre_produits: compter(maladieProduit, eq(maladieProduit.maladie_id, x.id))
	};
}

routeur.get('/referentiels/maladies', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(maladie)
		.where(
			and(
				filtreEtat(maladie.etat, req),
				recherche(motQuery(req), maladie.libelle, maladie.description)
			)
		)
		.orderBy(asc(maladie.libelle))
		.$dynamic();
	const liste = paginer<Maladie>(requete, page);
	res.json(enveloppe(liste.items.map(vueMaladie), liste.total, page));
});

routeur.get('/referentiels/maladies/:id', (req, res) => {
	const x = charger<Maladie>(maladie, Number(req.params.id), 'Fiche introuvable.');
	const produits = conseilsDe(x.id);
	res.json({ ...vueMaladie(x), produits, nombre_produits: produits.length });
});

function validerMaladie(d: z.output<typeof maladieEntreeSchema>, exclureId?: number): void {
	const champs: Record<string, string> = {};
	if (!longueurMin(d.libelle, 5)) champs.libelle = 'Le libellé doit avoir 5 caractères minimum.';
	const vus = new Set<number>();
	d.produits.forEach((p, i) => {
		if (vus.has(p.produit_id)) {
			champs[`produits.${i}.produit_id`] = 'Ce produit figure déjà dans la liste.';
		} else if (!db.select().from(produit).where(eq(produit.id, p.produit_id)).get()) {
			champs[`produits.${i}.produit_id`] = 'Produit inconnu.';
		}
		vus.add(p.produit_id);
	});
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	if (doublon(maladie, maladie.libelle, d.libelle, { exclureId })) {
		throw erreur('Cette maladie est déjà enregistrée.', {
			libelle: 'Cette maladie est déjà enregistrée.'
		});
	}
}

/**
 * Une seule liste ordonnée, sans limite à 5 : exactement ce que voit la page publique
 * (ADR-0007 S1b, F-ADM-23/24).
 */
function appliquerConseils(maladieId: number, d: z.output<typeof maladieEntreeSchema>): void {
	db.delete(maladieProduit).where(eq(maladieProduit.maladie_id, maladieId)).run();
	if (d.produits.length) {
		db.insert(maladieProduit)
			.values(
				d.produits.map((p, i) => ({
					maladie_id: maladieId,
					produit_id: p.produit_id,
					posologie: p.posologie.trim(),
					ordre: i + 1
				}))
			)
			.run();
	}
}

routeur.post('/referentiels/maladies', (req, res) => {
	const d = valider(maladieEntreeSchema, req.body);
	validerMaladie(d);
	const x = db.transaction(() => {
		const cree = db
			.insert(maladie)
			.values({ libelle: d.libelle.trim(), description: d.description.trim(), etat: d.etat })
			.returning()
			.get()!;
		appliquerConseils(cree.id, d);
		return cree;
	});
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/maladies/:id', (req, res) => {
	const x = charger<Maladie>(maladie, Number(req.params.id), 'Fiche introuvable.');
	const d = valider(maladieEntreeSchema, req.body);
	validerMaladie(d, x.id);
	db.transaction(() => {
		db.update(maladie)
			.set({ libelle: d.libelle.trim(), description: d.description.trim(), etat: d.etat })
			.where(eq(maladie.id, x.id))
			.run();
		appliquerConseils(x.id, d);
	});
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/maladies/:id', (req, res) => {
	const x = charger<Maladie>(maladie, Number(req.params.id), 'Fiche introuvable.');
	res.json(supprimerAvecEtat(maladie, x.id));
});

// --- Produits du comparateur de prix (F-ADM-28) --------------------------------------------------

type ProduitComparateur = typeof produitProspective.$inferSelect;

const produitComparateurEntreeSchema = z.object({
	nom: z.string().max(200).default(''),
	etat: entier.min(1).max(3).default(2)
});

function vueProduitComparateur(x: ProduitComparateur) {
	return {
		id: x.id,
		nom: x.nom,
		etat: x.etat,
		nombre_lignes: compter(ligneProspective, eq(ligneProspective.produit_id, x.id))
	};
}

routeur.get('/referentiels/produits-comparateur', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(produitProspective)
		.where(
			and(
				filtreEtat(produitProspective.etat, req),
				recherche(motQuery(req), produitProspective.nom)
			)
		)
		.orderBy(asc(produitProspective.nom))
		.$dynamic();
	const liste = paginer<ProduitComparateur>(requete, page);
	res.json(enveloppe(liste.items.map(vueProduitComparateur), liste.total, page));
});

routeur.get('/referentiels/produits-comparateur/:id', (req, res) => {
	res.json(
		vueProduitComparateur(
			charger<ProduitComparateur>(produitProspective, Number(req.params.id), 'Produit introuvable.')
		)
	);
});

function validerProduitComparateur(nom: string, exclureId?: number): void {
	if (!longueurMin(nom, 4)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			nom: 'Le nom du produit doit avoir 4 caractères minimum.'
		});
	}
	if (doublon(produitProspective, produitProspective.nom, nom, { exclureId })) {
		throw erreur('Ce produit est déjà enregistré.', { nom: 'Ce produit est déjà enregistré.' });
	}
}

routeur.post('/referentiels/produits-comparateur', (req, res) => {
	const d = valider(produitComparateurEntreeSchema, req.body);
	validerProduitComparateur(d.nom);
	const x = db
		.insert(produitProspective)
		.values({ nom: d.nom.trim(), etat: d.etat })
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/produits-comparateur/:id', (req, res) => {
	const x = charger<ProduitComparateur>(
		produitProspective,
		Number(req.params.id),
		'Produit introuvable.'
	);
	const d = valider(produitComparateurEntreeSchema, req.body);
	validerProduitComparateur(d.nom, x.id);
	db.update(produitProspective)
		.set({ nom: d.nom.trim(), etat: d.etat })
		.where(eq(produitProspective.id, x.id))
		.run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/produits-comparateur/:id', (req, res) => {
	const x = charger<ProduitComparateur>(
		produitProspective,
		Number(req.params.id),
		'Produit introuvable.'
	);
	res.json(supprimerAvecEtat(produitProspective, x.id));
});

// --- Banques (F-ADM-29) --------------------------------------------------------------------------

type Banque = typeof banque.$inferSelect;

const banqueEntreeSchema = z.object({
	sigle: z.string().max(30).default(''),
	nom: z.string().max(120).default(''),
	telephones: z.string().max(100).default(''),
	adresse: z.string().max(500).default(''),
	email: z.string().max(120).default(''),
	site_web: z.string().max(200).default(''),
	nom_contact: z.string().max(100).default(''),
	telephone_contact: z.string().max(100).default(''),
	observation: z.string().max(5000).default(''),
	etat: entier.min(1).max(3).default(2)
});

routeur.get('/referentiels/banques', (req, res) => {
	const page = paginationGestion(req);
	const requete = db
		.select()
		.from(banque)
		.where(
			and(
				filtreEtat(banque.etat, req),
				recherche(motQuery(req), banque.nom, banque.sigle, banque.nom_contact, banque.observation)
			)
		)
		.orderBy(asc(banque.nom))
		.$dynamic();
	const liste = paginer<Banque>(requete, page);
	res.json(enveloppe(liste.items, liste.total, page));
});

routeur.get('/referentiels/banques/:id', (req, res) => {
	res.json(charger<Banque>(banque, Number(req.params.id), 'Banque introuvable.'));
});

function validerBanque(d: z.output<typeof banqueEntreeSchema>, exclureId?: number): void {
	if (!longueurMin(d.nom, 3)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			nom: 'Veuillez saisir le nom de la banque avec 3 caractères minimum.'
		});
	}
	const normaliser = (v: string) => v.trim().toLocaleLowerCase('fr');
	const sigle = normaliser(d.sigle);
	const nom = normaliser(d.nom);
	const lignes = db
		.select({ id: banque.id, sigle: banque.sigle, nom: banque.nom })
		.from(banque)
		.where(exclureId ? ne(banque.id, exclureId) : undefined)
		.all();
	if (lignes.some((b) => normaliser(b.sigle) === sigle && normaliser(b.nom) === nom)) {
		throw erreur('Cette banque est déjà enregistrée.', {
			nom: 'Cette banque est déjà enregistrée.'
		});
	}
}

function champsBanque(d: z.output<typeof banqueEntreeSchema>) {
	return {
		sigle: d.sigle.trim().toUpperCase(),
		nom: d.nom.trim(),
		telephones: d.telephones.trim(),
		adresse: d.adresse.trim(),
		email: d.email.trim(),
		site_web: d.site_web.trim(),
		nom_contact: d.nom_contact.trim(),
		telephone_contact: d.telephone_contact.trim(),
		observation: d.observation.trim(),
		etat: d.etat
	};
}

routeur.post('/referentiels/banques', (req, res) => {
	const d = valider(banqueEntreeSchema, req.body);
	validerBanque(d);
	const x = db.insert(banque).values(champsBanque(d)).returning().get()!;
	res.status(201).json(ok('Enregistrement effectué.', x.id));
});

routeur.put('/referentiels/banques/:id', (req, res) => {
	const x = charger<Banque>(banque, Number(req.params.id), 'Banque introuvable.');
	const d = valider(banqueEntreeSchema, req.body);
	validerBanque(d, x.id);
	db.update(banque).set(champsBanque(d)).where(eq(banque.id, x.id)).run();
	res.json(ok('Modification effectuée.', x.id));
});

routeur.delete('/referentiels/banques/:id', (req, res) => {
	// Les tarifs bancaires et opérations gardent leur banque : suppression logique uniquement.
	const x = charger<Banque>(banque, Number(req.params.id), 'Banque introuvable.');
	res.json(supprimerAvecEtat(banque, x.id));
});

// --- Paramètres du site (F-ADM-01 à F-ADM-04) ----------------------------------------------------

/** Téléphone du site : message d'erreur nommant le champ concerné (correctif F-ADM-04). */
function telephoneSite(nomChamp: string) {
	return z
		.string()
		.default('')
		.transform((v) => normaliserTelephone(v))
		.refine((v) => telephoneValide(v), {
			error:
				`Veuillez vérifier le numéro ${nomChamp} ` +
				'(9 chiffres commençant par 01, 04, 05, 06 ou 22).'
		});
}

const parametresEntreeSchema = z.object({
	nom_site: z.string().max(100).default(''),
	adresse: z.string().max(500).default(''),
	telephone_1: telephoneSite('de téléphone 1'),
	telephone_2: telephoneSite('de téléphone 2'),
	email: z
		.union([z.literal(''), z.null(), z.email()])
		.optional()
		.transform((v) => v || ''),
	whatsapp: telephoneSite('WhatsApp'),
	texte_aide: z.string().max(20000).default(''),
	montant_minimum_placement: entier.min(0).default(0),
	montant_minimum_course: entier.min(0).default(0),
	commission_course: entier.min(0).default(0),
	conditions_course: z.string().max(20000).default(''),
	description_section_1: z.string().max(2000).default(''),
	description_section_2: z.string().max(2000).default(''),
	description_section_3: z.string().max(2000).default(''),
	description_section_4: z.string().max(2000).default(''),
	description_section_5: z.string().max(2000).default(''),
	description_section_6: z.string().max(2000).default(''),
	description_section_7: z.string().max(2000).default(''),
	module_epargne_actif: booleen,
	module_sante_actif: booleen
});

const CHAMPS_PARAMETRES = Object.keys(parametresEntreeSchema.shape) as (keyof z.output<
	typeof parametresEntreeSchema
>)[];

function vueParametres(p: typeof parametre.$inferSelect | undefined) {
	const vide = { id: 1 } as typeof parametre.$inferSelect;
	const x = p ?? vide;
	const sortie: Record<string, unknown> = {};
	for (const champ of CHAMPS_PARAMETRES) {
		const v = (x as unknown as Record<string, unknown>)[champ];
		sortie[champ] = v ?? (typeof vide === 'object' && champ.startsWith('module_') ? true : '');
	}
	return sortie;
}

routeur.get('/parametres', (_req, res) => {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	res.json(vueParametres(p));
});

/**
 * Tous les champs de `parametre`, nom du site compris (correctif F-ADM-02) ; téléphones validés
 * avec un message par champ (correctif F-ADM-04). Les interrupteurs de modules (ADR-0009) masquent
 * la navigation sans perte de données.
 */
routeur.put('/parametres', (req, res) => {
	exigerMembre(req);
	const d = valider(parametresEntreeSchema, req.body);
	if (!longueurMin(d.nom_site, 2)) {
		throw erreur('Veuillez corriger les champs signalés.', {
			nom_site: 'Veuillez indiquer le nom du site.'
		});
	}
	const valeurs: Record<string, unknown> = {};
	for (const champ of CHAMPS_PARAMETRES) {
		const v = d[champ];
		valeurs[champ] = typeof v === 'string' ? v.trim() : v;
	}
	const existe = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	if (existe) db.update(parametre).set(valeurs).where(eq(parametre.id, 1)).run();
	else
		db.insert(parametre)
			.values({ id: 1, ...valeurs })
			.run();
	res.json(ok('Modification effectuée.'));
});
