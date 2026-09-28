/**
 * Outil de migration : engendre un **dump legacy de synthèse**, pour vérifier que la reprise
 * TypeScript (`src/scripts/reprise-legacy.ts`) donne le même résultat que l'ancienne reprise
 * Python — sans jamais toucher au dump de production.
 *
 * Le dump de production contient les données personnelles des 68 membres et n'est pas versionné
 * (ADR-0012) : il n'est pas disponible en session cloud, et il serait de toute façon imprudent de
 * s'en servir comme banc d'essai. Ce fichier fabrique donc un dump qui a la **forme** du vrai —
 * mêmes tables, mêmes noms de colonnes — et qui exerce délibérément les bizarreries que les deux
 * scripts doivent traiter de la même façon :
 *
 * - dates legacy sous toutes leurs formes (`0000-00-00`, `YYYYMMDD`, `YmdHis`, vides, impossibles) ;
 * - textes doublement encodés en entités HTML, échappés par `addslashes()` ;
 * - numéros de téléphone à normaliser ;
 * - identifiants en double, membres sans mot de passe ;
 * - les bugs legacy que la reprise corrige : e-mail et adresse du promoteur inversés, fiche RH dont
 *   `indexmbr` porte le type de fiche, réponse de dialogue adressée au membre n° 1, produit rangé
 *   dans une catégorie inexistante.
 *
 * Chaque table reçoit **toutes** les colonnes citées par les deux scripts : une colonne absente
 * ferait lever un `KeyError` côté Python, et une colonne en trop est simplement ignorée des deux
 * côtés. La comparaison reste donc valable quelle que soit la table à laquelle une colonne
 * appartient réellement.
 *
 * Usage : `npx tsx scripts/dump-synthetique.ts <fichier.sql>`
 * Comme les autres vérificateurs, il disparaîtra avec `backend/`.
 */
import { writeFileSync } from 'node:fs';

/** Les tables legacy lues par la reprise, avec le nombre de lignes à engendrer. */
const TABLES: Record<string, number> = {
	parametre: 1,
	ville: 2,
	quartier: 2,
	secteuractivite: 2,
	domaineactivite: 2,
	diplome: 2,
	familart: 2,
	membre: 5,
	banque: 2,
	visite: 2,
	visitembr: 3,
	produit: 3,
	maladie: 2,
	conseil: 3,
	soungangai: 3,
	dialogue: 4,
	message: 4,
	contact: 2,
	suggestion: 2,
	entreprise: 2,
	publicite: 2,
	humaine: 3,
	immobilier: 2,
	article: 2,
	partenariat: 2,
	besoin: 2,
	payement: 2,
	panier: 2,
	articlecourse: 2,
	course1: 2,
	course2: 2,
	appelfond: 2,
	collectefond: 2,
	mouvcollectefond: 2,
	likelemba1: 2,
	likelemba2: 2,
	likelemba3: 2,
	fonddesoutien: 2,
	pointcaisse: 2,
	souscriptoportuniteaffaire: 2,
	membreoportuniteaffaire: 2,
	produitoportuniteaffaire: 2,
	businessplan: 3,
	produitprospective: 2,
	prospective1: 3,
	prospective2: 2,
	marche: 2,
	projet: 2,
	reussite: 2,
	conseilfinance: 3,
	placement: 2,
	operatbanq: 2,
	demandecredit: 2,
	contentcredit: 2,
	acompbusinesplan: 2,
	acompprojetagricol: 2,
	acomprestructcredit: 2,
	acompcreditimmobil: 2,
	benchmarking1: 2,
	benchmarking2: 2,
	benchmarking3: 2
};

/** Colonnes citées en clair par la reprise (`r["nom"]`). */
const COLONNES_FIXES = [
	// paramètres
	'adressepmt',
	'phone1pmt',
	'phone2pmt',
	'mailpmt',
	'aidepmt',
	'fondplacementpmt',
	'montantcoursepmt',
	'commissioncoursepmt',
	'conditioncoursepmt',
	'nummembrepmt',
	'numreferencepmt',
	// référentiels
	'indexvil',
	'nomvil',
	'indexqtr',
	'nomqtr',
	'indexsat',
	'libelesat',
	'etatsat',
	'indexdat',
	'libeledat',
	'etatdat',
	'indexdpm',
	'codedpm',
	'libeledpm',
	'indexfam',
	'libelefam',
	// membres
	'indexmbr',
	'identifmbr',
	'droitmbr',
	'motpasmbr',
	'codepointagembr',
	'typembr',
	'categoriembr',
	'codembr',
	'nomprenmbr',
	'pseudombr',
	'sexembr',
	'phonembr',
	'mailmbr',
	'adressembr',
	'observmbr',
	'etatmbr',
	'cnimbr',
	'employeurmbr',
	'situatmatrimmbr',
	'nbenfantmbr',
	'banqboutqmbr',
	'datemastermbr',
	'pointcaissembr',
	'soldepointcaissembr',
	'datepointcaissembr',
	// banques et visites
	'indexbqe',
	'siglebqe',
	'nombqe',
	'phonebqe',
	'adressebqe',
	'mailbqe',
	'sitebqe',
	'nomcontactbqe',
	'phonecontactbqe',
	'observatbqe',
	'etatbqe',
	'indexvst',
	'adresipvst',
	'datevst',
	'datenumvst',
	// produits et santé
	'indexpdt',
	'referencepdt',
	'nompdt',
	'descriptionpdt',
	'groupepdt',
	'prixdistpdt',
	'prixcompdt',
	'prixpubpdt',
	'quantitepdt',
	'etatpdt',
	'nbvisitepdt',
	'datevisitpdt',
	'indexmld',
	'libelemld',
	'descriptionmld',
	'etatmld',
	// forum
	'indexcsl',
	'referencecsl',
	'objetcsl',
	'textecsl',
	'confidencecsl',
	'nbreponsecsl',
	'etatcsl',
	'datecsl',
	'sujetreponsecsl',
	// découverte de soi
	'indexsga',
	'referencesga',
	'datesga',
	'etatsga',
	// dialogues et messages
	'indexdlg',
	'indexmbrdlg',
	'typedlg',
	'textedlg',
	'etatdlg',
	'datedlg',
	'indexmsg',
	'index1mbr',
	'textemsg',
	'etatmsg',
	'datemsg',
	'indexctt',
	'nomctt',
	'mailctt',
	'objetctt',
	'textectt',
	'etatctt',
	'datectt',
	'reponsectt',
	'indexsgt',
	'datesgt',
	'modulesgt',
	'textesgt',
	'etatsgt',
	// entreprises et publicités
	'indexent',
	'referenceent',
	'noment',
	'formeent',
	'capitalent',
	'descriptent',
	'commentent',
	'gerantent',
	'phoneent',
	'mailent',
	'siteent',
	'adresseent',
	'etatent',
	'dateinscriptent',
	'nbvisiteent',
	'datevisiteent',
	'indexpub',
	'referencepub',
	'objetpub',
	'textepub',
	'datedebpub',
	'datefinpub',
	'typefichpub',
	'nbvuepub',
	'datevuepub',
	'etatpub',
	'dateinscpub',
	// ressources humaines
	'indexhmn',
	'typeinscripthmn',
	'referencehmn',
	'nomhmn',
	'prenomhmn',
	'sexehmn',
	'datenaishmn',
	'adressehmn',
	'phonehmn',
	'mailhmn',
	'diplomehmn',
	'savoirfairehmn',
	'experience1hmn',
	'experience2hmn',
	'competencehmn',
	'postepourvoirhmn',
	'autreinfohmn',
	'etathmn',
	'dateinscripthmn',
	'nbrvisitehmn',
	'datevisitehmn',
	// e-commerce
	'indeximb',
	'referenceimb',
	'offredemandeimb',
	'transactionimb',
	'typeimb',
	'localisationimb',
	'surfaceimb',
	'nbpieceimb',
	'nbchambreimb',
	'situationimb',
	'priximb',
	'descriptimb',
	'etatimb',
	'dateinscriptimb',
	'nbvisiteimb',
	'datevisiteimb',
	'indexart',
	'referenceart',
	'offredemandeart',
	'libeleart',
	'prixart',
	'quantiteart',
	'neufocasart',
	'descriptart',
	'etatart',
	'dateinscriptart',
	'nbvisiteart',
	'datevisiteart',
	'indexptn',
	'referenceptn',
	'actifptn',
	'descriptptn',
	'rechercheptn',
	'objectifptn',
	'etatptn',
	'dateptn',
	'indexbsn',
	'typebsn',
	'interesebsn',
	'besoinbsn',
	'datebsn',
	'etatbsn',
	'indexpay',
	'typepnrpay',
	'datepay',
	'typepay',
	'montantpay',
	'remarquepay',
	'etatpay',
	'indexpnr',
	'typepnr',
	'qtepnr',
	'prixpnr',
	'datepnr',
	'etatpayepnr',
	'datepayepnr',
	'etatpnr',
	// courses
	'indexartcse',
	'indexbtq',
	'codeartcse',
	'nomartcse',
	'marqueartcse',
	'prixartcse',
	'disponibleartcse',
	'observationartcse',
	'etatartcse',
	'indexcrs1',
	'referencecrs1',
	'magasincrs1',
	'dateachatcrs1',
	'datelivraisoncrs1',
	'lieulivraisoncrs1',
	'montantcrs1',
	'commissioncrs1',
	'modepayecrs1',
	'etatpayecrs1',
	'observationcrs1',
	'etatcoursecrs1',
	'etatcrs1',
	'datecrs1',
	'indexcrs2',
	'articlecrs2',
	'prixcrs2',
	'quantitecrs2',
	'observationcrs2',
	'etatcrs2',
	// appels de fonds
	'indexadf',
	'referenceadf',
	'nomprojetadf',
	'objetprojetadf',
	'descriptactiviteadf',
	'descriptprojetadf',
	'devisprojetadf',
	'apportfondadf',
	'besoinfondadf',
	'niveaurealisatadf',
	'nompromotadf',
	'phonepromotadf',
	'mailpromotadf',
	'adressepromotadf',
	'observatadf',
	'appreciatadf',
	'promisfondadf',
	'colectefondadf',
	'etatadf',
	'dateinscriptadf',
	'nbvisiteadf',
	'datevisiteadf',
	'indexcdf',
	'referencecdf',
	'dateaportcdf',
	'typeaportcdf',
	'montantprevucdf',
	'echeancecdf',
	'montantversecdf',
	'dateversecdf',
	'remarquecdf',
	'observcdf',
	'etatcdf',
	'indexmcf',
	'datemcf',
	'montantmcf',
	'etatmcf',
	// likelemba
	'indexlkb1',
	'codelkb1',
	'indexcheflkb1',
	'montantlkb1',
	'periodelkb1',
	'datedebutlkb1',
	'observatlkb1',
	'nbentrelkb1',
	'nbpayelkb1',
	'etatlkb1',
	'indexlkb2',
	'codelkb2',
	'dateentrelkb2',
	'observatlkb2',
	'etatlkb2',
	'personcautlkb2',
	'personcautmbrlkb2',
	'cnipersoncautlkb2',
	'adressepersoncautlkb2',
	'activitepersoncautlkb2',
	'phonepersoncautlkb2',
	'indexlkb3',
	'codelkb3',
	'indcaisrlkb3',
	'datepayelkb3',
	'montantlkb3',
	'modepayelkb3',
	'codechardenlkb3',
	'observatlkb3',
	'etatlkb3',
	// épargne et pointage
	'indexfds',
	'referencefds',
	'datefds',
	'typefds',
	'indrapporteurfds',
	'rapporteurfds',
	'indsouscripteurfds',
	'souscripteurfds',
	'motivationfds',
	'montantfds',
	'dureefds',
	'modepayefds',
	'confirmefds',
	'etatfds',
	'indexpcs',
	'codepcs',
	'dateheurepcs',
	'indexcaissepcs',
	'operationpcs',
	'montantpcs',
	'motifpcs',
	'soldepcs',
	'typecaissepcs',
	// opportunité d'affaire
	'indexsoa',
	'referencesoa',
	'datesoa',
	'zone02soa',
	'zone03soa',
	'zone04soa',
	'zone12soa',
	'zone21soa',
	'zone22soa',
	'zone23soa',
	'etatsoa',
	'indexmoa',
	'nomprenmoa',
	'phonemoa',
	'mailmoa',
	'commentairemoa',
	'etatmoa',
	'indexpoa',
	'prixpoa',
	'quantitepoa',
	// business plan
	'indexbsp',
	'zone27bsp',
	'zone28bsp',
	'zone29bsp',
	// comparateur, marchés, projets, réussites
	'indexptpv',
	'nomproduitptpv',
	'etatptpv',
	'indexppv1',
	'etatppv1',
	'indexppv2',
	'offredemandeppv2',
	'unitemesureppv2',
	'prixppv2',
	'fournisseurclientppv2',
	'volumeppv2',
	'etatppv2',
	'indexmch',
	'referencemch',
	'numerooffremch',
	'typemch',
	'libellemch',
	'descriptionmch',
	'montantmch',
	'delaimch',
	'dossiermch',
	'lieudepotmch',
	'adressemailmch',
	'maitreouvragemch',
	'publierparmch',
	'beneficiairemch',
	'etatmch',
	'indexpjt',
	'referencepjt',
	'responsablepjt',
	'promoteurpjt',
	'objetpjt',
	'libellepjt',
	'objectifpjt',
	'descriptionpjt',
	'adressepjt',
	'dureepjt',
	'datelancementpjt',
	'conditionpjt',
	'etatpjt',
	'indexrst',
	// offres financières
	'indexcsf',
	'typecsf',
	'referencecsf',
	'objetcsf',
	'textecsf',
	'auteursujetcsf',
	'confidencecsf',
	'nbreponsecsf',
	'etatcsf',
	'datecsf',
	'sujetreponsecsf',
	'indexpcm',
	'referencepcm',
	'typepcm',
	'datepcm',
	'montantpcm',
	'durepcm',
	'tauxpcm',
	'banquepcm',
	'sectactivpcm',
	'observpcm',
	'etatpcm',
	'indexopb',
	'referenceopb',
	'date1opb',
	'date2opb',
	'montantopb',
	'deviseopb',
	'typeopb',
	'nombanqueemettriceopb',
	'mailbanqueemettriceopb',
	'beneficiaireopb',
	'indexbanquebeneficiaireopb',
	'nombanquebeneficiaireopb',
	'adressebanquebeneficiaireopb',
	'etatopb',
	'indexdct',
	'referencedct',
	'datedct',
	'montantdct',
	'objetdct',
	'duredct',
	'niveaurealisatdct',
	'garantidct',
	'delaireponsedct',
	'observdct',
	'devisglobaldct',
	'apportpropredct',
	'etatdct',
	'indexctc',
	'referencectc',
	'datectc',
	'zone10ctc',
	'zone12ctc',
	'zone15ctc',
	'zone17ctc',
	'etatctc',
	// tarifs bancaires
	'indexbm1',
	'libelebm1',
	'etatbm1',
	'indexbm2',
	'libelebm2',
	'etatbm2',
	'indexbm3',
	'tarifbm3',
	'etatbm3'
];

/** Colonnes engendrées par les boucles de la reprise (`r[f"zone{i:02d}sga"]`…). */
function colonnesDynamiques(): string[] {
	const noms: string[] = [];
	const deux = (i: number): string => String(i).padStart(2, '0');
	for (let i = 1; i <= 7; i += 1) noms.push(`choix${i}pmt`);
	for (let i = 1; i <= 5; i += 1) {
		noms.push(`index${i}pdt`, `posologie${i}pdtmld`, `index${i}mld`, `posologie${i}pdt`);
	}
	for (let i = 1; i <= 30; i += 1) noms.push(`zone${deux(i)}sga`);
	for (const i of [1, 2, 3]) {
		noms.push(`temoin${i}lkb2`, `phonetemoin${i}lkb2`, `emploitemoin${i}lkb2`, `temoin${i}mbrlkb2`);
	}
	for (const i of [1, 2, 3, 4]) noms.push(`zone09${i}soa`, `zone10${i}soa`, `zone11${i}soa`);
	for (const i of [1, 2, 3]) {
		noms.push(`zone13${i}soa`, `zone14${i}soa`, `zone15${i}soa`, `zone16${i}soa`, `zone17${i}soa`);
	}
	for (let i = 2; i <= 29; i += 1) noms.push(`zone${deux(i)}bsp`);
	for (const z of ['04', '05', '06', '07', '08', '09', '11', '13', '14', '16']) {
		noms.push(`zone${z}ctc`, `zone${z}Actc`);
	}
	for (let i = 2; i <= 15; i += 1) noms.push(`zone${deux(i)}rst`);
	for (const [suffixe, nb] of [
		['abp', 58],
		['apa', 80],
		['arc', 47],
		['aci', 38]
	] as [string, number][]) {
		noms.push(`etat${suffixe}`);
		for (let z = 1; z <= nb; z += 1) noms.push(`zone${deux(z)}${suffixe}`);
	}
	return noms;
}

const COLONNES = [...new Set([...COLONNES_FIXES, ...colonnesDynamiques()])].sort();

// --- Valeurs -------------------------------------------------------------------------------------

/** Textes exerçant le double encodage HTML et l'échappement `addslashes()` du PHP. */
const TEXTES = [
	'Caf&eacute; du march&eacute;',
	'&amp;amp; double encodage &amp;lt;balise&amp;gt;',
	'L\\\'apostrophe &#039;&#039; et le \\"guillemet\\"',
	'Texte simple sans pi&egrave;ge',
	'  espaces autour  ',
	'&laquo;&nbsp;citation&nbsp;&raquo; &hellip;',
	''
];

/** Toutes les formes de date que le legacy a produites, y compris les impossibles. */
const DATES = [
	'2016-01-15',
	'0000-00-00',
	'20180312',
	'2019-02-31',
	'',
	'2020-07-04 14:22:33',
	'20211130235959'
];

/** Numéros de téléphone tels qu'ils étaient saisis, à normaliser. */
const TELEPHONES = ['06 12 34 56 78', '+242 05 555 44 33', '0655-44-33', 'pas un numéro', ''];

function texte(i: number): string {
	return TEXTES[i % TEXTES.length]!;
}

function date_(i: number): string {
	return DATES[i % DATES.length]!;
}

/**
 * Valeur d'une colonne pour la ligne `ligne` de la table `table`.
 * La convention de nommage du legacy suffit à décider du genre de valeur.
 */
function valeur(table: string, colonne: string, ligne: number): string | number {
	const graine = ligne + colonne.length;

	// Clé primaire de la table courante : la ligne elle-même.
	if (colonne === CLE_PRIMAIRE[table]) return ligne;
	// Autres identifiants : pointent sur une ligne existante (1 ou 2), parfois sur rien (0).
	if (colonne.startsWith('index') || colonne.startsWith('ind')) {
		return graine % 5 === 0 ? 0 : (graine % 2) + 1;
	}
	if (colonne.startsWith('date') || colonne.includes('date')) return date_(graine);
	if (colonne.startsWith('phone')) return TELEPHONES[graine % TELEPHONES.length]!;
	if (colonne.startsWith('mail')) return graine % 3 === 0 ? '' : `membre${ligne}@exemple.cg`;
	if (colonne.startsWith('etat')) return (graine % 3) + 1;
	if (
		/^(montant|prix|solde|capital|devis|apport|besoin|promis|colecte|fond|commission|taux|volume|quantite|qte|nb|surface|duree|dure|echeance|delai|niveau)/.test(
			colonne
		)
	) {
		return graine * 1000;
	}
	if (
		/^(type|mode|sexe|groupe|categorie|periode|forme|confidence|module|operation|offredemande|neufocas|transaction|situation|disponible|confirme|interese|appreciat|devise)/.test(
			colonne
		)
	) {
		return (graine % 4) + 1;
	}
	return texte(graine);
}

/** Colonne d'identifiant propre à chaque table : elle vaut le numéro de la ligne. */
const CLE_PRIMAIRE: Record<string, string> = {
	ville: 'indexvil',
	quartier: 'indexqtr',
	secteuractivite: 'indexsat',
	domaineactivite: 'indexdat',
	diplome: 'indexdpm',
	familart: 'indexfam',
	membre: 'indexmbr',
	banque: 'indexbqe',
	visite: 'indexvst',
	visitembr: 'indexvst',
	produit: 'indexpdt',
	maladie: 'indexmld',
	conseil: 'indexcsl',
	soungangai: 'indexsga',
	dialogue: 'indexdlg',
	message: 'indexmsg',
	contact: 'indexctt',
	suggestion: 'indexsgt',
	entreprise: 'indexent',
	publicite: 'indexpub',
	humaine: 'indexhmn',
	immobilier: 'indeximb',
	article: 'indexart',
	partenariat: 'indexptn',
	besoin: 'indexbsn',
	payement: 'indexpay',
	panier: 'indexpnr',
	articlecourse: 'indexartcse',
	course1: 'indexcrs1',
	course2: 'indexcrs2',
	appelfond: 'indexadf',
	collectefond: 'indexcdf',
	mouvcollectefond: 'indexmcf',
	likelemba1: 'indexlkb1',
	likelemba2: 'indexlkb2',
	likelemba3: 'indexlkb3',
	fonddesoutien: 'indexfds',
	pointcaisse: 'indexpcs',
	souscriptoportuniteaffaire: 'indexsoa',
	membreoportuniteaffaire: 'indexmoa',
	produitoportuniteaffaire: 'indexpoa',
	businessplan: 'indexbsp',
	produitprospective: 'indexptpv',
	prospective1: 'indexppv1',
	prospective2: 'indexppv2',
	marche: 'indexmch',
	projet: 'indexpjt',
	reussite: 'indexrst',
	conseilfinance: 'indexcsf',
	placement: 'indexpcm',
	operatbanq: 'indexopb',
	demandecredit: 'indexdct',
	contentcredit: 'indexctc',
	benchmarking1: 'indexbm1',
	benchmarking2: 'indexbm2',
	benchmarking3: 'indexbm3'
};

/**
 * Retouches qui font passer la reprise par ses chemins de correction : ce sont elles qui donnent
 * sa valeur à la comparaison, puisque c'est là que les deux scripts peuvent diverger.
 */
function retoucher(table: string, ligne: number, r: Record<string, string | number>): void {
	if (table === 'membre') {
		r.identifmbr = ligne === 3 ? 'doublon' : ligne === 4 ? 'doublon' : `membre${ligne}`;
		r.motpasmbr = ligne === 5 ? '' : `motdepasse${ligne}`; // le 5e ne pourra plus se connecter
		r.droitmbr = ligne === 1 ? '1110' : '0000';
		r.typembr = ligne === 1 ? 1 : 3; // le 1er est gestionnaire
		r.categoriembr = ligne === 2 ? 2 : 1; // le 2e est une personne morale
		r.codepointagembr = ligne === 1 ? 1234 : 0;
	}
	if (table === 'conseil') r.sujetreponsecsl = ligne === 1 ? 1 : 2;
	if (table === 'conseilfinance') r.sujetreponsecsf = ligne === 1 ? 1 : 2;
	// Une réponse sans sujet : sa référence ne correspond à aucun sujet.
	if ((table === 'conseil' || table === 'conseilfinance') && ligne === 3) {
		r[table === 'conseil' ? 'referencecsl' : 'referencecsf'] = 'REF-ORPHELINE';
	}
	// Produit rangé hors des 20 catégories : la reprise le reclasse d'après son nom.
	if (table === 'produit') {
		r.groupepdt = ligne === 1 ? 5 : ligne === 2 ? 100 : 0;
		r.nompdt = ligne === 2 ? 'Forever Bee Honey' : ligne === 3 ? 'Aloe Vera Gel drink' : 'Produit';
	}
	// Fiche RH dont `indexmbr` porte le type de fiche : auteur irrécupérable.
	if (table === 'humaine') {
		r.typeinscripthmn = ligne === 1 ? 1 : 2;
		r.indexmbr = ligne === 1 ? 1 : ligne === 2 ? 2 : 2; // la 3e déclenche le bug
	}
	// Dialogue : le 1er membre écrit, le gestionnaire répond « au membre n° 1 ».
	if (table === 'dialogue') {
		r.typedlg = 1;
		r.indexmbr = ligne <= 2 ? 2 : 1; // 1 = gestionnaire
		r.indexmbrdlg = ligne <= 2 ? 0 : 1;
		r.datedlg = `2020-03-0${ligne} 10:00:00`;
	}
	// Messages : chacune des trois branches de la reprise.
	if (table === 'message') {
		r.index1mbr = ligne === 1 ? 2 : 1;
		r.indexmbr = ligne === 1 ? 0 : ligne === 2 ? 2 : ligne === 3 ? 1 : 99;
	}
	// Appel de fonds : e-mail et adresse du promoteur inversés à la saisie.
	if (table === 'appelfond') {
		r.mailpromotadf = ligne === 1 ? 'Avenue de la Paix, Brazzaville' : 'promoteur@exemple.cg';
		r.adressepromotadf = ligne === 1 ? 'promoteur@exemple.cg' : 'Avenue de la Paix';
	}
	// Découverte de soi et business plan : une seule fiche par membre, la seconde est un doublon.
	if (table === 'soungangai' || table === 'businessplan') r.indexmbr = ligne === 3 ? 9 : 2;
	// Comparateur : `indexent` porte l'identifiant du membre, pas celui de l'entreprise.
	if (table === 'prospective1') {
		r.indexent = ligne === 3 ? 99 : ligne;
		r.indexmbr = ligne;
	}
}

// --- Écriture ------------------------------------------------------------------------------------

/** Échappe une valeur à la façon de phpMyAdmin. */
function litteral(v: string | number): string {
	if (typeof v === 'number') return String(v);
	const echappe = v
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r');
	return `'${echappe}'`;
}

function engendrer(): string {
	const morceaux = [
		'-- Dump legacy de SYNTHÈSE — aucune donnée réelle.',
		'-- Engendré par api/scripts/dump-synthetique.ts pour comparer les deux scripts de reprise.',
		''
	];
	const colonnes = COLONNES.map((c) => `\`${c}\``).join(', ');
	for (const [table, nb] of Object.entries(TABLES)) {
		const lignes: string[] = [];
		for (let i = 1; i <= nb; i += 1) {
			const r: Record<string, string | number> = {};
			for (const c of COLONNES) r[c] = valeur(table, c, i);
			retoucher(table, i, r);
			lignes.push(`(${COLONNES.map((c) => litteral(r[c]!)).join(', ')})`);
		}
		morceaux.push(`INSERT INTO \`${table}\` (${colonnes}) VALUES`, `${lignes.join(',\n')};`, '');
	}
	return morceaux.join('\n');
}

const cible = process.argv[2];
if (!cible) throw new Error('Usage : npx tsx scripts/dump-synthetique.ts <fichier.sql>');
writeFileSync(cible, engendrer(), 'utf8');
console.log(
	`Dump de synthèse écrit dans ${cible} : ${Object.keys(TABLES).length} tables, ` +
		`${COLONNES.length} colonnes, ${Object.values(TABLES).reduce((a, b) => a + b, 0)} lignes.`
);
