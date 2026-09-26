/**
 * Client de l'API FastAPI, utilisable uniquement côté serveur (architecture BFF, ADR-0002).
 * Le jeton de session vit dans un cookie httpOnly ; il est relayé à FastAPI en Bearer.
 */
import { env } from '$env/dynamic/private';
import { error, fail, redirect, type ActionFailure, type RequestEvent } from '@sveltejs/kit';
import type { ErreurApi } from '$lib/types';

export const BACKEND_URL = (env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
export const API_URL = `${BACKEND_URL}/api`;
export const COOKIE_SESSION = 'lf_session';

type Evenement = Pick<RequestEvent, 'locals' | 'getClientAddress' | 'request'> & Partial<Pick<RequestEvent, 'url'>>;

export class ApiError extends Error {
	constructor(
		public statut: number,
		message: string,
		public champs: Record<string, string> = {}
	) {
		super(message);
	}
}

export interface OptionsApi {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	query?: Record<string, string | number | boolean | null | undefined | (string | number)[]>;
	jeton?: string | null;
}

export function construireQuery(query: OptionsApi['query']): string {
	if (!query) return '';
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(query)) {
		if (v === undefined || v === null || v === '') continue;
		if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
		else p.set(k, String(v));
	}
	const s = p.toString();
	return s ? `?${s}` : '';
}

function ipClient(event: Evenement): string {
	try {
		return event.getClientAddress();
	} catch {
		return '';
	}
}

/** Appel brut à l'API. Lève `ApiError` si le statut n'est pas 2xx. */
export async function api<T>(event: Evenement, chemin: string, opts: OptionsApi = {}): Promise<T> {
	const entetes: Record<string, string> = { Accept: 'application/json' };
	const jeton = opts.jeton !== undefined ? opts.jeton : event.locals.jeton;
	if (jeton) entetes.Authorization = `Bearer ${jeton}`;
	const ip = ipClient(event);
	if (ip) entetes['X-Client-IP'] = ip;
	const ua = event.request.headers.get('user-agent');
	if (ua) entetes['User-Agent'] = ua;

	let corps: BodyInit | undefined;
	if (opts.body instanceof FormData) {
		corps = opts.body;
	} else if (opts.body !== undefined) {
		corps = JSON.stringify(opts.body);
		entetes['Content-Type'] = 'application/json';
	}

	let rep: Response;
	try {
		rep = await fetch(`${API_URL}${chemin}${construireQuery(opts.query)}`, {
			method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
			headers: entetes,
			body: corps
		});
	} catch {
		throw new ApiError(503, 'Le service est momentanément indisponible. Réessayez dans un instant.');
	}

	if (rep.status === 204) return undefined as T;
	const texte = await rep.text();
	const donnees = texte ? JSON.parse(texte) : undefined;
	if (!rep.ok) {
		const e = (donnees ?? {}) as Partial<ErreurApi>;
		throw new ApiError(rep.status, e.message ?? 'Une erreur est survenue.', e.champs ?? {});
	}
	return donnees as T;
}

/**
 * Pour les fonctions `load` : renvoie les données ou déclenche la page d'erreur adaptée
 * (401 → connexion avec retour, 403/404 → page d'erreur).
 */
export async function charger<T>(event: Evenement, chemin: string, query?: OptionsApi['query']): Promise<T> {
	try {
		return await api<T>(event, chemin, { query });
	} catch (e) {
		if (e instanceof ApiError) {
			if (e.statut === 401) {
				const suite = event.url ? event.url.pathname + event.url.search : '/';
				redirect(303, `/connexion?suite=${encodeURIComponent(suite)}`);
			}
			error(e.statut, e.message);
		}
		throw e;
	}
}

/** Charge sans bloquer la page si l'appel échoue (bloc secondaire). */
export async function chargerOuDefaut<T>(event: Evenement, chemin: string, defaut: T, query?: OptionsApi['query']): Promise<T> {
	try {
		return await api<T>(event, chemin, { query });
	} catch {
		return defaut;
	}
}

export interface RetourEchec {
	cle?: string;
	message: string;
	champs: Record<string, string>;
	valeurs: Record<string, unknown>;
}

export type Resultat<T> = { ok: true; data: T } | { ok: false; echec: ActionFailure<RetourEchec> };

/**
 * Pour les form actions : exécute l'appel et renvoie `{ok: true, data}` ou
 * `{ok: false, echec}` où `echec` est un `fail(statut, {message, champs, valeurs})` prêt à être
 * renvoyé par l'action pour réafficher le formulaire :
 *   const r = await soumettre<Ok>(event, '/chemin', { body, valeurs });
 *   if (!r.ok) return r.echec;
 */
export async function soumettre<T>(
	event: Evenement,
	chemin: string,
	opts: OptionsApi & { valeurs?: Record<string, unknown>; cle?: string } = {}
): Promise<Resultat<T>> {
	const { valeurs, cle, ...reste } = opts;
	try {
		const data = await api<T>(event, chemin, { method: 'POST', ...reste });
		return { ok: true, data };
	} catch (e) {
		if (e instanceof ApiError) {
			if (e.statut === 401) {
				const suite = event.url ? event.url.pathname + event.url.search : '/';
				redirect(303, `/connexion?suite=${encodeURIComponent(suite)}`);
			}
			return {
				ok: false,
				echec: fail(e.statut, { cle, message: e.message, champs: e.champs, valeurs: sansSecrets(valeurs ?? {}) })
			};
		}
		throw e;
	}
}

/** Les mots de passe ne sont jamais renvoyés au navigateur pour réaffichage. */
function sansSecrets(v: Record<string, unknown>) {
	const copie = { ...v };
	for (const k of Object.keys(copie)) if (/mot_de_passe|confirmation|actuel|nouveau|code_pin|pin/.test(k)) delete copie[k];
	return copie;
}

// --- Lecture des formulaires ------------------------------------------------------------------

type Genre = 'texte' | 'entier' | 'entier?' | 'decimal' | 'bool' | 'date?' | 'liste';

/**
 * Convertit un FormData selon une spécification de champs.
 * `entier?` et `date?` : chaîne vide → null. `bool` : case cochée → true.
 */
export function lireFormulaire(fd: FormData, spec: Record<string, Genre>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [champ, genre] of Object.entries(spec)) {
		const brut = fd.get(champ);
		const v = typeof brut === 'string' ? brut.trim() : '';
		switch (genre) {
			case 'texte':
				out[champ] = v;
				break;
			case 'entier':
				out[champ] = v === '' ? 0 : Number(v.replace(/\s/g, ''));
				break;
			case 'entier?':
				out[champ] = v === '' ? null : Number(v.replace(/\s/g, ''));
				break;
			case 'decimal':
				out[champ] = v === '' ? 0 : Number(v.replace(/\s/g, '').replace(',', '.'));
				break;
			case 'bool':
				out[champ] = brut === 'on' || brut === 'true' || brut === '1';
				break;
			case 'date?':
				out[champ] = v === '' ? null : v;
				break;
			case 'liste':
				out[champ] = fd.getAll(champ).map(String);
				break;
		}
	}
	return out;
}

/** Fichier joint non vide, ou null. */
export function fichierJoint(fd: FormData, champ: string): File | null {
	const f = fd.get(champ);
	return f instanceof File && f.size > 0 ? f : null;
}

/** Envoie un fichier vers un endpoint d'upload FastAPI (multipart). */
export async function televerser<T>(event: Evenement, chemin: string, champ: string, fichier: File): Promise<T> {
	const fd = new FormData();
	fd.set(champ, fichier, fichier.name);
	return api<T>(event, chemin, { method: 'POST', body: fd });
}

/** Exige un membre connecté (sinon redirection vers la connexion). */
export function exigerConnexion(event: Evenement & Pick<RequestEvent, 'url'>) {
	if (!event.locals.membre) {
		redirect(303, `/connexion?suite=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	return event.locals.membre;
}
