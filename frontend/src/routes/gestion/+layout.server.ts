import type { LayoutServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/gestion';
import type { Compteurs } from '$lib/types/gestion';

const AUCUN: Compteurs = {
	nouveaux_membres: 0,
	paiements_en_attente: 0,
	fiches_en_attente: 0,
	reinitialisations_en_attente: 0,
	messages_non_lus: 0,
	contacts_a_traiter: 0
};

/** Tout `/gestion` exige un gestionnaire (F-ADM-39) ; l'API revérifie chaque appel. */
export const load: LayoutServerLoad = async (event) => {
	const gestionnaire = exigerGestionnaire(event);
	const compteursGestion = await chargerOuDefaut<Compteurs>(event, '/gestion/compteurs', AUCUN);
	return { gestionnaire, compteursGestion };
};
