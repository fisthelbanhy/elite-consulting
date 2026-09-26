/**
 * Textes du parcours distributeur, repris du legacy (orthographe et typographie corrigées) :
 * - chapitres de présentation : `$arraypresentation` + `incl-presentation.php` (F-S5-05) ;
 * - titres et introductions des étapes : `$arrayetapeadhesion` + `incl-adhesion.php` (F-S5-24 à F-S5-31).
 */

export interface Bloc {
	paragraphes?: string[];
	puces?: string[];
	apres?: string[];
}

export interface Chapitre extends Bloc {
	id: string;
	titre: string;
}

/** Vidéo de présentation (legacy `pub3.WMV`) : à renseigner une fois convertie en MP4 (F-S5-04). */
export const VIDEO_PRESENTATION: string | null = null;

export const CHAPITRES: Chapitre[] = [
	{
		id: 'marketing-de-reseau',
		titre: 'Le marketing de réseau',
		paragraphes: [
			"C'est l'une des industries qui se développent le plus rapidement aujourd'hui dans le monde.",
			"Il permet à des gens d'horizons divers de réaliser des rêves autrement irréalisables.",
			"L'enthousiasme et la dynamique suscités par le marketing de réseau proviennent de ce qu'il offre aux gens la possibilité d'être rémunérés sur les ventes du réseau qu'ils ont constitué.",
			'Ce sont ces gains remontant du réseau qui constituent le plus gros du revenu. Cela transforme un petit commerce limité en une carrière éclatante, avec un potentiel de revenu illimité (du fait de votre propre duplication à travers les autres).'
		]
	},
	{
		id: 'quelle-voie',
		titre: 'Quelle voie choisissez-vous ?',
		paragraphes: [
			"Comme vous l'avez compris, le plan de rémunération FLP propose deux choses : la vente au détail et la vente par réseau. En qualité de distributeur, vous avez l'avantage d'acheter en gros et de vendre au détail, avec un différentiel de 43 %. Ceci dit, le marketing de réseau vous permet de bâtir une équipe de personnes qui veulent faire la même chose que vous et de percevoir des bonus mensuels sur les ventes de votre équipe. Cette pratique peut générer un revenu supplémentaire considérable. Notez l'activité que vous souhaitez privilégier :"
		],
		puces: ['Vente / consommation personnelle', 'Marketing de réseau']
	},
	{
		id: 'plan-de-remuneration',
		titre: 'Le plan de rémunération de FLP',
		paragraphes: [
			"Vous avez eu une explication du plan de rémunération lors de la POA. Cependant, puisqu'il s'agit de la base même de votre carrière FLP, nous vous suggérons de passer quelques minutes à revoir les points essentiels. Visionnez également la vidéo du plan marketing : cela vous aidera à le mémoriser en détail."
		]
	},
	{
		id: 'vente-des-produits',
		titre: 'Vente des produits',
		paragraphes: [
			'Tous les distributeurs, à partir du niveau animateur et au-delà, doivent faire un minimum de 4 PC chaque mois pour être qualifiés pour leur bonus de groupe. Sachez que si vous avez décidé de faire du réseau, vous allez parrainer régulièrement de nouveaux distributeurs. Donc, une fois pris en compte la consommation personnelle et le nouveau parrainage, il vous suffira de vendre seulement pour 1 PC par mois.'
		]
	},
	{
		id: 'et-maintenant',
		titre: 'Et maintenant ?',
		paragraphes: [
			'Les deux premiers points caisse viennent réduire les quatre points caisse que vous devez faire en propre, de la façon suivante :'
		],
		puces: [
			"Vous parrainez un nouveau distributeur qui fait dans le mois 2 PC : vous n'avez plus que 2 PC à réaliser vous-même pour sauvegarder votre bonus de groupe.",
			'Vous en parrainez deux ou plus qui font dans le mois 2 PC chacun : votre propre obligation est réduite à 1 PC.'
		]
	}
];

/** Petit lexique (ajout) pour les sigles FLP employés dans les textes. */
export const LEXIQUE = [
	{ terme: 'FLP', definition: 'Forever Living Products, fabricant des produits à l’aloe vera.' },
	{ terme: 'POA', definition: 'Présentation de l’opportunité d’affaires, réunion d’information organisée par les distributeurs.' },
	{ terme: 'PC', definition: 'Point caisse : unité de volume de ventes utilisée pour calculer les qualifications et les bonus.' }
];

/** Titres des 10 étapes (`$arrayetapeadhesion`) et libellés courts pour la barre de progression. */
export const ETAPES: { numero: number; titre: string; court: string }[] = [
	{ numero: 1, titre: 'Préalables au développement de votre entreprise : fixez-vous des objectifs', court: 'Objectifs' },
	{ numero: 2, titre: 'Votre propre histoire', court: 'Mon histoire' },
	{ numero: 3, titre: "Combien d'heures par semaine pensez-vous pouvoir consacrer à votre activité ?", court: 'Disponibilité' },
	{ numero: 4, titre: 'Votre liste de noms', court: 'Liste de noms' },
	{ numero: 5, titre: 'Comment devenir compétent dans le marketing de réseau', court: 'Formations' },
	{ numero: 6, titre: 'Contactez vos prospects par téléphone', court: 'Contacts' },
	{ numero: 7, titre: 'Rendez-vous individuel', court: 'Rendez-vous' },
	{ numero: 8, titre: "Nombre d'intéressés", court: 'Intéressés' },
	{ numero: 9, titre: 'Commande des produits', court: 'Commande' },
	{ numero: 10, titre: 'Paiement', court: 'Paiement' }
];

export const INTRODUCTIONS: Record<number, Bloc> = {
	1: {
		paragraphes: [
			'Pour réaliser vos rêves, vous devez fixer des objectifs. Prenez le temps de noter ci-dessous vos trois objectifs prioritaires pour construire votre activité FLP.',
			"Vous pouvez vous identifier à quelques-uns d'entre eux :"
		],
		puces: [
			'Du temps de qualité à consacrer à la famille.',
			'Une juste récompense de vos efforts : plus vous travaillez, plus vous gagnez.',
			'Financer de bonnes études à vos enfants.',
			"Voyager de par le monde, en disposant à la fois du temps et de l'argent pour le faire.",
			'Habiter la maison de vos rêves.',
			'Maîtriser votre destin.',
			'Sécurité et indépendance financière : plus de problèmes de crédit, etc.',
			'Échapper au cycle infernal : taxi, boulot, dodo.'
		]
	},
	2: {
		paragraphes: [
			"Rédigez un texte court et vivant, dans lequel vous donnerez les raisons pour lesquelles vous vous êtes engagé·e avec FLP pour réaliser vos aspirations. Cela vous aidera aussi à rester motivé·e en vous rappelant « pourquoi » vous faites ce travail. N'hésitez pas à demander l'aide de votre parrain pour écrire « votre propre histoire »."
		]
	},
	4: {
		paragraphes: [
			'La meilleure façon de développer votre équipe est de préparer une liste des personnes que vous connaissez.',
			'Pourquoi ?'
		],
		puces: [
			'À qui pensez-vous proposer cette formidable opportunité : à des amis, des collègues, des connaissances ou des personnes qui vous sont étrangères ?',
			'Vous connaissez déjà leurs forces et leurs faiblesses et vous êtes sûr·e de leur crédibilité, de leur comportement, de leur motivation et de leur honnêteté.',
			"C'est vous qui choisissez vos partenaires FLP. Quelle autre entreprise vous offre cette possibilité ?"
		],
		apres: [
			'Rendez-vous maintenant à la liste de noms.',
			'Commencez à inscrire tout de suite 25 noms.',
			"Cela vous permettra de « décoller » rapidement et votre parrain pourra vous montrer comment proposer à d'autres l'opportunité FLP."
		]
	},
	5: {
		paragraphes: [
			'Profitez de la Forever Business Academy.',
			'Pour réussir, il est indispensable que tous les points du cycle FLP vous soient familiers, le plus rapidement possible. Pour développer ces compétences de base, il vous faudra :'
		],
		puces: [
			'Assister régulièrement aux POA.',
			'Assister aux Journées de succès.',
			'Assister aux formations Animateur.',
			"Recevoir l'aide et la formation actives de votre parrain tout au long du développement de votre propre réseau."
		],
		apres: [
			'Le programme de formation ci-dessus doit faire de vous un « chef de groupe » compétent. Il vous faudra travailler beaucoup les premiers mois pour démarrer votre affaire et pour améliorer votre savoir-faire. Vos efforts trouveront leur généreuse récompense dans les années à venir.',
			'Notez maintenant vos dates de formation dans votre agenda :'
		]
	},
	6: {
		paragraphes: [
			'Une fois votre liste établie, vous devez contacter certains de vos prospects par téléphone pour que vous-même et votre parrain puissiez les rencontrer pour un entretien en tête-à-tête.',
			'Cette deuxième étape va vous sortir de votre « zone de confort ». Votre persévérance deviendra compétence. Votre parrain pourra vous aider lors des premiers contacts, soit en parlant à votre place, soit en vous préparant une fiche aide-mémoire que vous utiliserez.',
			"Une conversation téléphonique à trois (« conférence téléphonique ») est une façon extrêmement efficace de travailler avec l'aide de votre parrain. Renseignez-vous sur cette possibilité.",
			'Voici trois scénarios téléphoniques :'
		]
	},
	7: {
		paragraphes: [
			"Le rendez-vous individuel vous donne l'occasion de développer l'opportunité d'affaires auprès de vos prospects et de les inviter à une POA."
		],
		puces: [
			'Au début, votre parrain devra assister à ces présentations pour que vous sachiez comment se passe un rendez-vous individuel.',
			'Une brochure « Choix de carrière » vous aidera à développer votre compétence dans cette étape cruciale du cycle FLP.'
		],
		apres: ['Maintenant, discutez avec votre parrain du nombre de rendez-vous individuels que vous pouvez faire lors du premier mois.']
	},
	8: {
		paragraphes: [
			"Notez les personnes intéressées par l'opportunité (jusqu'à trois) : leurs coordonnées, le montant envisagé et la date à laquelle vous leur avez présenté l'activité."
		]
	},
	9: {
		paragraphes: [
			'Composez votre kit de démarrage parmi les produits du catalogue, au prix distributeur, puis choisissez votre mode de souscription.'
		],
		apres: [
			"NB. Pour une souscription sur fonds propres, le montant doit être d'au moins 56 000 FCFA.",
			'Pour une souscription à crédit, le montant est compris entre 56 000 et 66 000 FCFA.'
		]
	}
};

/** Étape 6 : les 3 scénarios (le 3ᵉ était titré « Scénario 2 » par erreur dans le legacy). */
export const SCENARIOS = [
	{
		titre: "Scénario 1 — Un homme d'affaires, un professionnel",
		texte:
			"« Bonjour Pierre, comment ça va… ? Je viens de commencer une activité passionnante et j'aimerais t'en parler. Vu ton expérience des affaires, j'aimerais connaître ton opinion. Peut-on se rencontrer trois quarts d'heure, mercredi ou jeudi ? Qu'est-ce qui t'arrange le mieux ? »"
	},
	{
		titre: 'Scénario 2 — Un ami, un parent ou un voisin',
		texte:
			"« Bonjour Pierre, comment ça va… ? Tout récemment, des amis m'ont présenté une opportunité d'affaires très intéressante et m'ont demandé qui, autour de moi, je voyais bien dans cette activité. J'ai immédiatement pensé à toi. Il est difficile d'en parler par téléphone, mais on pourrait se rencontrer trois quarts d'heure mercredi ou jeudi pour en discuter. Je pourrais te donner plus de détails et t'expliquer le concept. Quel jour t'arrange le mieux ? »"
	},
	{
		titre: 'Scénario 3 — Un ami, un parent ou un voisin',
		texte:
			"« Bonjour Pierre, comment ça va… ? Tu m'as toujours laissé entendre que tu souhaitais te mettre à ton compte, mais que ce qui te manquait, c'étaient les capitaux. Eh bien voilà ! Je viens de découvrir une affaire unique qui me plaît beaucoup et qui ne nécessite aucun investissement de départ. C'est une société dont les résultats sont prouvés et qui permet de monter une entreprise solide. Peut-on se rencontrer trois quarts d'heure, mercredi ou jeudi, pour que je te présente cette activité ? Quel jour te convient le mieux ? »"
	}
];

export const RAPPELS_SCENARIOS = {
	intro: 'Quel que soit le scénario téléphonique que vous privilégiez, retenez :',
	puces: ["qu'il faut être bref ;", "qu'il ne faut pas rentrer dans le détail ;", "qu'il faut faire preuve d'enthousiasme."],
	fin: 'Si vous estimez avoir besoin d’une formation au contact téléphonique, signalez-le à votre parrain.'
};

export const DISPONIBILITES = [
	{ value: 1, label: '5 à 10 heures', description: 'par semaine' },
	{ value: 2, label: '10 à 20 heures', description: 'par semaine' },
	{ value: 3, label: 'Plus de 20 heures', description: 'par semaine' }
];

export const PRESTATIONS = [
	{ value: 1, label: 'POA' },
	{ value: 2, label: 'Journée de succès' },
	{ value: 3, label: 'Formation animateur' },
	{ value: 4, label: 'Formation manager' }
];

export const SEUIL_MINIMUM = 56_000;
export const PLAFOND_CREDIT = 66_000;
