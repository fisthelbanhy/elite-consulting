/** Forum « Conseil financier » : enregistrement d'un sujet (création ou modification). */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { lireFormulaire, soumettre } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerSujet(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, { rubrique: 'entier', objet: 'texte', texte: 'texte', confidentialite: 'entier?' });
	const r = await soumettre<Ok>(event, id ? `/conseil-financier/${id}` : '/conseil-financier', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs,
		cle: 'sujet'
	});
	if (!r.ok) return r.echec;
	redirect(303, `/conseil-financier/${r.data.id}?${id ? 'modifie' : 'enregistre'}=1`);
}
