import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { dev } from '$app/environment';
import { api, COOKIE_SESSION } from '$lib/server/api';
import { redirectionLegacy } from '$lib/server/redirections';
import type { MembreMoi } from '$lib/types';

/** Anciennes URL PHP (`/V04/prog/choixN.php?…`) → nouvelles pages (301, préserve le SEO). */
const redirections: Handle = async ({ event, resolve }) => {
	const cible = redirectionLegacy(event.url);
	if (cible) redirect(301, cible);
	return resolve(event);
};

/** Session : le cookie httpOnly porte un jeton opaque, validé auprès de l'API. */
const authentification: Handle = async ({ event, resolve }) => {
	event.locals.membre = null;
	event.locals.jeton = event.cookies.get(COOKIE_SESSION) ?? null;
	if (event.locals.jeton) {
		try {
			event.locals.membre = await api<MembreMoi>(event, '/auth/me');
		} catch {
			event.locals.jeton = null;
			event.cookies.delete(COOKIE_SESSION, { path: '/' });
		}
	}
	return resolve(event);
};

/** Journal des visites (legacy `visite`) : au plus un appel par navigateur et par 30 minutes. */
const visites: Handle = async ({ event, resolve }) => {
	const p = event.url.pathname;
	const estPage =
		event.request.method === 'GET' &&
		!p.startsWith('/api') &&
		!p.startsWith('/media') &&
		!p.startsWith('/_app') &&
		!p.includes('.') &&
		!event.request.headers.get('x-sveltekit-action');
	if (estPage && !event.cookies.get('lf_v')) {
		event.cookies.set('lf_v', '1', { path: '/', maxAge: 60 * 30, httpOnly: true, sameSite: 'lax', secure: !dev });
		api(event, '/visites', { method: 'POST' }).catch(() => {});
	}
	return resolve(event);
};

const securite: Handle = async ({ event, resolve }) => {
	const reponse = await resolve(event);
	reponse.headers.set('X-Content-Type-Options', 'nosniff');
	reponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	reponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
	reponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return reponse;
};

export const handle = sequence(redirections, authentification, visites, securite);
