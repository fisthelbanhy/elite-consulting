/**
 * Gestion des membres (portage de `app/routers/gestion_membres.py` ; legacy `pmembre.php` +
 * `incl-formulairemembre.php` en contexte gestionnaire) et des demandes de réinitialisation de mot
 * de passe (ADR-0005 §3). Inventaire : F-ADM-05 à F-ADM-15, F-ADM-40, F-TRV-23.
 *
 * Droits (ADR-0007 T1/T4) :
 * - consulter : tout gestionnaire ;
 * - créer, modifier, valider, supprimer une fiche, générer un code de pointage ou un lien de
 *   réinitialisation : droit Activation ;
 * - attribuer ou retirer des droits, promouvoir ou rétrograder un gestionnaire, agir sur le compte
 *   d'un autre gestionnaire : droit Attribution.
 */
import { and, asc, desc, eq, inArray, like, ne, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerDroit, exigerMembre, gestionnaireRequis } from '../deps.js';
import {
	BanqueBoutique,
	CategorieMembre,
	Etat,
	EtatCivil,
	EtatPaiement,
	FormeJuridique,
	libelle,
	Sexe,
	TypeMembre
} from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { paiement } from '../schema/commerce.js';
import { message as tableMessage } from '../schema/contenu.js';
import { banque, domaineActivite, parametre, ville as tableVille } from '../schema/core.js';
import {
	membre as tableMembre,
	reinitialisationMotDePasse,
	visiteMembre,
	type Membre
} from '../schema/membres.js';
import {
	dateFacultative,
	entier,
	entierFacultatif,
	booleen,
	ok,
	telephoneFacultatif,
	valider
} from '../schemas/commun.js';
import { paginer, recherche } from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	IMAGE,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import * as svc from '../services/gestion.js';
import { nouveauCodeMembre } from '../services/references.js';
import { normaliserTelephone } from '../services/validation.js';
import { hacherMotDePasse } from '../securite.js';

export const routeur = Router();
export const prefixe = '/gestion';

routeur.use(gestionnaireRequis);

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const IDENTIFIANT_VALIDE = /^[A-Za-z0-9_.\-@]{4,50}$/;

/**
 * Création ou modification complète d'une fiche par un gestionnaire (F-ADM-09/10). Les droits et le
 * mot de passe ont leurs propres actions.
 */
const membreEntreeSchema = z.object({
	type_compte: entier.min(1).max(3),
	categorie: entier.min(1).max(2),
	nom: z.string().max(120).default(''),
	pseudonyme: z.string().max(50).default(''),
	identifiant: z.string().max(50).default(''),
	telephone: telephoneFacultatif,
	email: z
		.union([z.literal(''), z.null(), z.email()])
		.optional()
		.transform((v) => v || null),
	ville_id: entierFacultatif,
	adresse: z.string().max(500).default(''),
	sexe: entierFacultatif,
	situation_matrimoniale: entierFacultatif,
	nombre_enfants: entier.min(0).max(30).default(0),
	employeur: z.string().max(120).default(''),
	numero_piece_identite: z.string().max(50).default(''),
	forme_juridique: entierFacultatif,
	type_partenaire: entierFacultatif,
	domaine_activite_id: entierFacultatif,
	observation: z.string().max(5000).default(''),
	etat: entier.min(1).max(3).default(2),
	point_caisse_actif: booleen,
	date_limite_master: dateFacultative,
	// Création seulement : vide = un lien d'activation est généré pour que le membre choisisse
	// lui-même son mot de passe.
	mot_de_passe: z.string().max(200).default('')
});

type MembreEntree = z.output<typeof membreEntreeSchema>;

const droitsEntreeSchema = z.object({
	droit_attribution: booleen,
	droit_caisse: booleen,
	droit_activation: booleen
});

const etatEntreeSchema = z.object({ etat: entier.min(1).max(3) });

// --- Liste, export -------------------------------------------------------------------------------

function conditionsMembres(
	moi: Membre,
	req: { query: Record<string, unknown> }
): (SQL | undefined)[] {
	const conditions: (SQL | undefined)[] = [];
	// F-ADM-08 : le compte système reste masqué des listes.
	if (moi.id !== svc.ID_COMPTE_SYSTEME) conditions.push(ne(tableMembre.id, svc.ID_COMPTE_SYSTEME));

	const nombre = (cle: string) => {
		const v = Number(req.query[cle]);
		return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
	};
	const typeCompte = nombre('type_compte');
	if (typeCompte) conditions.push(eq(tableMembre.type_compte, typeCompte));
	const categorie = nombre('categorie');
	if (categorie) conditions.push(eq(tableMembre.categorie, categorie));
	const villeId = nombre('ville_id');
	if (villeId) conditions.push(eq(tableMembre.ville_id, villeId));
	const etat = nombre('etat');
	conditions.push(etat ? eq(tableMembre.etat, etat) : ne(tableMembre.etat, Etat.SUPPRIME));

	const q = typeof req.query.q === 'string' ? req.query.q : null;
	const texte = recherche(
		q,
		tableMembre.nom,
		tableMembre.pseudonyme,
		tableMembre.observation,
		tableMembre.identifiant,
		tableMembre.email,
		tableMembre.code_membre,
		tableMembre.telephone
	);
	if (texte) {
		const tel = normaliserTelephone(q ?? '');
		conditions.push(
			/^\d+$/.test(tel) && tel.length >= 3
				? or(texte, like(tableMembre.telephone, `%${tel}%`))
				: texte
		);
	}
	return conditions;
}

function ordreMembres(req: { query: Record<string, unknown> }) {
	return req.query.tri === 'recents'
		? [desc(tableMembre.date_creation), desc(tableMembre.id)]
		: [asc(sql`lower(${tableMembre.nom})`), asc(tableMembre.type_compte)];
}

function villes() {
	return new Map(
		db
			.select({ id: tableVille.id, nom: tableVille.nom })
			.from(tableVille)
			.all()
			.map((v) => [v.id, v])
	);
}

function vueLigne(m: Membre, refs: Map<number, { id: number; nom: string }>) {
	return {
		id: m.id,
		type_compte: m.type_compte,
		categorie: m.categorie,
		code_membre: m.code_membre,
		nom: m.nom,
		pseudonyme: m.pseudonyme,
		telephone: m.telephone,
		email: m.email,
		ville: m.ville_id !== null ? (refs.get(m.ville_id) ?? null) : null,
		etat: m.etat,
		date_creation: m.date_creation,
		derniere_connexion: m.derniere_connexion,
		droit_attribution: m.droit_attribution,
		droit_caisse: m.droit_caisse,
		droit_activation: m.droit_activation,
		point_caisse_actif: m.point_caisse_actif,
		photo: m.photo,
		photo_url: url(m.photo)
	};
}

/**
 * F-ADM-05 à F-ADM-08 : filtres type, personnalité, ville, état, texte (nom, pseudonyme,
 * téléphone, observation…) ; tri par nom ou plus récents ; compte système masqué.
 */
routeur.get('/membres', (req, res) => {
	const moi = exigerMembre(req);
	const page = svc.paginationGestion(req);
	const requete = db
		.select()
		.from(tableMembre)
		.where(and(...conditionsMembres(moi, req).filter(Boolean)))
		.orderBy(...ordreMembres(req))
		.$dynamic();
	const liste = paginer<Membre>(requete, page);
	const refs = villes();
	res.json({
		items: liste.items.map((m) => vueLigne(m, refs)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Liste compacte pour les filtres (journal des connexions, paiements). */
routeur.get('/membres/options', (req, res) => {
	const moi = exigerMembre(req);
	const conditions: (SQL | undefined)[] = [ne(tableMembre.etat, Etat.SUPPRIME)];
	if (moi.id !== svc.ID_COMPTE_SYSTEME) conditions.push(ne(tableMembre.id, svc.ID_COMPTE_SYSTEME));
	const lignes = db
		.select({
			id: tableMembre.id,
			nom: tableMembre.nom,
			pseudonyme: tableMembre.pseudonyme
		})
		.from(tableMembre)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(sql`lower(${tableMembre.nom})`))
		.all();
	res.json(
		lignes.map((l) => ({
			value: l.id,
			label: l.pseudonyme && l.pseudonyme !== l.nom ? `${l.nom} (${l.pseudonyme})` : l.nom
		}))
	);
});

/** Neutralise l'injection de formules dans un tableur (=, +, -, @ en tête de cellule). */
function cellule(v: unknown): string {
	const t = v === null || v === undefined ? '' : String(v);
	return ['=', '+', '-', '@'].includes(t.slice(0, 1)) ? `'${t}` : t;
}

function ligneCsv(valeurs: unknown[]): string {
	return valeurs
		.map((v) => {
			const t = cellule(v);
			return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
		})
		.join(';');
}

function dateFr(d: Date | null, avecHeure = false): string {
	if (!d) return '';
	const deux = (n: number) => String(n).padStart(2, '0');
	const jour = `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}`;
	return avecHeure ? `${jour} ${deux(d.getHours())}:${deux(d.getMinutes())}` : jour;
}

/** Export CSV de la liste filtrée (F-ADM-40 : l'impression legacy était cassée). */
routeur.get('/membres/export', (req, res) => {
	const moi = exigerMembre(req);
	const membres = db
		.select()
		.from(tableMembre)
		.where(and(...conditionsMembres(moi, req).filter(Boolean)))
		.orderBy(...ordreMembres(req))
		.all();
	const refs = villes();

	const lignes = [
		ligneCsv([
			'Code',
			'Type',
			'Personnalité',
			'Nom',
			'Pseudonyme / sigle',
			'Téléphone',
			'E-mail',
			'Ville',
			'Adresse',
			'État',
			'Inscrit le',
			'Dernière connexion'
		])
	];
	for (const m of membres) {
		lignes.push(
			ligneCsv([
				m.code_membre,
				libelle('TypeMembre', m.type_compte),
				libelle('CategorieMembre', m.categorie),
				m.nom,
				m.pseudonyme,
				m.telephone,
				m.email ?? '',
				m.ville_id !== null ? (refs.get(m.ville_id)?.nom ?? '') : '',
				m.adresse,
				libelle('Etat', m.etat),
				dateFr(m.date_creation),
				dateFr(m.derniere_connexion, true)
			])
		);
	}

	const maintenant = new Date();
	const deux = (n: number) => String(n).padStart(2, '0');
	const nom =
		`membres-${maintenant.getFullYear()}${deux(maintenant.getMonth() + 1)}` +
		`${deux(maintenant.getDate())}-${deux(maintenant.getHours())}${deux(maintenant.getMinutes())}.csv`;
	res.setHeader('Content-Type', 'text/csv; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
	res.setHeader('Cache-Control', 'no-store');
	// BOM UTF-8 : Excel ouvre le fichier avec le bon encodage.
	res.send(Buffer.from(`\uFEFF${lignes.join('\r\n')}\r\n`, 'utf8'));
});

// --- Fiche ---------------------------------------------------------------------------------------

function peutModifierMembre(moi: Membre, cible: Membre): boolean {
	if (!moi.droit_activation) return false;
	return !(cible.type_compte === 1 && cible.id !== moi.id && !moi.droit_attribution);
}

routeur.get('/membres/:id', (req, res) => {
	const moi = exigerMembre(req);
	const m = svc.chargerMembre(Number(req.params.id));
	const compter = (requete: { get(): { n: number } | undefined }) => requete.get()?.n ?? 0;
	const domaine = m.domaine_activite_id
		? db.select().from(domaineActivite).where(eq(domaineActivite.id, m.domaine_activite_id)).get()
		: undefined;
	const demandes = db
		.select()
		.from(reinitialisationMotDePasse)
		.where(svc.demandesEnAttente(m.id))
		.orderBy(desc(reinitialisationMotDePasse.date_creation))
		.all();

	res.json({
		...vueLigne(m, villes()),
		sexe: m.sexe,
		identifiant: m.identifiant,
		adresse: m.adresse,
		observation: m.observation,
		ville_id: m.ville_id,
		numero_piece_identite: m.numero_piece_identite,
		employeur: m.employeur,
		situation_matrimoniale: m.situation_matrimoniale,
		nombre_enfants: m.nombre_enfants,
		forme_juridique: m.forme_juridique,
		type_partenaire: m.type_partenaire,
		domaine_activite_id: m.domaine_activite_id,
		date_limite_master: m.date_limite_master,
		solde_point_caisse: m.solde_point_caisse,
		date_dernier_pointage: m.date_dernier_pointage,
		derniere_activite: m.derniere_activite,
		// Calculés ici ; jamais le hash du mot de passe ni du code de pointage.
		domaine_libelle: domaine ? domaine.libelle : null,
		a_code_pointage: !!m.code_pointage_hash,
		en_ligne: svc.estEnLigne(m),
		nombre_connexions: compter(
			db
				.select({ n: sql<number>`count(*)` })
				.from(visiteMembre)
				.where(eq(visiteMembre.membre_id, m.id))
		),
		nombre_paiements: compter(
			db
				.select({ n: sql<number>`count(*)` })
				.from(paiement)
				.where(eq(paiement.membre_id, m.id))
		),
		paiements_en_attente: compter(
			db
				.select({ n: sql<number>`count(*)` })
				.from(paiement)
				.where(and(eq(paiement.membre_id, m.id), eq(paiement.etat, EtatPaiement.NON_CONFIRME)))
		),
		demandes_reinitialisation: demandes.map((r) => ({
			id: r.id,
			canal: r.canal,
			date_creation: r.date_creation
		})),
		est_moi: m.id === moi.id,
		peut_modifier: peutModifierMembre(moi, m),
		peut_attribuer: moi.droit_attribution
	});
});

/** Règles de `incl-formulairemembre.php` (messages repris, orthographe corrigée). */
function validerMembre(d: MembreEntree, exclureId?: number): void {
	const physique = d.categorie === CategorieMembre.PHYSIQUE;
	const champs: Record<string, string> = {};

	if (d.nom.trim().length < 3) {
		champs.nom = physique
			? 'Le nom et prénom doivent avoir 3 caractères minimum.'
			: 'Le nom de la personne morale doit avoir 3 caractères minimum.';
	}
	const pseudo = d.pseudonyme.trim();
	if (physique && pseudo.length < 6) {
		champs.pseudonyme = 'Le pseudonyme doit avoir 6 caractères minimum.';
	} else if (!physique && pseudo.length < 3) {
		champs.pseudonyme = 'Le sigle de la société doit avoir 3 caractères minimum.';
	}
	if (!IDENTIFIANT_VALIDE.test(d.identifiant.trim())) {
		champs.identifiant =
			"L'identifiant doit contenir de 4 à 50 caractères (lettres, chiffres, . _ - @).";
	}
	const ville = d.ville_id
		? db.select().from(tableVille).where(eq(tableVille.id, d.ville_id)).get()
		: undefined;
	if (!d.ville_id || !ville) champs.ville_id = 'Veuillez indiquer la ville du membre.';

	if (physique) {
		const etatsCivils: number[] = Object.values(EtatCivil);
		if (d.situation_matrimoniale !== null && !etatsCivils.includes(d.situation_matrimoniale)) {
			champs.situation_matrimoniale = 'Situation matrimoniale inconnue.';
		}
	} else {
		const formes: number[] = Object.values(FormeJuridique);
		if (d.forme_juridique !== null && !formes.includes(d.forme_juridique)) {
			champs.forme_juridique = 'Forme juridique inconnue.';
		}
		const partenaires: number[] = Object.values(BanqueBoutique);
		if (d.type_partenaire !== null && !partenaires.includes(d.type_partenaire)) {
			champs.type_partenaire = 'Valeur inconnue.';
		}
		if (d.domaine_activite_id) {
			const domaine = db
				.select()
				.from(domaineActivite)
				.where(eq(domaineActivite.id, d.domaine_activite_id))
				.get();
			if (!domaine) champs.domaine_activite_id = "Domaine d'activité inconnu.";
		}
	}
	if (d.mot_de_passe) {
		if (d.mot_de_passe.length < 8) {
			champs.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères.';
		} else if (d.mot_de_passe.toLowerCase() === d.identifiant.trim().toLowerCase()) {
			champs.mot_de_passe = "Le mot de passe doit être différent de l'identifiant.";
		}
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	svc.verifierUnicite(
		{
			identifiant: d.identifiant.trim(),
			pseudonyme: pseudo,
			telephone: d.telephone,
			email: d.email
		},
		exclureId
	);
}

function champsMembre(d: MembreEntree) {
	const commun = {
		type_compte: d.type_compte,
		categorie: d.categorie,
		nom: d.nom.trim(),
		pseudonyme: d.pseudonyme.trim(),
		identifiant: d.identifiant.trim(),
		telephone: d.telephone,
		email: d.email,
		ville_id: d.ville_id,
		adresse: d.adresse.trim(),
		observation: d.observation.trim(),
		point_caisse_actif: d.point_caisse_actif,
		date_limite_master: d.date_limite_master,
		numero_piece_identite: d.numero_piece_identite.trim()
	};
	if (d.categorie === CategorieMembre.PHYSIQUE) {
		return {
			...commun,
			sexe: d.sexe === Sexe.FEMININ || d.sexe === Sexe.MASCULIN ? d.sexe : Sexe.INDEFINI,
			situation_matrimoniale: d.situation_matrimoniale,
			nombre_enfants: d.nombre_enfants,
			employeur: d.employeur.trim(),
			forme_juridique: null,
			type_partenaire: null,
			domaine_activite_id: null
		};
	}
	// Personne morale : sexe « Indéfini », pas d'enfants (règle legacy) ; forme juridique dans sa
	// propre colonne (ADR-0007 T5).
	return {
		...commun,
		sexe: Sexe.INDEFINI,
		situation_matrimoniale: null,
		nombre_enfants: 0,
		employeur: '',
		forme_juridique: d.forme_juridique,
		type_partenaire: d.type_partenaire,
		domaine_activite_id: d.domaine_activite_id
	};
}

/**
 * F-TRV-23 : une personne morale « Banque » alimente le référentiel des banques (sans écraser la
 * banque n° 1 comme le legacy, F-TRV-29).
 */
function banqueDuMembre(m: Membre): void {
	if (m.categorie !== CategorieMembre.MORALE || m.type_partenaire !== BanqueBoutique.BANQUE) {
		return;
	}
	const existe = db
		.select({ id: banque.id })
		.from(banque)
		.where(eq(banque.membre_id, m.id))
		.limit(1)
		.get();
	if (existe) return;
	db.insert(banque)
		.values({
			membre_id: m.id,
			nom: m.nom,
			sigle: m.pseudonyme.toUpperCase().slice(0, 30),
			telephones: m.telephone,
			email: m.email ?? '',
			adresse: m.adresse,
			etat: Etat.AUTORISE
		})
		.run();
}

function nomSite(): string {
	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	return p?.nom_site || 'La Frangine';
}

/** Lien à usage unique à transmettre au membre (affiché une seule fois). */
function vueLien(m: Membre, jeton: string, expire: Date, activation = false) {
	const chemin = `/reinitialiser/${jeton}`;
	const lien = `${config.siteUrl}${chemin}`;
	const site = nomSite();
	const texte = activation
		? `Bienvenue sur ${site}, ${m.pseudonyme} ! Votre identifiant : ${m.identifiant}. ` +
			`Choisissez votre mot de passe avec ce lien (valable 24 h, une seule fois) : ${lien}`
		: `Bonjour ${m.pseudonyme}, voici votre lien pour choisir un nouveau mot de passe sur ${site} ` +
			`(valable 24 h, une seule fois) : ${lien}`;
	const message = activation
		? "Compte créé. Transmettez le lien d'activation au membre : il ne sera plus affiché."
		: 'Lien de réinitialisation créé. Transmettez-le au membre : il ne sera plus affiché.';
	return {
		message,
		id: m.id,
		chemin,
		lien,
		expire,
		membre: { id: m.id, pseudonyme: m.pseudonyme, nom: m.nom },
		telephone: m.telephone,
		message_whatsapp: texte
	};
}

/** F-ADM-09 : création d'un membre ou d'un gestionnaire (type, point caisse, état). */
routeur.post('/membres', async (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const donnees = valider(membreEntreeSchema, req.body);
	if (donnees.type_compte === TypeMembre.GESTIONNAIRE) exigerDroit(moi, 'attribution');
	validerMembre(donnees);

	const hash = donnees.mot_de_passe ? await hacherMotDePasse(donnees.mot_de_passe) : '!';
	const resultat = db.transaction(() => {
		const m = db
			.insert(tableMembre)
			.values({
				etat: donnees.etat,
				mot_de_passe_hash: hash,
				code_membre: nouveauCodeMembre(),
				...champsMembre(donnees)
			})
			.returning()
			.get()!;
		banqueDuMembre(m);
		if (!donnees.mot_de_passe) {
			const { jeton, expire } = svc.creerLienReinitialisation(m, moi);
			return { m, activation: vueLien(m, jeton, expire, true) };
		}
		return { m, activation: null };
	});

	res.status(201).json({
		message: 'Enregistrement effectué.',
		id: resultat.m.id,
		reference: resultat.m.code_membre,
		activation: resultat.activation
	});
});

function changerEtatMembre(moi: Membre, m: Membre, etat: number): void {
	if (etat === m.etat) return;
	svc.interdireSurSoi(moi, m, "changer l'état de");
	svc.exigerAttributionSiGestionnaire(moi, m);
	const ancien = m.etat;
	db.update(tableMembre).set({ etat }).where(eq(tableMembre.id, m.id)).run();
	m.etat = etat;
	if (etat === Etat.SUPPRIME) {
		// Un compte supprimé ne peut plus se connecter.
		svc.fermerSessions(m.id);
	} else if (ancien === Etat.NON_TRAITE && etat === Etat.AUTORISE) {
		db.insert(tableMessage)
			.values({
				membre_id: m.id,
				de_la_frangine: true,
				auteur_id: moi.id,
				texte:
					`Bonne nouvelle ${m.pseudonyme} : votre compte est validé par la frangine. ` +
					'Complétez votre profil dans « Mon espace » pour profiter de tous les services, ' +
					'et écrivez-nous si vous avez une question.'
			})
			.run();
	}
}

/**
 * F-ADM-10 : modification complète, nom et personnalité compris. Les droits ne sont jamais touchés
 * par cet écran (correctif F-ADM-12).
 */
routeur.put('/membres/:id', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const m = svc.chargerMembre(Number(req.params.id));
	svc.exigerAttributionSiGestionnaire(moi, m);
	const donnees = valider(membreEntreeSchema, req.body);

	const estGestionnaire = m.type_compte === 1;
	if ((donnees.type_compte === TypeMembre.GESTIONNAIRE) !== estGestionnaire) {
		svc.interdireSurSoi(moi, m, 'changer le type de');
		exigerDroit(moi, 'attribution');
	}
	if (donnees.type_compte !== m.type_compte) svc.interdireSurSoi(moi, m, 'changer le type de');
	validerMembre(donnees, m.id);

	db.transaction(() => {
		db.update(tableMembre).set(champsMembre(donnees)).where(eq(tableMembre.id, m.id)).run();
		Object.assign(m, champsMembre(donnees));
		changerEtatMembre(moi, m, donnees.etat);
		if (m.type_compte !== 1) {
			// Un compte qui n'est plus gestionnaire perd ses droits d'administration.
			db.update(tableMembre)
				.set({
					droit_attribution: false,
					droit_caisse: false,
					droit_activation: false
				})
				.where(eq(tableMembre.id, m.id))
				.run();
		}
		banqueDuMembre(m);
	});
	res.json(ok('Modification effectuée.', m.id, m.code_membre));
});

/** F-ADM-15 : validation d'un nouveau membre (Non traité → Autorisé), ou suppression logique. */
routeur.post('/membres/:id/etat', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const m = svc.chargerMembre(Number(req.params.id));
	const donnees = valider(etatEntreeSchema, req.body);
	db.transaction(() => changerEtatMembre(moi, m, donnees.etat));
	const message =
		donnees.etat === Etat.AUTORISE
			? 'Membre validé.'
			: donnees.etat === Etat.SUPPRIME
				? 'Membre supprimé.'
				: 'Modification effectuée.';
	res.json(ok(message, m.id));
});

/** Suppression logique (état 3) : le compte ne se connecte plus, ses données sont gardées. */
routeur.delete('/membres/:id', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const m = svc.chargerMembre(Number(req.params.id));
	db.transaction(() => changerEtatMembre(moi, m, Etat.SUPPRIME));
	res.json(ok('Membre supprimé.', m.id));
});

/** F-ADM-11/12 : seuls les gestionnaires ayant le droit d'attribution modifient les droits. */
routeur.put('/membres/:id/droits', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'attribution');
	const m = svc.chargerMembre(Number(req.params.id));
	if (m.type_compte !== 1) {
		throw erreur(
			"Les droits ne concernent que les gestionnaires : changez d'abord le type de compte."
		);
	}
	const donnees = valider(droitsEntreeSchema, req.body);
	if (m.id === moi.id && !donnees.droit_attribution) {
		throw interdit("Vous ne pouvez pas retirer votre propre droit d'attribution.");
	}
	db.update(tableMembre)
		.set({
			droit_attribution: donnees.droit_attribution,
			droit_caisse: donnees.droit_caisse,
			droit_activation: donnees.droit_activation
		})
		.where(eq(tableMembre.id, m.id))
		.run();
	res.json(ok('Droits modifiés.', m.id));
});

/**
 * F-ADM-13 : nouveau code de pointage à 4 chiffres, affiché une seule fois, stocké haché
 * (ADR-0005 §7).
 */
routeur.post('/membres/:id/code-pointage', async (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const m = svc.chargerMembre(Number(req.params.id));
	if (m.etat === Etat.SUPPRIME) throw erreur('Ce compte est supprimé.');
	const code = await svc.attribuerCodePointage(m.id);
	res.json({
		message: 'Nouveau code de pointage généré. Communiquez-le au membre : il ne sera plus affiché.',
		id: m.id,
		code
	});
});

function reinitialiser(moi: Membre, m: Membre) {
	exigerDroit(moi, 'activation');
	if (m.id === moi.id) {
		throw interdit('Pour changer votre propre mot de passe, utilisez « Mon profil ».');
	}
	svc.exigerAttributionSiGestionnaire(moi, m);
	if (m.etat === Etat.SUPPRIME) {
		throw erreur('Ce compte est supprimé : réactivez-le avant de réinitialiser son mot de passe.');
	}
	const { jeton, expire } = db.transaction(() => svc.creerLienReinitialisation(m, moi));
	return vueLien(m, jeton, expire);
}

/**
 * F-ADM-14 : le gestionnaire ne voit jamais le mot de passe ; il transmet un lien à usage unique au
 * membre (WhatsApp, téléphone).
 */
routeur.post('/membres/:id/reinitialisation', (req, res) => {
	const moi = exigerMembre(req);
	res.json(reinitialiser(moi, svc.chargerMembre(Number(req.params.id))));
});

routeur.post('/membres/:id/photo', televersement.single('fichier'), async (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const m = svc.chargerMembre(Number(req.params.id));
	svc.exigerAttributionSiGestionnaire(moi, m);
	if (!req.file)
		throw erreur('Aucun fichier reçu.', {
			photo: 'Veuillez choisir une image.'
		});
	const ancien = m.photo;
	const chemin = await enregistrerFichier(req.file.buffer, 'membres', new Set([IMAGE]), 'photo');
	db.update(tableMembre).set({ photo: chemin }).where(eq(tableMembre.id, m.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', m.id));
});

// --- Demandes de réinitialisation ----------------------------------------------------------------

type Demande = typeof reinitialisationMotDePasse.$inferSelect;

function statut(r: Demande, maintenant: Date): string {
	if (r.jeton_hash === null) {
		if (r.traitee_par_id === null) return 'en_attente';
		return r.date_utilisation ? 'ignoree' : 'prise_en_charge';
	}
	if (r.date_utilisation) return 'utilise';
	if (r.date_expiration && r.date_expiration.getTime() < maintenant.getTime()) return 'expire';
	return 'lien_actif';
}

/**
 * Demandes issues de « Mot de passe oublié » pour les membres sans e-mail (à rappeler avant de leur
 * transmettre un lien), et historique des liens.
 */
routeur.get('/reinitialisations', (req, res) => {
	const moi = exigerMembre(req);
	const page = svc.paginationGestion(req);
	const conditions: (SQL | undefined)[] = [];
	const statutDemande = typeof req.query.statut === 'string' ? req.query.statut : 'attente';
	if (statutDemande === 'attente') conditions.push(svc.demandesEnAttente());
	if (moi.id !== svc.ID_COMPTE_SYSTEME) {
		conditions.push(ne(reinitialisationMotDePasse.membre_id, svc.ID_COMPTE_SYSTEME));
	}

	const requete = db
		.select()
		.from(reinitialisationMotDePasse)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(reinitialisationMotDePasse.date_creation), desc(reinitialisationMotDePasse.id))
		.$dynamic();
	const liste = paginer<Demande>(requete, page);

	const noms = svc.pseudonymes(
		liste.items.map((r) => r.traitee_par_id).filter((i): i is number => !!i)
	);
	const membresIds = [...new Set(liste.items.map((r) => r.membre_id))];
	const membres = new Map(
		membresIds.length
			? db
					.select({
						id: tableMembre.id,
						nom: tableMembre.nom,
						pseudonyme: tableMembre.pseudonyme,
						telephone: tableMembre.telephone,
						email: tableMembre.email,
						categorie: tableMembre.categorie
					})
					.from(tableMembre)
					.where(inArray(tableMembre.id, membresIds))
					.all()
					.map((m) => [m.id, m])
			: []
	);
	const maintenant = new Date();

	res.json({
		items: liste.items.map((r) => ({
			id: r.id,
			canal: r.canal,
			date_creation: r.date_creation,
			date_expiration: r.date_expiration,
			date_utilisation: r.date_utilisation,
			membre: membres.get(r.membre_id) ?? null,
			traitee_par: r.traitee_par_id ? (noms.get(r.traitee_par_id) ?? null) : null,
			statut: statut(r, maintenant)
		})),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

function obtenirDemande(id: number, moi: Membre): Demande {
	const r = db
		.select()
		.from(reinitialisationMotDePasse)
		.where(eq(reinitialisationMotDePasse.id, id))
		.get();
	if (!r || (r.membre_id === svc.ID_COMPTE_SYSTEME && moi.id !== svc.ID_COMPTE_SYSTEME)) {
		throw introuvable('Demande introuvable.');
	}
	return r;
}

/** Après avoir rappelé le membre, la frangine génère son lien de réinitialisation. */
routeur.post('/reinitialisations/:id/traiter', (req, res) => {
	const moi = exigerMembre(req);
	const r = obtenirDemande(Number(req.params.id), moi);
	res.json(reinitialiser(moi, svc.chargerMembre(r.membre_id)));
});

/** Demande suspecte ou déjà réglée : retirée de la file sans créer de lien. */
routeur.post('/reinitialisations/:id/ignorer', (req, res) => {
	const moi = exigerMembre(req);
	exigerDroit(moi, 'activation');
	const r = obtenirDemande(Number(req.params.id), moi);
	if (r.jeton_hash !== null || r.traitee_par_id !== null) {
		throw erreur('Cette demande est déjà traitée.');
	}
	db.update(reinitialisationMotDePasse)
		.set({ traitee_par_id: moi.id, date_utilisation: new Date() })
		.where(eq(reinitialisationMotDePasse.id, r.id))
		.run();
	res.json(ok('Demande classée sans suite.', r.id));
});
