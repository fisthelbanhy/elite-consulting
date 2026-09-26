/** Enregistrement d'un bien immobilier (création ou modification) + photo. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerBien(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		offre_ou_recherche: 'entier',
		type_transaction: 'entier',
		type_bien: 'entier',
		quartier_id: 'entier?',
		localisation: 'texte',
		surface_m2: 'entier',
		nombre_pieces: 'entier',
		nombre_chambres: 'entier',
		situation: 'entier',
		prix: 'entier',
		description: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/immobilier/${id}` : '/immobilier', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idFiche = r.data.id;
	const photo = fichierJoint(fd, 'photo');
	if (photo) {
		try {
			await televerser(event, `/immobilier/${idFiche}/photo`, 'fichier', photo);
		} catch (e) {
			if (e instanceof ApiError) {
				// La fiche est enregistrée ; seule la photo est refusée : on renvoie vers la modification
				return fail(e.statut, {
					message: `Annonce enregistrée (${r.data.reference ?? ''}), mais photo refusée : ${e.message}`,
					champs: e.champs,
					valeurs
				});
			}
			throw e;
		}
	}
	redirect(303, `/immobilier/${idFiche}?enregistre=1`);
}
