/**
 * Cotisation (F-S4-40 à F-S4-42) : l'adhérent voit ses paiements antérieurs puis part vers la page de
 * paiement générique `/paiement/5?objet=<adhésion>` (ADR-0007 S4b). Le responsable ou la frangine
 * choisissent d'abord l'adhérent pour qui ils encaissent.
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import type { AdhesionDetail, GroupeDetail } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const groupe = await charger<GroupeDetail>(event, `/likelemba/${event.params.id}`);
	const choisie = Number(event.url.searchParams.get('adhesion')) || groupe.mon_adhesion_id;
	if (!choisie && !groupe.peut_gerer) error(403, "Vous n'êtes pas membre de ce likelemba : rejoignez-le d'abord.");
	const adhesion = choisie ? await charger<AdhesionDetail>(event, `/likelemba/adhesions/${choisie}`) : null;
	if (adhesion && adhesion.groupe.id !== groupe.id) error(404, "Cette adhésion n'appartient pas à ce likelemba.");
	return { groupe, adhesion, paye: event.url.searchParams.has('paye') };
};
