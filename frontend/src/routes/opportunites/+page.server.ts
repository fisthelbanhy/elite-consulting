import type { PageServerLoad } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import type { Liste } from '$lib/types';
import type { EntrepriseResume } from '$lib/types/entreprises';
import type { CompteursMarches, MarcheResume } from '$lib/types/marches';

const VIDE = { items: [], total: 0, page: 1, taille: 0 };

/** Page pilier « Opportunités » (ADR-0008) : tous les blocs sont secondaires, jamais bloquants. */
export const load: PageServerLoad = async (event) => {
	const [ouverts, entreprises, compteurs, emplois] = await Promise.all([
		chargerOuDefaut<Liste<MarcheResume>>(event, '/marches', VIDE, { ouverts: true, tri: 'cloture', taille: 3 }),
		chargerOuDefaut<Liste<EntrepriseResume>>(event, '/entreprises', VIDE, { tri: 'recent', taille: 4 }),
		chargerOuDefaut<CompteursMarches | null>(event, '/marches/compteurs', null),
		chargerOuDefaut<{ demandes: number; offres: number } | null>(event, '/emplois/compteurs', null)
	]);
	// Sans marché ouvert, on montre les derniers publiés plutôt qu'un bloc vide
	const marches = ouverts.items.length
		? ouverts
		: await chargerOuDefaut<Liste<MarcheResume>>(event, '/marches', VIDE, { tri: 'recent', taille: 3 });
	return { marches, marchesOuverts: ouverts.items.length > 0, entreprises, compteurs, emplois };
};
