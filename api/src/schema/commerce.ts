/**
 * E-commerce, catalogue produit, panier et paiements (portage de `app/models/commerce.py` ;
 * legacy : produit, panier, payement, immobilier, article, articlecourse, course1, course2).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
	booleen,
	consultable,
	dateHeure,
	dateSeule,
	horodatage,
	maintenant,
	texteVide
} from '../db.js';
import { Etat, EtatCourse, EtatPaiement, OffreDemande, OuiNon } from '../enums.js';
import { familleArticle, quartier } from './core.js';
import { membre } from './membres.js';

/** Catalogue Forever Living Products (Aloe Vera) : 3 niveaux de prix. */
export const produit = sqliteTable(
	'produit',
	{
		id: integer('id').primaryKey(),
		...consultable,
		reference: texteVide('reference'),
		nom: text('nom').notNull(),
		description: texteVide('description'),
		groupe: integer('groupe').notNull().default(0),
		prix_distributeur: integer('prix_distributeur').notNull().default(0),
		prix_non_distributeur: integer('prix_non_distributeur').notNull().default(0),
		prix_public: integer('prix_public').notNull().default(0),
		quantite_stock: integer('quantite_stock').notNull().default(0),
		photo: text('photo'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_produit_groupe').on(t.groupe)]
);

/** Journal générique des paiements (legacy `payement`), confirmé par un gestionnaire. */
export const paiement = sqliteTable(
	'paiement',
	{
		id: integer('id').primaryKey(),
		membre_id: integer('membre_id').references(() => membre.id),
		/** `TypeObjetPaye`. */
		type_objet: integer('type_objet').notNull(),
		/** Id de l'objet payé (course, souscription…). */
		objet_id: integer('objet_id'),
		date_paiement: dateHeure('date_paiement').notNull().$defaultFn(maintenant),
		/** `ModePaiement`. */
		mode: integer('mode').notNull(),
		montant: integer('montant').notNull(),
		/** Code Charden / n° de transaction. */
		remarque: texteVide('remarque'),
		etat: integer('etat').notNull().default(EtatPaiement.NON_CONFIRME),
		confirme_par_id: integer('confirme_par_id').references(() => membre.id),
		date_confirmation: dateHeure('date_confirmation')
	},
	(t) => [index('ix_paiement_membre_id').on(t.membre_id), index('ix_paiement_etat').on(t.etat)]
);

/** Petite annonce d'article neuf ou d'occasion (offre ou recherche). */
export const article = sqliteTable(
	'article',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		...consultable,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		famille_id: integer('famille_id').references(() => familleArticle.id),
		offre_ou_recherche: integer('offre_ou_recherche').notNull().default(OffreDemande.OFFRE),
		libelle: text('libelle').notNull(),
		prix: integer('prix').notNull().default(0),
		quantite: integer('quantite').notNull().default(0),
		neuf_ou_occasion: integer('neuf_ou_occasion').notNull().default(0),
		description: texteVide('description'),
		photo: text('photo'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [
		index('ix_article_reference').on(t.reference),
		index('ix_article_offre_ou_recherche').on(t.offre_ou_recherche)
	]
);

/** Ligne de panier : prix figé au moment de l'ajout. Suppression physique (comme le legacy). */
export const lignePanier = sqliteTable(
	'ligne_panier',
	{
		id: integer('id').primaryKey(),
		/** `TypeObjetPaye` (1 produit, 2 article). */
		type_objet: integer('type_objet').notNull(),
		membre_id: integer('membre_id')
			.notNull()
			.references(() => membre.id),
		produit_id: integer('produit_id').references(() => produit.id),
		article_id: integer('article_id').references(() => article.id),
		quantite: integer('quantite').notNull().default(1),
		prix_unitaire: integer('prix_unitaire').notNull().default(0),
		date_ajout: dateHeure('date_ajout').notNull().$defaultFn(maintenant),
		paye: booleen('paye').notNull().default(false),
		date_paiement: dateSeule('date_paiement'),
		paiement_id: integer('paiement_id').references(() => paiement.id),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_ligne_panier_membre_id').on(t.membre_id)]
);

export const immobilier = sqliteTable(
	'immobilier',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		...consultable,
		reference: texteVide('reference'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		offre_ou_recherche: integer('offre_ou_recherche').notNull().default(OffreDemande.OFFRE),
		type_transaction: integer('type_transaction').notNull().default(0),
		type_bien: integer('type_bien').notNull().default(0),
		quartier_id: integer('quartier_id').references(() => quartier.id),
		localisation: texteVide('localisation'),
		surface_m2: integer('surface_m2').notNull().default(0),
		nombre_pieces: integer('nombre_pieces').notNull().default(0),
		nombre_chambres: integer('nombre_chambres').notNull().default(0),
		situation: integer('situation').notNull().default(1),
		prix: integer('prix').notNull().default(0),
		description: texteVide('description'),
		photo: text('photo'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [
		index('ix_immobilier_reference').on(t.reference),
		index('ix_immobilier_offre_ou_recherche').on(t.offre_ou_recherche)
	]
);

/** Catalogue d'une boutique partenaire pour le service de courses. */
export const articleCourse = sqliteTable(
	'article_course',
	{
		id: integer('id').primaryKey(),
		boutique_id: integer('boutique_id').references(() => membre.id),
		code: texteVide('code'),
		nom: text('nom').notNull(),
		marque: texteVide('marque'),
		prix: integer('prix').notNull().default(0),
		disponible: integer('disponible').notNull().default(OuiNon.OUI),
		description: texteVide('description'),
		photo: text('photo'),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_article_course_boutique_id').on(t.boutique_id)]
);

/** Commande de courses/livraison (legacy `course1`). */
export const course = sqliteTable(
	'course',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		reference: texteVide('reference'),
		client_id: integer('client_id').references(() => membre.id),
		boutique_id: integer('boutique_id').references(() => membre.id),
		lieu_achat: texteVide('lieu_achat'),
		date_achat: dateSeule('date_achat'),
		date_livraison: dateHeure('date_livraison'),
		lieu_livraison: texteVide('lieu_livraison'),
		montant_achats: integer('montant_achats').notNull().default(0),
		frais_service: integer('frais_service').notNull().default(0),
		mode_paiement: integer('mode_paiement').notNull().default(0),
		paye: integer('paye').notNull().default(OuiNon.NON),
		observation: texteVide('observation'),
		etat_course: integer('etat_course').notNull().default(EtatCourse.EN_ATTENTE),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [
		index('ix_course_reference').on(t.reference),
		index('ix_course_client_id').on(t.client_id)
	]
);

/** Article à acheter : `prix_plafond` = prix maximum à ne pas dépasser. */
export const ligneCourse = sqliteTable('ligne_course', {
	id: integer('id').primaryKey(),
	course_id: integer('course_id')
		.notNull()
		.references(() => course.id, { onDelete: 'cascade' }),
	article_catalogue_id: integer('article_catalogue_id').references(() => articleCourse.id),
	nom_article: texteVide('nom_article'),
	prix_plafond: integer('prix_plafond').notNull().default(0),
	quantite: integer('quantite').notNull().default(1),
	observation: texteVide('observation'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});
