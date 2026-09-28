/**
 * Ressources humaines : demandes et offres d'emploi (portage de `app/routers/emplois.py` ;
 * legacy : choix2.php, incl-choix2.php, incl-humaine.php, module besoin).
 * Inventaire : F-S2-01 à F-S2-33.
 *
 * **Module de référence** : les autres modules suivent la même structure
 * (voir docs/CONVENTIONS.md).
 */
import { and, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, verifierModification } from '../deps.js';
import { Etat, Sexe, TypeAnnonceRH, TypeInteret } from '../enums.js';
import { erreur } from '../erreurs.js';
import { domaineActivite } from '../schema/core.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { annonceEmploi } from '../schema/rh.js';
import { ok, valider } from '../schemas/commun.js';
import {
	annonceEntreeSchema,
	etatEntreeSchema,
	interetEntreeSchema,
	vueDetail,
	vueResume,
	type Annonce,
	type AnnonceEntree,
	type Domaine,
	type InteretOut
} from '../schemas/emplois.js';
import { changerEtat, compterVisite, exigerVisible, paginer, recherche, supprimer, visibilite } from '../services/fiches.js';
import { enregistrer as enregistrerFichier, IMAGE, PDF, supprimer as supprimerFichier } from '../services/fichiers.js';
import { deposer, lister as listerInterets } from '../services/interets.js';
import { nouvelleReference, Prefixe } from '../services/references.js';

export const routeur = Router();
export const prefixe = '/emplois';

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const COLONNES_FICHE = { etat: annonceEmploi.etat, auteur: annonceEmploi.auteur_id };

/** Domaines d'activité, indexés par identifiant (petite table de référence, lue en une fois). */
function tableDomaines(): Map<number, Domaine> {
	return new Map(
		db
			.select({ id: domaineActivite.id, libelle: domaineActivite.libelle })
			.from(domaineActivite)
			.all()
			.map((d) => [d.id, d])
	);
}

function domaineDe(a: Annonce, domaines: Map<number, Domaine>): Domaine | null {
	return a.domaine_id !== null ? (domaines.get(a.domaine_id) ?? null) : null;
}

/** Charge une annonce en respectant la visibilité (404 si non visible). */
function obtenir(id: number, membre: Membre | null, message = 'Fiche introuvable.'): Annonce {
	const fiche = db.select().from(annonceEmploi).where(eq(annonceEmploi.id, id)).get();
	return exigerVisible(fiche as never, membre, { message }) as unknown as Annonce;
}

// --- Lecture --------------------------------------------------------------------------------------

routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	const type = Number(req.query.type);
	if (type === 1 || type === 2) conditions.push(eq(annonceEmploi.type_annonce, type));

	const domaineId = Number(req.query.domaine_id);
	if (Number.isFinite(domaineId) && domaineId > 0) {
		conditions.push(eq(annonceEmploi.domaine_id, domaineId));
	}

	const secteurId = Number(req.query.secteur_id);
	if (Number.isFinite(secteurId) && secteurId > 0) {
		// Sous-requête plutôt qu'une jointure : la liste reste une simple sélection d'annonces.
		conditions.push(
			sql`${annonceEmploi.domaine_id} in (select ${domaineActivite.id} from ${domaineActivite} where ${domaineActivite.secteur_id} = ${secteurId})`
		);
	}

	if (membre && membre.type_compte === 1) {
		const etat = Number(req.query.etat);
		conditions.push(
			Number.isFinite(etat) && etat > 0
				? eq(annonceEmploi.etat, etat)
				: ne(annonceEmploi.etat, Etat.SUPPRIME)
		);
	}

	if (req.query.miennes === 'true' && membre) {
		conditions.push(eq(annonceEmploi.auteur_id, membre.id));
	}

	// Recherche legacy (cht01) : poste, diplômes, expérience, compétences, référence.
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			annonceEmploi.poste_a_pourvoir,
			annonceEmploi.diplomes,
			annonceEmploi.experience,
			annonceEmploi.competences,
			annonceEmploi.reference
		)
	);

	const requete = db
		.select()
		.from(annonceEmploi)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(annonceEmploi.date_creation))
		.$dynamic();

	const liste = paginer<Annonce>(requete, page);
	const domaines = tableDomaines();
	res.json({
		items: liste.items.map((a) => vueResume(a, domaineDe(a, domaines))),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/compteurs', (_req, res) => {
	const n = (type: number): number =>
		db
			.select({ n: sql<number>`count(*)` })
			.from(annonceEmploi)
			.where(and(eq(annonceEmploi.type_annonce, type), eq(annonceEmploi.etat, Etat.AUTORISE)))
			.get()?.n ?? 0;
	res.json({ demandes: n(TypeAnnonceRH.DEMANDE), offres: n(TypeAnnonceRH.OFFRE) });
});

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenir(
		Number(req.params.id),
		membre,
		"Cette annonce n'existe pas ou n'est plus publiée."
	);
	compterVisite(annonceEmploi, fiche as never, membre);

	const proprietaire = !!membre && (membre.id === fiche.auteur_id || membre.type_compte === 1);
	const contributions = proprietaire || membre ? listerInterets('annonce_emploi_id', fiche.id) : [];

	let interets: InteretOut[] | null = null;
	if (proprietaire) {
		const contacts = new Map(
			db
				.select({
					id: tableMembre.id,
					pseudonyme: tableMembre.pseudonyme,
					nom: tableMembre.nom,
					telephone: tableMembre.telephone,
					email: tableMembre.email
				})
				.from(tableMembre)
				.all()
				.map((m) => [m.id, m])
		);
		interets = contributions.map((i) => ({
			id: i.id,
			sous_type: i.sous_type,
			message: i.message,
			date_creation: i.date_creation,
			membre: i.membre_id !== null ? (contacts.get(i.membre_id) ?? null) : null
		}));
	}

	const auteurFiche =
		fiche.auteur_id !== null
			? (db.select().from(tableMembre).where(eq(tableMembre.id, fiche.auteur_id)).get() ?? null)
			: null;

	res.json(
		vueDetail(fiche, {
			domaine: domaineDe(fiche, tableDomaines()),
			auteurFiche,
			proprietaire,
			peutModifier: !!membre && (membre.id === fiche.auteur_id || peutModerer(membre)),
			peutModerer: peutModerer(membre),
			monInteret:
				!!membre && !proprietaire && contributions.some((i) => i.membre_id === membre.id),
			interets
		})
	);
});

// --- Écriture -------------------------------------------------------------------------------------

/** Règles legacy (incl-humaine.php), appliquées réellement (correctif F-S2-14). */
function validerAnnonce(donnees: AnnonceEntree, membre: Membre, exclureId?: number): void {
	const champs: Record<string, string> = {};

	const domaine = donnees.domaine_id
		? db.select().from(domaineActivite).where(eq(domaineActivite.id, donnees.domaine_id)).get()
		: null;
	if (!domaine) champs.domaine_id = "Veuillez choisir le domaine d'activité.";

	if (donnees.type_annonce === TypeAnnonceRH.DEMANDE) {
		if (donnees.nom.trim().length <= 3) champs.nom = 'Le nom doit contenir plus de 3 caractères.';
		// Le sexe n'est exigé que pour une demande (ADR-0007 S2b).
		if (donnees.sexe !== Sexe.FEMININ && donnees.sexe !== Sexe.MASCULIN) {
			champs.sexe = 'Veuillez indiquer le sexe.';
		}
		if (!donnees.telephone) {
			champs.telephone = 'Le numéro de téléphone est obligatoire pour une demande d’emploi.';
		}
	} else if (donnees.poste_a_pourvoir.trim().length < 3) {
		champs.poste_a_pourvoir = 'Veuillez indiquer le poste à pourvoir.';
	}

	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Anti-doublon legacy : même type, même membre, même poste, mêmes informations.
	const conditions = [
		eq(annonceEmploi.type_annonce, donnees.type_annonce),
		eq(annonceEmploi.auteur_id, membre.id),
		eq(annonceEmploi.poste_a_pourvoir, donnees.poste_a_pourvoir.trim()),
		eq(annonceEmploi.autres_informations, donnees.autres_informations.trim()),
		eq(annonceEmploi.competences, donnees.competences.trim()),
		ne(annonceEmploi.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(annonceEmploi.id, exclureId));
	const doublon = db
		.select({ id: annonceEmploi.id })
		.from(annonceEmploi)
		.where(and(...conditions))
		.limit(1)
		.get();
	if (doublon) throw erreur('Cette fiche est déjà créée.');
}

/** Champs à écrire, avec les normalisations du legacy (nom en majuscules, F-S2-18). */
function champsAnnonce(d: AnnonceEntree, secteurId: number | null) {
	return {
		type_annonce: d.type_annonce,
		domaine_id: d.domaine_id ?? null,
		secteur_id: secteurId,
		nom: d.nom.trim().toUpperCase(),
		prenom: d.prenom.trim().replace(/\S+/gu, (mot) => mot[0]!.toUpperCase() + mot.slice(1).toLowerCase()),
		sexe: d.sexe === Sexe.FEMININ || d.sexe === Sexe.MASCULIN ? d.sexe : Sexe.INDEFINI,
		date_naissance: d.date_naissance,
		adresse: d.adresse.trim(),
		telephone: d.telephone,
		email: d.email ?? '',
		poste_a_pourvoir: d.poste_a_pourvoir.trim(),
		diplomes: d.diplomes.trim(),
		competences: d.competences.trim(),
		experience: d.experience.trim(),
		autres_informations: d.autres_informations.trim()
	};
}

function secteurDuDomaine(domaineId: number | null | undefined): number | null {
	if (!domaineId) return null;
	return (
		db.select().from(domaineActivite).where(eq(domaineActivite.id, domaineId)).get()?.secteur_id ??
		null
	);
}

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(annonceEntreeSchema, req.body);
	validerAnnonce(donnees, membre);

	const cree = db.transaction(() => {
		const reference = nouvelleReference(
			donnees.type_annonce === TypeAnnonceRH.DEMANDE
				? Prefixe.DEMANDE_EMPLOI
				: Prefixe.OFFRE_EMPLOI
		);
		return db
			.insert(annonceEmploi)
			.values({
				auteur_id: membre.id,
				// Publiée immédiatement (règle legacy).
				etat: Etat.AUTORISE,
				reference,
				...champsAnnonce(donnees, secteurDuDomaine(donnees.domaine_id))
			})
			.returning()
			.get();
	});

	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);

	const donnees = valider(annonceEntreeSchema, req.body);
	validerAnnonce(donnees, membre, fiche.id);

	const misAJour = db
		.update(annonceEmploi)
		.set(champsAnnonce(donnees, secteurDuDomaine(donnees.domaine_id)))
		.where(eq(annonceEmploi.id, fiche.id))
		.returning()
		.get();
	res.json(ok('Modification effectuée.', misAJour!.id, misAJour!.reference));
});

routeur.post('/:id/photo', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });

	const ancien = fiche.photo;
	const chemin = await enregistrerFichier(req.file.buffer, 'emploi', new Set([IMAGE]), 'photo');
	db.update(annonceEmploi).set({ photo: chemin }).where(eq(annonceEmploi.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', fiche.id));
});

routeur.post('/:id/cv', membreRequis, televersement.single('fichier'), async (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	verifierModification(membre, fiche.auteur_id);
	if (!req.file) throw erreur('Aucun fichier reçu.', { cv: 'Veuillez choisir un fichier PDF.' });

	const ancien = fiche.cv;
	const chemin = await enregistrerFichier(req.file.buffer, 'emploi', new Set([PDF]), 'cv');
	db.update(annonceEmploi).set({ cv: chemin }).where(eq(annonceEmploi.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('CV enregistré.', fiche.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	changerEtat(annonceEmploi, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(annonceEmploi, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});

/**
 * Sur une demande : « Présentation de besoin » (message obligatoire) ; sur une offre :
 * « Intéressement » (message facultatif). F-S2-27 à F-S2-33.
 */
routeur.post('/:id/interet', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(interetEntreeSchema, req.body);
	const demande = fiche.type_annonce === TypeAnnonceRH.DEMANDE;

	deposer({
		membre,
		cible: 'annonce_emploi_id',
		cibleId: fiche.id,
		auteurFicheId: fiche.auteur_id,
		sousType: demande ? TypeInteret.BESOIN : TypeInteret.INTERESSEMENT,
		message: donnees.message,
		libelleFiche: fiche.reference,
		lien: `/emplois/${fiche.id}`,
		messageObligatoire: demande
	});

	const quoi = demande ? 'Présentation de besoin' : 'Intéressement';
	res.status(201).json(ok(`Votre ${quoi} est pris en compte.`, fiche.id));
});
