/** Messagerie privée membre ↔ la frangine : action d'envoi commune (membre et gestion). */
import type { RequestEvent } from '@sveltejs/kit';
import { lireFormulaire, soumettre } from './api';
import type { Ok } from '$lib/types';

/**
 * Action `?/envoyer` : poste le texte vers `chemin` (`/messages` pour un membre,
 * `/messages/fils/{id}` pour une réponse de la frangine). Le formulaire est vidé après succès.
 */
export function actionEnvoyer(chemin: (event: RequestEvent) => string) {
	return async (event: RequestEvent) => {
		const valeurs = lireFormulaire(await event.request.formData(), { texte: 'texte' });
		const r = await soumettre<Ok>(event, chemin(event), { body: valeurs, valeurs, cle: 'message' });
		if (!r.ok) return r.echec;
		return { cle: 'message', succes: r.data.message };
	};
}
