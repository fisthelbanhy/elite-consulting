import type { Actions } from './$types';
import { lireFormulaire, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, { categorie: 'entier', nom: 'texte', pseudonyme: 'texte', telephone: 'texte' });
		const r = await soumettre<Ok>(event, '/auth/mot-de-passe-oublie', { body: valeurs, valeurs, jeton: null });
		if (!r.ok) return r.echec;
		return { succes: r.data.message };
	}
};
