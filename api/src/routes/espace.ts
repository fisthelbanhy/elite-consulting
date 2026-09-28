/**
 * Espace membre : compteurs de l'en-tête, présence de la frangine, tableau de bord « Mon espace »
 * (profil, mes fiches par module, mes paiements), identifiant et code de pointage.
 * Inventaire : F-TRV-25 à F-TRV-30 (profil), E-TRV-05.
 *
 * Portage de `app/routers/espace.py` et `app/schemas/espace.py`.
 */
import { and, desc, eq, gte, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, membreRequis } from '../deps.js';
import { CategorieMembre, Etat, EtatPaiement, TypeMembre, libelle } from '../enums.js';
import { erreur } from '../erreurs.js';
import { article, course, immobilier, lignePanier, paiement } from '../schema/commerce.js';
import { businessPlan, partenariat, souscription } from '../schema/opportunite.js';
import { conseil, message, soungangai } from '../schema/contenu.js';
import { entreprise, marche, reussite } from '../schema/entreprises.js';
import {
	conseilFinance,
	contentieuxCredit,
	demandeCredit,
	dossierAccompagnement,
	operationBanque,
	placement
} from '../schema/finance.js';
import {
	appelFond,
	collecteFond,
	fondDeSoutien,
	groupeLikelemba,
	membreLikelemba
} from '../schema/fonds.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { annonceEmploi } from '../schema/rh.js';
import { ok, valider, type VerificationsCroisees } from '../schemas/commun.js';
import { vueMembreMoi } from '../schemas/membres.js';
import { hacherMotDePasse, verifierMotDePasse } from '../securite.js';

export const routeur = Router();
export const prefixe = '/espace';

/** Durée de présence en ligne (5 minutes). */
const PRESENCE_MS = 5 * 60 * 1000;

// --- Compteurs de l'en-tête -----------------------------------------------------------------------

routeur.get('/compteurs', membreRequis, (req, res) => {
	const membre = exigerMembre(req);

	const panier =
		db
			.select({ n: sql<number>`coalesce(sum(${lignePanier.quantite}), 0)` })
			.from(lignePanier)
			.where(and(eq(lignePanier.membre_id, membre.id), eq(lignePanier.paye, false)))
			.get()?.n ?? 0;

	// Pour un gestionnaire : les messages de membres pas encore lus par la frangine.
	const conditionNonLus =
		membre.type_compte === TypeMembre.GESTIONNAIRE
			? and(eq(message.de_la_frangine, false), eq(message.lu, false))
			: and(
					eq(message.membre_id, membre.id),
					eq(message.de_la_frangine, true),
					eq(message.lu, false)
				);
	const nonLus =
		db
			.select({ n: sql<number>`count(*)` })
			.from(message)
			.where(conditionNonLus)
			.get()?.n ?? 0;

	const enLigne =
		db
			.select({ n: sql<number>`count(*)` })
			.from(tableMembre)
			.where(
				and(
					eq(tableMembre.type_compte, TypeMembre.GESTIONNAIRE),
					// `gte` passe par le type de colonne, qui formate la date comme SQLAlchemy ;
					// une date interpolée dans du SQL brut serait refusée par le pilote.
					gte(tableMembre.derniere_activite, new Date(Date.now() - PRESENCE_MS))
				)
			)
			.get()?.n ?? 0;

	res.json({ panier, messages_non_lus: nonLus, frangine_en_ligne: enLigne > 0 });
});

// --- Tableau de bord « Mon espace » ---------------------------------------------------------------

/** Texte réduit à `n` caractères, espaces normalisés (comme `_court` en Python). */
function court(texte: string | null | undefined, n = 70): string {
	const t = (texte ?? '').split(/\s+/).filter(Boolean).join(' ');
	return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

/** Montant en FCFA avec séparateur d'espace, comme le formatage Python d'origine. */
function fcfa(montant: number): string {
	return `${montant.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

interface FicheCourte {
	id: number;
	titre: string;
	reference: string;
	statut: string;
	etat: number | null;
	date: Date | null;
	lien: string;
}

/** Une source de fiches appartenant au membre, à l'intérieur d'un module. */
interface Source {
	table: SQLiteTable & { etat: SQLiteColumn; id: SQLiteColumn };
	/** Condition « cette fiche appartient au membre ». */
	condition: (membreId: number) => SQL;
	titre: (f: Record<string, never>) => string;
	lien: (f: Record<string, never>) => string;
	/**
	 * Colonne de date servant au tri. **Absente vaut `date_creation`** — c'était la valeur par
	 * défaut du champ Python ; `null` explicite désigne une table qui n'a pas de date.
	 */
	date?: string | null;
	statut?: (f: Record<string, never>) => string;
}

/**
 * Le champ `date` de la fiche courte était déclaré `datetime | date | None` : Pydantic promouvait
 * une date seule en date-heure, si bien qu'une date de début de likelemba sortait en
 * `2026-08-29T00:00:00`. On rend donc une `Date` ordinaire, jamais un `JourSeul`.
 */
function dateHeureFiche(valeur: Date | null): Date | null {
	return valeur ? new Date(valeur.getTime()) : null;
}

interface ModuleMembre {
	cle: string;
	libelle: string;
	lien_liste: string;
	lien_nouveau: string | null;
	sources: Source[];
}

/** Raccourci : « la colonne d'appartenance vaut l'identifiant du membre ». */
function appartient(colonne: SQLiteColumn) {
	return (membreId: number) => eq(colonne, membreId) as SQL;
}

type Fiche = Record<string, never>;
const champ = (f: Fiche, nom: string): unknown => (f as Record<string, unknown>)[nom];
const texte = (f: Fiche, nom: string): string => String(champ(f, nom) ?? '');
const nombre = (f: Fiche, nom: string): number => Number(champ(f, nom) ?? 0);

const MODULES: ModuleMembre[] = [
	{
		cle: 'emplois',
		libelle: 'Emplois',
		lien_liste: '/emplois',
		lien_nouveau: '/emplois/publier',
		sources: [
			{
				table: annonceEmploi,
				condition: appartient(annonceEmploi.auteur_id),
				titre: (f) =>
					texte(f, 'poste_a_pourvoir') || court(texte(f, 'competences')) || texte(f, 'reference'),
				lien: (f) => `/emplois/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'immobilier',
		libelle: 'Immobilier',
		lien_liste: '/immobilier',
		lien_nouveau: '/immobilier/publier',
		sources: [
			{
				table: immobilier,
				condition: appartient(immobilier.auteur_id),
				titre: (f) => court(texte(f, 'description')) || texte(f, 'reference'),
				lien: (f) => `/immobilier/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'annonces',
		libelle: 'Petites annonces',
		lien_liste: '/annonces',
		lien_nouveau: '/annonces/publier',
		sources: [
			{
				table: article,
				condition: appartient(article.auteur_id),
				titre: (f) => texte(f, 'libelle'),
				lien: (f) => `/annonces/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'courses',
		libelle: 'Courses & livraison',
		lien_liste: '/courses',
		lien_nouveau: null,
		sources: [
			{
				table: course,
				condition: appartient(course.client_id),
				titre: (f) =>
					texte(f, 'reference')
						? `Course ${texte(f, 'reference')}`
						: `Course n° ${nombre(f, 'id')}`,
				lien: (f) => `/courses/${nombre(f, 'id')}`,
				statut: (f) => libelle('EtatCourse', nombre(f, 'etat_course'))
			}
		]
	},
	{
		cle: 'projets',
		libelle: 'Mes appels de fonds',
		lien_liste: '/projets',
		lien_nouveau: '/projets/nouveau',
		sources: [
			{
				table: appelFond,
				condition: appartient(appelFond.auteur_id),
				titre: (f) => texte(f, 'nom_projet'),
				lien: (f) => `/projets/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'engagements',
		libelle: 'Mes engagements de soutien',
		lien_liste: '/projets',
		lien_nouveau: null,
		sources: [
			{
				table: collecteFond,
				condition: appartient(collecteFond.membre_id),
				titre: (f) => {
					const projet = db
						.select({ nom: appelFond.nom_projet })
						.from(appelFond)
						.where(eq(appelFond.id, nombre(f, 'appel_fond_id')))
						.get();
					return `${projet?.nom ?? 'Projet'} — ${fcfa(nombre(f, 'montant_promis'))}`;
				},
				lien: (f) => `/projets/${nombre(f, 'appel_fond_id')}`,
				date: 'date_engagement'
			}
		]
	},
	{
		cle: 'likelemba',
		libelle: 'Likelemba',
		lien_liste: '/likelemba',
		lien_nouveau: null,
		sources: [
			{
				table: groupeLikelemba,
				condition: appartient(groupeLikelemba.responsable_id),
				titre: (f) => `Groupe ${texte(f, 'code')} (responsable)`,
				lien: (f) => `/likelemba/${nombre(f, 'id')}`,
				date: 'date_debut'
			},
			{
				table: membreLikelemba,
				condition: appartient(membreLikelemba.membre_id),
				titre: (f) => {
					const groupe = db
						.select({ code: groupeLikelemba.code })
						.from(groupeLikelemba)
						.where(eq(groupeLikelemba.id, nombre(f, 'groupe_id')))
						.get();
					return `Groupe ${groupe?.code ?? ''} — adhésion ${texte(f, 'code')}`.trim();
				},
				lien: (f) => `/likelemba/${nombre(f, 'groupe_id')}`,
				date: 'date_entree'
			}
		]
	},
	{
		cle: 'epargne',
		libelle: 'Épargne solidaire',
		lien_liste: '/epargne',
		lien_nouveau: null,
		sources: [
			{
				table: fondDeSoutien,
				condition: (mid) =>
					or(eq(fondDeSoutien.membre_id, mid), eq(fondDeSoutien.souscripteur_id, mid)) as SQL,
				titre: (f) => `${texte(f, 'reference')} — ${fcfa(nombre(f, 'montant'))}`,
				lien: (f) => `/epargne/dons-placements/${nombre(f, 'id')}`,
				date: 'date_souscription'
			}
		]
	},
	{
		cle: 'entreprises',
		libelle: 'Mes entreprises',
		lien_liste: '/entreprises',
		lien_nouveau: '/entreprises/nouvelle',
		sources: [
			{
				table: entreprise,
				condition: appartient(entreprise.membre_id),
				titre: (f) => texte(f, 'nom'),
				lien: (f) => `/entreprises/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'marches',
		libelle: 'Marchés publiés',
		lien_liste: '/marches',
		lien_nouveau: '/marches/nouveau',
		sources: [
			{
				table: marche,
				condition: appartient(marche.auteur_id),
				titre: (f) =>
					court(texte(f, 'libelle')) || texte(f, 'numero_appel_offre') || texte(f, 'reference'),
				lien: (f) => `/marches/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'partenariats',
		libelle: 'Partenariats & troc',
		lien_liste: '/partenariats',
		lien_nouveau: '/partenariats/nouveau',
		sources: [
			{
				table: partenariat,
				condition: appartient(partenariat.auteur_id),
				titre: (f) =>
					court(texte(f, 'actif')) || court(texte(f, 'recherche')) || texte(f, 'reference'),
				lien: (f) => `/partenariats/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'questions',
		libelle: 'Mes questions',
		lien_liste: '/questions',
		lien_nouveau: null,
		sources: [
			{
				table: conseil,
				condition: (mid) => and(eq(conseil.auteur_id, mid), isNull(conseil.sujet_id)) as SQL,
				titre: (f) => court(texte(f, 'objet')) || court(texte(f, 'texte')),
				lien: (f) => `/questions/${nombre(f, 'id')}`
			},
			{
				table: conseilFinance,
				condition: (mid) =>
					and(eq(conseilFinance.auteur_id, mid), isNull(conseilFinance.sujet_id)) as SQL,
				titre: (f) => court(texte(f, 'objet')) || court(texte(f, 'texte')),
				lien: (f) => `/conseil-financier/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'business-plan',
		libelle: 'Business plan',
		lien_liste: '/business-plan',
		lien_nouveau: null,
		sources: [
			{
				table: businessPlan,
				condition: appartient(businessPlan.membre_id),
				titre: (f) => court(texte(f, 'type_activite')) || 'Mon business plan',
				lien: () => '/business-plan',
				statut: (f) => (nombre(f, 'etat') === Etat.AUTORISE ? 'Soumis' : 'Brouillon')
			}
		]
	},
	{
		cle: 'decouverte',
		libelle: 'Découverte de soi',
		lien_liste: '/decouverte-de-soi',
		lien_nouveau: null,
		sources: [
			{
				table: soungangai,
				condition: appartient(soungangai.membre_id),
				titre: (f) => `Ma fiche ${texte(f, 'reference')}`.trim(),
				lien: () => '/decouverte-de-soi'
			}
		]
	},
	{
		cle: 'distributeur',
		libelle: 'Souscription distributeur',
		lien_liste: '/devenir-distributeur',
		lien_nouveau: null,
		sources: [
			{
				table: souscription,
				condition: appartient(souscription.membre_id),
				titre: (f) =>
					`Souscription ${texte(f, 'reference')} — étape ${nombre(f, 'etape_courante')}`.trim(),
				lien: () => '/devenir-distributeur'
			}
		]
	},
	{
		cle: 'accompagnement',
		libelle: "Dossiers d'accompagnement",
		lien_liste: '/accompagnement',
		lien_nouveau: null,
		sources: [
			{
				table: dossierAccompagnement,
				condition: appartient(dossierAccompagnement.membre_id),
				titre: (f) => court(texte(f, 'objet')) || texte(f, 'reference'),
				lien: (f) => `/accompagnement/${nombre(f, 'id')}`
			}
		]
	},
	{
		cle: 'tresorerie',
		libelle: 'Trésorerie & crédit',
		lien_liste: '/tresorerie',
		lien_nouveau: null,
		sources: [
			{
				table: placement,
				condition: appartient(placement.membre_id),
				titre: (f) => `Placement ${texte(f, 'reference')}`,
				lien: () => '/tresorerie',
				date: 'date_placement'
			},
			{
				table: operationBanque,
				condition: appartient(operationBanque.membre_id),
				titre: (f) => `Opération bancaire ${texte(f, 'reference')}`,
				lien: () => '/tresorerie',
				date: 'date_saisie'
			},
			{
				table: demandeCredit,
				condition: appartient(demandeCredit.membre_id),
				titre: (f) => `Demande de crédit ${texte(f, 'reference')}`,
				lien: () => '/tresorerie',
				date: 'date_demande'
			},
			{
				table: contentieuxCredit,
				condition: appartient(contentieuxCredit.membre_id),
				titre: (f) => `Dossier de contentieux ${texte(f, 'reference')}`,
				lien: () => '/tresorerie',
				date: 'date_dossier'
			}
		]
	},
	{
		cle: 'reussite',
		libelle: 'Mon témoignage de réussite',
		lien_liste: '/reussites',
		lien_nouveau: null,
		sources: [
			{
				table: reussite,
				condition: appartient(reussite.membre_id),
				titre: (f) => court(texte(f, 'projet')) || 'Mon témoignage',
				lien: (f) => `/reussites/${nombre(f, 'id')}`
			}
		]
	}
];

const LIBELLES_ETAT: Record<number, string> = {
	[Etat.NON_TRAITE]: 'En attente',
	[Etat.AUTORISE]: 'Publié',
	[Etat.CLOTURE]: 'Clôturé'
};

function construireModule(m: ModuleMembre, membreId: number, n = 3) {
	let total = 0;
	const fiches: FicheCourte[] = [];

	for (const src of m.sources) {
		const condition = and(src.condition(membreId), ne(src.table.etat, Etat.SUPPRIME));
		total +=
			db
				.select({ n: sql<number>`count(*)` })
				.from(src.table)
				.where(condition)
				.get()?.n ?? 0;

		const nomDate = src.date === undefined ? 'date_creation' : src.date;
		const colonneDate = nomDate
			? (src.table as unknown as Record<string, SQLiteColumn>)[nomDate]
			: null;
		let requete = db.select().from(src.table).where(condition).$dynamic();
		requete = colonneDate
			? requete.orderBy(desc(colonneDate), desc(src.table.id))
			: requete.orderBy(desc(src.table.id));

		for (const f of requete.limit(n).all() as Fiche[]) {
			fiches.push({
				id: nombre(f, 'id'),
				titre: src.titre(f) || `Fiche n° ${nombre(f, 'id')}`,
				reference: texte(f, 'reference'),
				etat: nombre(f, 'etat'),
				statut: src.statut ? src.statut(f) : (LIBELLES_ETAT[nombre(f, 'etat')] ?? ''),
				date: nomDate ? dateHeureFiche(champ(f, nomDate) as Date | null) : null,
				lien: src.lien(f)
			});
		}
	}

	fiches.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
	return {
		cle: m.cle,
		libelle: m.libelle,
		total,
		lien_liste: m.lien_liste,
		lien_nouveau: m.lien_nouveau,
		fiches: fiches.slice(0, n)
	};
}

/** Libellés des champs qui manquent au calcul de complétion (`profil_complet`). */
function champsManquants(membre: Membre): string[] {
	const manquants: string[] = [];
	if (!membre.email) manquants.push('E-mail');
	if (!membre.adresse) manquants.push('Adresse');
	if (!membre.ville_id) manquants.push('Ville');
	if (membre.categorie === CategorieMembre.PHYSIQUE) {
		if (membre.sexe !== 1 && membre.sexe !== 2) manquants.push('Sexe');
		if (!membre.situation_matrimoniale) manquants.push('Situation matrimoniale');
	} else if (!membre.domaine_activite_id) {
		manquants.push("Domaine d'activité");
	}
	if (!membre.photo) manquants.push('Photo');
	return manquants;
}

/**
 * Tableau de bord du membre : complétion du profil, fiches par module (calculées directement
 * sur les tables), derniers paiements, messages non lus.
 */
routeur.get('/tableau', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const moi = vueMembreMoi(membre);

	const profil = {
		id: moi.id,
		pseudonyme: moi.pseudonyme,
		nom: moi.nom,
		categorie: moi.categorie,
		type_compte: moi.type_compte,
		etat: moi.etat,
		code_membre: moi.code_membre,
		photo_url: moi.photo_url,
		profil_complet: moi.profil_complet,
		champs_manquants: champsManquants(membre),
		date_creation: moi.date_creation,
		date_limite_master: moi.date_limite_master,
		point_caisse_actif: moi.point_caisse_actif,
		solde_point_caisse: moi.solde_point_caisse,
		date_dernier_pointage: moi.date_dernier_pointage,
		a_code_pointage: !!membre.code_pointage_hash
	};

	// Seuls les modules réellement utilisés par le membre sont renvoyés.
	const modules = MODULES.map((m) => construireModule(m, membre.id)).filter((m) => m.total > 0);

	const paiements = db
		.select({
			id: paiement.id,
			type_objet: paiement.type_objet,
			objet_id: paiement.objet_id,
			date_paiement: paiement.date_paiement,
			mode: paiement.mode,
			montant: paiement.montant,
			remarque: paiement.remarque,
			etat: paiement.etat
		})
		.from(paiement)
		.where(eq(paiement.membre_id, membre.id))
		.orderBy(desc(paiement.date_paiement))
		.limit(5)
		.all();

	const enAttente =
		db
			.select({ n: sql<number>`count(*)` })
			.from(paiement)
			.where(and(eq(paiement.membre_id, membre.id), eq(paiement.etat, EtatPaiement.NON_CONFIRME)))
			.get()?.n ?? 0;

	const nonLus =
		db
			.select({ n: sql<number>`count(*)` })
			.from(message)
			.where(
				and(
					eq(message.membre_id, membre.id),
					eq(message.de_la_frangine, true),
					eq(message.lu, false)
				)
			)
			.get()?.n ?? 0;

	res.json({
		profil,
		modules,
		paiements,
		paiements_en_attente: enAttente,
		messages_non_lus: nonLus
	});
});

// --- Identifiant et code de pointage (F-TRV-26) ---------------------------------------------------

const identifiantEntreeSchema = z.object({
	identifiant: z
		.string()
		.trim()
		.regex(/^[A-Za-z0-9_.\-@]{4,50}$/, {
			message: "L'identifiant doit contenir de 4 à 50 caractères (lettres, chiffres, . _ - @)."
		}),
	mot_de_passe: z.string().min(1).max(200)
});

/**
 * Le membre change son identifiant de connexion (unicité contrôlée — correctif du legacy, qui
 * désactivait ce contrôle en modification).
 */
routeur.put('/identifiant', membreRequis, async (req, res) => {
	const membre = exigerMembre(req);
	const d = valider(identifiantEntreeSchema, req.body);

	if (!(await verifierMotDePasse(d.mot_de_passe, membre.mot_de_passe_hash))) {
		throw erreur('Mot de passe incorrect.', { mot_de_passe: 'Mot de passe incorrect.' });
	}
	const pris = db
		.select({ id: tableMembre.id })
		.from(tableMembre)
		.where(
			and(
				sql`lower(${tableMembre.identifiant}) = ${d.identifiant.toLowerCase()}`,
				ne(tableMembre.id, membre.id)
			)
		)
		.limit(1)
		.get();
	if (pris) {
		throw erreur('Cet identifiant est déjà utilisé.', {
			identifiant: 'Cet identifiant est déjà utilisé.'
		});
	}

	db.update(tableMembre)
		.set({ identifiant: d.identifiant })
		.where(eq(tableMembre.id, membre.id))
		.run();
	res.json(ok('Modification effectuée.', membre.id));
});

const codePointageEntreeSchema = z.object({
	mot_de_passe: z.string().min(1).max(200),
	code: z
		.string()
		.trim()
		.regex(/^\d{4}$/, { message: 'Le code de pointage comporte exactement 4 chiffres.' }),
	confirmation: z.string()
});

const verificationsCodePointage: VerificationsCroisees = (brut, champs) => {
	if (String(brut.confirmation ?? '').trim() !== String(brut.code ?? '').trim()) {
		champs.confirmation ??= 'La confirmation ne correspond pas au code.';
	}
};

/**
 * Le titulaire d'une carte de pointage choisit son code à 4 chiffres (stocké haché,
 * ADR-0005 §7).
 */
routeur.put('/code-pointage', membreRequis, async (req, res) => {
	const membre = exigerMembre(req);
	const d = valider(codePointageEntreeSchema, req.body, verificationsCodePointage);

	if (!membre.point_caisse_actif) {
		throw erreur("Votre compte n'a pas de carte de pointage. Demandez-la à la frangine.");
	}
	if (!(await verifierMotDePasse(d.mot_de_passe, membre.mot_de_passe_hash))) {
		throw erreur('Mot de passe incorrect.', { mot_de_passe: 'Mot de passe incorrect.' });
	}

	const hash = await hacherMotDePasse(d.code);
	db.update(tableMembre)
		.set({ code_pointage_hash: hash })
		.where(eq(tableMembre.id, membre.id))
		.run();
	res.json(ok('Votre code de pointage est modifié. Ne le communiquez à personne.', membre.id));
});
