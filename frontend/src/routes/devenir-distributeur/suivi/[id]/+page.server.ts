import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { SouscriptionDetail } from '$lib/types/distributeur';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const souscription = await charger<SouscriptionDetail>(event, `/distributeur/souscriptions/${event.params.id}`);
	return { souscription };
};

export const actions: Actions = {
	etat: async (event) => {
		const fd = await event.request.formData();
		const r = await soumettre<Ok>(event, `/distributeur/souscriptions/${event.params.id}/etat`, {
			body: { etat: Number(fd.get('etat')) },
			cle: 'moderation'
		});
		if (!r.ok) return r.echec;
		return { cle: 'moderation', succes: r.data.message };
	}
};
