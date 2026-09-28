/**
 * Référentiels et paramètres globaux (portage de `app/models/core.py` ; legacy : parametre,
 * ville, quartier, secteuractivite, domaineactivite, diplome, familart, banque, visite).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { booleen, dateHeure, maintenant, texteVide } from '../db.js';
import { Etat } from '../enums.js';

/** Singleton de configuration (legacy `parametre`, indexpmt=1). */
export const parametre = sqliteTable('parametre', {
	id: integer('id').primaryKey(),
	nom_site: text('nom_site').notNull().default('La Frangine'),
	adresse: texteVide('adresse'),
	telephone_1: texteVide('telephone_1'),
	telephone_2: texteVide('telephone_2'),
	email: texteVide('email'),
	whatsapp: texteVide('whatsapp'),
	texte_aide: texteVide('texte_aide'),
	montant_minimum_placement: integer('montant_minimum_placement').notNull().default(0),
	montant_minimum_course: integer('montant_minimum_course').notNull().default(0),
	commission_course: integer('commission_course').notNull().default(0),
	conditions_course: texteVide('conditions_course'),
	// Textes de présentation des 7 sections (choix1pmt..choix7pmt)
	description_section_1: texteVide('description_section_1'),
	description_section_2: texteVide('description_section_2'),
	description_section_3: texteVide('description_section_3'),
	description_section_4: texteVide('description_section_4'),
	description_section_5: texteVide('description_section_5'),
	description_section_6: texteVide('description_section_6'),
	description_section_7: texteVide('description_section_7'),
	// Interrupteurs des modules à risque réglementaire (ADR-0009)
	module_epargne_actif: booleen('module_epargne_actif').notNull().default(true),
	module_sante_actif: booleen('module_sante_actif').notNull().default(true),
	// Compteurs de séquences (formats de références identiques au legacy)
	compteur_membre: integer('compteur_membre').notNull().default(0),
	compteur_reference: integer('compteur_reference').notNull().default(0)
});

export const ville = sqliteTable('ville', {
	id: integer('id').primaryKey(),
	nom: text('nom').notNull().unique()
});

export const quartier = sqliteTable('quartier', {
	id: integer('id').primaryKey(),
	ville_id: integer('ville_id')
		.notNull()
		.references(() => ville.id),
	nom: text('nom').notNull()
});

export const secteurActivite = sqliteTable('secteur_activite', {
	id: integer('id').primaryKey(),
	libelle: text('libelle').notNull(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

export const domaineActivite = sqliteTable('domaine_activite', {
	id: integer('id').primaryKey(),
	secteur_id: integer('secteur_id').references(() => secteurActivite.id),
	libelle: text('libelle').notNull(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

export const diplome = sqliteTable('diplome', {
	id: integer('id').primaryKey(),
	code: texteVide('code'),
	libelle: text('libelle').notNull().unique()
});

export const familleArticle = sqliteTable('famille_article', {
	id: integer('id').primaryKey(),
	libelle: text('libelle').notNull().unique()
});

/** Référentiel des banques partenaires (legacy `banque`). */
export const banque = sqliteTable('banque', {
	id: integer('id').primaryKey(),
	// La référence vers `membre` est posée en SQL par la migration : `banque` est déclarée avant
	// `membre`, et une référence croisée ici créerait un cycle d'imports entre modules.
	membre_id: integer('membre_id'),
	sigle: texteVide('sigle'),
	nom: texteVide('nom'),
	telephones: texteVide('telephones'),
	adresse: texteVide('adresse'),
	email: texteVide('email'),
	site_web: texteVide('site_web'),
	nom_contact: texteVide('nom_contact'),
	telephone_contact: texteVide('telephone_contact'),
	observation: texteVide('observation'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Journal des visites anonymes (1 ligne par IP et par tranche de 30 minutes). */
export const visite = sqliteTable(
	'visite',
	{
		id: integer('id').primaryKey(),
		membre_id: integer('membre_id'),
		date_heure: dateHeure('date_heure').notNull().$defaultFn(maintenant),
		adresse_ip: texteVide('adresse_ip')
	},
	(t) => [
		index('ix_visite_date_heure').on(t.date_heure),
		index('ix_visite_adresse_ip').on(t.adresse_ip)
	]
);
