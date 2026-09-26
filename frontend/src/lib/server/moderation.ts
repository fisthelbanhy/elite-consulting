/**
 * Actions de formulaire communes à toutes les fiches : changement d'état (modération) et
 * suppression logique. Usage dans un +page.server.ts de détail :
 *   export const actions = { ...actionsModeration((p) => `/emplois/${p.id}`, '/emplois'), ... };
 */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { api, ApiError, soumettre } from './api';
import { fail } from '@sveltejs/kit';
import type { Ok } from '$lib/types';

type Params = Record<string, string>;

export function actionsModeration(chemin: (p: Params) => string, apresSuppression: string) {
	return {
		etat: async (event: RequestEvent) => {
			const fd = await event.request.formData();
			const etat = Number(fd.get('etat'));
			const r = await soumettre<Ok>(event, `${chemin(event.params as Params)}/etat`, { body: { etat }, cle: 'moderation' });
			if (!r.ok) return r.echec;
			return { cle: 'moderation', succes: r.data.message };
		},
		supprimer: async (event: RequestEvent) => {
			try {
				await api<Ok>(event, chemin(event.params as Params), { method: 'DELETE' });
			} catch (e) {
				if (e instanceof ApiError) return fail(e.statut, { cle: 'moderation', message: e.message, champs: e.champs });
				throw e;
			}
			redirect(303, `${apresSuppression}?supprime=1`);
		}
	};
}
