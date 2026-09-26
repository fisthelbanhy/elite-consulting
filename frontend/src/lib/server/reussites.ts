/** Enregistrement d'un témoignage de réussite (création ou modification) + photo. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerReussite(event: RequestEvent, id?: number | string | null) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		secteur_id: 'entier?',
		situation_avant: 'texte',
		vision: 'texte',
		projet: 'texte',
		fond_demarrage: 'entier',
		besoin_reel_demarrage: 'entier',
		strategie: 'texte',
		difficultes: 'texte',
		deploiement_efforts: 'texte',
		succes: 'texte',
		conseil: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/reussites/${id}` : '/reussites', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	try {
		const photo = fichierJoint(fd, 'photo');
		if (photo) await televerser(event, `/reussites/${r.data.id}/photo`, 'fichier', photo);
	} catch (e) {
		if (e instanceof ApiError) {
			return fail(e.statut, { message: `Témoignage enregistré, mais photo refusée : ${e.message}`, champs: e.champs, valeurs });
		}
		throw e;
	}
	const retour = String(fd.get('retour') ?? '');
	redirect(303, retour.startsWith('/reussites/') ? `${retour}?enregistre=1` : `/reussites/ma-fiche?enregistre=1`);
}
