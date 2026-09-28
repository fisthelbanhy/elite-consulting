/**
 * Crée une base de développement utilisable **sans le dump de production** (ADR-0012).
 * Portage de `backend/scripts/donnees_demo.py`.
 *
 * Charge les référentiels versionnés (`fixtures/referentiels.json`), puis crée des comptes et
 * quelques fiches de démonstration dans chaque module. Destiné aux sessions cloud et aux nouveaux
 * postes ; pour travailler sur les vraies données, utiliser le script de reprise du legacy.
 *
 * Usage (depuis la racine) : `npm run donnees:demo`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTableColumns, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { config } from '../config.js';
import { db, sqlite } from '../db.js';
import {
	CategorieMembre,
	Confidentialite,
	Etat,
	NeufOccasion,
	OffreDemande,
	Periodicite,
	Sexe,
	SituationBien,
	TypeAnnonceRH,
	TypeApportFond,
	TypeBien,
	TypeMembre,
	TypeTransaction
} from '../enums.js';
import { article, articleCourse, immobilier, produit } from '../schema/commerce.js';
import {
	conseil,
	contact,
	maladie,
	maladieProduit,
	message,
	suggestion
} from '../schema/contenu.js';
import {
	banque,
	diplome,
	domaineActivite,
	familleArticle,
	parametre,
	quartier,
	secteurActivite,
	ville
} from '../schema/core.js';
import { entreprise, marche, projet, reussite } from '../schema/entreprises.js';
import {
	appelFond,
	collecteFond,
	cotisationLikelemba,
	groupeLikelemba,
	membreLikelemba
} from '../schema/fonds.js';
import { membre as tableMembre } from '../schema/membres.js';
import { businessPlan, partenariat } from '../schema/opportunite.js';
import { annonceEmploi } from '../schema/rh.js';
import { hacherMotDePasse } from '../securite.js';
import { nouvelleReference, Prefixe } from '../services/references.js';
import { appliquerMigrations } from './migrer.js';

const MOT_DE_PASSE = 'demo1234';
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FIXTURES = join(RACINE, 'backend', 'fixtures', 'referentiels.json');

const maintenant = new Date();
const AUJ = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

/** `AUJ` décalé de `n` jours (négatif pour le passé). */
function jours(n: number): Date {
	return new Date(AUJ.getTime() + n * 86_400_000);
}

/** Tables du fichier de référentiels, dans l'ordre des dépendances. */
const TABLES: [string, SQLiteTable][] = [
	['parametre', parametre],
	['ville', ville],
	['quartier', quartier],
	['secteur_activite', secteurActivite],
	['domaine_activite', domaineActivite],
	['diplome', diplome],
	['famille_article', familleArticle],
	['banque', banque],
	['produit', produit],
	['maladie', maladie],
	['maladie_produit', maladieProduit]
];

/**
 * Les dates du fichier JSON sont des chaînes ISO ; Drizzle attend des `Date` pour les colonnes
 * `DATE`/`DATETIME`. On convertit d'après le type déclaré de chaque colonne.
 */
function convertirDates(table: SQLiteTable, ligne: Record<string, unknown>) {
	// Les colonnes `DATE`/`DATETIME` sont des types personnalisés (voir `db.ts`), d'où `custom`.
	for (const [nom, colonne] of Object.entries(getTableColumns(table))) {
		const v = ligne[nom];
		if (typeof v === 'string' && colonne.dataType === 'custom' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
			const [date, heure = '00:00:00'] = v.split(/[ T]/);
			const [a, m, j] = date!.split('-').map(Number);
			const [hh, mm, ss] = heure.split(':').map(Number);
			ligne[nom] = new Date(a!, m! - 1, j!, hh ?? 0, mm ?? 0, Math.trunc(ss ?? 0));
		}
	}
	return ligne;
}

function chargerReferentiels(): void {
	const donnees = JSON.parse(readFileSync(FIXTURES, 'utf8')) as Record<
		string,
		Record<string, unknown>[]
	>;
	for (const [nom, table] of TABLES) {
		const lignes = donnees[nom] ?? [];
		if (!lignes.length) continue;
		db.insert(table)
			.values(lignes.map((l) => convertirDates(table, { ...l })) as never)
			.run();
	}
}

async function creerMembre(
	identifiant: string,
	nom: string,
	pseudonyme: string,
	extra: Record<string, unknown> = {}
) {
	const cree = db
		.insert(tableMembre)
		.values({
			identifiant,
			nom,
			pseudonyme,
			mot_de_passe_hash: await hacherMotDePasse(MOT_DE_PASSE),
			etat: Etat.AUTORISE,
			categorie: CategorieMembre.PHYSIQUE,
			ville_id: 2,
			sexe: Sexe.INDEFINI,
			...extra
		})
		.returning()
		.get()!;
	const code = nouvelleReference(Prefixe.MEMBRE);
	db.update(tableMembre)
		.set({ code_membre: code })
		.where(sql`${tableMembre.id} = ${cree.id}`)
		.run();
	return { ...cree, code_membre: code };
}

/**
 * Vide la base : le script repart toujours d'un schéma neuf. Le journal des migrations est
 * supprimé avec le reste, pour que `appliquerMigrations()` reconstruise tout.
 */
function repartirDeZero(): void {
	const tables = sqlite
		.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
		.all() as { name: string }[];
	sqlite.pragma('foreign_keys = OFF');
	for (const { name } of tables) sqlite.prepare(`drop table if exists "${name}"`).run();
	sqlite.pragma('foreign_keys = ON');
}

/** Recrée le schéma puis le remplit. */
async function remplir(): Promise<void> {
	if (config.environnement !== 'dev' && config.environnement !== 'test') {
		console.error('Refusé : script réservé au développement (LF_ENVIRONNEMENT=dev).');
		process.exit(1);
	}
	repartirDeZero();
	appliquerMigrations();
	chargerReferentiels();

	// --- Comptes ---------------------------------------------------------------------------------
	const frangine = await creerMembre('demo.gestion', 'Frangine démo', 'La frangine', {
		type_compte: TypeMembre.GESTIONNAIRE,
		telephone: '065697797',
		email: 'contact@exemple.cg',
		droit_attribution: true,
		droit_caisse: true,
		droit_activation: true,
		point_caisse_actif: true,
		code_pointage_hash: await hacherMotDePasse('1234'),
		derniere_activite: new Date()
	});
	const grace = await creerMembre('demo.membre', 'Mabiala - Grace', 'Grace M.', {
		telephone: '061112233',
		email: 'grace@exemple.cg',
		sexe: Sexe.FEMININ,
		situation_matrimoniale: 3,
		nombre_enfants: 2
	});
	const junior = await creerMembre('demo.candidat', 'Okemba - Junior', 'Junior O.', {
		telephone: '065554433',
		sexe: Sexe.MASCULIN,
		ville_id: 3
	});
	const societe = await creerMembre('demo.entreprise', 'AGRI CONGO', 'AGC', {
		categorie: CategorieMembre.MORALE,
		telephone: '066778899',
		email: 'contact@agricongo.cg',
		forme_juridique: 2,
		domaine_activite_id: 1
	});
	const boutique = await creerMembre('demo.boutique', 'SUPER MARCHE TOTAL', 'SMT', {
		categorie: CategorieMembre.MORALE,
		telephone: '064443322',
		type_partenaire: 2
	});

	// --- Entreprise, marchés, projets ------------------------------------------------------------
	const fiche = db
		.insert(entreprise)
		.values({
			reference: nouvelleReference(Prefixe.ENTREPRISE),
			membre_id: societe.id,
			nom: 'AGRI CONGO',
			secteur_id: 4,
			domaine_id: 35,
			forme_juridique: 2,
			capital_social: 5_000_000,
			ville_id: 2,
			description: 'Production et transformation de manioc et de maïs dans le Pool.',
			gerant: 'Okemba Junior',
			telephone: '066778899',
			email: 'contact@agricongo.cg',
			adresse: 'Route de Kinkala, Brazzaville',
			etat: Etat.AUTORISE
		})
		.returning()
		.get()!;

	db.insert(marche)
		.values({
			reference: nouvelleReference(Prefixe.MARCHE),
			auteur_id: frangine.id,
			numero_appel_offre: 'AO-2026-014',
			type_marche: Confidentialite.PUBLIC,
			libelle: 'Fourniture de matériel informatique',
			description: "Appel d'offres pour la fourniture de 40 ordinateurs portables et accessoires.",
			montant: 45_000_000,
			date_limite: jours(21),
			lieu_depot: 'Direction des marchés, Brazzaville',
			maitre_ouvrage: 'Ministère des PME',
			publie_par: 'La Frangine',
			dossier_a_fournir: 'RCCM, NIU, attestation fiscale',
			etat: Etat.AUTORISE
		})
		.run();
	db.insert(projet)
		.values({
			reference: nouvelleReference(Prefixe.PROJET),
			auteur_id: societe.id,
			responsable: 'AGRI CONGO',
			promoteur: 'Okemba Junior',
			objet: 'Unité de transformation de manioc',
			libelle: 'Chikwangue industrielle',
			objectif: 'Produire 2 tonnes de pâte de manioc par jour',
			description: "Installation d'une unité semi-industrielle à Kinkala avec 12 emplois créés.",
			duree_mois: 18,
			date_lancement: jours(60),
			conditions: 'Partenaires techniques et financiers',
			etat: Etat.AUTORISE
		})
		.run();

	// --- Emplois ---------------------------------------------------------------------------------
	db.insert(annonceEmploi)
		.values([
			{
				reference: nouvelleReference(Prefixe.DEMANDE_EMPLOI),
				auteur_id: junior.id,
				type_annonce: TypeAnnonceRH.DEMANDE,
				domaine_id: 1,
				secteur_id: 1,
				nom: 'OKEMBA',
				prenom: 'Junior',
				sexe: Sexe.MASCULIN,
				date_naissance: new Date(1998, 3, 12),
				telephone: '065554433',
				diplomes: 'Licence en gestion',
				competences: 'Comptabilité, tableur, gestion de stock',
				experience: '2 ans en tenue de caisse dans une quincaillerie.',
				etat: Etat.AUTORISE
			},
			{
				reference: nouvelleReference(Prefixe.OFFRE_EMPLOI),
				auteur_id: societe.id,
				type_annonce: TypeAnnonceRH.OFFRE,
				domaine_id: 1,
				secteur_id: 1,
				poste_a_pourvoir: "Chef d'équipe production",
				competences: "Encadrement d'équipe, hygiène alimentaire",
				diplomes: 'BAC minimum',
				experience: '3 ans en agroalimentaire',
				autres_informations: 'Poste basé à Kinkala, logement possible.',
				etat: Etat.AUTORISE
			}
		])
		.run();

	// --- Annonces --------------------------------------------------------------------------------
	db.insert(immobilier)
		.values([
			{
				reference: nouvelleReference(Prefixe.IMMOBILIER),
				auteur_id: grace.id,
				offre_ou_recherche: OffreDemande.OFFRE,
				type_transaction: TypeTransaction.LOCATION,
				type_bien: TypeBien.APPARTEMENT,
				quartier_id: 1,
				localisation: 'Bacongo, près du marché Total',
				surface_m2: 75,
				nombre_pieces: 3,
				nombre_chambres: 2,
				situation: SituationBien.DISPONIBLE,
				prix: 150_000,
				description:
					'Appartement de 3 pièces, eau et électricité, cour fermée. Libre immédiatement.',
				etat: Etat.AUTORISE
			},
			{
				reference: nouvelleReference(Prefixe.IMMOBILIER),
				auteur_id: junior.id,
				offre_ou_recherche: OffreDemande.DEMANDE,
				type_transaction: TypeTransaction.LOCATION,
				type_bien: TypeBien.MAISON,
				quartier_id: 1,
				localisation: 'Pointe-Noire, centre-ville',
				prix: 100_000,
				description:
					'Recherche maison 2 chambres à Pointe-Noire pour une famille, budget 100 000 FCFA.',
				etat: Etat.AUTORISE
			}
		])
		.run();
	db.insert(article)
		.values({
			reference: nouvelleReference(Prefixe.ARTICLE),
			auteur_id: grace.id,
			famille_id: 1,
			offre_ou_recherche: OffreDemande.OFFRE,
			libelle: 'Sac à main en cuir',
			prix: 25_000,
			quantite: 4,
			neuf_ou_occasion: NeufOccasion.NEUF,
			description: 'Sacs à main en cuir véritable, plusieurs couleurs disponibles.',
			etat: Etat.AUTORISE
		})
		.run();
	db.insert(partenariat)
		.values({
			reference: nouvelleReference(Prefixe.PARTENARIAT),
			auteur_id: societe.id,
			actif: '120 hectares de terres cultivables à Kinkala',
			description: "Terrain viabilisé, accès route, point d'eau.",
			recherche: 'Partenaire avec tracteur et apport de 50 000 000 FCFA',
			objectif: 'Transformer les 120 ha de manioc en pâte, partage des bénéfices 60/40.',
			etat: Etat.AUTORISE
		})
		.run();
	db.insert(articleCourse)
		.values(
			[
				['RIZ25', 'Riz parfumé 25 kg', 22_000],
				['HUI5', 'Huile végétale 5 L', 7_500],
				['SUC1', 'Sucre en poudre 1 kg', 1_200]
			].map(([code, nom, prix]) => ({
				boutique_id: boutique.id,
				code: code as string,
				nom: nom as string,
				prix: prix as number,
				description: 'Article disponible en rayon.',
				etat: Etat.AUTORISE
			}))
		)
		.run();

	// --- Financer --------------------------------------------------------------------------------
	const appel = db
		.insert(appelFond)
		.values({
			reference: nouvelleReference(Prefixe.APPEL_FOND),
			auteur_id: societe.id,
			entreprise_id: fiche.id,
			secteur_id: 4,
			ville_id: 2,
			nom_projet: 'Unité de pâte de manioc à Kinkala',
			objet_projet: 'Transformation industrielle des tubercules de manioc',
			description_activite:
				"AGRI CONGO cultive 120 hectares de manioc et vend aujourd'hui la récolte brute.",
			description_projet:
				'Installer une unité de transformation pour vendre de la pâte conditionnée.',
			devis_projet: 221_580_000,
			apport_fond_propre: 22_180_000,
			besoin_financement: 50_000_000,
			niveau_realisation: 50,
			nom_promoteur: 'Okemba Junior',
			telephone_promoteur: '066778899',
			email_promoteur: 'contact@agricongo.cg',
			adresse_promoteur: 'Kinkala',
			montant_promis: 2_680_000,
			etat: Etat.AUTORISE
		})
		.returning()
		.get()!;
	db.insert(collecteFond)
		.values({
			reference: nouvelleReference(Prefixe.APPORT_FOND),
			appel_fond_id: appel.id,
			membre_id: grace.id,
			date_engagement: jours(-7),
			type_apport: TypeApportFond.CREDIT,
			montant_promis: 2_680_000,
			echeance_mois: 12,
			remarque: 'Je peux avancer la somme sur 12 mois.',
			etat: Etat.AUTORISE
		})
		.run();

	const groupe = db
		.insert(groupeLikelemba)
		.values({
			code: nouvelleReference(Prefixe.LIKELEMBA),
			responsable_id: frangine.id,
			montant_cotisation: 5_000,
			periodicite: Periodicite.SEMAINE,
			date_debut: jours(-30),
			observation: 'Likelemba des commerçantes du marché Total. Paiement par Mobile Money.',
			compteur_entrees: 1,
			compteur_paiements: 1,
			etat: Etat.AUTORISE
		})
		.returning()
		.get()!;
	const adhesion = db
		.insert(membreLikelemba)
		.values({
			groupe_id: groupe.id,
			membre_id: grace.id,
			code: `1${groupe.code}`,
			date_entree: jours(-30),
			caution_nom: 'Mabiala Antoine',
			caution_telephone: '066112233',
			caution_activite: 'Transporteur',
			temoins: [
				{ nom: 'Nsona Claire', telephone: '065998877', emploi: 'Couturière', est_membre: 2 }
			],
			etat: Etat.AUTORISE
		})
		.returning()
		.get()!;
	db.insert(cotisationLikelemba)
		.values({
			groupe_id: groupe.id,
			adhesion_id: adhesion.id,
			caissier_id: frangine.id,
			numero_recu: `${groupe.code}P1`,
			date_paiement: jours(-7),
			montant: 5_000,
			etat: Etat.AUTORISE
		})
		.run();

	// --- Se lancer et contenus -------------------------------------------------------------------
	const sujet = db
		.insert(conseil)
		.values({
			reference: nouvelleReference(Prefixe.CONSEIL),
			objet: 'Comment créer son entreprise au Congo en 2026 ?',
			texte:
				'Bonjour, je vends des pagnes depuis 5 ans et je voudrais me formaliser. ' +
				'Par où commencer, et combien cela coûte-t-il réellement ?',
			auteur_id: grace.id,
			confidentialite: Confidentialite.PUBLIC,
			nombre_reponses: 1,
			etat: Etat.AUTORISE
		})
		.returning()
		.get()!;
	db.insert(conseil)
		.values({
			reference: sujet.reference,
			sujet_id: sujet.id,
			auteur_id: frangine.id,
			texte:
				"Bonjour Grace ! Depuis décembre 2025, la création se fait en ligne à l'ACPCE. " +
				"Préparez une pièce d'identité et un justificatif d'adresse : on le fait ensemble.",
			confidentialite: Confidentialite.PUBLIC,
			etat: Etat.AUTORISE
		})
		.run();

	db.insert(reussite)
		.values({
			reference: nouvelleReference(Prefixe.REUSSITE),
			membre_id: grace.id,
			secteur_id: 15,
			situation_avant: 'Je vendais des pagnes au marché sans stock régulier.',
			vision: 'Ouvrir une boutique et employer deux personnes.',
			projet: 'Boutique de pagnes et cosmétiques à Bacongo',
			fond_demarrage: 150_000,
			besoin_reel_demarrage: 500_000,
			strategie: "J'ai rejoint une likelemba pour constituer mon stock, puis j'ai loué un local.",
			difficultes: 'Trouver un local abordable et gérer les crédits clients.',
			deploiement_efforts: 'Vente sur les réseaux sociaux et livraison à domicile.',
			succes: "J'ai ouvert ma boutique en 2025 et j'emploie aujourd'hui deux personnes.",
			conseil: 'Commencez petit, notez chaque franc, et entourez-vous.',
			etat: Etat.AUTORISE
		})
		.run();
	db.insert(businessPlan)
		.values({
			reference: nouvelleReference(Prefixe.BUSINESS_PLAN),
			membre_id: grace.id,
			type_activite: 'Commerce de pagnes et cosmétiques',
			description_projet:
				'Développer la boutique de Bacongo et ouvrir un point de vente à Poto-Poto.',
			moyens_actuels: 'Un local loué, un stock de 400 000 FCFA, une vendeuse.',
			ambition: 'Deux points de vente et une clientèle fidèle de 300 personnes.',
			niveau_realisation: 40,
			etat: Etat.NON_TRAITE
		})
		.run();
	db.insert(message)
		.values({
			membre_id: grace.id,
			auteur_id: frangine.id,
			de_la_frangine: true,
			texte:
				"Bonjour Grace, j'ai bien reçu votre diagnostic. Je vous appelle demain matin " +
				'pour préparer votre dossier de financement.'
		})
		.run();
	db.insert(contact)
		.values({
			nom: 'Visiteur démo',
			email: 'visiteur@exemple.cg',
			telephone: '060001122',
			objet: "Demande d'information",
			texte: 'Bonjour, comment rejoindre une likelemba ?',
			etat: Etat.NON_TRAITE
		})
		.run();
	db.insert(suggestion)
		.values({
			module: 4,
			texte: 'Ce serait bien de recevoir un rappel WhatsApp la veille de la cotisation.'
		})
		.run();

	console.log('Base de démonstration prête.');
	console.log(`  Mot de passe commun : ${MOT_DE_PASSE}   (code de pointage : 1234)`);
	for (const [identifiant, role] of [
		['demo.gestion', 'gestionnaire (tous droits)'],
		['demo.membre', 'membre'],
		['demo.candidat', 'membre (candidat)'],
		['demo.entreprise', 'entreprise'],
		['demo.boutique', 'boutique partenaire']
	]) {
		console.log(`  ${identifiant!.padEnd(16)} ${role}`);
	}
}

await remplir();
