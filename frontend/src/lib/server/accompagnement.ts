/**
 * Accompagnement : questionnaires (configuration servie par l'API, mise en cache 5 minutes) et
 * enregistrement d'un dossier. Les réponses arrivent dans des champs `z{n}` (n = zone legacy) ;
 * le bouton cliqué porte `envoyer=1` (« Envoyer à mon conseiller ») ou `envoyer=0` (« Sauvegarder »).
 */
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { api, soumettre } from './api';
import type { Ok } from '$lib/types';
import type { Questionnaire } from '$lib/types/accompagnement';

let cache: { expire: number; valeur: Questionnaire[] } | null = null;

export async function questionnaires(event: RequestEvent): Promise<Questionnaire[]> {
	if (cache && cache.expire > Date.now()) return cache.valeur;
	try {
		const valeur = await api<Questionnaire[]>(event, '/accompagnement/questionnaires', { jeton: null });
		cache = { expire: Date.now() + 5 * 60 * 1000, valeur };
		return valeur;
	} catch {
		error(503, 'Le service est momentanément indisponible. Réessayez dans un instant.');
	}
}

export async function questionnaire(event: RequestEvent, slug: string): Promise<Questionnaire> {
	const q = (await questionnaires(event)).find((x) => x.slug === slug);
	if (!q) error(404, "Ce type d'accompagnement n'existe pas.");
	return q;
}

export async function enregistrerDossier(event: RequestEvent, q: Questionnaire, id?: string) {
	const fd = await event.request.formData();
	const reponses: Record<string, string> = {};
	const valeurs: Record<string, unknown> = {};
	for (const [cle, v] of fd.entries()) {
		const m = cle.match(/^z(\d+)$/);
		if (m && typeof v === 'string') {
			reponses[m[1]] = v;
			valeurs[cle] = v;
		}
	}
	const objet = String(fd.get('objet') ?? '').trim();
	const envoyer = fd.get('envoyer') === '1';
	valeurs.objet = objet;
	const body = id ? { objet, reponses, envoyer } : { type_dossier: q.type, objet, reponses, envoyer };
	const r = await soumettre<Ok>(event, id ? `/accompagnement/${id}` : '/accompagnement', {
		method: id ? 'PUT' : 'POST',
		body,
		valeurs,
		cle: 'dossier'
	});
	if (!r.ok) return r.echec;
	redirect(303, `/accompagnement/${q.slug}/${r.data.id}?statut=${envoyer ? 'envoye' : 'sauvegarde'}`);
}
