import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { exigerGestionnaire, filtreEntier } from '$lib/server/contact';
import type { Liste, Option } from '$lib/types';
import type { ContactMessage } from '$lib/types/contact';

export const load: PageServerLoad = async (event) => {
	exigerGestionnaire(event);
	const filtres = {
		q: event.url.searchParams.get('q') ?? '',
		membre_id: filtreEntier(event.url, 'membre_id'),
		etat: filtreEntier(event.url, 'etat'),
		page: filtreEntier(event.url, 'page') || '1'
	};
	// Tous les messages, plus récents d'abord ; 50 par page en gestion (ADR-0007 T2)
	const [liste, expediteurs, compteurs] = await Promise.all([
		charger<Liste<ContactMessage>>(event, '/contact', { ...filtres, taille: 50 }),
		chargerOuDefaut<Option[]>(event, '/contact/expediteurs', []),
		chargerOuDefaut(event, '/contact/compteurs', { a_traiter: 0 })
	]);
	return { liste, expediteurs, compteurs, filtres };
};
