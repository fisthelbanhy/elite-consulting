/**
 * Comparateur de prix B2B (portage de `app/routers/comparateur.py` ; legacy choix6.php?rere=2,
 * incl-choix6B.php, incl-prospective.php, pproduitptpv.php).
 * Inventaire : S6-3, S6-4, F-S6-14 à F-S6-22.
 *
 * ADR-0007 S6a : la fiche est rattachée à l'**entreprise** du membre (plus à l'id du membre),
 * seul le propriétaire (ou un gestionnaire habilité) modifie ses lignes, et la consultation est
 * réservée aux comptes entreprise (« Il faut avoir un compte entreprise pour y avoir accès. »).
 */
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
	exigerDroit,
	exigerMembre,
	gestionnaireRequis,
	membreRequis,
	pagination,
	peutModifier
} from '../deps.js';
import { CategorieMembre, Etat, OffreDemande } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { parametre, ville } from '../schema/core.js';
import {
	entreprise,
	ficheProspective,
	ligneProspective,
	produitProspective
} from '../schema/entreprises.js';
import type { Membre } from '../schema/membres.js';
import { membre as tableMembre } from '../schema/membres.js';
import { ok, valider } from '../schemas/commun.js';
import { envoyerEnArrierePlan } from '../services/emails.js';
import {
	entreprisesDe,
	exigerCompteEntreprise,
	MESSAGE_COMPTE_ENTREPRISE,
	normaliserNomProduit,
	produitParNom,
	resoudreProduit,
	verifierNomProduit
} from '../services/entreprises.js';
import { paginer, recherche } from '../services/fiches.js';
import { url } from '../services/fichiers.js';

export const routeur = Router();
export const prefixe = '/comparateur';

type Entreprise = typeof entreprise.$inferSelect;
type LigneProspective = typeof ligneProspective.$inferSelect;

const produitEntreeSchema = z.object({
	nom: z.string().max(200).default(''),
	etat: z.coerce.number().int().min(1).max(3).default(2)
});

const ligneEntreeSchema = z.object({
	entreprise_id: z.coerce.number().int(),
	offre_ou_demande: z.coerce.number().int().min(1).max(2),
	produit_id: z.coerce.number().int().nullable().optional(),
	nouveau_produit: z.string().max(200).default(''),
	unite_vente: z.string().max(50).default(''),
	prix: z.coerce.number().int().min(0).default(0),
	quantite_mensuelle: z.coerce.number().int().min(0).default(0),
	fournisseur_ou_client: z.string().max(200).default('')
});
type LigneEntree = z.output<typeof ligneEntreeSchema>;

const emailEntreeSchema = z.object({ message: z.string().max(5000).default('') });

/** Lignes visibles dans le comparateur : ligne, fiche, entreprise et produit publiés. */
function conditionsPubliees(): SQL[] {
	return [
		eq(ligneProspective.etat, Etat.AUTORISE),
		eq(ficheProspective.etat, Etat.AUTORISE),
		eq(entreprise.etat, Etat.AUTORISE),
		eq(produitProspective.etat, Etat.AUTORISE)
	];
}

function vueEntrepriseOption(e: Entreprise) {
	return {
		id: e.id,
		reference: e.reference,
		nom: e.nom,
		forme_juridique: e.forme_juridique,
		etat: e.etat,
		logo: e.logo,
		logo_url: url(e.logo)
	};
}

// --- Accès --------------------------------------------------------------------------------------

/**
 * Indique au frontend s'il peut afficher le comparateur, ou quel message et quelle action
 * proposer (F-S6-14, F-S6-15).
 */
routeur.get('/acces', (req, res) => {
	const membre = req.membre;
	if (!membre) {
		res.json({
			acces: false,
			motif: 'visiteur',
			message: MESSAGE_COMPTE_ENTREPRISE,
			gestionnaire: false,
			entreprises: []
		});
		return;
	}

	const ents = entreprisesDe(membre).map(vueEntrepriseOption);
	if (membre.type_compte === 1) {
		res.json({ acces: true, motif: null, message: null, gestionnaire: true, entreprises: ents });
		return;
	}
	if (membre.categorie !== CategorieMembre.MORALE) {
		res.json({
			acces: false,
			motif: 'personne_physique',
			message: MESSAGE_COMPTE_ENTREPRISE,
			gestionnaire: false,
			entreprises: ents
		});
		return;
	}
	if (ents.length === 0) {
		res.json({
			acces: false,
			motif: 'sans_entreprise',
			message: MESSAGE_COMPTE_ENTREPRISE,
			gestionnaire: false,
			entreprises: []
		});
		return;
	}
	res.json({ acces: true, motif: null, message: null, gestionnaire: false, entreprises: ents });
});

// --- Catalogue des produits (pproduitptpv.php) ---------------------------------------------------

/**
 * Produits du comparateur avec le nombre d'offres et de demandes publiées. `tous`
 * (gestionnaire) : produits retirés compris, pour l'écran de gestion du catalogue.
 */
routeur.get('/produits', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerCompteEntreprise(membre);

	const conditions: (SQL | undefined)[] = [];
	if (!(req.query.tous === 'true' && membre.type_compte === 1)) {
		conditions.push(eq(produitProspective.etat, Etat.AUTORISE));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null,
			produitProspective.nom
		)
	);

	const items = db
		.select()
		.from(produitProspective)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(asc(produitProspective.nom))
		.all();

	const comptes = db
		.select({
			produit_id: ligneProspective.produit_id,
			type: ligneProspective.offre_ou_demande,
			n: sql<number>`count(*)`
		})
		.from(ligneProspective)
		.innerJoin(ficheProspective, eq(ficheProspective.id, ligneProspective.fiche_id))
		.innerJoin(entreprise, eq(entreprise.id, ficheProspective.entreprise_id))
		.innerJoin(produitProspective, eq(produitProspective.id, ligneProspective.produit_id))
		.where(and(...conditionsPubliees()))
		.groupBy(ligneProspective.produit_id, ligneProspective.offre_ou_demande)
		.all();

	const parProduit = new Map(comptes.map((c) => [`${c.produit_id}:${c.type}`, c.n]));
	res.json(
		items.map((p) => ({
			id: p.id,
			nom: p.nom,
			etat: p.etat,
			offres: parProduit.get(`${p.id}:${OffreDemande.OFFRE}`) ?? 0,
			demandes: parProduit.get(`${p.id}:${OffreDemande.DEMANDE}`) ?? 0
		}))
	);
});

routeur.post('/produits', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const donnees = valider(produitEntreeSchema, req.body);

	const nom = normaliserNomProduit(donnees.nom);
	verifierNomProduit(nom);
	if (produitParNom(nom)) {
		throw erreur('Ce produit est déjà enregistré.', { nom: 'Ce produit est déjà enregistré.' });
	}
	const cree = db
		.insert(produitProspective)
		.values({ nom, etat: donnees.etat })
		.returning({ id: produitProspective.id })
		.get();
	res.status(201).json(ok('Enregistrement effectué.', cree!.id));
});

routeur.put('/produits/:id', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerDroit(membre, 'activation');
	const id = Number(req.params.id);
	const produit = db.select().from(produitProspective).where(eq(produitProspective.id, id)).get();
	if (!produit) throw introuvable('Produit introuvable.');

	const donnees = valider(produitEntreeSchema, req.body);
	const nom = normaliserNomProduit(donnees.nom);
	verifierNomProduit(nom);
	if (produitParNom(nom, produit.id)) {
		throw erreur('Ce produit est déjà enregistré.', { nom: 'Ce produit est déjà enregistré.' });
	}
	db.update(produitProspective)
		.set({ nom, etat: donnees.etat })
		.where(eq(produitProspective.id, produit.id))
		.run();
	res.json(ok('Modification effectuée.', produit.id));
});

// --- Consultation (incl-choix6B.php) --------------------------------------------------------------

function vueLigne(l: LigneProspective, produits: Map<number, { id: number; nom: string }>) {
	return {
		id: l.id,
		offre_ou_demande: l.offre_ou_demande,
		produit: produits.get(l.produit_id) ?? { id: l.produit_id, nom: '' },
		unite_vente: l.unite_vente,
		prix: l.prix,
		quantite_mensuelle: l.quantite_mensuelle,
		fournisseur_ou_client: l.fournisseur_ou_client
	};
}

/** Tableau comparatif (F-S6-16, corrigé : nom du produit affiché, lignes publiées seulement). */
// Pas de `membreRequis` ici : c'est `exigerCompteEntreprise` qui répond au visiteur, avec le
// message « compte entreprise » attendu par le frontend plutôt qu'un message de connexion générique.
routeur.get('/lignes', (req, res) => {
	const membre = req.membre;
	exigerCompteEntreprise(membre);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [...conditionsPubliees()];

	const entier = (v: unknown): number | null => {
		const n = Number(v);
		return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
	};

	const type = entier(req.query.type);
	if (type === 1 || type === 2) conditions.push(eq(ligneProspective.offre_ou_demande, type));
	const produitId = entier(req.query.produit_id);
	if (produitId) conditions.push(eq(ligneProspective.produit_id, produitId));
	const entrepriseId = entier(req.query.entreprise_id);
	if (entrepriseId) conditions.push(eq(ficheProspective.entreprise_id, entrepriseId));

	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null,
			produitProspective.nom,
			entreprise.nom,
			ligneProspective.fournisseur_ou_client
		)
	);

	const tri = String(req.query.tri ?? 'prix');
	const ordres = {
		prix: [asc(ligneProspective.prix), asc(produitProspective.nom), asc(ligneProspective.id)],
		prix_desc: [desc(ligneProspective.prix), asc(produitProspective.nom), asc(ligneProspective.id)],
		recent: [desc(ligneProspective.id)]
	} as const;

	const requete = db
		.select({ ligne: ligneProspective, entreprise_id: ficheProspective.entreprise_id })
		.from(ligneProspective)
		.innerJoin(ficheProspective, eq(ficheProspective.id, ligneProspective.fiche_id))
		.innerJoin(entreprise, eq(entreprise.id, ficheProspective.entreprise_id))
		.innerJoin(produitProspective, eq(produitProspective.id, ligneProspective.produit_id))
		.where(and(...conditions.filter(Boolean)))
		.orderBy(...(ordres[tri as keyof typeof ordres] ?? ordres.prix))
		.$dynamic();

	const liste = paginer<{ ligne: LigneProspective; entreprise_id: number }>(requete, page);

	const produits = new Map(
		db
			.select({ id: produitProspective.id, nom: produitProspective.nom })
			.from(produitProspective)
			.all()
			.map((p) => [p.id, p])
	);
	const villes = new Map(
		db
			.select({ id: ville.id, nom: ville.nom })
			.from(ville)
			.all()
			.map((v) => [v.id, v])
	);
	const idsEntreprises = [...new Set(liste.items.map((l) => l.entreprise_id))];
	const entreprises = new Map(
		idsEntreprises.length
			? db
					.select()
					.from(entreprise)
					.where(inArray(entreprise.id, idsEntreprises))
					.all()
					.map((e) => [e.id, e])
			: []
	);

	res.json({
		items: liste.items.map(({ ligne, entreprise_id }) => {
			const e = entreprises.get(entreprise_id);
			return {
				...vueLigne(ligne, produits),
				// Coordonnées d'annuaire : elles servent au bouton « Contacter » (e-mail / WhatsApp).
				entreprise: e
					? {
							id: e.id,
							nom: e.nom,
							forme_juridique: e.forme_juridique,
							telephone: e.telephone,
							email: e.email,
							ville: e.ville_id !== null ? (villes.get(e.ville_id) ?? null) : null,
							logo: e.logo,
							logo_url: url(e.logo)
						}
					: null
			};
		}),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

// --- Fiche de l'entreprise du membre (incl-prospective.php) ---------------------------------------

/**
 * Entreprise dont le membre gère la fiche : la sienne, ou n'importe laquelle pour un
 * gestionnaire habilité. Sans précision, la première entreprise du membre.
 */
function entrepriseModifiable(membre: Membre, entrepriseId: number | null): Entreprise {
	exigerCompteEntreprise(membre);
	if (entrepriseId === null) {
		const ents = entreprisesDe(membre);
		if (ents.length === 0) throw erreur("Déclarez d'abord votre entreprise dans l'annuaire.");
		return ents[0]!;
	}
	const e = db.select().from(entreprise).where(eq(entreprise.id, entrepriseId)).get();
	if (!e || e.etat === Etat.SUPPRIME) {
		throw introuvable("Cette entreprise n'existe pas ou n'est plus publiée.");
	}
	if (!peutModifier(membre, e.membre_id)) {
		throw interdit(
			"Seule l'entreprise propriétaire de la fiche ou un gestionnaire habilité peut la modifier."
		);
	}
	return e;
}

function ficheDe(e: Entreprise) {
	return (
		db.select().from(ficheProspective).where(eq(ficheProspective.entreprise_id, e.id)).get() ?? null
	);
}

/**
 * En-tête de l'entreprise + lignes d'offres et de demandes de **cette** fiche seulement
 * (F-S6-18, F-S6-21 corrigé).
 */
routeur.get('/ma-fiche', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const brut = Number(req.query.entreprise_id);
	const entrepriseId = Number.isFinite(brut) && brut > 0 ? Math.trunc(brut) : null;
	const e = entrepriseModifiable(membre, entrepriseId);
	const fiche = ficheDe(e);

	const offres: unknown[] = [];
	const demandes: unknown[] = [];
	if (fiche) {
		const produits = new Map(
			db
				.select({ id: produitProspective.id, nom: produitProspective.nom })
				.from(produitProspective)
				.all()
				.map((p) => [p.id, p])
		);
		const rangees = db
			.select({ ligne: ligneProspective })
			.from(ligneProspective)
			.innerJoin(produitProspective, eq(produitProspective.id, ligneProspective.produit_id))
			.where(eq(ligneProspective.fiche_id, fiche.id))
			.orderBy(asc(produitProspective.nom), asc(ligneProspective.id))
			.all();
		for (const { ligne } of rangees) {
			const vue = vueLigne(ligne, produits);
			(ligne.offre_ou_demande === OffreDemande.OFFRE ? offres : demandes).push(vue);
		}
	}

	const proprietaire =
		e.membre_id !== null
			? db.select().from(tableMembre).where(eq(tableMembre.id, e.membre_id)).get()
			: null;
	const villeEntreprise =
		e.ville_id !== null
			? (db
					.select({ id: ville.id, nom: ville.nom })
					.from(ville)
					.where(eq(ville.id, e.ville_id))
					.get() ?? null)
			: null;

	res.json({
		entreprise: {
			id: e.id,
			reference: e.reference,
			nom: e.nom,
			forme_juridique: e.forme_juridique,
			adresse: e.adresse,
			telephone: e.telephone,
			email: e.email,
			site_web: e.site_web,
			ville: villeEntreprise,
			logo: e.logo,
			logo_url: url(e.logo)
		},
		sigle: proprietaire?.pseudonyme ?? '',
		fiche_id: fiche?.id ?? null,
		offres,
		demandes,
		entreprises: entreprisesDe(membre).map(vueEntrepriseOption),
		peut_modifier: true
	});
});

/** Règles legacy (messages exacts) + anti-doublon produit/unité sur la même fiche. */
function validerLigne(d: LigneEntree, fiche: { id: number } | null, exclureId?: number) {
	const champs: Record<string, string> = {};
	if (!d.produit_id && !d.nouveau_produit.trim())
		champs.produit_id = 'Veuillez indiquer le produit.';
	if (!d.unite_vente.trim()) champs.unite_vente = "Veuillez indiquer l'unité de vente.";
	if (d.prix <= 0) champs.prix = 'Veuillez indiquer le prix.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	const produit = resoudreProduit(d.produit_id, d.nouveau_produit);
	if (fiche) {
		const conditions = [
			eq(ligneProspective.fiche_id, fiche.id),
			eq(ligneProspective.offre_ou_demande, d.offre_ou_demande),
			eq(ligneProspective.produit_id, produit.id),
			sql`lower(${ligneProspective.unite_vente}) = ${d.unite_vente.trim().toLowerCase()}`
		];
		if (exclureId) conditions.push(ne(ligneProspective.id, exclureId));
		const doublon = db
			.select({ id: ligneProspective.id })
			.from(ligneProspective)
			.where(and(...conditions))
			.limit(1)
			.get();
		if (doublon) {
			const quoi = d.offre_ou_demande === OffreDemande.OFFRE ? 'vos offres' : 'vos demandes';
			throw erreur(
				`Ce produit figure déjà dans ${quoi} avec cette unité : modifiez la ligne existante.`
			);
		}
	}
	return produit;
}

function champsLigne(d: LigneEntree, produitId: number) {
	return {
		offre_ou_demande: d.offre_ou_demande,
		produit_id: produitId,
		unite_vente: d.unite_vente.trim(),
		prix: d.prix,
		quantite_mensuelle: d.quantite_mensuelle,
		fournisseur_ou_client: d.fournisseur_ou_client.trim()
	};
}

/**
 * Ajout d'une offre ou d'une demande (F-S6-20). L'en-tête de fiche est créé au premier ajout,
 * rattaché à l'entreprise (corrigé : plus d'id membre dans `entreprise_id`).
 */
routeur.post('/lignes', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(ligneEntreeSchema, req.body);
	const e = entrepriseModifiable(membre, donnees.entreprise_id);

	const cree = db.transaction(() => {
		let fiche = ficheDe(e);
		const produit = validerLigne(donnees, fiche);
		if (!fiche) {
			fiche = db
				.insert(ficheProspective)
				.values({
					membre_id: e.membre_id ?? membre.id,
					entreprise_id: e.id,
					etat: Etat.AUTORISE
				})
				.returning()
				.get()!;
		}
		return db
			.insert(ligneProspective)
			.values({ fiche_id: fiche.id, etat: Etat.AUTORISE, ...champsLigne(donnees, produit.id) })
			.returning({ id: ligneProspective.id })
			.get();
	});
	res.status(201).json(ok('Enregistrement effectué.', cree!.id));
});

function ligneModifiable(membre: Membre, id: number) {
	const ligne = db.select().from(ligneProspective).where(eq(ligneProspective.id, id)).get();
	if (!ligne) throw introuvable("Cette ligne n'existe plus.");
	const fiche = db
		.select()
		.from(ficheProspective)
		.where(eq(ficheProspective.id, ligne.fiche_id))
		.get();
	if (!fiche) throw introuvable("Cette ligne n'existe plus.");
	entrepriseModifiable(membre, fiche.entreprise_id);
	return { ligne, fiche };
}

routeur.put('/lignes/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { ligne, fiche } = ligneModifiable(membre, Number(req.params.id));
	const donnees = valider(ligneEntreeSchema, req.body);
	const produit = validerLigne(donnees, fiche, ligne.id);

	db.update(ligneProspective)
		.set(champsLigne(donnees, produit.id))
		.where(eq(ligneProspective.id, ligne.id))
		.run();
	res.json(ok('Modification effectuée.', ligne.id));
});

/**
 * Suppression **physique** (comme le legacy), réservée au propriétaire ou au gestionnaire
 * habilité (corrigé : le legacy permettait de supprimer les lignes des autres).
 */
routeur.delete('/lignes/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const { ligne } = ligneModifiable(membre, Number(req.params.id));
	db.delete(ligneProspective).where(eq(ligneProspective.id, ligne.id)).run();
	res.json(ok('Le produit a été retiré de votre fiche.', ligne.id));
});

// --- E-mail du gestionnaire à l'entreprise (F-S6-22) ----------------------------------------------

routeur.post('/entreprises/:entrepriseId/email', gestionnaireRequis, (req, res) => {
	const id = Number(req.params.entrepriseId);
	const e = db.select().from(entreprise).where(eq(entreprise.id, id)).get();
	if (!e || e.etat === Etat.SUPPRIME) {
		throw introuvable("Cette entreprise n'existe pas ou n'est plus publiée.");
	}

	const donnees = valider(emailEntreeSchema, req.body);
	const texte = donnees.message.trim();
	if (texte.length < 10) {
		throw erreur('Le message doit avoir 10 caractères minimum.', {
			message: 'Le message doit avoir 10 caractères minimum.'
		});
	}

	const proprietaire =
		e.membre_id !== null
			? db.select().from(tableMembre).where(eq(tableMembre.id, e.membre_id)).get()
			: null;
	const destinataire = e.email || proprietaire?.email || '';
	if (destinataire.indexOf('@') < 1) {
		throw erreur("Veuillez vérifier l'adresse mail de l'entreprise.");
	}

	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	envoyerEnArrierePlan(destinataire, 'Proposition des produits', texte, p?.email || undefined);
	res.json(ok('Votre opération a bien été envoyée.', e.id));
});
