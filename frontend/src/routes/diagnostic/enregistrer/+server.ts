/**
 * Retour d'inscription ou de connexion (`?suite=/diagnostic/enregistrer`) : le diagnostic gardé
 * dans le cookie signé est enregistré dans la fiche Découverte de soi du membre, qui est ensuite
 * envoyé sur la page de remerciement. Aucun lien du site ne pointe ici (pas de préchargement).
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api, ApiError } from '$lib/server/api';
import { effacerReponses, lireReponses } from '$lib/server/diagnostic';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.membre) redirect(303, `/connexion?suite=${encodeURIComponent('/diagnostic/enregistrer')}`);
	const reponses = lireReponses(event.cookies);
	// Rien en attente (déjà envoyé, cookie expiré) : la page de remerciement ou le diagnostic
	if (!Object.keys(reponses).length) redirect(303, '/diagnostic/merci');
	try {
		await api(event, '/decouverte/diagnostic', { body: reponses });
	} catch (e) {
		if (e instanceof ApiError) {
			// Diagnostic incomplet : on le reprend ; autre erreur : le résultat propose de réessayer
			redirect(303, e.statut === 400 ? '/diagnostic' : '/diagnostic/resultat?erreur=1');
		}
		throw e;
	}
	effacerReponses(event.cookies);
	redirect(303, '/diagnostic/merci');
};
