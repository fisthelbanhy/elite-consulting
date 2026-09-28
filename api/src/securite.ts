/**
 * Hachage des mots de passe et jetons de session (portage de `app/security.py`).
 *
 * Argon2id, au format PHC `$argon2id$v=19$m=…`. Ce format porte ses propres paramètres de coût :
 * les hash écrits par l'ancien backend sont donc relus ici sans conversion, et
 * réciproquement — vérifié avant la migration, voir ADR-0013.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { config } from './config.js';

/**
 * Paramètres Argon2 : les valeurs par défaut de la bibliothèque (recommandation OWASP) en
 * production, allégés uniquement pour les tests automatisés — sinon la suite passerait
 * l'essentiel de son temps à hacher des mots de passe.
 */
const OPTIONS_ARGON2 = config.estTest ? { memoryCost: 8, timeCost: 1, parallelism: 1 } : undefined;

export function hacherMotDePasse(motDePasse: string): Promise<string> {
	return argon2Hash(motDePasse, OPTIONS_ARGON2);
}

export async function verifierMotDePasse(
	motDePasse: string,
	hache: string | null | undefined
): Promise<boolean> {
	if (!hache) {
		// Coût constant : ne pas révéler qu'un compte n'existe pas (ou n'a pas de mot de passe).
		await argon2Hash(motDePasse, OPTIONS_ARGON2);
		return false;
	}
	try {
		return await argon2Verify(hache, motDePasse);
	} catch {
		// Hash illisible (donnée corrompue, autre algorithme) : refus, sans faire tomber la requête.
		return false;
	}
}

/** Retourne `[jeton en clair, SHA-256 du jeton]`. Seul le hash est stocké. */
export function nouveauJeton(): [string, string] {
	const jeton = randomBytes(32).toString('base64url');
	return [jeton, hashJeton(jeton)];
}

export function hashJeton(jeton: string): string {
	return createHash('sha256').update(jeton, 'utf8').digest('hex');
}

/** Comparaison à temps constant de deux chaînes (équivalent de `hmac.compare_digest`). */
export function comparer(a: string, b: string): boolean {
	const ba = Buffer.from(a, 'utf8');
	const bb = Buffer.from(b, 'utf8');
	if (ba.length !== bb.length) return false;
	return timingSafeEqual(ba, bb);
}
