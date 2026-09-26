/** Export CSV de la liste filtrée des membres (F-ADM-40), relayé depuis l'API avec le jeton de session. */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_URL } from '$lib/server/api';
import { exigerGestionnaire } from '$lib/server/gestion';

export const GET: RequestHandler = async (event) => {
	exigerGestionnaire(event);
	const rep = await fetch(`${API_URL}/gestion/membres/export${event.url.search}`, {
		headers: { Authorization: `Bearer ${event.locals.jeton}` }
	}).catch(() => null);
	if (!rep || !rep.ok) error(rep?.status ?? 503, "L'export n'a pas pu être généré. Réessayez dans un instant.");
	return new Response(rep.body, {
		headers: {
			'content-type': rep.headers.get('content-type') ?? 'text/csv; charset=utf-8',
			'content-disposition': rep.headers.get('content-disposition') ?? 'attachment; filename="membres.csv"',
			'cache-control': 'no-store'
		}
	});
};
