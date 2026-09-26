import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut } from '$lib/server/api';
import { villes } from '$lib/server/referentiels';
import type { Liste } from '$lib/types';
import type { BienResume, CompteursOffres, Encarts } from '$lib/types/immobilier';

const FILTRES = ['type', 'transaction', 'type_bien', 'ville_id', 'quartier_id', 'chambres', 'pieces_min', 'surface_min', 'surface_max', 'prix_min', 'prix_max', 'q', 'tri', 'miens'];

export const load: PageServerLoad = async (event) => {
	const p = event.url.searchParams;
	const filtres = Object.fromEntries(FILTRES.map((k) => [k, p.get(k) ?? ''])) as Record<string, string>;
	const gestion = !!event.locals.membre?.est_gestionnaire;
	const [liste, compteurs, encarts, listeVilles] = await Promise.all([
		charger<Liste<BienResume>>(event, '/immobilier', { ...filtres, miens: filtres.miens ? true : undefined, page: p.get('page') ?? 1, taille: 20 }),
		chargerOuDefaut<CompteursOffres>(event, '/immobilier/compteurs', { offres: 0, recherches: 0, total: 0 }),
		// Encarts réservés aux visiteurs et membres ; le gestionnaire a la liste pleine largeur (F-S3-06)
		gestion ? Promise.resolve(null) : chargerOuDefaut<Encarts<BienResume> | null>(event, '/immobilier/encarts', null),
		villes(event).catch(() => [])
	]);
	return { liste, compteurs, encarts, villes: listeVilles, filtres, gestion, supprime: p.has('supprime') };
};
