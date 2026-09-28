/**
 * Format d'erreur unique renvoyé au frontend (portage de `app/erreurs.py`) :
 * `{"message": "…", "champs": {"nom_du_champ": "…"}}` (HTTP 400/401/403/404/422).
 *
 * Le frontend SvelteKit dépend de ce contrat (`lib/server/api.ts` remplit `form.champs`), il est
 * donc reproduit à l'identique, y compris les messages de validation en français.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodIssue } from 'zod';

export class ErreurMetier extends Error {
	constructor(
		message: string,
		public statut: number = 400,
		public champs: Record<string, string> = {}
	) {
		super(message);
		this.name = 'ErreurMetier';
	}
}

/**
 * `throw erreur('…', { champ: '…' })` — erreur de validation métier (400).
 *
 * Les champs sont passés dans un objet plutôt qu'un à un : un champ de formulaire peut très bien
 * s'appeler « message », et se confondrait alors avec le message global.
 */
export function erreur(message: string, champs: Record<string, string> = {}): ErreurMetier {
	return new ErreurMetier(message, 400, champs);
}

export function introuvable(message = 'Élément introuvable.'): ErreurMetier {
	return new ErreurMetier(message, 404);
}

export function interdit(
	message = "Vous n'avez pas le droit d'effectuer cette action."
): ErreurMetier {
	return new ErreurMetier(message, 403);
}

export function nonAuthentifie(
	message = 'Veuillez vous connecter pour accéder à cette fonctionnalité.'
): ErreurMetier {
	return new ErreurMetier(message, 401);
}

/**
 * Traduit une anomalie Zod en message français, en reprenant mot pour mot les messages que
 * l'ancien backend produisait. Le site les affiche sous le champ fautif.
 */
export function traduire(issue: ZodIssue): string {
	switch (issue.code) {
		case 'invalid_type': {
			// Zod signale un champ absent comme un type invalide reçu `undefined`.
			if (issue.input === undefined) return 'Ce champ est obligatoire.';
			switch (issue.expected) {
				case 'int':
					return 'Nombre entier attendu.';
				case 'number':
					return 'Nombre attendu.';
				case 'boolean':
					return 'Valeur oui/non attendue.';
				case 'date':
					return 'Date invalide.';
				default:
					return 'Valeur invalide.';
			}
		}
		case 'too_small': {
			const minimum = issue.minimum as number;
			if (issue.origin === 'string') return `Au moins ${minimum} caractères.`;
			if (issue.origin === 'date') return 'Date invalide.';
			return issue.inclusive
				? `Doit être supérieur ou égal à ${minimum}.`
				: `Doit être supérieur à ${minimum}.`;
		}
		case 'too_big': {
			const maximum = issue.maximum as number;
			if (issue.origin === 'string') return `Au plus ${maximum} caractères.`;
			if (issue.origin === 'date') return 'Date invalide.';
			return issue.inclusive
				? `Doit être inférieur ou égal à ${maximum}.`
				: `Doit être inférieur à ${maximum}.`;
		}
		case 'invalid_value':
			// Énumération ou littéral : valeur hors de la liste autorisée.
			return 'Valeur non autorisée.';
		case 'invalid_format':
			if (issue.format === 'email') return 'Adresse e-mail invalide.';
			if (issue.format === 'url') return 'Adresse web invalide.';
			return issue.message || 'Format invalide.';
		case 'invalid_union': {
			// Quand la clé est absente, *toutes* les branches échouent en réclamant une valeur :
			// c'est un champ obligatoire, pas une valeur invalide. Zod ne le dit qu'à travers les
			// anomalies des branches — l'anomalie d'union, elle, ne porte pas la valeur reçue.
			const branches = (issue as { errors?: ZodIssue[][] }).errors ?? [];
			const absente =
				branches.length > 0 &&
				branches.every((b) => b.every((s) => s.code === 'invalid_type' && s.input === undefined));
			if (absente) return 'Ce champ est obligatoire.';
			return issue.message && issue.message !== 'Invalid input'
				? issue.message
				: 'Valeur invalide.';
		}
		case 'custom':
			// Message posé par une règle métier (`.refine(…)`).
			return issue.message || 'Valeur invalide.';
		default:
			return issue.message || 'Valeur invalide.';
	}
}

/**
 * Transforme une `ZodError` en `ErreurMetier` 422, avec un message par champ.
 * Le premier message rencontré pour un champ gagne.
 */
export function erreurDeValidation(zodError: ZodError): ErreurMetier {
	const champs: Record<string, string> = {};
	for (const issue of zodError.issues) {
		const cle = issue.path.map(String).join('.') || '_';
		if (!(cle in champs)) champs[cle] = traduire(issue as ZodIssue);
	}
	return new ErreurMetier('Veuillez corriger les champs signalés.', 422, champs);
}

/** Vrai si l'objet ressemble à une `ZodError` (sans imposer la même instance de Zod). */
function estZodError(e: unknown): e is ZodError {
	return (
		typeof e === 'object' &&
		e !== null &&
		(e as { name?: string }).name === 'ZodError' &&
		Array.isArray((e as { issues?: unknown }).issues)
	);
}

/**
 * Middleware de traitement des erreurs, monté **après** toutes les routes.
 * Express 5 relaie automatiquement les rejets des gestionnaires `async`.
 */
export function gestionnaireDErreurs(
	e: unknown,
	_req: Request,
	res: Response,
	next: NextFunction
): void {
	if (res.headersSent) return next(e);

	if (e instanceof ErreurMetier) {
		res.status(e.statut).json({ message: e.message, champs: e.champs });
		return;
	}
	if (estZodError(e)) {
		const err = erreurDeValidation(e);
		res.status(err.statut).json({ message: err.message, champs: err.champs });
		return;
	}
	// Corps JSON illisible : Express pose `type: 'entity.parse.failed'`.
	const avecType = e as { type?: string; status?: number; statusCode?: number };
	if (avecType?.type === 'entity.parse.failed') {
		res.status(400).json({ message: 'Requête illisible.', champs: {} });
		return;
	}
	if (avecType?.type === 'entity.too.large') {
		res.status(413).json({ message: 'Fichier trop volumineux.', champs: {} });
		return;
	}

	// Tout le reste est un défaut du serveur : on journalise et on reste discret côté client.
	console.error('Erreur non traitée :', e);
	res.status(500).json({ message: "Une erreur inattendue s'est produite.", champs: {} });
}

/** Route inconnue sous `/api` : même format d'erreur que le reste. */
export function routeInconnue(_req: Request, res: Response): void {
	res.status(404).json({ message: 'Élément introuvable.', champs: {} });
}
