/**
 * Les 25 questions du business plan (legacy incl-businessplan.php, zones 02 à 26 ; libellés exacts,
 * orthographe corrigée), regroupées en 6 étapes pour le formulaire pas à pas.
 */

export type ChampBP =
	| 'type_activite'
	| 'description_projet'
	| 'moyens_actuels'
	| 'ressources_disponibles'
	| 'possessions'
	| 'organisation_actuelle'
	| 'organisation_souhaitee'
	| 'detail_besoin'
	| 'apport_actuel'
	| 'ambition'
	| 'strategie_resultats'
	| 'valeur_ajoutee'
	| 'prevision_ca_benefice'
	| 'processus_activite'
	| 'estimation_charges'
	| 'composantes_ca'
	| 'repartition_ca'
	| 'elements_environnementaux'
	| 'strategie_attaque'
	| 'devis_chiffre_besoin'
	| 'apport_prevu'
	| 'niveau_realisation'
	| 'difficultes_realisation'
	| 'planning_execution'
	| 'difficultes_futures';

export const LIBELLES: Record<ChampBP, string> = {
	type_activite: "Quel est le type d'activité ?",
	description_projet: 'Description du projet',
	moyens_actuels: 'Les moyens actuels pour le projet',
	ressources_disponibles: 'Vos ressources disponibles',
	possessions: "Qu'est-ce que vous possédez ?",
	organisation_actuelle: "Quelle est l'organisation actuelle ?",
	organisation_souhaitee: "Quelle est l'organisation souhaitée ?",
	detail_besoin: 'Le détail de votre besoin',
	apport_actuel: 'Quel est votre apport ?',
	ambition: 'Quelle est votre ambition ?',
	strategie_resultats: 'Comment comptez-vous atteindre vos résultats ?',
	valeur_ajoutee: 'Quelle est votre valeur ajoutée ?',
	prevision_ca_benefice: 'Combien comptez-vous brasser une fois le projet lancé, en ventes et en bénéfice ?',
	processus_activite: 'Quel est le processus de cette activité ?',
	estimation_charges: "À combien quantifiez-vous l'ensemble des charges ?",
	composantes_ca: "Quelles sont les composantes de votre chiffre d'affaires ?",
	repartition_ca: "Quelle est la répartition de votre chiffre d'affaires ?",
	elements_environnementaux: 'Quels sont les éléments environnementaux qui vous confortent dans votre projet ?',
	strategie_attaque: "Quelle sera votre stratégie d'attaque ?",
	devis_chiffre_besoin: 'Quel est le devis chiffré de votre besoin ?',
	apport_prevu: 'Quel sera votre apport ?',
	niveau_realisation: 'Quel est le niveau de réalisation de votre projet ?',
	difficultes_realisation: 'Quelles sont les difficultés dans la réalisation de votre projet ?',
	planning_execution: "Quel est votre planning d'exécution du projet ?",
	difficultes_futures: 'Quelles sont les difficultés à venir auxquelles vous pourriez être confronté·e ?'
};

export const ETAPES_BP: { titre: string; aide: string; champs: ChampBP[] }[] = [
	{
		titre: 'Votre projet',
		aide: 'En quelques mots : que voulez-vous faire, et où en êtes-vous ?',
		champs: ['type_activite', 'description_projet', 'niveau_realisation']
	},
	{
		titre: 'Vos moyens',
		aide: 'Ce que vous avez déjà : argent, matériel, compétences, relations.',
		champs: ['moyens_actuels', 'ressources_disponibles', 'possessions', 'apport_actuel']
	},
	{
		titre: 'Votre organisation',
		aide: 'Comment vous travaillez aujourd’hui et comment vous voulez travailler demain.',
		champs: ['organisation_actuelle', 'organisation_souhaitee', 'processus_activite', 'detail_besoin']
	},
	{
		titre: 'Votre marché et votre stratégie',
		aide: 'Vos clients, ce qui vous différencie, la façon de vous lancer.',
		champs: ['ambition', 'valeur_ajoutee', 'elements_environnementaux', 'strategie_attaque', 'strategie_resultats']
	},
	{
		titre: 'Vos chiffres',
		aide: 'Des estimations suffisent : votre frangine vous aidera à les affiner.',
		champs: ['prevision_ca_benefice', 'estimation_charges', 'composantes_ca', 'repartition_ca', 'devis_chiffre_besoin', 'apport_prevu']
	},
	{
		titre: 'La réalisation',
		aide: 'Les obstacles d’aujourd’hui et de demain, et votre calendrier.',
		champs: ['difficultes_realisation', 'planning_execution', 'difficultes_futures']
	}
];

export const CHAMPS_TEXTE = ETAPES_BP.flatMap((e) => e.champs).filter((c) => c !== 'niveau_realisation');
