import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import { cloturerFiche, enregistrerFiche } from '$lib/server/decouverte';
import { ETAPES_FICHE } from '$lib/components/decouverte/questions';
import type { FicheDetail } from '$lib/types/decouverte';

const BASE = '/decouverte-de-soi';

export const load: PageServerLoad = async (event) => {
	const membre = event.locals.membre;
	const q = event.url.searchParams;
	// Visiteur : présentation seulement, aucune fiche (F-S1-17)
	if (!membre) return { fiche: null, visiteur: true, etape: 1, enregistre: false };
	// Les gestionnaires suivent les fiches des membres (ils n'en créent pas)
	if (membre.est_gestionnaire) redirect(303, `${BASE}/fiches`);
	const fiche = await charger<FicheDetail | null>(event, '/decouverte/moi');
	const etape = Math.min(Math.max(Number(q.get('etape')) || 1, 1), ETAPES_FICHE.length);
	return { fiche, visiteur: false, etape, enregistre: q.has('enregistre') };
};

async function maFiche(event: RequestEvent) {
	exigerConnexion(event);
	return charger<FicheDetail | null>(event, '/decouverte/moi');
}

export const actions: Actions = {
	enregistrer: async (event) => enregistrerFiche(event, (await maFiche(event))?.id, BASE),
	cloture: async (event) => cloturerFiche(event, (await maFiche(event))?.id)
};
