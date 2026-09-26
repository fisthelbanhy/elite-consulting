/**
 * Outils serveur du back-office « Gestion » : contrôle d'accès, lecture des filtres d'URL,
 * actions de formulaire génériques (écriture simple, suppression).
 */
import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { api, ApiError, soumettre, type OptionsApi } from './api';
import type { Ok } from '$lib/types';

type Evenement = Pick<RequestEvent, 'locals' | 'url'>;

/** Exige un gestionnaire connecté (sinon connexion, ou 403 pour un simple membre). */
export function exigerGestionnaire(event: Evenement) {
	const membre = event.locals.membre;
	if (!membre) redirect(303, `/connexion?suite=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	if (!membre.est_gestionnaire) error(403, 'Cet espace est réservé aux gestionnaires de La Frangine.');
	return membre;
}

/** Filtres conservés dans l'URL (F-TRV-67) : chaque nom demandé vaut '' s'il est absent. */
export function filtres<K extends string>(url: URL, noms: readonly K[]): Record<K, string> {
	const out = {} as Record<K, string>;
	for (const n of noms) out[n] = url.searchParams.get(n)?.trim() ?? '';
	return out;
}

/** Taille de page du back-office : 50 par défaut, choix de 50 à 500 (F-TRV-66). */
export function taillePage(url: URL): number {
	const t = Number(url.searchParams.get('taille'));
	return [50, 100, 200, 500].includes(t) ? t : 50;
}

/**
 * Action d'écriture : renvoie `{cle, succes, donnees}` ou l'échec prêt à être renvoyé
 * (réaffichage du formulaire avec les erreurs).
 */
export async function executer<T extends Ok = Ok>(
	event: RequestEvent,
	chemin: string,
	opts: { method?: OptionsApi['method']; body?: unknown; cle?: string; valeurs?: Record<string, unknown> } = {}
) {
	const r = await soumettre<T>(event, chemin, { method: opts.method ?? 'POST', body: opts.body, cle: opts.cle, valeurs: opts.valeurs });
	if (!r.ok) return r.echec;
	return { cle: opts.cle, succes: r.data.message, donnees: r.data };
}

/** Suppression (DELETE) ; l'échec est renvoyé sous la même forme que `soumettre`. */
export async function supprimer(event: RequestEvent, chemin: string, cle = 'suppression') {
	try {
		const r = await api<Ok>(event, chemin, { method: 'DELETE' });
		return { cle, succes: r.message };
	} catch (e) {
		if (e instanceof ApiError) return fail(e.statut, { cle, message: e.message, champs: e.champs, valeurs: {} });
		throw e;
	}
}

/** Champs du formulaire membre (création et modification par un gestionnaire). */
export const CHAMPS_MEMBRE = {
	type_compte: 'entier',
	categorie: 'entier',
	etat: 'entier',
	identifiant: 'texte',
	mot_de_passe: 'texte',
	nom: 'texte',
	pseudonyme: 'texte',
	sexe: 'entier?',
	situation_matrimoniale: 'entier?',
	nombre_enfants: 'entier',
	employeur: 'texte',
	numero_piece_identite: 'texte',
	forme_juridique: 'entier?',
	type_partenaire: 'entier?',
	domaine_activite_id: 'entier?',
	telephone: 'texte',
	email: 'texte',
	ville_id: 'entier?',
	adresse: 'texte',
	point_caisse_actif: 'bool',
	date_limite_master: 'date?',
	observation: 'texte'
} as const;

/** Identifiant numérique d'un champ caché, ou null. */
export function idFormulaire(fd: FormData, champ = 'id'): number | null {
	const v = Number(fd.get(champ));
	return Number.isInteger(v) && v > 0 ? v : null;
}
