import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { CHAMPS_MEMBRE } from '$lib/server/gestion';
import { secteurs, villes } from '$lib/server/referentiels';
import type { Ok } from '$lib/types';
import type { MembreDetail } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => {
	const membre = await charger<MembreDetail>(event, `/gestion/membres/${event.params.id}`);
	if (!membre.peut_modifier) error(403, "Modifier cette fiche nécessite le droit d'activation (et d'attribution pour un gestionnaire).");
	const [vils, sects] = await Promise.all([villes(event), secteurs(event)]);
	return { membre, villes: vils, secteurs: sects };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), CHAMPS_MEMBRE);
		const r = await soumettre<Ok>(event, `/gestion/membres/${event.params.id}`, { method: 'PUT', body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/gestion/membres/${event.params.id}?enregistre=1`);
	}
};
