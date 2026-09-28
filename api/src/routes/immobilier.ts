/**
 * Immobilier : offres et recherches de biens (portage de `app/routers/immobilier.py` ;
 * legacy : choix3.php imbart=1, incl-choix3A.php, incl-immobilier.php, table `besoin`).
 * Inventaire : F-S3-02, F-S3-06 à F-S3-28.
 */
import { and, asc, desc, eq, gte, lte, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerMembre, membreRequis, pagination, peutModifier, verifierModification } from '../deps.js';
import { Etat, OffreDemande, SituationBien, TypeBien, TypeInteret, TypeTransaction } from '../enums.js';
import { erreur, interdit } from '../erreurs.js';
import { immobilier } from '../schema/commerce.js';
import { quartier, ville } from '../schema/core.js';
import { membre as tableMembre, peutModerer, type Membre } from '../schema/membres.js';
import { auteur, ok, valider, vueInterets, type Auteur, type InteretOut } from '../schemas/commun.js';
import { contactsDe } from '../services/contacts.js';
import { changerEtat, compterVisite, exigerVisible, paginer, recherche, supprimer, visibilite } from '../services/fiches.js';
import { enregistrer as enregistrerFichier, IMAGE, supprimer as supprimerFichier, url } from '../services/fichiers.js';
import { deposer, lister as listerInterets } from '../services/interets.js';
import { nouvelleReference, Prefixe } from '../services/references.js';
import {
	bienEntreeSchema,
	etatEntreeSchema,
	interetEntreeSchema,
	SURFACE_MAX,
	type Bien,
	type BienEntree,
	type QuartierOut
} from '../schemas/immobilier.js';

export const routeur = Router();
export const prefixe = '/immobilier';

const INTROUVABLE = "Ce bien n'existe pas ou n'est plus publié.";
const TYPES_BIEN: number[] = Object.values(TypeBien).filter((t) => t !== TypeBien.INDIFFERENT);

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

const COLONNES_FICHE = { etat: immobilier.etat, auteur: immobilier.auteur_id };

/** Quartiers avec leur ville, indexés par identifiant (petite table de référence). */
function tableQuartiers(): Map<number, QuartierOut> {
	const lignes = db
		.select({
			id: quartier.id,
			nom: quartier.nom,
			ville_id: quartier.ville_id,
			ville_nom: ville.nom
		})
		.from(quartier)
		.leftJoin(ville, eq(ville.id, quartier.ville_id))
		.all();
	return new Map(
		lignes.map((q) => [
			q.id,
			{
				id: q.id,
				nom: q.nom,
				ville: q.ville_nom !== null ? { id: q.ville_id, nom: q.ville_nom } : null
			}
		])
	);
}

function quartierDe(b: Bien, quartiers: Map<number, QuartierOut>): QuartierOut | null {
	return b.quartier_id !== null ? (quartiers.get(b.quartier_id) ?? null) : null;
}

interface BienResume {
	id: number;
	reference: string;
	offre_ou_recherche: number;
	type_transaction: number;
	type_bien: number;
	quartier: QuartierOut | null;
	surface_m2: number;
	nombre_pieces: number;
	nombre_chambres: number;
	situation: number;
	prix: number;
	description: string;
	etat: number;
	date_creation: Date | null;
	nombre_visites: number;
	date_derniere_visite: Date | null;
	photo: string | null;
	photo_url: string | null;
}

function vueResume(b: Bien, q: QuartierOut | null): BienResume {
	return {
		id: b.id,
		reference: b.reference,
		offre_ou_recherche: b.offre_ou_recherche,
		type_transaction: b.type_transaction,
		type_bien: b.type_bien,
		quartier: q,
		surface_m2: b.surface_m2,
		nombre_pieces: b.nombre_pieces,
		nombre_chambres: b.nombre_chambres,
		situation: b.situation,
		prix: b.prix,
		description: b.description,
		etat: b.etat,
		date_creation: b.date_creation,
		nombre_visites: b.nombre_visites,
		date_derniere_visite: b.date_derniere_visite,
		photo: b.photo,
		photo_url: url(b.photo)
	};
}

function obtenir(id: number, membre: Membre | null): Bien {
	const fiche = db.select().from(immobilier).where(eq(immobilier.id, id)).get();
	return exigerVisible(fiche as never, membre, { message: INTROUVABLE }) as unknown as Bien;
}

/** Lit un entier de requête dans des bornes ; `null` si absent ou hors bornes. */
function entierQuery(valeur: unknown, min: number, max: number): number | null {
	const n = Number(valeur);
	if (!Number.isFinite(n)) return null;
	const entier = Math.trunc(n);
	return entier >= min && entier <= max ? entier : null;
}

/**
 * Filtres legacy (Besoin, Type de bien, Chambres, Prix minimum, Quartier) + ceux restés en code
 * commenté (ville, pièces, surface, prix maximum) et une recherche texte. Tous combinés en ET.
 */
routeur.get('/', (req, res) => {
	const membre = req.membre;
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [visibilite(COLONNES_FICHE, membre)];

	if (membre && membre.type_compte === 1) {
		const etat = entierQuery(req.query.etat, 1, 4);
		conditions.push(etat ? eq(immobilier.etat, etat) : ne(immobilier.etat, Etat.SUPPRIME));
	}
	if (req.query.miens === 'true' && membre) {
		conditions.push(eq(immobilier.auteur_id, membre.id));
	}

	const villeId = entierQuery(req.query.ville_id, 1, Number.MAX_SAFE_INTEGER);
	if (villeId) {
		conditions.push(
			sql`${immobilier.quartier_id} in (select ${quartier.id} from ${quartier} where ${quartier.ville_id} = ${villeId})`
		);
	}

	const type = entierQuery(req.query.type, 1, 2);
	if (type) conditions.push(eq(immobilier.offre_ou_recherche, type));

	const transaction = entierQuery(req.query.transaction, 1, 2);
	if (transaction) conditions.push(eq(immobilier.type_transaction, transaction));

	const typeBien = entierQuery(req.query.type_bien, 1, 9);
	if (typeBien) conditions.push(eq(immobilier.type_bien, typeBien));

	const quartierId = entierQuery(req.query.quartier_id, 1, Number.MAX_SAFE_INTEGER);
	if (quartierId) conditions.push(eq(immobilier.quartier_id, quartierId));

	// Égalité stricte sur les chambres (comportement legacy conservé).
	const chambres = entierQuery(req.query.chambres, 1, 100);
	if (chambres) conditions.push(eq(immobilier.nombre_chambres, chambres));

	const piecesMin = entierQuery(req.query.pieces_min, 1, 100);
	if (piecesMin) conditions.push(gte(immobilier.nombre_pieces, piecesMin));

	const surfaceMin = entierQuery(req.query.surface_min, 1, Number.MAX_SAFE_INTEGER);
	if (surfaceMin) conditions.push(gte(immobilier.surface_m2, surfaceMin));

	const surfaceMax = entierQuery(req.query.surface_max, 1, Number.MAX_SAFE_INTEGER);
	if (surfaceMax) conditions.push(lte(immobilier.surface_m2, surfaceMax));

	const prixMin = entierQuery(req.query.prix_min, 1, Number.MAX_SAFE_INTEGER);
	if (prixMin) conditions.push(gte(immobilier.prix, prixMin));

	const prixMax = entierQuery(req.query.prix_max, 1, Number.MAX_SAFE_INTEGER);
	if (prixMax) conditions.push(lte(immobilier.prix, prixMax));

	// Correctif legacy : le OU de la recherche est parenthésé et ne casse plus les autres critères.
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			immobilier.description,
			immobilier.reference,
			immobilier.localisation
		)
	);

	const tri = String(req.query.tri ?? 'prix');
	const ordres = {
		// Legacy : prix croissant, les biens « prix à débattre » (0) en fin de liste.
		prix: [asc(sql`${immobilier.prix} = 0`), asc(immobilier.prix), desc(immobilier.id)],
		prix_desc: [desc(immobilier.prix), desc(immobilier.id)],
		recent: [desc(immobilier.date_creation), desc(immobilier.id)],
		visites: [desc(immobilier.nombre_visites), desc(immobilier.id)]
	} as const;
	const ordre = ordres[tri as keyof typeof ordres] ?? ordres.prix;

	const requete = db
		.select()
		.from(immobilier)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(...ordre)
		.$dynamic();

	const liste = paginer<Bien>(requete, page);
	const quartiers = tableQuartiers();
	res.json({
		items: liste.items.map((b) => vueResume(b, quartierDe(b, quartiers))),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/** Compteurs des onglets (F-S3-02) : biens publiés, offres et recherches. */
routeur.get('/compteurs', (_req, res) => {
	const lignes = db
		.select({ type: immobilier.offre_ou_recherche, n: sql<number>`count(*)` })
		.from(immobilier)
		.where(eq(immobilier.etat, Etat.AUTORISE))
		.groupBy(immobilier.offre_ou_recherche)
		.all();
	const par = new Map(lignes.map((l) => [l.type, l.n]));
	const offres = par.get(OffreDemande.OFFRE) ?? 0;
	const recherches = par.get(OffreDemande.DEMANDE) ?? 0;
	res.json({ offres, recherches, total: offres + recherches });
});

/** Encarts « Nouveautés » et « Les plus visités » (F-S3-06/07) : 5 biens publiés chacun. */
routeur.get('/encarts', (_req, res) => {
	const quartiers = tableQuartiers();
	const cinq = (ordre: SQL[]) =>
		db
			.select()
			.from(immobilier)
			.where(eq(immobilier.etat, Etat.AUTORISE))
			.orderBy(...ordre)
			.limit(5)
			.all()
			.map((b) => vueResume(b as Bien, quartierDe(b as Bien, quartiers)));

	res.json({
		nouveautes: cinq([desc(immobilier.date_creation), desc(immobilier.id)]),
		plus_visites: cinq([desc(immobilier.nombre_visites), desc(immobilier.id)])
	});
});

routeur.get('/:id', (req, res) => {
	const membre = req.membre;
	const fiche = obtenir(Number(req.params.id), membre);
	// F-S3-15 : tiers seulement, sans plafond.
	compterVisite(immobilier, fiche as never, membre);

	const proprietaire = !!membre && (membre.id === fiche.auteur_id || membre.type_compte === 1);
	const recus = listerInterets('immobilier_id', fiche.id);

	// Contributions reçues : auteur et gestionnaires seulement (ADR-0007 S2d, F-S3-20/27).
	let interets: InteretOut[] | null = null;
	if (proprietaire) {
		interets = vueInterets(recus, contactsDe(recus.map((i) => i.membre_id)));
	}

	const auteurFiche: Auteur | null =
		fiche.auteur_id !== null
			? auteur(db.select().from(tableMembre).where(eq(tableMembre.id, fiche.auteur_id)).get())
			: null;

	res.json({
		...vueResume(fiche, quartierDe(fiche, tableQuartiers())),
		quartier_id: fiche.quartier_id,
		auteur: auteurFiche,
		// Adresse précise : auteur et gestionnaires seulement (le legacy ne l'affichait pas au public).
		localisation: proprietaire ? fiche.localisation : null,
		peut_modifier: peutModifier(membre, fiche.auteur_id),
		peut_moderer: peutModerer(membre),
		// Visiteur : invité à se connecter ; gestionnaire et auteur : pas de formulaire (F-S3-16).
		peut_manifester: !membre || (membre.type_compte !== 1 && membre.id !== fiche.auteur_id),
		mon_interet: !!membre && !proprietaire && recus.some((i) => i.membre_id === membre.id),
		interets
	});
});

/**
 * Règles legacy (incl-immobilier.php), messages repris avec l'orthographe corrigée
 * (F-S3-21 à F-S3-23).
 */
function validerBien(d: BienEntree, exclureId?: number): void {
	const champs: Record<string, string> = {};

	if (d.offre_ou_recherche !== OffreDemande.OFFRE && d.offre_ou_recherche !== OffreDemande.DEMANDE) {
		champs.offre_ou_recherche = "Veuillez indiquer s'il s'agit d'une offre ou d'une recherche.";
	}
	if (
		d.type_transaction !== TypeTransaction.LOCATION &&
		d.type_transaction !== TypeTransaction.VENTE
	) {
		champs.type_transaction = 'Veuillez indiquer la transaction.';
	}
	if (!TYPES_BIEN.includes(d.type_bien)) {
		champs.type_bien = "Veuillez indiquer le type de l'immobilier.";
	}
	if (d.quartier_id) {
		const connu = db.select({ id: quartier.id }).from(quartier).where(eq(quartier.id, d.quartier_id)).get();
		if (!connu) champs.quartier_id = 'Veuillez choisir un quartier de la liste.';
	}
	if (d.surface_m2 < 1) {
		champs.surface_m2 = 'Veuillez indiquer la surface.';
	} else if (d.surface_m2 > SURFACE_MAX) {
		const plafond = SURFACE_MAX.toLocaleString('fr-FR').replace(/ | /g, ' ');
		champs.surface_m2 = `La surface ne peut dépasser ${plafond} m².`;
	}
	if (d.situation !== SituationBien.DISPONIBLE && d.situation !== SituationBien.OCCUPE) {
		champs.situation = 'Veuillez indiquer la situation du bien.';
	}
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Unicité legacy sur la description (fiches non supprimées).
	const description = d.description.trim();
	if (description) {
		const conditions = [eq(immobilier.description, description), ne(immobilier.etat, Etat.SUPPRIME)];
		if (exclureId) conditions.push(ne(immobilier.id, exclureId));
		const doublon = db
			.select({ id: immobilier.id })
			.from(immobilier)
			.where(and(...conditions))
			.limit(1)
			.get();
		if (doublon) {
			throw erreur('Cette fiche existe déjà.', {
				description: 'Un bien avec exactement la même description est déjà publié.'
			});
		}
	}
}

function champsBien(d: BienEntree) {
	return {
		offre_ou_recherche: d.offre_ou_recherche,
		type_transaction: d.type_transaction,
		type_bien: d.type_bien,
		quartier_id: d.quartier_id || null,
		localisation: d.localisation.trim(),
		surface_m2: d.surface_m2,
		nombre_pieces: d.nombre_pieces,
		nombre_chambres: d.nombre_chambres,
		situation: d.situation,
		prix: d.prix,
		description: d.description.trim()
	};
}

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(bienEntreeSchema, req.body);
	validerBien(donnees);

	const cree = db.transaction(() =>
		db
			.insert(immobilier)
			.values({
				auteur_id: membre.id,
				// Publié immédiatement (legacy, F-S3-24).
				etat: Etat.AUTORISE,
				reference: nouvelleReference(Prefixe.IMMOBILIER),
				...champsBien(donnees)
			})
			.returning()
			.get()
	);
	res.status(201).json(ok('Enregistrement effectué.', cree!.id, cree!.reference));
});

routeur.put('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	// F-S3-28 : auteur ou gestionnaire habilité.
	verifierModification(membre, fiche.auteur_id);

	const donnees = valider(bienEntreeSchema, req.body);
	validerBien(donnees, fiche.id);

	const misAJour = db
		.update(immobilier)
		.set(champsBien(donnees))
		.where(eq(immobilier.id, fiche.id))
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
	const chemin = await enregistrerFichier(req.file.buffer, 'immobilier', new Set([IMAGE]), 'photo');
	db.update(immobilier).set({ photo: chemin }).where(eq(immobilier.id, fiche.id)).run();
	supprimerFichier(ancien);
	res.json(ok('Photo enregistrée.', fiche.id));
});

routeur.post('/:id/etat', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	const donnees = valider(etatEntreeSchema, req.body);
	// F-S3-26 : gestionnaire + droit « Activation ».
	changerEtat(immobilier, fiche.id, donnees.etat, membre);
	res.json(ok('Modification effectuée.', fiche.id));
});

routeur.delete('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	supprimer(immobilier, fiche as never, membre);
	res.json(ok('Fiche supprimée.', fiche.id));
});

/**
 * Sur une offre : « Présentation de besoin » ; sur une recherche : « Intéressement ».
 * Message obligatoire (5 caractères minimum), un seul par membre et par bien (F-S3-16 à F-S3-19).
 */
routeur.post('/:id/interet', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const fiche = obtenir(Number(req.params.id), membre);
	if (membre.type_compte === 1) {
		throw interdit('Les gestionnaires ne déposent ni besoin ni intéressement.');
	}

	const donnees = valider(interetEntreeSchema, req.body);
	const offre = fiche.offre_ou_recherche === OffreDemande.OFFRE;
	const quoi = offre ? 'Présentation de besoin' : 'Intéressement';
	if (donnees.message.trim().length < 5) {
		throw erreur(`${quoi} doit avoir 5 caractères minimum.`, {
			message: `${quoi} : 5 caractères minimum.`
		});
	}

	deposer({
		membre,
		cible: 'immobilier_id',
		cibleId: fiche.id,
		auteurFicheId: fiche.auteur_id,
		sousType: offre ? TypeInteret.BESOIN : TypeInteret.INTERESSEMENT,
		message: donnees.message,
		libelleFiche: fiche.reference,
		lien: `/immobilier/${fiche.id}`,
		messageObligatoire: true
	});

	const confirmation = offre
		? 'Votre présentation de besoin est prise en compte.'
		: 'Votre intéressement est pris en compte.';
	res.status(201).json(ok(confirmation, fiche.id));
});
