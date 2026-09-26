/** Enregistrement d'une annonce d'emploi (création ou modification) + pièces jointes. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerAnnonce(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		type_annonce: 'entier',
		domaine_id: 'entier?',
		nom: 'texte',
		prenom: 'texte',
		sexe: 'entier?',
		date_naissance: 'date?',
		adresse: 'texte',
		telephone: 'texte',
		email: 'texte',
		poste_a_pourvoir: 'texte',
		diplomes: 'texte',
		competences: 'texte',
		experience: 'texte',
		autres_informations: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/emplois/${id}` : '/emplois', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idFiche = r.data.id;
	try {
		const photo = fichierJoint(fd, 'photo');
		if (photo) await televerser(event, `/emplois/${idFiche}/photo`, 'fichier', photo);
		const cv = fichierJoint(fd, 'cv');
		if (cv) await televerser(event, `/emplois/${idFiche}/cv`, 'fichier', cv);
	} catch (e) {
		if (e instanceof ApiError) {
			// La fiche est enregistrée ; seul le fichier est refusé
			return fail(e.statut, { message: `Fiche enregistrée, mais fichier refusé : ${e.message}`, champs: e.champs, valeurs });
		}
		throw e;
	}
	redirect(303, `/emplois/${idFiche}?enregistre=1`);
}
