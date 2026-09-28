/**
 * Offres financières : conseil financier, trésorerie, accompagnement, benchmarking (portage de
 * `app/models/finance.py` ; legacy : conseilfinance, placement, operatbanq, demandecredit,
 * contentcredit, acomp* ×4, benchmarking1/2/3).
 */
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { dateHeure, dateSeule, horodatage, json, texteVide } from '../db.js';
import { Confidentialite, Etat } from '../enums.js';
import { banque } from './core.js';
import { membre } from './membres.js';

/** Forum des offres financières (3 rubriques : conseil, rumeurs économiques, accompagnement). */
export const conseilFinance = sqliteTable(
	'conseil_finance',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		/** `RubriqueConseilFinance`. */
		rubrique: integer('rubrique').notNull().default(1),
		reference: texteVide('reference'),
		sujet_id: integer('sujet_id').references((): AnySQLiteColumn => conseilFinance.id),
		objet: texteVide('objet'),
		texte: texteVide('texte'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		auteur_sujet_id: integer('auteur_sujet_id').references(() => membre.id),
		confidentialite: integer('confidentialite').notNull().default(Confidentialite.PUBLIC),
		nombre_reponses: integer('nombre_reponses').notNull().default(0),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [
		index('ix_conseil_finance_rubrique').on(t.rubrique),
		index('ix_conseil_finance_reference').on(t.reference),
		index('ix_conseil_finance_sujet_id').on(t.sujet_id)
	]
);

/** Demande de placement (dépôt à terme / investissement). */
export const placement = sqliteTable(
	'placement',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		/** `TypePlacement`. */
		type_placement: integer('type_placement').notNull().default(1),
		date_placement: dateHeure('date_placement')
			.notNull()
			.$defaultFn(() => new Date()),
		montant: integer('montant').notNull().default(0),
		duree_mois: integer('duree_mois').notNull().default(0),
		taux: real('taux').notNull().default(0),
		banque: texteVide('banque'),
		secteur_activite: texteVide('secteur_activite'),
		observation: texteVide('observation'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_placement_reference').on(t.reference)]
);

/** Ordre de virement transmis à la banque par e-mail, avec suivi d'état. */
export const operationBanque = sqliteTable(
	'operation_banque',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		date_saisie: dateHeure('date_saisie')
			.notNull()
			.$defaultFn(() => new Date()),
		date_operation: dateSeule('date_operation'),
		montant: integer('montant').notNull().default(0),
		/** `Devise`. */
		devise: integer('devise').notNull().default(1),
		/** `TypeOperationBanque`. */
		type_operation: integer('type_operation').notNull().default(0),
		banque_emettrice_id: integer('banque_emettrice_id').references(() => banque.id),
		banque_emettrice_nom: texteVide('banque_emettrice_nom'),
		banque_emettrice_email: texteVide('banque_emettrice_email'),
		beneficiaire: texteVide('beneficiaire'),
		banque_beneficiaire_id: integer('banque_beneficiaire_id').references(() => banque.id),
		banque_beneficiaire_nom: texteVide('banque_beneficiaire_nom'),
		banque_beneficiaire_adresse: texteVide('banque_beneficiaire_adresse'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_operation_banque_reference').on(t.reference)]
);

export const demandeCredit = sqliteTable(
	'demande_credit',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		date_demande: dateSeule('date_demande')
			.notNull()
			.$defaultFn(() => new Date()),
		montant: integer('montant').notNull().default(0),
		objet: texteVide('objet'),
		duree_mois: integer('duree_mois').notNull().default(0),
		niveau_realisation: real('niveau_realisation').notNull().default(0),
		garantie: texteVide('garantie'),
		delai_reponse_jours: integer('delai_reponse_jours').notNull().default(0),
		/** Observation + choix des banques. */
		observation: texteVide('observation'),
		devis_global: texteVide('devis_global'),
		apport_propre: texteVide('apport_propre'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_demande_credit_reference').on(t.reference)]
);

/**
 * Dossier de contentieux / restructuration de dette (legacy `contentcredit`) :
 * chaque montant est accompagné de son détail.
 */
export const contentieuxCredit = sqliteTable(
	'contentieux_credit',
	{
		id: integer('id').primaryKey(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		date_dossier: dateHeure('date_dossier')
			.notNull()
			.$defaultFn(() => new Date()),
		dette_compromise: integer('dette_compromise').notNull().default(0), // zone04
		dette_compromise_detail: texteVide('dette_compromise_detail'),
		revenus_journaliers: integer('revenus_journaliers').notNull().default(0), // zone05
		revenus_journaliers_detail: texteVide('revenus_journaliers_detail'),
		revenus_hebdomadaires: integer('revenus_hebdomadaires').notNull().default(0), // zone06
		revenus_hebdomadaires_detail: texteVide('revenus_hebdomadaires_detail'),
		revenus_mensuels: integer('revenus_mensuels').notNull().default(0), // zone07
		revenus_mensuels_detail: texteVide('revenus_mensuels_detail'),
		charges_fixes: integer('charges_fixes').notNull().default(0), // zone08
		charges_fixes_detail: texteVide('charges_fixes_detail'),
		charges_variables: integer('charges_variables').notNull().default(0), // zone09
		charges_variables_detail: texteVide('charges_variables_detail'),
		activites_en_cours: texteVide('activites_en_cours'), // zone10
		entrees_activite_en_cours: integer('entrees_activite_en_cours').notNull().default(0), // zone11
		entrees_activite_en_cours_detail: texteVide('entrees_activite_en_cours_detail'),
		activite_previsionnelle: texteVide('activite_previsionnelle'), // zone12
		entrees_previsionnelles: integer('entrees_previsionnelles').notNull().default(0), // zone13
		entrees_previsionnelles_detail: texteVide('entrees_previsionnelles_detail'),
		entrees_totales: integer('entrees_totales').notNull().default(0), // zone14
		entrees_totales_detail: texteVide('entrees_totales_detail'),
		echeance_actuelle: texteVide('echeance_actuelle'), // zone15
		echeance_supportable: integer('echeance_supportable').notNull().default(0), // zone16
		echeance_supportable_detail: texteVide('echeance_supportable_detail'),
		elements_favorables: texteVide('elements_favorables'), // zone17
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_contentieux_credit_reference').on(t.reference)]
);

/**
 * Les 4 questionnaires d'accompagnement (business plan bancable, projet agricole,
 * restructuration de crédit, crédit immobilier) — réponses indexées par n° de zone legacy.
 */
export const dossierAccompagnement = sqliteTable(
	'dossier_accompagnement',
	{
		id: integer('id').primaryKey(),
		/** `TypeAccompagnement`. */
		type_dossier: integer('type_dossier').notNull(),
		reference: texteVide('reference'),
		membre_id: integer('membre_id').references(() => membre.id),
		date_creation: dateHeure('date_creation')
			.notNull()
			.$defaultFn(() => new Date()),
		/** zone03. */
		objet: texteVide('objet'),
		/** `{"4": "…", "5": "…"}`. */
		reponses: json<Record<string, string>>('reponses')
			.notNull()
			.$defaultFn(() => ({})),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [
		index('ix_dossier_accompagnement_type_dossier').on(t.type_dossier),
		index('ix_dossier_accompagnement_reference').on(t.reference)
	]
);

/** Benchmarking bancaire niveau 1 : type d'opération (ex. « Virements »). */
export const benchType = sqliteTable('bench_type', {
	id: integer('id').primaryKey(),
	libelle: text('libelle').notNull(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Niveau 2 : opération détaillée (ex. « Virement entre les banques zone CEMAC »). */
export const benchOperation = sqliteTable('bench_operation', {
	id: integer('id').primaryKey(),
	type_id: integer('type_id')
		.notNull()
		.references(() => benchType.id),
	libelle: text('libelle').notNull(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Niveau 3 : tarif pratiqué par une banque pour une opération (texte libre). */
export const benchTarif = sqliteTable('bench_tarif', {
	id: integer('id').primaryKey(),
	operation_id: integer('operation_id')
		.notNull()
		.references(() => benchOperation.id),
	banque_id: integer('banque_id')
		.notNull()
		.references(() => banque.id),
	tarif: texteVide('tarif'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});
