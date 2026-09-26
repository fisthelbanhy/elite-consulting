/**
 * Description des référentiels « simples » administrés par une page générique
 * (`/gestion/referentiels/[type]`). Produits et fiches bien-être ont leurs propres pages.
 * Legacy : pvilqtr, pdiplome, psatdat, pfamilart, pproduitptpv, pbanque (E-ADM-03 à E-ADM-10).
 */

export type GenreChamp = 'texte' | 'zone' | 'etat' | 'ville' | 'secteur';

export interface ChampRef {
	nom: string;
	label: string;
	genre: GenreChamp;
	requis?: boolean;
	aide?: string;
}

export interface ColonneRef {
	/** Chemin de la valeur, éventuellement pointé (« ville.nom »). */
	cle: string;
	label: string;
	genre?: 'etat' | 'nombre';
	/** Colonne masquée sur petit écran. */
	secondaire?: boolean;
}

export interface ConfigReferentiel {
	cle: string;
	titre: string;
	description: string;
	nouveau: string;
	/** Référentiel parent (liste de choix et filtre). */
	parent?: 'ville' | 'secteur';
	filtreEtat?: boolean;
	/** Suppression logique (état « Supprimé ») plutôt que physique. */
	logique: boolean;
	champs: ChampRef[];
	colonnes: ColonneRef[];
	libelle: string;
}

const ETAT: ChampRef = { nom: 'etat', label: 'État', genre: 'etat', aide: '« Supprimé » retire l’élément des listes du site.' };

export const REFERENTIELS: Record<string, ConfigReferentiel> = {
	villes: {
		cle: 'villes',
		titre: 'Villes',
		description: 'Villes proposées à l’inscription et dans les annonces.',
		nouveau: 'Nouvelle ville',
		logique: false,
		libelle: 'nom',
		champs: [{ nom: 'nom', label: 'Nom de la ville', genre: 'texte', requis: true, aide: '4 caractères minimum.' }],
		colonnes: [
			{ cle: 'nom', label: 'Ville' },
			{ cle: 'nombre_quartiers', label: 'Quartiers', genre: 'nombre' },
			{ cle: 'nombre_membres', label: 'Membres', genre: 'nombre' }
		]
	},
	quartiers: {
		cle: 'quartiers',
		titre: 'Quartiers',
		description: 'Quartiers rattachés à une ville (annonces immobilières).',
		nouveau: 'Nouveau quartier',
		parent: 'ville',
		logique: false,
		libelle: 'nom',
		champs: [
			{ nom: 'ville_id', label: 'Ville', genre: 'ville', requis: true },
			{ nom: 'nom', label: 'Nom du quartier', genre: 'texte', requis: true, aide: '4 caractères minimum, unique dans la ville.' }
		],
		colonnes: [
			{ cle: 'ville.nom', label: 'Ville' },
			{ cle: 'nom', label: 'Quartier' },
			{ cle: 'nombre_annonces', label: 'Annonces', genre: 'nombre', secondaire: true }
		]
	},
	secteurs: {
		cle: 'secteurs',
		titre: "Secteurs d'activité",
		description: 'Grandes familles de métiers ; chaque domaine est rattaché à un secteur.',
		nouveau: 'Nouveau secteur',
		filtreEtat: true,
		logique: true,
		libelle: 'libelle',
		champs: [{ nom: 'libelle', label: 'Libellé', genre: 'texte', requis: true, aide: '5 caractères minimum.' }, ETAT],
		colonnes: [
			{ cle: 'libelle', label: 'Secteur' },
			{ cle: 'nombre_domaines', label: 'Domaines', genre: 'nombre' },
			{ cle: 'etat', label: 'État', genre: 'etat' }
		]
	},
	domaines: {
		cle: 'domaines',
		titre: "Domaines d'activité",
		description: 'Métiers précis, groupés par secteur (profils, emplois, entreprises).',
		nouveau: 'Nouveau domaine',
		parent: 'secteur',
		filtreEtat: true,
		logique: true,
		libelle: 'libelle',
		champs: [
			{ nom: 'secteur_id', label: 'Secteur', genre: 'secteur', requis: true, aide: 'Obligatoire : tout domaine est lié à un secteur.' },
			{ nom: 'libelle', label: 'Libellé', genre: 'texte', requis: true, aide: '5 caractères minimum.' },
			ETAT
		],
		colonnes: [
			{ cle: 'secteur.libelle', label: 'Secteur', secondaire: true },
			{ cle: 'libelle', label: 'Domaine' },
			{ cle: 'etat', label: 'État', genre: 'etat' }
		]
	},
	diplomes: {
		cle: 'diplomes',
		titre: 'Diplômes',
		description: 'Liste de référence des diplômes.',
		nouveau: 'Nouveau diplôme',
		logique: false,
		libelle: 'libelle',
		champs: [
			{ nom: 'code', label: 'Code', genre: 'texte', aide: 'Mis en majuscules (ex. BTS).' },
			{ nom: 'libelle', label: 'Libellé', genre: 'texte', requis: true, aide: '5 caractères minimum.' }
		],
		colonnes: [
			{ cle: 'code', label: 'Code' },
			{ cle: 'libelle', label: 'Libellé' }
		]
	},
	familles: {
		cle: 'familles',
		titre: "Familles d'articles",
		description: 'Catégories des petites annonces.',
		nouveau: 'Nouvelle famille',
		logique: false,
		libelle: 'libelle',
		champs: [{ nom: 'libelle', label: 'Libellé', genre: 'texte', requis: true, aide: '5 caractères minimum.' }],
		colonnes: [
			{ cle: 'libelle', label: 'Famille' },
			{ cle: 'nombre_articles', label: 'Annonces', genre: 'nombre' }
		]
	},
	'produits-comparateur': {
		cle: 'produits-comparateur',
		titre: 'Produits du comparateur',
		description: 'Produits proposés dans le comparateur de prix entre entreprises.',
		nouveau: 'Nouveau produit',
		filtreEtat: true,
		logique: true,
		libelle: 'nom',
		champs: [{ nom: 'nom', label: 'Nom du produit', genre: 'texte', requis: true, aide: '4 caractères minimum.' }, ETAT],
		colonnes: [
			{ cle: 'nom', label: 'Produit' },
			{ cle: 'nombre_lignes', label: 'Offres et demandes', genre: 'nombre' },
			{ cle: 'etat', label: 'État', genre: 'etat' }
		]
	},
	banques: {
		cle: 'banques',
		titre: 'Banques',
		description: 'Banques partenaires (tarifs bancaires, opérations, crédit).',
		nouveau: 'Nouvelle banque',
		filtreEtat: true,
		logique: true,
		libelle: 'nom',
		champs: [
			{ nom: 'sigle', label: 'Sigle', genre: 'texte', aide: 'Mis en majuscules.' },
			{ nom: 'nom', label: 'Nom de la banque', genre: 'texte', requis: true, aide: '3 caractères minimum.' },
			{ nom: 'telephones', label: 'Téléphones', genre: 'texte' },
			{ nom: 'email', label: 'E-mail', genre: 'texte' },
			{ nom: 'site_web', label: 'Site web', genre: 'texte' },
			{ nom: 'adresse', label: 'Adresse', genre: 'zone' },
			{ nom: 'nom_contact', label: 'Personne à contacter', genre: 'texte' },
			{ nom: 'telephone_contact', label: 'Téléphone du contact', genre: 'texte' },
			{ nom: 'observation', label: 'Observation', genre: 'zone' },
			ETAT
		],
		colonnes: [
			{ cle: 'sigle', label: 'Sigle', secondaire: true },
			{ cle: 'nom', label: 'Banque' },
			{ cle: 'nom_contact', label: 'Contact', secondaire: true },
			{ cle: 'telephone_contact', label: 'Tél. contact', secondaire: true },
			{ cle: 'etat', label: 'État', genre: 'etat' }
		]
	}
};

/** Lit une valeur par chemin pointé (« ville.nom »). */
export function valeurChemin(objet: Record<string, unknown>, chemin: string): unknown {
	return chemin.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), objet);
}

/** Spécification `lireFormulaire` déduite des champs. */
export function specFormulaire(cfg: ConfigReferentiel): Record<string, 'texte' | 'entier' | 'entier?'> {
	return Object.fromEntries(
		cfg.champs.map((c) => [c.nom, c.genre === 'etat' ? 'entier' : c.genre === 'ville' || c.genre === 'secteur' ? 'entier?' : 'texte'])
	);
}

export const ETATS_REFERENTIEL = [
	{ value: 1, label: 'Non traité' },
	{ value: 2, label: 'Autorisé' },
	{ value: 3, label: 'Supprimé' }
];
