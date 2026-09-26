/**
 * Proxy navigateur → FastAPI pour les rares appels faits côté client (widget de messagerie,
 * compteurs). Le jeton est ajouté côté serveur : il n'est jamais exposé au JavaScript (ADR-0002).
 */
import type { RequestHandler } from './$types';
import { API_URL } from '$lib/server/api';

const relayer: RequestHandler = async ({ params, request, url, locals, getClientAddress }) => {
	const entetes = new Headers();
	for (const h of ['content-type', 'accept']) {
		const v = request.headers.get(h);
		if (v) entetes.set(h, v);
	}
	if (locals.jeton) entetes.set('Authorization', `Bearer ${locals.jeton}`);
	entetes.set('X-Client-IP', getClientAddress());

	const avecCorps = !['GET', 'HEAD'].includes(request.method);
	const rep = await fetch(`${API_URL}/${params.chemin}${url.search}`, {
		method: request.method,
		headers: entetes,
		body: avecCorps ? await request.arrayBuffer() : undefined
	});
	return new Response(rep.body, {
		status: rep.status,
		headers: { 'content-type': rep.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' }
	});
};

export const GET = relayer;
export const POST = relayer;
export const PUT = relayer;
export const PATCH = relayer;
export const DELETE = relayer;
