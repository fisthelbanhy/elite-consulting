/**
 * Épargne solidaire désactivable (ADR-0009) : quand `parametre.module_epargne_actif` est faux,
 * les sous-pages renvoient vers `/epargne`, qui affiche une page explicative (pas une erreur).
 */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { chargerOuDefaut } from './api';
import type { StatutEpargne } from '$lib/types/epargne';

type Evenement = Pick<RequestEvent, 'locals' | 'getClientAddress' | 'request' | 'url'>;

const STATUT_DEFAUT: StatutEpargne = {
	actif: true,
	message: '',
	don_minimum: 100,
	placement_minimum: 0,
	duree_min: 12,
	duree_max: 120
};

/** Statut lu en direct (pas de cache) : un gestionnaire qui coupe le module est obéi aussitôt. */
export function statutEpargne(event: Evenement): Promise<StatutEpargne> {
	return chargerOuDefaut<StatutEpargne>(event, '/epargne/statut', STATUT_DEFAUT);
}

export async function exigerEpargne(event: Evenement): Promise<StatutEpargne> {
	const statut = await statutEpargne(event);
	if (!statut.actif) redirect(303, '/epargne');
	return statut;
}
