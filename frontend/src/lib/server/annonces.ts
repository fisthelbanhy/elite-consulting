/** Petites annonces : enregistrement d'un article (création ou modification) + photo. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerArticle(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		offre_ou_recherche: 'entier',
		famille_id: 'entier?',
		libelle: 'texte',
		prix: 'entier',
		quantite: 'entier',
		neuf_ou_occasion: 'entier',
		description: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/annonces/${id}` : '/annonces', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idFiche = r.data.id;
	const photo = fichierJoint(fd, 'photo');
	if (photo) {
		try {
			await televerser(event, `/annonces/${idFiche}/photo`, 'fichier', photo);
		} catch (e) {
			if (e instanceof ApiError) {
				return fail(e.statut, {
					message: `Annonce enregistrée (${r.data.reference ?? ''}), mais photo refusée : ${e.message}`,
					champs: e.champs,
					valeurs
				});
			}
			throw e;
		}
	}
	redirect(303, `/annonces/${idFiche}?enregistre=1`);
}
