import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { exigerEpargne } from '$lib/server/epargne';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { FondDetail } from '$lib/types/epargne';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const statut = await exigerEpargne(event);
	const fond = await charger<FondDetail>(event, `/epargne/fonds/${event.params.id}`);
	const p = event.url.searchParams;
	return { fond, statut, enregistre: p.has('enregistre'), paye: p.has('paye') };
};

export const actions: Actions = {
	etat: actionsModeration((p) => `/epargne/fonds/${p.id}`, '/epargne/dons-placements').etat,
	modifier: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { motivation: 'texte', montant: 'entier', duree_mois: 'entier' });
		const r = await soumettre<Ok>(event, `/epargne/fonds/${event.params.id}`, { method: 'PUT', body: valeurs, valeurs, cle: 'modifier' });
		if (!r.ok) return r.echec;
		return { cle: 'modifier', succes: r.data.message };
	}
};
