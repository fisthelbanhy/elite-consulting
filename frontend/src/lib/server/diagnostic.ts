/**
 * Diagnostic gratuit : les réponses d'un visiteur sont conservées côté serveur dans un cookie
 * httpOnly **signé** (HMAC-SHA256), limité au chemin /diagnostic. Elles survivent ainsi à
 * l'inscription (`/inscription?suite=/diagnostic/enregistrer`) sans localStorage ni JavaScript.
 *
 * Clé de signature : variable d'environnement `LF_COOKIE_SECRET` (obligatoire en production) ;
 * à défaut, une clé aléatoire par processus (les diagnostics en cours sont perdus au redémarrage).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { api } from './api';
import type { QuestionDiagnostic, ReponsesDiagnostic } from '$lib/types/decouverte';

const COOKIE = 'lf_diagnostic';
const CHEMIN = '/diagnostic';
const DUREE = 60 * 60 * 24 * 7; // 7 jours
const CLE = env.LF_COOKIE_SECRET || randomBytes(32).toString('hex');
const CODE = /^[a-z0-9_]{1,40}$/;

function signer(donnees: string): string {
	return createHmac('sha256', CLE).update(donnees).digest('base64url');
}

export function lireReponses(cookies: Cookies): ReponsesDiagnostic {
	const brut = cookies.get(COOKIE);
	if (!brut) return {};
	const [donnees, signature] = brut.split('.');
	if (!donnees || !signature) return {};
	const attendue = Buffer.from(signer(donnees));
	const recue = Buffer.from(signature);
	if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return {};
	try {
		const objet = JSON.parse(Buffer.from(donnees, 'base64url').toString('utf8')) as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(objet).filter(([k, v]) => CODE.test(k) && typeof v === 'string' && CODE.test(v))
		) as ReponsesDiagnostic;
	} catch {
		return {};
	}
}

export function ecrireReponses(cookies: Cookies, reponses: ReponsesDiagnostic): void {
	const donnees = Buffer.from(JSON.stringify(reponses)).toString('base64url');
	cookies.set(COOKIE, `${donnees}.${signer(donnees)}`, {
		path: CHEMIN,
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: DUREE
	});
}

/** Effacé après l'enregistrement : rien ne reste sur un téléphone partagé. */
export function effacerReponses(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: CHEMIN });
}

let cache: { expire: number; questions: QuestionDiagnostic[] } | null = null;

/** Questions du diagnostic (API), en cache 5 minutes. */
export async function questionsDiagnostic(event: RequestEvent): Promise<QuestionDiagnostic[]> {
	if (cache && cache.expire > Date.now()) return cache.questions;
	const questions = await api<QuestionDiagnostic[]>(event, '/decouverte/diagnostic/questions', { jeton: null });
	cache = { expire: Date.now() + 5 * 60 * 1000, questions };
	return questions;
}

/** Numéro (1…n) de la première question sans réponse valide, ou null si tout est répondu. */
export function premiereManquante(questions: QuestionDiagnostic[], reponses: ReponsesDiagnostic): number | null {
	const i = questions.findIndex((q) => !q.options.some((o) => o.code === reponses[q.cle]));
	return i < 0 ? null : i + 1;
}
