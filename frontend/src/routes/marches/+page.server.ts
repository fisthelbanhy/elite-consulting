import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { CompteursMarches, MarcheResume, ProjetResume } from '$lib/types/marches';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	const onglet = q.get('onglet') === 'projets' ? 'projets' : 'marches';
	const filtres = {
		q: q.get('q') ?? '',
		type: q.get('type') ?? '',
		ouverts: q.get('ouverts') === '1' ? '1' : '',
		montant_min: q.get('montant_min') ?? '',
		tri: q.get('tri') ?? '',
		page: q.get('page') ?? '1'
	};
	const compteurs = chargerOuDefaut<CompteursMarches | null>(event, '/marches/compteurs', null);
	if (onglet === 'projets') {
		const [projets, c] = await Promise.all([
			charger<Liste<ProjetResume>>(event, '/marches/projets', { q: filtres.q, page: filtres.page, taille: 20 }),
			compteurs
		]);
		return { onglet, filtres, projets, marches: null, compteurs: c, supprime: q.has('supprime') };
	}
	const [marches, c] = await Promise.all([
		charger<Liste<MarcheResume>>(event, '/marches', {
			q: filtres.q,
			type: filtres.type,
			ouverts: filtres.ouverts ? 'true' : '',
			montant_min: filtres.montant_min,
			tri: filtres.tri,
			page: filtres.page,
			taille: 20
		}),
		compteurs
	]);
	return { onglet, filtres, marches, projets: null, compteurs: c, supprime: q.has('supprime') };
};
