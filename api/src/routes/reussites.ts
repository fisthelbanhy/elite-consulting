/**
 * Réussites entrepreneuriales (portage de `app/routers/reussites.py` ; legacy
 * incl-reussite.php et incl-choix6B-Reussite.php, table `reussite`). Module mort dans le legacy,
 * **conservé et mis en avant** (ADR-0007 S6b) : les témoignages validés sont la preuve sociale
 * de l'accueil et de la page « Se lancer ».
 *
 * - Une seule fiche par membre (ADR-0004), référence RST… ;
 * - publiée seulement après validation d'un gestionnaire habilité (état 1 → 2) ; une
 *   modification par l'auteur d'une fiche publiée la renvoie en relecture ;
 * - la liste publique ne montre que les fiches publiées (même pour un gestionnaire, sauf filtre
 *   `etat` explicite) : l'accueil appelle `GET /reussites?taille=3`.
 */
import { and, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, peutModifier, verifierModification } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { secteurActivite } from '../schema/core.js';
import { reussite } from '../schema/entreprises.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { ok, valider } from '../schemas/commun.js';
import { changerEtat, exigerVisible, paginer, recherche, supprimer } from '../services/fiches.js';
import { enregistrer as enregistrerFichier, IMAGE, supprimer as supprimerFichier, url } from '../services/fichiers.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/reussites';

type Reussite = typeof reussite.$inferSelect;

const AUTEUR = 'membre_id';
const INTROUVABLE = "Cette réussite n'existe pas ou n'est pas encore publiée.";

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const texteLong = () => z.string().max(5000).default('');

const reussiteEntreeSchema = z.object({
	secteur_id: z.coerce.number().int().nullable().optional(),
	situation_avant: texteLong(),
	vision: texteLong(),
	projet: texteLong(),
	fond_demarrage: z.coerce.number().int().min(0).max(10_000_000_000).default(0),
	besoin_reel_demarrage: z.coerce.number().int().min(0).max(10_000_000_000).default(0),
	strategie: texteLong(),
	difficultes: texteLong(),
	deploiement_efforts: texteLong(),
	succes: texteLong(),
	conseil: texteLong()
});
type ReussiteEntree = z.output<typeof reussiteEntreeSchema>;

const etatEntreeSchema = z.object({ etat: z.coerce.number().int().min(1).max(4) });

interface Contexte {
	pseudonyme: string;
	photoMembre: string | null;
	secteur: string | null;
}

function contextesDe(fiches: Reussite[]): Map<number, Contexte> {
	if (fiches.length === 0) return new Map();
	const membres = new Map(
		db
			.select({ id: tableMembre.id, pseudonyme: tableMembre.pseudonyme, photo: tableMembre.photo })
			.from(tableMembre)
			.where(inArray(tableMembre.id, [...new Set(fiches.map((r) => r.membre_id))]))
			.all()
			.map((m) => [m.id, m])
	);
	const secteurIds = [...new Set(fiches.map((r) => r.secteur_id).filter((id): id is number => !!id))];
	const secteurs = new Map(
		secteurIds.length
			? db
					.select({ id: secteurActivite.id, libelle: secteurActivite.libelle })
					.from(secteurActivite)
					.where(inArray(secteurActivite.id, secteurIds))
					.all()
					.map((s) => [s.id, s.libelle])
			: []
	);
	return new Map(
		fiches.map((r) => [
			r.id,
			{
				pseudonyme: membres.get(r.membre_id)?.pseudonyme || 'Membre',
				photoMembre: membres.get(r.membre_id)?.photo ?? null,
				secteur: r.secteur_id !== null ? (secteurs.get(r.secteur_id) ?? null) : null
			}
		])
	);
}

function vueResume(r: Reussite, c: Contexte) {
	return {
		id: r.id,
		reference: r.reference,
		projet: r.projet,
		succes: r.succes,
		conseil: r.conseil,
		situation_avant: r.situation_avant,
		secteur: c.secteur,
		secteur_id: r.secteur_id,
		photo_url: url(r.photo),
		etat: r.etat,
		date_creation: r.date_creation,
		auteur: {
			id: r.membre_id,
			pseudonyme: c.pseudonyme,
			// Portrait : la photo du témoignage, à défaut celle du profil.
			photo_url: url(r.photo) ?? url(c.photoMembre)
		}
	};
}

function vueDetail(r: Reussite, c: Contexte, membre: Membre | null) {
	return {
		...vueResume(r, c),
		vision: r.vision,
		fond_demarrage: r.fond_demarrage,
		besoin_reel_demarrage: r.besoin_reel_demarrage,
		strategie: r.strategie,
		difficultes: r.difficultes,
		deploiement_efforts: r.deploiement_efforts,
		est_auteur: !!membre && membre.id === r.membre_id,
		peut_modifier: peutModifier(membre, r.membre_id) && r.etat !== Etat.SUPPRIME,
		peut_moderer: peutModerer(membre)
	};
}

function obtenir(id: number, membre: Membre | null): Reussite {
	const r = db.select().from(reussite).where(eq(reussite.id, id)).get();
	return exigerVisible(r as never, membre, {
		colonneAuteur: AUTEUR,
		message: INTROUVABLE
	}) as unknown as Reussite;
}

/** Message du membre vers la frangine (il apparaît dans le fil du membre). */
function ecrireALaFrangine(membre: Membre, texte: string): void {
	db.insert(tableMessage)
		.values({ membre_id: membre.id, auteur_id: membre.id, de_la_frangine: false, texte })
		.run();
}

// --- Lecture ------------------------------------------------------------------------------------

/**
 * Réussites publiées, les plus récentes d'abord ; recherche dans le projet ou le pseudonyme
 * (legacy : projet ou nom), filtre par secteur. Filtre `etat` réservé aux gestionnaires.
 */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	const brutEtat = Number(req.query.etat);
	const etat = Number.isFinite(brutEtat) && brutEtat >= 1 && brutEtat <= 4 ? Math.trunc(brutEtat) : null;

	if (membre && membre.type_compte === 1 && etat) {
		conditions.push(eq(reussite.etat, etat));
	} else {
		conditions.push(eq(reussite.etat, Etat.AUTORISE), ne(tableMembre.etat, Etat.SUPPRIME));
	}

	const secteurId = Number(req.query.secteur_id);
	if (Number.isFinite(secteurId) && secteurId > 0) {
		conditions.push(eq(reussite.secteur_id, Math.trunc(secteurId)));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			reussite.projet,
			tableMembre.pseudonyme
		)
	);

	const requete = db
		.select({ reussite })
		.from(reussite)
		.innerJoin(tableMembre, eq(tableMembre.id, reussite.membre_id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(reussite.date_creation), desc(reussite.id))
		.$dynamic();

	const liste = paginer<{ reussite: Reussite }>(requete, page);
	const fiches = liste.items.map((l) => l.reussite);
	const contextes = contextesDe(fiches);
	res.json({
		items: fiches.map((r) => vueResume(r, contextes.get(r.id)!)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/compteurs', (req, res) => {
	const n = (etat: number) =>
		db.select({ n: sql<number>`count(*)` }).from(reussite).where(eq(reussite.etat, etat)).get()?.n ??
		0;
	const gestion = !!req.membre && req.membre.type_compte === 1;
	res.json({ publiees: n(Etat.AUTORISE), a_valider: gestion ? n(Etat.NON_TRAITE) : 0 });
});

routeur.get('/moi', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const r = db.select().from(reussite).where(eq(reussite.membre_id, membre.id)).get();
	if (!r || r.etat === Etat.SUPPRIME) {
		res.json(null);
		return;
	}
	res.json(vueDetail(r, contextesDe([r]).get(r.id)!, membre));
});

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const r = obtenir(Number(req.params.id), membre);
	res.json(vueDetail(r, contextesDe([r]).get(r.id)!, membre));
});

// --- Écriture -----------------------------------------------------------------------------------

/** Règles legacy (incl-reussite.php). */
function validerReussite(d: ReussiteEntree): void {
	const champs: Record<string, string> = {};
	const secteur = d.secteur_id
		? db.select({ id: secteurActivite.id }).from(secteurActivite).where(eq(secteurActivite.id, d.secteur_id)).get()
		: null;
	if (!secteur) champs.secteur_id = "Veuillez indiquer le secteur d'activité.";
	if (d.projet.trim().length < 10) {
		champs.projet = 'Veuillez décrire votre projet avec 10 caractères minimum.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
}

function champsReussite(d: ReussiteEntree) {
	return {
		secteur_id: d.secteur_id ?? null,
		situation_avant: d.situation_avant.trim(),
		vision: d.vision.trim(),
		projet: d.projet.trim(),
		fond_demarrage: d.fond_demarrage,
		besoin_reel_demarrage: d.besoin_reel_demarrage,
		strategie: d.strategie.trim(),
		difficultes: d.difficultes.trim(),
		deploiement_efforts: d.deploiement_efforts.trim(),
		succes: d.succes.trim(),
		conseil: d.conseil.trim()
	};
}

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const existante = db.select().from(reussite).where(eq(reussite.membre_id, membre.id)).get();
	if (existante && existante.etat !== Etat.SUPPRIME) {
		throw erreur('Cette fiche de réussite du membre est déjà enregistrée.');
	}
	const donnees = valider(reussiteEntreeSchema, req.body);
	validerReussite(donnees);

	const fiche = db.transaction(() => {
		let r: Reussite;
		if (!existante) {
			r = db
				.insert(reussite)
				.values({
					membre_id: membre.id,
					reference: nouvelleReference(Prefixe.REUSSITE),
					// Publiée après relecture.
					etat: Etat.NON_TRAITE,
					...champsReussite(donnees)
				})
				.returning()
				.get()!;
		} else {
			// Une fiche supprimée est reprise : une seule fiche par membre.
			r = db
				.update(reussite)
				.set({ photo: null, etat: Etat.NON_TRAITE, ...champsReussite(donnees) })
				.where(eq(reussite.id, existante.id))
				.returning()
				.get()!;
		}
		ecrireALaFrangine(
			membre,
			`J'ai partagé mon histoire de réussite (${r.reference}) : merci de la relire pour la publier. ` +
				`/reussites/${r.id}`
		);
		return r;
	});

	res.status(201).json(
		ok(
			'Merci ! Votre témoignage est enregistré : il sera publié après relecture par la frangine.',
			fiche.id,
			fiche.reference
		)
	);
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const r = obtenir(Number(req.params.id), membre);
	verifierModification(membre, r.membre_id);
	const donnees = valider(reussiteEntreeSchema, req.body);
	validerReussite(donnees);

	// Une modification par l'auteur d'une fiche publiée la renvoie en relecture.
	const renvoyerEnRelecture =
		membre.id === r.membre_id && !peutModerer(membre) && r.etat === Etat.AUTORISE;

	db.transaction(() => {
		db.update(reussite)
			.set({
				...champsReussite(donnees),
				...(renvoyerEnRelecture ? { etat: Etat.NON_TRAITE } : {})
			})
			.where(eq(reussite.id, r.id))
			.run();
		if (renvoyerEnRelecture) {
			ecrireALaFrangine(
				membre,
				`J'ai modifié mon histoire de réussite (${r.reference}) : /reussites/${r.id}`
			);
		}
	});

	const message = renvoyerEnRelecture
		? 'Modification effectuée. Votre témoignage sera de nouveau publié après relecture.'
		: 'Modification effectuée.';
	res.json(ok(message, r.id, r.reference));
});

routeur.post('/:id/photo', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const r = obtenir(Number(req.params.id), membre);
	verifierModification(membre, r.membre_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });

	const ancien = r.photo;
	const chemin = await enregistrerFichier(req.file.buffer, 'reussite', new Set([IMAGE]), 'photo');
	db.update(reussite).set({ photo: chemin }).where(eq(reussite.id, r.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', r.id));
});

/** Validation (1 → 2) ou retrait par un gestionnaire habilité ; l'auteur est prévenu. */
routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const r = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	const avant = r.etat;

	db.transaction(() => {
		changerEtat(reussite, r.id, donnees.etat, membre);
		if (avant !== Etat.AUTORISE && donnees.etat === Etat.AUTORISE) {
			db.insert(tableMessage)
				.values({
					membre_id: r.membre_id,
					auteur_id: membre.id,
					de_la_frangine: true,
					texte:
						'Félicitations : votre histoire de réussite est publiée ! ' +
						`Partagez-la autour de vous : /reussites/${r.id}`
				})
				.run();
		}
	});
	res.json(ok('Modification effectuée.', r.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const r = obtenir(Number(req.params.id), membre);
	supprimer(reussite, r as never, membre, AUTEUR);
	res.json(ok('Fiche supprimée.', r.id));
});
