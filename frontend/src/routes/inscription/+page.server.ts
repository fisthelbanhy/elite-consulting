import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lireFormulaire, soumettre } from '$lib/server/api';
import { villes } from '$lib/server/referentiels';
import { ouvrirSession, suiteSure } from '$lib/server/session';
import type { MembreMoi } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.membre) redirect(303, '/espace');
	return {
		villes: await villes(event),
		suite: event.url.searchParams.get('suite') ?? '',
		categorie: event.url.searchParams.get('categorie') ?? '1'
	};
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, {
			categorie: 'entier',
			nom: 'texte',
			telephone: 'texte',
			ville_id: 'entier?',
			email: 'texte',
			mot_de_passe: 'texte',
			identifiant: 'texte',
			pseudonyme: 'texte',
			accepte_conditions: 'bool',
			site_web: 'texte'
		});
		// Durée de remplissage (anti-robot) : horodatage posé par le navigateur au chargement
		const debut = Number(fd.get('debut_saisie') || 0);
		const duree_saisie_ms = debut ? Math.max(1, Date.now() - debut) : 0;
		// Un seul champ mot de passe avec bouton « Afficher » : il sert aussi de confirmation
		const corps = { ...valeurs, confirmation: valeurs.mot_de_passe, duree_saisie_ms };
		const r = await soumettre<{ jeton: string; expire: string; membre: MembreMoi }>(event, '/auth/inscription', {
			body: corps,
			valeurs,
			jeton: null
		});
		if (!r.ok) return r.echec;
		ouvrirSession(event.cookies, r.data.jeton, r.data.expire);
		redirect(303, suiteSure(String(fd.get('suite') ?? ''), '/espace?bienvenue=1'));
	}
};
