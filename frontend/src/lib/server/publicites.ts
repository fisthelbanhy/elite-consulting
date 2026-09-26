/**
 * Publicités : encart réutilisable par tous les modules et enregistrement côté gestion.
 *
 * Utilisation de l'encart dans un autre module :
 *   // +page.server.ts
 *   import { chargerEncart } from '$lib/server/publicites';
 *   export const load = async (event) => ({ publicites: await chargerEncart(event) });
 *   // +page.svelte
 *   <EncartPublicites publicites={data.publicites} />
 */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, chargerOuDefaut, fichierJoint, lireFormulaire, soumettre, televerser } from './api';
import type { Ok } from '$lib/types';
import type { PubliciteDiffusee } from '$lib/types/publicites';

type Evenement = Pick<RequestEvent, 'locals' | 'getClientAddress' | 'request'>;

/**
 * Publicités à diffuser : au plus 10 actives de la période, en ordre aléatoire (F-TRV-04).
 * Ne bloque jamais la page : en cas d'erreur, l'encart est simplement vide.
 */
export function chargerEncart(event: Evenement, options: { limite?: number; exclure?: number } = {}): Promise<PubliciteDiffusee[]> {
	return chargerOuDefaut<PubliciteDiffusee[]>(event, '/publicites/diffusion', [], {
		limite: Math.min(Math.max(options.limite ?? 10, 1), 50),
		exclure: options.exclure
	});
}

/** Création ou modification d'une publicité (gestion), puis envoi du fichier éventuel. */
export async function enregistrerPublicite(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const valeurs = lireFormulaire(fd, {
		demandeur_id: 'entier?',
		entreprise_id: 'entier?',
		texte: 'texte',
		lien: 'texte',
		date_debut: 'date?',
		date_fin: 'date?',
		type_fichier: 'entier?',
		etat: 'entier?'
	});
	const r = await soumettre<Ok>(event, id ? `/publicites/${id}` : '/publicites', {
		method: id ? 'PUT' : 'POST',
		body: valeurs,
		valeurs
	});
	if (!r.ok) return r.echec;
	const idPub = r.data.id;
	const fichier = fichierJoint(fd, 'fichier');
	if (fichier) {
		try {
			await televerser(event, `/publicites/${idPub}/fichier`, 'fichier', fichier);
		} catch (e) {
			if (e instanceof ApiError) {
				// La publicité est enregistrée : on renvoie vers sa fiche pour corriger le fichier
				if (!id) redirect(303, `/gestion/publicites/${idPub}?fichier_refuse=${encodeURIComponent(e.champs.fichier ?? e.message)}`);
				return fail(e.statut, { message: `Publicité enregistrée, mais fichier refusé : ${e.message}`, champs: e.champs, valeurs });
			}
			throw e;
		}
	}
	redirect(303, `/gestion/publicites/${idPub}?${id ? 'modifie' : 'enregistre'}=1`);
}
