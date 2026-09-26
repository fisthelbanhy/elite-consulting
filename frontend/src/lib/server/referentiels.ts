/** Référentiels peu changeants, mis en cache mémoire côté serveur (5 minutes). */
import type { RequestEvent } from '@sveltejs/kit';
import { api } from './api';
import type { Enums, Parametres, Secteur, Ville } from '$lib/types';

type Evenement = Pick<RequestEvent, 'locals' | 'getClientAddress' | 'request'>;
const cache = new Map<string, { expire: number; valeur: unknown }>();
const TTL = 5 * 60 * 1000;

async function memo<T>(cle: string, fn: () => Promise<T>): Promise<T> {
	const hit = cache.get(cle);
	if (hit && hit.expire > Date.now()) return hit.valeur as T;
	const valeur = await fn();
	cache.set(cle, { expire: Date.now() + TTL, valeur });
	return valeur;
}

export function invaliderReferentiels() {
	cache.clear();
}

const sansJeton = { jeton: null };

export const enums = (e: Evenement) => memo('enums', () => api<Enums>(e, '/referentiels/enums', sansJeton));
export const parametres = (e: Evenement) => memo('parametres', () => api<Parametres>(e, '/referentiels/parametres', sansJeton));
export const villes = (e: Evenement) => memo('villes', () => api<Ville[]>(e, '/referentiels/villes', sansJeton));
export const secteurs = (e: Evenement) => memo('secteurs', () => api<Secteur[]>(e, '/referentiels/secteurs', sansJeton));
export const famillesArticles = (e: Evenement) =>
	memo('familles', () => api<{ id: number; libelle: string }[]>(e, '/referentiels/familles-articles', sansJeton));
export const banques = (e: Evenement) =>
	memo('banques', () => api<{ id: number; sigle: string; nom: string }[]>(e, '/referentiels/banques', sansJeton));
