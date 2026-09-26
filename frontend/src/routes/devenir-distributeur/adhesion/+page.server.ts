/**
 * Assistant d'adhésion distributeur (legacy incl-adhesion.php) : une étape par écran, saisie
 * sauvegardée à chaque « Suivant » / « Précédent », reprise à l'étape atteinte.
 */
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import { corpsEtape, valeursBrutes } from '$lib/server/distributeur';
import type { EtapeOk, ProduitKit, SouscriptionDetail } from '$lib/types/distributeur';

const CHEMIN = '/devenir-distributeur/adhesion';

export const load: PageServerLoad = async (event) => {
	const membre = exigerConnexion(event);
	if (membre.est_gestionnaire) return { gestionnaire: true as const };
	const souscription = await charger<SouscriptionDetail | null>(event, '/distributeur/souscription');
	const atteinte = Math.max(1, souscription?.etape_courante ?? 1);
	const demandee = Number(event.url.searchParams.get('etape'));
	let etape = Number.isInteger(demandee) && demandee >= 1 ? demandee : atteinte;
	// On ne saute pas d'étape : au-delà de l'étape atteinte, on revient à celle-ci
	etape = Math.min(etape, atteinte, 10);
	const kit = etape === 9 ? await charger<ProduitKit[]>(event, '/distributeur/kit') : [];
	return { gestionnaire: false as const, souscription, etape, atteinte, kit, paye: event.url.searchParams.has('paye') };
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const etape = Number(fd.get('etape'));
		const nav = String(fd.get('nav') || 'suivant');
		// Étape « Commande » : revenir en arrière ne ré-enregistre pas le kit (il pourrait être déjà envoyé)
		if (etape === 9 && nav === 'precedent') redirect(303, `${CHEMIN}?etape=8`);
		const body = { ...corpsEtape(fd, etape), etape, avancer: nav === 'suivant', envoyer: nav === 'envoyer' };
		const r = await soumettre<EtapeOk>(event, '/distributeur/souscription', {
			method: 'PUT',
			body,
			valeurs: valeursBrutes(fd)
		});
		if (!r.ok) return r.echec;
		if (etape === 9) {
			if (nav === 'envoyer') redirect(303, `${CHEMIN}?etape=10`);
			return { succes: r.data.message };
		}
		const cible = nav === 'precedent' ? Math.max(1, etape - 1) : nav === 'suivant' ? etape + 1 : etape;
		redirect(303, `${CHEMIN}?etape=${cible}`);
	}
};
