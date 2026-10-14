#!/usr/bin/env node
/**
 * Diagnostic d'un site déployé : dit **ce qui ne va pas et quoi corriger**, sans accès au serveur.
 *
 *     npm run verifier:production -- https://elite-consulting.app
 *
 * Né d'un déploiement où tout semblait fonctionner — l'application répondait, les pages
 * s'affichaient — alors que la base était vide, les photos absentes et la connexion impossible.
 * Chaque symptôme pris isolément était trompeur ; c'est leur **combinaison** qui désigne la cause.
 * Ce script fait cette lecture croisée à votre place.
 */
const cible = (process.argv[2] ?? '').replace(/\/$/, '');
if (!cible.startsWith('http')) {
	console.error('Usage : npm run verifier:production -- https://mon-domaine');
	process.exit(1);
}

const DELAI = 30_000;

async function obtenir(chemin) {
	const debut = Date.now();
	try {
		const rep = await fetch(`${cible}${chemin}`, {
			redirect: 'follow',
			signal: AbortSignal.timeout(DELAI),
			headers: { 'ngrok-skip-browser-warning': '1' }
		});
		const texte = await rep.text();
		return { ok: true, statut: rep.status, texte, ms: Date.now() - debut, entetes: rep.headers };
	} catch (e) {
		return { ok: false, statut: 0, texte: '', ms: Date.now() - debut, erreur: e.message };
	}
}

function json(r) {
	try {
		return JSON.parse(r.texte);
	} catch {
		return null;
	}
}

const constats = [];
const ajouter = (gravite, titre, detail) => constats.push({ gravite, titre, detail });

console.log(`Diagnostic de ${cible}\n${'─'.repeat(60)}`);

// 1. Le processus répond-il, et est-ce bien notre application ?
const sante = await obtenir('/api/sante');
if (!sante.ok) {
	ajouter('bloquant', "L'application ne répond pas", `${sante.erreur}. Est-elle démarrée ?`);
} else if (sante.statut === 404) {
	ajouter(
		'bloquant',
		"Le domaine ne sert pas l'application",
		"/api/sante répond 404 : le domaine pointe probablement sur l'hébergement statique " +
			"(public_html) et non sur l'application Node."
	);
} else if (json(sante)?.statut !== 'ok') {
	ajouter('bloquant', 'Réponse inattendue sur /api/sante', `HTTP ${sante.statut}.`);
} else {
	console.log(`✓ API joignable (${sante.ms} ms)`);
}

// 2. La base porte-t-elle les données ? (interrogée en direct, sans passer par le site)
const compte = {};
if (sante.ok && sante.statut === 200) {
	for (const [nom, chemin] of [
		['produits', '/api/boutique/produits?taille=1'],
		['emplois', '/api/emplois?taille=1'],
		['marchés', '/api/marches?taille=1']
	]) {
		const r = await obtenir(chemin);
		compte[nom] = json(r)?.total ?? null;
	}
	const total = Object.values(compte).reduce((a, b) => a + (b ?? 0), 0);
	const detail = Object.entries(compte)
		.map(([k, v]) => `${k} : ${v ?? '?'}`)
		.join(', ');
	if (total === 0) {
		ajouter(
			'bloquant',
			'La base est vide',
			`${detail}. Les données de production n'ont pas été installées : l'application a créé ` +
				"une base neuve au démarrage. Aucun compte n'existe, donc aucune connexion n'est " +
				'possible. Copiez `donnees-production/` vers LF_DATABASE_URL et LF_MEDIA_DIR ' +
				'(voir donnees-production/LISEZ-MOI.md), application arrêtée.'
		);
	} else {
		console.log(`✓ Base alimentée (${detail})`);
	}
}

// 3. Le site atteint-il l'API ? Une page qui exige des données le dit mieux que l'accueil, qui
//    tolère une API muette et s'affiche quand même — en trompant l'œil.
const page = await obtenir('/emplois');
if (page.statut === 503) {
	ajouter(
		'bloquant',
		"Le site n'atteint pas l'API",
		"/emplois répond 503 alors que l'API répond en direct : le BFF n'arrive pas à joindre " +
			"l'API par la boucle locale. Chaque formulaire répondra « Le service est momentanément " +
			'indisponible ». Le journal de démarrage porte la ligne « Site → API » qui nomme la cause.'
	);
} else if (page.statut === 200) {
	console.log(`✓ Le site atteint l'API (/emplois : ${(page.texte.length / 1024).toFixed(0)} Ko)`);
}

// 4. Les médias sont-ils servis ?
const media = await obtenir('/media/produits/legacy-pdt90.jpg');
if (media.statut === 404) {
	ajouter(
		'important',
		'Photos absentes',
		'Une photo reprise du legacy renvoie 404 : le dossier `media/` n’a pas été copié vers ' +
			"LF_MEDIA_DIR, ou la variable désigne un dossier vide."
	);
} else if (media.statut === 200) {
	console.log('✓ Médias servis');
}

// 5. HTTPS : le cookie de session est `secure`, il ne survivrait pas en clair.
if (cible.startsWith('https://')) {
	console.log('✓ Site servi en HTTPS');
} else {
	ajouter(
		'important',
		'Site servi sans HTTPS',
		'Le cookie de session est `secure` : sans HTTPS, la connexion échouera silencieusement.'
	);
}

// 6. Les formulaires sont-ils acceptés ? Une adresse publique mal déclarée les fait tous rejeter
//    en 403 — connexion comprise — sans que rien d'autre ne le laisse voir.
//
//    Le contrôle vise l'accueil, qui ne porte aucune action de formulaire, et **non** la page de
//    connexion : la protection CSRF répond avant le routage, donc un refus se voit aussi bien,
//    sans toucher au limiteur de tentatives de connexion d'un site en service. Un 403 désigne la
//    protection CSRF ; un 405 (méthode non autorisée) signifie qu'elle a laissé passer.
if (sante.ok && sante.statut === 200) {
	try {
		const rep = await fetch(`${cible}/`, {
			method: 'POST',
			redirect: 'manual',
			signal: AbortSignal.timeout(DELAI),
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: cible },
			body: ''
		});
		if (rep.status === 403) {
			ajouter(
				'bloquant',
				'Les envois de formulaire sont rejetés',
				"LF_SITE_URL ne correspond pas à l'adresse publique réelle : SvelteKit rejette tout " +
					`POST en 403 (protection CSRF). Posez LF_SITE_URL=${cible}, sans barre finale.`
			);
		} else {
			console.log(`✓ Formulaires acceptés (POST de contrôle : HTTP ${rep.status})`);
		}
	} catch (e) {
		ajouter('important', 'Contrôle des formulaires impossible', e.message);
	}
}

// --- Verdict -------------------------------------------------------------------------------------

console.log('─'.repeat(60));
if (!constats.length) {
	console.log('✓ Rien à signaler : le déploiement répond, porte ses données et accepte les envois.');
	process.exit(0);
}
for (const { gravite, titre, detail } of constats) {
	console.log(`\n${gravite === 'bloquant' ? '✗' : '!'} ${titre}\n  ${detail.replace(/\n/g, '\n  ')}`);
}
const bloquants = constats.filter((c) => c.gravite === 'bloquant').length;
console.log(
	`\n${bloquants} point(s) bloquant(s), ${constats.length - bloquants} à surveiller.`
);
process.exit(bloquants ? 1 : 0);
