/**
 * Annuaire des entreprises (portage de `app/routers/entreprises.py` ; legacy choix6.php?rere=1,
 * incl-choix6A.php, incl-entreprise.php).
 * Inventaire : S6-1, S6-2, F-S6-02 à F-S6-13, F-S6-35. Structure identique au module de
 * référence Emplois (voir docs/CONVENTIONS.md et docs/modules/entreprises-marches.md).
 */
import { and, asc, desc, eq, isNull, ne, sql, type SQL } from 'drizzle-orm';
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
import { CategorieMembre, Etat, FormeJuridique } from '../enums.js';
import { erreur } from '../erreurs.js';
import { domaineActivite, secteurActivite, ville } from '../schema/core.js';
import {
	entreprise,
	ficheProspective,
	ligneProspective,
	produitProspective
} from '../schema/entreprises.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, telephoneFacultatif, valider } from '../schemas/commun.js';
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
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/entreprises';

type Entreprise = typeof entreprise.$inferSelect;

/** L'auteur d'une fiche entreprise est `entreprise.membre_id` (legacy `indexmbr`). */
const AUTEUR = 'membre_id';
const INTROUVABLE = "Cette entreprise n'existe pas ou n'est plus publiée.";

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const COLONNES_FICHE = { etat: entreprise.etat, auteur: entreprise.membre_id };

/** Adresse web normalisée en http(s) : jamais de `javascript:` dans un lien public. */
const siteWeb = z
	.string()
	.max(200)
	.default('')
	.transform((v) => {
		const t = (v ?? '').trim();
		if (!t) return '';
		return /^https?:\/\//i.test(t) ? t : `https://${t}`;
	})
	.refine((v) => v === '' || /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(v), {
		message: 'Adresse du site invalide (ex. www.monentreprise.cg).'
	});

const entrepriseEntreeSchema = z.object({
	domaine_id: z.coerce.number().int().nullable().optional(),
	nom: z.string().max(150).default(''),
	forme_juridique: z.coerce.number().int().nullable().optional(),
	capital_social: z.coerce.number().int().min(0).default(0),
	description: z.string().max(5000).default(''),
	gerant: z.string().max(120).default(''),
	telephone: telephoneFacultatif,
	email: z
		.union([z.literal(''), z.null(), z.email()])
		.optional()
		.transform((v) => (v ? v : null)),
	site_web: siteWeb,
	adresse: z.string().max(500).default(''),
	ville_id: z.coerce.number().int().nullable().optional()
});
type EntrepriseEntree = z.output<typeof entrepriseEntreeSchema>;

const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

interface DomaineEtSecteur {
	id: number;
	libelle: string;
	secteur: { id: number; libelle: string } | null;
}

/**
 * Domaines avec leur secteur et villes, indexés par identifiant. Le secteur d'une entreprise est
 * toujours déduit de son domaine (ADR-0007, S6-2).
 */
function referentiels() {
	const domaines = new Map<number, DomaineEtSecteur>(
		db
			.select({
				id: domaineActivite.id,
				libelle: domaineActivite.libelle,
				secteur_id: secteurActivite.id,
				secteur_libelle: secteurActivite.libelle
			})
			.from(domaineActivite)
			.leftJoin(secteurActivite, eq(secteurActivite.id, domaineActivite.secteur_id))
			.all()
			.map((d) => [
				d.id,
				{
					id: d.id,
					libelle: d.libelle,
					secteur: d.secteur_id !== null ? { id: d.secteur_id, libelle: d.secteur_libelle! } : null
				}
			])
	);
	const villes = new Map(
		db
			.select({ id: ville.id, nom: ville.nom })
			.from(ville)
			.all()
			.map((v) => [v.id, v])
	);
	return { domaines, villes };
}

function vueResume(e: Entreprise, r: ReturnType<typeof referentiels>) {
	return {
		id: e.id,
		reference: e.reference,
		nom: e.nom,
		forme_juridique: e.forme_juridique,
		description: e.description,
		domaine: e.domaine_id !== null ? (r.domaines.get(e.domaine_id) ?? null) : null,
		ville: e.ville_id !== null ? (r.villes.get(e.ville_id) ?? null) : null,
		etat: e.etat,
		date_creation: e.date_creation,
		nombre_visites: e.nombre_visites,
		logo: e.logo,
		logo_url: url(e.logo)
	};
}

function obtenir(id: number, membre: Membre | null): Entreprise {
	const e = db.select().from(entreprise).where(eq(entreprise.id, id)).get();
	return exigerVisible(e as never, membre, {
		colonneAuteur: AUTEUR,
		message: INTROUVABLE
	}) as unknown as Entreprise;
}

function entierQuery(v: unknown): number | null {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	if (membre && membre.type_compte === 1) {
		const etat = entierQuery(req.query.etat);
		conditions.push(etat ? eq(entreprise.etat, etat) : ne(entreprise.etat, Etat.SUPPRIME));
	}
	if (req.query.miennes === 'true' && membre) {
		conditions.push(eq(entreprise.membre_id, membre.id));
	}

	// Le secteur est celui du domaine (le legacy ne saisissait jamais `indexsat`).
	const secteurId = entierQuery(req.query.secteur_id);
	if (secteurId) {
		conditions.push(
			sql`${entreprise.domaine_id} in (select ${domaineActivite.id} from ${domaineActivite} where ${domaineActivite.secteur_id} = ${secteurId})`
		);
	}
	const domaineId = entierQuery(req.query.domaine_id);
	if (domaineId) conditions.push(eq(entreprise.domaine_id, domaineId));
	const villeId = entierQuery(req.query.ville_id);
	if (villeId) conditions.push(eq(entreprise.ville_id, villeId));

	// Recherche legacy (cht04) : description ; élargie au nom, au gérant et à la référence.
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null,
			entreprise.nom,
			entreprise.description,
			entreprise.gerant,
			entreprise.reference
		)
	);

	const tri = String(req.query.tri ?? 'secteur');
	let requete = db
		.select({ entreprise })
		.from(entreprise)
		.where(and(...conditions.filter(Boolean)))
		.$dynamic();

	if (tri === 'secteur') {
		// Tri legacy : secteur puis nom (F-S6-04) ; les fiches sans domaine en dernier.
		requete = db
			.select({ entreprise })
			.from(entreprise)
			.leftJoin(domaineActivite, eq(domaineActivite.id, entreprise.domaine_id))
			.leftJoin(secteurActivite, eq(secteurActivite.id, domaineActivite.secteur_id))
			.where(and(...conditions.filter(Boolean)))
			.$dynamic()
			.orderBy(
				asc(sql`${secteurActivite.libelle} is null`),
				asc(secteurActivite.libelle),
				asc(entreprise.nom),
				asc(entreprise.id)
			);
	} else {
		const ordres = {
			nom: [asc(entreprise.nom), asc(entreprise.id)],
			recent: [desc(entreprise.date_creation), desc(entreprise.id), asc(entreprise.id)],
			visites: [desc(entreprise.nombre_visites), asc(entreprise.nom), asc(entreprise.id)]
		} as const;
		requete = requete.orderBy(...(ordres[tri as keyof typeof ordres] ?? ordres.nom));
	}

	const liste = paginer<{ entreprise: Entreprise }>(requete, page);
	const r = referentiels();
	res.json({
		items: liste.items.map((l) => vueResume(l.entreprise, r)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Entreprises du membre connecté (utilisé par d'autres modules pour choisir une entreprise). */
routeur.get('/miennes', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const lignes = db
		.select()
		.from(entreprise)
		.where(and(eq(entreprise.membre_id, membre.id), ne(entreprise.etat, Etat.SUPPRIME)))
		.orderBy(asc(entreprise.nom))
		.all();
	res.json(
		lignes.map((e) => ({
			id: e.id,
			reference: e.reference,
			nom: e.nom,
			forme_juridique: e.forme_juridique,
			etat: e.etat,
			logo: e.logo,
			logo_url: url(e.logo)
		}))
	);
});

/**
 * Pré-remplissage du formulaire de création depuis le profil d'une personne morale (F-S6-06).
 * Correctif : le legacy lisait le domaine dans `sexembr` et la forme dans `situatmatrimmbr`.
 */
routeur.get('/modele', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const vide = {
		nom: '',
		domaine_id: null,
		forme_juridique: null,
		telephone: '',
		email: '',
		adresse: '',
		ville_id: null,
		personne_morale: false
	};
	if (membre.categorie !== CategorieMembre.MORALE) {
		res.json(vide);
		return;
	}
	const formesConnues: number[] = Object.values(FormeJuridique);
	res.json({
		nom: membre.nom || '',
		domaine_id: membre.domaine_activite_id,
		forme_juridique:
			membre.forme_juridique !== null && formesConnues.includes(membre.forme_juridique)
				? membre.forme_juridique
				: null,
		telephone: membre.telephone || '',
		email: membre.email || '',
		adresse: membre.adresse || '',
		ville_id: membre.ville_id,
		personne_morale: true
	});
});

/** Nombre de lignes publiées par l'entreprise dans le comparateur de prix. */
function presenceComparateur(entrepriseId: number) {
	const lignes = db
		.select({ type: ligneProspective.offre_ou_demande, n: sql<number>`count(*)` })
		.from(ligneProspective)
		.innerJoin(ficheProspective, eq(ficheProspective.id, ligneProspective.fiche_id))
		.innerJoin(produitProspective, eq(produitProspective.id, ligneProspective.produit_id))
		.where(
			and(
				eq(ficheProspective.entreprise_id, entrepriseId),
				eq(ficheProspective.etat, Etat.AUTORISE),
				eq(ligneProspective.etat, Etat.AUTORISE),
				eq(produitProspective.etat, Etat.AUTORISE)
			)
		)
		.groupBy(ligneProspective.offre_ou_demande)
		.all();
	const par = new Map(lignes.map((l) => [l.type, l.n]));
	return { offres: par.get(1) ?? 0, demandes: par.get(2) ?? 0 };
}

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenir(Number(req.params.id), membre);
	// F-S6-13 : tiers seulement (corrigé).
	compterVisite(entreprise, fiche as never, membre, AUTEUR);

	const r = referentiels();
	const auteurFiche =
		fiche.membre_id !== null
			? auteur(db.select().from(tableMembre).where(eq(tableMembre.id, fiche.membre_id)).get())
			: null;

	res.json({
		...vueResume(fiche, r),
		domaine_id: fiche.domaine_id,
		ville_id: fiche.ville_id,
		capital_social: fiche.capital_social,
		gerant: fiche.gerant,
		// Coordonnées de l'entreprise : publiques, c'est le rôle d'un annuaire
		// (à ne pas confondre avec les données personnelles d'un membre).
		telephone: fiche.telephone,
		email: fiche.email,
		site_web: fiche.site_web,
		adresse: fiche.adresse,
		date_derniere_visite: fiche.date_derniere_visite,
		auteur: auteurFiche,
		comparateur: presenceComparateur(fiche.id),
		peut_modifier: peutModifier(membre, fiche.membre_id),
		peut_moderer: peutModerer(membre)
	});
});

function nettoyer(texte: string): string {
	return (texte ?? '').split(/\s+/).filter(Boolean).join(' ');
}

/** Règles legacy d'incl-entreprise.php, appliquées côté serveur (F-S6-07, F-S6-08). */
function validerEntreprise(d: EntrepriseEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};

	const domaine = d.domaine_id
		? db.select().from(domaineActivite).where(eq(domaineActivite.id, d.domaine_id)).get()
		: null;
	if (!domaine) champs.domaine_id = "Veuillez indiquer le domaine d'activité.";

	// Règle réelle du legacy : plus de 3 caractères (message « plus de 2 » corrigé).
	if (nettoyer(d.nom).length < 4) {
		champs.nom = "Le nom de l'entreprise doit avoir au moins 4 caractères.";
	}
	const formesConnues: number[] = Object.values(FormeJuridique);
	if (
		d.forme_juridique === null ||
		d.forme_juridique === undefined ||
		!formesConnues.includes(d.forme_juridique)
	) {
		champs.forme_juridique = "Veuillez indiquer la forme juridique de l'entreprise.";
	}
	const villeConnue = d.ville_id
		? db.select({ id: ville.id }).from(ville).where(eq(ville.id, d.ville_id)).get()
		: null;
	if (!villeConnue) champs.ville_id = "Veuillez indiquer la ville où est située l'entreprise.";

	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Unicité nom + domaine (le legacy testait secteur + nom, avec un secteur jamais saisi).
	const conditions = [
		sql`lower(${entreprise.nom}) = ${nettoyer(d.nom).toLowerCase()}`,
		d.domaine_id ? eq(entreprise.domaine_id, d.domaine_id) : isNull(entreprise.domaine_id),
		ne(entreprise.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(entreprise.id, exclureId));
	const doublon = db
		.select({ id: entreprise.id })
		.from(entreprise)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Cette entreprise est déjà enregistrée.', {
			nom: 'Une entreprise porte déjà ce nom dans ce domaine.'
		});
	}
}

function champsEntreprise(d: EntrepriseEntree) {
	const domaine = d.domaine_id
		? db.select().from(domaineActivite).where(eq(domaineActivite.id, d.domaine_id)).get()
		: null;
	return {
		domaine_id: d.domaine_id ?? null,
		// Secteur déduit du domaine (ADR-0007).
		secteur_id: domaine?.secteur_id ?? null,
		nom: nettoyer(d.nom),
		forme_juridique: d.forme_juridique ?? 0,
		capital_social: d.capital_social,
		description: d.description.trim(),
		gerant: nettoyer(d.gerant),
		telephone: d.telephone,
		email: d.email ?? '',
		site_web: d.site_web,
		adresse: nettoyer(d.adresse),
		ville_id: d.ville_id ?? null
	};
}

/**
 * Création par tout membre connecté, gestionnaire compris (F-S6-05) ; publiée immédiatement
 * comme dans le legacy (état Autorisé), la modération peut la retirer.
 */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(entrepriseEntreeSchema, req.body);
	validerEntreprise(donnees);

	const cree = db.transaction(() =>
		db
			.insert(entreprise)
			.values({
				membre_id: membre.id,
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.ENTREPRISE),
				...champsEntreprise(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.membre_id);
	const donnees = valider(entrepriseEntreeSchema, req.body);
	validerEntreprise(donnees, fiche.id);

	const misAJour = db
		.update(entreprise)
		.set(champsEntreprise(donnees))
		.where(eq(entreprise.id, fiche.id))
		.returning()
		.get();
	res.json(ok('Modification effectuée.', misAJour!.id, misAJour!.reference));
});

/** Logo ou photo de l'entreprise (F-S6-12 : type contrôlé, redimensionnement proportionnel). */
routeur.post('/:id/logo', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.membre_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { logo: 'Veuillez choisir une image.' });

	const ancien = fiche.logo;
	const chemin = await enregistrerFichier(req.file.buffer, 'entreprises', new Set([IMAGE]), 'logo');
	db.update(entreprise).set({ logo: chemin }).where(eq(entreprise.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Logo enregistré.', fiche.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(entreprise, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(entreprise, fiche as never, membre, AUTEUR);
	res.json(ok('Fiche supprimée.', fiche.id));
});
