/**
 * Entreprises, comparateur de prix, marchés, projets, réussites (portage de
 * `app/models/entreprises.py` ; legacy : entreprise, prospective1, prospective2,
 * produitprospective, marche, projet, reussite).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { consultable, dateSeule, horodatage, texteVide } from '../db.js';
import { Etat } from '../enums.js';
import { domaineActivite, secteurActivite, ville } from './core.js';
import { membre } from './membres.js';

export const entreprise = sqliteTable(
	'entreprise',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		...consultable,
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		secteur_id: integer('secteur_id').references(() => secteurActivite.id),
		domaine_id: integer('domaine_id').references(() => domaineActivite.id),
		nom: text('nom').notNull(),
		forme_juridique: integer('forme_juridique').notNull().default(0),
		capital_social: integer('capital_social').notNull().default(0),
		description: texteVide('description'),
		commentaire: texteVide('commentaire'),
		gerant: texteVide('gerant'),
		telephone: texteVide('telephone'),
		email: texteVide('email'),
		site_web: texteVide('site_web'),
		adresse: texteVide('adresse'),
		ville_id: integer('ville_id').references(() => ville.id),
		logo: text('logo'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [index('ix_entreprise_reference').on(t.reference)]
);

/** Catalogue libre du comparateur de prix (créé à la volée). */
export const produitProspective = sqliteTable('produit_prospective', {
	id: integer('id').primaryKey(),
	nom: text('nom').notNull().unique(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Fiche comparateur de prix d'une entreprise (1 par entreprise). */
export const ficheProspective = sqliteTable('fiche_prospective', {
	id: integer('id').primaryKey(),
	membre_id: integer('membre_id').references(() => membre.id),
	entreprise_id: integer('entreprise_id')
		.notNull()
		.unique()
		.references(() => entreprise.id),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/**
 * Offre (je vends) ou demande (j'achète) d'un produit, avec prix et volume mensuel.
 * Suppression physique (comme le legacy).
 */
export const ligneProspective = sqliteTable(
	'ligne_prospective',
	{
		id: integer('id').primaryKey(),
		fiche_id: integer('fiche_id')
			.notNull()
			.references(() => ficheProspective.id, { onDelete: 'cascade' }),
		/** `OffreDemande`. */
		offre_ou_demande: integer('offre_ou_demande').notNull(),
		produit_id: integer('produit_id')
			.notNull()
			.references(() => produitProspective.id),
		unite_vente: texteVide('unite_vente'),
		prix: integer('prix').notNull().default(0),
		fournisseur_ou_client: texteVide('fournisseur_ou_client'),
		quantite_mensuelle: integer('quantite_mensuelle').notNull().default(0),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_ligne_prospective_produit_id').on(t.produit_id)]
);

/** Appel d'offres public ou privé. */
export const marche = sqliteTable(
	'marche',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		numero_appel_offre: texteVide('numero_appel_offre'),
		/** `Confidentialite` (1 privé, 2 public). */
		type_marche: integer('type_marche').notNull().default(2),
		libelle: texteVide('libelle'),
		description: texteVide('description'),
		montant: integer('montant').notNull().default(0),
		date_limite: dateSeule('date_limite'),
		dossier_a_fournir: texteVide('dossier_a_fournir'),
		lieu_depot: texteVide('lieu_depot'),
		email: texteVide('email'),
		maitre_ouvrage: texteVide('maitre_ouvrage'),
		publie_par: texteVide('publie_par'),
		beneficiaire: texteVide('beneficiaire'),
		document: text('document'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_marche_reference').on(t.reference)]
);

/** Projet recherchant partenaires ou prestataires (onglet « Projets »). */
export const projet = sqliteTable(
	'projet',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		responsable: texteVide('responsable'),
		promoteur: texteVide('promoteur'),
		objet: texteVide('objet'),
		libelle: texteVide('libelle'),
		objectif: texteVide('objectif'),
		description: texteVide('description'),
		adresse: texteVide('adresse'),
		duree_mois: integer('duree_mois').notNull().default(0),
		date_lancement: dateSeule('date_lancement'),
		conditions: texteVide('conditions'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_projet_reference').on(t.reference)]
);

/** Témoignage de réussite entrepreneuriale (1 par membre, publié après validation). */
export const reussite = sqliteTable('reussite', {
	id: integer('id').primaryKey(),
	...horodatage,
	reference: texteVide('reference'),
	membre_id: integer('membre_id')
		.notNull()
		.unique()
		.references(() => membre.id),
	secteur_id: integer('secteur_id').references(() => secteurActivite.id),
	situation_avant: texteVide('situation_avant'),
	vision: texteVide('vision'),
	projet: texteVide('projet'),
	fond_demarrage: integer('fond_demarrage').notNull().default(0),
	besoin_reel_demarrage: integer('besoin_reel_demarrage').notNull().default(0),
	strategie: texteVide('strategie'),
	difficultes: texteVide('difficultes'),
	deploiement_efforts: texteVide('deploiement_efforts'),
	succes: texteVide('succes'),
	conseil: texteVide('conseil'),
	photo: text('photo'),
	etat: integer('etat').notNull().default(Etat.NON_TRAITE)
});
