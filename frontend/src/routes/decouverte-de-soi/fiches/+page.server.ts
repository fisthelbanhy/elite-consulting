import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, charger, exigerConnexion } from '$lib/server/api';
import type { Liste, Ok } from '$lib/types';
import type { FicheResume } from '$lib/types/decouverte';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre?.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const p = event.url.searchParams;
	const filtres = {
		q: p.get('q') ?? '',
		cloturee: p.get('cloturee') ?? '',
		diagnostic: p.get('diagnostic') ?? '',
		page: p.get('page') ?? '1'
	};
	const liste = await charger<Liste<FicheResume>>(event, '/decouverte', { ...filtres, taille: 50 });
	return { liste, filtres, supprime: p.has('supprime') };
};

export const actions: Actions = {
	supprimer: async (event) => {
		const id = String((await event.request.formData()).get('id') ?? '');
		try {
			await api<Ok>(event, `/decouverte/${id}`, { method: 'DELETE' });
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'liste', message: e.message, champs: e.champs });
			throw e;
		}
		return { cle: 'liste', succes: 'La fiche a été supprimée.' };
	}
};
