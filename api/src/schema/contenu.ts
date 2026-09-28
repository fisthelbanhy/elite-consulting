/**
 * Contenus communautaires et communication (portage de `app/models/contenu.py` ;
 * legacy : conseil, soungangai, maladie, dialogue, message, contact, suggestion, publicite).
 */
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { booleen, dateHeure, dateSeule, horodatage, json, texteVide } from '../db.js';
import { Confidentialite, Etat, Module } from '../enums.js';
import { produit } from './commerce.js';
import { entreprise } from './entreprises.js';
import { membre } from './membres.js';

/** Forum « Informations utiles » : un sujet (`sujet_id` NULL) et ses réponses. */
export const conseil = sqliteTable(
	'conseil',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		reference: texteVide('reference'),
		sujet_id: integer('sujet_id').references((): AnySQLiteColumn => conseil.id),
		objet: texteVide('objet'),
		texte: texteVide('texte'),
		auteur_id: integer('auteur_id').references(() => membre.id),
		confidentialite: integer('confidentialite').notNull().default(Confidentialite.PUBLIC),
		nombre_reponses: integer('nombre_reponses').notNull().default(0),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE)
	},
	(t) => [index('ix_conseil_reference').on(t.reference), index('ix_conseil_sujet_id').on(t.sujet_id)]
);

/**
 * Questionnaire « Découverte de soi » (1 par membre). Les booléens Oui/Non du legacy
 * (1 = Oui, 2 = Non, 0 = non renseigné) sont conservés en entier.
 */
export const soungangai = sqliteTable('soungangai', {
	id: integer('id').primaryKey(),
	...horodatage,
	membre_id: integer('membre_id')
		.notNull()
		.unique()
		.references(() => membre.id),
	reference: texteVide('reference'),
	activite_actuelle: texteVide('activite_actuelle'), // zone01
	savoir_faire: texteVide('savoir_faire'), // zone02
	activite_quotidienne: texteVide('activite_quotidienne'), // zone03
	secret_a_partager: texteVide('secret_a_partager'), // zone04
	origine_idee: texteVide('origine_idee'), // zone05
	idee_vue_chez_autrui: integer('idee_vue_chez_autrui').notNull().default(0), // zone06
	participation_idee_tierce: texteVide('participation_idee_tierce'), // zone07
	est_sociable: integer('est_sociable').notNull().default(0), // zone08
	interet_pour_autrui: integer('interet_pour_autrui').notNull().default(0), // zone09
	a_deja_fait_commerce: integer('a_deja_fait_commerce').notNull().default(0), // zone10
	se_fait_des_amis: integer('se_fait_des_amis').notNull().default(0), // zone11
	garde_ses_relations: integer('garde_ses_relations').notNull().default(0), // zone12
	percu_comme_ouvert: integer('percu_comme_ouvert').notNull().default(0), // zone13
	perception_par_autrui: texteVide('perception_par_autrui'), // zone14
	est_meneur: integer('est_meneur').notNull().default(0), // zone15
	prefere_entourage: integer('prefere_entourage').notNull().default(0), // zone16
	a_des_amis_proches: integer('a_des_amis_proches').notNull().default(0), // zone17
	entourage_valorise_activite: integer('entourage_valorise_activite').notNull().default(0), // zone18
	entourage_proche: texteVide('entourage_proche'), // zone19
	personnes_consideration: texteVide('personnes_consideration'), // zone20
	motivation: texteVide('motivation'), // zone21
	pourcentage_implication: integer('pourcentage_implication').notNull().default(0), // zone22
	moyens_disponibles: texteVide('moyens_disponibles'), // zone23
	soutien_conjoint: integer('soutien_conjoint').notNull().default(0), // zone24
	origine_soutien: texteVide('origine_soutien'), // zone25
	confronte_aux_faits: integer('confronte_aux_faits').notNull().default(0), // zone26
	notes_membre: texteVide('notes_membre'), // zone27
	notes_conseillere: texteVide('notes_conseillere'), // zone28 (gestionnaire seul)
	etat_fiche: integer('etat_fiche').notNull().default(Etat.AUTORISE), // zone29
	cloturee: integer('cloturee').notNull().default(2), // zone30 (OuiNon)
	etat: integer('etat').notNull().default(Etat.NON_TRAITE),
	/** Diagnostic gratuit (nouveau, ADR-0008) : réponses, profil et étapes recommandées. */
	diagnostic: json<Record<string, unknown>>('diagnostic'),
	date_diagnostic: dateHeure('date_diagnostic')
});

/** Fiche santé & bien-être : maladie + jusqu'à 5 produits conseillés avec posologie. */
export const maladie = sqliteTable('maladie', {
	id: integer('id').primaryKey(),
	libelle: text('libelle').notNull().unique(),
	description: texteVide('description'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

export const maladieProduit = sqliteTable('maladie_produit', {
	id: integer('id').primaryKey(),
	maladie_id: integer('maladie_id')
		.notNull()
		.references(() => maladie.id, { onDelete: 'cascade' }),
	produit_id: integer('produit_id')
		.notNull()
		.references(() => produit.id),
	posologie: texteVide('posologie'),
	ordre: integer('ordre').notNull().default(1)
});

/**
 * Échanges contextuels par rubrique (accueil, sous-onglets de trésorerie…).
 * `destinataire_id` NULL = adressé à la frangine (pool des gestionnaires).
 */
export const dialogue = sqliteTable(
	'dialogue',
	{
		id: integer('id').primaryKey(),
		auteur_id: integer('auteur_id')
			.notNull()
			.references(() => membre.id),
		destinataire_id: integer('destinataire_id').references(() => membre.id),
		type_dialogue: integer('type_dialogue').notNull().default(0),
		texte: text('texte').notNull(),
		date_message: dateHeure('date_message')
			.notNull()
			.$defaultFn(() => new Date()),
		etat: integer('etat').notNull().default(Etat.AUTORISE)
	},
	(t) => [index('ix_dialogue_type_dialogue').on(t.type_dialogue)]
);

/**
 * Messagerie privée membre ↔ la frangine. Le fil appartient au membre `membre_id` ;
 * `de_la_frangine` indique le sens du message.
 */
export const message = sqliteTable(
	'message',
	{
		id: integer('id').primaryKey(),
		membre_id: integer('membre_id')
			.notNull()
			.references(() => membre.id),
		auteur_id: integer('auteur_id').references(() => membre.id),
		de_la_frangine: booleen('de_la_frangine').notNull().default(false),
		texte: text('texte').notNull(),
		date_message: dateHeure('date_message')
			.notNull()
			.$defaultFn(() => new Date()),
		lu: booleen('lu').notNull().default(false)
	},
	(t) => [index('ix_message_membre_id').on(t.membre_id)]
);

/** Formulaire de contact (visiteurs et membres) + réponse du gestionnaire par e-mail. */
export const contact = sqliteTable('contact', {
	id: integer('id').primaryKey(),
	membre_id: integer('membre_id').references(() => membre.id),
	nom: texteVide('nom'),
	email: texteVide('email'),
	telephone: texteVide('telephone'),
	objet: texteVide('objet'),
	texte: texteVide('texte'),
	date_envoi: dateHeure('date_envoi')
		.notNull()
		.$defaultFn(() => new Date()),
	reponse: texteVide('reponse'),
	date_reponse: dateHeure('date_reponse'),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Boîte à idées (anonyme, comme le legacy). */
export const suggestion = sqliteTable('suggestion', {
	id: integer('id').primaryKey(),
	date: dateHeure('date')
		.notNull()
		.$defaultFn(() => new Date()),
	module: integer('module').notNull().default(Module.TOUS),
	texte: text('texte').notNull(),
	etat: integer('etat').notNull().default(Etat.AUTORISE)
});

/** Encart publicitaire (image, son ou vidéo) diffusé aléatoirement entre deux dates. */
export const publicite = sqliteTable('publicite', {
	id: integer('id').primaryKey(),
	...horodatage,
	reference: texteVide('reference'),
	demandeur_id: integer('demandeur_id').references(() => membre.id),
	entreprise_id: integer('entreprise_id').references(() => entreprise.id),
	objet: texteVide('objet'),
	texte: texteVide('texte'),
	lien: texteVide('lien'),
	date_debut: dateSeule('date_debut'),
	date_fin: dateSeule('date_fin'),
	type_fichier: integer('type_fichier').notNull().default(0),
	fichier: text('fichier'),
	nombre_vues: integer('nombre_vues').notNull().default(0),
	date_derniere_vue: dateHeure('date_derniere_vue'),
	etat: integer('etat').notNull().default(Etat.NON_TRAITE)
});
