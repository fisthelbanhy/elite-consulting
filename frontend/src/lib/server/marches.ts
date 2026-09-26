/** Enregistrement des marchés (+ dossier PDF) et des projets, en création ou modification. */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';

export async function enregistrerMarche(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		numero_appel_offre: 'texte',
		type_marche: 'entier?',
		libelle: 'texte',
		description: 'texte',
		montant: 'entier',
		date_limite: 'date?',
		dossier_a_fournir: 'texte',
		lieu_depot: 'texte',
		email: 'texte',
		maitre_ouvrage: 'texte',
		publie_par: 'texte',
		beneficiaire: 'texte'
	});
	if (Number.isNaN(valeurs.montant)) valeurs.montant = 0;
	const r = await soumettre<Ok>(event, id ? `/marches/${id}` : '/marches', { method: id ? 'PUT' : 'POST', body: valeurs, valeurs });
	if (!r.ok) return r.echec;
	const idFiche = r.data.id;
	let suite = 'enregistre=1';
	const document = fichierJoint(fd, 'document');
	if (document) {
		try {
			await televerser(event, `/marches/${idFiche}/document`, 'fichier', document);
		} catch (e) {
			// Marché enregistré, seul le PDF est refusé : avertissement sur la fiche (pas de doublon au renvoi)
			if (!(e instanceof ApiError)) throw e;
			suite += '&fichier=refuse';
		}
	}
	redirect(303, `/marches/${idFiche}?${suite}`);
}

export async function enregistrerProjet(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		responsable: 'texte',
		promoteur: 'texte',
		objet: 'texte',
		libelle: 'texte',
		objectif: 'texte',
		description: 'texte',
		adresse: 'texte',
		duree_mois: 'entier?',
		date_lancement: 'date?',
		conditions: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/marches/projets/${id}` : '/marches/projets', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	redirect(303, `/marches/projets/${r.data.id}?enregistre=1`);
}
