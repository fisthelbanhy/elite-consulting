/**
 * Formulaire de contact (portage de `app/routers/contact.py` ; legacy pcontact.php,
 * incl-envoimail.php). Inventaire : E-TRV-08, F-TRV-35 à F-TRV-42 ; arbitrage ADR-0007 T7.
 *
 * - Visiteurs et membres écrivent ; un membre voit ses messages sans pouvoir les modifier.
 * - Seuls les gestionnaires voient tous les messages, y répondent et changent leur état.
 * - La réponse est **enregistrée puis** envoyée par e-mail (le legacy envoyait l'e-mail même si
 *   l'enregistrement échouait).
 */
import { and, asc, desc, eq, gte, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat } from '../enums.js';
import { erreur, introuvable } from '../erreurs.js';
import { contact } from '../schema/contenu.js';
import { parametre } from '../schema/core.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { ok, telephoneFacultatif, valider } from '../schemas/commun.js';
import { envoyerEnArrierePlan } from '../services/emails.js';
import { paginer, recherche } from '../services/fiches.js';
import { notifier } from '../services/messages.js';

export const routeur = Router();
export const prefixe = '/contact';

type Contact = typeof contact.$inferSelect;

/** Limitation de débit (ADR-0005) : messages par expéditeur sur 24 heures. */
const LIMITE_VISITEUR = 5;
const LIMITE_MEMBRE = 10;
const DUREE_MINIMALE_MS = 3000;

const MESSAGE_EMAIL = 'Adresse e-mail invalide (ex. prenom.nom@gmail.com).';

/** E-mail facultatif ici (l'obligation dépend de l'expéditeur) ; format contrôlé s'il est fourni. */
const emailFacultatif = z
	.string()
	.max(120)
	.default('')
	.transform((v) => v.trim())
	.refine((v) => v === '' || z.email().safeParse(v).success, { message: MESSAGE_EMAIL });

const contactEntreeSchema = z.object({
	nom: z.string().max(120).default(''),
	email: emailFacultatif,
	telephone: telephoneFacultatif,
	objet: z.string().max(200).default(''),
	texte: z.string().max(5000).default(''),
	// Anti-robot (ADR-0005) : champ piège invisible + délai minimal de remplissage.
	site_web: z.string().default(''),
	duree_saisie_ms: z.coerce.number().int().default(0)
});

const reponseEntreeSchema = z.object({ reponse: z.string().max(5000).default('') });
/** 1 = à traiter, 2 = traité, 3 = supprimé. */
const etatContactSchema = z.object({ etat: z.coerce.number().int().min(1).max(3) });

function vueContact(c: Contact, expediteur?: { id: number; pseudonyme: string; type_compte: number } | null) {
	return {
		id: c.id,
		membre_id: c.membre_id,
		membre: expediteur ?? null,
		nom: c.nom,
		email: c.email,
		telephone: c.telephone,
		objet: c.objet,
		texte: c.texte,
		date_envoi: c.date_envoi,
		reponse: c.reponse,
		date_reponse: c.date_reponse,
		etat: c.etat,
		repondu: c.reponse.trim().length > 0
	};
}

function expediteursDe(contacts: Contact[]) {
	const ids = [...new Set(contacts.map((c) => c.membre_id).filter((id): id is number => !!id))];
	if (ids.length === 0) return new Map<number, { id: number; pseudonyme: string; type_compte: number }>();
	return new Map(
		db
			.select({
				id: tableMembre.id,
				pseudonyme: tableMembre.pseudonyme,
				type_compte: tableMembre.type_compte
			})
			.from(tableMembre)
			.where(inArray(tableMembre.id, ids))
			.all()
			.map((m) => [m.id, m])
	);
}

/**
 * Visiteur : nom, e-mail, objet, texte (+ téléphone facultatif). Membre : nom et e-mail repris
 * de son profil, non modifiables (F-TRV-36).
 */
routeur.post('/', (req, res) => {
	const donnees = valider(contactEntreeSchema, req.body);
	const membre = req.membre;

	if (donnees.site_web || (donnees.duree_saisie_ms > 0 && donnees.duree_saisie_ms < DUREE_MINIMALE_MS)) {
		throw erreur('Message refusé. Si vous êtes un humain, patientez quelques secondes et réessayez.');
	}

	const objet = donnees.objet.split(/\s+/).filter(Boolean).join(' ');
	const texte = donnees.texte.trim();
	const champs: Record<string, string> = {};

	let nom: string;
	let email: string;
	let telephone: string;
	if (membre) {
		nom = membre.nom;
		// Un membre sans e-mail peut en indiquer un ; sinon il lira la réponse dans son espace.
		email = (membre.email ?? '').trim() || donnees.email;
		telephone = donnees.telephone || membre.telephone;
	} else {
		nom = donnees.nom.split(/\s+/).filter(Boolean).join(' ');
		email = donnees.email;
		telephone = donnees.telephone;
		if (nom.length < 5) {
			champs.nom = 'Veuillez indiquer vos nom et prénom (5 caractères minimum).';
		}
		if (!email) {
			champs.email =
				"Veuillez indiquer votre adresse e-mail : c'est à cette adresse que nous répondrons.";
		}
	}
	if (objet.length < 5) champs.objet = "L'objet du message doit contenir au moins 5 caractères.";
	if (texte.length < 10) champs.texte = 'Votre message doit contenir au moins 10 caractères.';
	if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);

	// Anti-doublon legacy : même objet et même texte (F-TRV-37).
	const doublon = db
		.select({ id: contact.id })
		.from(contact)
		.where(and(eq(contact.objet, objet), eq(contact.texte, texte)))
		.limit(1)
		.get();
	if (doublon) throw erreur('Ce message est déjà enregistré.');

	const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const compter = (condition: SQL) =>
		db
			.select({ n: sql<number>`count(*)` })
			.from(contact)
			.where(and(gte(contact.date_envoi, depuis), condition))
			.get()?.n ?? 0;
	const trop = membre
		? compter(eq(contact.membre_id, membre.id)) >= LIMITE_MEMBRE
		: compter(sql`lower(${contact.email}) = ${email.toLowerCase()}`) >= LIMITE_VISITEUR;
	if (trop) {
		throw erreur(
			"Vous nous avez déjà écrit plusieurs fois aujourd'hui : nous vous répondons au plus vite. " +
				'Pour une urgence, écrivez-nous sur WhatsApp.'
		);
	}

	const cree = db
		.insert(contact)
		.values({
			membre_id: membre?.id ?? null,
			nom: nom.slice(0, 120),
			email: email.slice(0, 120),
			telephone,
			objet,
			texte,
			date_envoi: new Date(),
			// Écart assumé : le legacy créait à l'état 2 ; « Non traité » sert de file d'attente.
			etat: Etat.NON_TRAITE
		})
		.returning({ id: contact.id })
		.get();

	res
		.status(201)
		.json(ok('Votre message est bien envoyé. Votre frangine vous répond au plus vite.', cree!.id));
});

/**
 * Gestionnaire : tous les messages, filtres membre / texte / état (F-TRV-38).
 * Autre connecté (Master compris, ADR-0007 T7) : ses propres messages seulement (F-TRV-39).
 */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const conditions: (SQL | undefined)[] = [];

	if (membre.type_compte === 1) {
		const membreId = Number(req.query.membre_id);
		if (Number.isFinite(membreId) && membreId > 0) {
			conditions.push(eq(contact.membre_id, Math.trunc(membreId)));
		}
		const etat = Number(req.query.etat);
		conditions.push(
			Number.isFinite(etat) && etat >= 1
				? eq(contact.etat, Math.trunc(etat))
				: ne(contact.etat, Etat.SUPPRIME)
		);
	} else {
		conditions.push(eq(contact.membre_id, membre.id));
	}
	conditions.push(
		recherche(
			typeof req.query.q === 'string' ? req.query.q : null,
			contact.objet,
			contact.texte,
			contact.nom,
			contact.email
		)
	);

	const requete = db
		.select()
		.from(contact)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(contact.date_envoi), desc(contact.id))
		.$dynamic();

	const liste = paginer<Contact>(requete, page);
	const expediteurs = expediteursDe(liste.items);
	res.json({
		items: liste.items.map((c) =>
			vueContact(c, c.membre_id !== null ? expediteurs.get(c.membre_id) : null)
		),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

routeur.get('/compteurs', gestionnaireRequis, (_req, res) => {
	const n =
		db
			.select({ n: sql<number>`count(*)` })
			.from(contact)
			.where(eq(contact.etat, Etat.NON_TRAITE))
			.get()?.n ?? 0;
	res.json({ a_traiter: n });
});

/** Membres ayant écrit au moins un message (filtre « Membre » de la liste de gestion). */
routeur.get('/expediteurs', gestionnaireRequis, (_req, res) => {
	const lignes = db
		.select({
			id: tableMembre.id,
			nom: tableMembre.nom,
			pseudonyme: tableMembre.pseudonyme
		})
		.from(tableMembre)
		.where(
			sql`${tableMembre.id} in (select ${contact.membre_id} from ${contact} where ${contact.membre_id} is not null)`
		)
		.orderBy(asc(tableMembre.nom))
		.all();

	res.json(
		lignes.map((m) => ({
			value: m.id,
			label: m.pseudonyme && m.pseudonyme !== m.nom ? `${m.nom} (${m.pseudonyme})` : m.nom
		}))
	);
});

function obtenirContact(id: number, membre: Membre): Contact {
	const c = db.select().from(contact).where(eq(contact.id, id)).get();
	if (!c || !(membre.type_compte === 1 || c.membre_id === membre.id)) {
		throw introuvable("Ce message n'existe pas.");
	}
	return c;
}

routeur.get('/:id', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirContact(Number(req.params.id), membre);
	const expediteurs = expediteursDe([c]);
	res.json({
		...vueContact(c, c.membre_id !== null ? expediteurs.get(c.membre_id) : null),
		peut_repondre: membre.type_compte === 1
	});
});

/** Deux chiffres, pour le format de date du corps d'e-mail. */
function deuxChiffres(n: number): string {
	return String(n).padStart(2, '0');
}

function corpsEmail(c: Contact, reponse: string, nomSite: string): string {
	const d = c.date_envoi;
	const quand =
		`${deuxChiffres(d.getDate())}/${deuxChiffres(d.getMonth() + 1)}/${d.getFullYear()} ` +
		`à ${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
	return (
		`Bonjour ${c.nom},\n\n` +
		`${reponse}\n\n` +
		`Bien à vous,\nVotre frangine — ${nomSite}\n\n` +
		'----------------------------------------\n' +
		`Votre message du ${quand} : « ${c.objet} »\n\n` +
		`${c.texte}\n`
	);
}

/**
 * Réponse d'un gestionnaire : enregistrée, puis envoyée par e-mail (F-TRV-40, F-TRV-42).
 * Un membre expéditeur est aussi prévenu dans sa messagerie.
 */
routeur.post('/:id/reponse', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirContact(Number(req.params.id), membre);
	const donnees = valider(reponseEntreeSchema, req.body);

	const reponse = donnees.reponse.trim();
	if (reponse.length < 2) {
		throw erreur('Veuillez saisir la réponse.', { reponse: 'Veuillez saisir la réponse.' });
	}

	const expediteur = c.membre_id
		? (db.select().from(tableMembre).where(eq(tableMembre.id, c.membre_id)).get() ?? null)
		: null;

	// L'e-mail ne part qu'une fois la réponse enregistrée.
	db.transaction(() => {
		db.update(contact)
			.set({
				reponse,
				date_reponse: new Date(),
				// « Traité ».
				...(c.etat === Etat.NON_TRAITE ? { etat: Etat.AUTORISE } : {})
			})
			.where(eq(contact.id, c.id))
			.run();

		if (expediteur && expediteur.type_compte !== 1 && expediteur.etat !== Etat.SUPPRIME) {
			notifier(
				expediteur.id,
				`Bonjour ! Nous avons répondu à votre message « ${c.objet} ». ` +
					'Retrouvez la réponse sur la page Contact, rubrique « Mes messages ».',
				membre.id
			);
		}
	});

	const p = db.select().from(parametre).where(eq(parametre.id, 1)).get();
	const nomSite = p?.nom_site ?? 'La Frangine';

	let message: string;
	if (c.email) {
		envoyerEnArrierePlan(
			c.email,
			`Re : ${c.objet}`,
			corpsEmail(c, reponse, nomSite),
			p?.email || undefined
		);
		message = `Réponse enregistrée et envoyée par e-mail à ${c.email}.`;
	} else if (expediteur) {
		message = "Réponse enregistrée. Pas d'adresse e-mail : le membre la retrouvera dans son espace.";
	} else {
		message = "Réponse enregistrée. Aucune adresse e-mail : contactez l'expéditeur par téléphone.";
	}
	res.json(ok(message, c.id));
});

/** Suivi du message (F-TRV-41) : l'état ne publie rien, il sert à la file d'attente. */
routeur.post('/:id/etat', gestionnaireRequis, (req, res) => {
	const membre = exigerMembre(req);
	const c = obtenirContact(Number(req.params.id), membre);
	const donnees = valider(etatContactSchema, req.body);
	db.update(contact).set({ etat: donnees.etat }).where(eq(contact.id, c.id)).run();
	res.json(ok('Modification effectuée.', c.id));
});
