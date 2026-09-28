/**
 * Référentiels publics, paramètres du site, statistiques d'accueil, journal des visites
 * (portage de `app/routers/referentiels.py`).
 */
import { and, asc, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { Router } from 'express';
import { db } from '../db.js';
import { Etat, TypeAnnonceRH, toutesLesEnumerations } from '../enums.js';
import {
	banque,
	diplome,
	domaineActivite,
	familleArticle,
	parametre,
	quartier,
	secteurActivite,
	ville,
	visite
} from '../schema/core.js';
import { article, immobilier, produit } from '../schema/commerce.js';
import { entreprise, marche, reussite } from '../schema/entreprises.js';
import { appelFond, groupeLikelemba } from '../schema/fonds.js';
import { membre as tableMembre } from '../schema/membres.js';
import { partenariat } from '../schema/opportunite.js';
import { annonceEmploi } from '../schema/rh.js';
import { ok } from '../schemas/commun.js';

export const routeur = Router();
export const prefixe = '/referentiels';

routeur.get('/enums', (_req, res) => {
	res.json(toutesLesEnumerations());
});

routeur.get('/villes', (_req, res) => {
	const villes = db.select().from(ville).orderBy(asc(ville.nom)).all();
	const quartiers = db.select().from(quartier).orderBy(asc(quartier.nom)).all();
	res.json(
		villes.map((v) => ({
			id: v.id,
			nom: v.nom,
			quartiers: quartiers
				.filter((q) => q.ville_id === v.id)
				.map((q) => ({ id: q.id, nom: q.nom }))
		}))
	);
});

routeur.get('/secteurs', (_req, res) => {
	const secteurs = db
		.select()
		.from(secteurActivite)
		.where(ne(secteurActivite.etat, Etat.SUPPRIME))
		.orderBy(asc(secteurActivite.libelle))
		.all();
	const domaines = db
		.select()
		.from(domaineActivite)
		.where(ne(domaineActivite.etat, Etat.SUPPRIME))
		.orderBy(asc(domaineActivite.libelle))
		.all();
	res.json(
		secteurs.map((s) => ({
			id: s.id,
			libelle: s.libelle,
			domaines: domaines
				.filter((d) => d.secteur_id === s.id)
				.map((d) => ({ id: d.id, libelle: d.libelle }))
		}))
	);
});

routeur.get('/diplomes', (_req, res) => {
	res.json(
		db
			.select({ id: diplome.id, libelle: diplome.libelle })
			.from(diplome)
			.orderBy(asc(diplome.libelle))
			.all()
	);
});

routeur.get('/familles-articles', (_req, res) => {
	res.json(
		db
			.select({ id: familleArticle.id, libelle: familleArticle.libelle })
			.from(familleArticle)
			.orderBy(asc(familleArticle.libelle))
			.all()
	);
});

routeur.get('/banques', (_req, res) => {
	res.json(
		db
			.select({
				id: banque.id,
				sigle: banque.sigle,
				nom: banque.nom,
				telephones: banque.telephones,
				adresse: banque.adresse,
				email: banque.email,
				site_web: banque.site_web
			})
			.from(banque)
			.where(eq(banque.etat, Etat.AUTORISE))
			.orderBy(asc(banque.nom))
			.all()
	);
});

/** Paramètres publics du site. Les compteurs de séquences ne sont jamais exposés. */
routeur.get('/parametres', (_req, res) => {
	const p = db
		.select({
			nom_site: parametre.nom_site,
			adresse: parametre.adresse,
			telephone_1: parametre.telephone_1,
			telephone_2: parametre.telephone_2,
			email: parametre.email,
			whatsapp: parametre.whatsapp,
			texte_aide: parametre.texte_aide,
			montant_minimum_placement: parametre.montant_minimum_placement,
			montant_minimum_course: parametre.montant_minimum_course,
			commission_course: parametre.commission_course,
			conditions_course: parametre.conditions_course,
			description_section_1: parametre.description_section_1,
			description_section_2: parametre.description_section_2,
			description_section_3: parametre.description_section_3,
			description_section_4: parametre.description_section_4,
			description_section_5: parametre.description_section_5,
			description_section_6: parametre.description_section_6,
			description_section_7: parametre.description_section_7,
			module_epargne_actif: parametre.module_epargne_actif,
			module_sante_actif: parametre.module_sante_actif
		})
		.from(parametre)
		.where(eq(parametre.id, 1))
		.get();

	// Base non initialisée : mêmes valeurs par défaut que le modèle, pour que le site s'affiche.
	res.json(
		p ?? {
			nom_site: 'La Frangine',
			adresse: '',
			telephone_1: '',
			telephone_2: '',
			email: '',
			whatsapp: '',
			texte_aide: '',
			montant_minimum_placement: 0,
			montant_minimum_course: 0,
			commission_course: 0,
			conditions_course: '',
			description_section_1: '',
			description_section_2: '',
			description_section_3: '',
			description_section_4: '',
			description_section_5: '',
			description_section_6: '',
			description_section_7: '',
			module_epargne_actif: true,
			module_sante_actif: true
		}
	);
});

/** Compte les lignes d'une table répondant à une condition. */
function compter(table: SQLiteTable, condition: SQL | undefined): number {
	const ligne = db
		.select({ n: sql<number>`count(*)` })
		.from(table)
		.where(condition)
		.get();
	return ligne?.n ?? 0;
}

/** Chiffres de preuve sociale affichés sur l'accueil et compteurs des onglets. */
routeur.get('/stats', (_req, res) => {
	const publie = Etat.AUTORISE;
	const fonds = db
		.select({
			promis: sql<number>`coalesce(sum(${appelFond.montant_promis}), 0)`,
			collecte: sql<number>`coalesce(sum(${appelFond.montant_collecte}), 0)`
		})
		.from(appelFond)
		.where(eq(appelFond.etat, publie))
		.get();

	res.json({
		membres: compter(tableMembre, ne(tableMembre.etat, Etat.SUPPRIME)),
		offres_emploi: compter(
			annonceEmploi,
			and(eq(annonceEmploi.type_annonce, TypeAnnonceRH.OFFRE), eq(annonceEmploi.etat, publie))
		),
		demandes_emploi: compter(
			annonceEmploi,
			and(eq(annonceEmploi.type_annonce, TypeAnnonceRH.DEMANDE), eq(annonceEmploi.etat, publie))
		),
		annonces_immobilier: compter(immobilier, eq(immobilier.etat, publie)),
		annonces_articles: compter(article, eq(article.etat, publie)),
		projets_financement: compter(appelFond, eq(appelFond.etat, publie)),
		montant_promis: fonds?.promis ?? 0,
		montant_collecte: fonds?.collecte ?? 0,
		groupes_likelemba: compter(groupeLikelemba, eq(groupeLikelemba.etat, publie)),
		entreprises: compter(entreprise, eq(entreprise.etat, publie)),
		partenariats: compter(partenariat, eq(partenariat.etat, publie)),
		produits: compter(produit, eq(produit.etat, publie)),
		reussites: compter(reussite, eq(reussite.etat, publie)),
		annee_creation: 2016
	});
});

interface ALaUne {
	type: string;
	titre: string;
	detail: string;
	href: string;
	date: Date | null;
}

/** « Opportunités du moment » de l'accueil : dernières fiches publiées, toutes sections. */
routeur.get('/a-la-une', (req, res) => {
	const brut = Number(req.query.limite);
	const limite = Number.isFinite(brut) && brut > 0 ? Math.min(50, Math.trunc(brut)) : 6;
	const publie = Etat.AUTORISE;
	const items: ALaUne[] = [];

	for (const m of db
		.select()
		.from(marche)
		.where(eq(marche.etat, publie))
		.orderBy(desc(marche.date_creation))
		.limit(limite)
		.all()) {
		items.push({
			type: 'Marché',
			titre: m.libelle || m.numero_appel_offre,
			detail: m.maitre_ouvrage || m.publie_par,
			href: `/marches/${m.id}`,
			date: m.date_creation
		});
	}

	const domaines = new Map(
		db.select({ id: domaineActivite.id, libelle: domaineActivite.libelle }).from(domaineActivite).all().map((d) => [d.id, d.libelle])
	);
	for (const a of db
		.select()
		.from(annonceEmploi)
		.where(eq(annonceEmploi.etat, publie))
		.orderBy(desc(annonceEmploi.date_creation))
		.limit(limite)
		.all()) {
		const offre = a.type_annonce === TypeAnnonceRH.OFFRE;
		items.push({
			type: offre ? "Offre d'emploi" : 'Profil disponible',
			titre: (offre ? a.poste_a_pourvoir : a.competences) || a.reference,
			detail: (a.domaine_id !== null ? domaines.get(a.domaine_id) : '') ?? '',
			href: `/emplois/${a.id}`,
			date: a.date_creation
		});
	}

	for (const p of db
		.select()
		.from(appelFond)
		.where(eq(appelFond.etat, publie))
		.orderBy(desc(appelFond.date_creation))
		.limit(limite)
		.all()) {
		items.push({
			type: 'Projet à soutenir',
			titre: p.nom_projet,
			detail: p.objet_projet.slice(0, 120),
			href: `/projets/${p.id}`,
			date: p.date_creation
		});
	}

	for (const i of db
		.select()
		.from(immobilier)
		.where(eq(immobilier.etat, publie))
		.orderBy(desc(immobilier.date_creation))
		.limit(limite)
		.all()) {
		items.push({
			type: 'Immobilier',
			titre: i.description.slice(0, 80) || i.reference,
			detail: i.localisation,
			href: `/immobilier/${i.id}`,
			date: i.date_creation
		});
	}

	for (const ar of db
		.select()
		.from(article)
		.where(eq(article.etat, publie))
		.orderBy(desc(article.date_creation))
		.limit(limite)
		.all()) {
		items.push({
			type: 'Annonce',
			titre: ar.libelle,
			detail: ar.description.slice(0, 80),
			href: `/annonces/${ar.id}`,
			date: ar.date_creation
		});
	}

	items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
	res.json(items.slice(0, limite));
});

// --- Journal des visites -------------------------------------------------------------------------

export const routeurVisites = Router();
export const prefixeVisites = '/visites';

/** Legacy `choix0.php` : une ligne par adresse IP et par tranche de 30 minutes. */
routeurVisites.post('/', (req, res) => {
	const ip = (req.header('x-client-ip') || req.ip || '').slice(0, 64);
	const derniere = db
		.select({ quand: sql<string | null>`max(${visite.date_heure})` })
		.from(visite)
		.where(eq(visite.adresse_ip, ip))
		.get();

	const ilYATrenteMinutes = new Date(Date.now() - 30 * 60 * 1000);
	const recente =
		derniere?.quand != null && new Date(derniere.quand.replace(' ', 'T')) >= ilYATrenteMinutes;
	if (!recente) {
		db.insert(visite)
			.values({ adresse_ip: ip, membre_id: req.membre?.id ?? null })
			.run();
	}
	res.json(ok('ok'));
});
