/** Enregistrement d'un appel de fonds (création ou modification) + dossier PDF et photo. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerProjet(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		entreprise_id: 'entier?',
		secteur_id: 'entier?',
		ville_id: 'entier?',
		nom_projet: 'texte',
		objet_projet: 'texte',
		description_activite: 'texte',
		description_projet: 'texte',
		devis_projet: 'entier',
		apport_fond_propre: 'entier',
		besoin_financement: 'entier',
		niveau_realisation: 'entier',
		nom_promoteur: 'texte',
		telephone_promoteur: 'texte',
		email_promoteur: 'texte',
		adresse_promoteur: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/projets/${id}` : '/projets', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idProjet = r.data.id;
	try {
		const pdf = fichierJoint(fd, 'presentation');
		if (pdf) await televerser(event, `/projets/${idProjet}/presentation`, 'fichier', pdf);
		const photo = fichierJoint(fd, 'photo');
		if (photo) await televerser(event, `/projets/${idProjet}/photo`, 'fichier', photo);
	} catch (e) {
		if (e instanceof ApiError) {
			// Le projet est enregistré ; seul le fichier est refusé
			return fail(e.statut, { message: `Projet enregistré, mais fichier refusé : ${e.message}`, champs: e.champs, valeurs });
		}
		throw e;
	}
	redirect(303, `/projets/${idProjet}?enregistre=1`);
}
