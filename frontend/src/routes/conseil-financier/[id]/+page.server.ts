import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import { enregistrerSujet } from '$lib/server/conseil-financier';
import type { Ok } from '$lib/types';
import type { SujetDetail } from '$lib/types/conseil-financier';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const q = event.url.searchParams;
	const sujet = await charger<SujetDetail>(event, `/conseil-financier/${event.params.id}`);
	return { sujet, enregistre: q.has('enregistre'), modifie: q.has('modifie'), modifier: q.has('modifier') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/conseil-financier/${p.id}`, '/conseil-financier'),
	modifier: (event) => enregistrerSujet(event, event.params.id),
	repondre: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { texte: 'texte' });
		const r = await soumettre<Ok>(event, `/conseil-financier/${event.params.id}/reponses`, { body: valeurs, valeurs, cle: 'reponse' });
		if (!r.ok) return r.echec;
		return { cle: 'reponse', succes: r.data.message };
	},
	cloturer: async (event) => {
		const r = await soumettre<Ok>(event, `/conseil-financier/${event.params.id}/cloture`, { cle: 'cloture' });
		if (!r.ok) return r.echec;
		return { cle: 'cloture', succes: r.data.message };
	},
	modifierReponse: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, { texte: 'texte' });
		const id = Number(fd.get('reponse_id'));
		const r = await soumettre<Ok>(event, `/conseil-financier/${id}`, { method: 'PUT', body: { objet: '', ...valeurs }, valeurs, cle: `reponse-${id}` });
		if (!r.ok) return r.echec;
		return { cle: `reponse-${id}`, succes: r.data.message };
	},
	supprimerReponse: async (event) => {
		const id = Number((await event.request.formData()).get('reponse_id'));
		try {
			const r = await api<Ok>(event, `/conseil-financier/${id}`, { method: 'DELETE' });
			return { cle: 'reponse', succes: r.message };
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'reponse', message: e.message, champs: e.champs });
			throw e;
		}
	}
};
