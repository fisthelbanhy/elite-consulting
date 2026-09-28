/**
 * Énumérations métier (portage de `app/enums.py`).
 *
 * Chaque bloc reprend un tableau `$arrayXXX` de `incl-variable.php` avec **les mêmes valeurs
 * numériques** que le legacy (les données reprises en dépendent). Les libellés sont corrigés
 * (accents, fautes de frappe) mais gardent leur sens.
 *
 * Forme retenue : un objet de constantes + un tableau de libellés, plutôt qu'un `enum`
 * TypeScript — les valeurs restent de simples nombres en base, et `--experimental-strip-types`
 * de Node refuse les `enum`.
 */

export interface Option {
	value: number;
	label: string;
}

/** Table de libellés d'une énumération : `{ 1: 'Gestionnaire', … }`. */
export type Libelles = Readonly<Record<number, string>>;

// --- Membres ---------------------------------------------------------------------------------

export const TypeMembre = { GESTIONNAIRE: 1, MASTER: 2, MEMBRE: 3 } as const;
const TypeMembreLibelles: Libelles = { 1: 'Gestionnaire', 2: 'Master', 3: 'Membre' };

export const CategorieMembre = { PHYSIQUE: 1, MORALE: 2 } as const;
const CategorieMembreLibelles: Libelles = { 1: 'Personne physique', 2: 'Personne morale' };

export const Sexe = { FEMININ: 1, MASCULIN: 2, INDEFINI: 3 } as const;
const SexeLibelles: Libelles = { 1: 'Féminin', 2: 'Masculin', 3: 'Indéfini' };

export const EtatCivil = {
	CELIBATAIRE: 1,
	CONCUBINAGE: 2,
	MARIE: 3,
	VEUF: 4,
	DIVORCE: 5,
	AUTRE: 6
} as const;
const EtatCivilLibelles: Libelles = {
	1: 'Célibataire',
	2: 'Concubinage',
	3: 'Marié(e)',
	4: 'Veuf / Veuve',
	5: 'Divorcé(e)',
	6: 'Autre'
};

export const BanqueBoutique = { BANQUE: 1, BOUTIQUE: 2 } as const;
const BanqueBoutiqueLibelles: Libelles = { 1: 'Banque', 2: 'Boutique' };

export const OuiNon = { OUI: 1, NON: 2 } as const;
const OuiNonLibelles: Libelles = { 1: 'Oui', 2: 'Non' };

// --- États ------------------------------------------------------------------------------------

export const Etat = { NON_TRAITE: 1, AUTORISE: 2, SUPPRIME: 3, CLOTURE: 4 } as const;
const EtatLibelles: Libelles = { 1: 'Non traité', 2: 'Autorisé', 3: 'Supprimé', 4: 'Clôturé' };

export const EtatPaiement = { NON_PAYE: 1, NON_CONFIRME: 2, CONFIRME: 3 } as const;
const EtatPaiementLibelles: Libelles = {
	1: 'Non payé',
	2: 'Paiement non confirmé',
	3: 'Paiement confirmé'
};

export const ModePaiement = { CASH: 1, CHARDEN_FARELL: 2, MOBILE_MONEY: 3 } as const;
const ModePaiementLibelles: Libelles = { 1: 'Cash', 2: 'Charden Farell', 3: 'Mobile Money' };

/** 4 = Course : index vide dans le legacy mais utilisé. */
export const TypeObjetPaye = {
	PRODUIT: 1,
	ARTICLE: 2,
	COURSE: 4,
	LIKELEMBA: 5,
	SOUSCRIPTION: 6,
	FOND_SOUTIEN: 7,
	APPORT_FOND: 8
} as const;
const TypeObjetPayeLibelles: Libelles = {
	1: 'Produit',
	2: 'Article',
	4: 'Course',
	5: 'Likelemba',
	6: 'Souscription distributeur',
	7: 'Fond de soutien',
	8: 'Apport de fonds'
};

// --- Contenus ---------------------------------------------------------------------------------

/** Aussi type de marché : privé/public. */
export const Confidentialite = { PRIVE: 1, PUBLIC: 2 } as const;
const ConfidentialiteLibelles: Libelles = { 1: 'Privé', 2: 'Public' };

export const Module = {
	ACCUEIL: 0,
	SAVIEZ_VOUS: 1,
	RESSOURCES_HUMAINES: 2,
	E_COMMERCE: 3,
	APPELS_DE_FONDS: 4,
	OPPORTUNITE: 5,
	ENTREPRISES: 6,
	OFFRES_FINANCIERES: 7,
	TOUS: 8
} as const;
const ModuleLibelles: Libelles = {
	0: 'Accueil',
	1: 'Le saviez-vous ?',
	2: 'Ressources humaines',
	3: 'E-commerce',
	4: 'Appels de fonds',
	5: "Opportunité d'affaire",
	6: 'Entreprises - Marchés',
	7: 'Offres financières',
	8: 'Tous les modules'
};

export const TypeFichierPub = { IMAGE: 1, SON: 2, VIDEO: 3 } as const;
const TypeFichierPubLibelles: Libelles = { 1: 'Image', 2: 'Son', 3: 'Vidéo' };

export const OrigineIdee = { PERSONNEL: 1, TIERCE: 2, RESEAUX_SOCIAUX: 3 } as const;
const OrigineIdeeLibelles: Libelles = {
	1: 'Personnelle',
	2: 'Par un tiers',
	3: 'Réseaux sociaux'
};

// --- Ressources humaines ------------------------------------------------------------------------

export const TypeAnnonceRH = { DEMANDE: 1, OFFRE: 2 } as const;
const TypeAnnonceRHLibelles: Libelles = { 1: "Demande d'emploi", 2: "Offre d'emploi" };

export const TypeInteret = { BESOIN: 1, INTERESSEMENT: 2 } as const;
const TypeInteretLibelles: Libelles = { 1: 'Présentation de besoin', 2: 'Intéressement' };

// --- E-commerce -------------------------------------------------------------------------------

export const TypeTransaction = { INDIFFERENT: 0, LOCATION: 1, VENTE: 2 } as const;
const TypeTransactionLibelles: Libelles = { 0: 'Indifférent', 1: 'Location', 2: 'Vente' };

export const TypeBien = {
	INDIFFERENT: 0,
	MAISON: 1,
	APPARTEMENT: 2,
	TERRAIN: 3,
	COMMERCE: 4,
	IMMEUBLE: 5,
	BUREAUX: 6,
	GARAGE: 7,
	DEPOT: 8,
	AUTRE: 9
} as const;
const TypeBienLibelles: Libelles = {
	0: 'Indifférent',
	1: 'Maison',
	2: 'Appartement',
	3: 'Terrain',
	4: 'Commerce',
	5: 'Immeuble',
	6: 'Bureaux',
	7: 'Garage - Parking - Atelier',
	8: 'Dépôt',
	9: 'Autre bien'
};

export const SituationBien = { DISPONIBLE: 1, OCCUPE: 2 } as const;
const SituationBienLibelles: Libelles = { 1: 'Disponible', 2: 'Occupé' };

/** « Recherche » dans les onglets e-commerce. */
export const OffreDemande = { OFFRE: 1, DEMANDE: 2 } as const;
const OffreDemandeLibelles: Libelles = { 1: 'Offre', 2: 'Demande' };

export const NeufOccasion = { NEUF: 1, OCCASION: 2 } as const;
const NeufOccasionLibelles: Libelles = { 1: 'Neuf', 2: 'Occasion' };

export const EtatCourse = { EN_ATTENTE: 1, SUPPRIMEE: 2, EFFECTUEE: 3, LIVREE: 4 } as const;
const EtatCourseLibelles: Libelles = {
	1: 'En attente',
	2: 'Supprimée',
	3: 'Effectuée',
	4: 'Livrée'
};

/** Déclaré mais inutilisé dans le legacy. */
export const UniteMesure = { UNITE: 1, DIZAINE: 2, DOUZAINE: 3, KILOGRAMME: 4, M3: 5 } as const;
const UniteMesureLibelles: Libelles = {
	1: 'Unité',
	2: 'Dizaine',
	3: 'Douzaine',
	4: 'Kilogramme',
	5: 'm³'
};

// --- Appels de fonds / épargne -----------------------------------------------------------------

export const TypeApportFond = { DON: 1, CREDIT: 2, ACTIONNARIAT: 3 } as const;
const TypeApportFondLibelles: Libelles = { 1: 'Don', 2: 'Crédit', 3: 'Actionnariat' };

export const Periodicite = { SEMAINE: 1, QUINZAINE: 2, MENSUEL: 3 } as const;
const PeriodiciteLibelles: Libelles = { 1: 'Hebdomadaire', 2: 'Quinzaine', 3: 'Mensuelle' };

export const DonPlacement = { DON: 1, PLACEMENT: 2 } as const;
const DonPlacementLibelles: Libelles = { 1: 'Don', 2: 'Placement' };

export const VersementRetrait = { VERSEMENT: 1, RETRAIT: 2 } as const;
const VersementRetraitLibelles: Libelles = { 1: 'Versement', 2: 'Retrait' };

/** `pointcaisse.typecaissepcs` / `$arraytoperatencaisse`. */
export const TypeCaisse = { OPERATION: 1, ENCAISSE: 2 } as const;
const TypeCaisseLibelles: Libelles = { 1: 'Opération', 2: 'Encaisse' };

// --- Opportunité d'affaire -----------------------------------------------------------------------

/** Catégories Forever Living Products. */
export const GroupeProduit = {
	BUVABLES: 1,
	COMPLEMENTS: 2,
	RUCHE: 3,
	PROGRAMMES: 4,
	LIGNE: 5,
	SPORTIFS: 6,
	SOINS_CORPS: 7,
	SOINS_VISAGE: 8,
	ANTI_AGE: 9,
	FLEUR_JOUVENCE: 10,
	SONYA_SKIN: 11,
	FLAWLESS: 12,
	PREMIERS_SOINS: 13,
	HYGIENE: 14,
	CHEVEUX: 15,
	ENFANTS: 16,
	FEMMES: 17,
	HOMMES: 18,
	ANIMAUX: 19,
	CHEVAUX: 20
} as const;
const GroupeProduitLibelles: Libelles = {
	1: 'Buvables Forever',
	2: 'Compléments alimentaires',
	3: 'Produits de la ruche',
	4: 'Programmes Forever',
	5: 'Produits pour la ligne',
	6: 'Produits pour les sportifs',
	7: 'Soins du corps Forever',
	8: 'Soins du visage Forever',
	9: 'Soins anti-âge Forever',
	10: 'Fleur de jouvence',
	11: 'Sonya Skin Care',
	12: 'Flawless by Sonya',
	13: 'Premiers soins Forever',
	14: "Produits d'hygiène Forever",
	15: 'Soins des cheveux Forever',
	16: 'Soins pour enfants',
	17: 'Soins pour femmes',
	18: 'Soins pour hommes',
	19: 'Soins pour animaux',
	20: 'Soins pour chevaux'
};

export const ModeSouscription = { FOND_PROPRE: 1, CREDIT: 2 } as const;
const ModeSouscriptionLibelles: Libelles = { 1: 'Fonds propres', 2: 'Crédit' };

/** `souscriptoportuniteaffaire.zone04soa`. */
export const DisponibiliteHebdo = { H5_10: 1, H10_20: 2, H20_PLUS: 3 } as const;
const DisponibiliteHebdoLibelles: Libelles = {
	1: '5 à 10 heures par semaine',
	2: '10 à 20 heures par semaine',
	3: 'Plus de 20 heures par semaine'
};

/** Formations du parcours distributeur. */
export const Prestation = {
	POA: 1,
	JOURNEE_SUCCES: 2,
	FORMATION_ANIMATEUR: 3,
	FORMATION_MANAGER: 4
} as const;
const PrestationLibelles: Libelles = {
	1: 'POA',
	2: 'Journée de succès',
	3: 'Formation animateur',
	4: 'Formation manager'
};

// --- Entreprises --------------------------------------------------------------------------------

export const FormeJuridique = {
	SA: 1,
	SARL: 2,
	SARLU: 3,
	SAU: 4,
	ETS: 5,
	EI: 6,
	SCI: 7,
	ASSOCIATION: 8,
	FONDATION: 9
} as const;
const FormeJuridiqueLibelles: Libelles = {
	1: 'SA',
	2: 'SARL',
	3: 'SARLU',
	4: 'SAU',
	5: 'Ets',
	6: 'Entreprise individuelle',
	7: 'SCI',
	8: 'Association',
	9: 'Fondation'
};

// --- Offres financières -------------------------------------------------------------------------

export const RubriqueConseilFinance = { CONSEIL: 1, RUMEURS: 2, ACCOMPAGNEMENT: 3 } as const;
const RubriqueConseilFinanceLibelles: Libelles = {
	1: 'Conseil financier',
	2: 'Rumeurs économiques',
	3: 'Accompagnement'
};

export const TypeAccompagnement = {
	BUSINESS_PLAN: 1,
	PROJET_AGRICOLE: 2,
	RESTRUCTURATION_CREDIT: 3,
	CREDIT_IMMOBILIER: 4
} as const;
const TypeAccompagnementLibelles: Libelles = {
	1: 'Business plan',
	2: 'Projet agricole',
	3: 'Restructuration de crédit',
	4: 'Crédit immobilier'
};

/** `$arraymenuchoix72` / `$arrayoperation` (= type de dialogue). */
export const RubriqueTresorerie = {
	PLACEMENT: 1,
	OPERATION: 2,
	CREDIT: 3,
	CONTENTIEUX: 4
} as const;
const RubriqueTresorerieLibelles: Libelles = {
	1: 'Placement',
	2: 'Opération bancaire',
	3: 'Demande de crédit',
	4: 'Contentieux'
};

export const TypePlacement = { DEPOT_A_TERME: 1, INVESTISSEMENT: 2 } as const;
const TypePlacementLibelles: Libelles = { 1: 'Dépôt à terme', 2: 'Investissement' };

export const Devise = { FCFA: 1, EURO: 2, DOLLAR: 3, RMB: 4 } as const;
const DeviseLibelles: Libelles = { 1: 'FCFA', 2: '€', 3: '$', 4: 'RMB' };

export const LocalInternational = { LOCAL: 1, INTERNATIONAL: 2 } as const;
const LocalInternationalLibelles: Libelles = { 1: 'Local', 2: 'International' };

export const TypeOperationBanque = {
	RAPATRIEMENT: 1,
	VIREMENT_RECU: 2,
	VERSEMENT: 3,
	TRANSFERT: 4,
	VIREMENT_EMIS: 5,
	RETRAIT: 6
} as const;
const TypeOperationBanqueLibelles: Libelles = {
	1: 'Rapatriement',
	2: 'Virement reçu',
	3: 'Versement',
	4: 'Transfert',
	5: 'Virement émis',
	6: 'Retrait'
};

// --- Registre --------------------------------------------------------------------------------

/**
 * Registre des énumérations, exposé au frontend par `GET /api/referentiels/enums`.
 * Les clés reprennent **exactement** les noms des classes Python, car le frontend les utilise
 * telles quelles : `libelle(enums, 'TypeBien', v)`.
 */
export const ENUMS: Readonly<Record<string, Libelles>> = {
	TypeMembre: TypeMembreLibelles,
	CategorieMembre: CategorieMembreLibelles,
	Sexe: SexeLibelles,
	EtatCivil: EtatCivilLibelles,
	BanqueBoutique: BanqueBoutiqueLibelles,
	OuiNon: OuiNonLibelles,
	Etat: EtatLibelles,
	EtatPaiement: EtatPaiementLibelles,
	ModePaiement: ModePaiementLibelles,
	TypeObjetPaye: TypeObjetPayeLibelles,
	Confidentialite: ConfidentialiteLibelles,
	Module: ModuleLibelles,
	TypeFichierPub: TypeFichierPubLibelles,
	OrigineIdee: OrigineIdeeLibelles,
	TypeAnnonceRH: TypeAnnonceRHLibelles,
	TypeInteret: TypeInteretLibelles,
	TypeTransaction: TypeTransactionLibelles,
	TypeBien: TypeBienLibelles,
	SituationBien: SituationBienLibelles,
	OffreDemande: OffreDemandeLibelles,
	NeufOccasion: NeufOccasionLibelles,
	EtatCourse: EtatCourseLibelles,
	UniteMesure: UniteMesureLibelles,
	TypeApportFond: TypeApportFondLibelles,
	Periodicite: PeriodiciteLibelles,
	DonPlacement: DonPlacementLibelles,
	VersementRetrait: VersementRetraitLibelles,
	TypeCaisse: TypeCaisseLibelles,
	GroupeProduit: GroupeProduitLibelles,
	ModeSouscription: ModeSouscriptionLibelles,
	DisponibiliteHebdo: DisponibiliteHebdoLibelles,
	Prestation: PrestationLibelles,
	FormeJuridique: FormeJuridiqueLibelles,
	RubriqueConseilFinance: RubriqueConseilFinanceLibelles,
	TypeAccompagnement: TypeAccompagnementLibelles,
	RubriqueTresorerie: RubriqueTresorerieLibelles,
	TypePlacement: TypePlacementLibelles,
	Devise: DeviseLibelles,
	LocalInternational: LocalInternationalLibelles,
	TypeOperationBanque: TypeOperationBanqueLibelles
};

/** Libellé d'une valeur d'énumération, chaîne vide si la valeur est inconnue (comme `Choix.libelle`). */
export function libelle(nom: string, valeur: number | null | undefined): string {
	if (valeur === null || valeur === undefined) return '';
	return ENUMS[nom]?.[valeur] ?? '';
}

/**
 * Liste `[{value, label}]` d'une énumération (équivalent de `Choix.options`). Les clés numériques
 * d'un objet JavaScript sont parcourues par valeur croissante, ce qui reproduit l'ordre des
 * déclarations Python — toutes les énumérations sont numérotées dans l'ordre.
 */
export function options(nom: string): Option[] {
	const table = ENUMS[nom];
	if (!table) return [];
	return Object.entries(table).map(([value, label]) => ({ value: Number(value), label }));
}

/**
 * Charge utile de `GET /api/referentiels/enums` : toutes les énumérations, plus `NiveauDiplome`
 * construit depuis `NIVEAUX_DIPLOME` (indices à partir de 0, comme l'`enumerate` de Python).
 */
export function toutesLesEnumerations(): Record<string, Option[]> {
	const data: Record<string, Option[]> = {};
	for (const nom of Object.keys(ENUMS)) data[nom] = options(nom);
	data.NiveauDiplome = NIVEAUX_DIPLOME.map((label, value) => ({ value, label }));
	return data;
}

/** Les valeurs autorisées d'une énumération, pour construire un schéma Zod. */
export function valeurs(nom: string): number[] {
	return Object.keys(ENUMS[nom] ?? {}).map(Number);
}

/** Niveaux de diplôme proposés en saisie rapide (`$arraydiplome`). */
export const NIVEAUX_DIPLOME = [
	'Sans diplôme',
	'CEP',
	'BMG',
	'BMT',
	'BAC',
	'BET',
	'Licence',
	'Master 1',
	'Master 2',
	'Master 3'
] as const;
