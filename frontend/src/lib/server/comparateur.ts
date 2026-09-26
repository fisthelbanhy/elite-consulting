/** Comparateur de prix : accès « compte entreprise » et gestion des lignes de sa fiche. */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { api, ApiError, chargerOuDefaut, lireFormulaire, soumettre } from './api';
import type { Ok } from '$lib/types';
import type { Acces } from '$lib/types/comparateur';

const SANS_ACCES: Acces = { acces: false, motif: 'visiteur', message: null, gestionnaire: false, entreprises: [] };

/** Droit de consulter le comparateur (jamais bloquant : la page affiche l'invitation adaptée). */
export function chargerAcces(event: RequestEvent) {
	return chargerOuDefaut<Acces>(event, '/comparateur/acces', SANS_ACCES);
}

/** Ajout (sans `ligne_id`) ou modification d'une ligne d'offre / de demande. */
export async function enregistrerLigne(event: RequestEvent) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		entreprise_id: 'entier',
		offre_ou_demande: 'entier',
		produit_id: 'entier?',
		nouveau_produit: 'texte',
		unite_vente: 'texte',
		prix: 'entier',
		quantite_mensuelle: 'entier',
		fournisseur_ou_client: 'texte'
	});
	for (const k of ['prix', 'quantite_mensuelle'] as const) if (Number.isNaN(valeurs[k])) valeurs[k] = 0;
	const ligneId = String(fd.get('ligne_id') ?? '');
	const r = await soumettre<Ok>(event, ligneId ? `/comparateur/lignes/${ligneId}` : '/comparateur/lignes', {
		method: ligneId ? 'PUT' : 'POST',
		body: valeurs,
		valeurs: { ...valeurs, ligne_id: ligneId },
		cle: 'ligne'
	});
	if (!r.ok) return r.echec;
	// Après une modification, on quitte le mode édition (`?modifier=…`)
	if (ligneId) redirect(303, `${event.url.pathname}?entreprise=${valeurs.entreprise_id}&modifie=1`);
	return { cle: 'ligne', succes: r.data.message };
}

export async function supprimerLigne(event: RequestEvent) {
	const fd = await event.request.formData();
	const id = String(fd.get('ligne_id') ?? '');
	try {
		const r = await api<Ok>(event, `/comparateur/lignes/${id}`, { method: 'DELETE' });
		return { cle: 'ligne', succes: r.message };
	} catch (e) {
		if (e instanceof ApiError) return fail(e.statut, { cle: 'ligne', message: e.message, champs: e.champs, valeurs: {} });
		throw e;
	}
}

/** E-mail « Proposition des produits » envoyé par un gestionnaire à une entreprise (F-S6-22). */
export async function envoyerEmail(event: RequestEvent) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, { entreprise_id: 'entier', message: 'texte' });
	const r = await soumettre<Ok>(event, `/comparateur/entreprises/${valeurs.entreprise_id}/email`, {
		body: { message: valeurs.message },
		valeurs,
		cle: 'email'
	});
	if (!r.ok) return r.echec;
	return { cle: 'email', succes: r.data.message };
}
