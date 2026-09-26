/** Questions fréquentes de la page d'aide (affichées et reprises en données structurées FAQPage). */
export interface Question {
	question: string;
	reponse: string;
	lien?: { href: string; label: string };
}

export const FAQ: Question[] = [
	{
		question: 'Faut-il un compte pour utiliser La Frangine ?',
		reponse:
			"Non pour découvrir : vous pouvez consulter les offres d'emploi, les annonces, les marchés ou faire le diagnostic sans vous inscrire. Le compte, gratuit, sert à publier, rejoindre une Likelemba, écrire à votre frangine et suivre vos démarches.",
		lien: { href: '/inscription', label: 'Créer mon compte' }
	},
	{
		question: 'Combien coûte l’inscription ?',
		reponse:
			"L'inscription est gratuite. Certains services (produits de la boutique, accompagnements, statut Master pour les entreprises) sont payants : leur prix est toujours affiché avant de payer.",
	},
	{
		question: 'Qu’est-ce que la Likelemba ?',
		reponse:
			"C'est la tontine que vous connaissez : un groupe de personnes cotise régulièrement la même somme et chacun reçoit la cagnotte à son tour. La Frangine vous aide à l'organiser : liste des membres, calendrier, cotisations et reçus, sans cahier.",
		lien: { href: '/likelemba', label: 'Découvrir la Likelemba' }
	},
	{
		question: 'Mon argent est-il en sécurité ?',
		reponse:
			"La Frangine n'est pas une banque. Chaque paiement déclaré sur le site est vérifié par l'équipe avant d'être confirmé, et vous recevez un reçu. Nous ne vous demanderons jamais votre code secret Mobile Money ni votre code PIN.",
		lien: { href: '/conditions', label: "Lire les conditions d'utilisation" }
	},
	{
		question: 'Comment publier une annonce, une offre d’emploi ou un projet ?',
		reponse:
			"Connectez-vous, ouvrez la rubrique qui vous intéresse (Emplois, Immobilier, Petites annonces, Appels de fonds…) et choisissez « Publier ». Les publications sont relues par l'équipe ; celles qui ne respectent pas les règles sont retirées.",
	},
	{
		question: 'Comment joindre une conseillère ?',
		reponse:
			'Le plus rapide est WhatsApp. Si vous êtes membre, écrivez aussi dans votre messagerie privée : une vraie personne vous répond. Sinon, utilisez le formulaire de contact.',
		lien: { href: '/contact', label: 'Nous écrire' }
	},
	{
		question: 'Comment reconnaître une arnaque ?',
		reponse:
			"Méfiez-vous de toute personne qui demande de l'argent pour un emploi, un « dossier » ou un prêt garanti, ou qui réclame votre code Mobile Money. Ne payez jamais d'avance un inconnu. En cas de doute, signalez-le-nous : nous vérifions et retirons les annonces frauduleuses.",
		lien: { href: '/contact?objet=Signalement%20d%E2%80%99une%20arnaque', label: 'Signaler une arnaque' }
	},
	{
		question: 'Comment modifier ou supprimer mes informations ?',
		reponse:
			"Vos coordonnées se modifient dans votre profil. Pour obtenir une copie de vos données ou faire supprimer votre compte, écrivez-nous : c'est votre droit.",
		lien: { href: '/confidentialite', label: 'Vos données et vos droits' }
	},
	{
		question: 'Mon entreprise peut-elle faire de la publicité sur le site ?',
		reponse:
			'Oui. Image, son ou vidéo : votre annonce est diffusée dans les encarts du site pendant la période choisie, et nous suivons pour vous le nombre de vues.',
		lien: { href: '/publicites#devenir-annonceur', label: 'Devenir annonceur' }
	}
];
