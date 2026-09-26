/**
 * Fil « Écrire à la frangine » (dialogue contextuel, ADR-0007 T9) : chargement et action,
 * réutilisés par chaque sous-page de trésorerie.
 *   load    : `dialogue: await chargerDialogue(event, 1)`
 *   actions : `{ dialogue: actionDialogue }` → formulaire `?/dialogue`
 * Paramètres d'URL : `fil` (gestionnaire : membre dont on lit le fil), `dq` (recherche).
 */
import type { RequestEvent } from '@sveltejs/kit';
import { chargerOuDefaut, lireFormulaire, soumettre } from './api';
import type { Liste, Ok } from '$lib/types';
import type { Conversation, DonneesDialogue, MessageDialogue } from '$lib/types/dialogues';

const VIDE: Liste<MessageDialogue> = { items: [], total: 0, page: 1, taille: 50 };

export async function chargerDialogue(event: RequestEvent, type: number): Promise<DonneesDialogue | null> {
	const membre = event.locals.membre;
	if (!membre) return null; // un visiteur ne voit rien (F-TRV-58)
	const q = event.url.searchParams;
	const fil = Number(q.get('fil')) || null;
	const recherche = q.get('dq') ?? '';
	const gestionnaire = membre.est_gestionnaire;
	const [messages, conversations] = await Promise.all([
		chargerOuDefaut<Liste<MessageDialogue>>(event, '/dialogues', VIDE, {
			type,
			q: recherche,
			membre_id: gestionnaire ? fil : null,
			taille: 50
		}),
		gestionnaire ? chargerOuDefaut<Conversation[]>(event, '/dialogues/conversations', [], { type }) : Promise.resolve([])
	]);
	return { type, messages, conversations, fil, recherche, gestionnaire };
}

export async function actionDialogue(event: RequestEvent) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, { type_dialogue: 'entier', texte: 'texte', destinataire_id: 'entier?' });
	const r = await soumettre<Ok>(event, '/dialogues', { body: valeurs, valeurs, cle: 'dialogue' });
	if (!r.ok) return r.echec;
	return { cle: 'dialogue', succes: r.data.message };
}
