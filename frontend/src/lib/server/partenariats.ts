/** Enregistrement d'une recherche de partenariat & troc (création ou modification). */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { lireFormulaire, soumettre } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerPartenariat(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, { actif: 'texte', description: 'texte', recherche: 'texte', objectif: 'texte' });
	const r = await soumettre<Ok>(event, id ? `/partenariats/${id}` : '/partenariats', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	redirect(303, `/partenariats/${r.data.id}?enregistre=1`);
}
