/**
 * Envoi d'e-mails (legacy `incl-envoimail.php`). Sans SMTP configuré, les e-mails sont
 * écrits dans le journal — pratique en développement.
 *
 * Portage de `app/services/emails.py`. L'envoi est **asynchrone et jamais bloquant** : une panne
 * du serveur SMTP ne doit pas faire échouer l'action du membre (inscription, contact…).
 */
import { createTransport, type Transporter } from 'nodemailer';
import { config } from '../config.js';

let transporteur: Transporter | null = null;

function obtenirTransporteur(): Transporter | null {
	if (!config.smtpHost) return null;
	transporteur ??= createTransport({
		host: config.smtpHost,
		port: config.smtpPort,
		// STARTTLS sur le port 587, TLS direct sur le 465.
		secure: config.smtpPort === 465,
		requireTLS: config.smtpPort !== 465,
		auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
		connectionTimeout: 15_000
	});
	return transporteur;
}

/** Messages capturés pendant les tests, à la place d'un envoi réel. */
export const boiteDeTest: { destinataire: string; sujet: string; texte: string }[] = [];

export async function envoyer(
	destinataire: string,
	sujet: string,
	texte: string,
	repondreA?: string
): Promise<boolean> {
	if (!destinataire) return false;

	if (config.estTest) {
		boiteDeTest.push({ destinataire, sujet, texte });
		return true;
	}

	const smtp = obtenirTransporteur();
	if (!smtp) {
		console.warn(
			`[e-mail non envoyé — SMTP non configuré] À : ${destinataire} | ${sujet}\n${texte}`
		);
		return false;
	}
	try {
		await smtp.sendMail({
			from: config.smtpFrom,
			to: destinataire,
			subject: sujet,
			text: texte,
			...(repondreA ? { replyTo: repondreA } : {})
		});
		return true;
	} catch (e) {
		console.error(`Échec d'envoi d'e-mail à ${destinataire} :`, e);
		return false;
	}
}

/**
 * Envoie sans attendre et sans jamais propager d'erreur — remplace le `BackgroundTasks` de
 * FastAPI. À utiliser quand l'e-mail accompagne une action mais ne la conditionne pas.
 */
export function envoyerEnArrierePlan(
	destinataire: string,
	sujet: string,
	texte: string,
	repondreA?: string
): void {
	void envoyer(destinataire, sujet, texte, repondreA).catch(() => false);
}
