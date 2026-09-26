import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ApiError, charger, fichierJoint, lireFormulaire, soumettre, televerser } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { ProduitGestion } from '$lib/types/gestion';

const nouveau = (id: string) => id === 'nouveau';

export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	const produit = nouveau(id) ? null : await charger<ProduitGestion>(event, `/gestion/referentiels/produits/${id}`);
	return { produit };
};

export const actions: Actions = {
	default: async (event) => {
		const id = event.params.id;
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, {
			groupe: 'entier',
			reference: 'texte',
			nom: 'texte',
			description: 'texte',
			prix_distributeur: 'entier',
			prix_non_distributeur: 'entier',
			prix_public: 'entier',
			quantite_stock: 'entier',
			etat: 'entier'
		});
		const r = await soumettre<Ok>(event, `/gestion/referentiels/produits${nouveau(id) ? '' : `/${id}`}`, {
			method: nouveau(id) ? 'POST' : 'PUT',
			body: valeurs,
			valeurs
		});
		if (!r.ok) return r.echec;
		const photo = fichierJoint(fd, 'photo');
		if (photo) {
			try {
				await televerser(event, `/gestion/referentiels/produits/${r.data.id}/photo`, 'fichier', photo);
			} catch (e) {
				if (e instanceof ApiError) return fail(e.statut, { message: `Produit enregistré, mais photo refusée : ${e.message}`, champs: e.champs, valeurs });
				throw e;
			}
		}
		redirect(303, `/gestion/referentiels/produits?ok=${nouveau(id) ? 'cree' : 'modifie'}`);
	}
};
