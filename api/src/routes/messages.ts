/**
 * Messagerie privée membre ↔ « la frangine » (portage de `app/routers/messages.py` ;
 * legacy incl-message.php, pmessage.php).
 * Inventaire : E-TRV-10, E-ADM-13, F-TRV-48 à F-TRV-55 ; arbitrage ADR-0007 T10.
 *
 * Modèle : un fil par membre (`message.membre_id`) ; `de_la_frangine` donne le sens. Toutes les
 * réponses des gestionnaires appartiennent au même fil, quel que soit le gestionnaire qui répond
 * (correctif F-TRV-55).
 */
import { and, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat, TypeMembre } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { message as tableMessage } from '../schema/contenu.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { ok, valider } from '../schemas/commun.js';
import { url } from '../services/fichiers.js';
import { recherche } from '../services/fiches.js';
import { enLigne, frangineEnLigne, marquerLus } from '../services/messages.js';

export const routeur = Router();
export const prefixe = '/messages';

const LIMITE_FIL = 200;
const MESSAGE_VIDE = "Votre message est vide. Écrivez quelques mots avant d'envoyer.";

const messageEntreeSchema = z.object({ texte: z.string().max(2000).default('') });

/** Correctif F-TRV-54 : l'erreur est désormais affichée. */
function texteDuMessage(corps: unknown): string {
	const texte = valider(messageEntreeSchema, corps).texte.trim();
	if (!texte) throw erreur(MESSAGE_VIDE, { texte: 'Écrivez votre message.' });
	return texte;
}

function limiteDemandee(valeur: unknown): number {
	const n = Number(valeur);
	if (!Number.isFinite(n)) return LIMITE_FIL;
	return Math.min(500, Math.max(1, Math.trunc(n)));
}

interface AuteurMessage {
	id: number;
	pseudonyme: string;
}

/** Derniers messages du fil, du plus ancien au plus récent (état de lecture avant ouverture). */
function filDe(membreId: number, limite: number, avecAuteur: boolean) {
	const messages = db
		.select()
		.from(tableMessage)
		.where(eq(tableMessage.membre_id, membreId))
		.orderBy(desc(tableMessage.date_message), desc(tableMessage.id))
		.limit(limite)
		.all()
		.reverse();

	let auteurs = new Map<number, AuteurMessage>();
	if (avecAuteur) {
		const ids = [...new Set(messages.map((m) => m.auteur_id).filter((id): id is number => !!id))];
		if (ids.length) {
			auteurs = new Map(
				db
					.select({ id: tableMembre.id, pseudonyme: tableMembre.pseudonyme })
					.from(tableMembre)
					.where(inArray(tableMembre.id, ids))
					.all()
					.map((m) => [m.id, m])
			);
		}
	}

	return messages.map((m) => ({
		id: m.id,
		texte: m.texte,
		date_message: m.date_message,
		de_la_frangine: m.de_la_frangine,
		lu: m.lu,
		// Côté membre, c'est « la frangine » qui répond : l'identité du gestionnaire reste interne.
		auteur:
			avecAuteur && m.de_la_frangine && m.auteur_id !== null
				? (auteurs.get(m.auteur_id) ?? null)
				: null
	}));
}

function compterNonLus(membreId: number, deLaFrangine: boolean): number {
	return (
		db
			.select({ n: sql<number>`count(*)` })
			.from(tableMessage)
			.where(
				and(
					eq(tableMessage.membre_id, membreId),
					eq(tableMessage.de_la_frangine, deLaFrangine),
					eq(tableMessage.lu, false)
				)
			)
			.get()?.n ?? 0
	);
}

// --- Côté membre (Master ou Membre) -------------------------------------------------------------

function exigerNonGestionnaire(membre: Membre): void {
	if (membre.type_compte === TypeMembre.GESTIONNAIRE) {
		throw interdit('Les gestionnaires répondent aux membres depuis la messagerie de gestion.');
	}
}

/** Fil du membre connecté ; les réponses reçues sont marquées lues à l'ouverture (F-TRV-50). */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerNonGestionnaire(membre);

	const messages = filDe(membre.id, limiteDemandee(req.query.limite), false);
	const nonLus = compterNonLus(membre.id, true);
	if (nonLus) marquerLus(membre.id, true);

	res.json({ messages, non_lus: nonLus, frangine_en_ligne: frangineEnLigne() });
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	exigerNonGestionnaire(membre);
	const texte = texteDuMessage(req.body);

	const cree = db
		.insert(tableMessage)
		.values({
			membre_id: membre.id,
			auteur_id: membre.id,
			de_la_frangine: false,
			texte,
			lu: false,
			date_message: new Date()
		})
		.returning({ id: tableMessage.id })
		.get();
	res.status(201).json(ok('Message envoyé. Votre frangine vous répond au plus vite.', cree!.id));
});

// --- Côté gestionnaires ----------------------------------------------------------------------------

/**
 * Membres ayant un fil (non lus d'abord, puis par dernier message). `tous=true` ajoute les
 * membres sans fil, pour écrire le premier message (le legacy listait tous les membres).
 */
routeur.get('/fils', gestionnaireRequis, (req, res) => {
	const page = pagination(req);
	const tous = req.query.tous === 'true';

	// Statistiques par fil, calculées en une passe.
	const stats = db
		.select({
			membre_id: tableMessage.membre_id,
			total: sql<number>`count(*)`,
			non_lus: sql<number>`sum(case when ${tableMessage.de_la_frangine} = 0 and ${tableMessage.lu} = 0 then 1 else 0 end)`,
			dernier_id: sql<number>`max(${tableMessage.id})`,
			derniere_date: sql<string>`max(${tableMessage.date_message})`
		})
		.from(tableMessage)
		.groupBy(tableMessage.membre_id)
		.all();
	const parMembre = new Map(stats.map((s) => [s.membre_id, s]));

	const conditions: (SQL | undefined)[] = [ne(tableMembre.type_compte, TypeMembre.GESTIONNAIRE)];
	if (tous) {
		conditions.push(ne(tableMembre.etat, Etat.SUPPRIME));
	} else if (parMembre.size === 0) {
		res.json({ items: [], total: 0, page: page.page, taille: page.taille });
		return;
	} else {
		conditions.push(inArray(tableMembre.id, [...parMembre.keys()]));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			tableMembre.nom,
			tableMembre.pseudonyme,
			tableMembre.telephone,
			tableMembre.identifiant
		)
	);

	const membres = db
		.select()
		.from(tableMembre)
		.where(and(...conditions.filter(Boolean)))
		.all();

	// Tri : fils avec messages non lus d'abord, puis par date du dernier message, puis par nom.
	membres.sort((a, b) => {
		const sa = parMembre.get(a.id);
		const sb = parMembre.get(b.id);
		const urgentA = (sa?.non_lus ?? 0) > 0 ? 1 : 0;
		const urgentB = (sb?.non_lus ?? 0) > 0 ? 1 : 0;
		if (urgentA !== urgentB) return urgentB - urgentA;
		const dateA = sa?.derniere_date ?? '';
		const dateB = sb?.derniere_date ?? '';
		if (dateA !== dateB) return dateB.localeCompare(dateA);
		return a.nom.localeCompare(b.nom, 'fr');
	});

	const totalFils = membres.length;
	const page_ = membres.slice(page.offset, page.offset + page.taille);

	const idsDerniers = page_
		.map((m) => parMembre.get(m.id)?.dernier_id)
		.filter((id): id is number => !!id);
	const derniers = new Map(
		idsDerniers.length
			? db
					.select()
					.from(tableMessage)
					.where(inArray(tableMessage.id, idsDerniers))
					.all()
					.map((m) => [m.id, m])
			: []
	);

	const maintenant = new Date();
	const items = page_.map((m) => {
		const s = parMembre.get(m.id);
		const dernier = s?.dernier_id ? derniers.get(s.dernier_id) : undefined;
		return {
			membre: vueMembreFil(m, maintenant),
			total: s?.total ?? 0,
			non_lus: Number(s?.non_lus ?? 0),
			dernier_message: dernier
				? {
						id: dernier.id,
						texte: dernier.texte,
						date_message: dernier.date_message,
						de_la_frangine: dernier.de_la_frangine,
						lu: dernier.lu,
						auteur: null
					}
				: null
		};
	});

	res.json({ items, total: totalFils, page: page.page, taille: page.taille });
});

/** Identité du membre titulaire d'un fil, vue par un gestionnaire. */
function vueMembreFil(m: Membre, maintenant?: Date) {
	return {
		id: m.id,
		nom: m.nom,
		pseudonyme: m.pseudonyme,
		telephone: m.telephone,
		email: m.email,
		categorie: m.categorie,
		photo: m.photo,
		photo_url: url(m.photo),
		derniere_activite: m.derniere_activite,
		en_ligne: enLigne(m, maintenant)
	};
}

function titulaireDuFil(membreId: number): Membre {
	const titulaire = db.select().from(tableMembre).where(eq(tableMembre.id, membreId)).get();
	if (!titulaire || titulaire.etat === Etat.SUPPRIME) {
		throw introuvable("Ce membre n'existe pas ou son compte est supprimé.");
	}
	if (titulaire.type_compte === TypeMembre.GESTIONNAIRE) {
		throw erreur(
			'La messagerie relie un membre à la frangine : choisissez un membre, pas un gestionnaire.'
		);
	}
	return titulaire;
}

/** Ouvre la conversation d'un membre : ses messages sont marqués lus (F-TRV-53). */
routeur.get('/fils/:membreId', gestionnaireRequis, (req, res) => {
	const titulaire = titulaireDuFil(Number(req.params.membreId));
	const messages = filDe(titulaire.id, limiteDemandee(req.query.limite), true);
	const nonLus = compterNonLus(titulaire.id, false);
	if (nonLus) marquerLus(titulaire.id, false);
	res.json({ membre: vueMembreFil(titulaire), messages, non_lus: nonLus });
});

/** Réponse de la frangine ; les messages du membre sont marqués lus (comme le legacy). */
routeur.post('/fils/:membreId', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const titulaire = titulaireDuFil(Number(req.params.membreId));
	const texte = texteDuMessage(req.body);

	const cree = db.transaction(() => {
		const m = db
			.insert(tableMessage)
			.values({
				membre_id: titulaire.id,
				auteur_id: membre.id,
				de_la_frangine: true,
				texte,
				lu: false,
				date_message: new Date()
			})
			.returning({ id: tableMessage.id })
			.get();
		marquerLus(titulaire.id, false);
		return m;
	});
	res.status(201).json(ok('Réponse envoyée.', cree!.id));
});
