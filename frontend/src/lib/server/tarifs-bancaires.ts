/**
 * Tarifs bancaires (bench marking) : actions de gestion du référentiel et de saisie des tarifs.
 * Chaque action renvoie `{cle, succes}` ou un échec avec la même `cle` (plusieurs formulaires par page).
 */
import type { RequestEvent } from '@sveltejs/kit';
import { soumettre, type OptionsApi } from './api';
import type { Ok } from '$lib/types';

async function appeler(event: RequestEvent, chemin: string, method: OptionsApi['method'], cle: string, body?: Record<string, unknown>) {
	const r = await soumettre<Ok>(event, chemin, { method, body, valeurs: body, cle });
	if (!r.ok) return r.echec;
	return { cle, succes: r.data.message };
}

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const nombre = (fd: FormData, k: string) => Number(fd.get(k)) || null;

export const actionsTarifs = {
	initialiser: (event: RequestEvent) => appeler(event, '/tarifs-bancaires/initialiser', 'POST', 'referentiel'),

	grille: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		const banque = nombre(fd, 'banque_id');
		const tarifs: Record<string, string> = {};
		for (const [k, v] of fd.entries()) {
			const m = k.match(/^tarif_(\d+)$/);
			if (m && typeof v === 'string') tarifs[m[1]] = v;
		}
		return appeler(event, `/tarifs-bancaires/banques/${banque}`, 'PUT', 'grille', { tarifs });
	},

	ajouterType: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		return appeler(event, '/tarifs-bancaires/types', 'POST', 'type-nouveau', { libelle: texte(fd, 'libelle') });
	},
	modifierType: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		const id = nombre(fd, 'id');
		return appeler(event, `/tarifs-bancaires/types/${id}`, 'PUT', `type-${id}`, { libelle: texte(fd, 'libelle') });
	},
	supprimerType: async (event: RequestEvent) => {
		const id = nombre(await event.request.formData(), 'id');
		return appeler(event, `/tarifs-bancaires/types/${id}`, 'DELETE', 'referentiel');
	},

	ajouterOperation: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		return appeler(event, '/tarifs-bancaires/operations', 'POST', 'operation-nouvelle', {
			type_id: nombre(fd, 'type_id'),
			libelle: texte(fd, 'libelle')
		});
	},
	modifierOperation: async (event: RequestEvent) => {
		const fd = await event.request.formData();
		const id = nombre(fd, 'id');
		return appeler(event, `/tarifs-bancaires/operations/${id}`, 'PUT', `operation-${id}`, {
			type_id: nombre(fd, 'type_id'),
			libelle: texte(fd, 'libelle')
		});
	},
	supprimerOperation: async (event: RequestEvent) => {
		const id = nombre(await event.request.formData(), 'id');
		return appeler(event, `/tarifs-bancaires/operations/${id}`, 'DELETE', 'referentiel');
	}
};
