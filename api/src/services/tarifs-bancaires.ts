/**
 * Référentiel « Bench marking » (tarifs bancaires) : initialisation à partir de
 * `$arraybenchmarking` (9 types) et `$arraybenchmarking2` (25 opérations) de `incl-variable.php`.
 * Portage de `app/services/tarifs_bancaires.py`.
 *
 * Le legacy déclarait ces deux tableaux sans jamais les utiliser ni les relier (S7-15, F-S7-43).
 * Décision : ils servent de proposition d'initialisation, déclenchée par un gestionnaire quand le
 * référentiel est vide ; chaque opération est rattachée au type le plus proche (libellés corrigés).
 * Les types « Escompte d'effets » et « Encaissement d'effets » n'ont pas d'opération legacy : le
 * gestionnaire les complète.
 */
import { ne } from 'drizzle-orm';
import { db } from '../db.js';
import { Etat } from '../enums.js';
import { benchOperation, benchType } from '../schema/finance.js';

export const TYPES = [
	'Opérations sur espèces', // 1
	'Virements', // 2
	'Chèques', // 3
	"Escompte d'effets", // 4
	"Encaissement d'effets", // 5
	'Opérations internationales', // 6
	"Principales conditions d'arrêtés et de tenue de compte", // 7
	'Placements', // 8
	'Services divers' // 9
];

/** `[libellé de l'opération, rang du type dans TYPES]` — ordre de `$arraybenchmarking2`. */
export const OPERATIONS: [string, number][] = [
	['Espèces', 1],
	['Change manuel', 1],
	['Virement entre agences de la même banque', 2],
	['Virement entre les banques de la zone CEMAC', 2],
	["Transfert vers l'étranger", 6],
	["Virement reçu de l'étranger", 6],
	['Crédit documentaire import', 6],
	['Crédit documentaire export', 6],
	['Remise documentaire import', 6],
	['Remise documentaire export', 6],
	["Remise de chèque sur l'étranger", 3],
	['Découvert en compte', 7],
	['Les prêts', 7],
	['Clôture de compte', 7],
	['Dépôt à terme', 8],
	['Compte épargne', 8],
	['Cautions et avals', 9],
	["Délivrance d'attestations", 9],
	['Mise à disposition / somme à disposition', 9],
	['Recharges', 9],
	['Autres', 9],
	['Courrier / boîtes aux lettres', 9],
	['Monétique', 9],
	["Envoi d'extrait de compte à l'étranger", 9],
	['Destruction des moyens de paiement', 9]
];

export function referentielVide(): boolean {
	const ligne = db
		.select({ id: benchType.id })
		.from(benchType)
		.where(ne(benchType.etat, Etat.SUPPRIME))
		.limit(1)
		.get();
	return ligne === undefined;
}

export function initialiser(): { types: number; operations: number } {
	const crees = db
		.insert(benchType)
		.values(TYPES.map((libelle) => ({ libelle, etat: Etat.AUTORISE })))
		.returning()
		.all();
	db.insert(benchOperation)
		.values(
			OPERATIONS.map(([libelle, rang]) => ({
				type_id: crees[rang - 1]!.id,
				libelle,
				etat: Etat.AUTORISE
			}))
		)
		.run();
	return { types: crees.length, operations: OPERATIONS.length };
}
