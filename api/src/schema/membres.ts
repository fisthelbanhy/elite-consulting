/**
 * Membres, sessions, journal de connexion (portage de `app/models/membres.py` ;
 * legacy : membre, visitembr).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { booleen, dateHeure, dateSeule, horodatage, texteVide } from '../db.js';
import { CategorieMembre, Etat, Sexe, TypeMembre } from '../enums.js';
import { domaineActivite, ville } from './core.js';

export const membre = sqliteTable(
	'membre',
	{
		id: integer('id').primaryKey(),
		...horodatage,
		type_compte: integer('type_compte').notNull().default(TypeMembre.MEMBRE),
		categorie: integer('categorie').notNull().default(CategorieMembre.PHYSIQUE),
		code_membre: texteVide('code_membre'),
		/** « Nom - Prénom » ou raison sociale. */
		nom: text('nom').notNull(),
		/** Pseudo (personne physique) / sigle (personne morale). */
		pseudonyme: texteVide('pseudonyme'),
		sexe: integer('sexe').notNull().default(Sexe.INDEFINI),
		telephone: texteVide('telephone'),
		email: text('email'),
		ville_id: integer('ville_id').references(() => ville.id),
		adresse: texteVide('adresse'),
		identifiant: text('identifiant').notNull().unique(),
		mot_de_passe_hash: text('mot_de_passe_hash').notNull(),
		observation: texteVide('observation'),
		etat: integer('etat').notNull().default(Etat.NON_TRAITE),

		// Droits (legacy `droitmbr`, 3 caractères « Droit / Caisse / Activation » ; le 4ᵉ droit
		// « Point caisse » est la colonne `pointcaissembr` → `point_caisse_actif`)
		droit_attribution: booleen('droit_attribution').notNull().default(false),
		droit_caisse: booleen('droit_caisse').notNull().default(false),
		droit_activation: booleen('droit_activation').notNull().default(false),

		// Personne physique
		numero_piece_identite: texteVide('numero_piece_identite'),
		employeur: texteVide('employeur'),
		situation_matrimoniale: integer('situation_matrimoniale'),
		nombre_enfants: integer('nombre_enfants').notNull().default(0),

		// Personne morale (le legacy rangeait la forme juridique dans `situatmatrimmbr`)
		forme_juridique: integer('forme_juridique'),
		type_partenaire: integer('type_partenaire'),
		domaine_activite_id: integer('domaine_activite_id').references(() => domaineActivite.id),

		/** Statut Master (redevance mensuelle). */
		date_limite_master: dateSeule('date_limite_master'),

		// Carte de pointage (épargne solidaire)
		point_caisse_actif: booleen('point_caisse_actif').notNull().default(false),
		solde_point_caisse: integer('solde_point_caisse').notNull().default(0),
		date_dernier_pointage: dateHeure('date_dernier_pointage'),
		code_pointage_hash: text('code_pointage_hash'),

		photo: text('photo'),
		derniere_connexion: dateHeure('derniere_connexion'),
		/** Présence en ligne (legacy `connexmsgmbr`/`connexmsgpmt`) : actif il y a moins de 5 minutes. */
		derniere_activite: dateHeure('derniere_activite')
	},
	(t) => [index('ix_membre_telephone').on(t.telephone), index('ix_membre_email').on(t.email)]
);

export type Membre = typeof membre.$inferSelect;

/** Session de connexion : seul le SHA-256 du jeton est stocké (ADR-0002). */
export const session = sqliteTable(
	'session',
	{
		id: integer('id').primaryKey(),
		membre_id: integer('membre_id')
			.notNull()
			.references(() => membre.id, { onDelete: 'cascade' }),
		jeton_hash: text('jeton_hash').notNull().unique(),
		date_creation: dateHeure('date_creation')
			.notNull()
			.$defaultFn(() => new Date()),
		date_expiration: dateHeure('date_expiration').notNull(),
		adresse_ip: texteVide('adresse_ip'),
		agent: texteVide('agent')
	},
	(t) => [index('ix_session_membre_id').on(t.membre_id)]
);

/** Échecs de connexion, pour la limitation de débit (ADR-0005). */
export const tentativeConnexion = sqliteTable(
	'tentative_connexion',
	{
		id: integer('id').primaryKey(),
		/** « id:<identifiant> » ou « ip:<ip> ». */
		cle: text('cle').notNull(),
		date_heure: dateHeure('date_heure')
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		index('ix_tentative_connexion_cle').on(t.cle),
		index('ix_tentative_connexion_date_heure').on(t.date_heure)
	]
);

/** Demande de réinitialisation : par e-mail, ou transmise par un gestionnaire (ADR-0005). */
export const reinitialisationMotDePasse = sqliteTable('reinitialisation_mot_de_passe', {
	id: integer('id').primaryKey(),
	membre_id: integer('membre_id')
		.notNull()
		.references(() => membre.id, { onDelete: 'cascade' }),
	jeton_hash: text('jeton_hash').unique(),
	/** « email » | « gestionnaire ». */
	canal: text('canal').notNull(),
	date_creation: dateHeure('date_creation')
		.notNull()
		.$defaultFn(() => new Date()),
	date_expiration: dateHeure('date_expiration'),
	date_utilisation: dateHeure('date_utilisation'),
	traitee_par_id: integer('traitee_par_id').references(() => membre.id)
});

/** Journal des connexions membres (legacy `visitembr`). */
export const visiteMembre = sqliteTable(
	'visite_membre',
	{
		id: integer('id').primaryKey(),
		membre_id: integer('membre_id')
			.notNull()
			.references(() => membre.id, { onDelete: 'cascade' }),
		date_connexion: dateHeure('date_connexion')
			.notNull()
			.$defaultFn(() => new Date()),
		adresse_ip: texteVide('adresse_ip')
	},
	(t) => [index('ix_visite_membre_membre_id').on(t.membre_id)]
);

// --- Règles portées depuis les propriétés du modèle Python ---------------------------------------

export function estGestionnaire(m: Pick<Membre, 'type_compte'> | null | undefined): boolean {
	return m?.type_compte === TypeMembre.GESTIONNAIRE;
}

export function estMorale(m: Pick<Membre, 'categorie'> | null | undefined): boolean {
	return m?.categorie === CategorieMembre.MORALE;
}

/** Gestionnaire + droit « Activation » : crée, active, annule ou supprime une fiche. */
export function peutModerer(
	m: Pick<Membre, 'type_compte' | 'droit_activation'> | null | undefined
): boolean {
	return !!m && estGestionnaire(m) && m.droit_activation;
}
