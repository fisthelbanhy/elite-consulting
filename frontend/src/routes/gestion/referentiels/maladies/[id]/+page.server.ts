import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import type { Liste, Ok } from '$lib/types';
import type { MaladieDetail, ProduitGestion } from '$lib/types/gestion';

const nouveau = (id: string) => id === 'nouveau';

export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	const [maladie, produits] = await Promise.all([
		nouveau(id) ? Promise.resolve(null) : charger<MaladieDetail>(event, `/gestion/referentiels/maladies/${id}`),
		charger<Liste<ProduitGestion>>(event, '/gestion/referentiels/produits', { taille: 500 })
	]);
	return { maladie, produits: produits.items.map((p) => ({ id: p.id, nom: p.nom, reference: p.reference, etat: p.etat })) };
};

export const actions: Actions = {
	default: async (event) => {
		const id = event.params.id;
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, { libelle: 'texte', description: 'texte', etat: 'entier' });
		// Lignes répétées « produit + conseil d'utilisation », dans l'ordre du formulaire ; les lignes vides sont ignorées
		const ids = fd.getAll('produit_id').map(String);
		const conseils = fd.getAll('posologie').map(String);
		const produits = ids
			.map((p, i) => ({ produit_id: Number(p), posologie: (conseils[i] ?? '').trim() }))
			.filter((l) => l.produit_id > 0);
		const r = await soumettre<Ok>(event, `/gestion/referentiels/maladies${nouveau(id) ? '' : `/${id}`}`, {
			method: nouveau(id) ? 'POST' : 'PUT',
			body: { ...valeurs, produits },
			valeurs: { ...valeurs, produits }
		});
		if (!r.ok) return r.echec;
		redirect(303, `/gestion/referentiels/maladies?ok=${nouveau(id) ? 'cree' : 'modifie'}`);
	}
};
