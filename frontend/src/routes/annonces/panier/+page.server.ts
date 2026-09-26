import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, charger, exigerConnexion, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { Panier } from '$lib/types/annonces';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const panier = await charger<Panier>(event, '/annonces/panier');
	return { panier, paye: event.url.searchParams.has('paye') };
};

export const actions: Actions = {
	quantite: async (event) => {
		const fd = await event.request.formData();
		const ligne = String(fd.get('ligne') ?? '');
		const quantite = Number(fd.get('quantite') ?? 0);
		const r = await soumettre<Ok>(event, `/annonces/panier/${ligne}`, { method: 'PUT', body: { quantite }, cle: 'panier' });
		if (!r.ok) return r.echec;
		return { cle: 'panier', succes: r.data.message };
	},
	retirer: async (event) => {
		const fd = await event.request.formData();
		try {
			const r = await api<Ok>(event, `/annonces/panier/${String(fd.get('ligne') ?? '')}`, { method: 'DELETE' });
			return { cle: 'panier', succes: r.message };
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'panier', message: e.message, champs: e.champs });
			throw e;
		}
	}
};
