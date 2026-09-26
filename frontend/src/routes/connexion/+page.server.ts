import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lireFormulaire, soumettre } from '$lib/server/api';
import { ouvrirSession, suiteSure } from '$lib/server/session';
import type { MembreMoi } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.membre) redirect(303, suiteSure(url.searchParams.get('suite')));
	return { suite: url.searchParams.get('suite') ?? '' };
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, { identifiant: 'texte', mot_de_passe: 'texte' });
		const r = await soumettre<{ jeton: string; expire: string; membre: MembreMoi }>(event, '/auth/login', {
			body: valeurs,
			valeurs,
			jeton: null
		});
		if (!r.ok) return r.echec;
		ouvrirSession(event.cookies, r.data.jeton, r.data.expire);
		redirect(303, suiteSure(String(fd.get('suite') ?? ''), r.data.membre.est_gestionnaire ? '/gestion' : '/espace'));
	}
};
