import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut, lireFormulaire, soumettre } from '$lib/server/api';
import { dureeSaisie, filtreEntier } from '$lib/server/contact';
import type { Liste, Ok } from '$lib/types';
import type { ContactMessage } from '$lib/types/contact';

export const load: PageServerLoad = async (event) => {
	const membre = event.locals.membre;
	// Objet prérempli depuis un lien (« Devenir annonceur », « Signaler une arnaque »…)
	const objet = (event.url.searchParams.get('objet') ?? '').slice(0, 120);
	const page = filtreEntier(event.url, 'page') || '1';
	// Un membre retrouve ses messages et les réponses (F-TRV-39) ; les gestionnaires ont leur écran
	const mesMessages =
		membre && !membre.est_gestionnaire
			? await chargerOuDefaut<Liste<ContactMessage> | null>(event, '/contact', null, { page, taille: 20 })
			: null;
	return { objet, mesMessages };
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, {
			nom: 'texte',
			email: 'texte',
			telephone: 'texte',
			objet: 'texte',
			texte: 'texte',
			site_web: 'texte'
		});
		const r = await soumettre<Ok>(event, '/contact', {
			body: { ...valeurs, duree_saisie_ms: dureeSaisie(fd) },
			valeurs
		});
		if (!r.ok) return r.echec;
		return { succes: r.data.message };
	}
};
