import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { ApportDetail } from '$lib/types/projets';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const apport = await charger<ApportDetail>(event, `/projets/apports/${event.params.id}`);
	return { apport, paye: event.url.searchParams.has('paye') };
};

export const actions: Actions = {
	valider: async (event) => {
		const r = await soumettre<Ok>(event, `/projets/apports/${event.params.id}/valider`, { cle: 'gestion' });
		if (!r.ok) return r.echec;
		return { cle: 'gestion', succes: r.data.message };
	},
	annuler: async (event) => {
		const r = await soumettre<Ok>(event, `/projets/apports/${event.params.id}/annuler`, { cle: 'gestion' });
		if (!r.ok) return r.echec;
		return { cle: 'gestion', succes: r.data.message };
	},
	versement: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			montant: 'entier',
			date_versement: 'date?',
			observation_mediateur: 'texte'
		});
		const r = await soumettre<Ok>(event, `/projets/apports/${event.params.id}/versements`, { body: valeurs, valeurs, cle: 'versement' });
		if (!r.ok) return r.echec;
		return { cle: 'versement', succes: r.data.message };
	}
};
