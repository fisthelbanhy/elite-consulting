/**
 * Appels de fonds — financement participatif (portage de `app/routers/projets.py` ; legacy
 * incl-choix4A.php, incl-appelfond.php, incl-apportfond.php ; suivi des apports d'après la
 * spécification morte incl-paportfond.php). Inventaire : F-S4-05 à F-S4-26, ADR-0004 (totaux
 * calculés, annulation tardive), ADR-0007 S4a, ADR-0009 (avertissement : engagements entre
 * membres, sans garantie de La Frangine).
 */
import { and, asc, desc, eq, gte, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import {
	exigerDroit,
	exigerMembre,
	gestionnaireRequis,
	membreRequis,
	pagination,
	peutModifier,
	verifierModification
} from '../deps.js';
import { Etat, libelle, TypeApportFond } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { secteurActivite, ville as tableVille } from '../schema/core.js';
import { entreprise } from '../schema/entreprises.js';
import { appelFond, collecteFond, versementCollecte } from '../schema/fonds.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import {
	auteur,
	dateFacultative,
	entier,
	entierFacultatif,
	ok,
	valider,
	type Auteur
} from '../schemas/commun.js';
import {
	ANNULE,
	ajouterVersement,
	montantLisible,
	paiementsEnAttente,
	recalculerAppel,
	resteAVerser,
	type CollecteFond
} from '../services/fonds.js';
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
	PDF,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';
import { normaliserTelephone, telephoneValide } from '../services/validation.js';

export const routeur = Router();
export const prefixe = '/projets';

type AppelFond = typeof appelFond.$inferSelect;

const INTROUVABLE = "Ce projet n'existe pas ou n'est plus publié.";
/** Devis et besoin : « > 10 000 » (incl-appelfond.php). */
const MINIMUM = 10_001;

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const COLONNES_FICHE = { etat: appelFond.etat, auteur: appelFond.auteur_id };

const projetEntreeSchema = z.object({
	entreprise_id: entierFacultatif,
	secteur_id: entierFacultatif,
	ville_id: entierFacultatif,
	nom_projet: z.string().max(150).default(''),
	objet_projet: z.string().max(500).default(''),
	description_activite: z.string().max(10000).default(''),
	description_projet: z.string().max(10000).default(''),
	devis_projet: entier.min(0).default(0),
	apport_fond_propre: entier.min(0).default(0),
	besoin_financement: entier.min(0).default(0),
	niveau_realisation: entier.min(0).max(100).default(0),
	nom_promoteur: z.string().max(120).default(''),
	telephone_promoteur: z.string().max(30).default(''),
	email_promoteur: z
		.union([z.literal(''), z.null(), z.email()])
		.optional()
		.transform((v) => v || null),
	adresse_promoteur: z.string().max(500).default('')
});

type ProjetEntree = z.output<typeof projetEntreeSchema>;

const evaluationEntreeSchema = z.object({
	observation_gestionnaire: z.string().max(10000).default(''),
	appreciation: entier.min(0).max(10).default(0)
});

const apportEntreeSchema = z.object({
	type_apport: entierFacultatif,
	montant_promis: entier.min(0).default(0),
	echeance_mois: entier.min(0).max(12).default(0),
	remarque: z.string().max(2000).default('')
});

const versementEntreeSchema = z.object({
	montant: entier.min(0).default(0),
	date_versement: dateFacultative,
	observation_mediateur: z
		.union([z.null(), z.string().max(2000)])
		.optional()
		.transform((v) => v ?? null)
});

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

/** Promoteur, coordonnées et liste des apports : porteur du projet et gestionnaires. */
function voitPrive(membre: Membre | null, p: AppelFond): boolean {
	return !!membre && (membre.id === p.auteur_id || membre.type_compte === 1);
}

function contextesDe(projets: AppelFond[]) {
	const secteurs = new Map(
		db
			.select({ id: secteurActivite.id, libelle: secteurActivite.libelle })
			.from(secteurActivite)
			.all()
			.map((s) => [s.id, s])
	);
	const villes = new Map(
		db
			.select({ id: tableVille.id, nom: tableVille.nom })
			.from(tableVille)
			.all()
			.map((v) => [v.id, v])
	);
	return { secteurs, villes, projets };
}

function vueResume(p: AppelFond, membre: Membre | null, ctx: ReturnType<typeof contextesDe>) {
	return {
		id: p.id,
		reference: p.reference,
		nom_projet: p.nom_projet,
		objet_projet: p.objet_projet,
		secteur: p.secteur_id !== null ? (ctx.secteurs.get(p.secteur_id) ?? null) : null,
		ville: p.ville_id !== null ? (ctx.villes.get(p.ville_id) ?? null) : null,
		devis_projet: p.devis_projet,
		apport_fond_propre: p.apport_fond_propre,
		besoin_financement: p.besoin_financement,
		niveau_realisation: p.niveau_realisation,
		montant_promis: p.montant_promis,
		montant_collecte: p.montant_collecte,
		appreciation: p.appreciation,
		etat: p.etat,
		date_creation: p.date_creation,
		nombre_visites: p.nombre_visites,
		photo: p.photo,
		photo_url: url(p.photo),
		// Promoteur : auteur et gestionnaires seulement (F-S4-07).
		nom_promoteur: voitPrive(membre, p) ? p.nom_promoteur : null,
		est_auteur: !!membre && membre.id === p.auteur_id,
		reste_a_collecter: Math.max(0, p.besoin_financement - p.montant_collecte)
	};
}

interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

/** Identité et coordonnées d'un membre : réservées au porteur du projet et aux gestionnaires. */
function contact(id: number | null): ContactMembre | null {
	if (!id) return null;
	const m = db.select().from(tableMembre).where(eq(tableMembre.id, id)).get();
	if (!m) return null;
	return {
		id: m.id,
		pseudonyme: m.pseudonyme,
		nom: m.nom,
		telephone: m.telephone,
		email: m.email
	};
}

function projetCourt(id: number) {
	const p = db.select().from(appelFond).where(eq(appelFond.id, id)).get();
	if (!p) return null;
	return {
		id: p.id,
		reference: p.reference,
		nom_projet: p.nom_projet,
		besoin_financement: p.besoin_financement,
		montant_promis: p.montant_promis,
		montant_collecte: p.montant_collecte,
		etat: p.etat
	};
}

function vueApport(c: CollecteFond, montrerCreancier: boolean) {
	return {
		id: c.id,
		reference: c.reference,
		date_engagement: c.date_engagement,
		type_apport: c.type_apport,
		montant_promis: c.montant_promis,
		echeance_mois: c.echeance_mois,
		montant_verse: c.montant_verse,
		date_dernier_versement: c.date_dernier_versement,
		remarque: c.remarque,
		etat: c.etat,
		appel_fond: projetCourt(c.appel_fond_id),
		// Renseigné pour le porteur du projet et les gestionnaires.
		creancier: montrerCreancier ? contact(c.membre_id) : null,
		reste_a_verser: resteAVerser(c),
		// Versements déclarés (paiement type 8) non encore confirmés.
		en_attente: c.etat !== ANNULE ? paiementsEnAttente(c.id) : 0
	};
}

function engagementsDe(appelFondId: number): CollecteFond[] {
	return db
		.select()
		.from(collecteFond)
		.where(eq(collecteFond.appel_fond_id, appelFondId))
		.orderBy(desc(collecteFond.date_engagement), desc(collecteFond.id))
		.all();
}

// --- Liste et compteurs --------------------------------------------------------------------------

/**
 * Liste publique (F-S4-05/06) : le public voit les projets publiés, le porteur aussi les siens, le
 * gestionnaire tout (filtre d'état).
 */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};
	if (membre && membre.type_compte === 1) {
		const etat = nombre('etat');
		conditions.push(etat ? eq(appelFond.etat, etat) : ne(appelFond.etat, Etat.SUPPRIME));
	}
	if (
		membre &&
		req.query.miens !== undefined &&
		req.query.miens !== 'false' &&
		req.query.miens !== '0'
	) {
		conditions.push(eq(appelFond.auteur_id, membre.id));
	}
	const secteurId = nombre('secteur_id');
	if (secteurId) conditions.push(eq(appelFond.secteur_id, secteurId));
	const devisMin = nombre('devis_min');
	if (devisMin) conditions.push(gte(appelFond.devis_projet, devisMin));
	const besoinMin = nombre('besoin_min');
	if (besoinMin) conditions.push(gte(appelFond.besoin_financement, besoinMin));
	const realisationMin = nombre('realisation_min');
	if (realisationMin && realisationMin <= 100) {
		conditions.push(gte(appelFond.niveau_realisation, realisationMin));
	}
	// Correctif : le OU de la recherche est parenthésé (legacy : conditions cassées).
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			appelFond.nom_projet,
			appelFond.objet_projet,
			appelFond.description_projet,
			appelFond.reference
		)
	);

	const requete = db
		.select()
		.from(appelFond)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(appelFond.date_creation), desc(appelFond.id))
		.$dynamic();

	const liste = paginer<AppelFond>(requete, page);
	const ctx = contextesDe(liste.items);
	res.json({
		items: liste.items.map((p) => vueResume(p, membre, ctx)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/compteurs', (_req, res) => {
	const ligne = db
		.select({
			projets: sql<number>`count(${appelFond.id})`,
			besoin: sql<number>`coalesce(sum(${appelFond.besoin_financement}), 0)`,
			promis: sql<number>`coalesce(sum(${appelFond.montant_promis}), 0)`,
			collecte: sql<number>`coalesce(sum(${appelFond.montant_collecte}), 0)`
		})
		.from(appelFond)
		.where(eq(appelFond.etat, Etat.AUTORISE))
		.get();
	res.json({
		projets: ligne?.projets ?? 0,
		besoin_total: ligne?.besoin ?? 0,
		montant_promis: ligne?.promis ?? 0,
		montant_collecte: ligne?.collecte ?? 0
	});
});

/** Entreprises proposées dans le formulaire (facultatif) : celles du membre connecté. */
routeur.get('/mes-entreprises', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const liste = db
		.select({ id: entreprise.id, nom: entreprise.nom })
		.from(entreprise)
		.where(and(eq(entreprise.membre_id, membre.id), ne(entreprise.etat, Etat.SUPPRIME)))
		.orderBy(asc(entreprise.nom))
		.all();
	res.json(liste);
});

// --- Engagements d'apport (collecte_fond) --------------------------------------------------------

/**
 * « Mes apports » pour un membre ; tous les apports (filtres membre, projet, état, texte) pour un
 * gestionnaire (F-S4-25, spécification incl-paportfond.php).
 */
routeur.get('/apports', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};
	if (membre.type_compte === 1) {
		const membreId = nombre('membre_id');
		if (membreId) conditions.push(eq(collecteFond.membre_id, membreId));
	} else {
		conditions.push(eq(collecteFond.membre_id, membre.id));
	}
	const appelId = nombre('appel_fond_id');
	if (appelId) conditions.push(eq(collecteFond.appel_fond_id, appelId));
	const etat = nombre('etat');
	if (etat) conditions.push(eq(collecteFond.etat, etat));
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			collecteFond.remarque,
			collecteFond.reference
		)
	);
	const filtre = and(...conditions.filter(Boolean));

	// Totaux de la liste, avec la même règle que les agrégats d'un projet (ADR-0004).
	const sommes = db
		.select({
			promis: sql<number>`coalesce(sum(case when ${collecteFond.etat} = ${ANNULE} then ${collecteFond.montant_verse} else ${collecteFond.montant_promis} end), 0)`,
			verse: sql<number>`coalesce(sum(${collecteFond.montant_verse}), 0)`
		})
		.from(collecteFond)
		.where(filtre)
		.get();

	const requete = db
		.select()
		.from(collecteFond)
		.where(filtre)
		.orderBy(desc(collecteFond.date_engagement), desc(collecteFond.id))
		.$dynamic();
	const liste = paginer<CollecteFond>(requete, page);

	res.json({
		items: liste.items.map((c) => vueApport(c, membre.type_compte === 1)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille,
		total_promis: sommes?.promis ?? 0,
		total_verse: sommes?.verse ?? 0
	});
});

function obtenirCollecte(id: number): CollecteFond {
	const c = db.select().from(collecteFond).where(eq(collecteFond.id, id)).get();
	if (!c) throw introuvable('Cet apport est introuvable.');
	return c;
}

function projetDe(c: CollecteFond): AppelFond {
	return db.select().from(appelFond).where(eq(appelFond.id, c.appel_fond_id)).get()!;
}

/** Fiche d'un apport : créancier, porteur du projet et gestionnaires. */
routeur.get('/apports/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirCollecte(Number(req.params.id));
	const p = projetDe(c);
	const porteur = p.auteur_id === membre.id;
	const creancier = c.membre_id === membre.id;
	if (!creancier && !porteur && membre.type_compte !== 1) {
		throw interdit('Cet apport ne vous concerne pas.');
	}
	const versements = db
		.select()
		.from(versementCollecte)
		.where(eq(versementCollecte.collecte_id, c.id))
		.orderBy(asc(versementCollecte.id))
		.all();

	res.json({
		...vueApport(c, porteur || membre.type_compte === 1),
		observation_mediateur: c.observation_mediateur,
		versements: versements.map((v) => ({
			id: v.id,
			date_versement: v.date_versement,
			montant: v.montant,
			etat: v.etat
		})),
		est_creancier: creancier,
		peut_gerer: peutModerer(membre),
		peut_declarer: creancier && c.etat !== ANNULE && resteAVerser(c, true) > 0
	});
});

/**
 * Accusé de validation par la frangine (1 → 2). La promesse est déjà comptée dans « promis » depuis
 * sa création (ADR-0007 S4a) : aucun double comptage.
 */
routeur.post('/apports/:id/valider', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const c = obtenirCollecte(Number(req.params.id));
	if (c.etat !== Etat.NON_TRAITE) throw erreur('Seule une promesse en attente peut être validée.');
	db.transaction(() => {
		db.update(collecteFond).set({ etat: Etat.AUTORISE }).where(eq(collecteFond.id, c.id)).run();
		recalculerAppel(c.appel_fond_id);
	});
	res.json(ok("Promesse d'apport validée.", c.id, c.reference));
});

/** Annulation (→ 3) : seule la part non versée est retirée du « promis » (ADR-0004). */
routeur.post('/apports/:id/annuler', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const c = obtenirCollecte(Number(req.params.id));
	if (c.etat === ANNULE) throw erreur('Cet apport est déjà annulé.');
	const p = projetDe(c);

	db.transaction(() => {
		db.update(collecteFond).set({ etat: ANNULE }).where(eq(collecteFond.id, c.id)).run();
		recalculerAppel(c.appel_fond_id);
		if (c.membre_id) {
			db.insert(tableMessage)
				.values({
					membre_id: c.membre_id,
					de_la_frangine: true,
					texte:
						`Votre promesse d'apport ${c.reference} au projet « ${p.nom_projet} » a été annulée ` +
						`par la frangine. Les versements déjà reçus (${montantLisible(c.montant_verse)} FCFA) ` +
						'restent comptés.'
				})
				.run();
		}
	});
	res.json(ok('Apport annulé : la part non versée a été retirée du montant promis.', c.id));
});

/** Saisie d'un versement reçu par la frangine (gestionnaire, droit Activation). */
routeur.post('/apports/:id/versements', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const c = obtenirCollecte(Number(req.params.id));
	if (c.etat === ANNULE) {
		throw erreur('Cet apport est annulé : aucun versement ne peut y être ajouté.');
	}
	const donnees = valider(versementEntreeSchema, req.body);
	if (donnees.montant <= 0) {
		throw erreur('Veuillez corriger les champs signalés.', {
			montant: 'Veuillez indiquer le montant du versement.'
		});
	}
	const reste = resteAVerser(c);
	if (donnees.montant > reste) {
		throw erreur('Le versement est supérieur au montant promis.', {
			montant: `Reste à verser : ${montantLisible(reste)} FCFA.`
		});
	}
	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);
	const jour = donnees.date_versement ?? aujourdhui;
	if (jour.getTime() > aujourdhui.getTime()) {
		throw erreur('Veuillez corriger les champs signalés.', {
			date_versement: 'La date du versement ne peut être future.'
		});
	}
	const doublon = db
		.select({ id: versementCollecte.id })
		.from(versementCollecte)
		.where(
			and(
				eq(versementCollecte.collecte_id, c.id),
				eq(versementCollecte.date_versement, jour),
				eq(versementCollecte.montant, donnees.montant),
				eq(versementCollecte.etat, Etat.AUTORISE)
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce versement est déjà enregistré.');

	const p = projetDe(c);
	const v = db.transaction(() => {
		if (donnees.observation_mediateur !== null) {
			db.update(collecteFond)
				.set({ observation_mediateur: donnees.observation_mediateur.trim() })
				.where(eq(collecteFond.id, c.id))
				.run();
		}
		ajouterVersement(c, donnees.montant, jour);
		const dernier = db
			.select({ id: versementCollecte.id })
			.from(versementCollecte)
			.where(eq(versementCollecte.collecte_id, c.id))
			.orderBy(desc(versementCollecte.id))
			.limit(1)
			.get()!;
		if (c.membre_id) {
			db.insert(tableMessage)
				.values({
					membre_id: c.membre_id,
					de_la_frangine: true,
					texte:
						`Nous avons bien reçu votre versement de ${montantLisible(donnees.montant)} FCFA ` +
						`pour l'apport ${c.reference} (projet « ${p.nom_projet} »). Merci ! ` +
						`Reste à verser : ${montantLisible(resteAVerser(obtenirCollecte(c.id)))} FCFA.`
				})
				.run();
		}
		return dernier;
	});

	res.status(201).json(ok('Versement enregistré.', v.id, c.reference));
});

// --- Fiche projet --------------------------------------------------------------------------------

function obtenirProjet(id: number, membre: Membre | null): AppelFond {
	const p = db.select().from(appelFond).where(eq(appelFond.id, id)).get();
	return exigerVisible(p as never, membre, { message: INTROUVABLE }) as unknown as AppelFond;
}

function vueDetail(p: AppelFond, membre: Membre | null) {
	const prive = voitPrive(membre, p);
	const estAuteur = !!membre && membre.id === p.auteur_id;
	const engagements = engagementsDe(p.id);
	const ent = p.entreprise_id
		? db
				.select({ id: entreprise.id, nom: entreprise.nom })
				.from(entreprise)
				.where(eq(entreprise.id, p.entreprise_id))
				.get()
		: undefined;
	const redacteur = p.auteur_id
		? db.select().from(tableMembre).where(eq(tableMembre.id, p.auteur_id)).get()
		: undefined;

	const detail: Record<string, unknown> = {
		...vueResume(p, membre, contextesDe([p])),
		secteur_id: p.secteur_id,
		ville_id: p.ville_id,
		entreprise_id: p.entreprise_id,
		entreprise: ent ?? null,
		auteur: auteur(redacteur) as Auteur | null,
		description_activite: p.description_activite,
		description_projet: p.description_projet,
		observation_gestionnaire: p.observation_gestionnaire,
		presentation_pdf: p.presentation_pdf,
		presentation_url: url(p.presentation_pdf),
		date_derniere_visite: p.date_derniere_visite,
		// Bloc promoteur : auteur et gestionnaires seulement (F-S4-17).
		telephone_promoteur: prive ? p.telephone_promoteur : null,
		email_promoteur: prive ? p.email_promoteur : null,
		adresse_promoteur: prive ? p.adresse_promoteur : null,
		peut_modifier: peutModifier(membre, p.auteur_id),
		peut_moderer: !!membre && peutModerer(membre),
		peut_evaluer: !!membre && membre.type_compte === 1,
		peut_apporter: !!membre && !estAuteur && p.etat === Etat.AUTORISE,
		nombre_apports: engagements.filter((c) => c.etat !== ANNULE).length,
		mes_apports: membre
			? engagements.filter((c) => c.membre_id === membre.id).map((c) => vueApport(c, false))
			: [],
		apports: prive ? engagements.map((c) => vueApport(c, true)) : null
	};
	return detail;
}

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const p = obtenirProjet(Number(req.params.id), membre);
	// F-S4-20 : incrémenté à chaque consultation d'un tiers.
	compterVisite(appelFond, p as never, membre);
	res.json(vueDetail(p, membre));
});

/** Apports reçus par un projet : porteur et gestionnaires. */
routeur.get('/:id/apports', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	if (!voitPrive(membre, p)) {
		throw interdit('La liste des apports est réservée au porteur du projet et à la frangine.');
	}
	const engagements = db
		.select()
		.from(collecteFond)
		.where(eq(collecteFond.appel_fond_id, p.id))
		.orderBy(desc(collecteFond.id))
		.all();
	res.json(engagements.map((c) => vueApport(c, true)));
});

// --- Création / modification ---------------------------------------------------------------------

/**
 * Règles legacy d'incl-appelfond.php, **toutes bloquantes** (correctif F-S4-11 : le contrôle du
 * téléphone n'efface plus les autres erreurs). Retourne le téléphone normalisé.
 */
function validerProjet(d: ProjetEntree, auteurId: number, exclureId?: number): string {
	const champs: Record<string, string> = {};
	const nom = d.nom_projet.trim();
	if (nom.length < 11) champs.nom_projet = 'Le nom du projet doit avoir plus de 10 caractères.';
	if (d.objet_projet.trim().length < 11) {
		champs.objet_projet = "Veuillez indiquer l'objet du projet avec 11 caractères minimum.";
	}
	const secteur = d.secteur_id
		? db.select().from(secteurActivite).where(eq(secteurActivite.id, d.secteur_id)).get()
		: undefined;
	if (!d.secteur_id || !secteur) {
		champs.secteur_id = "Veuillez indiquer le secteur d'activité du projet.";
	}
	if (d.description_activite.trim().length < 31) {
		champs.description_activite = "Veuillez décrire l'activité avec plus de 30 caractères.";
	}
	if (d.description_projet.trim().length < 31) {
		champs.description_projet = 'Veuillez décrire le projet avec plus de 30 caractères.';
	}
	if (d.devis_projet < MINIMUM) {
		champs.devis_projet = 'Veuillez mentionner le montant du projet (plus de 10 000 FCFA).';
	}
	if (d.besoin_financement < MINIMUM) {
		champs.besoin_financement = 'Veuillez mentionner le montant du besoin (plus de 10 000 FCFA).';
	}
	if (!('devis_projet' in champs) && !('besoin_financement' in champs)) {
		if (d.devis_projet < d.apport_fond_propre || d.devis_projet < d.besoin_financement) {
			champs.devis_projet =
				"Le montant du projet ne peut être inférieur à l'apport ou au besoin de fonds.";
		} else if (d.besoin_financement > d.devis_projet - d.apport_fond_propre) {
			champs.besoin_financement =
				'Le montant du besoin de fonds ne peut être supérieur à la différence entre le montant ' +
				"du projet et l'apport de fonds.";
		}
	}
	if (d.nom_promoteur.trim().length < 6) {
		champs.nom_promoteur = 'Le nom du promoteur du projet doit avoir plus de 5 caractères.';
	}
	const tel = normaliserTelephone(d.telephone_promoteur);
	if (!telephoneValide(tel)) {
		champs.telephone_promoteur = 'Veuillez vérifier le numéro de téléphone du promoteur du projet.';
	}
	const v = d.ville_id
		? db.select().from(tableVille).where(eq(tableVille.id, d.ville_id)).get()
		: undefined;
	if (!d.ville_id || !v) champs.ville_id = 'Veuillez indiquer la ville du projet.';
	if (d.entreprise_id) {
		const e = db.select().from(entreprise).where(eq(entreprise.id, d.entreprise_id)).get();
		if (!e || e.etat === Etat.SUPPRIME || e.membre_id !== auteurId) {
			champs.entreprise_id = 'Choisissez une entreprise enregistrée à votre nom.';
		}
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [
		sql`lower(${appelFond.nom_projet}) = ${nom.toLowerCase()}`,
		ne(appelFond.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(appelFond.id, exclureId));
	const doublon = db
		.select({ id: appelFond.id })
		.from(appelFond)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Ce projet est déjà enregistré.', { nom_projet: 'Un projet porte déjà ce nom.' });
	}
	return tel;
}

function champsProjet(d: ProjetEntree, tel: string) {
	return {
		entreprise_id: d.entreprise_id || null,
		secteur_id: d.secteur_id,
		ville_id: d.ville_id,
		nom_projet: d.nom_projet.trim(),
		objet_projet: d.objet_projet.trim(),
		description_activite: d.description_activite.trim(),
		description_projet: d.description_projet.trim(),
		devis_projet: d.devis_projet,
		apport_fond_propre: d.apport_fond_propre,
		besoin_financement: d.besoin_financement,
		niveau_realisation: d.niveau_realisation,
		nom_promoteur: d.nom_promoteur.trim(),
		telephone_promoteur: tel,
		// Correctif : e-mail et adresse dans les bons champs (legacy : inversés à la création).
		email_promoteur: d.email_promoteur ?? '',
		adresse_promoteur: d.adresse_promoteur.trim()
	};
}

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(projetEntreeSchema, req.body);
	const tel = validerProjet(donnees, membre.id);
	// Publié d'emblée (legacy).
	const p = db
		.insert(appelFond)
		.values({
			auteur_id: membre.id,
			etat: Etat.AUTORISE,
			montant_promis: 0,
			montant_collecte: 0,
			reference: nouvelleReference(Prefixe.APPEL_FOND),
			...champsProjet(donnees, tel)
		})
		.returning()
		.get()!;
	res.status(201).json(ok('Enregistrement effectué.', p.id, p.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	verifierModification(membre, p.auteur_id);
	const donnees = valider(projetEntreeSchema, req.body);
	const tel = validerProjet(donnees, p.auteur_id ?? membre.id, p.id);
	db.update(appelFond).set(champsProjet(donnees, tel)).where(eq(appelFond.id, p.id)).run();
	res.json(ok('Modification effectuée.', p.id, p.reference));
});

/**
 * Observations et appréciation /10 de la frangine (F-S4-19) : visibles de tous, en lecture seule.
 */
routeur.post('/:id/evaluation', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	const donnees = valider(evaluationEntreeSchema, req.body);
	db.update(appelFond)
		.set({
			observation_gestionnaire: donnees.observation_gestionnaire.trim(),
			appreciation: donnees.appreciation
		})
		.where(eq(appelFond.id, p.id))
		.run();
	res.json(ok('Modification effectuée.', p.id));
});

/** Dossier de présentation en PDF (F-S4-16). */
routeur.post(
	'/:id/presentation',
	membreRequis,
	televersement.single('fichier'),
	async (req, res) => {
		const membre = exigerMembre(req);
		const p = obtenirProjet(Number(req.params.id), membre);
		verifierModification(membre, p.auteur_id);
		if (!req.file) {
			throw erreur('Aucun fichier reçu.', { presentation: 'Veuillez choisir un fichier PDF.' });
		}
		const ancien = p.presentation_pdf;
		const chemin = await enregistrerFichier(
			req.file.buffer,
			'financement',
			new Set([PDF]),
			'presentation'
		);
		db.update(appelFond).set({ presentation_pdf: chemin }).where(eq(appelFond.id, p.id)).run();
		supprimerFichier(ancien);
		res.json(ok('Dossier de présentation enregistré.', p.id));
	}
);

routeur.post('/:id/photo', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	verifierModification(membre, p.auteur_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });
	const ancien = p.photo;
	const chemin = await enregistrerFichier(
		req.file.buffer,
		'financement',
		new Set([IMAGE]),
		'photo'
	);
	db.update(appelFond).set({ photo: chemin }).where(eq(appelFond.id, p.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', p.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(appelFond, p.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', p.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	supprimer(appelFond, p as never, membre);
	res.json(ok('Projet supprimé.', p.id));
});

// --- Promesse d'apport (« Intéressement ») -------------------------------------------------------

/** Promesse d'apport (F-S4-21 à F-S4-24) : comptée immédiatement dans « promis » (ADR-0007 S4a). */
routeur.post('/:id/apports', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const p = obtenirProjet(Number(req.params.id), membre);
	if (p.auteur_id === membre.id) {
		throw erreur('Vous ne pouvez pas promettre un apport à votre propre projet.');
	}
	if (p.etat !== Etat.AUTORISE) {
		throw erreur("Ce projet n'est pas ouvert aux apports pour le moment.");
	}
	const donnees = valider(apportEntreeSchema, req.body);

	const champs: Record<string, string> = {};
	const typesConnus: number[] = Object.values(TypeApportFond);
	if (!donnees.type_apport || !typesConnus.includes(donnees.type_apport)) {
		champs.type_apport = "Veuillez indiquer le type de l'apport de fonds.";
	}
	if (donnees.montant_promis <= 0) {
		champs.montant_promis = "Veuillez indiquer le montant de l'apport.";
	} else if (donnees.montant_promis > p.besoin_financement) {
		champs.montant_promis = "Le montant de l'apport ne peut être supérieur au besoin de fonds.";
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);
	const doublon = db
		.select({ id: collecteFond.id })
		.from(collecteFond)
		.where(
			and(
				eq(collecteFond.appel_fond_id, p.id),
				eq(collecteFond.membre_id, membre.id),
				eq(collecteFond.date_engagement, aujourdhui),
				eq(collecteFond.montant_promis, donnees.montant_promis),
				ne(collecteFond.etat, ANNULE)
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette fiche est déjà enregistrée.');

	const c = db.transaction(() => {
		const cree = db
			.insert(collecteFond)
			.values({
				reference: nouvelleReference(Prefixe.APPORT_FOND),
				appel_fond_id: p.id,
				membre_id: membre.id,
				date_engagement: aujourdhui,
				type_apport: donnees.type_apport!,
				montant_promis: donnees.montant_promis,
				echeance_mois: donnees.echeance_mois,
				remarque: donnees.remarque.trim(),
				etat: Etat.NON_TRAITE,
				montant_verse: 0
			})
			.returning()
			.get()!;
		recalculerAppel(p.id);
		if (p.auteur_id) {
			db.insert(tableMessage)
				.values({
					membre_id: p.auteur_id,
					de_la_frangine: true,
					texte:
						`Bonne nouvelle : ${membre.pseudonyme || 'un membre'} promet un apport de ` +
						`${montantLisible(cree.montant_promis)} FCFA ` +
						`(${libelle('TypeApportFond', cree.type_apport)}) à votre projet ` +
						`« ${p.nom_projet} » (référence ${cree.reference}). ` +
						'Retrouvez-le dans la fiche de votre projet.'
				})
				.run();
		}
		return cree;
	});

	res
		.status(201)
		.json(
			ok("Votre promesse d'apport est enregistrée. Merci pour votre soutien !", c.id, c.reference)
		);
});
