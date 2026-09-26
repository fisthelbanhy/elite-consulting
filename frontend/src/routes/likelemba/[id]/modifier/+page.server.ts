import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion, soumettre } from '$lib/server/api';
import { lireGroupe } from '$lib/server/likelemba';
import type { Ok } from '$lib/types';
import type { GroupeDetail, MembreChoix } from '$lib/types/likelemba';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const groupe = await charger<GroupeDetail>(event, `/likelemba/${event.params.id}`);
	if (!groupe.peut_modifier) error(403, 'Seuls le responsable du likelemba et la frangine peuvent le modifier.');
	const membres = await chargerOuDefaut<MembreChoix[]>(event, '/likelemba/membres', []);
	// Garantit que le responsable actuel figure dans la liste
	if (groupe.responsable && !membres.some((m) => m.id === groupe.responsable!.id)) {
		membres.unshift({ id: groupe.responsable.id, pseudonyme: groupe.responsable.pseudonyme, nom: groupe.responsable.pseudonyme });
	}
	return { groupe, membres };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireGroupe(await event.request.formData());
		const r = await soumettre<Ok>(event, `/likelemba/${event.params.id}`, { method: 'PUT', body: valeurs, valeurs });
		if (!r.ok) return r.echec;
		redirect(303, `/likelemba/${event.params.id}?modifie=1`);
	}
};
