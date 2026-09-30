/**
 * Likelemba — tontines rotatives (portage de `app/routers/likelemba.py` ; legacy
 * incl-choix4B.php, incl-likelemba.php, incl-membrelikelemba.php, incl-payelikelemba.php).
 * Inventaire : F-S4-27 à F-S4-44, ADR-0007 S4b (cotisation rattachée à l'adhésion choisie, reçu
 * unique `{code}P{n}`).
 *
 * La cotisation passe par le paiement générique (type 5, `services/fonds.ts`) : le frontend envoie
 * le membre vers `/paiement/5?objet=<id de l'adhésion>`.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db, JourSeul } from '../db.js';
import { exigerMembre, membreRequis, pagination, verifierModification } from '../deps.js';
import { Etat, libelle, Periodicite } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import {
	cotisationLikelemba,
	groupeLikelemba,
	membreLikelemba,
	type TemoinLikelemba
} from '../schema/fonds.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import {
	auteur,
	booleen,
	dateFacultative,
	entier,
	entierFacultatif,
	ok,
	valider,
	type Auteur
} from '../schemas/commun.js';
import {
	changerEtat,
	exigerVisible,
	paginer,
	recherche,
	supprimer,
	visibilite
} from '../services/fiches.js';
import { montantLisible } from '../services/fonds.js';
import {
	codeAdhesionLikelemba,
	nouvelleReference,
	numeroRecuLikelemba,
	Prefixe
} from '../services/references.js';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '../services/validation.js';

export const routeur = Router();
export const prefixe = '/likelemba';

type Groupe = typeof groupeLikelemba.$inferSelect;
type Adhesion = typeof membreLikelemba.$inferSelect;
type Cotisation = typeof cotisationLikelemba.$inferSelect;

const INTROUVABLE = "Ce likelemba n'existe pas ou n'est plus actif.";
const COLONNES_FICHE = { etat: groupeLikelemba.etat, auteur: groupeLikelemba.responsable_id };

/**
 * Codes legacy des cases « Membre Frangine ? » (incl-membrelikelemba.php) : case cochée = 2
 * (membre de La Frangine), sinon 1. Les données reprises gardent ce codage ; l'API expose un
 * booléen.
 */
const CODE_MEMBRE = 2;
const CODE_NON_MEMBRE = 1;

/** Convertit le code legacy (1/2) en booléen. */
function depuisCodeMembre(v: number | null | undefined): boolean {
	return v === CODE_MEMBRE;
}

const temoinSchema = z.object({
	nom: z.string().max(120).default(''),
	telephone: z.string().max(30).default(''),
	emploi: z.string().max(120).default(''),
	// Accepte aussi le code legacy 1/2 envoyé par un vieux formulaire.
	est_membre: z
		.union([z.literal(1), z.literal(2), booleen])
		.optional()
		.transform((v) => (v === 1 ? false : v === 2 ? true : !!v))
});

const adhesionEntreeSchema = z.object({
	// Vide = le membre connecté s'inscrit lui-même.
	membre_id: entierFacultatif,
	date_entree: dateFacultative,
	observation: z.string().max(5000).default(''),
	caution_nom: z.string().max(120).default(''),
	caution_est_membre: booleen,
	caution_piece_identite: z.string().max(50).default(''),
	caution_adresse: z.string().max(500).default(''),
	caution_activite: z.string().max(500).default(''),
	caution_telephone: z.string().max(30).default(''),
	temoins: z.array(temoinSchema).max(3).default([])
});

type AdhesionEntree = z.output<typeof adhesionEntreeSchema>;

const groupeEntreeSchema = z.object({
	responsable_id: entierFacultatif,
	montant_cotisation: entier.min(0).default(0),
	periodicite: entierFacultatif,
	date_debut: dateFacultative,
	observation: z.string().max(5000).default('')
});

type GroupeEntree = z.output<typeof groupeEntreeSchema>;

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

/** Rang d'entrée : préfixe numérique du code d'adhérent `{n}{code groupe}`. */
function ordre(code: string | null): number | null {
	const m = /^(\d+)/.exec(code ?? '');
	return m ? Number(m[1]) : null;
}

/**
 * Décale une date de `n` périodes (semaine, quinzaine, mois — jour du mois conservé au mieux).
 * Le résultat est une date **sans heure** : le calendrier sort en `2026-01-15`.
 */
function decaler(debut: Date, periodicite: number, n: number): JourSeul {
	if (periodicite === Periodicite.SEMAINE) {
		return new JourSeul(debut.getTime() + 7 * n * 86_400_000);
	}
	if (periodicite === Periodicite.QUINZAINE) {
		return new JourSeul(debut.getTime() + 14 * n * 86_400_000);
	}
	const total = debut.getMonth() + n;
	const annee = debut.getFullYear() + Math.floor(total / 12);
	const mois = ((total % 12) + 12) % 12;
	const dernierJour = new Date(annee, mois + 1, 0).getDate();
	return new JourSeul(annee, mois, Math.min(debut.getDate(), dernierJour));
}

/** Responsable du groupe, ou gestionnaire avec droit Activation. */
function peutGerer(membre: Membre | null, g: Groupe): boolean {
	return !!membre && (membre.id === g.responsable_id || peutModerer(membre));
}

/** Un reçu legacy tronqué (« LKB…P », varchar(10)) ou vide doit être (ré)activé. */
function recuValide(c: Cotisation, g: Groupe): boolean {
	const motif = new RegExp(`^${g.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}P\\d+$`);
	return motif.test(c.numero_recu);
}

function obtenirGroupe(id: number, membre: Membre | null): Groupe {
	const g = db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, id)).get();
	return exigerVisible(g as never, membre, {
		colonneAuteur: 'responsable_id',
		message: INTROUVABLE
	}) as unknown as Groupe;
}

function lireMembre(id: number | null): Membre | undefined {
	if (!id) return undefined;
	return db.select().from(tableMembre).where(eq(tableMembre.id, id)).get();
}

function vueCotisation(c: Cotisation, g: Groupe, membre: Membre | null) {
	const a = c.adhesion_id
		? db.select().from(membreLikelemba).where(eq(membreLikelemba.id, c.adhesion_id)).get()
		: undefined;
	const adherent = a ? lireMembre(a.membre_id) : undefined;
	const caissier = lireMembre(c.caissier_id);
	const gerer = peutGerer(membre, g);
	const concerne = !!membre && !!a && a.membre_id === membre.id;
	const valide = recuValide(c, g);
	return {
		id: c.id,
		numero_recu: c.numero_recu,
		date_paiement: c.date_paiement,
		montant: c.montant,
		mode_paiement: c.mode_paiement,
		etat: c.etat,
		adhesion_id: c.adhesion_id,
		adherent: adherent ? adherent.pseudonyme : '—',
		code_adherent: a ? a.code : '',
		nom_caissier: caissier ? caissier.pseudonyme : '',
		// La remarque de paiement peut contenir un numéro de transaction.
		observation: gerer || concerne || (membre && membre.type_compte === 1) ? c.observation : null,
		recu_valide: valide,
		peut_valider: gerer && c.etat !== Etat.SUPPRIME && (!valide || c.etat === Etat.NON_TRAITE)
	};
}

function cotisationsDe(g: Groupe, adhesionId?: number): Cotisation[] {
	const conditions = [eq(cotisationLikelemba.groupe_id, g.id)];
	if (adhesionId) conditions.push(eq(cotisationLikelemba.adhesion_id, adhesionId));
	return db
		.select()
		.from(cotisationLikelemba)
		.where(and(...conditions))
		.orderBy(desc(cotisationLikelemba.date_paiement), desc(cotisationLikelemba.id))
		.all();
}

function totalCotisations(cotisations: Cotisation[]): number {
	return cotisations.filter((c) => c.etat !== Etat.SUPPRIME).reduce((n, c) => n + c.montant, 0);
}

// --- Liste ---------------------------------------------------------------------------------------

/**
 * Groupes publiés (le responsable voit aussi les siens, le gestionnaire tout), filtre montant
 * min/max — une seule borne suffit (correctif F-S4-27) —, tri par date de début.
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
		conditions.push(
			etat ? eq(groupeLikelemba.etat, etat) : ne(groupeLikelemba.etat, Etat.SUPPRIME)
		);
	}
	if (
		membre &&
		req.query.miens !== undefined &&
		req.query.miens !== 'false' &&
		req.query.miens !== '0'
	) {
		const adherent = db
			.select({ id: membreLikelemba.groupe_id })
			.from(membreLikelemba)
			.where(and(eq(membreLikelemba.membre_id, membre.id), ne(membreLikelemba.etat, Etat.SUPPRIME)))
			.all()
			.map((a) => a.id);
		conditions.push(
			adherent.length
				? or(eq(groupeLikelemba.responsable_id, membre.id), inArray(groupeLikelemba.id, adherent))
				: eq(groupeLikelemba.responsable_id, membre.id)
		);
	}
	const montantMin = nombre('montant_min');
	if (montantMin) conditions.push(gte(groupeLikelemba.montant_cotisation, montantMin));
	const montantMax = nombre('montant_max');
	if (montantMax) conditions.push(lte(groupeLikelemba.montant_cotisation, montantMax));
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			groupeLikelemba.code,
			groupeLikelemba.observation
		)
	);

	const requete = db
		.select()
		.from(groupeLikelemba)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(
			asc(sql`${groupeLikelemba.date_debut} is null`),
			asc(groupeLikelemba.date_debut),
			asc(groupeLikelemba.id)
		)
		.$dynamic();

	const liste = paginer<Groupe>(requete, page);
	const ids = liste.items.map((g) => g.id);
	const comptes = new Map(
		ids.length
			? db
					.select({ groupe_id: membreLikelemba.groupe_id, n: sql<number>`count(*)` })
					.from(membreLikelemba)
					.where(
						and(inArray(membreLikelemba.groupe_id, ids), eq(membreLikelemba.etat, Etat.AUTORISE))
					)
					.groupBy(membreLikelemba.groupe_id)
					.all()
					.map((l) => [l.groupe_id, l.n])
			: []
	);
	const mesAdhesions = new Map(
		ids.length && membre
			? db
					.select({ groupe_id: membreLikelemba.groupe_id, id: membreLikelemba.id })
					.from(membreLikelemba)
					.where(
						and(
							inArray(membreLikelemba.groupe_id, ids),
							eq(membreLikelemba.membre_id, membre.id),
							ne(membreLikelemba.etat, Etat.SUPPRIME)
						)
					)
					.all()
					.map((l) => [l.groupe_id, l.id])
			: []
	);

	res.json({
		items: liste.items.map((g) => vueGroupeResume(g, membre, comptes, mesAdhesions)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

function vueGroupeResume(
	g: Groupe,
	membre: Membre | null,
	comptes: Map<number, number>,
	mesAdhesions: Map<number, number>
) {
	const responsable = lireMembre(g.responsable_id);
	return {
		id: g.id,
		code: g.code,
		responsable: (auteur(responsable) ?? null) as Auteur | null,
		montant_cotisation: g.montant_cotisation,
		periodicite: g.periodicite,
		date_debut: g.date_debut,
		observation: g.observation,
		compteur_entrees: g.compteur_entrees,
		etat: g.etat,
		nombre_adherents: comptes.get(g.id) ?? 0,
		est_responsable: !!membre && membre.id === g.responsable_id,
		mon_adhesion_id: mesAdhesions.get(g.id) ?? null
	};
}

routeur.get('/compteurs', (_req, res) => {
	const groupes =
		db
			.select({ n: sql<number>`count(*)` })
			.from(groupeLikelemba)
			.where(eq(groupeLikelemba.etat, Etat.AUTORISE))
			.get()?.n ?? 0;
	const adherents =
		db
			.select({ n: sql<number>`count(${membreLikelemba.id})` })
			.from(membreLikelemba)
			.innerJoin(groupeLikelemba, eq(membreLikelemba.groupe_id, groupeLikelemba.id))
			.where(and(eq(groupeLikelemba.etat, Etat.AUTORISE), eq(membreLikelemba.etat, Etat.AUTORISE)))
			.get()?.n ?? 0;
	res.json({ groupes, adherents });
});

/**
 * Membres proposés pour choisir un responsable ou inscrire un adhérent : gestionnaires et
 * responsables de groupe seulement.
 */
routeur.get('/membres', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const responsable = db
		.select({ id: groupeLikelemba.id })
		.from(groupeLikelemba)
		.where(eq(groupeLikelemba.responsable_id, membre.id))
		.limit(1)
		.get();
	if (membre.type_compte !== 1 && !responsable) {
		throw interdit('Liste réservée aux gestionnaires et aux responsables de likelemba.');
	}
	const conditions: (SQL | undefined)[] = [ne(tableMembre.etat, Etat.SUPPRIME)];
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableMembre.nom,
			tableMembre.pseudonyme,
			tableMembre.telephone
		)
	);
	const liste = db
		.select({ id: tableMembre.id, pseudonyme: tableMembre.pseudonyme, nom: tableMembre.nom })
		.from(tableMembre)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(tableMembre.nom))
		.limit(1000)
		.all();
	res.json(liste);
});

function groupeCourt(g: Groupe) {
	return {
		id: g.id,
		code: g.code,
		montant_cotisation: g.montant_cotisation,
		periodicite: g.periodicite,
		responsable_id: g.responsable_id,
		etat: g.etat
	};
}

routeur.get('/mes-adhesions', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const adhesions = db
		.select()
		.from(membreLikelemba)
		.where(and(eq(membreLikelemba.membre_id, membre.id), ne(membreLikelemba.etat, Etat.SUPPRIME)))
		.orderBy(desc(membreLikelemba.id))
		.all();
	res.json(
		adhesions.map((a) => ({
			id: a.id,
			code: a.code,
			etat: a.etat,
			date_entree: a.date_entree,
			groupe: groupeCourt(
				db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, a.groupe_id)).get()!
			)
		}))
	);
});

// --- Adhésions -----------------------------------------------------------------------------------

/** Fiche d'adhésion : l'adhérent, le responsable du groupe et les gestionnaires. */
function obtenirAdhesion(id: number, membre: Membre): { adhesion: Adhesion; groupe: Groupe } {
	const a = db.select().from(membreLikelemba).where(eq(membreLikelemba.id, id)).get();
	if (!a || (a.etat === Etat.SUPPRIME && membre.type_compte !== 1)) {
		throw introuvable('Cette adhésion est introuvable.');
	}
	const g = db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, a.groupe_id)).get()!;
	if (a.membre_id !== membre.id && g.responsable_id !== membre.id && membre.type_compte !== 1) {
		throw interdit(
			"Cette fiche d'adhésion est réservée à l'adhérent, au responsable du groupe et à la frangine."
		);
	}
	return { adhesion: a, groupe: g };
}

function vueAdhesionResume(a: Adhesion) {
	return {
		id: a.id,
		code: a.code,
		membre: (auteur(lireMembre(a.membre_id)) ?? null) as Auteur | null,
		date_entree: a.date_entree,
		etat: a.etat,
		// Rang d'entrée, extrait du code `{n}{code groupe}`.
		ordre: ordre(a.code)
	};
}

/** Fiche d'adhésion + « les paiements antérieurs du membre » (F-S4-40). */
routeur.get('/adhesions/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { adhesion: a, groupe: g } = obtenirAdhesion(Number(req.params.id), membre);
	const cots = cotisationsDe(g, a.id);
	res.json({
		...vueAdhesionResume(a),
		groupe: groupeCourt(g),
		observation: a.observation,
		caution_nom: a.caution_nom,
		caution_est_membre: depuisCodeMembre(a.caution_est_membre),
		caution_piece_identite: a.caution_piece_identite,
		caution_adresse: a.caution_adresse,
		caution_activite: a.caution_activite,
		caution_telephone: a.caution_telephone,
		temoins: a.temoins.map((t) => ({
			nom: t.nom ?? '',
			telephone: t.telephone ?? '',
			emploi: t.emploi ?? '',
			est_membre: depuisCodeMembre(t.est_membre)
		})),
		cotisations: cots.map((c) => vueCotisation(c, g, membre)),
		total_cotisations: totalCotisations(cots),
		peut_modifier: a.membre_id === membre.id || peutGerer(membre, g),
		peut_moderer: peutModerer(membre),
		peut_cotiser: a.etat === Etat.AUTORISE && g.etat === Etat.AUTORISE
	});
});

function validerAdhesion(d: AdhesionEntree): void {
	const champs: Record<string, string> = {};
	if (d.caution_telephone && !telephoneValide(d.caution_telephone)) {
		champs.caution_telephone = MESSAGE_TELEPHONE;
	}
	d.temoins.forEach((t, i) => {
		if (t.telephone && !telephoneValide(t.telephone)) {
			champs[`temoin${i + 1}_telephone`] = MESSAGE_TELEPHONE;
		}
	});
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
}

function champsAdhesion(d: AdhesionEntree) {
	const temoins: TemoinLikelemba[] = d.temoins
		.slice(0, 3)
		.filter((t) => t.nom.trim() || t.telephone.trim() || t.emploi.trim())
		.map((t) => ({
			nom: t.nom.trim(),
			telephone: normaliserTelephone(t.telephone),
			emploi: t.emploi.trim(),
			est_membre: t.est_membre ? CODE_MEMBRE : CODE_NON_MEMBRE
		}));
	return {
		observation: d.observation.trim(),
		caution_nom: d.caution_nom.trim(),
		caution_est_membre: d.caution_est_membre ? CODE_MEMBRE : CODE_NON_MEMBRE,
		caution_piece_identite: d.caution_piece_identite.trim(),
		caution_adresse: d.caution_adresse.trim(),
		caution_activite: d.caution_activite.trim(),
		caution_telephone: normaliserTelephone(d.caution_telephone),
		temoins
	};
}

/** L'adhérent met à jour caution et témoins ; le responsable / la frangine aussi la date d'entrée. */
routeur.put('/adhesions/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { adhesion: a, groupe: g } = obtenirAdhesion(Number(req.params.id), membre);
	const gerer = peutGerer(membre, g);
	if (a.membre_id !== membre.id && !gerer) {
		throw interdit(
			"Seuls l'adhérent, le responsable du groupe et la frangine peuvent modifier cette adhésion."
		);
	}
	const donnees = valider(adhesionEntreeSchema, req.body);
	validerAdhesion(donnees);

	const code = db.transaction(() => {
		const valeurs: Record<string, unknown> = champsAdhesion(donnees);
		if (gerer && donnees.date_entree) valeurs.date_entree = donnees.date_entree;
		let nouveauCode = a.code;
		if (gerer && !a.code) {
			nouveauCode = codeAdhesionLikelemba(g.id, g.code);
			valeurs.code = nouveauCode;
		}
		db.update(membreLikelemba).set(valeurs).where(eq(membreLikelemba.id, a.id)).run();
		return nouveauCode;
	});
	res.json(ok('Modification effectuée.', a.id, code));
});

/** Confirmation (« Attente » → Autorisé), suspension ou retrait d'une adhésion (F-S4-39). */
routeur.post('/adhesions/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { adhesion: a } = obtenirAdhesion(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(membreLikelemba, a.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', a.id));
});

// --- Cotisations : validation / activation de reçu -----------------------------------------------

/**
 * « Activation ? » (F-S4-44) : génère le reçu s'il manque ou s'il est tronqué (données legacy) et
 * marque la cotisation comme validée. Responsable du groupe ou gestionnaire habilité.
 */
routeur.post('/cotisations/:id/valider', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = db
		.select()
		.from(cotisationLikelemba)
		.where(eq(cotisationLikelemba.id, Number(req.params.id)))
		.get();
	if (!c) throw introuvable('Cette cotisation est introuvable.');
	const g = db.select().from(groupeLikelemba).where(eq(groupeLikelemba.id, c.groupe_id)).get()!;
	if (!peutGerer(membre, g)) {
		throw interdit('Seuls le responsable du likelemba et la frangine peuvent valider un reçu.');
	}
	if (c.etat === Etat.SUPPRIME) {
		throw erreur(
			'Cette cotisation a été annulée (paiement rejeté) : elle ne peut pas être validée.'
		);
	}

	const recu = db.transaction(() => {
		const numero = recuValide(c, g) ? c.numero_recu : numeroRecuLikelemba(g.id, g.code);
		db.update(cotisationLikelemba)
			.set({ numero_recu: numero, etat: Etat.AUTORISE })
			.where(eq(cotisationLikelemba.id, c.id))
			.run();
		return numero;
	});
	res.json(ok(`Reçu ${recu} validé.`, c.id, recu));
});

// --- Fiche groupe --------------------------------------------------------------------------------

function vueDetail(g: Groupe, membre: Membre | null) {
	const tous = !!membre && membre.type_compte === 1;
	const adhesions = db
		.select()
		.from(membreLikelemba)
		.where(eq(membreLikelemba.groupe_id, g.id))
		.all()
		.filter((a) => tous || a.etat !== Etat.SUPPRIME)
		.sort((x, y) => {
			const ox = ordre(x.code) ?? 10 ** 6;
			const oy = ordre(y.code) ?? 10 ** 6;
			if (ox !== oy) return ox - oy;
			const dx = x.date_entree ? x.date_entree.getTime() : Number.MAX_SAFE_INTEGER;
			const dy = y.date_entree ? y.date_entree.getTime() : Number.MAX_SAFE_INTEGER;
			return dx - dy || x.id - y.id;
		});
	const actives = adhesions.filter((a) => a.etat === Etat.AUTORISE);

	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);
	const calendrier = actives.map((a, i) => {
		const jour = g.date_debut ? decaler(g.date_debut, g.periodicite, i) : null;
		const adherent = lireMembre(a.membre_id);
		return {
			tour: i + 1,
			date: jour,
			adhesion_id: a.id,
			passee: jour !== null && jour.getTime() < aujourdhui.getTime(),
			beneficiaire: adherent ? adherent.pseudonyme : `Adhérent ${a.code}`
		};
	});

	const mienne = membre
		? adhesions.find((a) => a.membre_id === membre.id && a.etat !== Etat.SUPPRIME)
		: undefined;
	const estResponsable = !!membre && membre.id === g.responsable_id;
	const gerer = peutGerer(membre, g);

	const detail: Record<string, unknown> = {
		...vueGroupeResume(
			g,
			membre,
			new Map([[g.id, actives.length]]),
			mienne ? new Map([[g.id, mienne.id]]) : new Map()
		),
		adhesions: adhesions.map(vueAdhesionResume),
		calendrier,
		cagnotte: g.montant_cotisation * actives.length,
		cotisations: null,
		total_cotisations: null,
		peut_modifier: gerer,
		peut_moderer: !!membre && peutModerer(membre),
		peut_gerer: gerer,
		peut_adherer: !!membre && !mienne && g.etat === Etat.AUTORISE
	};

	// Historique des cotisations : adhérents, responsable et gestionnaires (données financières).
	if (membre && (mienne || estResponsable || membre.type_compte === 1)) {
		const cots = cotisationsDe(g);
		detail.cotisations = cots.map((c) => vueCotisation(c, g, membre));
		detail.total_cotisations = totalCotisations(cots);
	}
	return detail;
}

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	res.json(vueDetail(obtenirGroupe(Number(req.params.id), membre), membre));
});

// --- Création / modification d'un groupe ---------------------------------------------------------

function validerGroupe(d: GroupeEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};
	const r = d.responsable_id ? lireMembre(d.responsable_id) : undefined;
	if (!r || r.etat === Etat.SUPPRIME) {
		champs.responsable_id = 'Veuillez indiquer le responsable du likelemba.';
	}
	if (d.montant_cotisation <= 0) {
		champs.montant_cotisation = 'Le montant de participation ne peut être 0.';
	}
	const periodicitesConnues: number[] = Object.values(Periodicite);
	if (!d.periodicite || !periodicitesConnues.includes(d.periodicite)) {
		champs.periodicite = 'Veuillez indiquer la périodicité du likelemba.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Unicité (arbitrage F-S4-31) : même responsable, montant, périodicité et date de début.
	// Le legacy testait l'observation, ce qui empêchait deux groupes sans observation.
	const conditions = [
		eq(groupeLikelemba.responsable_id, d.responsable_id!),
		eq(groupeLikelemba.montant_cotisation, d.montant_cotisation),
		eq(groupeLikelemba.periodicite, d.periodicite!),
		d.date_debut
			? eq(groupeLikelemba.date_debut, d.date_debut)
			: sql`${groupeLikelemba.date_debut} is null`,
		ne(groupeLikelemba.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(groupeLikelemba.id, exclureId));
	const doublon = db
		.select({ id: groupeLikelemba.id })
		.from(groupeLikelemba)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce likelemba est déjà enregistré.');
}

function champsGroupe(d: GroupeEntree) {
	return {
		responsable_id: d.responsable_id,
		montant_cotisation: d.montant_cotisation,
		periodicite: d.periodicite!,
		date_debut: d.date_debut,
		observation: d.observation.trim()
	};
}

function prevenirResponsable(g: Groupe): void {
	if (!g.responsable_id) return;
	db.insert(tableMessage)
		.values({
			membre_id: g.responsable_id,
			de_la_frangine: true,
			texte:
				`Vous êtes désormais responsable du likelemba ${g.code} (cotisation de ` +
				`${montantLisible(g.montant_cotisation)} FCFA, ` +
				`${libelle('Periodicite', g.periodicite).toLowerCase()}). ` +
				'Vous pouvez inscrire les membres et valider les reçus depuis la fiche du groupe.'
		})
		.run();
}

/** Création d'un groupe : gestionnaire avec droit Activation (F-S4-04, F-S4-30). */
routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	if (!peutModerer(membre)) {
		throw interdit(
			"La création d'un likelemba est réservée à la frangine (gestionnaire habilité)."
		);
	}
	const donnees = valider(groupeEntreeSchema, req.body);
	validerGroupe(donnees);

	const g = db.transaction(() => {
		const cree = db
			.insert(groupeLikelemba)
			.values({
				etat: Etat.AUTORISE,
				compteur_entrees: 0,
				compteur_paiements: 0,
				code: nouvelleReference(Prefixe.LIKELEMBA),
				...champsGroupe(donnees)
			})
			.returning()
			.get()!;
		if (cree.responsable_id !== membre.id) prevenirResponsable(cree);
		return cree;
	});
	res.status(201).json(ok('Enregistrement effectué.', g.id, g.code));
});

/** Le responsable ou un gestionnaire habilité (F-S4-32). */
routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const g = obtenirGroupe(Number(req.params.id), membre);
	verifierModification(membre, g.responsable_id);
	const donnees = valider(groupeEntreeSchema, req.body);
	validerGroupe(donnees, g.id);

	db.transaction(() => {
		const ancien = g.responsable_id;
		const maj = db
			.update(groupeLikelemba)
			.set(champsGroupe(donnees))
			.where(eq(groupeLikelemba.id, g.id))
			.returning()
			.get()!;
		if (maj.responsable_id !== ancien && maj.responsable_id !== membre.id) {
			prevenirResponsable(maj);
		}
	});
	res.json(ok('Modification effectuée.', g.id, g.code));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const g = obtenirGroupe(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(groupeLikelemba, g.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', g.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const g = obtenirGroupe(Number(req.params.id), membre);
	supprimer(groupeLikelemba, g as never, membre, 'responsable_id');
	res.json(ok('Likelemba supprimé.', g.id));
});

/**
 * Adhésion (F-S4-36 à F-S4-38) : le membre s'inscrit lui-même ; le responsable ou la frangine
 * peuvent inscrire un autre membre. Code `{n}{code groupe}`, adhésion active immédiatement.
 */
routeur.post('/:id/adhesions', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const g = obtenirGroupe(Number(req.params.id), membre);
	const gerer = peutGerer(membre, g);
	const donnees = valider(adhesionEntreeSchema, req.body);
	const cibleId = donnees.membre_id || membre.id;

	if (cibleId !== membre.id && !gerer) {
		throw interdit(
			'Seuls le responsable du groupe et la frangine peuvent inscrire un autre membre.'
		);
	}
	if (g.etat !== Etat.AUTORISE && !peutModerer(membre)) {
		throw erreur("Ce likelemba n'accepte pas de nouveaux membres pour le moment.");
	}
	const cible = lireMembre(cibleId);
	if (!cible || cible.etat === Etat.SUPPRIME) {
		throw erreur('Veuillez corriger les champs signalés.', {
			membre_id: 'Veuillez indiquer le nouveau membre.'
		});
	}
	validerAdhesion(donnees);

	const doublon = db
		.select({ id: membreLikelemba.id })
		.from(membreLikelemba)
		.where(
			and(
				eq(membreLikelemba.groupe_id, g.id),
				eq(membreLikelemba.membre_id, cibleId),
				ne(membreLikelemba.etat, Etat.SUPPRIME)
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce membre est déjà enregistré dans ce likelemba.');

	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);

	const a = db.transaction(() => {
		const cree = db
			.insert(membreLikelemba)
			.values({
				groupe_id: g.id,
				membre_id: cibleId,
				etat: Etat.AUTORISE,
				date_entree: gerer && donnees.date_entree ? donnees.date_entree : aujourdhui,
				code: codeAdhesionLikelemba(g.id, g.code),
				...champsAdhesion(donnees)
			})
			.returning()
			.get()!;
		if (g.responsable_id && g.responsable_id !== membre.id) {
			db.insert(tableMessage)
				.values({
					membre_id: g.responsable_id,
					de_la_frangine: true,
					texte:
						`${cible.pseudonyme || 'Un membre'} a rejoint votre likelemba ${g.code} ` +
						`(code adhérent ${cree.code}).`
				})
				.run();
		}
		if (cibleId !== membre.id) {
			db.insert(tableMessage)
				.values({
					membre_id: cibleId,
					de_la_frangine: true,
					texte:
						`Vous êtes inscrit·e au likelemba ${g.code} (code adhérent ${cree.code}). ` +
						`Cotisation : ${montantLisible(g.montant_cotisation)} FCFA, ` +
						`${libelle('Periodicite', g.periodicite).toLowerCase()}.`
				})
				.run();
		}
		return cree;
	});

	res.status(201).json(ok('Enregistrement effectué. Bienvenue dans le likelemba !', a.id, a.code));
});
