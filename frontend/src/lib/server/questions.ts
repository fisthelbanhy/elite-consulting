/** Forum « Questions & conseils » : enregistrement d'un sujet et actions sur les réponses. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { api, ApiError, lireFormulaire, soumettre } from './api';
import type { Ok } from '$lib/types';

/** Création (POST) ou modification (PUT) d'un sujet, puis retour sur le fil. */
export async function enregistrerSujet(event: RequestEvent, id?: string) {
	const valeurs = lireFormulaire(await event.request.formData(), {
		confidentialite: 'entier?',
		objet: 'texte',
		texte: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/questions/${id}` : '/questions', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	redirect(303, `/questions/${r.data.id}?${id ? 'modifie' : 'enregistre'}=1`);
}

/** Actions d'une réponse (formulaires de la page du fil), identifiée par le champ caché `rid`. */
export const actionsReponses = {
	repondre: async (event: RequestEvent) => {
		const valeurs = lireFormulaire(await event.request.formData(), { texte: 'texte' });
		const r = await soumettre<Ok>(event, `/questions/${event.params.id}/reponses`, { body: valeurs, valeurs, cle: 'reponse' });
		if (!r.ok) return r.echec;
		return { cle: 'reponse', succes: 'Votre réponse est publiée. Merci !' };
	},
	modifierReponse: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		const rid = String(fd.get('rid') ?? '');
		const cle = `reponse-${rid}`;
		const valeurs = lireFormulaire(fd, { texte: 'texte' });
		const r = await soumettre<Ok>(event, `/questions/reponses/${rid}`, { method: 'PUT', body: valeurs, valeurs, cle });
		if (!r.ok) return r.echec;
		return { cle, succes: r.data.message };
	},
	etatReponse: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		const rid = String(fd.get('rid') ?? '');
		const cle = `etat-reponse-${rid}`;
		const r = await soumettre<Ok>(event, `/questions/reponses/${rid}/etat`, { body: { etat: Number(fd.get('etat')) }, cle });
		if (!r.ok) return r.echec;
		return { cle, succes: r.data.message };
	},
	supprimerReponse: async (event: RequestEvent) => {
		const rid = String((await event.request.formData()).get('rid') ?? '');
		try {
			await api<Ok>(event, `/questions/reponses/${rid}`, { method: 'DELETE' });
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: `reponse-${rid}`, message: e.message, champs: e.champs });
			throw e;
		}
		return { cle: 'reponse', succes: 'La réponse a été supprimée.' };
	}
};
