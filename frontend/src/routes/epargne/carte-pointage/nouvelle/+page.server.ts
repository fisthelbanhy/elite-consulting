/**
 * Formulaire de pointage (F-S4-60 à F-S4-66) en deux temps, sans JavaScript :
 * 1. choix de l'opération et du titulaire (formulaire GET) → solde, dernière opération, photo ;
 * 2. montant, motif et code PIN du titulaire (formulaire POST).
 */
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { chargerOuDefaut, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { exigerEpargne } from '$lib/server/epargne';
import type { Ok } from '$lib/types';
import type { Titulaire, TitulaireDetail } from '$lib/types/epargne';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre.est_gestionnaire && !membre.point_caisse_actif) {
		error(403, 'La saisie des pointages est réservée aux agents de caisse et à la frangine.');
	}
	await exigerEpargne(event);
	const q = event.url.searchParams;
	const choix = { operation: q.get('operation') ?? '', membre: q.get('membre') ?? '', q: q.get('q') ?? '' };
	const [titulaires, titulaire] = await Promise.all([
		chargerOuDefaut<Titulaire[]>(event, '/epargne/pointages/titulaires', [], { q: choix.q }),
		choix.membre ? chargerOuDefaut<TitulaireDetail | null>(event, `/epargne/pointages/titulaires/${choix.membre}`, null) : Promise.resolve(null)
	]);
	return { titulaires, titulaire, choix, maintenant: new Date().toISOString() };
};

export const actions: Actions = {
	default: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			type_operation: 'entier?',
			membre_id: 'entier?',
			montant: 'entier',
			motif: 'texte',
			code_pin: 'texte'
		});
		const r = await soumettre<Ok>(event, '/epargne/pointages', { body: valeurs, valeurs });
		if (!r.ok) return r.echec; // le code PIN n'est jamais renvoyé au navigateur (sansSecrets)
		redirect(303, `/epargne/carte-pointage?effectue=${encodeURIComponent(r.data.reference ?? '')}`);
	}
};
