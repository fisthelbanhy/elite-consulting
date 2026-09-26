import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import { cloturerFiche, enregistrerFiche } from '$lib/server/decouverte';
import type { Ok } from '$lib/types';
import type { FicheDetail } from '$lib/types/decouverte';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre?.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const fiche = await charger<FicheDetail>(event, `/decouverte/${event.params.id}`);
	const q = event.url.searchParams;
	return { fiche, modifier: q.has('modifier') && fiche.peut_modifier, enregistre: q.has('enregistre') };
};

export const actions: Actions = {
	enregistrer: (event) => enregistrerFiche(event, Number(event.params.id), `/decouverte-de-soi/fiches/${event.params.id}`),
	cloture: (event) => cloturerFiche(event, Number(event.params.id)),
	correspondance: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { notes_conseillere: 'texte' });
		const r = await soumettre<Ok>(event, `/decouverte/${event.params.id}/correspondance`, {
			method: 'PUT',
			body: valeurs,
			valeurs,
			cle: 'correspondance'
		});
		if (!r.ok) return r.echec;
		return { cle: 'correspondance', succes: 'Correspondance enregistrée : le membre est prévenu dans sa messagerie.' };
	},
	etat: async (event) => {
		const etat = Number((await event.request.formData()).get('etat'));
		const r = await soumettre<Ok>(event, `/decouverte/${event.params.id}/etat`, { body: { etat }, cle: 'suivi' });
		if (!r.ok) return r.echec;
		return { cle: 'suivi', succes: r.data.message };
	},
	supprimer: async (event) => {
		try {
			await api<Ok>(event, `/decouverte/${event.params.id}`, { method: 'DELETE' });
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'suivi', message: e.message, champs: e.champs });
			throw e;
		}
		redirect(303, '/decouverte-de-soi/fiches?supprime=1');
	}
};
