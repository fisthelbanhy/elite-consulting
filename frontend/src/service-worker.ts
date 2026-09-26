/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/**
 * Service worker (PWA, ADR-0008) : le site reste utilisable sur réseau lent ou coupé.
 * - Ressources de l'application (JS/CSS/polices) : cache-first, versionnées par build.
 * - Pages : réseau d'abord, repli sur la dernière version consultée, puis page hors ligne.
 * - Jamais de mise en cache des appels /api, des formulaires (POST) ni des espaces privés.
 */
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_APP = `lf-app-${version}`;
const CACHE_PAGES = 'lf-pages';
const APP = [...build, ...files];
const PRIVE = ['/api', '/espace', '/gestion', '/panier', '/paiement', '/connexion', '/inscription', '/deconnexion'];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_APP).then((c) => c.addAll(APP)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cles) => Promise.all(cles.filter((c) => c.startsWith('lf-app-') && c !== CACHE_APP).map((c) => caches.delete(c))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;
	if (PRIVE.some((p) => url.pathname.startsWith(p))) return;

	if (APP.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((r) => r ?? fetch(req)));
		return;
	}

	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req)
				.then((rep) => {
					if (rep.ok) {
						const copie = rep.clone();
						caches.open(CACHE_PAGES).then((c) => c.put(req, copie));
					}
					return rep;
				})
				.catch(async () => (await caches.match(req)) ?? (await caches.match('/hors-ligne.html')) ?? Response.error())
		);
	}
});
