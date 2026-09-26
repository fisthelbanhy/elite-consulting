import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { COOKIE_SESSION } from './api';

export function ouvrirSession(cookies: Cookies, jeton: string, expire: string) {
	cookies.set(COOKIE_SESSION, jeton, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: new Date(expire)
	});
}

export function fermerSession(cookies: Cookies) {
	cookies.delete(COOKIE_SESSION, { path: '/' });
}

/** N'accepte qu'un chemin local comme destination après connexion (pas de redirection ouverte). */
export function suiteSure(suite: string | null | undefined, defaut = '/espace'): string {
	if (!suite || !suite.startsWith('/') || suite.startsWith('//') || suite.startsWith('/\\')) return defaut;
	if (suite.startsWith('/connexion') || suite.startsWith('/inscription')) return defaut;
	return suite;
}
