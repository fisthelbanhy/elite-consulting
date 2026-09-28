/**
 * Diagnostic gratuit (ADR-0008 : CTA principal du site).
 * Portage de `app/services/decouverte.py`.
 *
 * Huit questions courtes reprenant les questions clés de la Découverte de soi. Les réponses sont
 * des codes ; ce module est la source unique des libellés (le frontend affiche les questions
 * renvoyées par `GET /api/decouverte/diagnostic/questions`), de la restitution (profil + trois
 * prochaines étapes) et du report des réponses dans la fiche `soungangai` du membre.
 */
import { asc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { erreur } from '../erreurs.js';
import { ville } from '../schema/core.js';
import { soungangai } from '../schema/contenu.js';

/** « Autre ville » du référentiel legacy. */
const AUTRE_VILLE = 1;

export interface OptionDiagnostic {
	code: string;
	libelle: string;
	description: string | null;
}

export interface QuestionDiagnostic {
	cle: string;
	question: string;
	aide: string | null;
	options: OptionDiagnostic[];
}

export interface Profil {
	titre: string;
	texte: string;
}

export interface Etape {
	titre: string;
	texte: string;
	href: string;
}

export interface QuestionReponse {
	question: string;
	reponse: string;
}

export interface Restitution {
	profil: Profil;
	forces: string[];
	attentions: string[];
	etapes: Etape[];
	reponses: QuestionReponse[];
	resume: string;
}

type Choix = [code: string, libelle: string, description: string | null];

/** `[clé, question, aide, choix]` — l'ordre est celui des écrans. */
const QUESTIONS: [string, string, string | null, Choix[]][] = [
	[
		'activite',
		'Que faites-vous actuellement ?',
		'Choisissez ce qui vous ressemble le plus.',
		[
			['salarie', 'Je suis salarié·e', 'Dans une entreprise, une administration, une ONG…'],
			['independant', "J'ai déjà une petite activité", 'Commerce, service, artisanat, même informel'],
			['etudiant', 'Je suis étudiant·e ou en formation', null],
			['recherche', 'Je cherche du travail', null],
			['autre', 'Autre situation', 'Au foyer, à la retraite…']
		]
	],
	[
		'savoir_faire',
		"Qu'est-ce que vous savez bien faire ?",
		'Votre talent, ce pour quoi on vient vous voir.',
		[
			['commerce', 'Vendre, faire du commerce', null],
			['cuisine', 'Cuisine, pâtisserie, restauration', null],
			['beaute', 'Couture, mode, coiffure, beauté', null],
			['agriculture', 'Agriculture, élevage, pêche', null],
			['artisanat', 'Bâtiment, menuiserie, mécanique', null],
			['numerique', 'Informatique, numérique, communication', null],
			['services', "Services : transport, nettoyage, garde d'enfants…", null],
			['conseil', 'Enseigner, conseiller, gérer', null],
			['autre', 'Autre chose', 'Vous préciserez à votre conseillère']
		]
	],
	[
		'stade',
		'Où en est votre projet ?',
		null,
		[
			['cherche', 'Je cherche encore une idée', null],
			['idee', "J'ai une idée, mais je n'ai pas commencé", null],
			['debut', "J'ai commencé, je vends un peu", null],
			['croissance', 'Mon activité tourne, je veux la développer', null]
		]
	],
	[
		'besoin',
		'De quoi avez-vous le plus besoin aujourd’hui ?',
		'Une seule réponse : la plus urgente.',
		[
			['financement', "Trouver de l'argent", 'Pour démarrer, acheter du stock ou du matériel'],
			['clients', 'Trouver des clients', 'Commandes, marchés, visibilité'],
			['organisation', "Mieux m'organiser", 'Gestion, prix, épargne, temps'],
			['formalisation', 'Formaliser mon activité', 'Papiers, statut, business plan']
		]
	],
	[
		'disponibilite',
		'Combien de temps pouvez-vous y consacrer ?',
		null,
		[
			['moins5', 'Moins de 5 heures par semaine', 'Le soir ou le week-end'],
			['partiel', '5 à 20 heures par semaine', null],
			['plein', 'Presque à plein temps', null]
		]
	],
	[
		'moyens',
		'De quels moyens disposez-vous pour démarrer ?',
		null,
		[
			['rien', "Rien pour l'instant", "Ce n'est pas un problème : on part de là"],
			['epargne', "Un peu d'épargne", 'Moins de 100 000 FCFA'],
			['epargne_plus', 'Une épargne plus importante', '100 000 FCFA ou plus'],
			['materiel', 'Du matériel, un local ou du stock', null]
		]
	],
	[
		'soutien',
		'Votre entourage vous soutient-il dans ce projet ?',
		'Famille, conjoint, amis.',
		[
			['oui', "Oui, ils m'encouragent", null],
			['partiel', 'Certains oui, d’autres non', null],
			['non', 'Pas vraiment', null]
		]
	],
	[
		'ville',
		'Dans quelle ville êtes-vous ?',
		'Pour vous orienter vers les bonnes personnes près de chez vous.',
		[]
	]
];

const PROFILS: Record<string, [string, string]> = {
	cherche: [
		'Explorateur·rice',
		"Vous avez envie d'entreprendre mais l'idée n'est pas encore claire. C'est le bon moment pour " +
			'faire le point sur vos talents : beaucoup de réussites partent d’un savoir-faire qu’on a déjà.'
	],
	idee: [
		'Porteur·se d’idée',
		'Vous avez une idée : avant d’engager de l’argent, il faut la tester auprès de quelques clients ' +
			'et la chiffrer. Votre frangine vous aide à le faire pas à pas.'
	],
	debut: [
		'Entrepreneur·e qui démarre',
		'Vous vendez déjà : bravo, c’est le plus difficile. L’enjeu est maintenant de sécuriser vos ' +
			'revenus, de séparer l’argent de l’activité de celui de la maison et de fidéliser vos clients.'
	],
	croissance: [
		'Entrepreneur·e en croissance',
		'Votre activité tourne. Pour passer un cap, il faut structurer : des chiffres clairs, un dossier ' +
			'solide pour les financeurs et de nouveaux marchés.'
	]
};

const ETAPES: Record<string, [string, string, string]> = {
	decouverte: [
		'Faire votre bilan « Découverte de soi »',
		'26 questions pour mieux vous connaître, relues par votre conseillère.',
		'/decouverte-de-soi'
	],
	business_plan: [
		'Écrire votre business plan',
		'Pas à pas, pour chiffrer votre idée et convaincre un financeur.',
		'/business-plan'
	],
	likelemba: [
		'Épargner avec une Likelemba',
		'Constituez votre capital avec un groupe de confiance, sans cahier ni dispute.',
		'/likelemba'
	],
	projets: [
		'Présenter votre projet aux membres',
		'Famille, amis, diaspora : montrez où va chaque franc et recevez leur soutien.',
		'/projets'
	],
	accompagnement: [
		'Monter un dossier de financement',
		'Votre conseillère prépare avec vous un dossier bancable.',
		'/accompagnement'
	],
	marches: ['Répondre à des marchés', 'Appels d’offres publics et privés, près de chez vous.', '/marches'],
	entreprises: [
		'Faire connaître votre activité',
		'Inscrivez-vous dans l’annuaire : clients et partenaires vous trouvent.',
		'/entreprises'
	],
	partenariats: [
		'Trouver des partenaires',
		'« J’ai… je cherche… » : échangez services, matériel et contacts.',
		'/partenariats'
	],
	emplois: [
		'Assurer un revenu en attendant',
		'Des offres d’emploi relues par nos équipes, sans arnaque.',
		'/emplois'
	],
	questions: [
		'Poser vos questions',
		'Les membres et la frangine partagent leurs conseils, en public ou en privé.',
		'/questions'
	],
	reussites: [
		'Vous inspirer de ceux qui ont réussi',
		'Ils se sont lancés avant vous et racontent leur parcours.',
		'/reussites'
	],
	conseil_financier: [
		'Demander conseil sur l’argent',
		'Crédit, banque, trésorerie : un conseiller vous répond.',
		'/conseil-financier'
	]
};

const ETAPES_PAR_BESOIN: Record<string, string[]> = {
	financement: ['likelemba', 'business_plan', 'projets', 'accompagnement'],
	clients: ['marches', 'entreprises', 'partenariats'],
	organisation: ['likelemba', 'conseil_financier', 'questions'],
	formalisation: ['business_plan', 'accompagnement', 'conseil_financier']
};

/** Correspondance avec les questions Oui/Non de la fiche (1 = Oui, 2 = Non). */
const SOUTIEN_OUI_NON: Record<string, number> = { oui: 1, non: 2 };

/** « Pointe-noire » → « Pointe-Noire ». */
function capitaliser(nom: string): string {
	return nom
		.split('-')
		.map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
		.join('-');
}

export function villes(): OptionDiagnostic[] {
	const lignes = db.select().from(ville).orderBy(asc(ville.nom)).all();
	// Les deux grandes villes d'abord, « Autre ville » en dernier.
	const ordre: Record<string, number> = { brazzaville: 0, 'pointe-noire': 1 };
	const rang = (v: { id: number; nom: string }) => [
		v.id === AUTRE_VILLE ? 1 : 0,
		ordre[v.nom.toLowerCase()] ?? 2,
		v.nom
	] as const;
	lignes.sort((a, b) => {
		const [a1, a2, a3] = rang(a);
		const [b1, b2, b3] = rang(b);
		return a1 - b1 || a2 - b2 || a3.localeCompare(b3, 'fr');
	});
	return lignes.map((v) => ({ code: String(v.id), libelle: capitaliser(v.nom), description: null }));
}

export function questions(): QuestionDiagnostic[] {
	return QUESTIONS.map(([cle, question, aide, options]) => ({
		cle,
		question,
		aide,
		options:
			cle === 'ville'
				? villes()
				: options.map(([code, libelle, description]) => ({ code, libelle, description }))
	}));
}

function tableLibelles(qs: QuestionDiagnostic[]): Map<string, Map<string, string>> {
	return new Map(qs.map((q) => [q.cle, new Map(q.options.map((o) => [o.code, o.libelle]))]));
}

export type CodesDiagnostic = Record<string, string>;

/** Contrôle chaque réponse contre la liste des choix ; renvoie les codes validés. */
export function valider(entree: Record<string, unknown>): CodesDiagnostic {
	const libelles = tableLibelles(questions());
	const champs: Record<string, string> = {};
	const codes: CodesDiagnostic = {};

	for (const [cle, choix] of libelles) {
		const valeur = String(entree[cle] ?? '');
		if (!choix.has(valeur)) champs[cle] = 'Veuillez répondre à cette question.';
		else codes[cle] = valeur;
	}
	if (Object.keys(champs).length) throw erreur('Le diagnostic est incomplet.', champs);
	return codes;
}

/** Profil + points d'appui + points d'attention + 3 prochaines étapes (liens du site). */
export function restitution(codes: CodesDiagnostic): Restitution {
	const qs = questions();
	const libelles = tableLibelles(qs);
	const lib: Record<string, string> = {};
	for (const [cle, code] of Object.entries(codes)) {
		lib[cle] = libelles.get(cle)?.get(code) ?? '';
	}
	const [titre, texte] = PROFILS[codes.stade!]!;

	const forces: string[] = [];
	const attentions: string[] = [];

	if (codes.savoir_faire !== 'autre') {
		forces.push(`Un savoir-faire sur lequel bâtir : ${lib.savoir_faire!.toLowerCase()}.`);
	} else {
		forces.push('Un savoir-faire bien à vous : parlez-en à votre conseillère.');
	}
	if (codes.stade === 'debut' || codes.stade === 'croissance') {
		forces.push('Vous avez déjà des clients : votre idée est validée par le marché.');
	}
	if (codes.soutien === 'oui') {
		forces.push('Le soutien de votre entourage, un vrai atout dans les moments difficiles.');
	}
	if (codes.disponibilite === 'plein') forces.push('Du temps à consacrer à votre projet.');
	if (codes.moyens === 'epargne_plus' || codes.moyens === 'materiel') {
		forces.push('Des moyens pour démarrer sans dépendre d’un crédit.');
	}

	if (codes.moyens === 'rien') {
		attentions.push(
			'Pas encore d’épargne : commencez petit et épargnez régulièrement, par exemple en Likelemba.'
		);
	}
	if (codes.disponibilite === 'moins5') {
		attentions.push(
			'Peu de temps disponible : choisissez une activité que vous pouvez tester le soir ou le week-end.'
		);
	}
	if (codes.soutien === 'non') {
		attentions.push(
			'Vous vous sentez seul·e : c’est justement le rôle de votre frangine de vous épauler.'
		);
	}
	if (codes.stade === 'cherche') {
		attentions.push(
			'L’idée reste à trouver : partez de ce que vous savez déjà faire et de ce que les gens autour de vous achètent.'
		);
	}
	if (codes.stade === 'idee' && codes.besoin === 'financement') {
		attentions.push(
			'Avant de chercher de l’argent, chiffrez votre idée : c’est la première chose qu’on vous demandera.'
		);
	}

	const candidats: string[] = [];
	if (codes.stade === 'cherche') candidats.push('decouverte', 'reussites');
	if (
		(codes.activite === 'recherche' || codes.activite === 'etudiant') &&
		(codes.stade === 'cherche' || codes.stade === 'idee')
	) {
		candidats.push('emplois');
	}
	if (codes.stade === 'idee' && codes.besoin === 'financement') candidats.push('business_plan');
	if (codes.stade === 'croissance' && codes.besoin === 'financement') candidats.push('accompagnement');
	candidats.push(...(ETAPES_PAR_BESOIN[codes.besoin!] ?? []));
	if (codes.moyens === 'rien') candidats.push('likelemba');
	candidats.push('decouverte', 'questions', 'reussites');

	const choisies: string[] = [];
	for (const c of candidats) if (!choisies.includes(c)) choisies.push(c);
	const etapes = choisies.slice(0, 3).map((c) => {
		const [t, tx, href] = ETAPES[c]!;
		return { titre: t, texte: tx, href };
	});

	const reponses = qs.map((q) => ({ question: q.question, reponse: lib[q.cle] ?? '' }));
	const resume =
		`Profil : ${titre}. Activité actuelle : ${lib.activite!.toLowerCase()}. ` +
		`Savoir-faire : ${lib.savoir_faire!.toLowerCase()}. Projet : ${lib.stade!.toLowerCase()}. ` +
		`Besoin principal : ${lib.besoin!.toLowerCase()}. Disponibilité : ${lib.disponibilite!.toLowerCase()}. ` +
		`Moyens : ${lib.moyens!.toLowerCase()}. Soutien de l'entourage : ${lib.soutien!.toLowerCase()}. ` +
		`Ville : ${lib.ville}.`;

	return {
		profil: { titre, texte },
		forces: forces.slice(0, 3),
		attentions: attentions.slice(0, 3),
		etapes,
		reponses,
		resume
	};
}

type Fiche = typeof soungangai.$inferSelect;

/** Complète la fiche Découverte de soi sans écraser ce que le membre a déjà écrit. */
export function appliquer(fiche: Fiche, codes: CodesDiagnostic, r: Restitution): void {
	const libelles = tableLibelles(questions());
	const lib: Record<string, string> = {};
	for (const [cle, code] of Object.entries(codes)) lib[cle] = libelles.get(cle)?.get(code) ?? '';

	const valeurs: Record<string, unknown> = {
		diagnostic: { version: 1, codes, ...r },
		date_diagnostic: new Date()
	};
	if (!fiche.activite_actuelle.trim()) valeurs.activite_actuelle = lib.activite;
	if (!fiche.savoir_faire.trim()) valeurs.savoir_faire = lib.savoir_faire;
	if (!fiche.moyens_disponibles.trim()) valeurs.moyens_disponibles = lib.moyens;
	if (!fiche.entourage_valorise_activite && codes.soutien! in SOUTIEN_OUI_NON) {
		valeurs.entourage_valorise_activite = SOUTIEN_OUI_NON[codes.soutien!];
	}
	if (!fiche.a_deja_fait_commerce && (codes.stade === 'debut' || codes.stade === 'croissance')) {
		valeurs.a_deja_fait_commerce = 1;
	}
	db.update(soungangai).set(valeurs).where(eq(soungangai.id, fiche.id)).run();
	Object.assign(fiche, valeurs);
}

/** Texte du message déposé dans le fil du membre pour que la conseillère le rappelle. */
export function messageConseillere(r: Restitution): string {
	const lignes = r.reponses.map((q) => `• ${q.question} ${q.reponse}`);
	return [
		'Nouveau diagnostic',
		`Profil : ${r.profil.titre}`,
		...lignes,
		'Prochaines étapes proposées : ' + r.etapes.map((e) => e.titre).join(' ; ') + '.',
		'Merci de me rappeler pour construire mon plan d’action.'
	].join('\n');
}
