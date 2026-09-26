import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError, chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { chargerAcces, enregistrerLigne, supprimerLigne } from '$lib/server/comparateur';
import type { FicheDetail, Produit } from '$lib/types/comparateur';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const q = event.url.searchParams;
	const acces = await chargerAcces(event);
	const vide = { acces, fiche: null as FicheDetail | null, erreur: null as string | null, produits: [] as Produit[], ligne: null, modifie: false };
	if (!acces.acces) return vide;
	let fiche: FicheDetail;
	try {
		fiche = await api<FicheDetail>(event, '/comparateur/ma-fiche', { query: { entreprise_id: q.get('entreprise') } });
	} catch (e) {
		if (e instanceof ApiError) {
			if (e.statut === 400) return { ...vide, erreur: e.message }; // pas encore d'entreprise
			error(e.statut, e.message);
		}
		throw e;
	}
	const produits = await chargerOuDefaut<Produit[]>(event, '/comparateur/produits', []);
	const modifier = q.get('modifier');
	const ligne = modifier ? ([...fiche.offres, ...fiche.demandes].find((l) => String(l.id) === modifier) ?? null) : null;
	return { acces, fiche, erreur: null, produits, ligne, modifie: q.has('modifie') };
};

export const actions: Actions = {
	enregistrer: enregistrerLigne,
	supprimer: supprimerLigne
};
