/**
 * Marchés (appels d'offres publics et privés) et projets (portage de `app/routers/marches.py` ;
 * legacy choix6.php?rere=3, incl-choix6C1.php, incl-choix6C2.php, incl-marche.php,
 * incl-projet.php). Inventaire : S6-5 à S6-8, F-S6-01, F-S6-23 à F-S6-32, F-S6-35.
 *
 * Les projets sont servis sous `/marches/projets` (onglet « Projets » de « Marchés et projets ») ;
 * ne pas confondre avec `/projets` (appels de fonds, section 4).
 */
import { and, asc, desc, eq, gte, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
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
import { Confidentialite, Etat } from '../enums.js';
import { erreur } from '../erreurs.js';
import { marche, projet } from '../schema/entreprises.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, type Auteur } from '../schemas/commun.js';
import { auteursDe } from '../services/contacts.js';
import {
	changerEtat,
	exigerVisible,
	paginer,
	recherche,
	supprimer,
	visibilite
} from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	PDF,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/marches';

/** Les routes `/marches/projets…` sont montées **avant** `/marches/:id`. */
export const routeurProjets = Router();
export const prefixeProjets = '/marches/projets';

type Marche = typeof marche.$inferSelect;
type Projet = typeof projet.$inferSelect;

const MARCHE_INTROUVABLE = "Ce marché n'existe pas ou n'est plus publié.";
const PROJET_INTROUVABLE = "Ce projet n'existe pas ou n'est plus publié.";

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const emailFacultatif = z
	.union([z.literal(''), z.null(), z.email()])
	.optional()
	.transform((v) => (v ? v : null));

const dateFacultative = z
	.union([z.literal(''), z.null(), z.iso.date()])
	.optional()
	.transform((v) => (v ? new Date(`${v}T00:00:00`) : null));

const marcheEntreeSchema = z.object({
	numero_appel_offre: z.string().max(120).default(''),
	type_marche: z.coerce.number().int().nullable().optional(),
	libelle: z.string().max(500).default(''),
	description: z.string().max(10000).default(''),
	montant: z.coerce.number().int().min(0).default(0),
	date_limite: dateFacultative,
	dossier_a_fournir: z.string().max(5000).default(''),
	lieu_depot: z.string().max(500).default(''),
	email: emailFacultatif,
	maitre_ouvrage: z.string().max(500).default(''),
	publie_par: z.string().max(500).default(''),
	beneficiaire: z.string().max(500).default('')
});
type MarcheEntree = z.output<typeof marcheEntreeSchema>;

const projetEntreeSchema = z.object({
	// Le legacy limitait ces champs à 20 caractères à l'écran (colonnes `text`) : limite levée
	// à 150 (F-S6-32, voir docs/modules/entreprises-marches.md).
	responsable: z.string().max(150).default(''),
	promoteur: z.string().max(150).default(''),
	objet: z.string().max(150).default(''),
	libelle: z.string().max(150).default(''),
	objectif: z.string().max(500).default(''),
	description: z.string().max(10000).default(''),
	adresse: z.string().max(300).default(''),
	duree_mois: z.coerce.number().int().nullable().optional(),
	date_lancement: dateFacultative,
	conditions: z.string().max(5000).default('')
});
type ProjetEntree = z.output<typeof projetEntreeSchema>;

const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

function texte(v: string | null | undefined): string {
	return (v ?? '').trim();
}

/** Minuit du jour courant, pour comparer des dates sans heure. */
function aujourdhui(): Date {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Marchés où l'on peut encore soumissionner : non clôturés, date limite non dépassée
 * (ou non précisée).
 */
function conditionOuverts(): SQL {
	return and(
		ne(marche.etat, Etat.CLOTURE),
		or(isNull(marche.date_limite), gte(marche.date_limite, aujourdhui()))
	)!;
}

function estOuvert(m: Marche): boolean {
	if (m.etat === Etat.CLOTURE) return false;
	return m.date_limite === null || m.date_limite.getTime() >= aujourdhui().getTime();
}

/** Jours avant la date limite (négatif : dépassée ; `null` : non précisée). */
function joursRestants(m: Marche): number | null {
	if (!m.date_limite) return null;
	return Math.round((m.date_limite.getTime() - aujourdhui().getTime()) / (24 * 60 * 60 * 1000));
}

function vueMarcheResume(m: Marche) {
	return {
		id: m.id,
		reference: m.reference,
		numero_appel_offre: m.numero_appel_offre,
		type_marche: m.type_marche,
		libelle: m.libelle,
		montant: m.montant,
		date_limite: m.date_limite,
		maitre_ouvrage: m.maitre_ouvrage,
		etat: m.etat,
		date_creation: m.date_creation,
		jours_restants: joursRestants(m),
		ouvert: estOuvert(m)
	};
}

function obtenirMarche(id: number, membre: Membre | null): Marche {
	const m = db.select().from(marche).where(eq(marche.id, id)).get();
	return exigerVisible(m as never, membre, { message: MARCHE_INTROUVABLE }) as unknown as Marche;
}

function obtenirProjet(id: number, membre: Membre | null): Projet {
	const p = db.select().from(projet).where(eq(projet.id, id)).get();
	return exigerVisible(p as never, membre, { message: PROJET_INTROUVABLE }) as unknown as Projet;
}

function entierQuery(v: unknown): number | null {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

// --- Marchés ---------------------------------------------------------------------------------------

routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [
		visibilite({ etat: marche.etat, auteur: marche.auteur_id }, membre)
	];

	if (membre && membre.type_compte === 1) {
		const etat = entierQuery(req.query.etat);
		conditions.push(etat ? eq(marche.etat, etat) : ne(marche.etat, Etat.SUPPRIME));
	}
	if (req.query.miennes === 'true' && membre) conditions.push(eq(marche.auteur_id, membre.id));

	const type = entierQuery(req.query.type);
	if (type === 1 || type === 2) conditions.push(eq(marche.type_marche, type));
	if (req.query.ouverts === 'true') conditions.push(conditionOuverts());

	const montantMin = entierQuery(req.query.montant_min);
	if (montantMin) conditions.push(gte(marche.montant, montantMin));

	// Recherche legacy (cht03) : libellé, description, dossier — correctement parenthésée (F-S6-24).
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null,
			marche.libelle,
			marche.description,
			marche.dossier_a_fournir,
			marche.numero_appel_offre,
			marche.maitre_ouvrage,
			marche.reference
		)
	);

	const tri = String(req.query.tri ?? 'recent');
	const ordres = {
		recent: [desc(marche.date_creation), desc(marche.id)],
		cloture: [asc(sql`${marche.date_limite} is null`), asc(marche.date_limite), desc(marche.id)],
		montant: [desc(marche.montant), desc(marche.id)]
	} as const;

	const requete = db
		.select()
		.from(marche)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(...(ordres[tri as keyof typeof ordres] ?? ordres.recent))
		.$dynamic();

	const liste = paginer<Marche>(requete, page);
	res.json({
		items: liste.items.map(vueMarcheResume),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Compteurs publics des onglets (F-S6-01 : le legacy affichait le nombre de projets publiés). */
routeur.get('/compteurs', (_req, res) => {
	const compter = (table: typeof marche | typeof projet, condition?: SQL) =>
		db
			.select({ n: sql<number>`count(*)` })
			.from(table)
			.where(and(eq(table.etat, Etat.AUTORISE), condition))
			.get()?.n ?? 0;

	res.json({
		marches: compter(marche),
		marches_ouverts: compter(marche, conditionOuverts()),
		projets: compter(projet)
	});
});

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenirMarche(Number(req.params.id), membre);
	const auteurFiche: Auteur | null =
		fiche.auteur_id !== null
			? auteur(db.select().from(tableMembre).where(eq(tableMembre.id, fiche.auteur_id)).get())
			: null;

	res.json({
		...vueMarcheResume(fiche),
		description: fiche.description,
		dossier_a_fournir: fiche.dossier_a_fournir,
		lieu_depot: fiche.lieu_depot,
		email: fiche.email,
		publie_par: fiche.publie_par,
		beneficiaire: fiche.beneficiaire,
		document: fiche.document,
		document_url: url(fiche.document),
		auteur: auteurFiche,
		peut_modifier: peutModifier(membre, fiche.auteur_id),
		peut_moderer: peutModerer(membre)
	});
});

/** Règles legacy d'incl-marche.php (messages exacts, orthographe corrigée). */
function validerMarche(d: MarcheEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};

	if (texte(d.numero_appel_offre).length < 4) {
		champs.numero_appel_offre = "Veuillez indiquer le numéro d'appel d'offres.";
	}
	if (d.type_marche !== Confidentialite.PRIVE && d.type_marche !== Confidentialite.PUBLIC) {
		champs.type_marche = 'Veuillez indiquer marché privé ou public.';
	}
	if (texte(d.libelle).length < 4) champs.libelle = 'Veuillez indiquer le libellé du marché.';
	if (d.montant <= 0) champs.montant = 'Veuillez indiquer le montant du marché.';

	// Ajout : on ne publie pas un appel d'offres déjà clos (la modification reste possible).
	if (!exclureId && d.date_limite && d.date_limite.getTime() < aujourdhui().getTime()) {
		champs.date_limite = 'La date limite est déjà passée.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Unicité du numéro d'appel d'offres, en création **et** en modification (F-S6-26, corrigé).
	const conditions = [
		sql`lower(${marche.numero_appel_offre}) = ${texte(d.numero_appel_offre).toLowerCase()}`,
		ne(marche.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(marche.id, exclureId));
	const doublon = db
		.select({ id: marche.id })
		.from(marche)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Ce marché est déjà enregistré.', {
			numero_appel_offre: "Ce numéro d'appel d'offres est déjà publié."
		});
	}
}

function champsMarche(d: MarcheEntree) {
	return {
		numero_appel_offre: texte(d.numero_appel_offre),
		type_marche: d.type_marche ?? Confidentialite.PUBLIC,
		libelle: texte(d.libelle),
		description: texte(d.description),
		montant: d.montant,
		date_limite: d.date_limite,
		dossier_a_fournir: texte(d.dossier_a_fournir),
		lieu_depot: texte(d.lieu_depot),
		email: d.email ?? '',
		maitre_ouvrage: texte(d.maitre_ouvrage),
		publie_par: texte(d.publie_par),
		beneficiaire: texte(d.beneficiaire)
	};
}

/** Création par tout membre connecté (F-S6-25), publiée immédiatement (legacy : état 2). */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(marcheEntreeSchema, req.body);
	validerMarche(donnees);

	const cree = db.transaction(() =>
		db
			.insert(marche)
			.values({
				auteur_id: membre.id,
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.MARCHE),
				...champsMarche(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Opération effectuée avec succès.', cree!.id, cree!.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirMarche(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	const donnees = valider(marcheEntreeSchema, req.body);
	validerMarche(donnees, fiche.id);

	const misAJour = db
		.update(marche)
		.set(champsMarche(donnees))
		.where(eq(marche.id, fiche.id))
		.returning()
		.get();
	res.json(ok('Opération effectuée avec succès.', misAJour!.id, misAJour!.reference));
});

/** Dossier d'appel d'offres en PDF (facultatif, nouveau). */
routeur.post('/:id/document', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirMarche(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { document: 'Veuillez choisir un PDF.' });

	const ancien = fiche.document;
	const chemin = await enregistrerFichier(req.file.buffer, 'marches', new Set([PDF]), 'document');
	db.update(marche).set({ document: chemin }).where(eq(marche.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Document enregistré.', fiche.id));
});

routeur.delete('/:id/document', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirMarche(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	const ancien = fiche.document;
	db.update(marche).set({ document: null }).where(eq(marche.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Document retiré.', fiche.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirMarche(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(marche, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirMarche(Number(req.params.id), membre);
	supprimer(marche, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});

// --- Projets ---------------------------------------------------------------------------------------

function vueProjetResume(p: Projet) {
	return {
		id: p.id,
		reference: p.reference,
		responsable: p.responsable,
		promoteur: p.promoteur,
		objet: p.objet,
		libelle: p.libelle,
		duree_mois: p.duree_mois,
		date_lancement: p.date_lancement,
		etat: p.etat,
		date_creation: p.date_creation
	};
}

routeurProjets.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [
		visibilite({ etat: projet.etat, auteur: projet.auteur_id }, membre)
	];

	if (membre && membre.type_compte === 1) {
		const etat = entierQuery(req.query.etat);
		conditions.push(etat ? eq(projet.etat, etat) : ne(projet.etat, Etat.SUPPRIME));
	}
	if (req.query.miennes === 'true' && membre) conditions.push(eq(projet.auteur_id, membre.id));

	// Recherche legacy (cht01) : libellé, objet, description — parenthésée (F-S6-28).
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null,
			projet.libelle,
			projet.objet,
			projet.description,
			projet.promoteur,
			projet.reference
		)
	);

	const requete = db
		.select()
		.from(projet)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(projet.date_creation), desc(projet.id))
		.$dynamic();

	const liste = paginer<Projet>(requete, page);
	res.json({
		items: liste.items.map(vueProjetResume),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeurProjets.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenirProjet(Number(req.params.id), membre);
	const auteurs = auteursDe([fiche.auteur_id]);
	res.json({
		...vueProjetResume(fiche),
		objectif: fiche.objectif,
		description: fiche.description,
		adresse: fiche.adresse,
		conditions: fiche.conditions,
		auteur: fiche.auteur_id !== null ? (auteurs.get(fiche.auteur_id) ?? null) : null,
		peut_modifier: peutModifier(membre, fiche.auteur_id),
		peut_moderer: peutModerer(membre)
	});
});

/** Règles legacy d'incl-projet.php (F-S6-29, F-S6-30). */
function validerProjet(d: ProjetEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};
	const obligatoires: [keyof ProjetEntree, string][] = [
		['responsable', 'Veuillez indiquer le responsable du projet.'],
		['promoteur', 'Veuillez indiquer le promoteur du projet.'],
		['objet', "Veuillez indiquer l'objet du projet."],
		['libelle', 'Veuillez indiquer le libellé du projet.']
	];
	for (const [nom, message] of obligatoires) {
		if (texte(d[nom] as string).length < 4) champs[nom] = message;
	}
	if (
		d.duree_mois === null ||
		d.duree_mois === undefined ||
		d.duree_mois < 0 ||
		d.duree_mois > 120
	) {
		champs.duree_mois = 'Veuillez indiquer la durée du projet.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Unicité responsable + objet ; message corrigé (le legacy affichait « Ce marché est déjà
	// enregistré. » sur un projet).
	const conditions = [
		sql`lower(${projet.responsable}) = ${texte(d.responsable).toLowerCase()}`,
		sql`lower(${projet.objet}) = ${texte(d.objet).toLowerCase()}`,
		ne(projet.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(projet.id, exclureId));
	const doublon = db
		.select({ id: projet.id })
		.from(projet)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce projet est déjà enregistré.');
}

function champsProjet(d: ProjetEntree) {
	return {
		responsable: texte(d.responsable),
		promoteur: texte(d.promoteur),
		objet: texte(d.objet),
		libelle: texte(d.libelle),
		objectif: texte(d.objectif),
		description: texte(d.description),
		adresse: texte(d.adresse),
		duree_mois: d.duree_mois ?? 0,
		date_lancement: d.date_lancement,
		conditions: texte(d.conditions)
	};
}

routeurProjets.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(projetEntreeSchema, req.body);
	validerProjet(donnees);

	const cree = db.transaction(() =>
		db
			.insert(projet)
			.values({
				auteur_id: membre.id,
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.PROJET),
				...champsProjet(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeurProjets.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirProjet(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	const donnees = valider(projetEntreeSchema, req.body);
	validerProjet(donnees, fiche.id);

	const misAJour = db
		.update(projet)
		.set(champsProjet(donnees))
		.where(eq(projet.id, fiche.id))
		.returning()
		.get();
	res.json(ok('Modification effectuée.', misAJour!.id, misAJour!.reference));
});

routeurProjets.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirProjet(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(projet, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeurProjets.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenirProjet(Number(req.params.id), membre);
	supprimer(projet, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});
