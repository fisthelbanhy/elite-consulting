import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { exigerEpargne } from '$lib/server/epargne';
import type { Ok } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	return { statut: await exigerEpargne(event) };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			type_fond: 'entier?',
			montant: 'entier',
			duree_mois: 'entier',
			motivation: 'texte',
			souscripteur_membre: 'texte',
			souscripteur_nom: 'texte'
		});
		const r = await soumettre<Ok>(event, '/epargne/fonds', { body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/epargne/dons-placements/${r.data.id}?enregistre=1`);
	}
};
