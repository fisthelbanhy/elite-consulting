/** Fichiers téléversés (photos, CV, publicités) servis depuis FastAPI, sur la même origine. */
import type { RequestHandler } from './$types';
import { BACKEND_URL } from '$lib/server/api';

export const GET: RequestHandler = async ({ params, request }) => {
	const entetes: Record<string, string> = {};
	const plage = request.headers.get('range');
	if (plage) entetes.range = plage; // lecture audio/vidéo
	const rep = await fetch(`${BACKEND_URL}/media/${params.chemin}`, { headers: entetes });
	const sortie = new Headers();
	for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
		const v = rep.headers.get(h);
		if (v) sortie.set(h, v);
	}
	sortie.set('cache-control', rep.ok ? 'public, max-age=604800' : 'no-store');
	return new Response(rep.body, { status: rep.status, headers: sortie });
};
