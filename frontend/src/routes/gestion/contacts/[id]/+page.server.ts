import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/contact';
import type { Ok } from '$lib/types';
import type { ContactDetail } from '$lib/types/contact';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	if (!/^\d+$/.test(event.params.id)) error(404, "Ce message n'existe pas.");
	const contact = await charger<ContactDetail>(event, `/contact/${event.params.id}`);
	return { contact };
};

export const actions: Actions = {
	/** Réponse enregistrée puis envoyée par e-mail (F-TRV-40, F-TRV-42). */
	repondre: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { reponse: 'texte' });
		const r = await soumettre<Ok>(event, `/contact/${event.params.id}/reponse`, { body: valeurs, valeurs, cle: 'reponse' });
		if (!r.ok) return r.echec;
		return { cle: 'reponse', succes: r.data.message };
	},
	/** Suivi : à traiter, traité, supprimé (F-TRV-41). */
	etat: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { etat: 'entier' });
		const r = await soumettre<Ok>(event, `/contact/${event.params.id}/etat`, { body: valeurs, valeurs, cle: 'etat' });
		if (!r.ok) return r.echec;
		return { cle: 'etat', succes: r.data.message };
	}
};
