/**
 * Les 26 questions de la Découverte de soi (libellés du legacy `incl-sounga.php`, orthographe
 * corrigée) + la « Correspondance membre », regroupées en 6 étapes lisibles sur mobile.
 *
 * Questions 15 et 16 (« meneur ou suiveur », « seul·e ou entouré·e ») : le legacy proposait
 * Oui/Non, ambigu. On garde le stockage 1/2 et on affiche le sens de la colonne
 * (`est_meneur` : 1 = meneur ; `prefere_entourage` : 1 = entouré·e).
 */
import type { ChampQuestionnaire } from '$lib/types/decouverte';

export type GenreQuestion = 'texte' | 'ouinon' | 'pourcentage';

export interface QuestionFiche {
	numero: number;
	champ: ChampQuestionnaire;
	libelle: string;
	genre: GenreQuestion;
	aide?: string;
	/** Libellés des choix 1 et 2 quand « Oui / Non » ne convient pas */
	choix?: [string, string];
}

export interface EtapeFiche {
	titre: string;
	intro: string;
	questions: QuestionFiche[];
}

const q = (numero: number, champ: ChampQuestionnaire, libelle: string, genre: GenreQuestion = 'texte', extra: Partial<QuestionFiche> = {}): QuestionFiche => ({
	numero,
	champ,
	libelle,
	genre,
	...extra
});

export const ETAPES_FICHE: EtapeFiche[] = [
	{
		titre: 'Votre activité',
		intro: 'Parlez-nous de ce que vous faites et de ce que vous savez faire.',
		questions: [
			q(1, 'activite_actuelle', 'Que faites-vous actuellement ?'),
			q(2, 'savoir_faire', 'Que savez-vous faire ?'),
			q(3, 'activite_quotidienne', 'À quoi consiste votre activité au quotidien ?'),
			q(4, 'secret_a_partager', 'Quel est le secret que vous avez découvert depuis et que vous souhaitez partager aux autres ?')
		]
	},
	{
		titre: 'Votre idée',
		intro: "D'où vient votre projet ?",
		questions: [
			q(5, 'origine_idee', 'Comment avez-vous eu cette idée ?'),
			q(6, 'idee_vue_chez_autrui', 'Est-ce parce que vous avez vu une autre personne le faire ?', 'ouinon'),
			q(7, 'participation_idee_tierce', "Si l'idée n'est pas personnelle, quelle est votre participation ?")
		]
	},
	{
		titre: 'Votre personnalité',
		intro: "Il n'y a pas de bonne ou de mauvaise réponse : répondez spontanément.",
		questions: [
			q(8, 'est_sociable', 'Êtes-vous une personne sociable ?', 'ouinon'),
			q(9, 'interet_pour_autrui', 'Vous intéressez-vous à ce que font les autres ?', 'ouinon'),
			q(10, 'a_deja_fait_commerce', 'Avez-vous déjà fait du commerce ?', 'ouinon'),
			q(11, 'se_fait_des_amis', 'Faites-vous rapidement des amis dans un nouvel environnement ?', 'ouinon'),
			q(12, 'garde_ses_relations', 'Conservez-vous longtemps vos relations ?', 'ouinon'),
			q(13, 'percu_comme_ouvert', 'Les autres vous trouvent-ils ouvert·e ?', 'ouinon'),
			q(14, 'perception_par_autrui', 'À votre avis, que pensent les autres de vous ?')
		]
	},
	{
		titre: 'Votre entourage',
		intro: 'Les personnes autour de vous comptent pour la réussite de votre projet.',
		questions: [
			q(15, 'est_meneur', "Êtes-vous un meneur d'hommes ou un suiveur ?", 'ouinon', { choix: ['Plutôt meneur·se', 'Plutôt suiveur·se'] }),
			q(16, 'prefere_entourage', 'Vous sentez-vous mieux en étant seul·e ou préférez-vous être entouré·e de vos amis ?', 'ouinon', {
				choix: ['Entouré·e de mes amis', 'Plutôt seul·e']
			}),
			q(17, 'a_des_amis_proches', 'Avez-vous des amis avec lesquels vous partagez votre vie ?', 'ouinon'),
			q(18, 'entourage_valorise_activite', "Votre entourage accorde-t-il de l'importance ou de la considération à ce que vous faites ?", 'ouinon'),
			q(19, 'entourage_proche', "Amis, père, mère, sœurs, frères, nièces et neveux, famille, frères d'église, collègues de travail, conjoint, autres ?", 'texte', {
				aide: 'Qui compose votre entourage proche ?'
			}),
			q(20, 'personnes_consideration', 'Pouvez-vous établir une liste de personnes ayant pour vous de la considération ?')
		]
	},
	{
		titre: 'Votre motivation',
		intro: 'Ce qui vous pousse, et ce sur quoi vous pouvez compter.',
		questions: [
			q(21, 'motivation', 'Quelle est votre motivation ?'),
			q(22, 'pourcentage_implication', 'Quel est le degré de votre implication et de votre motivation ?', 'pourcentage', {
				aide: 'De 0 % (pas du tout) à 100 % (totalement).'
			}),
			q(23, 'moyens_disponibles', 'De quoi disposez-vous pour ce projet ?', 'texte', { aide: 'Épargne, matériel, local, stock, compétences…' }),
			q(24, 'soutien_conjoint', 'Avez-vous le soutien de votre conjoint ?', 'ouinon'),
			q(25, 'origine_soutien', 'De qui avez-vous le soutien ?'),
			q(26, 'confronte_aux_faits', 'Confrontez-vous souvent les autres aux faits ?', 'ouinon')
		]
	},
	{
		titre: 'Votre message',
		intro: 'Un mot pour votre conseillère : vos questions, vos disponibilités, ce qui vous inquiète.',
		questions: [q(27, 'notes_membre', 'Correspondance membre', 'texte', { aide: 'Votre conseillère vous répondra sur cette fiche et dans votre messagerie.' })]
	}
];

export const TOUTES_QUESTIONS: QuestionFiche[] = ETAPES_FICHE.flatMap((e) => e.questions);

/** Libellé lisible d'une réponse Oui/Non (0 = non renseigné). */
export function libelleOuiNon(question: QuestionFiche, v: number): string {
	if (v !== 1 && v !== 2) return '';
	const [un, deux] = question.choix ?? ['Oui', 'Non'];
	return v === 1 ? un : deux;
}

/** Spécification `lireFormulaire` de tous les champs du questionnaire. */
export const SPEC_FORMULAIRE: Record<string, 'texte' | 'entier'> = Object.fromEntries(
	TOUTES_QUESTIONS.map((x) => [x.champ, x.genre === 'texte' ? 'texte' : 'entier'])
);
