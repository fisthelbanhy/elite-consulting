/**
 * Architecture de l'information (ADR-0008) : 3 piliers + boutique. Chaque section du site
 * legacy y trouve sa place (référence entre crochets).
 */
export interface LienNav {
	href: string;
	label: string;
	description: string;
	/** Nom de l'interrupteur de `parametre` qui masque le lien quand il vaut false (ADR-0009). */
	module?: 'module_epargne_actif' | 'module_sante_actif';
	connexion?: boolean;
}

export interface Pilier {
	id: string;
	titre: string;
	accroche: string;
	href: string;
	liens: LienNav[];
}

export const PILIERS: Pilier[] = [
	{
		id: 'se-lancer',
		titre: 'Se lancer',
		accroche: "De l'idée au premier client",
		href: '/se-lancer',
		liens: [
			{ href: '/diagnostic', label: 'Diagnostic gratuit', description: '3 minutes pour savoir par où commencer' }, // nouveau
			{ href: '/decouverte-de-soi', label: 'Découverte de soi', description: 'Le bilan complet, suivi par votre frangine' }, // S1-B
			{ href: '/business-plan', label: 'Business plan', description: 'Formalisez votre idée, pas à pas' }, // S5-B
			{ href: '/accompagnement', label: 'Accompagnement', description: 'Dossiers bancables : projet, agricole, crédit' }, // S7-A3
			{ href: '/questions', label: 'Questions & conseils', description: 'Les informations utiles entre membres' }, // S1-A
			{ href: '/reussites', label: 'Réussites', description: 'Ils se sont lancés, ils racontent' } // S6 (réussites)
		]
	},
	{
		id: 'financer',
		titre: 'Financer & épargner',
		accroche: 'Votre argent, en toute confiance',
		href: '/financer',
		liens: [
			{ href: '/likelemba', label: 'Likelemba', description: 'Votre tontine organisée, sans cahier' }, // S4-B
			{ href: '/projets', label: 'Appels de fonds', description: 'Présentez un projet, soutenez-en un' }, // S4-A
			{ href: '/epargne', label: 'Épargne solidaire', description: 'Dons, placements, carte de pointage', module: 'module_epargne_actif' }, // S4-C
			{ href: '/conseil-financier', label: 'Conseil financier', description: 'Posez vos questions à un conseiller' }, // S7-A
			{ href: '/tresorerie', label: 'Trésorerie & crédit', description: 'Placements, virements, crédit, contentieux' }, // S7-B
			{ href: '/tarifs-bancaires', label: 'Tarifs bancaires', description: 'Comparez les frais des banques' } // S7-C
		]
	},
	{
		id: 'opportunites',
		titre: 'Opportunités',
		accroche: 'Marchés, emplois, clients',
		href: '/opportunites',
		liens: [
			{ href: '/marches', label: "Marchés & appels d'offres", description: 'Publics et privés, et projets en cours' }, // S6-C
			{ href: '/emplois', label: 'Emplois', description: "Offres et demandes d'emploi" }, // S2
			{ href: '/immobilier', label: 'Immobilier', description: 'Location, vente, recherche' }, // S3-A
			{ href: '/annonces', label: 'Petites annonces', description: 'Articles neufs et d’occasion' }, // S3-B
			{ href: '/courses', label: 'Courses & livraison', description: 'On fait vos achats, on vous livre' }, // S3-C
			{ href: '/entreprises', label: 'Annuaire des entreprises', description: 'Trouvez un fournisseur, un partenaire' }, // S6-A
			{ href: '/comparateur-prix', label: 'Comparateur de prix', description: 'Offres et demandes entre entreprises' }, // S6-B
			{ href: '/partenariats', label: 'Partenariat & troc', description: "J'ai… je cherche…" } // S5-C
		]
	},
	{
		id: 'bien-etre',
		titre: 'Bien-être',
		accroche: 'Produits Aloe Vera et revenu complémentaire',
		href: '/boutique',
		liens: [
			{ href: '/boutique', label: 'Boutique', description: 'Les produits Forever Living' }, // S5-A2
			{ href: '/bien-etre', label: 'Fiches bien-être', description: 'Conseils d’utilisation par besoin', module: 'module_sante_actif' }, // S1-C
			{ href: '/devenir-distributeur', label: 'Devenir distributeur', description: 'Gagnez un revenu en revendant' } // S5-A1/A3
		]
	}
];

type Interrupteurs = { module_epargne_actif?: boolean; module_sante_actif?: boolean };

export function liensVisibles(liens: LienNav[], parametres: Interrupteurs | undefined): LienNav[] {
	return liens.filter((l) => !l.module || parametres?.[l.module] !== false);
}

/** Message WhatsApp pré-rempli selon la page (ADR-0008 : liens contextuels). */
export function messageWhatsAppPour(chemin: string): string {
	const base = 'Bonjour la Frangine, ';
	const trouve = PILIERS.flatMap((p) => p.liens).find((l) => chemin === l.href || chemin.startsWith(l.href + '/'));
	return trouve ? `${base}je viens de la page « ${trouve.label} » et j'ai une question.` : `${base}j'ai une question.`;
}
