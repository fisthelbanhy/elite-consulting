/**
 * Back-office « Gestion » (portage de `app/routers/gestion.py` ; legacy : menu gestionnaire
 * `incl-menu1.php`, écrans `p*.php`).
 *
 * Tout le préfixe `/gestion` est réservé aux gestionnaires (F-ADM-39, ADR-0007 T1) :
 * `gestionnaireRequis` est monté sur le routeur entier. Les actions sensibles vérifient en plus le
 * droit nécessaire (Activation, Attribution).
 *
 * Découpage : ce fichier porte le tableau de bord, les compteurs de la barre latérale et la file de
 * modération transverse ; `gestion-membres.ts`, `gestion-referentiels.ts` et `gestion-journaux.ts`
 * portent le reste.
 */
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis } from '../deps.js';
import { Etat, EtatCourse, EtatPaiement, TypeMembre } from '../enums.js';
import { erreur } from '../erreurs.js';
import { course, paiement } from '../schema/commerce.js';
import { contact, message, suggestion } from '../schema/contenu.js';
import { ville as tableVille, visite } from '../schema/core.js';
import {
	membre as tableMembre,
	reinitialisationMotDePasse,
	visiteMembre
} from '../schema/membres.js';
import { url } from '../services/fichiers.js';
import * as svc from '../services/gestion.js';

export const routeur = Router();
export const prefixe = '/gestion';

routeur.use(gestionnaireRequis);

/** Compteurs légers affichés dans la barre latérale de la gestion. */
function compteurs() {
	const n = (requete: { get(): { n: number } | undefined }) => requete.get()?.n ?? 0;
	const fiches = Object.values(svc.compterEnAttente()).reduce((a, b) => a + b, 0);
	return {
		nouveaux_membres: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(tableMembre)
				.where(
					and(eq(tableMembre.etat, Etat.NON_TRAITE), ne(tableMembre.id, svc.ID_COMPTE_SYSTEME))
				)
		),
		paiements_en_attente: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(paiement)
				.where(eq(paiement.etat, EtatPaiement.NON_CONFIRME))
		),
		fiches_en_attente: fiches,
		reinitialisations_en_attente: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(reinitialisationMotDePasse)
				.where(svc.demandesEnAttente())
		),
		messages_non_lus: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(message)
				.where(and(eq(message.de_la_frangine, false), eq(message.lu, false)))
		),
		contacts_a_traiter: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(contact)
				.where(eq(contact.etat, Etat.NON_TRAITE))
		)
	};
}

/** Pastilles de la barre latérale (legacy : « New Membres: N » du pied de page, F-TRV-70). */
routeur.get('/compteurs', (_req, res) => {
	res.json(compteurs());
});

/** `2026-09-28` — clé de regroupement des séries journalières, en heure locale. */
function jourIso(d: Date): string {
	const deux = (v: number) => String(v).padStart(2, '0');
	return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

/** Page d'accueil exploitable du gestionnaire (correctif F-TRV-06 : page vide dans le legacy). */
routeur.get('/tableau-de-bord', (req, res) => {
	const moi = exigerMembre(req);
	const base = compteurs();
	const maintenant = new Date();
	const aujourdhui = new Date(
		maintenant.getFullYear(),
		maintenant.getMonth(),
		maintenant.getDate()
	);
	const debut30 = new Date(aujourdhui.getTime() - 29 * 86_400_000);
	const debut7 = new Date(aujourdhui.getTime() - 6 * 86_400_000);

	const n = (requete: { get(): { n: number } | undefined }) => requete.get()?.n ?? 0;

	// Série journalière des 30 derniers jours (visites anonymes et connexions de membres).
	const visites = new Map(
		db
			.select({ jour: sql<string>`date(${visite.date_heure})`, n: sql<number>`count(*)` })
			.from(visite)
			.where(gte(visite.date_heure, debut30))
			.groupBy(sql`date(${visite.date_heure})`)
			.all()
			.map((l) => [l.jour, l.n])
	);
	const connexions = new Map(
		db
			.select({
				jour: sql<string>`date(${visiteMembre.date_connexion})`,
				n: sql<number>`count(*)`
			})
			.from(visiteMembre)
			.where(gte(visiteMembre.date_connexion, debut30))
			.groupBy(sql`date(${visiteMembre.date_connexion})`)
			.all()
			.map((l) => [l.jour, l.n])
	);

	const serie: { jour: string; visites: number; connexions: number }[] = [];
	for (let i = 29; i >= 0; i--) {
		const j = new Date(aujourdhui.getTime() - i * 86_400_000);
		const cle = jourIso(j);
		serie.push({
			jour: cle,
			visites: visites.get(cle) ?? 0,
			connexions: connexions.get(cle) ?? 0
		});
	}
	const cle7 = jourIso(debut7);
	const somme = (champ: 'visites' | 'connexions', depuis?: string) =>
		serie.filter((p) => !depuis || p.jour >= depuis).reduce((a, p) => a + p[champ], 0);

	const parModule = svc.compterEnAttente();
	const villes = new Map(
		db
			.select({ id: tableVille.id, nom: tableVille.nom })
			.from(tableVille)
			.all()
			.map((v) => [v.id, v])
	);
	const inscrits = db
		.select()
		.from(tableMembre)
		.where(and(ne(tableMembre.id, svc.ID_COMPTE_SYSTEME), ne(tableMembre.etat, Etat.SUPPRIME)))
		.orderBy(desc(tableMembre.date_creation), desc(tableMembre.id))
		.limit(8)
		.all();

	res.json({
		...base,
		membres: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(tableMembre)
				.where(and(ne(tableMembre.etat, Etat.SUPPRIME), ne(tableMembre.id, svc.ID_COMPTE_SYSTEME)))
		),
		membres_en_ligne: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(tableMembre)
				.where(
					and(
						ne(tableMembre.type_compte, TypeMembre.GESTIONNAIRE),
						gte(tableMembre.derniere_activite, new Date(maintenant.getTime() - svc.PRESENCE))
					)
				)
		),
		montant_en_attente:
			db
				.select({ n: sql<number>`coalesce(sum(${paiement.montant}), 0)` })
				.from(paiement)
				.where(eq(paiement.etat, EtatPaiement.NON_CONFIRME))
				.get()?.n ?? 0,
		suggestions_a_lire: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(suggestion)
				.where(eq(suggestion.etat, Etat.NON_TRAITE))
		),
		courses_en_attente: n(
			db
				.select({ n: sql<number>`count(*)` })
				.from(course)
				.where(and(eq(course.etat_course, EtatCourse.EN_ATTENTE), ne(course.etat, Etat.SUPPRIME)))
		),
		modules_en_attente: svc.MODULES_MODERES.map((m) => ({
			cle: m.cle,
			libelle: m.libelle,
			total: parModule[m.cle] ?? 0
		})),
		visites_7j: somme('visites', cle7),
		visites_30j: somme('visites'),
		connexions_7j: somme('connexions', cle7),
		connexions_30j: somme('connexions'),
		serie,
		derniers_inscrits: inscrits.map((m) => ({
			id: m.id,
			nom: m.nom,
			pseudonyme: m.pseudonyme,
			categorie: m.categorie,
			type_compte: m.type_compte,
			etat: m.etat,
			date_creation: m.date_creation,
			ville: m.ville_id !== null ? (villes.get(m.ville_id) ?? null) : null,
			photo: m.photo,
			photo_url: url(m.photo)
		})),
		droits: {
			attribution: moi.droit_attribution,
			caisse: moi.droit_caisse,
			activation: moi.droit_activation
		}
	});
});

/**
 * File transverse des fiches en attente (état 1) de tous les modules. La modération se fait ensuite
 * sur la fiche elle-même (panneau de modération, droit Activation).
 */
routeur.get('/moderation', (req, res) => {
	const page = svc.paginationGestion(req);
	const parModule = svc.compterEnAttente();
	const modules = svc.MODULES_MODERES.map((m) => ({
		cle: m.cle,
		libelle: m.libelle,
		total: parModule[m.cle] ?? 0
	}));
	const module = typeof req.query.module === 'string' ? req.query.module : '';
	if (module && !svc.MODULES_PAR_CLE.has(module)) {
		throw erreur('Module inconnu.', { module: 'Module inconnu.' });
	}

	let elements: svc.ElementModeration[];
	let total: number;
	if (module) {
		const m = svc.MODULES_PAR_CLE.get(module)!;
		elements = svc
			.fichesEnAttente(m, page.taille, page.offset)
			.map((f) => svc.elementModeration(m, f));
		total = parModule[module] ?? 0;
	} else {
		// Volume faible (quelques dizaines de fiches) : fusion en mémoire, plus récentes d'abord.
		const tous: svc.ElementModeration[] = [];
		for (const m of svc.MODULES_MODERES) {
			if (parModule[m.cle]) {
				tous.push(...svc.fichesEnAttente(m).map((f) => svc.elementModeration(m, f)));
			}
		}
		tous.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
		total = tous.length;
		elements = tous.slice(page.offset, page.offset + page.taille);
	}

	const noms = svc.pseudonymes(elements.map((e) => e.auteur_id).filter((i): i is number => !!i));
	res.json({
		items: elements.map((e) => ({
			...e,
			auteur_pseudonyme: e.auteur_id ? (noms.get(e.auteur_id) ?? null) : null
		})),
		total,
		page: page.page,
		taille: page.taille,
		modules
	});
});
