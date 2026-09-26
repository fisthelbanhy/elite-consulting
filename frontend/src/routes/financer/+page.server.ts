import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { GroupeResume } from '$lib/types/likelemba';
import type { CompteursProjets, ProjetResume } from '$lib/types/projets';

const VIDE = { items: [], total: 0, page: 1, taille: 3 };

export const load: PageServerLoad = async (event) => {
	// Page vitrine : chaque bloc est tolérant (une panne d'un module ne casse pas la page)
	const [projets, groupes, compteurs] = await Promise.all([
		chargerOuDefaut<Liste<ProjetResume>>(event, '/projets', VIDE, { taille: 3 }),
		chargerOuDefaut<Liste<GroupeResume>>(event, '/likelemba', VIDE, { taille: 3 }),
		chargerOuDefaut<CompteursProjets>(event, '/projets/compteurs', { projets: 0, besoin_total: 0, montant_promis: 0, montant_collecte: 0 })
	]);
	return { projets, groupes, compteurs };
};
