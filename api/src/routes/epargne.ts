/**
 * Épargne solidaire (portage de `app/routers/epargne.py` ; legacy incl-choix4C1.php,
 * incl-fondsoutien.php, incl-choix4C2.php, incl-pointcaisse.php). Inventaire : F-S4-45 à F-S4-67 ;
 * ADR-0004 (règle des 97 %, PIN, effet miroir, anti-doublon), ADR-0007 S4c/S4d, ADR-0009 (module
 * désactivable + avertissements).
 *
 * Toutes les routes, sauf `/epargne/statut`, sont refusées quand `parametre.module_epargne_actif`
 * est faux ; le frontend affiche alors une page explicative.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerDroit, exigerMembre, membreRequis, pagination } from '../deps.js';
import {
	DonPlacement,
	Etat,
	EtatPaiement,
	OuiNon,
	TypeCaisse,
	TypeObjetPaye,
	VersementRetrait
} from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { paiement as tablePaiement } from '../schema/commerce.js';
import { message as tableMessage } from '../schema/contenu.js';
import { fondDeSoutien, pointCaisse } from '../schema/fonds.js';
import {
	membre as tableMembre,
	peutModerer,
	tentativeConnexion,
	type Membre
} from '../schema/membres.js';
import { auteur, entier, entierFacultatif, ok, valider, type Auteur } from '../schemas/commun.js';
import { envoyerEnArrierePlan } from '../services/emails.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';
import {
	epargneActive,
	exigerModuleEpargne,
	MESSAGE_EPARGNE_DESACTIVEE,
	minimumPlacement,
	montantLisible,
	peutVoirFond
} from '../services/fonds.js';
import { nouvelleReference, Prefixe } from '../services/references.js';
import { normaliserTelephone } from '../services/validation.js';
import { verifierMotDePasse } from '../securite.js';

export const routeur = Router();
export const prefixe = '/epargne';

type Fond = typeof fondDeSoutien.$inferSelect;
type Pointage = typeof pointCaisse.$inferSelect;

const DON_MINIMUM = 100;
const DUREE_MIN = 12;
const DUREE_MAX = 120;
/** Un retrait doit rester strictement sous 97 % du solde (ADR-0004). */
const RETENTION_POURCENT = 97;
const RENTABILITE_POURCENT = 3;
const PIN_ECHECS_MAX = 5;
/** Quinze minutes, en millisecondes. */
const PIN_FENETRE = 15 * 60 * 1000;

/** Public : état du module et seuils (le frontend s'en sert pour la page explicative). */
routeur.get('/statut', (_req, res) => {
	const actif = epargneActive();
	res.json({
		actif,
		message: actif ? '' : MESSAGE_EPARGNE_DESACTIVEE,
		don_minimum: DON_MINIMUM,
		placement_minimum: minimumPlacement(),
		duree_min: DUREE_MIN,
		duree_max: DUREE_MAX
	});
});

// --- Don / Placement (fond de soutien) -----------------------------------------------------------

const fondEntreeSchema = z.object({
	type_fond: entierFacultatif,
	// Souscripteur : vide = soi-même ; sinon un membre (pseudonyme, identifiant ou téléphone) ou le
	// nom d'une personne non inscrite (legacy « Souscripteur non listé »).
	souscripteur_membre: z.string().max(120).default(''),
	souscripteur_nom: z.string().max(120).default(''),
	motivation: z.string().max(2000).default(''),
	montant: entier.min(0).default(0),
	duree_mois: entier.min(0).max(240).default(0)
});

const fondModificationSchema = z.object({
	motivation: z.string().max(2000).default(''),
	montant: entier.min(0).default(0),
	duree_mois: entier.min(0).max(240).default(0)
});

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

function vueFondResume(f: Fond) {
	return {
		id: f.id,
		reference: f.reference,
		date_souscription: f.date_souscription,
		type_fond: f.type_fond,
		montant: f.montant,
		duree_mois: f.duree_mois,
		mode_paiement: f.mode_paiement,
		confirme: f.confirme,
		etat: f.etat,
		rapporteur_nom: f.rapporteur_nom,
		souscripteur_nom: f.souscripteur_nom,
		motivation: f.motivation
	};
}

function acteursDuFond(f: Fond): Map<number, Auteur | null> {
	const ids = [f.membre_id, f.rapporteur_id, f.souscripteur_id].filter(
		(i): i is number => i !== null
	);
	if (ids.length === 0) return new Map();
	return new Map(
		db
			.select()
			.from(tableMembre)
			.where(inArray(tableMembre.id, [...new Set(ids)]))
			.all()
			.map((m) => [m.id, auteur(m)])
	);
}

/**
 * Gestionnaire : toutes les fiches ; membre : celles qu'il a créées ou dont il est rapporteur ou
 * souscripteur (F-S4-45). Filtres disponibles pour tous (F-S4-46).
 */
routeur.get('/fonds', membreRequis, (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};

	if (membre.type_compte === 1) {
		const membreId = nombre('membre_id');
		if (membreId) {
			conditions.push(
				or(
					eq(fondDeSoutien.membre_id, membreId),
					eq(fondDeSoutien.souscripteur_id, membreId),
					eq(fondDeSoutien.rapporteur_id, membreId)
				)
			);
		}
	} else {
		conditions.push(
			or(
				eq(fondDeSoutien.membre_id, membre.id),
				eq(fondDeSoutien.rapporteur_id, membre.id),
				eq(fondDeSoutien.souscripteur_id, membre.id)
			),
			ne(fondDeSoutien.etat, Etat.SUPPRIME)
		);
	}

	const du = req.query.du;
	if (typeof du === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(du)) {
		const [a, m, j] = du.split('-').map(Number);
		conditions.push(gte(fondDeSoutien.date_souscription, new Date(a!, m! - 1, j!)));
	}
	const typeFond = nombre('type_fond');
	if (typeFond) conditions.push(eq(fondDeSoutien.type_fond, typeFond));
	const montantMin = nombre('montant_min');
	if (montantMin) conditions.push(gte(fondDeSoutien.montant, montantMin));
	const confirme = nombre('confirme');
	if (confirme) conditions.push(eq(fondDeSoutien.confirme, confirme));
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			fondDeSoutien.motivation,
			fondDeSoutien.reference,
			fondDeSoutien.souscripteur_nom,
			fondDeSoutien.rapporteur_nom
		)
	);

	const requete = db
		.select()
		.from(fondDeSoutien)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(fondDeSoutien.date_souscription), desc(fondDeSoutien.id))
		.$dynamic();

	const liste = paginer<Fond>(requete, page);
	res.json({
		items: liste.items.map(vueFondResume),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Souscripteur désigné par son pseudonyme, son identifiant ou son numéro de téléphone. */
function trouverMembre(texte: string): Membre | undefined {
	const t = texte.trim();
	const conditions = [
		sql`lower(${tableMembre.pseudonyme}) = ${t.toLowerCase()}`,
		sql`lower(${tableMembre.identifiant}) = ${t.toLowerCase()}`
	];
	const tel = normaliserTelephone(t);
	if (tel.length === 9 && /^\d+$/.test(tel)) conditions.push(eq(tableMembre.telephone, tel));
	return db
		.select()
		.from(tableMembre)
		.where(and(or(...conditions), ne(tableMembre.etat, Etat.SUPPRIME)))
		.limit(1)
		.get();
}

/**
 * Seuils legacy (incl-fondsoutien.php) ; le minimum de placement est enfin contrôlé
 * (ADR-0007 S4c). Retourne la durée retenue (0 pour un don).
 */
function reglesMontant(
	typeFond: number,
	montant: number,
	duree: number,
	champs: Record<string, string>
): number {
	if (typeFond === DonPlacement.DON) {
		if (montant < DON_MINIMUM) {
			champs.montant = 'Le montant ne doit pas être inférieur à 100 francs CFA.';
		}
		return 0;
	}
	const minimum = minimumPlacement();
	if (montant < minimum || montant <= 0) {
		champs.montant = `Le montant ne doit pas être inférieur à ${montantLisible(minimum)} francs CFA.`;
	}
	if (duree < DUREE_MIN || duree > DUREE_MAX) {
		champs.duree_mois = 'La durée du placement doit être comprise entre 12 et 120 mois.';
	}
	return duree;
}

/** E-mail « Souscription placement » du legacy, enfin envoyé (F-S4-53), + message interne. */
function prevenirSouscripteur(f: Fond, rapporteur: Membre, souscripteur: Membre): void {
	const placement = f.type_fond === DonPlacement.PLACEMENT;
	const quoi = placement ? 'un placement' : 'un don';
	const duree = placement ? ` pour une durée de ${f.duree_mois} mois` : '';
	const lien = `${config.siteUrl}/epargne/dons-placements/${f.id}`;
	const texte =
		`${rapporteur.nom} a souscrit ${quoi} sous le numéro ${f.reference} en votre nom, d'un montant ` +
		`de ${montantLisible(f.montant)} francs CFA${duree}. ` +
		`Veuillez vous connecter pour le paiement : ${lien}`;

	db.insert(tableMessage).values({ membre_id: souscripteur.id, de_la_frangine: true, texte }).run();
	if (souscripteur.email) {
		const sujet = placement ? 'Souscription placement' : 'Souscription don';
		const corps =
			`Bonjour ${souscripteur.pseudonyme || souscripteur.nom},\n\n${texte}\n\n` +
			'Rappel : La Frangine ne détient pas vos fonds et ne vous demandera jamais votre code PIN.\n\n' +
			'Cordialement,\nVotre frangine';
		envoyerEnArrierePlan(souscripteur.email, sujet, corps);
	}
}

/**
 * Don ou placement (F-S4-47 à F-S4-53). Le membre connecté est le rapporteur ; il souscrit pour
 * lui-même, pour un autre membre ou pour une personne non inscrite.
 */
routeur.post('/fonds', membreRequis, (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	const donnees = valider(fondEntreeSchema, req.body);
	const champs: Record<string, string> = {};

	const typesConnus: number[] = Object.values(DonPlacement);
	if (!donnees.type_fond || !typesConnus.includes(donnees.type_fond)) {
		throw erreur("Veuillez indiquer le type de l'épargne : don ou placement.", {
			type_fond: "Veuillez indiquer le type de l'épargne : don ou placement."
		});
	}

	let souscripteur: Membre | null = membre;
	let nom = membre.nom;
	if (donnees.souscripteur_membre.trim()) {
		const trouve = trouverMembre(donnees.souscripteur_membre);
		if (!trouve) {
			champs.souscripteur_membre = 'Aucun membre ne correspond à ce pseudonyme ou à ce numéro.';
		} else {
			souscripteur = trouve;
			nom = trouve.nom;
		}
	} else if (donnees.souscripteur_nom.trim()) {
		souscripteur = null;
		nom = donnees.souscripteur_nom.trim();
		if (nom.length < 3) champs.souscripteur_nom = 'Veuillez indiquer le nom du souscripteur.';
	}

	const duree = reglesMontant(donnees.type_fond, donnees.montant, donnees.duree_mois, champs);
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);
	const motivation = donnees.motivation.trim();
	const doublon = db
		.select({ id: fondDeSoutien.id })
		.from(fondDeSoutien)
		.where(
			and(
				eq(fondDeSoutien.membre_id, membre.id),
				eq(fondDeSoutien.date_souscription, aujourdhui),
				eq(fondDeSoutien.motivation, motivation),
				eq(fondDeSoutien.montant, donnees.montant),
				ne(fondDeSoutien.etat, Etat.SUPPRIME)
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette épargne est déjà enregistrée.');

	const f = db.transaction(() => {
		const cree = db
			.insert(fondDeSoutien)
			.values({
				reference: nouvelleReference(Prefixe.FOND_SOUTIEN),
				membre_id: membre.id,
				date_souscription: aujourdhui,
				type_fond: donnees.type_fond!,
				rapporteur_id: membre.id,
				rapporteur_nom: membre.nom,
				souscripteur_id: souscripteur ? souscripteur.id : null,
				souscripteur_nom: nom,
				motivation,
				montant: donnees.montant,
				duree_mois: duree,
				mode_paiement: 0,
				confirme: OuiNon.NON,
				etat: Etat.AUTORISE
			})
			.returning()
			.get()!;
		if (souscripteur && souscripteur.id !== membre.id) {
			prevenirSouscripteur(cree, membre, souscripteur);
		}
		return cree;
	});

	res.status(201).json(ok('Enregistrement effectué.', f.id, f.reference));
});

function obtenirFond(id: number, membre: Membre): Fond {
	exigerModuleEpargne();
	const f = db.select().from(fondDeSoutien).where(eq(fondDeSoutien.id, id)).get();
	if (!f || (f.etat === Etat.SUPPRIME && membre.type_compte !== 1)) {
		throw introuvable('Cette épargne est introuvable.');
	}
	if (!peutVoirFond(membre, f)) {
		throw interdit('Cette fiche est réservée au souscripteur, au rapporteur et à la frangine.');
	}
	return f;
}

routeur.get('/fonds/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenirFond(Number(req.params.id), membre);
	const acteurs = acteursDuFond(f);
	// Dernier paiement type 7 : 2 en attente, 3 confirmé.
	const dernier = db
		.select()
		.from(tablePaiement)
		.where(
			and(
				eq(tablePaiement.type_objet, TypeObjetPaye.FOND_SOUTIEN),
				eq(tablePaiement.objet_id, f.id),
				ne(tablePaiement.etat, EtatPaiement.NON_PAYE)
			)
		)
		.orderBy(desc(tablePaiement.id))
		.limit(1)
		.get();

	res.json({
		...vueFondResume(f),
		membre: f.membre_id !== null ? (acteurs.get(f.membre_id) ?? null) : null,
		rapporteur: f.rapporteur_id !== null ? (acteurs.get(f.rapporteur_id) ?? null) : null,
		souscripteur: f.souscripteur_id !== null ? (acteurs.get(f.souscripteur_id) ?? null) : null,
		peut_payer: f.etat === Etat.AUTORISE && f.confirme !== OuiNon.OUI && f.montant > 0,
		peut_modifier: peutModerer(membre),
		peut_moderer: peutModerer(membre),
		etat_paiement: dernier ? dernier.etat : null,
		date_paiement: dernier ? dernier.date_paiement : null
	});
});

/** Gestionnaire habilité : motivation, montant, durée — sans écraser le montant (F-S4-55). */
routeur.put('/fonds/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const f = obtenirFond(Number(req.params.id), membre);
	const donnees = valider(fondModificationSchema, req.body);

	const champs: Record<string, string> = {};
	const duree = reglesMontant(f.type_fond, donnees.montant, donnees.duree_mois, champs);
	if (donnees.montant !== f.montant && f.confirme === OuiNon.OUI) {
		champs.montant = "Le montant d'une épargne déjà payée ne peut plus être modifié.";
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	db.update(fondDeSoutien)
		.set({ motivation: donnees.motivation.trim(), montant: donnees.montant, duree_mois: duree })
		.where(eq(fondDeSoutien.id, f.id))
		.run();
	res.json(ok('Modification effectuée.', f.id, f.reference));
});

routeur.post('/fonds/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const f = obtenirFond(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(fondDeSoutien, f.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', f.id));
});

// --- Carte de pointage ---------------------------------------------------------------------------

const pointageEntreeSchema = z.object({
	type_operation: entierFacultatif,
	membre_id: entierFacultatif,
	montant: entier.min(0).default(0),
	motif: z.string().max(500).default(''),
	code_pin: z.string().max(12).default('')
});

function estAgent(membre: Membre): boolean {
	return membre.point_caisse_actif && membre.type_compte !== 1;
}

function exigerOperateur(membre: Membre): void {
	if (membre.type_compte !== 1 && !membre.point_caisse_actif) {
		throw interdit('La saisie des pointages est réservée aux agents de caisse et à la frangine.');
	}
}

/** Bornes de journée : `00:00:00` → `23:59:59.999`. */
function borneJour(valeur: unknown, fin = false): Date | null {
	if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
	const [a, m, j] = valeur.split('-').map(Number);
	const d = new Date(a!, m! - 1, j!);
	return fin ? new Date(d.getTime() + 86_400_000 - 1) : d;
}

/**
 * Gestionnaire : toutes les opérations ; agent : celles qu'il a saisies (et celles de sa propre
 * carte) ; membre : celles dont il est titulaire (F-S4-56 à F-S4-59).
 */
routeur.get('/pointages', membreRequis, (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	const page = pagination(req);
	const gestionnaire = membre.type_compte === 1;
	const agent = estAgent(membre);
	const conditions: (SQL | undefined)[] = [];

	if (agent) {
		conditions.push(
			or(eq(pointCaisse.operateur_id, membre.id), eq(pointCaisse.membre_id, membre.id))
		);
	} else if (!gestionnaire) {
		conditions.push(eq(pointCaisse.membre_id, membre.id));
	}

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};
	const du = borneJour(req.query.du);
	if (du) conditions.push(gte(pointCaisse.date_heure, du));
	// Correctif : jour max inclus.
	const au = borneJour(req.query.au, true);
	if (au) conditions.push(lte(pointCaisse.date_heure, au));
	const operateurId = nombre('operateur_id');
	if (operateurId) conditions.push(eq(pointCaisse.operateur_id, operateurId));
	const membreId = nombre('membre_id');
	if (membreId) conditions.push(eq(pointCaisse.membre_id, membreId));
	const typeOperation = nombre('type_operation');
	if (typeOperation) conditions.push(eq(pointCaisse.type_operation, typeOperation));
	const montantMin = nombre('montant_min');
	if (montantMin) conditions.push(gte(pointCaisse.montant, montantMin));
	const montantMax = nombre('montant_max');
	if (montantMax) conditions.push(lte(pointCaisse.montant, montantMax));
	const typeCaisse = nombre('type_caisse');
	if (typeCaisse && gestionnaire) conditions.push(eq(pointCaisse.type_caisse, typeCaisse));

	const filtre = and(...conditions.filter(Boolean));
	const sommes = db
		.select({
			versements: sql<number>`coalesce(sum(case when ${pointCaisse.type_operation} = ${VersementRetrait.VERSEMENT} then ${pointCaisse.montant} else 0 end), 0)`,
			retraits: sql<number>`coalesce(sum(case when ${pointCaisse.type_operation} = ${VersementRetrait.RETRAIT} then ${pointCaisse.montant} else 0 end), 0)`
		})
		.from(pointCaisse)
		.where(filtre)
		.get();

	const requete = db
		.select()
		.from(pointCaisse)
		.where(filtre)
		.orderBy(desc(pointCaisse.date_heure), desc(pointCaisse.id))
		.$dynamic();
	const liste = paginer<Pointage>(requete, page);

	const ids = [
		...new Set(
			liste.items.flatMap((p) => [p.operateur_id, p.membre_id]).filter((i): i is number => !!i)
		)
	];
	const acteurs = new Map(
		ids.length
			? db
					.select({
						id: tableMembre.id,
						nom: tableMembre.nom,
						pseudonyme: tableMembre.pseudonyme
					})
					.from(tableMembre)
					.where(inArray(tableMembre.id, ids))
					.all()
					.map((m) => [m.id, m])
			: []
	);

	const afficherSolde = gestionnaire || membreId !== null || !agent;
	const items = liste.items.map((p) => ({
		id: p.id,
		reference: p.reference,
		date_heure: p.date_heure,
		operateur: p.operateur_id !== null ? (acteurs.get(p.operateur_id) ?? null) : null,
		membre: acteurs.get(p.membre_id) ?? null,
		type_operation: p.type_operation,
		montant: p.montant,
		motif: p.motif,
		solde_apres: afficherSolde || p.membre_id === membre.id ? p.solde_apres : null,
		type_caisse: p.type_caisse
	}));

	let encaisse: number | null = null;
	let libelleEncaisse = '';
	if (agent) {
		encaisse = membre.solde_point_caisse;
		libelleEncaisse = 'Votre encaisse';
	} else if (gestionnaire) {
		const caisse = operateurId
			? db.select().from(tableMembre).where(eq(tableMembre.id, operateurId)).get()
			: undefined;
		if (caisse) {
			encaisse = caisse.solde_point_caisse;
			libelleEncaisse = `Encaisse de ${caisse.nom}`;
		} else {
			encaisse =
				db
					.select({ s: sql<number>`coalesce(sum(${tableMembre.solde_point_caisse}), 0)` })
					.from(tableMembre)
					.where(and(eq(tableMembre.point_caisse_actif, true), ne(tableMembre.etat, Etat.SUPPRIME)))
					.get()?.s ?? 0;
			libelleEncaisse = 'Encaisse totale des agents';
		}
	}

	const v = sommes?.versements ?? 0;
	const r = sommes?.retraits ?? 0;
	res.json({
		items,
		total: liste.total,
		page: liste.page,
		taille: liste.taille,
		total_versements: v,
		total_retraits: r,
		net: v - r,
		// 3 % des versements (F-S4-59).
		rentabilite: Math.floor((v * RENTABILITE_POURCENT + 50) / 100),
		encaisse,
		libelle_encaisse: libelleEncaisse,
		afficher_solde: afficherSolde,
		est_operateur: gestionnaire || agent,
		est_gestionnaire: gestionnaire,
		mon_solde: membre.solde_point_caisse,
		date_dernier_pointage: membre.date_dernier_pointage
	});
});

function exigerTitulaire(operateur: Membre, id: number | null): Membre {
	const t = id ? db.select().from(tableMembre).where(eq(tableMembre.id, id)).get() : undefined;
	if (!t || t.etat === Etat.SUPPRIME) {
		throw erreur('Veuillez corriger les champs signalés.', {
			membre_id: 'Ce membre est introuvable.'
		});
	}
	if (t.id === operateur.id) {
		throw erreur('Vous ne pouvez pas pointer votre propre carte.', {
			membre_id: 'Choisissez un autre membre.'
		});
	}
	if (operateur.type_compte === 1 && !t.point_caisse_actif) {
		throw erreur("Un gestionnaire ne peut pointer que la caisse d'un agent (F-S4-61).", {
			membre_id: 'Choisissez un agent de caisse.'
		});
	}
	return t;
}

/** Membres pointables : agents de caisse pour un gestionnaire, tout membre (sauf soi) pour un agent. */
routeur.get('/pointages/titulaires', membreRequis, (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	exigerOperateur(membre);
	const conditions: (SQL | undefined)[] = [
		ne(tableMembre.etat, Etat.SUPPRIME),
		ne(tableMembre.id, membre.id)
	];
	if (membre.type_compte === 1) conditions.push(eq(tableMembre.point_caisse_actif, true));
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableMembre.nom,
			tableMembre.pseudonyme,
			tableMembre.telephone
		)
	);
	const membres = db
		.select()
		.from(tableMembre)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(tableMembre.nom))
		.limit(500)
		.all();
	res.json(
		membres.map((m) => ({
			id: m.id,
			nom: m.nom,
			pseudonyme: m.pseudonyme,
			photo: m.photo,
			photo_url: url(m.photo)
		}))
	);
});

/** Solde, date de la dernière opération et photo du titulaire choisi (F-S4-60). */
routeur.get('/pointages/titulaires/:id', membreRequis, (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	exigerOperateur(membre);
	const t = exigerTitulaire(membre, Number(req.params.id));
	res.json({
		id: t.id,
		nom: t.nom,
		pseudonyme: t.pseudonyme,
		photo: t.photo,
		photo_url: url(t.photo),
		solde_point_caisse: t.solde_point_caisse,
		date_dernier_pointage: t.date_dernier_pointage,
		point_caisse_actif: t.point_caisse_actif,
		a_un_code: !!t.code_pointage_hash
	});
});

/**
 * PIN du titulaire (ADR-0004), avec limitation des essais : 5 échecs en 15 minutes bloquent la
 * carte (protection contre la recherche du code par essais successifs).
 */
async function verifierPin(titulaire: Membre, pin: string): Promise<void> {
	const cle = `pin:${titulaire.id}`;
	const echecs =
		db
			.select({ n: sql<number>`count(*)` })
			.from(tentativeConnexion)
			.where(
				and(
					eq(tentativeConnexion.cle, cle),
					gte(tentativeConnexion.date_heure, new Date(Date.now() - PIN_FENETRE))
				)
			)
			.get()?.n ?? 0;
	if (echecs >= PIN_ECHECS_MAX) {
		throw erreur('Trop de codes erronés pour cette carte : réessayez dans 15 minutes.', {
			code_pin: 'Carte momentanément bloquée.'
		});
	}
	if (await verifierMotDePasse(pin.trim(), titulaire.code_pointage_hash)) return;

	// L'échec est journalisé même si l'opération est refusée.
	db.insert(tentativeConnexion).values({ cle }).run();
	if (echecs + 1 >= PIN_ECHECS_MAX) {
		db.insert(tableMessage)
			.values({
				membre_id: titulaire.id,
				de_la_frangine: true,
				texte:
					'Plusieurs codes de pointage erronés ont été saisis pour votre carte : elle est bloquée ' +
					"15 minutes. Si vous n'êtes pas à l'origine de ces essais, contactez la frangine. " +
					'Ne communiquez jamais votre code PIN.'
			})
			.run();
	}
	throw erreur('Le code de pointage est incorrect.', {
		code_pin: 'Le code de pointage est incorrect.'
	});
}

/** Versement ou retrait sur la carte d'un titulaire (F-S4-60 à F-S4-66). */
routeur.post('/pointages', membreRequis, async (req, res) => {
	exigerModuleEpargne();
	const membre = exigerMembre(req);
	exigerOperateur(membre);
	const donnees = valider(pointageEntreeSchema, req.body);

	const champs: Record<string, string> = {};
	const typesConnus: number[] = Object.values(VersementRetrait);
	if (!donnees.type_operation || !typesConnus.includes(donnees.type_operation)) {
		champs.type_operation = "Veuillez indiquer le type de l'opération.";
	}
	if (!donnees.membre_id) champs.membre_id = 'Veuillez indiquer le membre.';
	if (donnees.montant <= 0) champs.montant = 'Veuillez indiquer le montant.';
	if (!donnees.code_pin.trim()) champs.code_pin = 'Veuillez indiquer le code de pointage.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const t = exigerTitulaire(membre, donnees.membre_id);
	if (!t.code_pointage_hash) {
		throw erreur(
			"Ce membre n'a pas encore de code de pointage : il doit le demander à la frangine.",
			{ code_pin: 'Aucun code de pointage attribué à ce membre.' }
		);
	}
	await verifierPin(t, donnees.code_pin);

	const maintenant = new Date();
	const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
	const doublon = db
		.select({ id: pointCaisse.id })
		.from(pointCaisse)
		.where(
			and(
				gte(pointCaisse.date_heure, debutJour),
				lte(pointCaisse.date_heure, new Date(debutJour.getTime() + 86_400_000 - 1)),
				eq(pointCaisse.type_operation, donnees.type_operation!),
				eq(pointCaisse.membre_id, t.id),
				eq(pointCaisse.montant, donnees.montant)
			)
		)
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce pointage est déjà enregistré.');

	const solde = t.solde_point_caisse;
	const retrait = donnees.type_operation === VersementRetrait.RETRAIT;
	// Règle des 97 % sur le solde lu en base (ADR-0007 S4d) : refus si montant ≥ 97 % du solde.
	if (retrait && donnees.montant * 100 >= solde * RETENTION_POURCENT) {
		throw erreur('Impossible de faire un retrait, Le solde est inférieur au montant demandé.', {
			montant: `Solde du membre : ${montantLisible(solde)} FCFA (97 % maximum, montant exclu).`
		});
	}

	const mouvement = retrait ? -donnees.montant : donnees.montant;
	const p = db.transaction(() => {
		const nouveauSolde = solde + mouvement;
		db.update(tableMembre)
			.set({ solde_point_caisse: nouveauSolde, date_dernier_pointage: maintenant })
			.where(eq(tableMembre.id, t.id))
			.run();
		// Effet miroir (modèle « agent ») : la caisse de l'opérateur varie du même montant, même signe.
		db.update(tableMembre)
			.set({ solde_point_caisse: membre.solde_point_caisse + mouvement })
			.where(eq(tableMembre.id, membre.id))
			.run();

		const cree = db
			.insert(pointCaisse)
			.values({
				// Générée après validation (ADR-0007 S4d).
				reference: nouvelleReference(Prefixe.POINT_CAISSE),
				date_heure: maintenant,
				operateur_id: membre.id,
				membre_id: t.id,
				type_operation: donnees.type_operation!,
				montant: donnees.montant,
				motif: donnees.motif.trim(),
				solde_apres: nouveauSolde,
				type_caisse: membre.type_compte === 1 ? TypeCaisse.ENCAISSE : TypeCaisse.OPERATION
			})
			.returning()
			.get()!;

		const quoi = retrait ? 'retrait' : 'versement';
		db.insert(tableMessage)
			.values({
				membre_id: t.id,
				de_la_frangine: true,
				texte:
					`Carte de pointage : ${quoi} de ${montantLisible(donnees.montant)} FCFA enregistré par ` +
					`${membre.nom} (référence ${cree.reference}). Nouveau solde : ` +
					`${montantLisible(nouveauSolde)} FCFA. Si vous n'êtes pas à l'origine de cette ` +
					'opération, contactez immédiatement la frangine.'
			})
			.run();
		return cree;
	});

	res.status(201).json(ok('Pointage effectué.', p.id, p.reference));
});
