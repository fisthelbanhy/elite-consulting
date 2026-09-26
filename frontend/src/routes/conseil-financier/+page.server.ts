import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { CompteursConseil, SujetResume } from '$lib/types/conseil-financier';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const filtres = {
		rubrique: q.get('rubrique') === '2' ? '2' : '1',
		q: q.get('q') ?? '',
		etat: q.get('etat') ?? '',
		page: q.get('page') ?? '1'
	};
	// Visiteur : page de présentation, les échanges sont réservés aux membres (F-S7-02)
	if (!event.locals.membre) return { filtres, liste: null, compteurs: null, supprime: false };
	const [liste, compteurs] = await Promise.all([
		charger<Liste<SujetResume>>(event, '/conseil-financier', { ...filtres, taille: 20 }),
		chargerOuDefaut<CompteursConseil | null>(event, '/conseil-financier/compteurs', null)
	]);
	return { filtres, liste, compteurs, supprime: q.has('supprime') };
};
