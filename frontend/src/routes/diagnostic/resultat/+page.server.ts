import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, soumettre } from '$lib/server/api';
import { effacerReponses, lireReponses, premiereManquante, questionsDiagnostic } from '$lib/server/diagnostic';
import type { Ok } from '$lib/types';
import type { Restitution } from '$lib/types/decouverte';

const SUITE = '/diagnostic/enregistrer';

export const load: PageServerLoad = async (event) => {
	const reponses = lireReponses(event.cookies);
	let restitution: Restitution;
	try {
		const manquante = premiereManquante(await questionsDiagnostic(event), reponses);
		if (manquante !== null) redirect(303, `/diagnostic?etape=${manquante}`);
		restitution = await api<Restitution>(event, '/decouverte/diagnostic/restitution', { body: reponses, jeton: null });
	} catch (e) {
		if (e instanceof ApiError) {
			if (e.statut === 400) redirect(303, '/diagnostic');
			error(e.statut, e.message);
		}
		throw e;
	}
	return { restitution, erreur: event.url.searchParams.has('erreur') };
};

export const actions: Actions = {
	/** « Recevoir mon plan d'action » : membre connecté → enregistrement ; sinon inscription. */
	enregistrer: async (event) => {
		if (!event.locals.membre) redirect(303, `/inscription?suite=${encodeURIComponent(SUITE)}`);
		const r = await soumettre<Ok>(event, '/decouverte/diagnostic', { body: lireReponses(event.cookies), cle: 'plan' });
		if (!r.ok) return r.echec;
		effacerReponses(event.cookies);
		redirect(303, '/diagnostic/merci');
	},
	recommencer: async (event) => {
		effacerReponses(event.cookies);
		redirect(303, '/diagnostic');
	}
};
