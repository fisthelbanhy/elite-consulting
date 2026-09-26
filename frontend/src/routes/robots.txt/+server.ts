import type { RequestHandler } from './$types';

const PRIVE = ['/api/', '/espace', '/gestion', '/panier', '/paiement', '/connexion', '/inscription', '/mot-de-passe-oublie', '/reinitialiser'];

export const GET: RequestHandler = ({ url }) =>
	new Response(
		['User-agent: *', ...PRIVE.map((p) => `Disallow: ${p}`), '', `Sitemap: ${url.origin}/sitemap.xml`, ''].join('\n'),
		{ headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'max-age=86400' } }
	);
