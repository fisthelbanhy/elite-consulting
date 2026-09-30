/**
 * Ressources humaines et expressions d'intérêt (portage de `app/models/rh.py` ;
 * legacy : humaine, besoin).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { consultable, dateHeure, dateSeule, horodatage, maintenant, texteVide } from '../db.js';
import { Etat, Sexe, TypeInteret } from '../enums.js';
import { domaineActivite, secteurActivite } from './core.js';
import { article, immobilier } from './commerce.js';
import { membre } from './membres.js';
import { partenariat } from './opportunite.js';

/** Demande d'emploi (type 1, réf. DEI…) ou offre d'emploi (type 2, réf. OE1…). */
export const annonceEmploi = sqliteTable(
	'annonce_emploi',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		...consultable,
		auteur_id: integer('auteur_id').references(() => membre.id),
		type_annonce: integer('type_annonce').notNull(),
		reference: texteVide('reference'),
		secteur_id: integer('secteur_id').references(() => secteurActivite.id),
		domaine_id: integer('domaine_id').references(() => domaineActivite.id),
		nom: texteVide('nom'),
		prenom: texteVide('prenom'),
		sexe: integer('sexe').notNull().default(Sexe.INDEFINI),
		date_naissance: dateSeule('date_naissance'),
		adresse: texteVide('adresse'),
		telephone: texteVide('telephone'),
		email: texteVide('email'),
		diplomes: texteVide('diplomes'),
		savoir_faire: texteVide('savoir_faire'),
		experience: texteVide('experience'),
		experience_2: texteVide('experience_2'),
		competences: texteVide('competences'),
		poste_a_pourvoir: texteVide('poste_a_pourvoir'),
		autres_informations: texteVide('autres_informations'),
		photo: text('photo'),
		cv: text('cv'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [
		index('ix_annonce_emploi_type_annonce').on(t.type_annonce),
		index('ix_annonce_emploi_reference').on(t.reference)
	]
);

/**
 * Expression de besoin ou d'intérêt déposée par un membre sous une fiche (annonce d'emploi,
 * bien immobilier, article, partenariat). Une seule cible par ligne.
 * `type_objet` reprend `besoin.typebsn` du legacy.
 */
export const interet = sqliteTable(
	'interet',
	{
		id: integer('id').primaryKey(),
		type_objet: integer('type_objet').notNull(),
		sous_type: integer('sous_type').notNull().default(TypeInteret.INTERESSEMENT),
		membre_id: integer('membre_id').references(() => membre.id),
		annonce_emploi_id: integer('annonce_emploi_id').references(() => annonceEmploi.id),
		immobilier_id: integer('immobilier_id').references(() => immobilier.id),
		article_id: integer('article_id').references(() => article.id),
		partenariat_id: integer('partenariat_id').references(() => partenariat.id),
		message: texteVide('message'),
		date_creation: dateHeure('date_creation').notNull().$defaultFn(maintenant),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [
		index('ix_interet_annonce_emploi_id').on(t.annonce_emploi_id),
		index('ix_interet_immobilier_id').on(t.immobilier_id),
		index('ix_interet_article_id').on(t.article_id),
		index('ix_interet_partenariat_id').on(t.partenariat_id)
	]
);
