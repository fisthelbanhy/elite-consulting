import type { Actions } from './$types';
import { lireFormulaire, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const { nouveau } = lireFormulaire(fd, { nouveau: 'texte' });
		const r = await soumettre<Ok>(event, '/auth/reinitialiser', {
			body: { jeton: event.params.jeton, nouveau, confirmation: nouveau },
			jeton: null
		});
		if (!r.ok) return r.echec;
		return { succes: r.data.message };
	}
};
