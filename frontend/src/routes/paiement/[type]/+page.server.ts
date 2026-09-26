/**
 * Page de paiement générique (ADR-0006) : `/paiement/{type_objet}?objet={id}`.
 * Les modules y renvoient simplement le membre ; le montant et le libellé viennent de l'API.
 */
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, lireFormulaire, soumettre } from '$lib/server/api';
import type { Ok } from '$lib/types';

export interface Preparation {
	type_objet: number;
	objet_id: number | null;
	libelle: string;
	montant: number | null;
	retour: string;
	consignes: Record<string, string>;
	numeros: string[];
}

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const objet = event.url.searchParams.get('objet');
	const preparation = await charger<Preparation>(event, '/paiements/preparer', {
		type_objet: event.params.type,
		objet_id: objet
	});
	return { preparation };
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const valeurs = lireFormulaire(fd, { mode: 'entier', montant: 'entier?', remarque: 'texte' });
		const objet = event.url.searchParams.get('objet');
		const r = await soumettre<Ok>(event, '/paiements', {
			body: { ...valeurs, type_objet: Number(event.params.type), objet_id: objet ? Number(objet) : null },
			valeurs
		});
		if (!r.ok) return r.echec;
		const retour = String(fd.get('retour') || '/espace/paiements');
		redirect(303, `${retour}${retour.includes('?') ? '&' : '?'}paye=1`);
	}
};
