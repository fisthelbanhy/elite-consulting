/**
 * Publicités : diffusion publique et gestion (portage de `app/routers/publicites.py` ;
 * legacy incl-publicite.php, incl-affichpub.php, ppublicite.php).
 * Inventaire : E-TRV-09, E-ADM-14, F-TRV-43 à F-TRV-47, F-ADM-34 à F-ADM-38.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import {
	exigerDroit,
	exigerMembre,
	gestionnaireRequis,
	membreRequis,
	pagination
} from '../deps.js';
import { Etat, TypeFichierPub, libelle } from '../enums.js';
import { ErreurMetier, erreur, introuvable } from '../erreurs.js';
import { publicite } from '../schema/contenu.js';
import { entreprise } from '../schema/entreprises.js';
import { membre as tableMembre, peutModerer } from '../schema/membres.js';
import { ok, valider } from '../schemas/commun.js';
import { changerEtat, paginer, recherche } from '../services/fiches.js';
import {
	enregistrer as enregistrerFichier,
	supprimer as supprimerFichier,
	url
} from '../services/fichiers.js';
import {
	enDiffusion,
	estRobot,
	FORMATS,
	GENRE_ATTENDU,
	genreReel,
	texteBrut
} from '../services/publicites.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/publicites';

type Publicite = typeof publicite.$inferSelect;

const LIEN_VALIDE = /^(https?:\/\/[^\s<>"']+\.[^\s<>"']+|\/[^\s<>"']*)$/i;

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const publiciteEntreeSchema = z.object({
	demandeur_id: z.coerce.number().int().nullable().optional(),
	entreprise_id: z.coerce.number().int().nullable().optional(),
	texte: z.string().max(4000).default(''),
	lien: z.string().max(255).default(''),
	date_debut: z
		.union([z.literal(''), z.null(), z.iso.date()])
		.optional()
		.transform((v) => (v ? new Date(`${v}T00:00:00`) : null)),
	date_fin: z
		.union([z.literal(''), z.null(), z.iso.date()])
		.optional()
		.transform((v) => (v ? new Date(`${v}T00:00:00`) : null)),
	type_fichier: z.coerce.number().int().nullable().optional(),
	// Pris en compte seulement pour un gestionnaire ayant le droit « Activation » (F-ADM-35).
	etat: z.coerce.number().int().min(1).max(3).nullable().optional()
});
type PubliciteEntree = z.output<typeof publiciteEntreeSchema>;

const etatPubliciteSchema = z.object({ etat: z.coerce.number().int().min(1).max(3) });

interface EntreprisePub {
	id: number;
	nom: string;
	nom_affiche: string;
}

function tableEntreprises(ids: (number | null)[]): Map<number, EntreprisePub> {
	const recherches = [...new Set(ids.filter((id): id is number => !!id))];
	if (recherches.length === 0) return new Map();
	return new Map(
		db
			.select({ id: entreprise.id, nom: entreprise.nom })
			.from(entreprise)
			.where(inArray(entreprise.id, recherches))
			.all()
			.map((e) => [e.id, { id: e.id, nom: e.nom, nom_affiche: texteBrut(e.nom) }])
	);
}

interface DemandeurPub {
	id: number;
	nom: string;
	pseudonyme: string;
}

function tableDemandeurs(ids: (number | null)[]): Map<number, DemandeurPub> {
	const recherches = [...new Set(ids.filter((id): id is number => !!id))];
	if (recherches.length === 0) return new Map();
	return new Map(
		db
			.select({ id: tableMembre.id, nom: tableMembre.nom, pseudonyme: tableMembre.pseudonyme })
			.from(tableMembre)
			.where(inArray(tableMembre.id, recherches))
			.all()
			.map((m) => [m.id, m])
	);
}

/** Vue publique : ni demandeur, ni statistiques. */
function vueDiffusee(p: Publicite, ent: EntreprisePub | null) {
	return {
		id: p.id,
		texte: p.texte,
		texte_affiche: texteBrut(p.texte),
		lien: p.lien,
		entreprise: ent,
		annonceur: ent?.nom_affiche ?? null,
		fichier: p.fichier,
		fichier_url: url(p.fichier),
		genre: genreReel(p.fichier)
	};
}

// --- Diffusion publique ----------------------------------------------------------------------------

/**
 * Encart publicitaire : au plus 10 publicités actives de la période, ordre aléatoire (F-TRV-04).
 * La page « annonceurs » en demande davantage (`limite` ≤ 50). Ne compte pas de vue.
 */
routeur.get('/diffusion', (req, res) => {
	const brut = Number(req.query.limite);
	const limite = Number.isFinite(brut) ? Math.min(50, Math.max(1, Math.trunc(brut))) : 10;
	const exclure = Number(req.query.exclure);

	const aujourdhui = new Date();
	const conditions: SQL[] = [
		eq(publicite.etat, Etat.AUTORISE),
		lte(publicite.date_debut, aujourdhui),
		gte(publicite.date_fin, aujourdhui)
	];
	if (Number.isFinite(exclure) && exclure > 0) {
		conditions.push(ne(publicite.id, Math.trunc(exclure)));
	}

	const pubs = db
		.select()
		.from(publicite)
		.where(and(...conditions))
		.orderBy(sql`random()`)
		.limit(limite)
		.all();

	const entreprises = tableEntreprises(pubs.map((p) => p.entreprise_id));
	res.json(
		pubs.map((p) =>
			vueDiffusee(p, p.entreprise_id !== null ? (entreprises.get(p.entreprise_id) ?? null) : null)
		)
	);
});

// --- Gestion ----------------------------------------------------------------------------------------

/** Filtres de F-ADM-37 (les filtres de date, cassés dans le legacy, fonctionnent). */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const entier = (v: unknown): number | null => {
		const n = Number(v);
		return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
	};
	const jour = (v: unknown): Date | null =>
		typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : null;

	if (membre.type_compte === 1) {
		const demandeurId = entier(req.query.demandeur_id);
		if (demandeurId) conditions.push(eq(publicite.demandeur_id, demandeurId));
		const etat = entier(req.query.etat);
		conditions.push(etat ? eq(publicite.etat, etat) : ne(publicite.etat, Etat.SUPPRIME));
	} else {
		conditions.push(eq(publicite.demandeur_id, membre.id), ne(publicite.etat, Etat.SUPPRIME));
	}

	const entrepriseId = entier(req.query.entreprise_id);
	if (entrepriseId) conditions.push(eq(publicite.entreprise_id, entrepriseId));

	const debutDu = jour(req.query.debut_du);
	if (debutDu) conditions.push(gte(publicite.date_debut, debutDu));
	const debutAu = jour(req.query.debut_au);
	if (debutAu) conditions.push(lte(publicite.date_debut, debutAu));
	const finDu = jour(req.query.fin_du);
	if (finDu) conditions.push(gte(publicite.date_fin, finDu));
	const finAu = jour(req.query.fin_au);
	if (finAu) conditions.push(lte(publicite.date_fin, finAu));

	const vuesMin = entier(req.query.vues_min);
	if (vuesMin !== null) conditions.push(gte(publicite.nombre_vues, vuesMin));
	const vuesMax = entier(req.query.vues_max);
	if (vuesMax !== null) conditions.push(lte(publicite.nombre_vues, vuesMax));

	if (req.query.en_diffusion === 'true') {
		const aujourdhui = new Date();
		conditions.push(
			eq(publicite.etat, Etat.AUTORISE),
			lte(publicite.date_debut, aujourdhui),
			gte(publicite.date_fin, aujourdhui)
		);
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			publicite.texte,
			publicite.reference,
			publicite.objet
		)
	);

	const requete = db
		.select()
		.from(publicite)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(publicite.date_creation), desc(publicite.id))
		.$dynamic();

	const liste = paginer<Publicite>(requete, page);
	const entreprises = tableEntreprises(liste.items.map((p) => p.entreprise_id));
	const demandeurs = tableDemandeurs(liste.items.map((p) => p.demandeur_id));

	res.json({
		items: liste.items.map((p) => ({
			id: p.id,
			reference: p.reference,
			demandeur_id: p.demandeur_id,
			demandeur: p.demandeur_id !== null ? (demandeurs.get(p.demandeur_id) ?? null) : null,
			entreprise_id: p.entreprise_id,
			entreprise: p.entreprise_id !== null ? (entreprises.get(p.entreprise_id) ?? null) : null,
			objet: p.objet,
			texte: p.texte,
			texte_affiche: texteBrut(p.texte),
			lien: p.lien,
			date_debut: p.date_debut,
			date_fin: p.date_fin,
			type_fichier: p.type_fichier,
			nombre_vues: p.nombre_vues,
			date_derniere_vue: p.date_derniere_vue,
			etat: p.etat,
			date_creation: p.date_creation,
			en_diffusion: enDiffusion(p),
			fichier: p.fichier,
			fichier_url: url(p.fichier),
			genre: genreReel(p.fichier)
		})),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Listes du formulaire de gestion : demandeurs (gestionnaires et membres) et entreprises. */
routeur.get('/choix', gestionnaireRequis, (_req, res) => {
	const membres = db
		.select({ id: tableMembre.id, nom: tableMembre.nom, pseudonyme: tableMembre.pseudonyme })
		.from(tableMembre)
		.where(ne(tableMembre.etat, Etat.SUPPRIME))
		.orderBy(asc(tableMembre.nom))
		.all();
	const entreprises = db
		.select({ id: entreprise.id, nom: entreprise.nom })
		.from(entreprise)
		.where(ne(entreprise.etat, Etat.SUPPRIME))
		.orderBy(asc(entreprise.nom))
		.all();

	res.json({
		membres: membres.map((m) => ({
			value: m.id,
			label: m.pseudonyme && m.pseudonyme !== m.nom ? `${m.nom} (${m.pseudonyme})` : m.nom
		})),
		entreprises: entreprises.map((e) => ({ value: e.id, label: texteBrut(e.nom) }))
	});
});

// --- Détail -------------------------------------------------------------------------------------

/**
 * Publicité en grand. Le public ne voit que les publicités en diffusion ; chaque affichage par
 * un tiers incrémente le nombre de vues et la date de dernière vue (F-TRV-46).
 */
routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const pub = db
		.select()
		.from(publicite)
		.where(eq(publicite.id, Number(req.params.id)))
		.get();
	if (!pub) throw introuvable("Cette publicité n'existe pas.");

	const gestion = !!membre && membre.type_compte === 1;
	const demandeur = !!membre && membre.id === pub.demandeur_id;
	const diffusee = enDiffusion(pub);
	const tiers = !(gestion || demandeur);

	if (tiers && !diffusee) throw introuvable("Cette publicité n'est plus diffusée.");
	if (tiers && !estRobot(req.header('user-agent'))) {
		db.update(publicite)
			.set({ nombre_vues: pub.nombre_vues + 1, date_derniere_vue: new Date() })
			.where(eq(publicite.id, pub.id))
			.run();
		pub.nombre_vues += 1;
	}

	const ent =
		pub.entreprise_id !== null
			? (tableEntreprises([pub.entreprise_id]).get(pub.entreprise_id) ?? null)
			: null;
	const dem =
		!tiers && pub.demandeur_id !== null
			? (tableDemandeurs([pub.demandeur_id]).get(pub.demandeur_id) ?? null)
			: null;

	res.json({
		...vueDiffusee(pub, ent),
		reference: pub.reference,
		date_debut: pub.date_debut,
		date_fin: pub.date_fin,
		type_fichier: pub.type_fichier,
		etat: pub.etat,
		date_creation: pub.date_creation,
		en_diffusion: diffusee,
		// Réservés aux gestionnaires et au demandeur.
		nombre_vues: tiers ? null : pub.nombre_vues,
		date_derniere_vue: tiers ? null : pub.date_derniere_vue,
		demandeur: dem,
		peut_gerer: gestion,
		peut_moderer: peutModerer(membre)
	});
});

// --- Écritures (gestionnaires) ------------------------------------------------------------------

/** Règles de ppublicite.php, plus le contrôle de l'ordre des dates (correctif F-ADM-36). */
function validerPublicite(d: PubliciteEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};

	const demandeur = d.demandeur_id
		? db
				.select({ id: tableMembre.id })
				.from(tableMembre)
				.where(eq(tableMembre.id, d.demandeur_id))
				.get()
		: null;
	if (!demandeur) champs.demandeur_id = 'Veuillez indiquer le demandeur (gestionnaire ou membre).';

	const ent = d.entreprise_id
		? db
				.select({ id: entreprise.id })
				.from(entreprise)
				.where(eq(entreprise.id, d.entreprise_id))
				.get()
		: null;
	if (!ent) champs.entreprise_id = "Veuillez indiquer l'entreprise.";

	if (d.texte.trim().length < 6) champs.texte = 'Le texte doit contenir au moins 6 caractères.';
	if (!d.date_debut) champs.date_debut = 'Veuillez indiquer la date de début de diffusion.';
	if (!d.date_fin) {
		champs.date_fin = 'Veuillez indiquer la date de fin de diffusion.';
	} else if (d.date_debut && d.date_fin.getTime() < d.date_debut.getTime()) {
		champs.date_fin = 'La date de fin ne peut pas précéder la date de début.';
	}

	const typesConnus: number[] = Object.values(TypeFichierPub);
	if (
		d.type_fichier === null ||
		d.type_fichier === undefined ||
		!typesConnus.includes(d.type_fichier)
	) {
		champs.type_fichier = 'Veuillez indiquer le format du fichier de la publicité.';
	}

	const lien = d.lien.trim();
	if (lien && !LIEN_VALIDE.test(lien)) {
		champs.lien = 'Le lien doit commencer par https:// (ex. https://www.monentreprise.cg).';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const conditions = [eq(publicite.texte, d.texte.trim()), ne(publicite.etat, Etat.SUPPRIME)];
	if (exclureId) conditions.push(ne(publicite.id, exclureId));
	const doublon = db
		.select({ id: publicite.id })
		.from(publicite)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) {
		throw erreur('Cette publicité est déjà enregistrée.', {
			texte: 'Une autre publicité a exactement ce texte.'
		});
	}
}

function champsPublicite(d: PubliciteEntree) {
	return {
		demandeur_id: d.demandeur_id ?? null,
		entreprise_id: d.entreprise_id ?? null,
		texte: d.texte.trim(),
		lien: d.lien.trim(),
		date_debut: d.date_debut,
		date_fin: d.date_fin,
		type_fichier: d.type_fichier ?? 0
	};
}

function obtenirPublicite(id: number): Publicite {
	const pub = db.select().from(publicite).where(eq(publicite.id, id)).get();
	if (!pub) throw introuvable("Cette publicité n'existe pas.");
	return pub;
}

/**
 * F-ADM-34/35 : référence PUB…, état initial « Non traité » sauf si le créateur a le droit
 * « Activation » et choisit un autre état.
 */
routeur.post('/', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(publiciteEntreeSchema, req.body);
	validerPublicite(donnees);

	const cree = db.transaction(() =>
		db
			.insert(publicite)
			.values({
				etat: peutModerer(membre) && donnees.etat ? donnees.etat : Etat.NON_TRAITE,
				reference: nouvelleReference(Prefixe.PUBLICITE),
				...champsPublicite(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeur.put('/:id', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const pub = obtenirPublicite(Number(req.params.id));
	const donnees = valider(publiciteEntreeSchema, req.body);
	validerPublicite(donnees, pub.id);

	const misAJour = db
		.update(publicite)
		.set({
			...champsPublicite(donnees),
			...(peutModerer(membre) && donnees.etat ? { etat: donnees.etat } : {})
		})
		.where(eq(publicite.id, pub.id))
		.returning()
		.get();
	res.json(ok('Modification effectuée.', misAJour!.id, misAJour!.reference));
});

/** Le fichier doit correspondre au type déclaré (image, son MP3 ou vidéo MP4). */
routeur.post(
	'/:id/fichier',
	gestionnaireRequis,
	televersement.single('fichier'),
	async (req, res) => {
		const pub = obtenirPublicite(Number(req.params.id));
		const attendu = GENRE_ATTENDU[pub.type_fichier];
		if (!attendu) {
			throw erreur("Veuillez d'abord indiquer le format de la publicité.", {
				fichier: 'Format de la publicité non indiqué.'
			});
		}
		if (!req.file) throw erreur('Aucun fichier reçu.', { fichier: 'Veuillez choisir un fichier.' });

		let chemin: string;
		try {
			chemin = await enregistrerFichier(
				req.file.buffer,
				'publicites',
				new Set([attendu]),
				'fichier'
			);
		} catch (e) {
			if (e instanceof ErreurMetier && e.message === 'Type de fichier non accepté.') {
				throw erreur(
					`Le fichier ne correspond pas au format choisi (${libelle('TypeFichierPub', pub.type_fichier)}).`,
					{ fichier: `Joignez ${FORMATS[attendu]}.` }
				);
			}
			throw e;
		}

		const ancien = pub.fichier;
		db.update(publicite).set({ fichier: chemin }).where(eq(publicite.id, pub.id)).run();
		if (ancien !== chemin) supprimerFichier(ancien);
		res.json(ok('Fichier enregistré.', pub.id));
	}
);

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const pub = obtenirPublicite(Number(req.params.id));
	const donnees = valider(etatPubliciteSchema, req.body);
	// Gestionnaire + droit « Activation ».
	changerEtat(publicite, pub.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', pub.id));
});

/** Suppression logique (état 3), réservée au droit « Activation ». Le fichier est conservé. */
routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const pub = obtenirPublicite(Number(req.params.id));
	exigerDroit(membre, 'activation');
	db.update(publicite).set({ etat: Etat.SUPPRIME }).where(eq(publicite.id, pub.id)).run();
	res.json(ok('Publicité supprimée.', pub.id));
});
