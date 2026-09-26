import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ApiError, charger, chargerOuDefaut, fichierJoint, lireFormulaire, televerser } from '$lib/server/api';
import { executer } from '$lib/server/gestion';
import type { Liste, Ok } from '$lib/types';
import type { CodePointage, ConnexionLigne, LienReinitialisation, ListePaiements, MembreDetail } from '$lib/types/gestion';

export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	const membre = await charger<MembreDetail>(event, `/gestion/membres/${id}`);
	const vide = { items: [], total: 0, page: 1, taille: 10 };
	const [connexions, paiements] = await Promise.all([
		chargerOuDefaut<Liste<ConnexionLigne>>(event, '/gestion/journaux/connexions', vide, { membre_id: id, taille: 8 }),
		// Réservé au droit Caisse : bloc masqué sinon
		event.locals.membre?.droit_caisse
			? chargerOuDefaut<ListePaiements | null>(event, '/paiements', null, { membre_id: id, taille: 5 })
			: Promise.resolve(null)
	]);
	return { membre, connexions, paiements, enregistre: event.url.searchParams.has('enregistre') };
};

const chemin = (id: string) => `/gestion/membres/${id}`;

export const actions: Actions = {
	etat: async (event) => {
		const { etat } = lireFormulaire(await event.request.formData(), { etat: 'entier' });
		return executer(event, `${chemin(event.params.id)}/etat`, { body: { etat }, cle: 'etat' });
	},
	droits: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			droit_attribution: 'bool',
			droit_caisse: 'bool',
			droit_activation: 'bool'
		});
		return executer(event, `${chemin(event.params.id)}/droits`, { method: 'PUT', body: valeurs, cle: 'droits', valeurs });
	},
	code: async (event) => {
		const r = await executer<CodePointage>(event, `${chemin(event.params.id)}/code-pointage`, { cle: 'code' });
		return 'donnees' in r ? { cle: 'code', succes: r.succes, code: r.donnees.code } : r;
	},
	reinitialiser: async (event) => {
		const r = await executer<LienReinitialisation & Ok>(event, `${chemin(event.params.id)}/reinitialisation`, { cle: 'mdp' });
		return 'donnees' in r ? { cle: 'mdp', succes: r.succes, lien: r.donnees } : r;
	},
	photo: async (event) => {
		const f = fichierJoint(await event.request.formData(), 'photo');
		if (!f) return fail(400, { cle: 'photo', message: 'Choisissez une image.', champs: { photo: 'Choisissez une image.' }, valeurs: {} });
		try {
			const r = await televerser<Ok>(event, `${chemin(event.params.id)}/photo`, 'fichier', f);
			return { cle: 'photo', succes: r.message };
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'photo', message: e.message, champs: e.champs, valeurs: {} });
			throw e;
		}
	}
};
