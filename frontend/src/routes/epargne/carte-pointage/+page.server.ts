import type { PageServerLoad } from './$types';
import { charger, chargerOuDefaut, exigerConnexion } from '$lib/server/api';
import { exigerEpargne } from '$lib/server/epargne';
import type { ListePointages, Titulaire } from '$lib/types/epargne';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	await exigerEpargne(event);
	const q = event.url.searchParams;
	const filtres = {
		du: q.get('du') ?? '',
		au: q.get('au') ?? '',
		operateur_id: q.get('operateur_id') ?? '',
		membre_id: q.get('membre_id') ?? '',
		type_operation: q.get('type_operation') ?? '',
		montant_min: q.get('montant_min') ?? '',
		montant_max: q.get('montant_max') ?? '',
		type_caisse: q.get('type_caisse') ?? '',
		page: q.get('page') ?? '1'
	};
	const operateur = membre.est_gestionnaire || membre.point_caisse_actif;
	const [liste, titulaires] = await Promise.all([
		charger<ListePointages>(event, '/epargne/pointages', { ...filtres, taille: 50 }),
		operateur ? chargerOuDefaut<Titulaire[]>(event, '/epargne/pointages/titulaires', []) : Promise.resolve([] as Titulaire[])
	]);
	return { liste, titulaires, filtres, effectue: q.get('effectue') };
};
