import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { ProjetDetail } from '$lib/types/projets';

export const load: PageServerLoad = async (event) => {
	const projet = await charger<ProjetDetail>(event, `/projets/${event.params.id}`);
	return { projet, enregistre: event.url.searchParams.has('enregistre') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/projets/${p.id}`, '/projets'),
	apport: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			type_apport: 'entier?',
			montant_promis: 'entier',
			echeance_mois: 'entier',
			remarque: 'texte'
		});
		const r = await soumettre<Ok>(event, `/projets/${event.params.id}/apports`, { body: valeurs, valeurs, cle: 'apport' });
		if (!r.ok) return r.echec;
		return { cle: 'apport', succes: r.data.message, reference: r.data.reference, id: r.data.id };
	},
	evaluation: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { observation_gestionnaire: 'texte', appreciation: 'entier' });
		const r = await soumettre<Ok>(event, `/projets/${event.params.id}/evaluation`, { body: valeurs, valeurs, cle: 'evaluation' });
		if (!r.ok) return r.echec;
		return { cle: 'evaluation', succes: 'Avis de la frangine enregistré.' };
	}
};
