/**
 * Règles de validation reprises du legacy (`incl-variable.php`).
 * Portage de `app/services/validation.py`.
 */
import { erreur } from '../erreurs.js';

export const PREFIXES_TELEPHONE = ['01', '04', '05', '06', '22'];

/** Retire espaces, points, tirets et l'indicatif +242 / 00242. */
export function normaliserTelephone(tel: string | null | undefined): string {
	if (!tel) return '';
	let t = tel.replace(/[\s.\-()]/g, '');
	for (const indicatif of ['+242', '00242']) {
		if (t.startsWith(indicatif)) t = t.slice(indicatif.length);
	}
	return t;
}

/** `phone()` legacy : vide autorisé, sinon 9 chiffres commençant par 01/04/05/06/22. */
export function telephoneValide(tel: string | null | undefined): boolean {
	const t = normaliserTelephone(tel);
	if (!t) return true;
	return t.length === 9 && /^\d+$/.test(t) && PREFIXES_TELEPHONE.includes(t.slice(0, 2));
}

export const MESSAGE_TELEPHONE =
	'Numéro invalide : 9 chiffres commençant par 01, 04, 05, 06 ou 22 (ex. 06 123 45 67).';

/**
 * `codecharden()` legacy : 13 caractères = 5 chiffres + 1 majuscule + 6 chiffres + 1 majuscule.
 */
export function codeChardenValide(code: string | null | undefined): boolean {
	if (!code) return false;
	return /^\d{5}[A-Z]\d{6}[A-Z]$/.test(code.trim());
}

/**
 * Normalise et valide un numéro, en levant l'erreur métier attendue par le frontend.
 * Retourne le numéro normalisé.
 */
export function verifierTelephone(
	tel: string | null | undefined,
	{ obligatoire = false, champ = 'telephone' }: { obligatoire?: boolean; champ?: string } = {}
): string {
	const t = normaliserTelephone(tel);
	if (obligatoire && !t) {
		throw erreur('Le numéro de téléphone est obligatoire.', {
			[champ]: 'Le numéro de téléphone est obligatoire.'
		});
	}
	if (!telephoneValide(t)) throw erreur(MESSAGE_TELEPHONE, { [champ]: MESSAGE_TELEPHONE });
	return t;
}
