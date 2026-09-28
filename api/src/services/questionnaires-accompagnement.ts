/**
 * Configuration des 4 questionnaires d'accompagnement (legacy `incl-acomp*.php`).
 * Portage de `app/services/questionnaires_accompagnement.py`.
 *
 * Libellés repris de `$arrayaccomp…2[N]` (`incl-variable.php`), orthographe corrigée sans changer
 * le sens ; découpage en sections (`…0`) et sous-sections (`…1`) reproduit à l'identique à partir
 * des numéros de zone où le legacy affichait les titres (inventaire S7-4 à S7-7).
 *
 * Chaque réponse est stockée dans `dossier_accompagnement.reponses` sous la clé `String(zone)` ;
 * la zone 03 (« Objet ») est la colonne `objet`. Aucune zone n'est oubliée à l'enregistrement
 * (correctif S7a, dont la question 48 de la restructuration de crédit).
 */
import { TypeAccompagnement } from '../enums.js';
import { Prefixe } from './references.js';

/** `strlen(zone03) < 10` → erreur (legacy, F-S7-18). */
export const OBJET_MIN = 10;
export const MESSAGE_OBJET = "Veuillez indiquer l'objet avec 10 caractères minimum.";
/** Garde-fou : le legacy n'avait aucune limite. */
export const REPONSE_MAX = 10_000;

export interface Question {
	zone: number;
	libelle: string;
	aide: string;
}

/** Suite de questions d'une section ; `titre` = sous-section legacy (affichée en retrait). */
export interface Groupe {
	titre: string | null;
	questions: Question[];
}

export interface Section {
	numero: number;
	titre: string;
	groupes: Groupe[];
}

export interface Questionnaire {
	type: number;
	slug: string;
	libelle: string;
	prefixe: string;
	accroche: string;
	description: string;
	pour_qui: string;
	/** « business plan », « de projet agricole »… */
	nom_message: string;
	nom_doublon: string;
	sections: Section[];
	zones: number[];
	nombre_questions: number;
	message_sauvegarde: string;
	message_envoi: string;
	message_doublon: string;
}

type Libelles = Record<number, string>;
type SousSection = [debut: number, fin: number, titre: string];

/**
 * Reproduit la boucle d'affichage legacy : une section commence à chaque zone de `sections` ;
 * une sous-section couvre les zones [début, fin] ; les autres questions sont « à plat ».
 */
function construire(
	libelles: Libelles,
	sections: Libelles,
	sousSections: SousSection[],
	aides: Libelles = {}
): { sections: Section[]; zones: number[] } {
	const debuts = Object.keys(sections)
		.map(Number)
		.sort((a, b) => a - b);
	const zones = Object.keys(libelles)
		.map(Number)
		.sort((a, b) => a - b);
	const resultat: Section[] = [];

	debuts.forEach((debut, i) => {
		const fin = i + 1 < debuts.length ? debuts[i + 1]! - 1 : zones.at(-1)!;
		const groupes: Groupe[] = [];
		let titreCourant: string | null = null;
		let courant: Question[] = [];
		for (let z = debut; z <= fin; z++) {
			const titre = sousSections.find(([d, f]) => d <= z && z <= f)?.[2] ?? null;
			if (courant.length && titre !== titreCourant) {
				groupes.push({ titre: titreCourant, questions: courant });
				courant = [];
			}
			titreCourant = titre;
			courant.push({ zone: z, libelle: libelles[z]!, aide: aides[z] ?? '' });
		}
		if (courant.length) groupes.push({ titre: titreCourant, questions: courant });
		resultat.push({ numero: i + 1, titre: sections[debut]!, groupes });
	});
	return { sections: resultat, zones };
}

// --- 1. Business plan bancable (zones 04..58, préfixe ABP) ---------------------------------------

const BP: Libelles = {
	4: "Dénomination de l'entreprise",
	5: "Historique",
	6: "Forme juridique",
	7: "Siège social",
	8: "Nature d'activité",
	9: "Lieu d'implantation",
	10: "Montant du capital social",
	11: "Composition du capital",
	12: "Gérant statutaire de la société",
	13: "Présentation des promoteurs ou actionnaires",
	14: "Données générales sur le Congo",
	15: "Secteur d'activité",
	16: "Cadre institutionnel",
	17: "Cadre environnemental",
	18: "Définition des produits finis",
	19: "Monde",
	20: "Zone CEMAC",
	21: "Caractéristiques du marché congolais",
	22: "Monde",
	23: "Zone CEMAC",
	24: "Congo",
	25: "Concurrence",
	26: "Les prix",
	27: "Conclusion",
	28: "Localisation",
	29: "Cadre géographique",
	30: "Environnement économique",
	31: "Acteurs majeurs de la production du produit fini ou du service",
	32: "Caractéristiques générales",
	33: "Justification",
	34: "Site de réalisation du projet",
	35: "Objectifs",
	36: "Caractéristiques techniques",
	37: "Échéancier et implantation",
	38: "Approvisionnement en matières premières",
	39: "Transformation et production des produits finis",
	40: "Planning de réalisation du projet",
	41: "Niveau de réalisation actuel du projet",
	42: "Besoin en matériel",
	43: "Besoin en ressources humaines",
	44: "Approche marketing",
	45: "Politique de publicité",
	46: "Définition des canaux de distribution et des débouchés",
	47: "Marché potentiel",
	48: "Prévisions de vente",
	49: "Devis global du projet",
	50: "Programme détaillé des investissements",
	51: "Financement du projet",
	52: "Définition des moyens de financement",
	53: "Coût du crédit",
	54: "Bilan d'ouverture",
	55: "Compte d'exploitation prévisionnel",
	56: "Analyse des soldes intermédiaires de gestion et des ratios significatifs",
	57: "Bilan prévisionnel",
	58: "Tableau de financement"
};
const BP_SECTIONS: Libelles = { 4: "Identification de l'entreprise et du promoteur", 14: "Environnement socio-économique", 18: "Marché", 28: "Environnement de la zone du projet", 32: "Description du projet", 49: "Études financières" };
const BP_SOUS: SousSection[] = [
	[19, 20, "Le marché des produits finis"],
	[22, 24, "Structure de la consommation"],
	[38, 48, "Organisation générale"]
];

// --- 2. Projet agricole (zones 04..80, préfixe APA) ----------------------------------------------

const PA: Libelles = {
	4: "Dénomination de l'entreprise",
	5: "Historique",
	6: "Forme juridique",
	7: "Siège social",
	8: "Nature d'activité",
	9: "Lieu d'implantation",
	10: "Montant du capital social",
	11: "Composition du capital",
	12: "Gérant statutaire de la société",
	13: "Présentation des promoteurs ou actionnaires",
	14: "Données générales sur le Congo",
	15: "Secteur agricole",
	16: "Cadre institutionnel",
	17: "Cadre environnemental",
	18: "Définition des produits finis",
	19: "Monde",
	20: "Zone CEMAC",
	21: "Congo",
	22: "Monde",
	23: "Zone CEMAC",
	24: "Congo",
	25: "Production locale actuelle",
	26: "État de la demande",
	27: "Opportunités à saisir",
	28: "Mécanismes à mettre en place",
	29: "Coût de la mise en place du mécanisme",
	30: "La concurrence",
	31: "Difficultés rencontrées par les concurrents",
	32: "Stratégie pour surmonter les difficultés actuelles",
	33: "Prix du marché",
	34: "Clients potentiels",
	35: "Stratégie commerciale",
	36: "Quelle localisation ?",
	37: "Quelle superficie ?",
	38: "Quelle culture ?",
	39: "La qualité de la terre",
	40: "La qualité de la production sur cette terre",
	41: "La qualité du grain semé",
	42: "Les engrais utilisés",
	43: "Qualité du grain récolté",
	44: "Justification",
	45: "Site de réalisation du projet",
	46: "Objectifs",
	47: "Caractéristiques, échéancier et implantation",
	48: "Type de plan",
	49: "Organisation actuelle sur place",
	50: "La surveillance des champs",
	51: "L'arrosage ou l'irrigation",
	52: "Planning de réalisation du projet",
	53: "Niveau de réalisation actuel du projet",
	54: "Approvisionnement en matière première",
	55: "Actifs disponibles (tracteurs…)",
	56: "Approvisionnement en engrais, graines",
	57: "Besoin en ressources humaines",
	58: "Coût d'approvisionnement",
	59: "Transformation et production des produits finis",
	60: "Quel sera le produit fini ?",
	61: "Actifs disponibles (machines…)",
	62: "Production escomptée",
	63: "Quantité de matière première nécessaire pour obtenir la production de produits finis voulue",
	64: "Besoin en ressources humaines",
	65: "Coût de production du produit fini",
	66: "Chiffre d'affaires attendu",
	67: "Approche marketing",
	68: "Politique de publicité",
	69: "Définition des canaux de distribution et des débouchés",
	70: "Marché potentiel",
	71: "Prévisions de vente",
	72: "Devis global du projet",
	73: "Programme détaillé des investissements",
	74: "Définition des moyens de financement",
	75: "Coût du crédit",
	76: "Bilan d'ouverture",
	77: "Compte d'exploitation prévisionnel",
	78: "Analyse des soldes intermédiaires de gestion et des ratios significatifs",
	79: "Bilan prévisionnel",
	80: "Tableau de financement"
};
const PA_SECTIONS: Libelles = { 4: "Identification de l'entreprise et du promoteur", 14: "Environnement socio-économique", 18: "Marché", 36: "Description du projet", 72: "Études financières" };
const PA_SOUS: SousSection[] = [
	[19, 21, "Le marché des produits finis"],
	[22, 24, "Structure de la consommation"],
	[25, 35, "Caractéristiques du marché congolais"],
	[36, 44, "Contexte et justification"],
	[48, 53, "Organisation générale"],
	[54, 65, "Méthode de production"],
	[66, 71, "Mise en marché des produits"],
	[76, 80, "Analyse financière du projet"]
];

// --- 3. Restructuration de crédit (zones 04..48, préfixe ARC) ------------------------------------

const RC: Libelles = {
	4: "Historique de la société",
	5: "Date de création",
	6: "Développement progressif de la société",
	7: "Évolution des activités",
	8: "Patrimoine actuel",
	9: "Activité actuelle",
	10: "Clients",
	11: "Fournisseurs",
	12: "Délais de règlement clients",
	13: "Délais de règlement fournisseurs",
	14: "Points de vente",
	15: "Heures et jours d'ouverture",
	16: "Nombre de personnes employées",
	17: "Qualification du personnel",
	18: "Réalisations déjà faites",
	19: "Point sur vos actifs",
	20: "Prévisions d'activité",
	21: "Contrats existants et en cours de négociation",
	22: "Objet du crédit",
	23: "Modalités de remboursement",
	24: "Anciennes prévisions d'entrées",
	25: "De quelle manière le remboursement du crédit devait-il se faire ?",
	26: "Point sur ce qui a été réalisé dans le cadre du projet",
	27: "Point sur ce qui a été réalisé dans le cadre du remboursement de la dette",
	28: "Historique du dossier : pourquoi cette situation ?",
	29: "En quoi consistait le projet ?",
	30: "Qui était le maître d'œuvre ?",
	31: "Site du projet",
	32: "Caractéristiques du projet",
	33: "Devis du projet réalisé",
	34: "Part de financement sur fonds propres",
	35: "Part de financement sur concours bancaire",
	36: "Situation actuelle du projet",
	37: "Quelle appréciation faites-vous de la réalisation du projet ?",
	38: "Description de vos actifs actuels",
	39: "Difficultés rencontrées : pourquoi le non-remboursement ?",
	40: "Solutions envisagées pour y remédier",
	41: "Comment l'entreprise compte-t-elle s'organiser pour couvrir les échéances convenues ?",
	42: "Expertise du bien",
	43: "Situation du bien",
	44: "Contexte économique",
	45: "Les prix sur le marché",
	46: "La concurrence",
	47: "Revenus attendus dans le cas d'une exploitation à plein régime ou normale",
	48: "Compte d'exploitation simplifié justifiant la situation actuelle" // enfin enregistrée (S7a)
};
const RC_SECTIONS: Libelles = { 4: "Historique et activités de la société", 22: "Historique du crédit", 29: "Objet du crédit", 39: "Point sur la situation actuelle" };
const RC_SOUS: SousSection[] = [
	[44, 48, "Point sur l'environnement du projet"]
];

// --- 4. Crédit immobilier (zones 04..38, préfixe ACI) -------------------------------------------

const CI: Libelles = {
	4: "Historique et présentation de la société",
	5: "Depuis la création de l'entreprise, quelles sont les réalisations de la société en termes de gestion ou d'acquisition de patrimoine ?",
	6: "Détail du parc immobilier de la société",
	7: "Revenus générés par l'exploitation de l'actif immobilier de la société",
	8: "État récapitulatif du chiffre d'affaires et du résultat générés par l'activité de la société",
	9: "Les associés, les dirigeants, leur moralité et leur expérience dans le domaine",
	10: "Le positionnement de la société dans le secteur par rapport à la concurrence",
	11: "Moralité des dirigeants",
	12: "La société a-t-elle d'autres immeubles mis en exploitation ?",
	13: "À quoi servira exactement le financement demandé ?",
	14: "Situation du terrain et superficie",
	15: "État des lieux actuel",
	16: "Quelle est la valeur du terrain ?",
	17: "Le détail des sommes déjà engagées dans le cadre dudit projet",
	18: "Niveau de réalisation actuel du projet",
	19: "Devis détaillé des travaux",
	20: "Les différentes étapes d'évolution des travaux et leur financement",
	21: "Date de début des travaux et planning de réalisation",
	22: "Qui est le maître d'ouvrage ?",
	23: "Quel est le cabinet de contrôle ?",
	24: "Description du projet",
	25: "La conception des chambres (dans quel but ?)",
	26: "Le revêtement de la façade",
	27: "Le parking",
	28: "Dispositions pour l'alimentation en eau et en électricité",
	29: "Les mesures de sécurité",
	30: "Les ascenseurs, les escaliers",
	31: "Le service de gardiennage et les concierges",
	32: "La capacité du projet",
	33: "Quelles sont les prévisions d'occupation (négociations, lettres d'intention…) ?",
	34: "Quel est le taux d'occupation actuel ?",
	35: "Revenus attendus dans le cas d'une exploitation à 70 %",
	36: "Quels sont les prix appliqués par rapport à ceux du marché immobilier ?",
	37: "Joindre un prévisionnel d'exploitation",
	38: "Quelle est la stratégie commerciale ?"
};
const CI_SECTIONS: Libelles = { 4: "Activité", 12: "Financement et projet" };
const CI_SOUS: SousSection[] = [
	[25, 31, "Comment sera l'immeuble"]
];

const CI_AIDES: Libelles = { 37: "Résumez-le ici : votre conseiller vous demandera le document complet." };

function creer(
	type: number,
	slug: string,
	libelle: string,
	prefixe: string,
	accroche: string,
	description: string,
	pour_qui: string,
	nom_message: string,
	nom_doublon: string,
	libelles: Libelles,
	sections: Libelles,
	sous: SousSection[],
	aides?: Libelles
): Questionnaire {
	const construit = construire(libelles, sections, sous, aides);
	return {
		type,
		slug,
		libelle,
		prefixe,
		accroche,
		description,
		pour_qui,
		nom_message,
		nom_doublon,
		sections: construit.sections,
		zones: construit.zones,
		nombre_questions: construit.zones.length,
		message_sauvegarde: `Votre accompagnement ${nom_message} est sauvegardé.`,
		message_envoi: `Votre accompagnement ${nom_message} est enregistré et envoyé.`,
		message_doublon: `Fiche d'accompagnement ${nom_doublon} du membre déjà enregistrée.`
	};
}

/** Les 4 questionnaires, dans l'ordre du menu legacy (clé = `type_dossier`). */
export const QUESTIONNAIRES = new Map<number, Questionnaire>(
	[
		creer(
			TypeAccompagnement.BUSINESS_PLAN,
			'business-plan',
			'Business plan bancable',
			Prefixe.ACCOMP_BUSINESS_PLAN,
			"Un dossier que votre banquier lira jusqu'au bout.",
			'Entreprise, marché, description du projet et études financières : nous structurons avec vous ' +
				'le business plan attendu par les banques et les investisseurs.',
			'Créateurs et dirigeants de PME qui cherchent un financement bancaire.',
			'business plan',
			'business plan',
			BP,
			BP_SECTIONS,
			BP_SOUS
		),
		creer(
			TypeAccompagnement.PROJET_AGRICOLE,
			'projet-agricole',
			'Projet agricole',
			Prefixe.ACCOMP_PROJET_AGRICOLE,
			'De la parcelle au marché, un projet chiffré.',
			'Terre, culture, production, mise en marché et analyse financière : le dossier complet ' +
				"d'un projet agricole ou agro-alimentaire, prêt à être présenté.",
			'Agriculteurs, coopératives et porteurs de projets agro-alimentaires.',
			'de projet agricole',
			'projet agricole',
			PA,
			PA_SECTIONS,
			PA_SOUS
		),
		creer(
			TypeAccompagnement.RESTRUCTURATION_CREDIT,
			'restructuration-credit',
			'Restructuration de crédit',
			Prefixe.ACCOMP_RESTRUCTURATION,
			'Renégocier plutôt que subir.',
			"Historique de l'entreprise et du crédit, situation actuelle et solutions : nous préparons " +
				'avec vous les arguments pour renégocier vos échéances avec la banque.',
			"Entreprises en difficulté de remboursement d'un crédit.",
			'de restructuration de crédit',
			'restructuration de crédit',
			RC,
			RC_SECTIONS,
			RC_SOUS
		),
		creer(
			TypeAccompagnement.CREDIT_IMMOBILIER,
			'credit-immobilier',
			'Crédit immobilier',
			Prefixe.ACCOMP_CREDIT_IMMOBILIER,
			'Construire, louer, rembourser : un projet solide.',
			"Activité de la société, terrain, travaux, conception de l'immeuble et revenus attendus : " +
				"le dossier de financement d'un projet immobilier locatif.",
			'Sociétés et investisseurs qui financent un immeuble de rapport.',
			'de crédit immobilier',
			'crédit immobilier',
			CI,
			CI_SECTIONS,
			CI_SOUS,
			CI_AIDES
		)
	].map((q) => [q.type, q])
);

export const PAR_SLUG = new Map<string, Questionnaire>(
	[...QUESTIONNAIRES.values()].map((q) => [q.slug, q])
);

export function questionnaire(type: number): Questionnaire | undefined {
	return QUESTIONNAIRES.get(type);
}

/** Toutes les zones du questionnaire, dans l'ordre, textes nettoyés (zones inconnues ignorées). */
export function nettoyerReponses(
	q: Questionnaire,
	reponses: Record<string, unknown> | null | undefined
): Record<string, string> {
	const source = reponses ?? {};
	const propres: Record<string, string> = {};
	for (const z of q.zones) {
		const v = source[String(z)];
		propres[String(z)] = String(v ?? '')
			.trim()
			.slice(0, REPONSE_MAX);
	}
	return propres;
}

export function nombreRepondues(
	q: Questionnaire,
	reponses: Record<string, unknown> | null | undefined
): number {
	const source = reponses ?? {};
	return q.zones.filter((z) => String(source[String(z)] ?? '').trim()).length;
}
