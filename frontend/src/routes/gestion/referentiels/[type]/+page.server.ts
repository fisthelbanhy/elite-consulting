import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, lireFormulaire, soumettre } from '$lib/server/api';
import { filtres, idFormulaire, supprimer, taillePage } from '$lib/server/gestion';
import { invaliderReferentiels } from '$lib/server/referentiels';
import { REFERENTIELS, specFormulaire } from '$lib/components/gestion/referentiels';
import type { Liste, Ok } from '$lib/types';
import type { LigneReferentiel } from '$lib/types/gestion';

function config(type: string) {
	const cfg = REFERENTIELS[type];
	if (!cfg) error(404, 'Référentiel inconnu.');
	return cfg;
}

export const load: PageServerLoad = async (event) => {
	const cfg = config(event.params.type);
	const api = `/gestion/referentiels/${cfg.cle}`;
	const f = filtres(event.url, ['q', 'etat', 'ville_id', 'secteur_id', 'page', 'modifier'] as const);
	const parentApi = cfg.parent === 'ville' ? '/gestion/referentiels/villes' : cfg.parent === 'secteur' ? '/gestion/referentiels/secteurs' : null;
	const [liste, parents, element] = await Promise.all([
		charger<Liste<LigneReferentiel>>(event, api, {
			q: f.q,
			etat: f.etat,
			ville_id: cfg.parent === 'ville' ? f.ville_id : undefined,
			secteur_id: cfg.parent === 'secteur' ? f.secteur_id : undefined,
			page: f.page,
			taille: taillePage(event.url)
		}),
		parentApi ? charger<Liste<LigneReferentiel>>(event, parentApi, { taille: 500 }) : Promise.resolve(null),
		f.modifier ? charger<LigneReferentiel>(event, `${api}/${f.modifier}`) : Promise.resolve(null)
	]);
	const optionsParent = (parents?.items ?? []).map((p) => ({ value: p.id, label: String(p.nom ?? p.libelle ?? '') }));
	return {
		cle: cfg.cle,
		liste,
		optionsParent,
		element,
		filtres: f,
		taille: taillePage(event.url),
		enregistre: event.url.searchParams.get('ok')
	};
};

export const actions: Actions = {
	enregistrer: async (event) => {
		const cfg = config(event.params.type);
		const fd = await event.request.formData();
		const id = idFormulaire(fd);
		const valeurs = lireFormulaire(fd, specFormulaire(cfg));
		const r = await soumettre<Ok>(event, `/gestion/referentiels/${cfg.cle}${id ? `/${id}` : ''}`, {
			method: id ? 'PUT' : 'POST',
			body: valeurs,
			valeurs,
			cle: 'edition'
		});
		if (!r.ok) return r.echec;
		invaliderReferentiels();
		// Après enregistrement : retour à la liste (les filtres sont conservés, le formulaire se vide)
		const u = new URL(event.url);
		for (const k of [...u.searchParams.keys()]) if (k.startsWith('/') || k === 'modifier') u.searchParams.delete(k);
		u.searchParams.set('ok', id ? 'modifie' : 'cree');
		redirect(303, `${u.pathname}${u.search}`);
	},
	supprimer: async (event) => {
		const cfg = config(event.params.type);
		const id = idFormulaire(await event.request.formData());
		const r = await supprimer(event, `/gestion/referentiels/${cfg.cle}/${id}`);
		invaliderReferentiels();
		return r;
	}
};
