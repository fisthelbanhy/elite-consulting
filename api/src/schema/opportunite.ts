/**
 * Opportunité d'affaire : souscription distributeur, business plan, partenariat & troc
 * (portage de `app/models/opportunite.py` ; legacy : souscriptoportuniteaffaire,
 * membreoportuniteaffaire, produitoportuniteaffaire, businessplan, partenariat).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { dateSeule, horodatage, json, texteVide } from '../db.js';
import { Etat } from '../enums.js';
import { produit } from './commerce.js';
import { membre } from './membres.js';

/** Une formation du parcours : `{prestation: 1..4, date, lieu, heure}`. */
export interface FormationSouscription {
	prestation: number;
	date?: string | null;
	lieu?: string | null;
	heure?: string | null;
}

/** Un filleul / intéressé : `{nom, email, adresse, montant, date_presentation}`. */
export interface FilleulSouscription {
	nom?: string | null;
	email?: string | null;
	adresse?: string | null;
	montant?: number | null;
	date_presentation?: string | null;
}

/** Parcours d'adhésion distributeur (1 par membre). */
export const souscription = sqliteTable('souscription', {
	id: integer('id').primaryKey(),
	...horodatage,
	reference: texteVide('reference'),
	membre_id: integer('membre_id')
		.notNull()
		.unique()
		.references(() => membre.id),
	/** Étape 1. */
	objectifs: texteVide('objectifs'),
	/** Étape 2. */
	mon_histoire: texteVide('mon_histoire'),
	/** Étape 3. */
	disponibilite_hebdo: integer('disponibilite_hebdo').notNull().default(0),
	formations: json<FormationSouscription[]>('formations')
		.notNull()
		.$defaultFn(() => []),
	/** Rendez-vous individuels. */
	nombre_rdv: integer('nombre_rdv').notNull().default(0),
	filleuls: json<FilleulSouscription[]>('filleuls')
		.notNull()
		.$defaultFn(() => []),
	/** `ModeSouscription`. */
	mode_souscription: integer('mode_souscription').notNull().default(0),
	/** Σ kit produit. */
	montant: integer('montant').notNull().default(0),
	date_limite_complement: dateSeule('date_limite_complement'),
	etape_courante: integer('etape_courante').notNull().default(1),
	etat: integer('etat').notNull().default(Etat.NON_TRAITE)
});

/** Liste de noms (jusqu'à 25 prospects) du futur distributeur. */
export const prospectSouscription = sqliteTable('prospect_souscription', {
	id: integer('id').primaryKey(),
	souscription_id: integer('souscription_id')
		.notNull()
		.references(() => souscription.id, { onDelete: 'cascade' }),
	membre_id: integer('membre_id').references(() => membre.id),
	nom_prenom: texteVide('nom_prenom'),
	telephone: texteVide('telephone'),
	email: texteVide('email'),
	commentaire: texteVide('commentaire'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Kit produit choisi à la souscription (prix figé). */
export const produitSouscription = sqliteTable('produit_souscription', {
	id: integer('id').primaryKey(),
	souscription_id: integer('souscription_id')
		.notNull()
		.references(() => souscription.id, { onDelete: 'cascade' }),
	produit_id: integer('produit_id')
		.notNull()
		.references(() => produit.id),
	prix_unitaire: integer('prix_unitaire').notNull().default(0),
	quantite: integer('quantite').notNull().default(1)
});

/** Auto-diagnostic « Business Plan » (1 par membre). Les commentaires `zoneNN` sont ceux du legacy. */
export const businessPlan = sqliteTable('business_plan', {
	id: integer('id').primaryKey(),
	...horodatage,
	reference: texteVide('reference'),
	membre_id: integer('membre_id')
		.notNull()
		.unique()
		.references(() => membre.id),
	type_activite: texteVide('type_activite'), // zone02
	description_projet: texteVide('description_projet'), // zone03
	moyens_actuels: texteVide('moyens_actuels'), // zone04
	ressources_disponibles: texteVide('ressources_disponibles'), // zone05
	possessions: texteVide('possessions'), // zone06
	organisation_actuelle: texteVide('organisation_actuelle'), // zone07
	organisation_souhaitee: texteVide('organisation_souhaitee'), // zone08
	detail_besoin: texteVide('detail_besoin'), // zone09
	apport_actuel: texteVide('apport_actuel'), // zone10
	ambition: texteVide('ambition'), // zone11
	strategie_resultats: texteVide('strategie_resultats'), // zone12
	valeur_ajoutee: texteVide('valeur_ajoutee'), // zone13
	prevision_ca_benefice: texteVide('prevision_ca_benefice'), // zone14
	processus_activite: texteVide('processus_activite'), // zone15
	estimation_charges: texteVide('estimation_charges'), // zone16
	composantes_ca: texteVide('composantes_ca'), // zone17
	repartition_ca: texteVide('repartition_ca'), // zone18
	elements_environnementaux: texteVide('elements_environnementaux'), // zone19
	strategie_attaque: texteVide('strategie_attaque'), // zone20
	devis_chiffre_besoin: texteVide('devis_chiffre_besoin'), // zone21
	apport_prevu: texteVide('apport_prevu'), // zone22
	niveau_realisation: integer('niveau_realisation').notNull().default(0), // zone23 (%)
	difficultes_realisation: texteVide('difficultes_realisation'), // zone24
	planning_execution: texteVide('planning_execution'), // zone25
	difficultes_futures: texteVide('difficultes_futures'), // zone26
	etat: integer('etat').notNull().default(Etat.NON_TRAITE) // zone29
});

/** Proposition de partenariat ou de troc : ce que j'ai (actif) / ce que je cherche. */
export const partenariat = sqliteTable(
	'partenariat',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		actif: texteVide('actif'),
		description: texteVide('description'),
		recherche: texteVide('recherche'),
		objectif: texteVide('objectif'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_partenariat_reference').on(t.reference)]
);
