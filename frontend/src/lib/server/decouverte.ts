/** Découverte de soi : enregistrement du questionnaire et actions de suivi de la fiche. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { lireFormulaire, soumettre } from './api';
import { SPEC_FORMULAIRE } from '$lib/components/decouverte/questions';
import type { Ok } from '$lib/types';

/**
 * Enregistre le questionnaire (création si `id` est absent, sinon modification), puis affiche
 * l'étape demandée par le bouton cliqué (`etape_suivante` = numéro ou « fin »).
 */
export async function enregistrerFiche(event: RequestEvent, id: number | null | undefined, base: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, SPEC_FORMULAIRE);
	const suivante = String(fd.get('etape_suivante') ?? 'fin');
	const r = await soumettre<Ok>(event, id ? `/decouverte/${id}` : '/decouverte', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs,
		cle: 'fiche'
	});
	if (!r.ok) return r.echec;
	redirect(303, /^\d+$/.test(suivante) ? `${base}?etape=${suivante}` : `${base}?enregistre=1`);
}

/** Clôture (`cloturee=1`) ou réouverture (`cloturee=0`) de la fiche. */
export async function cloturerFiche(event: RequestEvent, id: number | null | undefined) {
	if (!id) return fail(404, { cle: 'cloture', message: "Cette fiche de découverte de soi n'existe pas.", champs: {} });
	const cloturee = (await event.request.formData()).get('cloturee') === '1';
	const r = await soumettre<Ok>(event, `/decouverte/${id}/cloture`, { body: { cloturee }, cle: 'cloture' });
	if (!r.ok) return r.echec;
	return { cle: 'cloture', succes: r.data.message };
}
