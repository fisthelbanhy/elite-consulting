import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charger, exigerConnexion } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { SouscriptionResume } from '$lib/types/distributeur';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const u = event.url.searchParams;
	const filtres = {
		q: u.get('q') ?? '',
		etat: u.get('etat') ?? '',
		mode: u.get('mode') ?? '',
		envoyees: u.get('envoyees') ?? '',
		page: u.get('page') ?? '1'
	};
	const liste = await charger<Liste<SouscriptionResume>>(event, '/distributeur/souscriptions', { ...filtres, taille: 50 });
	return { liste, filtres };
};
