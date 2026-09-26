/**
 * Domaine « communication » : aides serveur partagées par les pages contact, suggestions,
 * publicités et messagerie (y compris leurs écrans de gestion).
 */
import { error, type RequestEvent } from '@sveltejs/kit';
import { exigerConnexion } from './api';

type Evenement = Pick<RequestEvent, 'locals' | 'url' | 'getClientAddress' | 'request'>;

/**
 * Écrans de gestion : connexion exigée, puis compte gestionnaire. L'API refuse de toute façon
 * (403) ; ce contrôle évite seulement d'afficher un écran vide à un membre.
 */
export function exigerGestionnaire(event: Evenement) {
	const membre = exigerConnexion(event);
	if (!membre?.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	return membre;
}

/** Durée de remplissage d'un formulaire public (anti-robot, ADR-0005), en millisecondes. */
export function dureeSaisie(fd: FormData): number {
	const debut = Number(fd.get('debut_saisie') || 0);
	return debut ? Math.max(1, Date.now() - debut) : 0;
}

/** Lit un filtre numérique de l'URL (chaîne vide si absent ou invalide). */
export function filtreEntier(url: URL, nom: string): string {
	const v = url.searchParams.get(nom) ?? '';
	return /^\d+$/.test(v) ? v : '';
}

/** Lit un filtre de date `AAAA-MM-JJ` de l'URL (chaîne vide si absent ou invalide). */
export function filtreDate(url: URL, nom: string): string {
	const v = url.searchParams.get(nom) ?? '';
	return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}
