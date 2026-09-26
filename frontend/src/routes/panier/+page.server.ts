/**
 * Panier (commun à la boutique et aux fiches bien-être, ADR-0007 S5a). Les articles de petites
 * annonces (type 2, module Annonces) sont affichés à part avec leur propre paiement.
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, charger, chargerOuDefaut, exigerConnexion, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { Panier } from '$lib/types/boutique';
import type { Panier as PanierArticles } from '$lib/types/annonces';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	const [panier, articles] = await Promise.all([
		charger<Panier>(event, '/panier'),
		membre.est_gestionnaire ? Promise.resolve(null) : chargerOuDefaut<PanierArticles | null>(event, '/annonces/panier', null)
	]);
	return { panier, articles, paye: event.url.searchParams.has('paye') };
};

async function supprimer(event: RequestEvent, chemin: string) {
	try {
		const r = await api<Ok>(event, chemin, { method: 'DELETE' });
		return { cle: 'panier', succes: r.message };
	} catch (e) {
		if (e instanceof ApiError) return fail(e.statut, { cle: 'panier', message: e.message, champs: e.champs });
		throw e;
	}
}

export const actions: Actions = {
	quantite: async (event) => {
		const fd = await event.request.formData();
		const id = Number(fd.get('ligne'));
		const quantite = Math.trunc(Number(fd.get('quantite')) || 0);
		if (quantite <= 0) return supprimer(event, `/panier/${id}`);
		const r = await soumettre<Ok>(event, `/panier/${id}`, { method: 'PUT', body: { quantite }, cle: 'panier' });
		if (!r.ok) return r.echec;
		return { cle: 'panier', succes: r.data.message };
	},
	retirer: async (event) => {
		const fd = await event.request.formData();
		return supprimer(event, `/panier/${Number(fd.get('ligne'))}`);
	},
	retirerArticle: async (event) => {
		const fd = await event.request.formData();
		return supprimer(event, `/annonces/panier/${Number(fd.get('ligne'))}`);
	}
};
