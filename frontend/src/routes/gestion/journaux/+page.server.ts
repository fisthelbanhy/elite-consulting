import type { Actions, PageServerLoad } from './$types';
import { charger, chargerOuDefaut, lireFormulaire } from '$lib/server/api';
import { executer, filtres, taillePage } from '$lib/server/gestion';
import type { Liste } from '$lib/types';
import type { ConnexionLigne, OptionMembre, VisiteLigne } from '$lib/types/gestion';

const FILTRES = ['du', 'au', 'heure_debut', 'heure_fin', 'ip', 'membre_id', 'page'] as const;

/** Journaux (legacy `pvisite.php`, F-ADM-30 à F-ADM-33). */
export const load: PageServerLoad = async (event) => {
	const journal = event.url.searchParams.get('journal') === 'connexions' ? 'connexions' : 'visites';
	const f = filtres(event.url, FILTRES);
	const taille = taillePage(event.url);
	const [liste, membres] = await Promise.all([
		charger<Liste<VisiteLigne | ConnexionLigne>>(event, `/gestion/journaux/${journal}`, {
			...f,
			membre_id: journal === 'connexions' ? f.membre_id : undefined,
			taille
		}),
		journal === 'connexions' ? chargerOuDefaut<OptionMembre[]>(event, '/gestion/membres/options', []) : Promise.resolve([])
	]);
	return { journal, liste, membres, filtres: f, taille };
};

function nomJournal(fd: FormData) {
	return fd.get('journal') === 'connexions' ? 'connexions' : 'visites';
}

export const actions: Actions = {
	/** Purge des lignes cochées (confirmation demandée dans la page). */
	purger: async (event) => {
		const fd = await event.request.formData();
		const ids = fd.getAll('ids').map(Number).filter((n) => Number.isInteger(n) && n > 0);
		return executer(event, `/gestion/journaux/${nomJournal(fd)}/purger`, { body: { ids }, cle: 'purge' });
	},
	/** Purge de tout l'historique antérieur à une date. */
	purgerAvant: async (event) => {
		const fd = await event.request.formData();
		const { avant } = lireFormulaire(fd, { avant: 'date?' });
		return executer(event, `/gestion/journaux/${nomJournal(fd)}/purger`, { body: { avant }, cle: 'purge' });
	}
};
