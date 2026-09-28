/**
 * Back-office « Gestion » : file de modération transverse, compteurs du tableau de bord, outils sur
 * les comptes membres (code de pointage, lien de réinitialisation, contrôles de droits).
 * Portage de `app/services/gestion.py`.
 *
 * Legacy : `incl-menu1.php` (menu gestionnaire), `pmembre.php`, pied de page « New Membres: N ».
 * Inventaire : F-TRV-06, F-TRV-70, F-ADM-05 à F-ADM-15.
 */
import { and, desc, eq, inArray, isNotNull, isNull, ne, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Request } from 'express';
import { randomInt } from 'node:crypto';
import { db } from '../db.js';
import { exigerDroit, type Pagination } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { article } from '../schema/commerce.js';
import { conseil, publicite, soungangai } from '../schema/contenu.js';
import { entreprise, marche, reussite } from '../schema/entreprises.js';
import { conseilFinance } from '../schema/finance.js';
import { appelFond, groupeLikelemba } from '../schema/fonds.js';
import {
	membre as tableMembre,
	reinitialisationMotDePasse,
	session as tableSession,
	type Membre
} from '../schema/membres.js';
import { immobilier } from '../schema/commerce.js';
import { annonceEmploi } from '../schema/rh.js';
import { partenariat, souscription } from '../schema/opportunite.js';
import { hacherMotDePasse, nouveauJeton } from '../securite.js';

/** Compte technique du legacy (« Aucun » / concepteur du site) : masqué des listes (F-ADM-08). */
export const ID_COMPTE_SYSTEME = 1;

/**
 * Un lien transmis par la frangine (WhatsApp, téléphone) doit laisser le temps au membre de
 * l'ouvrir : 24 heures, en millisecondes.
 */
export const DUREE_LIEN_GESTIONNAIRE = 24 * 60 * 60 * 1000;

/** Présence en ligne (ADR-0007 T3) : 5 minutes, en millisecondes. */
export const PRESENCE = 5 * 60 * 1000;

/**
 * Pagination du back-office : 50 lignes par défaut, jusqu'à 500 (F-TRV-66, ADR-0007 T2).
 */
export function paginationGestion(req: Request): Pagination {
	const brutPage = Number(req.query.page);
	const brutTaille = Number(req.query.taille);
	const page = Number.isFinite(brutPage) && brutPage >= 1 ? Math.trunc(brutPage) : 1;
	const taille = Number.isFinite(brutTaille)
		? Math.min(500, Math.max(1, Math.trunc(brutTaille)))
		: 50;
	return { page, taille, offset: (page - 1) * taille };
}

export function tronquer(texte: string | null | undefined, n = 90): string {
	const t = (texte ?? '').split(/\s+/).filter(Boolean).join(' ');
	return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

// --- File de modération transverse ---------------------------------------------------------------

/** Une fiche telle que la file de modération la manipule. */
type FicheModeree = Record<string, unknown> & { id: number };

/** Un type de fiche soumis à la modération (état 1 « Non traité » = en attente). */
export interface ModuleModere {
	cle: string;
	libelle: string;
	table: SQLiteTable & { id: SQLiteColumn; etat: SQLiteColumn };
	titre: (f: FicheModeree) => string;
	lien: (f: FicheModeree) => string;
	colonneAuteur: string | null;
	colonneDate: SQLiteColumn | null;
	condition?: SQL;
}

function texte(f: FicheModeree, champ: string): string {
	const v = f[champ];
	return typeof v === 'string' ? v : '';
}

/**
 * Les liens pointent vers la fiche publique, où le panneau de modération existant s'affiche pour
 * un gestionnaire habilité (droit Activation).
 */
export const MODULES_MODERES: ModuleModere[] = [
	{
		cle: 'emplois',
		libelle: 'Emplois',
		table: annonceEmploi as never,
		titre: (f) =>
			texte(f, 'poste_a_pourvoir') || tronquer(texte(f, 'competences')) || texte(f, 'reference'),
		lien: (f) => `/emplois/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: annonceEmploi.date_creation
	},
	{
		cle: 'immobilier',
		libelle: 'Immobilier',
		table: immobilier as never,
		titre: (f) =>
			tronquer(texte(f, 'description')) || texte(f, 'localisation') || texte(f, 'reference'),
		lien: (f) => `/immobilier/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: immobilier.date_creation
	},
	{
		cle: 'annonces',
		libelle: 'Petites annonces',
		table: article as never,
		titre: (f) => texte(f, 'libelle') || texte(f, 'reference'),
		lien: (f) => `/annonces/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: article.date_creation
	},
	{
		cle: 'projets',
		libelle: 'Appels de fonds',
		table: appelFond as never,
		titre: (f) => texte(f, 'nom_projet') || texte(f, 'reference'),
		lien: (f) => `/projets/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: appelFond.date_creation
	},
	{
		cle: 'likelemba',
		libelle: 'Likelemba',
		table: groupeLikelemba as never,
		titre: (f) => (texte(f, 'code') ? `Groupe ${texte(f, 'code')}` : `Groupe n° ${f.id}`),
		lien: (f) => `/likelemba/${f.id}`,
		colonneAuteur: 'responsable_id',
		colonneDate: null
	},
	{
		cle: 'entreprises',
		libelle: 'Entreprises',
		table: entreprise as never,
		titre: (f) => texte(f, 'nom') || texte(f, 'reference'),
		lien: (f) => `/entreprises/${f.id}`,
		colonneAuteur: 'membre_id',
		colonneDate: entreprise.date_creation
	},
	{
		cle: 'marches',
		libelle: 'Marchés',
		table: marche as never,
		titre: (f) =>
			tronquer(texte(f, 'libelle')) || texte(f, 'numero_appel_offre') || texte(f, 'reference'),
		lien: (f) => `/marches/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: marche.date_creation
	},
	{
		cle: 'partenariats',
		libelle: 'Partenariats',
		table: partenariat as never,
		titre: (f) =>
			tronquer(texte(f, 'actif')) || tronquer(texte(f, 'recherche')) || texte(f, 'reference'),
		lien: (f) => `/partenariats/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: partenariat.date_creation
	},
	{
		cle: 'publicites',
		libelle: 'Publicités',
		table: publicite as never,
		titre: (f) =>
			tronquer(texte(f, 'objet')) || tronquer(texte(f, 'texte')) || texte(f, 'reference'),
		lien: (f) => `/gestion/publicites/${f.id}`,
		colonneAuteur: 'demandeur_id',
		colonneDate: publicite.date_creation
	},
	{
		cle: 'reussites',
		libelle: 'Réussites',
		table: reussite as never,
		titre: (f) =>
			tronquer(texte(f, 'projet')) || tronquer(texte(f, 'vision')) || texte(f, 'reference'),
		lien: (f) => `/reussites/${f.id}`,
		colonneAuteur: 'membre_id',
		colonneDate: reussite.date_creation
	},
	{
		cle: 'questions',
		libelle: 'Questions & conseils',
		table: conseil as never,
		titre: (f) =>
			tronquer(texte(f, 'objet')) || tronquer(texte(f, 'texte')) || texte(f, 'reference'),
		lien: (f) => `/questions/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: conseil.date_creation,
		condition: isNull(conseil.sujet_id)
	},
	{
		cle: 'conseil-financier',
		libelle: 'Conseil financier',
		table: conseilFinance as never,
		titre: (f) =>
			tronquer(texte(f, 'objet')) || tronquer(texte(f, 'texte')) || texte(f, 'reference'),
		lien: (f) => `/conseil-financier/${f.id}`,
		colonneAuteur: 'auteur_id',
		colonneDate: conseilFinance.date_creation,
		condition: isNull(conseilFinance.sujet_id)
	},
	{
		cle: 'decouverte',
		libelle: 'Découverte de soi',
		table: soungangai as never,
		titre: (f) => (texte(f, 'reference') ? `Fiche ${texte(f, 'reference')}` : `Fiche n° ${f.id}`),
		lien: (f) => `/decouverte-de-soi/fiches/${f.id}`,
		colonneAuteur: 'membre_id',
		colonneDate: soungangai.date_creation
	},
	{
		cle: 'distributeur',
		libelle: 'Souscriptions distributeur',
		table: souscription as never,
		titre: (f) =>
			texte(f, 'reference') ? `Souscription ${texte(f, 'reference')}` : `Souscription n° ${f.id}`,
		lien: (f) => `/devenir-distributeur/suivi/${f.id}`,
		colonneAuteur: 'membre_id',
		colonneDate: souscription.date_creation
	}
];

export const MODULES_PAR_CLE = new Map(MODULES_MODERES.map((m) => [m.cle, m]));

function conditionsEnAttente(m: ModuleModere): SQL {
	const base = eq(m.table.etat, Etat.NON_TRAITE);
	return m.condition ? and(base, m.condition)! : base;
}

export function fichesEnAttente(m: ModuleModere, limite?: number, offset?: number): FicheModeree[] {
	let requete = db
		.select()
		.from(m.table)
		.where(conditionsEnAttente(m))
		.orderBy(...(m.colonneDate ? [desc(m.colonneDate), desc(m.table.id)] : [desc(m.table.id)]))
		.$dynamic();
	if (limite !== undefined) requete = requete.limit(limite);
	if (offset !== undefined) requete = requete.offset(offset);
	return requete.all() as unknown as FicheModeree[];
}

export function compterEnAttente(): Record<string, number> {
	const compte: Record<string, number> = {};
	for (const m of MODULES_MODERES) {
		compte[m.cle] =
			db
				.select({ n: sql<number>`count(*)` })
				.from(m.table)
				.where(conditionsEnAttente(m))
				.get()?.n ?? 0;
	}
	return compte;
}

export function pseudonymes(ids: Iterable<number>): Map<number, string> {
	const liste = [...new Set([...ids].filter(Boolean))];
	if (liste.length === 0) return new Map();
	return new Map(
		db
			.select({ id: tableMembre.id, pseudonyme: tableMembre.pseudonyme })
			.from(tableMembre)
			.where(inArray(tableMembre.id, liste))
			.all()
			.map((m) => [m.id, m.pseudonyme])
	);
}

export interface ElementModeration {
	module: string;
	module_libelle: string;
	id: number;
	reference: string;
	titre: string;
	auteur_id: number | null;
	date: Date | null;
	lien: string;
}

export function elementModeration(m: ModuleModere, f: FicheModeree): ElementModeration {
	const reference = texte(f, 'reference') || texte(f, 'code') || '';
	const auteur = m.colonneAuteur ? (f[m.colonneAuteur] as number | null | undefined) : null;
	const date = m.colonneDate ? (f[m.colonneDate.name] as Date | null | undefined) : null;
	return {
		module: m.cle,
		module_libelle: m.libelle,
		id: f.id,
		reference,
		titre: m.titre(f) || `Fiche n° ${f.id}`,
		auteur_id: auteur ?? null,
		date: date ?? null,
		lien: m.lien(f)
	};
}

// --- Comptes membres -----------------------------------------------------------------------------

/**
 * Le compte n° 1 (agence Primera-C, gestionnaire) est masqué des LISTES (F-ADM-08), mais sa fiche
 * reste consultable : des fiches y renvoient comme auteur. Agir sur ce compte reste soumis à
 * `exigerAttributionSiGestionnaire`.
 */
export function chargerMembre(id: number): Membre {
	const membre = db.select().from(tableMembre).where(eq(tableMembre.id, id)).get();
	if (!membre) throw introuvable("Ce membre n'existe pas.");
	return membre;
}

/**
 * Agir sur le compte d'un autre gestionnaire (mot de passe, état, suppression) donne accès au
 * back-office : réservé à un gestionnaire ayant le droit d'attribution.
 */
export function exigerAttributionSiGestionnaire(moi: Membre, cible: Membre): void {
	if (cible.type_compte === 1 && cible.id !== moi.id) exigerDroit(moi, 'attribution');
}

export function interdireSurSoi(moi: Membre, cible: Membre, action: string): void {
	if (moi.id === cible.id) {
		throw interdit(`Vous ne pouvez pas ${action} votre propre compte depuis la gestion.`);
	}
}

/**
 * Code à 4 chiffres exactement, tiré par un générateur cryptographique (correctif F-ADM-13 : le
 * legacy tirait un nombre entre 4 et 9999).
 */
export function genererCodePointage(): string {
	return String(randomInt(10000)).padStart(4, '0');
}

export async function attribuerCodePointage(membreId: number): Promise<string> {
	const code = genererCodePointage();
	db.update(tableMembre)
		.set({ code_pointage_hash: await hacherMotDePasse(code) })
		.where(eq(tableMembre.id, membreId))
		.run();
	return code;
}

/** Demandes « mot de passe oublié » sans e-mail, pas encore prises en charge (ADR-0005 §3). */
export function demandesEnAttente(membreId?: number): SQL {
	const conditions = [
		eq(reinitialisationMotDePasse.canal, 'gestionnaire'),
		isNull(reinitialisationMotDePasse.jeton_hash),
		isNull(reinitialisationMotDePasse.traitee_par_id)
	];
	if (membreId !== undefined) {
		conditions.push(eq(reinitialisationMotDePasse.membre_id, membreId));
	}
	return and(...conditions)!;
}

/**
 * Crée un lien à usage unique `/reinitialiser/{jeton}` que la frangine transmet au membre. Le mot
 * de passe n'est jamais vu par personne. Les anciens liens non utilisés sont invalidés et les
 * demandes en attente du membre sont marquées comme prises en charge.
 */
export function creerLienReinitialisation(
	membre: Membre,
	gestionnaire: Membre
): { jeton: string; expire: Date } {
	const maintenant = new Date();
	const anciens = db
		.select()
		.from(reinitialisationMotDePasse)
		.where(
			and(
				eq(reinitialisationMotDePasse.membre_id, membre.id),
				isNotNull(reinitialisationMotDePasse.jeton_hash),
				isNull(reinitialisationMotDePasse.date_utilisation)
			)
		)
		.all();
	for (const r of anciens) {
		if (r.date_expiration === null || r.date_expiration.getTime() > maintenant.getTime()) {
			db.update(reinitialisationMotDePasse)
				.set({ date_expiration: maintenant })
				.where(eq(reinitialisationMotDePasse.id, r.id))
				.run();
		}
	}
	db.update(reinitialisationMotDePasse)
		.set({ traitee_par_id: gestionnaire.id })
		.where(demandesEnAttente(membre.id))
		.run();

	const [jeton, hash] = nouveauJeton();
	const expire = new Date(maintenant.getTime() + DUREE_LIEN_GESTIONNAIRE);
	db.insert(reinitialisationMotDePasse)
		.values({
			membre_id: membre.id,
			jeton_hash: hash,
			canal: 'gestionnaire',
			date_expiration: expire,
			traitee_par_id: gestionnaire.id
		})
		.run();
	return { jeton, expire };
}

export function fermerSessions(membreId: number): void {
	db.delete(tableSession).where(eq(tableSession.membre_id, membreId)).run();
}

/**
 * Identifiant, pseudonyme, téléphone et e-mail uniques parmi les comptes non supprimés
 * (ADR-0007 T6). Téléphone et e-mail vides ne sont pas comparés.
 */
export function verifierUnicite(
	valeurs: {
		identifiant: string;
		pseudonyme: string;
		telephone: string;
		email: string | null;
	},
	exclureId?: number
): void {
	const existe = (condition: SQL) => {
		const conditions = [condition, ne(tableMembre.etat, Etat.SUPPRIME)];
		if (exclureId) conditions.push(ne(tableMembre.id, exclureId));
		return (
			db
				.select({ id: tableMembre.id })
				.from(tableMembre)
				.where(and(...conditions))
				.limit(1)
				.get() !== undefined
		);
	};

	const champs: Record<string, string> = {};
	if (existe(sql`lower(${tableMembre.identifiant}) = ${valeurs.identifiant.toLowerCase()}`)) {
		champs.identifiant = 'Cet identifiant est déjà utilisé.';
	}
	if (existe(sql`lower(${tableMembre.pseudonyme}) = ${valeurs.pseudonyme.toLowerCase()}`)) {
		champs.pseudonyme = 'Ce pseudonyme (ou sigle) est déjà utilisé.';
	}
	if (valeurs.telephone && existe(eq(tableMembre.telephone, valeurs.telephone))) {
		champs.telephone = 'Un autre compte utilise déjà ce numéro.';
	}
	if (valeurs.email && existe(sql`lower(${tableMembre.email}) = ${valeurs.email.toLowerCase()}`)) {
		champs.email = 'Un autre compte utilise déjà cet e-mail.';
	}
	if (Object.keys(champs).length) throw erreur('Ce membre semble déjà inscrit.', champs);
}

export function estEnLigne(membre: { derniere_activite: Date | null }): boolean {
	return (
		!!membre.derniere_activite &&
		membre.derniere_activite.getTime() >= Date.now() - PRESENCE
	);
}
