import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, soumettre } from '$lib/server/api';
import { exigerGestionnaire, filtreEntier } from '$lib/server/contact';
import type { Liste, Ok } from '$lib/types';
import type { Suggestion } from '$lib/types/contact';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	const filtres = {
		module: filtreEntier(event.url, 'module'), // « 0 » (Accueil) est une valeur valide
		q: event.url.searchParams.get('q') ?? '',
		etat: filtreEntier(event.url, 'etat'),
		page: filtreEntier(event.url, 'page') || '1'
	};
	const [liste, compteurs] = await Promise.all([
		charger<Liste<Suggestion>>(event, '/suggestions', { ...filtres, taille: 50 }),
		chargerOuDefaut(event, '/suggestions/compteurs', { a_lire: 0, total: 0 })
	]);
	return { liste, compteurs, filtres };
};

export const actions: Actions = {
	etat: async (event) => {
		const fd = await event.request.formData();
		const id = String(fd.get('id') ?? '');
		const etat = Number(fd.get('etat'));
		if (!/^\d+$/.test(id)) return fail(400, { cle: `etat-${id}`, message: 'Suggestion inconnue.', champs: {} });
		const r = await soumettre<Ok>(event, `/suggestions/${id}/etat`, { body: { etat }, cle: `etat-${id}` });
		if (!r.ok) return r.echec;
		return { cle: `etat-${id}`, succes: r.data.message };
	}
};
