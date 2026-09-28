/**
 * Devenir distributeur Forever Living Products (portage de `app/routers/distributeur.py`) :
 * assistant d'adhésion en 10 étapes + paiement du kit (legacy choix5.php?opaf=1&ppa=3,
 * incl-adhesion.php ; F-S5-20 à F-S5-39) et suivi des souscriptions par les gestionnaires (écran
 * absent du legacy : `incl-choix5A3.php` manquant).
 *
 * Règles et paiement (type 6) : `services/distributeur.ts`.
 */
import { and, desc, eq, gte, inArray, ne, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat, ModeSouscription } from '../enums.js';
import { introuvable } from '../erreurs.js';
import { produit as tableProduit } from '../schema/commerce.js';
import { message as tableMessage } from '../schema/contenu.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { souscription as tableSouscription } from '../schema/opportunite.js';
import { dateFacultative, entier, ok, valider } from '../schemas/commun.js';
import * as svc from '../services/distributeur.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';

export const routeur = Router();
export const prefixe = '/distributeur';

type Souscription = typeof tableSouscription.$inferSelect;

const prospectSchema = z.object({
	// Limites élargies par rapport au legacy (30 / 9 / 30 / 120 caractères) : voir la doc du module.
	nom_prenom: z.string().max(60).default(''),
	telephone: z.string().max(20).default(''),
	email: z.string().max(120).default(''),
	commentaire: z.string().max(120).default('')
});

const formationSchema = z.object({
	// `Prestation` : POA, Journée de succès, Formation animateur, Formation manager.
	prestation: entier.min(1).max(4),
	date: dateFacultative,
	lieu: z.string().max(80).default(''),
	// Correctif F-S5-27 : plus de troncature à 8 caractères.
	heure: z.string().max(30).default('')
});

const filleulSchema = z.object({
	nom: z.string().max(60).default(''),
	email: z.string().max(120).default(''),
	adresse: z.string().max(120).default(''),
	// Correctif F-S5-30 : plus de limite à 127.
	montant: entier.min(0).max(100_000_000).default(0),
	date_presentation: dateFacultative
});

const ligneKitSchema = z.object({
	produit_id: entier,
	quantite: entier.min(0).max(999).default(0)
});

/**
 * Données d'une étape de l'assistant ; seuls les champs de l'étape `etape` sont pris en compte.
 * `avancer` : l'utilisateur passe à l'étape suivante (sinon simple sauvegarde / retour).
 */
const etapeEntreeSchema = z.object({
	etape: entier.min(1).max(9),
	avancer: z.coerce.boolean().default(true),
	// Étapes 1 à 3.
	objectifs: z.string().max(4000).default(''),
	mon_histoire: z.string().max(4000).default(''),
	disponibilite_hebdo: entier.min(0).max(3).default(0),
	// Étape 4.
	prospects: z.array(prospectSchema).max(25).default([]),
	date_limite_complement: dateFacultative,
	// Étape 5.
	formations: z.array(formationSchema).max(4).default([]),
	// Étape 7.
	nombre_rdv: entier.min(0).max(999).default(0),
	// Étape 8.
	filleuls: z.array(filleulSchema).max(3).default([]),
	// Étape 9 : « Sauvegarder » (`envoyer = false`) ou « Envoyer ».
	mode_souscription: entier.min(0).max(2).default(0),
	produits: z.array(ligneKitSchema).max(500).default([]),
	envoyer: z.coerce.boolean().default(false)
});

const etatEntreeSchema = z.object({ etat: entier.min(1).max(4) });

/** Identité et coordonnées du souscripteur : lui-même et les gestionnaires uniquement. */
function souscripteursDe(souscriptions: Souscription[]) {
	const ids = [...new Set(souscriptions.map((s) => s.membre_id))];
	if (ids.length === 0) return new Map<number, unknown>();
	return new Map(
		db
			.select({
				id: tableMembre.id,
				pseudonyme: tableMembre.pseudonyme,
				nom: tableMembre.nom,
				telephone: tableMembre.telephone,
				email: tableMembre.email
			})
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, m])
	);
}

function vueResume(s: Souscription, souscripteurs?: Map<number, unknown>) {
	return {
		id: s.id,
		reference: s.reference,
		date_creation: s.date_creation,
		mode_souscription: s.mode_souscription,
		montant: s.montant,
		etape_courante: s.etape_courante,
		etat: s.etat,
		membre: souscripteurs?.get(s.membre_id) ?? null,
		// `EtatPaiement` du dernier paiement déclaré (`null` = aucun).
		etat_paiement: svc.etatPaiement(s.id),
		envoyee: s.etape_courante >= svc.ETAPE_ENVOYEE
	};
}

function vueDetail(s: Souscription, membre: Membre) {
	const produits = new Map(
		db
			.select({ id: tableProduit.id, nom: tableProduit.nom })
			.from(tableProduit)
			.all()
			.map((p) => [p.id, p.nom])
	);
	return {
		...vueResume(s, souscripteursDe([s])),
		objectifs: s.objectifs,
		mon_histoire: s.mon_histoire,
		disponibilite_hebdo: s.disponibilite_hebdo,
		formations: s.formations,
		nombre_rdv: s.nombre_rdv,
		filleuls: s.filleuls,
		date_limite_complement: s.date_limite_complement,
		prospects: svc.prospectsDe(s.id).map((p) => ({
			id: p.id,
			nom_prenom: p.nom_prenom,
			telephone: p.telephone,
			email: p.email,
			commentaire: p.commentaire
		})),
		kit: svc.kitDe(s.id).map((p) => ({
			produit_id: p.produit_id,
			nom: produits.get(p.produit_id) ?? '',
			prix_unitaire: p.prix_unitaire,
			quantite: p.quantite,
			montant: p.prix_unitaire * p.quantite
		})),
		peut_moderer: peutModerer(membre)
	};
}

/** Où en est le lecteur (visiteur, membre, adhésion en cours, distributeur) ? */
routeur.get('/statut', (req, res) => {
	const membre = req.membre;
	if (!membre) {
		res.json({ connecte: false, gestionnaire: false, distributeur: false, souscription: null });
		return;
	}
	const souscription = svc.souscriptionDe(membre.id);
	res.json({
		connecte: true,
		gestionnaire: membre.type_compte === 1,
		distributeur: svc.estDistributeur(membre),
		souscription: souscription ? vueResume(souscription) : null
	});
});

/**
 * Produits proposés pour le kit de démarrage : **tous** les produits actifs ayant un prix
 * distributeur (ADR-0007 S5b), triés par nom comme le legacy.
 */
routeur.get('/kit', membreRequis, (_req, res) => {
	res.json(
		svc.produitsDuKit().map((p) => ({
			id: p.id,
			reference: p.reference,
			nom: p.nom,
			groupe: p.groupe,
			prix_distributeur: p.prix_distributeur,
			photo: p.photo,
			photo_url: url(p.photo)
		}))
	);
});

/** Souscription du membre connecté (pré-remplissage de l'assistant, F-S5-22), ou `null`. */
routeur.get('/souscription', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const souscription = svc.souscriptionDe(membre.id);
	res.json(souscription ? vueDetail(souscription, membre) : null);
});

/**
 * Sauvegarde d'une étape (création de la souscription à la première sauvegarde, référence
 * `SOA…`). Étape 9 : « Sauvegarder » sans contrôle, « Envoyer » avec les contrôles de montant
 * (F-S5-33). Après envoi en fonds propres, `a_payer` indique d'aller au paiement (type 6).
 */
routeur.put('/souscription', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(etapeEntreeSchema, req.body);
	const { souscription, message } = db.transaction(() => svc.enregistrerEtape(membre, donnees));

	const aPayer =
		donnees.etape === svc.DERNIERE_ETAPE &&
		donnees.envoyer &&
		souscription.mode_souscription === ModeSouscription.FOND_PROPRE &&
		!svc.ETATS_DISTRIBUTEUR.includes(souscription.etat);

	res.json({
		...ok(message, souscription.id, souscription.reference),
		etape_courante: souscription.etape_courante,
		a_payer: aPayer,
		montant: souscription.montant
	});
});

// --- Suivi des souscriptions (gestionnaires) ------------------------------------------------------

/**
 * Écran de suivi (F-S5-21, ADR-0007 S5c) : toutes les souscriptions, filtrables par état, mode
 * (les demandes à crédit envoyées sont à traiter par la frangine) et recherche (référence, membre).
 */
routeur.get('/souscriptions', gestionnaireRequis, (req, res) => {
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const brutEtat = Number(req.query.etat);
	const etat =
		Number.isFinite(brutEtat) && brutEtat >= 1 && brutEtat <= 4 ? Math.trunc(brutEtat) : null;
	conditions.push(
		etat ? eq(tableSouscription.etat, etat) : ne(tableSouscription.etat, Etat.SUPPRIME)
	);

	const brutMode = Number(req.query.mode);
	if (Number.isFinite(brutMode) && brutMode >= 1 && brutMode <= 2) {
		conditions.push(eq(tableSouscription.mode_souscription, Math.trunc(brutMode)));
	}
	if (req.query.envoyees !== undefined && req.query.envoyees !== 'false' && req.query.envoyees !== '0') {
		conditions.push(gte(tableSouscription.etape_courante, svc.ETAPE_ENVOYEE));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableSouscription.reference,
			tableMembre.nom,
			tableMembre.pseudonyme,
			tableMembre.telephone
		)
	);

	const requete = db
		.select({ souscription: tableSouscription })
		.from(tableSouscription)
		.innerJoin(tableMembre, eq(tableMembre.id, tableSouscription.membre_id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(tableSouscription.date_creation), desc(tableSouscription.id))
		.$dynamic();

	const liste = paginer<{ souscription: Souscription }>(requete, page);
	const items = liste.items.map((l) => l.souscription);
	const souscripteurs = souscripteursDe(items);
	res.json({
		items: items.map((s) => vueResume(s, souscripteurs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Fiche complète : le souscripteur lui-même ou un gestionnaire. */
routeur.get('/souscriptions/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const s = db
		.select()
		.from(tableSouscription)
		.where(eq(tableSouscription.id, Number(req.params.id)))
		.get();
	if (!s || !(membre.type_compte === 1 || s.membre_id === membre.id)) {
		throw introuvable('Souscription introuvable.');
	}
	res.json(vueDetail(s, membre));
});

/**
 * Traitement par un gestionnaire ayant le droit « Activation » : valider (2) une souscription à
 * crédit fait du membre un distributeur ; le membre est prévenu par la messagerie.
 */
routeur.post('/souscriptions/:id/etat', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const s = db
		.select()
		.from(tableSouscription)
		.where(eq(tableSouscription.id, Number(req.params.id)))
		.get();
	if (!s) throw introuvable('Souscription introuvable.');
	const donnees = valider(etatEntreeSchema, req.body);

	db.transaction(() => {
		changerEtat(tableSouscription, s.id, donnees.etat, membre);
		if (donnees.etat === Etat.AUTORISE && s.etat !== Etat.AUTORISE) {
			db.insert(tableMessage)
				.values({
					membre_id: s.membre_id,
					auteur_id: membre.id,
					de_la_frangine: true,
					texte:
						`Bonne nouvelle : votre souscription distributeur ${s.reference} est validée. ` +
						'Vous bénéficiez désormais du prix distributeur sur la boutique.'
				})
				.run();
		}
	});
	res.json(ok('Modification effectuée.', s.id));
});
