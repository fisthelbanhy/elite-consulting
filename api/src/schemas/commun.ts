/**
 * Formes de réponse partagées par tous les modules (portage de `app/schemas/commun.py`).
 * Le frontend SvelteKit dépend de ces formes : ne pas en changer les noms de champs.
 */
import { z, type ZodType } from 'zod';
import { ErreurMetier, traduire } from '../erreurs.js';
import { url } from '../services/fichiers.js';

/**
 * Contrôles portant sur **plusieurs champs à la fois** (confirmation d'un mot de passe, cohérence
 * de deux dates…). Ils reçoivent le corps brut de la requête et le dictionnaire d'erreurs en
 * cours de constitution, auquel ils ajoutent leurs messages.
 */
export type VerificationsCroisees = (
	brut: Record<string, unknown>,
	champs: Record<string, string>
) => void;

/**
 * Valide un corps de requête et lève une erreur 422 listant **tous** les champs en faute.
 *
 * Pourquoi ne pas utiliser seulement `schema.parse()` : Zod abandonne les contrôles croisés
 * (`.check()`) dès qu'un champ échoue, alors que Pydantic signalait les deux à la fois. Comme le
 * frontend affiche un message sous chaque champ, perdre la moitié des messages dégraderait le
 * formulaire — les contrôles croisés sont donc exécutés séparément, sur le corps brut.
 */
export function valider<S extends ZodType>(
	schema: S,
	corps: unknown,
	croisees?: VerificationsCroisees
): z.output<S> {
	const resultat = schema.safeParse(corps);
	const champs: Record<string, string> = {};
	if (!resultat.success) {
		for (const issue of resultat.error.issues) {
			const cle = issue.path.map(String).join('.') || '_';
			champs[cle] ??= traduire(issue);
		}
	}
	croisees?.((corps ?? {}) as Record<string, unknown>, champs);

	if (Object.keys(champs).length) {
		throw new ErreurMetier('Veuillez corriger les champs signalés.', 422, champs);
	}
	return resultat.data as z.output<S>;
}

/** Réponse d'écriture : `{message, id?, reference?}`. */
export interface Ok {
	message: string;
	id?: number | null;
	reference?: string | null;
}

export function ok(message: string, id?: number | null, reference?: string | null): Ok {
	const reponse: Ok = { message };
	if (id !== undefined) reponse.id = id;
	if (reference !== undefined) reponse.reference = reference;
	return reponse;
}

export interface Option {
	value: number;
	label: string;
}

/** Identité publique d'un membre : jamais son téléphone ni son e-mail. */
export interface Auteur {
	id: number;
	pseudonyme: string;
	categorie: number;
	photo: string | null;
	photo_url: string | null;
}

export function auteur(
	m: { id: number; pseudonyme: string; categorie: number; photo: string | null } | null | undefined
): Auteur | null {
	if (!m) return null;
	return {
		id: m.id,
		pseudonyme: m.pseudonyme,
		categorie: m.categorie,
		photo: m.photo,
		photo_url: url(m.photo)
	};
}

/** Coordonnées d'un membre, visibles seulement de l'auteur de la fiche et des gestionnaires. */
export interface ContactMembre {
	id: number;
	pseudonyme: string;
	nom: string;
	telephone: string;
	email: string | null;
}

/** Une expression de besoin ou d'intérêt, telle que la voit l'auteur de la fiche. */
export interface InteretOut {
	id: number;
	sous_type: number;
	message: string;
	date_creation: Date;
	membre: ContactMembre | null;
}

interface InteretBrut {
	id: number;
	sous_type: number;
	message: string;
	date_creation: Date;
	membre_id: number | null;
}

/**
 * Vue des contributions reçues sous une fiche, avec les coordonnées de leurs auteurs.
 * Motif commun aux emplois, à l'immobilier, aux petites annonces et aux partenariats
 * (ADR-0007 S2d) : à n'appeler que pour l'auteur de la fiche ou un gestionnaire.
 */
export function vueInterets(
	contributions: InteretBrut[],
	contacts: Map<number, ContactMembre>
): InteretOut[] {
	return contributions.map((i) => ({
		id: i.id,
		sous_type: i.sous_type,
		message: i.message,
		date_creation: i.date_creation,
		membre: i.membre_id !== null ? (contacts.get(i.membre_id) ?? null) : null
	}));
}

// --- Briques Zod réutilisées ---------------------------------------------------------------------

/**
 * Nombre entier venant d'un formulaire : accepte `12` comme `"12"`.
 * Le frontend envoie du JSON typé, mais les champs de formulaire restent des chaînes.
 */
export const entier = z.coerce.number().int();

/** Entier facultatif : `""`, `null` et `undefined` donnent `null`. */
export const entierFacultatif = z
	.union([z.literal(''), z.null(), z.undefined(), z.coerce.number().int()])
	.transform((v) => (v === '' || v === null || v === undefined ? null : v));

/** Chaîne nettoyée de ses espaces de bord, vide par défaut. */
export const texte = z.string().trim();

/** Date ISO (`2026-09-28`) ou `null`. */
export const dateFacultative = z
	.union([z.literal(''), z.null(), z.undefined(), z.iso.date()])
	.transform((v) => (v === '' || v === null || v === undefined ? null : new Date(`${v}T00:00:00`)));

/** Booléen tolérant aux formes des formulaires HTML (`"on"`, `"true"`, `1`). */
export const booleen = z
	.union([z.boolean(), z.literal('on'), z.literal('true'), z.literal('false'), z.literal(1), z.literal(0), z.literal('1'), z.literal('0'), z.literal(''), z.null(), z.undefined()])
	.transform((v) => v === true || v === 'on' || v === 'true' || v === 1 || v === '1');
