import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { invaliderReferentiels } from '$lib/server/referentiels';
import type { Ok } from '$lib/types';
import type { ParametresGestion } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => ({
	reglages: await charger<ParametresGestion>(event, '/gestion/parametres')
});

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			nom_site: 'texte',
			adresse: 'texte',
			telephone_1: 'texte',
			telephone_2: 'texte',
			email: 'texte',
			whatsapp: 'texte',
			texte_aide: 'texte',
			montant_minimum_placement: 'entier',
			montant_minimum_course: 'entier',
			commission_course: 'entier',
			conditions_course: 'texte',
			description_section_1: 'texte',
			description_section_2: 'texte',
			description_section_3: 'texte',
			description_section_4: 'texte',
			description_section_5: 'texte',
			description_section_6: 'texte',
			description_section_7: 'texte',
			module_epargne_actif: 'bool',
			module_sante_actif: 'bool'
		});
		const r = await soumettre<Ok>(event, '/gestion/parametres', { method: 'PUT', body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		// Le nom du site, les numéros et les interrupteurs sont mis en cache côté serveur
		invaliderReferentiels();
		return { succes: r.data.message };
	}
};
