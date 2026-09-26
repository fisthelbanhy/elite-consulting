/**
 * Courses & livraison : lecture du formulaire de commande (lignes libres + articles du catalogue),
 * vérification (1er temps) et enregistrement (2e temps), catalogue des boutiques.
 */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';
import type { Recapitulatif } from '$lib/types/courses';

function nombre(v: FormDataEntryValue | undefined): number {
	const n = Number(String(v ?? '').replace(/\s/g, ''));
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Convertit le formulaire en corps d'API + valeurs brutes à réafficher en cas d'erreur. */
export function lireCourse(fd: FormData) {
	const champs = lireFormulaire(fd, {
		boutique_id: 'entier?',
		lieu_achat: 'texte',
		date_achat: 'date?',
		lieu_livraison: 'texte',
		observation: 'texte'
	});
	const jour = String(fd.get('jour_livraison') ?? '').trim();
	const heure = String(fd.get('heure_livraison') ?? '').trim();
	const noms = fd.getAll('ligne_nom');
	const prix = fd.getAll('ligne_prix');
	const quantites = fd.getAll('ligne_quantite');
	const observations = fd.getAll('ligne_observation');
	// Toutes les lignes libres sont envoyées dans l'ordre : « Ligne n » de l'API = n-ième ligne affichée
	const lignes = noms.map((nom, i) => {
		const nomArticle = String(nom).trim();
		const prixPlafond = nombre(prix[i]);
		return {
			nom_article: nomArticle,
			prix_plafond: prixPlafond,
			// Ligne laissée vide (quantité 1 proposée par défaut) : ignorée par l'API
			quantite: nomArticle || prixPlafond ? nombre(quantites[i]) : 0,
			observation: String(observations[i] ?? '').trim()
		};
	});
	const catalogueIds = fd.getAll('catalogue_id');
	const catalogueQtes = fd.getAll('catalogue_quantite');
	const catalogue: Record<string, number> = {};
	catalogueIds.forEach((id, i) => {
		const q = nombre(catalogueQtes[i]);
		if (q > 0) catalogue[String(id)] = q;
	});
	const body = {
		...champs,
		date_livraison: jour && heure ? `${jour}T${heure}` : null,
		lignes: [
			...lignes,
			...Object.entries(catalogue).map(([id, quantite]) => ({ article_catalogue_id: Number(id), quantite }))
		]
	};
	const valeurs = { ...champs, jour_livraison: jour, heure_livraison: heure, lignes, catalogue };
	return { body, valeurs };
}

/** 1er temps : contrôle et calcul du net à payer, sans enregistrer. */
export async function verifierCourse(event: RequestEvent, id?: string) {
	const { body, valeurs } = lireCourse(await event.request.formData());
	const r = await soumettre<Recapitulatif>(event, '/courses/verifier', {
		body,
		valeurs,
		query: id ? { course_id: id } : undefined,
		cle: 'course'
	});
	if (!r.ok) return r.echec;
	return { cle: 'course', recap: r.data, valeurs };
}

/** 2e temps : enregistrement (création ou modification). */
export async function enregistrerCourse(event: RequestEvent, id?: string) {
	const { body, valeurs } = lireCourse(await event.request.formData());
	const r = await soumettre<Ok>(event, id ? `/courses/${id}` : '/courses', {
		method: id ? 'PUT' : 'POST',
		body,
		valeurs,
		cle: 'course'
	});
	if (!r.ok) return r.echec;
	redirect(303, `/courses/${r.data.id}?enregistre=1`);
}

/** Catalogue d'une boutique : création / modification d'un article + photo. */
export async function enregistrerArticleCatalogue(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		boutique_id: 'entier?',
		code: 'texte',
		nom: 'texte',
		marque: 'texte',
		prix: 'entier',
		disponible: 'entier',
		description: 'texte'
	});
	const r = await soumettre<Ok>(event, id ? `/courses/catalogue/${id}` : '/courses/catalogue', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const photo = fichierJoint(fd, 'photo');
	if (photo) {
		try {
			await televerser(event, `/courses/catalogue/${r.data.id}/photo`, 'fichier', photo);
		} catch (e) {
			if (e instanceof ApiError) {
				return fail(e.statut, { message: `Article enregistré, mais photo refusée : ${e.message}`, champs: e.champs, valeurs });
			}
			throw e;
		}
	}
	redirect(303, `/courses/catalogue?enregistre=1`);
}

/** Date du jour à Brazzaville (AAAA-MM-JJ), minimum des sélecteurs de date. */
export function aujourdhui(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Brazzaville' });
}
