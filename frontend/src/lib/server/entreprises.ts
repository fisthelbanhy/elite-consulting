/** Enregistrement d'une fiche entreprise (création ou modification) + logo. */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerEntreprise(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		domaine_id: 'entier?',
		nom: 'texte',
		forme_juridique: 'entier?',
		capital_social: 'entier',
		description: 'texte',
		gerant: 'texte',
		telephone: 'texte',
		email: 'texte',
		site_web: 'texte',
		adresse: 'texte',
		ville_id: 'entier?'
	});
	if (Number.isNaN(valeurs.capital_social)) valeurs.capital_social = -1; // refusé proprement par l'API
	const r = await soumettre<Ok>(event, id ? `/entreprises/${id}` : '/entreprises', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idFiche = r.data.id;
	let suite = 'enregistre=1';
	const logo = fichierJoint(fd, 'logo');
	if (logo) {
		try {
			await televerser(event, `/entreprises/${idFiche}/logo`, 'fichier', logo);
		} catch (e) {
			// La fiche est enregistrée, seul le logo est refusé : on l'affiche avec un avertissement
			// (réafficher le formulaire de création provoquerait un doublon au renvoi)
			if (!(e instanceof ApiError)) throw e;
			suite += '&fichier=refuse';
		}
	}
	redirect(303, `/entreprises/${idFiche}?${suite}`);
}
