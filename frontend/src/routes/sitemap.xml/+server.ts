/**
 * Plan du site pour les moteurs de recherche (ADR-0008 : SEO local). Pages fixes + fiches
 * publiées des modules exposant une liste publique (`GET /api/<module>?taille=100`).
 */
import type { RequestHandler } from './$types';
import { chargerOuDefaut } from '$lib/server/api';
import { PILIERS } from '$lib/navigation';

const DYNAMIQUES: [string, string][] = [
	['/emplois', '/emplois'],
	['/immobilier', '/immobilier'],
	['/annonces', '/annonces'],
	['/projets', '/projets'],
	['/entreprises', '/entreprises'],
	['/marches', '/marches'],
	['/marches/projets', '/marches/projets'],
	['/partenariats', '/partenariats'],
	['/boutique', '/boutique'],
	['/questions', '/questions'],
	['/reussites', '/reussites']
];

export const GET: RequestHandler = async (event) => {
	const origine = event.url.origin;
	const fixes = [
		'/',
		'/diagnostic',
		'/aide',
		'/contact',
		'/suggestion',
		'/publicites',
		'/se-lancer',
		'/financer',
		'/opportunites',
		'/mentions-legales',
		'/confidentialite',
		'/conditions',
		...PILIERS.flatMap((p) => p.liens.map((l) => l.href))
	];
	const listes = await Promise.all(
		DYNAMIQUES.map(async ([api, page]) => {
			const l = await chargerOuDefaut<{ items: { id: number }[] }>(event, api, { items: [] }, { taille: 100 });
			return l.items.map((i) => `${page}/${i.id}`);
		})
	);
	const urls = [...new Set([...fixes, ...listes.flat()])];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origine}${u}</loc></url>`).join('\n')}
</urlset>`;
	return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'max-age=3600' } });
};
