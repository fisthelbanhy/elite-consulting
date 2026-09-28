/**
 * Génération des références métier, au format exact du legacy (`fonctreference()`) :
 * PRÉFIXE + mois sur 2 chiffres + compteur global + année sur 2 chiffres.
 * Ex. : `DEI` + `11` + `21` + `17` → `DEI112117`.
 *
 * Portage de `app/services/references.py`.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { parametre } from '../schema/core.js';
import { groupeLikelemba } from '../schema/fonds.js';

/** `$arraycodereference`. */
export const Prefixe = {
	MEMBRE: 'MBR',
	SOUNGANGAI: 'LSG',
	DEMANDE_EMPLOI: 'DEI',
	OFFRE_EMPLOI: 'OE1',
	IMMOBILIER: 'IMB',
	ARTICLE: 'ACL',
	COURSE: 'CRS',
	PROJET: 'PJT',
	LIKELEMBA: 'LKB',
	FOND_SOUTIEN: 'FDS',
	BUSINESS_PLAN: 'BSP',
	PARTENARIAT: 'PTR',
	ENTREPRISE: 'ENT',
	MARCHE: 'MCH',
	CONSEIL_FINANCE: 'CFR',
	ACCOMP_BUSINESS_PLAN: 'ABP',
	ACCOMP_PROJET_AGRICOLE: 'APA',
	ACCOMP_RESTRUCTURATION: 'ARC',
	ACCOMP_CREDIT_IMMOBILIER: 'ACI',
	PLACEMENT: 'PCM',
	OPERATION_BANQUE: 'OPB',
	DEMANDE_CREDIT: 'DDC',
	CONTENTIEUX: 'CCT',
	APPEL_FOND: 'ALF',
	APPORT_FOND: 'ATF',
	REUSSITE: 'RST',
	PUBLICITE: 'PUB',
	CONSEIL: 'CSL',
	POINT_CAISSE: 'PCS',
	SOUSCRIPTION: 'SOA'
} as const;

function deuxChiffres(n: number): string {
	return String(n).padStart(2, '0');
}

/** `%m` puis `%y` de la date, comme le formatage Python d'origine. */
function moisEtAnnee(d: Date): { mois: string; annee: string } {
	return { mois: deuxChiffres(d.getMonth() + 1), annee: deuxChiffres(d.getFullYear() % 100) };
}

/**
 * Incrémente un compteur du paramétrage et renvoie sa nouvelle valeur.
 * L'incrément et la lecture sont faits par une seule instruction SQL : deux références demandées
 * en même temps ne peuvent pas recevoir le même numéro.
 */
function incrementer(colonne: 'compteur_reference' | 'compteur_membre'): number {
	const ligne = db
		.update(parametre)
		.set({ [colonne]: sql`${parametre[colonne]} + 1` })
		.where(eq(parametre.id, 1))
		.returning({ valeur: parametre[colonne] })
		.get();
	if (!ligne) throw new Error('Paramétrage introuvable (ligne parametre id=1).');
	return ligne.valeur;
}

export function nouvelleReference(prefixe: string, maintenant?: Date): string {
	const n = incrementer('compteur_reference');
	const { mois, annee } = moisEtAnnee(maintenant ?? new Date());
	return `${prefixe.toUpperCase()}${mois}${n}${annee}`;
}

export function nouveauCodeMembre(): string {
	const n = incrementer('compteur_membre');
	const { mois, annee } = moisEtAnnee(new Date());
	return `MBR${mois}${n}${annee}`;
}

/** `{n}{code_groupe}` — n = rang d'entrée dans le groupe (`fonctreference1(10, …)`). */
export function codeAdhesionLikelemba(groupeId: number, code: string): string {
	const ligne = db
		.update(groupeLikelemba)
		.set({ compteur_entrees: sql`${groupeLikelemba.compteur_entrees} + 1` })
		.where(eq(groupeLikelemba.id, groupeId))
		.returning({ valeur: groupeLikelemba.compteur_entrees })
		.get();
	if (!ligne) throw new Error('Groupe Likelemba introuvable.');
	return `${ligne.valeur}${code}`;
}

/** `{code_groupe}P{n}` — n = numéro de paiement dans le groupe (`fonctreference1(11, …)`). */
export function numeroRecuLikelemba(groupeId: number, code: string): string {
	const ligne = db
		.update(groupeLikelemba)
		.set({ compteur_paiements: sql`${groupeLikelemba.compteur_paiements} + 1` })
		.where(eq(groupeLikelemba.id, groupeId))
		.returning({ valeur: groupeLikelemba.compteur_paiements })
		.get();
	if (!ligne) throw new Error('Groupe Likelemba introuvable.');
	return `${code}P${ligne.valeur}`;
}
