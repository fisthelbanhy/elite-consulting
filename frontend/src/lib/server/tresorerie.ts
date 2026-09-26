/**
 * Trésorerie : lecture des formulaires et enregistrement (placement, opérations bancaires,
 * demande de crédit, contentieux). Création → fiche `?enregistre=1` ; modification → `?modifie=1`.
 */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { charger, chargerOuDefaut, exigerConnexion, lireFormulaire, soumettre } from './api';
import { actionsModeration } from './moderation';
import { chargerDialogue } from './dialogues';
import type { Liste, Ok } from '$lib/types';
import { RUBRIQUES_TRESORERIE, type CleRubrique, type CompteursTresorerie, type OperationsOk } from '$lib/types/tresorerie';

/** Liste d'une sous-rubrique + compteurs des onglets + fil « Écrire à la frangine ». */
export async function chargerListe<T>(event: RequestEvent, cle: CleRubrique, extra: Record<string, string> = {}, taille = 20) {
	exigerConnexion(event);
	const q = event.url.searchParams;
	const filtres = { q: q.get('q') ?? '', etat: q.get('etat') ?? '', page: q.get('page') ?? '1', ...extra };
	const [liste, compteurs, dialogue] = await Promise.all([
		charger<Liste<T>>(event, `/tresorerie/${cle}`, { ...filtres, taille }),
		chargerOuDefaut<CompteursTresorerie | null>(event, '/tresorerie/compteurs', null),
		chargerDialogue(event, RUBRIQUES_TRESORERIE[cle].type)
	]);
	return { liste, compteurs, dialogue, filtres, supprime: q.has('supprime') };
}

/** Fiche d'une sous-rubrique + fil de dialogue ; `?modifier=1` ouvre le formulaire. */
export async function chargerFiche<T>(event: RequestEvent, cle: CleRubrique) {
	exigerConnexion(event);
	const q = event.url.searchParams;
	const [fiche, dialogue] = await Promise.all([
		charger<T>(event, `/tresorerie/${cle}/${event.params.id}`),
		chargerDialogue(event, RUBRIQUES_TRESORERIE[cle].type)
	]);
	return { fiche, dialogue, enregistre: q.has('enregistre'), modifie: q.has('modifie'), modifier: q.has('modifier') };
}

/** Identifiant de banque d'une liste « référentiel ou non listée » (valeur « autre » → null). */
function idBanque(v: FormDataEntryValue | null): number | null {
	const s = typeof v === 'string' ? v.trim() : '';
	return /^\d+$/.test(s) ? Number(s) : null;
}

async function envoyer(event: RequestEvent, cle: CleRubrique, id: string | undefined, body: Record<string, unknown>, valeurs = body) {
	const r = await soumettre<Ok>(event, id ? `/tresorerie/${cle}/${id}` : `/tresorerie/${cle}`, {
		method: id ? 'PUT' : 'POST',
		body,
		valeurs,
		cle: 'fiche'
	});
	if (!r.ok) return r.echec;
	redirect(303, `/tresorerie/${cle}/${r.data.id}?${id ? 'modifie' : 'enregistre'}=1`);
}

export async function enregistrerPlacement(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const v = lireFormulaire(fd, {
		type_placement: 'entier?',
		montant: 'entier',
		duree_mois: 'entier',
		taux: 'decimal',
		banques: 'liste',
		secteur_activite: 'texte',
		observation: 'texte'
	});
	const body = { ...v, banques: (v.banques as string[]).map(Number).filter(Boolean) };
	return envoyer(event, 'placements', id, body, v);
}

export async function enregistrerCredit(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const v = lireFormulaire(fd, {
		montant: 'entier',
		objet: 'texte',
		duree_mois: 'entier',
		niveau_realisation: 'decimal',
		garantie: 'texte',
		delai_reponse_jours: 'entier',
		observation: 'texte',
		devis_global: 'texte',
		apport_propre: 'texte'
	});
	return envoyer(event, 'credits', id, v);
}

export const MONTANTS_CONTENTIEUX = [
	'dette_compromise',
	'revenus_journaliers',
	'revenus_hebdomadaires',
	'revenus_mensuels',
	'charges_fixes',
	'charges_variables',
	'entrees_activite_en_cours',
	'entrees_previsionnelles',
	'entrees_totales',
	'echeance_supportable'
] as const;

export async function enregistrerContentieux(event: RequestEvent, id?: string) {
	const fd = await event.request.formData();
	const spec: Record<string, 'entier' | 'texte'> = {
		activites_en_cours: 'texte',
		activite_previsionnelle: 'texte',
		echeance_actuelle: 'texte',
		elements_favorables: 'texte'
	};
	for (const m of MONTANTS_CONTENTIEUX) {
		spec[m] = 'entier';
		spec[`${m}_detail`] = 'texte';
	}
	return envoyer(event, 'contentieux', id, lireFormulaire(fd, spec));
}

// --- Opérations bancaires ---------------------------------------------------------------------

const CHAMPS_OPERATION = [
	'date_operation',
	'montant',
	'devise',
	'type_operation',
	'banque_emettrice_id',
	'banque_emettrice_nom',
	'banque_emettrice_email',
	'beneficiaire',
	'banque_beneficiaire_id',
	'banque_beneficiaire_nom',
	'banque_beneficiaire_adresse'
] as const;

/** Lit une ligne ; `suffixe` = « _0 », « _1 »… dans la grille, vide pour une fiche. */
function lireOperation(fd: FormData, suffixe = '') {
	const texte = (k: string) => String(fd.get(k + suffixe) ?? '').trim();
	const entier = (k: string) => {
		const s = texte(k).replace(/\s/g, '');
		return s === '' ? null : Number(s);
	};
	return {
		date_operation: texte('date_operation') || null,
		montant: entier('montant'),
		devise: entier('devise'),
		type_operation: entier('type_operation'),
		banque_emettrice_id: idBanque(fd.get('banque_emettrice_id' + suffixe)),
		banque_emettrice_nom: texte('banque_emettrice_nom'),
		banque_emettrice_email: texte('banque_emettrice_email'),
		beneficiaire: texte('beneficiaire'),
		banque_beneficiaire_id: idBanque(fd.get('banque_beneficiaire_id' + suffixe)),
		banque_beneficiaire_nom: texte('banque_beneficiaire_nom'),
		banque_beneficiaire_adresse: texte('banque_beneficiaire_adresse')
	};
}

/** Réaffichage : valeurs brutes saisies (y compris « autre » pour une banque non listée). */
function valeursBrutes(fd: FormData, suffixe = '') {
	const v: Record<string, unknown> = {};
	for (const c of CHAMPS_OPERATION) v[c + suffixe] = String(fd.get(c + suffixe) ?? '');
	return v;
}

export const LIGNES_MAX = 15;

export async function enregistrerOperations(event: RequestEvent) {
	const fd = await event.request.formData();
	const n = Math.min(LIGNES_MAX, Math.max(1, Number(fd.get('nombre_lignes')) || 1));
	const lignes = Array.from({ length: n }, (_, i) => lireOperation(fd, `_${i}`));
	let valeurs: Record<string, unknown> = { nombre_lignes: n };
	for (let i = 0; i < n; i++) valeurs = { ...valeurs, ...valeursBrutes(fd, `_${i}`) };
	const r = await soumettre<OperationsOk>(event, '/tresorerie/operations', { body: { lignes }, valeurs, cle: 'fiche' });
	if (!r.ok) {
		// « lignes.2.montant » (API) → « montant_2 » (champ du formulaire)
		const echec = r.echec.data;
		const champs: Record<string, string> = {};
		for (const [k, msg] of Object.entries(echec.champs)) {
			const m = k.match(/^lignes\.(\d+)\.(\w+)$/);
			champs[m ? `${m[2]}_${m[1]}` : k] = msg;
		}
		return fail(r.echec.status, { ...echec, champs });
	}
	const { reference, ids, emails } = r.data;
	redirect(303, `/tresorerie/operations/${ids[0]}?enregistre=1&lot=${ids.length}&emails=${emails}&ref=${reference ?? ''}`);
}

export async function enregistrerOperation(event: RequestEvent, id: string) {
	const fd = await event.request.formData();
	return envoyer(event, 'operations', id, lireOperation(fd), valeursBrutes(fd));
}

/** Actions communes des fiches : `?/etat`, `?/supprimer` (annulation), `?/modifier`. */
export function actionsFiche(cle: CleRubrique, modifier: (event: RequestEvent, id: string) => Promise<unknown>) {
	return {
		...actionsModeration((p) => `/tresorerie/${cle}/${p.id}`, `/tresorerie/${cle}`),
		modifier: (event: RequestEvent) => modifier(event, event.params.id as string)
	};
}
