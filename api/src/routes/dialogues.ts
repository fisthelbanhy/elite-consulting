/**
 * Dialogue contextuel « Écrire à la frangine » (portage de `app/routers/dialogues.py` ;
 * legacy incl-dialogue.php, table `dialogue`).
 * Inventaire : E-TRV-11, S7-14, F-TRV-56 à F-TRV-58, F-S7-37 à F-S7-40 ; ADR-0007 T9.
 *
 * Un fil par rubrique (`type_dialogue` : 1 Placement, 2 Opération bancaire, 3 Demande de crédit,
 * 4 Contentieux ; 0 accueil). Le membre voit ses messages et les réponses qui lui sont adressées ;
 * le gestionnaire voit les messages adressés à la frangine (`destinataire_id` NULL) et répond au
 * bon membre (correctif du « membre n° 1 ») ; un visiteur ne voit rien (correctif).
 */
import { and, asc, desc, eq, gte, inArray, or, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { exigerMembre, gestionnaireRequis, membreRequis, pagination } from '../deps.js';
import { Etat, RubriqueTresorerie, TypeMembre, libelle } from '../enums.js';
import { erreur } from '../erreurs.js';
import { dialogue } from '../schema/contenu.js';
import { membre as tableMembre, type Membre } from '../schema/membres.js';
import { entierRequis, ok, valider, type Auteur } from '../schemas/commun.js';
import { auteursDe } from '../services/contacts.js';
import { paginer, recherche } from '../services/fiches.js';
import { notifier } from '../services/messages.js';

export const routeur = Router();
export const prefixe = '/dialogues';

type Dialogue = typeof dialogue.$inferSelect;

const LIENS: Record<number, string> = {
	[RubriqueTresorerie.PLACEMENT]: '/tresorerie/placements',
	[RubriqueTresorerie.OPERATION]: '/tresorerie/operations',
	[RubriqueTresorerie.CREDIT]: '/tresorerie/credits',
	[RubriqueTresorerie.CONTENTIEUX]: '/tresorerie/contentieux'
};

const dialogueEntreeSchema = z.object({
	// 1..4 = sous-rubriques de trésorerie (ADR-0007 T9) ; 0 = accueil.
	type_dialogue: z.coerce.number().int().min(0).max(4),
	texte: z.string().max(2000).default(''),
	// Obligatoire pour une réponse de gestionnaire ; ignoré pour un membre (message à la frangine).
	destinataire_id: z.coerce.number().int().nullable().optional()
});

function nomRubrique(typeDialogue: number): string {
	return libelle('RubriqueTresorerie', typeDialogue) || 'Accueil';
}

/**
 * Type de fil demandé (`?type=2`), obligatoire et borné de 0 à 4 comme l'ancien backend.
 *
 * Il passe par `valider()` et non par une erreur métier : le paramètre était déclaré
 * `Annotated[int, Query(ge=0, le=4)]`, donc une valeur absente ou hors bornes répondait 422 avec
 * le message sous le champ `type`, et c'est ce que le frontend attend.
 */
const typeSchema = z.object({ type: entierRequis(0, 4) });

function typeDemande(query: unknown): number {
	return valider(typeSchema, query).type;
}

function vueDialogue(
	d: Dialogue,
	lecteur: Membre,
	auteurs: Map<number, Auteur>,
	gestionnaires: Set<number>
) {
	return {
		id: d.id,
		type_dialogue: d.type_dialogue,
		texte: d.texte,
		date_message: d.date_message,
		auteur: auteurs.get(d.auteur_id) ?? null,
		destinataire: d.destinataire_id !== null ? (auteurs.get(d.destinataire_id) ?? null) : null,
		de_moi: d.auteur_id === lecteur.id,
		// Écrit par un gestionnaire.
		de_la_frangine: gestionnaires.has(d.auteur_id),
		// Adressé à la frangine (destinataire NULL).
		a_la_frangine: d.destinataire_id === null
	};
}

/** Identifiants des membres qui sont gestionnaires, parmi ceux cités. */
function gestionnairesParmi(ids: number[]): Set<number> {
	const recherches = [...new Set(ids)];
	if (recherches.length === 0) return new Set();
	const lignes = db
		.select({ id: tableMembre.id })
		.from(tableMembre)
		.where(
			and(inArray(tableMembre.id, recherches), eq(tableMembre.type_compte, TypeMembre.GESTIONNAIRE))
		)
		.all();
	return new Set(lignes.map((m) => m.id));
}

/** Messages du fil, du plus ancien au plus récent ; la page 1 contient les plus récents. */
routeur.get('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const page = pagination(req);
	const type = typeDemande(req.query);

	const conditions: (SQL | undefined)[] = [
		eq(dialogue.type_dialogue, type),
		eq(dialogue.etat, Etat.AUTORISE)
	];

	if (membre.type_compte === TypeMembre.GESTIONNAIRE) {
		const membreId = Number(req.query.membre_id);
		if (Number.isFinite(membreId) && membreId > 0) {
			const id = Math.trunc(membreId);
			conditions.push(or(eq(dialogue.auteur_id, id), eq(dialogue.destinataire_id, id)));
		}
	} else {
		conditions.push(or(eq(dialogue.auteur_id, membre.id), eq(dialogue.destinataire_id, membre.id)));
	}
	conditions.push(recherche(typeof req.query.q === 'string' ? req.query.q : null, dialogue.texte));

	const requete = db
		.select()
		.from(dialogue)
		.where(and(...conditions.filter(Boolean)))
		.orderBy(desc(dialogue.date_message), desc(dialogue.id))
		.$dynamic();

	const liste = paginer<Dialogue>(requete, page);
	// Renvoyés du plus ancien au plus récent à l'intérieur de la page.
	const items = [...liste.items].reverse();
	const ids = items.flatMap((d) => [d.auteur_id, d.destinataire_id]);
	const auteurs = auteursDe(ids);
	const gestionnaires = gestionnairesParmi(items.map((d) => d.auteur_id));

	res.json({
		items: items.map((d) => vueDialogue(d, membre, auteurs, gestionnaires)),
		total: liste.total,
		page: liste.page,
		taille: liste.taille
	});
});

/**
 * Un fil par membre (interlocuteur de la frangine), le plus récent d'abord ; « en attente »
 * quand le dernier message vient du membre.
 */
routeur.get('/conversations', gestionnaireRequis, (req, res) => {
	const type = typeDemande(req.query);
	const messages = db
		.select()
		.from(dialogue)
		.where(and(eq(dialogue.type_dialogue, type), eq(dialogue.etat, Etat.AUTORISE)))
		.orderBy(asc(dialogue.date_message), asc(dialogue.id))
		.all();

	const auteurs = auteursDe(messages.flatMap((d) => [d.auteur_id, d.destinataire_id]));
	const gestionnaires = gestionnairesParmi(messages.map((d) => d.auteur_id));

	const fils = new Map<number, { membre: Auteur; nombre: number; dernier: Dialogue }>();
	for (const d of messages) {
		// Interlocuteur : l'auteur d'un message à la frangine, ou le destinataire d'une réponse.
		const interlocuteurId = d.destinataire_id === null ? d.auteur_id : d.destinataire_id;
		const interlocuteur = auteurs.get(interlocuteurId);
		if (!interlocuteur) continue;
		// Un message d'un gestionnaire adressé à la frangine n'ouvre pas de fil.
		if (d.destinataire_id === null && gestionnaires.has(interlocuteurId)) continue;

		const fil = fils.get(interlocuteurId) ?? {
			membre: interlocuteur,
			nombre: 0,
			dernier: d
		};
		fil.nombre += 1;
		fil.dernier = d;
		fils.set(interlocuteurId, fil);
	}

	const resultat = [...fils.values()].map((f) => ({
		membre: f.membre,
		nombre: f.nombre,
		dernier_message: f.dernier.texte.slice(0, 160),
		date_dernier: f.dernier.date_message,
		// Le dernier message vient du membre : une réponse est attendue.
		en_attente: f.dernier.destinataire_id === null
	}));

	resultat.sort((a, b) => {
		if (a.en_attente !== b.en_attente) return a.en_attente ? -1 : 1;
		return (b.date_dernier?.getTime() ?? 0) - (a.date_dernier?.getTime() ?? 0);
	});
	res.json(resultat);
});

routeur.post('/', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(dialogueEntreeSchema, req.body);
	const texte = donnees.texte.trim();

	let destinataire: Membre | null = null;
	if (membre.type_compte === TypeMembre.GESTIONNAIRE) {
		destinataire = donnees.destinataire_id
			? (db.select().from(tableMembre).where(eq(tableMembre.id, donnees.destinataire_id)).get() ??
				null)
			: null;
		if (!destinataire || destinataire.etat === Etat.SUPPRIME) {
			throw erreur('Veuillez indiquer le destinataire du message.', {
				destinataire_id: 'Veuillez indiquer le destinataire du message.'
			});
		}
	}
	if (texte.length < 2) {
		throw erreur('Votre message doit avoir 2 caractères minimum.', {
			texte: 'Votre message doit avoir 2 caractères minimum.'
		});
	}

	// Protection contre le double envoi (même texte, même fil, moins de 2 minutes).
	const recent = db
		.select({ id: dialogue.id })
		.from(dialogue)
		.where(
			and(
				eq(dialogue.auteur_id, membre.id),
				eq(dialogue.type_dialogue, donnees.type_dialogue),
				eq(dialogue.texte, texte),
				gte(dialogue.date_message, new Date(Date.now() - 2 * 60 * 1000))
			)
		)
		.limit(1)
		.get();
	if (recent)
		throw erreur('Ce message est déjà envoyé.', {
			texte: 'Ce message est déjà envoyé.'
		});

	const cree = db.transaction(() => {
		const d = db
			.insert(dialogue)
			.values({
				auteur_id: membre.id,
				destinataire_id: destinataire?.id ?? null,
				type_dialogue: donnees.type_dialogue,
				texte,
				date_message: new Date(),
				etat: Etat.AUTORISE
			})
			.returning({ id: dialogue.id })
			.get();

		// Le membre est prévenu dans sa messagerie qu'un conseiller lui a répondu.
		if (destinataire && destinataire.id !== membre.id) {
			const lien = LIENS[donnees.type_dialogue] ?? '/';
			notifier(
				destinataire.id,
				`La frangine vous a répondu dans « ${nomRubrique(donnees.type_dialogue)} ». ` +
					`Retrouvez la conversation sur ${lien}#dialogue`
			);
		}
		return d;
	});

	res
		.status(201)
		.json(ok(destinataire ? 'Réponse envoyée.' : 'Votre message est envoyé.', cree!.id));
});
