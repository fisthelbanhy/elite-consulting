import type { LayoutServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { enums, parametres } from '$lib/server/referentiels';
import type { Enums, Parametres } from '$lib/types';

const PARAMETRES_DEFAUT = {
	nom_site: 'La Frangine',
	adresse: 'Avenue Nelson Mandela, Brazzaville',
	telephone_1: '',
	telephone_2: '',
	email: '',
	whatsapp: '',
	texte_aide: '',
	montant_minimum_placement: 0,
	montant_minimum_course: 0,
	commission_course: 0,
	conditions_course: '',
	module_epargne_actif: true,
	module_sante_actif: true
} as Parametres;

export interface Compteurs {
	panier: number;
	messages_non_lus: number;
	frangine_en_ligne: boolean;
}

export const load: LayoutServerLoad = async (event) => {
	const [p, e, compteurs] = await Promise.all([
		parametres(event).catch(() => PARAMETRES_DEFAUT),
		enums(event).catch(() => ({}) as Enums),
		event.locals.membre
			? chargerOuDefaut<Compteurs | null>(event, '/espace/compteurs', null)
			: Promise.resolve(null)
	]);
	return { membre: event.locals.membre, parametres: p, enums: e, compteurs };
};
