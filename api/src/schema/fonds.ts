/**
 * Appels de fonds, Likelemba, épargne solidaire, carte de pointage (portage de
 * `app/models/fonds.py` ; legacy : appelfond, collectefond, mouvcollectefond, likelemba1/2/3,
 * fonddesoutien, pointcaisse).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { consultable, dateHeure, dateSeule, horodatage, json, texteVide } from '../db.js';
import { Etat, OuiNon } from '../enums.js';
import { paiement } from './commerce.js';
import { secteurActivite, ville } from './core.js';
import { entreprise } from './entreprises.js';
import { membre } from './membres.js';

/**
 * Projet en recherche de financement participatif. `montant_promis` et `montant_collecte`
 * sont des agrégats calculés par le service (jamais saisis).
 */
export const appelFond = sqliteTable(
	'appel_fond',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		...consultable,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		entreprise_id: integer('entreprise_id').references(() => entreprise.id),
		secteur_id: integer('secteur_id').references(() => secteurActivite.id),
		ville_id: integer('ville_id').references(() => ville.id),
		nom_projet: text('nom_projet').notNull(),
		objet_projet: texteVide('objet_projet'),
		description_activite: texteVide('description_activite'),
		description_projet: texteVide('description_projet'),
		devis_projet: integer('devis_projet').notNull().default(0),
		apport_fond_propre: integer('apport_fond_propre').notNull().default(0),
		besoin_financement: integer('besoin_financement').notNull().default(0),
		/** Pourcentage. */
		niveau_realisation: integer('niveau_realisation').notNull().default(0),
		nom_promoteur: texteVide('nom_promoteur'),
		telephone_promoteur: texteVide('telephone_promoteur'),
		email_promoteur: texteVide('email_promoteur'),
		adresse_promoteur: texteVide('adresse_promoteur'),
		observation_gestionnaire: texteVide('observation_gestionnaire'),
		/** Note sur 10. */
		appreciation: integer('appreciation').notNull().default(0),
		montant_promis: integer('montant_promis').notNull().default(0),
		montant_collecte: integer('montant_collecte').notNull().default(0),
		presentation_pdf: text('presentation_pdf'),
		photo: text('photo'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [index('ix_appel_fond_reference').on(t.reference)]
);

/**
 * Engagement d'apport d'un membre sur un appel de fonds.
 * État : 1 promesse, 2 validée (comptée dans « promis »), 3 annulée.
 */
export const collecteFond = sqliteTable(
	'collecte_fond',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		appel_fond_id: integer('appel_fond_id')
			.notNull()
			.references(() => appelFond.id),
		membre_id: integer('membre_id').references(() => membre.id),
		date_engagement: dateSeule('date_engagement'),
		/** `TypeApportFond`. */
		type_apport: integer('type_apport').notNull().default(1),
		montant_promis: integer('montant_promis').notNull().default(0),
		echeance_mois: integer('echeance_mois').notNull().default(0),
		montant_verse: integer('montant_verse').notNull().default(0),
		date_dernier_versement: dateSeule('date_dernier_versement'),
		remarque: texteVide('remarque'),
		observation_mediateur: texteVide('observation_mediateur'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [
		index('ix_collecte_fond_reference').on(t.reference),
		index('ix_collecte_fond_appel_fond_id').on(t.appel_fond_id)
	]
);

/** Journal des versements (legacy `mouvcollectefond`, append-only). */
export const versementCollecte = sqliteTable(
	'versement_collecte',
	{
		id: integer('id').primaryKey(),
		collecte_id: integer('collecte_id')
			.notNull()
			.references(() => collecteFond.id),
		date_versement: dateSeule('date_versement')
			.notNull()
			.$defaultFn(() => new Date()),
		montant: integer('montant').notNull(),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_versement_collecte_collecte_id').on(t.collecte_id)]
);

/** Tontine rotative (legacy `likelemba1`). Code `LKB` + mois + n + année. */
export const groupeLikelemba = sqliteTable(
	'groupe_likelemba',
	{
		id: integer('id').primaryKey(),
		code: texteVide('code'),
		responsable_id: integer('responsable_id').references(() => membre.id),
		montant_cotisation: integer('montant_cotisation').notNull().default(0),
		/** `Periodicite`. */
		periodicite: integer('periodicite').notNull().default(1),
		date_debut: dateSeule('date_debut'),
		observation: texteVide('observation'),
		/** Génère `{n}{code}`. */
		compteur_entrees: integer('compteur_entrees').notNull().default(0),
		/** Génère `{code}P{n}`. */
		compteur_paiements: integer('compteur_paiements').notNull().default(0),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_groupe_likelemba_code').on(t.code)]
);

/** Un témoin de l'adhésion Likelemba. */
export interface TemoinLikelemba {
	nom?: string | null;
	telephone?: string | null;
	emploi?: string | null;
	est_membre?: number | null;
}

/** Adhésion d'un membre à un groupe Likelemba, avec caution et 3 témoins. */
export const membreLikelemba = sqliteTable(
	'membre_likelemba',
	{
		id: integer('id').primaryKey(),
		groupe_id: integer('groupe_id')
			.notNull()
			.references(() => groupeLikelemba.id),
		membre_id: integer('membre_id').references(() => membre.id),
		code: texteVide('code'),
		date_entree: dateSeule('date_entree'),
		observation: texteVide('observation'),
		caution_nom: texteVide('caution_nom'),
		caution_est_membre: integer('caution_est_membre').notNull().default(OuiNon.OUI),
		caution_piece_identite: texteVide('caution_piece_identite'),
		caution_adresse: texteVide('caution_adresse'),
		caution_activite: texteVide('caution_activite'),
		caution_telephone: texteVide('caution_telephone'),
		/** Liste de 3 objets `{nom, telephone, emploi, est_membre}`. */
		temoins: json<TemoinLikelemba[]>('temoins')
			.notNull()
			.$defaultFn(() => []),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_membre_likelemba_groupe_id').on(t.groupe_id)]
);

/** Cotisation versée (legacy `likelemba3`), reçu `{code_groupe}P{n}`. */
export const cotisationLikelemba = sqliteTable(
	'cotisation_likelemba',
	{
		id: integer('id').primaryKey(),
		groupe_id: integer('groupe_id')
			.notNull()
			.references(() => groupeLikelemba.id),
		adhesion_id: integer('adhesion_id').references(() => membreLikelemba.id),
		caissier_id: integer('caissier_id').references(() => membre.id),
		numero_recu: texteVide('numero_recu'),
		date_paiement: dateSeule('date_paiement'),
		montant: integer('montant').notNull().default(0),
		mode_paiement: integer('mode_paiement').notNull().default(0),
		code_transfert: texteVide('code_transfert'),
		observation: texteVide('observation'),
		etat: integer('etat').notNull().default(Etat.AUTORISE),
		/**
		 * Paiement (type 5) à l'origine de la cotisation : permet d'annuler la bonne cotisation si
		 * la caisse rejette le paiement (ADR-0007 S3b/S4b). Vide pour les cotisations reprises du
		 * legacy.
		 */
		paiement_id: integer('paiement_id').references(() => paiement.id)
	},
	(t) => [index('ix_cotisation_likelemba_groupe_id').on(t.groupe_id)]
);

/**
 * Épargne solidaire : don ou placement, souscrit par un « rapporteur » au nom d'un
 * « souscripteur » (qui peut être lui-même).
 */
export const fondDeSoutien = sqliteTable(
	'fond_de_soutien',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		date_souscription: dateSeule('date_souscription'),
		/** `DonPlacement`. */
		type_fond: integer('type_fond').notNull().default(1),
		rapporteur_id: integer('rapporteur_id').references(() => membre.id),
		rapporteur_nom: texteVide('rapporteur_nom'),
		souscripteur_id: integer('souscripteur_id').references(() => membre.id),
		souscripteur_nom: texteVide('souscripteur_nom'),
		motivation: texteVide('motivation'),
		montant: integer('montant').notNull().default(0),
		duree_mois: integer('duree_mois').notNull().default(0),
		mode_paiement: integer('mode_paiement').notNull().default(0),
		confirme: integer('confirme').notNull().default(OuiNon.NON),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_fond_de_soutien_reference').on(t.reference)]
);

/**
 * Journal append-only des mouvements de carte de pointage. Le solde courant vit dans
 * `membre.solde_point_caisse` ; `solde_apres` est une copie figée.
 */
export const pointCaisse = sqliteTable(
	'point_caisse',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		date_heure: dateHeure('date_heure')
			.notNull()
			.$defaultFn(() => new Date()),
		operateur_id: integer('operateur_id').references(() => membre.id),
		membre_id: integer('membre_id')
			.notNull()
			.references(() => membre.id),
		/** `VersementRetrait`. */
		type_operation: integer('type_operation').notNull(),
		montant: integer('montant').notNull(),
		motif: texteVide('motif'),
		solde_apres: integer('solde_apres').notNull().default(0),
		/** `TypeCaisse`. */
		type_caisse: integer('type_caisse').notNull().default(1)
	},
	(t) => [
		index('ix_point_caisse_reference').on(t.reference),
		index('ix_point_caisse_date_heure').on(t.date_heure),
		index('ix_point_caisse_membre_id').on(t.membre_id)
	]
);
