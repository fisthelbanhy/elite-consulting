import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ApiError, fichierJoint, lireFormulaire, soumettre, televerser } from '$lib/server/api';
import { secteurs, villes } from '$lib/server/referentiels';
import type { MembreMoi, Ok } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const [vils, sects] = await Promise.all([villes(event), secteurs(event)]);
	return { villes: vils, secteurs: sects };
};

export const actions: Actions = {
	/** Modification du profil (F-TRV-26) : jamais le type de compte ni les droits (F-TRV-27). */
	profil: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), {
			nom: 'texte',
			pseudonyme: 'texte',
			telephone: 'texte',
			email: 'texte',
			ville_id: 'entier?',
			adresse: 'texte',
			sexe: 'entier?',
			situation_matrimoniale: 'entier?',
			nombre_enfants: 'entier',
			employeur: 'texte',
			numero_piece_identite: 'texte',
			forme_juridique: 'entier?',
			type_partenaire: 'entier?',
			domaine_activite_id: 'entier?'
		});
		const r = await soumettre<MembreMoi>(event, '/auth/profil', { method: 'PUT', body: valeurs, valeurs, cle: 'profil' });
		if (!r.ok) return r.echec;
		return { cle: 'profil', succes: 'Modification effectuée.' }; // F-TRV-30
	},
	photo: async (event) => {
		const f = fichierJoint(await event.request.formData(), 'photo');
		if (!f) return fail(400, { cle: 'photo', message: 'Choisissez une photo.', champs: { photo: 'Choisissez une photo.' }, valeurs: {} });
		try {
			await televerser<MembreMoi>(event, '/auth/profil/photo', 'photo', f);
			return { cle: 'photo', succes: 'Photo enregistrée.' };
		} catch (e) {
			if (e instanceof ApiError) return fail(e.statut, { cle: 'photo', message: e.message, champs: e.champs, valeurs: {} });
			throw e;
		}
	},
	motDePasse: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { actuel: 'texte', nouveau: 'texte', confirmation: 'texte' });
		const r = await soumettre<Ok>(event, '/auth/mot-de-passe', { body: valeurs, valeurs, cle: 'mdp' });
		if (!r.ok) return r.echec;
		return { cle: 'mdp', succes: r.data.message };
	},
	identifiant: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { identifiant: 'texte', mot_de_passe: 'texte' });
		const r = await soumettre<Ok>(event, '/espace/identifiant', { method: 'PUT', body: valeurs, valeurs, cle: 'identifiant' });
		if (!r.ok) return r.echec;
		return { cle: 'identifiant', succes: 'Votre identifiant de connexion est modifié.' };
	},
	codePointage: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { mot_de_passe: 'texte', code: 'texte', confirmation: 'texte' });
		const r = await soumettre<Ok>(event, '/espace/code-pointage', { method: 'PUT', body: valeurs, valeurs: {}, cle: 'code' });
		if (!r.ok) return r.echec;
		return { cle: 'code', succes: r.data.message };
	}
};
