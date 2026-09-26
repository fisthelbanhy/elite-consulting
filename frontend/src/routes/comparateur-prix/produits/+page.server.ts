import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';
import type { Produit } from '$lib/types/comparateur';

/** Catalogue des produits du comparateur (legacy pproduitptpv.php), réservé aux gestionnaires. */
export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (!membre?.est_gestionnaire) error(403, 'Espace réservé aux gestionnaires.');
	const produits = await charger<Produit[]>(event, '/comparateur/produits', { tous: true, q: event.url.searchParams.get('q') });
	return { produits, q: event.url.searchParams.get('q') ?? '', peutModifier: membre.droit_activation };
};

export const actions: Actions = {
	creer: async (event) => {
		const valeurs = lireFormulaire(await event.request.formData(), { nom: 'texte' });
		const r = await soumettre<Ok>(event, '/comparateur/produits', { body: valeurs, valeurs, cle: 'creer' });
		if (!r.ok) return r.echec;
		return { cle: 'creer', succes: r.data.message };
	},
	modifier: async (event) => {
		const fd = await event.request.formData();
		const id = String(fd.get('id') ?? '');
		const valeurs = lireFormulaire(fd, { nom: 'texte', etat: 'entier' });
		const r = await soumettre<Ok>(event, `/comparateur/produits/${id}`, { method: 'PUT', body: valeurs, valeurs, cle: `produit-${id}` });
		if (!r.ok) return r.echec;
		return { cle: `produit-${id}`, succes: r.data.message };
	}
};
