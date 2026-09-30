/**
 * Reprise des données de production legacy (dump MySQL) dans la nouvelle base.
 * Portage de `backend/scripts/reprise_legacy.py`.
 *
 * Usage (depuis `api/`) :
 *     npx tsx src/scripts/reprise-legacy.ts ../../cp1019011_lafrangine.sql \
 *         [--images ../../lafrangine/V04/image/ig] [--rapport data/rapport-reprise.md]
 *
 * Ré-exécutable : toutes les tables sont vidées puis rechargées. Les clés primaires legacy sont
 * conservées (ADR-0003). Les mots de passe et codes de pointage sont hachés (ADR-0005). Un rapport
 * liste les lignes écartées et les corrections appliquées — il est à lire après chaque reprise.
 *
 * ⚠️ Le dump de production contient les données personnelles des membres et n'est **jamais**
 * versionné (ADR-0012). Ce script se lance donc en local, sur le poste du porteur, jamais depuis
 * une session cloud.
 */
import { copyFileSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { BASE_DIR, config } from '../config.js';
import { db, JourSeul, sqlite } from '../db.js';
import { Etat, TypeMembre } from '../enums.js';
import * as S from '../schema/index.js';
import { hacherMotDePasse } from '../securite.js';
import { normaliserTelephone } from '../services/validation.js';
import { deshtml } from './deshtml.js';
import { lireDump, type LigneDump, type ValeurDump } from './lire-dump.js';
import { appliquerMigrations } from './migrer.js';

/** Date de lancement du site : sert aux lignes legacy dépourvues de date. */
const DATE_INCONNUE = new Date(2016, 0, 1);

const rapport = new Map<string, string[]>();
const compte = new Map<string, number>();

function noter(titre: string, detail: string): void {
	const liste = rapport.get(titre) ?? [];
	liste.push(detail);
	rapport.set(titre, liste);
}

function compter(nom: string, n: number): void {
	compte.set(nom, (compte.get(nom) ?? 0) + n);
}

// --- Conversions ---------------------------------------------------------------------------------

/** Date legacy (`YYYY-MM-DD`, `YYYYMMDD`, `0000-00-00`) → date sans heure. */
function d(v: ValeurDump): JourSeul | null {
	if (typeof v !== 'string' || !v || v.startsWith('0000') || v.replaceAll('0', '') === '') {
		return null;
	}
	const m = v.includes('-')
		? /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
		: /^(\d{4})(\d{2})(\d{2})/.exec(v.slice(0, 8));
	if (!m) return null;
	const [an, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new JourSeul(an, mois - 1, jour);
	// Une date impossible (31 février) ne vaut pas une date : elle est écartée.
	return date.getFullYear() === an && date.getMonth() === mois - 1 && date.getDate() === jour
		? date
		: null;
}

/** Date-heure legacy (`YYYY-MM-DD HH:MM:SS` ou `YmdHis`) → date-heure. */
function dt(v: ValeurDump): Date | null {
	if (typeof v !== 'string' || !v || v.startsWith('0000') || v.replaceAll('0', '') === '') {
		return null;
	}
	let m: RegExpExecArray | null;
	if (v.includes('-')) {
		m = /^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2})?:?(\d{2})?:?(\d{2})?/.exec(v.slice(0, 19));
	} else {
		m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(v.padEnd(14, '0').slice(0, 14));
	}
	if (!m) return null;
	const [an, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const [h, mi, s] = [Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)];
	const date = new Date(an, mois - 1, jour, h, mi, s);
	return date.getFullYear() === an && date.getMonth() === mois - 1 && date.getDate() === jour
		? date
		: null;
}

/**
 * Texte legacy nettoyé. Le PHP stockait les saisies passées par `htmlspecialchars()` — parfois
 * deux fois (« &amp;amp; ») — et par `addslashes()` (« \\' »). On restitue le texte brut ;
 * l'échappement se fait désormais à l'affichage, par Svelte.
 */
function txt(v: ValeurDump): string {
	if (v === null || v === undefined) return '';
	let s = String(v);
	for (let i = 0; i < 3; i += 1) {
		const brut = deshtml(s);
		if (brut === s) break;
		s = brut;
	}
	return s.replaceAll("\\'", "'").replaceAll('\\"', '"').trim();
}

/** Nombre legacy → entier ; tout ce qui n'est pas lisible vaut 0. */
function n(v: ValeurDump): number {
	if (v === null || v === undefined || v === '') return 0;
	const x = Number(v);
	return Number.isFinite(x) ? Math.trunc(x) : 0;
}

/** Nombre décimal legacy → flottant ; équivalent de `float(v or 0)`. */
function f(v: ValeurDump): number {
	if (v === null || v === undefined || v === '') return 0;
	const x = Number(v);
	return Number.isFinite(x) ? x : 0;
}

/** `0` legacy → `NULL`. */
function opt(v: ValeurDump): number | null {
	return n(v) || null;
}

// --- Clés étrangères -----------------------------------------------------------------------------

/** Identifiants effectivement chargés, par table : sert à valider les clés étrangères. */
const identifiantsCharges = new Map<string, Set<number>>();

function fk(table: string, v: ValeurDump, contexte = ''): number | null {
	const valeur = opt(v);
	if (valeur === null) return null;
	if (identifiantsCharges.get(table)?.has(valeur)) return valeur;
	if (contexte) noter('références orphelines mises à NULL', `${contexte} → ${table}#${valeur}`);
	return null;
}

/** Insère les lignes, retient leurs identifiants et met à jour le décompte du rapport. */
function charger(table: SQLiteTable, lignes: Record<string, unknown>[], nom?: string): void {
	const nomTable = getTableName(table);
	if (lignes.length) {
		// Par paquets : SQLite refuse au-delà de 999 paramètres liés par requête.
		const colonnes = Math.max(1, Object.keys(getTableColumns(table)).length);
		const paquet = Math.max(1, Math.floor(900 / colonnes));
		for (let i = 0; i < lignes.length; i += paquet) {
			db.insert(table)
				.values(lignes.slice(i, i + paquet) as never)
				.run();
		}
	}
	const connus = identifiantsCharges.get(nomTable) ?? new Set<number>();
	for (const ligne of lignes) if (typeof ligne.id === 'number') connus.add(ligne.id);
	identifiantsCharges.set(nomTable, connus);
	compter(nom ?? nomTable, lignes.length);
}

/** Copie une image legacy dans le dossier des médias et rend son chemin relatif. */
function copierMedia(images: string | null, nomSource: string, dossier: string): string | null {
	if (images === null) return null;
	for (const candidat of [
		join(images, nomSource),
		join(images, nomSource.toUpperCase()),
		join(images, nomSource.toLowerCase())
	]) {
		if (!existsSync(candidat)) continue;
		const cible = join(config.mediaDir, dossier);
		mkdirSync(cible, { recursive: true });
		const nom = `legacy-${basename(candidat).toLowerCase()}`;
		copyFileSync(candidat, join(cible, nom));
		compter('fichiers copiés', 1);
		return `${dossier}/${nom}`;
	}
	return null;
}

// --- Reprise -------------------------------------------------------------------------------------

/** Vide la base puis rejoue les migrations : le schéma repart exactement de la version courante. */
function repartirDeZero(): void {
	const tables = sqlite
		.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
		.all() as { name: string }[];
	sqlite.pragma('foreign_keys = OFF');
	for (const { name } of tables) sqlite.prepare(`drop table if exists "${name}"`).run();
	sqlite.pragma('foreign_keys = ON');
	appliquerMigrations();
}

async function reprendre(dump: string, images: string | null): Promise<void> {
	const src = lireDump(dump);
	const T = (nom: string): LigneDump[] => src[nom] ?? [];

	repartirDeZero();

	// Paramètres ---------------------------------------------------------------------------------
	const parametres = T('parametre');
	if (parametres.length) {
		const p = parametres[0]!;
		const sections: Record<string, string> = {};
		for (let i = 1; i <= 7; i += 1) sections[`description_section_${i}`] = txt(p[`choix${i}pmt`]!);
		charger(S.parametre, [
			{
				id: 1,
				nom_site: 'La Frangine',
				adresse: txt(p.adressepmt!),
				telephone_1: txt(p.phone1pmt!),
				telephone_2: txt(p.phone2pmt!),
				email: txt(p.mailpmt!),
				whatsapp: txt(p.phone1pmt!),
				texte_aide: txt(p.aidepmt!),
				montant_minimum_placement: n(p.fondplacementpmt!),
				montant_minimum_course: n(p.montantcoursepmt!),
				commission_course: n(p.commissioncoursepmt!),
				conditions_course: txt(p.conditioncoursepmt!),
				...sections,
				compteur_membre: n(p.nummembrepmt!),
				compteur_reference: n(p.numreferencepmt!)
			}
		]);
	} else {
		charger(S.parametre, [{ id: 1 }]);
	}

	// Référentiels -------------------------------------------------------------------------------
	charger(
		S.ville,
		T('ville').map((r) => ({ id: r.indexvil, nom: txt(r.nomvil!) }))
	);
	charger(
		S.quartier,
		T('quartier')
			.filter((r) => identifiantsCharges.get('ville')?.has(Number(r.indexvil)))
			.map((r) => ({ id: r.indexqtr, ville_id: r.indexvil, nom: txt(r.nomqtr!) }))
	);
	charger(
		S.secteurActivite,
		T('secteuractivite').map((r) => ({
			id: r.indexsat,
			libelle: txt(r.libelesat!),
			etat: n(r.etatsat!) || Etat.AUTORISE
		}))
	);
	charger(
		S.domaineActivite,
		T('domaineactivite').map((r) => ({
			id: r.indexdat,
			libelle: txt(r.libeledat!),
			etat: n(r.etatdat!) || Etat.AUTORISE,
			secteur_id: fk('secteur_activite', r.indexsat!, `domaine#${r.indexdat}`)
		}))
	);
	charger(
		S.diplome,
		T('diplome').map((r) => ({
			id: r.indexdpm,
			code: txt(r.codedpm!),
			libelle: txt(r.libeledpm!)
		}))
	);
	charger(
		S.familleArticle,
		T('familart').map((r) => ({ id: r.indexfam, libelle: txt(r.libelefam!) }))
	);

	// Membres ------------------------------------------------------------------------------------
	const premieresVisites = new Map<number, Date>();
	for (const r of T('visitembr')) {
		const v = dt(r.datevst!) ?? dt(r.datenumvst!);
		const id = Number(r.indexmbr);
		if (!v) continue;
		const connue = premieresVisites.get(id);
		if (!connue || v < connue) premieresVisites.set(id, v);
	}

	const membres: Record<string, unknown>[] = [];
	const identifiants = new Set<string>();
	for (const r of T('membre')) {
		let ident = txt(r.identifmbr!) || `membre${r.indexmbr}`;
		if (identifiants.has(ident.toLowerCase())) {
			noter(
				'identifiants dupliqués renommés',
				`membre#${r.indexmbr} ${ident} → ${ident}${r.indexmbr}`
			);
			ident = `${ident}${r.indexmbr}`;
		}
		identifiants.add(ident.toLowerCase());
		const droits = `${txt(r.droitmbr!)}0000`.slice(0, 4);
		const mdp = txt(r.motpasmbr!);
		const codePin = n(r.codepointagembr!);
		const categorie = n(r.categoriembr!);
		membres.push({
			id: r.indexmbr,
			type_compte: n(r.typembr!) || TypeMembre.MEMBRE,
			categorie: categorie || 1,
			code_membre: txt(r.codembr!),
			nom: txt(r.nomprenmbr!) || ident,
			pseudonyme: txt(r.pseudombr!) || ident,
			sexe: n(r.sexembr!) || 3,
			telephone: normaliserTelephone(txt(r.phonembr!)),
			email: txt(r.mailmbr!) || null,
			ville_id: fk('ville', r.indexvil!),
			adresse: txt(r.adressembr!),
			identifiant: ident,
			// Mot de passe legacy en clair → haché ; le membre garde le même mot de passe.
			mot_de_passe_hash: mdp ? await hacherMotDePasse(mdp) : '!',
			observation: txt(r.observmbr!),
			etat: n(r.etatmbr!) || Etat.NON_TRAITE,
			droit_attribution: droits[0] === '1',
			droit_caisse: droits[1] === '1',
			droit_activation: droits[2] === '1',
			numero_piece_identite: txt(r.cnimbr!),
			employeur: txt(r.employeurmbr!),
			// Personne morale : le legacy rangeait la forme juridique dans `situatmatrimmbr`.
			situation_matrimoniale: categorie !== 2 ? opt(r.situatmatrimmbr!) : null,
			forme_juridique: categorie === 2 ? opt(r.situatmatrimmbr!) : null,
			nombre_enfants: n(r.nbenfantmbr!),
			type_partenaire: opt(r.banqboutqmbr!),
			domaine_activite_id: fk('domaine_activite', r.indexdat!),
			date_limite_master: d(r.datemastermbr!),
			point_caisse_actif: n(r.pointcaissembr!) === 1,
			solde_point_caisse: n(r.soldepointcaissembr!),
			date_dernier_pointage: dt(r.datepointcaissembr!),
			code_pointage_hash: codePin ? await hacherMotDePasse(String(codePin).padStart(4, '0')) : null,
			photo: copierMedia(images, `mbr${r.indexmbr}.jpg`, 'membres'),
			date_creation: premieresVisites.get(Number(r.indexmbr)) ?? DATE_INCONNUE
		});
		if (!mdp) {
			noter(
				'membres sans mot de passe (connexion impossible, réinitialisation requise)',
				`membre#${r.indexmbr}`
			);
		}
	}
	charger(S.membre, membres);
	const M = (v: ValeurDump, ctx = ''): number | null => fk('membre', v, ctx);

	charger(
		S.banque,
		T('banque').map((r) => ({
			id: r.indexbqe,
			membre_id: M(r.indexmbr!),
			sigle: txt(r.siglebqe!),
			nom: txt(r.nombqe!),
			telephones: txt(r.phonebqe!),
			adresse: txt(r.adressebqe!),
			email: txt(r.mailbqe!),
			site_web: txt(r.sitebqe!),
			nom_contact: txt(r.nomcontactbqe!),
			telephone_contact: txt(r.phonecontactbqe!),
			observation: txt(r.observatbqe!),
			etat: n(r.etatbqe!) || Etat.AUTORISE
		}))
	);

	charger(
		S.visite,
		T('visite').map((r) => ({
			id: r.indexvst,
			membre_id: M(r.indexmbr!),
			adresse_ip: txt(r.adresipvst!),
			date_heure: dt(r.datevst!) ?? dt(r.datenumvst!) ?? DATE_INCONNUE
		}))
	);
	charger(
		S.visiteMembre,
		T('visitembr')
			.filter((r) => M(r.indexmbr!, `visitembr#${r.indexvst}`))
			.map((r) => ({
				id: r.indexvst,
				membre_id: r.indexmbr,
				adresse_ip: txt(r.adresipvst!),
				date_connexion: dt(r.datevst!) ?? dt(r.datenumvst!) ?? DATE_INCONNUE
			}))
	);

	// Catalogue produits et santé ----------------------------------------------------------------
	/**
	 * Le legacy rangeait les compléments alimentaires sous les codes 100 et 0, hors des 20
	 * catégories FLP (la catégorie 2 « Compléments alimentaires » était vide) : on les reclasse.
	 */
	function groupeProduit(r: LigneDump): number {
		const g = n(r.groupepdt!);
		if (g >= 1 && g <= 20) return g;
		const nom = txt(r.nompdt!).toLowerCase();
		let nouveau: number;
		if (['bee', 'royal jelly', 'propolis', 'miel', 'honey'].some((mot) => nom.includes(mot))) {
			nouveau = 3; // Produits de la ruche
		} else if (['tea', 'tisane', 'drink', 'gel'].some((mot) => nom.includes(mot))) {
			nouveau = 1; // Buvables
		} else {
			nouveau = 2; // Compléments alimentaires
		}
		noter(
			'produits reclassés (catégorie legacy hors liste)',
			`produit#${r.indexpdt} ${g} → ${nouveau}`
		);
		return nouveau;
	}

	charger(
		S.produit,
		T('produit').map((r) => ({
			id: r.indexpdt,
			reference: txt(r.referencepdt!),
			nom: txt(r.nompdt!),
			description: txt(r.descriptionpdt!),
			groupe: groupeProduit(r),
			prix_distributeur: n(r.prixdistpdt!),
			prix_non_distributeur: n(r.prixcompdt!),
			prix_public: n(r.prixpubpdt!),
			quantite_stock: n(r.quantitepdt!),
			photo: copierMedia(images, `pdt${r.indexpdt}.jpg`, 'produits'),
			etat: n(r.etatpdt!) || Etat.AUTORISE,
			nombre_visites: n(r.nbvisitepdt!),
			date_derniere_visite: dt(r.datevisitpdt!)
		}))
	);
	charger(
		S.maladie,
		T('maladie').map((r) => ({
			id: r.indexmld,
			libelle: txt(r.libelemld!),
			description: txt(r.descriptionmld!),
			etat: n(r.etatmld!) || Etat.AUTORISE
		}))
	);

	const liens: Record<string, unknown>[] = [];
	for (const r of T('maladie')) {
		for (let i = 1; i <= 5; i += 1) {
			const pid = fk('produit', r[`index${i}pdt`]!, `maladie#${r.indexmld}`);
			if (pid) {
				liens.push({
					maladie_id: r.indexmld,
					produit_id: pid,
					ordre: i,
					posologie: txt(r[`posologie${i}pdtmld`]!)
				});
			}
		}
	}
	// Le legacy écrit `maladie.index*pdt` (administration) mais la page publique lit
	// `produit.index*mld` + `produit.posologie*` : on fusionne les deux sources (inventaire 01 §5.3).
	const deja = new Set(liens.map((li) => `${li.maladie_id}/${li.produit_id}`));
	const ordre = new Map<number, number>();
	for (const li of liens) {
		ordre.set(Number(li.maladie_id), (ordre.get(Number(li.maladie_id)) ?? 0) + 1);
	}
	for (const r of T('produit')) {
		for (let i = 1; i <= 5; i += 1) {
			const mid = fk('maladie', r[`index${i}mld`]!);
			if (!mid || deja.has(`${mid}/${r.indexpdt}`)) continue;
			deja.add(`${mid}/${r.indexpdt}`);
			ordre.set(mid, (ordre.get(mid) ?? 0) + 1);
			liens.push({
				maladie_id: mid,
				produit_id: r.indexpdt,
				ordre: ordre.get(mid),
				posologie: txt(r[`posologie${i}pdt`]!)
			});
			noter(
				'liens maladie→produit repris depuis la fiche produit',
				`maladie#${mid} ← produit#${r.indexpdt}`
			);
		}
	}
	charger(S.maladieProduit, liens);

	// Contenus -----------------------------------------------------------------------------------
	const sujetParRef = new Map<string, number>();
	for (const r of T('conseil')) {
		if (n(r.sujetreponsecsl!) === 1) sujetParRef.set(txt(r.referencecsl!), Number(r.indexcsl));
	}
	const conseilsSujets: Record<string, unknown>[] = [];
	const conseilsReponses: Record<string, unknown>[] = [];
	for (const r of T('conseil')) {
		const reference = txt(r.referencecsl!);
		const ligne = {
			id: r.indexcsl,
			reference,
			objet: txt(r.objetcsl!),
			texte: txt(r.textecsl!),
			auteur_id: M(r.indexmbr!, `conseil#${r.indexcsl}`),
			confidentialite: n(r.confidencecsl!) || 2,
			nombre_reponses: n(r.nbreponsecsl!),
			etat: n(r.etatcsl!) || 1,
			date_creation: dt(r.datecsl!) ?? DATE_INCONNUE
		};
		if (n(r.sujetreponsecsl!) === 1) conseilsSujets.push({ ...ligne, sujet_id: null });
		else if (sujetParRef.has(reference)) {
			conseilsReponses.push({ ...ligne, sujet_id: sujetParRef.get(reference) });
		} else noter('réponses de forum sans sujet écartées', `conseil#${r.indexcsl}`);
	}
	charger(S.conseil, [...conseilsSujets, ...conseilsReponses]);

	// Découverte de soi : les 30 zones legacy, dans l'ordre des colonnes du modèle.
	const zonesSga = [
		'activite_actuelle',
		'savoir_faire',
		'activite_quotidienne',
		'secret_a_partager',
		'origine_idee',
		'idee_vue_chez_autrui',
		'participation_idee_tierce',
		'est_sociable',
		'interet_pour_autrui',
		'a_deja_fait_commerce',
		'se_fait_des_amis',
		'garde_ses_relations',
		'percu_comme_ouvert',
		'perception_par_autrui',
		'est_meneur',
		'prefere_entourage',
		'a_des_amis_proches',
		'entourage_valorise_activite',
		'entourage_proche',
		'personnes_consideration',
		'motivation',
		'pourcentage_implication',
		'moyens_disponibles',
		'soutien_conjoint',
		'origine_soutien',
		'confronte_aux_faits',
		'notes_membre',
		'notes_conseillere',
		'etat_fiche',
		'cloturee'
	];
	const colonnesSga = getTableColumns(S.soungangai) as Record<string, { dataType: string }>;
	const vusSga = new Set<number>();
	const lignesSga: Record<string, unknown>[] = [];
	for (const r of T('soungangai')) {
		const membreId = Number(r.indexmbr);
		if (!M(r.indexmbr!, `soungangai#${r.indexsga}`) || vusSga.has(membreId)) {
			noter('découverte de soi écartée (membre absent ou doublon)', `soungangai#${r.indexsga}`);
			continue;
		}
		vusSga.add(membreId);
		const ligne: Record<string, unknown> = {
			id: r.indexsga,
			membre_id: membreId,
			reference: txt(r.referencesga!),
			date_creation: dt(r.datesga!) ?? DATE_INCONNUE,
			etat: n(r.etatsga!) || 1
		};
		zonesSga.forEach((champ, i) => {
			const v = r[`zone${String(i + 1).padStart(2, '0')}sga`]!;
			// Le type déclaré de la colonne décide de la conversion, comme dans l'original.
			ligne[champ] = colonnesSga[champ]?.dataType === 'number' ? n(v) : txt(v);
		});
		lignesSga.push(ligne);
	}
	charger(S.soungangai, lignesSga);

	// Bug legacy (inventaire 01 §5.35) : une réponse de gestionnaire partait toujours au membre n° 1.
	// On la rattache au dernier membre (non gestionnaire) ayant écrit dans la même rubrique avant elle.
	const gestionnaires = new Set(
		T('membre')
			.filter((r) => n(r.typembr!) === TypeMembre.GESTIONNAIRE)
			.map((r) => Number(r.indexmbr))
	);
	const dialogues: Record<string, unknown>[] = [];
	const dernierMembre = new Map<number, number>();
	const parDate = [...T('dialogue')].sort((a, b) => {
		const da = (dt(a.datedlg!) ?? DATE_INCONNUE).getTime();
		const db_ = (dt(b.datedlg!) ?? DATE_INCONNUE).getTime();
		return da !== db_ ? da - db_ : Number(a.indexdlg) - Number(b.indexdlg);
	});
	for (const r of parDate) {
		if (!M(r.indexmbr!, `dialogue#${r.indexdlg}`)) continue;
		const rubrique = n(r.typedlg!);
		const auteur = Number(r.indexmbr);
		const cible = n(r.indexmbrdlg!);
		let destinataire: number | null;
		if (gestionnaires.has(auteur)) {
			if (gestionnaires.has(cible) || cible === 0) {
				destinataire = dernierMembre.get(rubrique) ?? null;
				if (destinataire) {
					noter(
						'réponses de dialogue réattribuées (bug du destinataire n° 1)',
						`dialogue#${r.indexdlg} → membre#${destinataire}`
					);
				}
			} else destinataire = M(cible);
		} else {
			dernierMembre.set(rubrique, auteur);
			destinataire = null; // adressé à la frangine
		}
		dialogues.push({
			id: r.indexdlg,
			auteur_id: auteur,
			destinataire_id: destinataire,
			type_dialogue: rubrique,
			texte: txt(r.textedlg!),
			etat: n(r.etatdlg!) || 2,
			date_message: dt(r.datedlg!) ?? DATE_INCONNUE
		});
	}
	charger(S.dialogue, dialogues);

	// Message : `index1mbr` = auteur réel, `indexmbr` = destinataire (0 = la frangine).
	const messages: Record<string, unknown>[] = [];
	for (const r of T('message')) {
		const auteur = n(r.index1mbr!);
		const cible = n(r.indexmbr!);
		let base: Record<string, unknown>;
		if (cible === 0 && M(auteur)) {
			base = { membre_id: auteur, auteur_id: auteur, de_la_frangine: false };
		} else if (cible && gestionnaires.has(auteur) && M(cible) && !gestionnaires.has(cible)) {
			base = { membre_id: cible, auteur_id: M(auteur), de_la_frangine: true };
		} else {
			noter(
				'messages non représentables écartés (échange gestionnaire↔gestionnaire ou membre absent)',
				`message#${r.indexmsg}`
			);
			continue;
		}
		messages.push({
			...base,
			id: r.indexmsg,
			texte: txt(r.textemsg!),
			lu: n(r.etatmsg!) === 2,
			date_message: dt(r.datemsg!) ?? DATE_INCONNUE
		});
	}
	charger(S.message, messages);

	charger(
		S.contact,
		T('contact').map((r) => ({
			id: r.indexctt,
			membre_id: M(r.indexmbr!),
			nom: txt(r.nomctt!),
			email: txt(r.mailctt!),
			objet: txt(r.objetctt!),
			texte: txt(r.textectt!),
			etat: n(r.etatctt!) || 2,
			date_envoi: dt(r.datectt!) ?? DATE_INCONNUE,
			reponse: txt(r.reponsectt ?? null)
		}))
	);
	charger(
		S.suggestion,
		T('suggestion').map((r) => ({
			id: r.indexsgt,
			date: dt(r.datesgt!) ?? DATE_INCONNUE,
			module: n(r.modulesgt!),
			texte: txt(r.textesgt!),
			etat: n(r.etatsgt!) || 2
		}))
	);

	// Entreprises --------------------------------------------------------------------------------
	// Le secteur n'était pas saisi dans l'interface legacy : on le déduit du domaine (ADR-0007).
	const secteurDuDomaine = new Map<number, ValeurDump>();
	for (const r of T('domaineactivite')) secteurDuDomaine.set(Number(r.indexdat), r.indexsat!);
	charger(
		S.entreprise,
		T('entreprise').map((r) => ({
			id: r.indexent,
			reference: txt(r.referenceent!),
			membre_id: M(r.indexmbr!),
			secteur_id: fk('secteur_activite', secteurDuDomaine.get(Number(r.indexdat)) || r.indexsat!),
			domaine_id: fk('domaine_activite', r.indexdat!),
			nom: txt(r.noment!),
			forme_juridique: n(r.formeent!),
			capital_social: n(r.capitalent!),
			description: txt(r.descriptent!),
			commentaire: txt(r.commentent!),
			gerant: txt(r.gerantent!),
			telephone: normaliserTelephone(txt(r.phoneent!)),
			email: txt(r.mailent!),
			site_web: txt(r.siteent!),
			adresse: txt(r.adresseent!),
			ville_id: fk('ville', r.indexvil!),
			logo: copierMedia(images, `ent${r.indexent}.jpg`, 'entreprises'),
			etat: n(r.etatent!) || Etat.NON_TRAITE,
			date_creation: dt(r.dateinscriptent!) ?? DATE_INCONNUE,
			nombre_visites: n(r.nbvisiteent!),
			date_derniere_visite: dt(r.datevisiteent!)
		}))
	);

	const extensionPub: Record<number, string> = { 1: 'jpg', 2: 'mp3', 3: 'mp4' };
	charger(
		S.publicite,
		T('publicite').map((r) => ({
			id: r.indexpub,
			reference: txt(r.referencepub!),
			demandeur_id: M(r.indexmbr!),
			entreprise_id: fk('entreprise', r.indexent!, `publicite#${r.indexpub}`),
			objet: txt(r.objetpub!),
			texte: txt(r.textepub!),
			date_debut: d(r.datedebpub!),
			date_fin: d(r.datefinpub!),
			type_fichier: n(r.typefichpub!),
			fichier: copierMedia(
				images,
				`pub${r.indexpub}.${extensionPub[n(r.typefichpub!)] ?? 'jpg'}`,
				'publicites'
			),
			nombre_vues: n(r.nbvuepub!),
			date_derniere_vue: dt(r.datevuepub!),
			etat: n(r.etatpub!) || 1,
			date_creation: dt(r.dateinscpub!) ?? DATE_INCONNUE
		}))
	);

	// Ressources humaines ------------------------------------------------------------------------
	charger(
		S.annonceEmploi,
		T('humaine').map((r) => ({
			id: r.indexhmn,
			type_annonce: n(r.typeinscripthmn!) || 1,
			// Bug legacy : `indexmbr` reçoit le type de fiche (1/2) au lieu du membre → auteur perdu.
			auteur_id: n(r.indexmbr!) === n(r.typeinscripthmn!) ? null : M(r.indexmbr!),
			reference: txt(r.referencehmn!),
			secteur_id: fk('secteur_activite', r.indexsat!),
			domaine_id: fk('domaine_activite', r.indexdat!),
			nom: txt(r.nomhmn!),
			prenom: txt(r.prenomhmn!),
			sexe: n(r.sexehmn!) || 3,
			date_naissance: d(r.datenaishmn!),
			adresse: txt(r.adressehmn!),
			telephone: normaliserTelephone(txt(r.phonehmn!)),
			email: txt(r.mailhmn!),
			diplomes: txt(r.diplomehmn!),
			savoir_faire: txt(r.savoirfairehmn!),
			experience: txt(r.experience1hmn!),
			experience_2: txt(r.experience2hmn!),
			competences: txt(r.competencehmn!),
			poste_a_pourvoir: txt(r.postepourvoirhmn!),
			autres_informations: txt(r.autreinfohmn!),
			photo: copierMedia(images, `hmn${r.indexhmn}.jpg`, 'emploi'),
			cv: copierMedia(images, `cv${r.indexhmn}.pdf`, 'emploi'),
			etat: n(r.etathmn!) || 2,
			date_creation: dt(r.dateinscripthmn!) ?? DATE_INCONNUE,
			nombre_visites: n(r.nbrvisitehmn!),
			date_derniere_visite: dt(r.datevisitehmn!)
		}))
	);
	for (const r of T('humaine')) {
		if (n(r.indexmbr!) === n(r.typeinscripthmn!)) {
			noter(
				'fiches RH sans auteur (bug legacy : indexmbr = type de fiche)',
				`humaine#${r.indexhmn}`
			);
		}
	}

	// E-commerce ---------------------------------------------------------------------------------
	charger(
		S.immobilier,
		T('immobilier').map((r) => ({
			id: r.indeximb,
			reference: txt(r.referenceimb!),
			auteur_id: M(r.indexmbr!),
			offre_ou_recherche: n(r.offredemandeimb!) || 1,
			type_transaction: n(r.transactionimb!),
			type_bien: n(r.typeimb!),
			quartier_id: fk('quartier', r.indexqtr!),
			localisation: txt(r.localisationimb!),
			surface_m2: n(r.surfaceimb!),
			nombre_pieces: n(r.nbpieceimb!),
			nombre_chambres: n(r.nbchambreimb!),
			situation: n(r.situationimb!) || 1,
			prix: n(r.priximb!),
			description: txt(r.descriptimb!),
			photo: copierMedia(images, `imb${r.indeximb}.jpg`, 'immobilier'),
			etat: n(r.etatimb!) || 1,
			date_creation: dt(r.dateinscriptimb!) ?? DATE_INCONNUE,
			nombre_visites: n(r.nbvisiteimb!),
			date_derniere_visite: dt(r.datevisiteimb!)
		}))
	);
	charger(
		S.article,
		T('article').map((r) => ({
			id: r.indexart,
			reference: txt(r.referenceart!),
			auteur_id: M(r.indexmbr!),
			famille_id: fk('famille_article', r.indexfam!),
			offre_ou_recherche: n(r.offredemandeart!) || 1,
			libelle: txt(r.libeleart!),
			prix: n(r.prixart!),
			quantite: n(r.quantiteart!),
			neuf_ou_occasion: n(r.neufocasart!),
			description: txt(r.descriptart!),
			photo: copierMedia(images, `art${r.indexart}.jpg`, 'articles'),
			etat: n(r.etatart!) || 1,
			date_creation: dt(r.dateinscriptart!) ?? DATE_INCONNUE,
			nombre_visites: n(r.nbvisiteart!),
			date_derniere_visite: dt(r.datevisiteart!)
		}))
	);
	charger(
		S.partenariat,
		T('partenariat').map((r) => {
			const jour = d(r.dateptn!);
			return {
				id: r.indexptn,
				reference: txt(r.referenceptn!),
				auteur_id: M(r.indexmbr!),
				actif: txt(r.actifptn!),
				description: txt(r.descriptptn!),
				recherche: txt(r.rechercheptn!),
				objectif: txt(r.objectifptn!),
				etat: n(r.etatptn!) || 2,
				// `datetime.combine(date, min.time())` : une date seule devient une date-heure.
				date_creation: jour ? new Date(jour.getTime()) : DATE_INCONNUE
			};
		})
	);

	charger(
		S.interet,
		T('besoin').map((r) => ({
			id: r.indexbsn,
			type_objet: n(r.typebsn!),
			sous_type: n(r.interesebsn!) || 2,
			membre_id: M(r.indexmbr!),
			annonce_emploi_id: fk('annonce_emploi', r.indexhmn!, `besoin#${r.indexbsn}`),
			immobilier_id: fk('immobilier', r.indeximb!, `besoin#${r.indexbsn}`),
			article_id: fk('article', r.indexart!, `besoin#${r.indexbsn}`),
			partenariat_id: fk('partenariat', r.indexptn!, `besoin#${r.indexbsn}`),
			message: txt(r.besoinbsn!),
			date_creation: dt(r.datebsn!) ?? DATE_INCONNUE,
			etat: n(r.etatbsn!) || 2
		}))
	);

	charger(
		S.paiement,
		T('payement').map((r) => ({
			id: r.indexpay,
			membre_id: M(r.indexmbr!),
			type_objet: n(r.typepnrpay!),
			date_paiement: dt(r.datepay!) ?? DATE_INCONNUE,
			mode: n(r.typepay!) || 1,
			montant: n(r.montantpay!),
			remarque: txt(r.remarquepay!),
			etat: n(r.etatpay!) || 2
		}))
	);
	charger(
		S.lignePanier,
		T('panier')
			.filter((r) => M(r.indexmbr!, `panier#${r.indexpnr}`))
			.map((r) => ({
				id: r.indexpnr,
				type_objet: n(r.typepnr!),
				membre_id: r.indexmbr,
				produit_id: fk('produit', r.indexpdt!),
				article_id: fk('article', r.indexart!),
				quantite: n(r.qtepnr!),
				prix_unitaire: n(r.prixpnr!),
				date_ajout: dt(r.datepnr!) ?? DATE_INCONNUE,
				paye: n(r.etatpayepnr!) === 1,
				date_paiement: d(r.datepayepnr!),
				paiement_id: fk('paiement', r.indexpay!),
				etat: n(r.etatpnr!) || 2
			}))
	);

	charger(
		S.articleCourse,
		T('articlecourse').map((r) => ({
			id: r.indexartcse,
			boutique_id: M(r.indexbtq!),
			code: txt(r.codeartcse!),
			nom: txt(r.nomartcse!),
			marque: txt(r.marqueartcse!),
			prix: n(r.prixartcse!),
			disponible: n(r.disponibleartcse!) || 1,
			description: txt(r.observationartcse!),
			etat: n(r.etatartcse!) || 2,
			photo: copierMedia(images, `artcse${r.indexartcse}.jpg`, 'courses')
		}))
	);
	charger(
		S.course,
		T('course1').map((r) => ({
			id: r.indexcrs1,
			reference: txt(r.referencecrs1!),
			client_id: M(r.indexmbr!),
			boutique_id: M(r.indexbtq!),
			lieu_achat: txt(r.magasincrs1!),
			date_achat: d(r.dateachatcrs1!),
			date_livraison: dt(r.datelivraisoncrs1!),
			lieu_livraison: txt(r.lieulivraisoncrs1!),
			montant_achats: n(r.montantcrs1!),
			frais_service: n(r.commissioncrs1!),
			mode_paiement: n(r.modepayecrs1!),
			paye: n(r.etatpayecrs1!) || 2,
			observation: txt(r.observationcrs1!),
			etat_course: n(r.etatcoursecrs1!) || 1,
			etat: n(r.etatcrs1!) || 2,
			date_creation: dt(r.datecrs1!) ?? DATE_INCONNUE
		}))
	);
	charger(
		S.ligneCourse,
		T('course2')
			.filter((r) => fk('course', r.indexcrs1!, `course2#${r.indexcrs2}`))
			.map((r) => ({
				id: r.indexcrs2,
				course_id: r.indexcrs1,
				article_catalogue_id: fk('article_course', r.indexartcse!),
				nom_article: txt(r.articlecrs2!),
				prix_plafond: n(r.prixcrs2!),
				quantite: n(r.quantitecrs2!),
				observation: txt(r.observationcrs2!),
				etat: n(r.etatcrs2!) || 2
			}))
	);

	// Appels de fonds ----------------------------------------------------------------------------
	const appels: Record<string, unknown>[] = [];
	for (const r of T('appelfond')) {
		if (!fk('entreprise', r.indexent!)) {
			noter(
				'appels de fonds conservés sans entreprise (entreprise inexistante à la source)',
				`appelfond#${r.indexadf} (indexent=${r.indexent})`
			);
		}
		let mail = txt(r.mailpromotadf!);
		let adresse = txt(r.adressepromotadf!);
		if (!mail.includes('@') && adresse.includes('@')) {
			// Bug legacy : colonnes inversées à la création.
			[mail, adresse] = [adresse, mail];
			noter(
				'appels de fonds : e-mail/adresse promoteur remis dans le bon ordre',
				`appelfond#${r.indexadf}`
			);
		}
		appels.push({
			id: r.indexadf,
			reference: txt(r.referenceadf!),
			auteur_id: M(r.indexmbr!),
			entreprise_id: fk('entreprise', r.indexent!),
			secteur_id: fk('secteur_activite', r.indexsat!),
			ville_id: fk('ville', r.indexvil!),
			nom_projet: txt(r.nomprojetadf!),
			objet_projet: txt(r.objetprojetadf!),
			description_activite: txt(r.descriptactiviteadf!),
			description_projet: txt(r.descriptprojetadf!),
			devis_projet: n(r.devisprojetadf!),
			apport_fond_propre: n(r.apportfondadf!),
			besoin_financement: n(r.besoinfondadf!),
			niveau_realisation: n(r.niveaurealisatadf!),
			nom_promoteur: txt(r.nompromotadf!),
			telephone_promoteur: normaliserTelephone(txt(r.phonepromotadf!)),
			email_promoteur: mail,
			adresse_promoteur: adresse,
			observation_gestionnaire: txt(r.observatadf!),
			appreciation: n(r.appreciatadf!),
			montant_promis: n(r.promisfondadf!),
			montant_collecte: n(r.colectefondadf!),
			etat: n(r.etatadf!) || 1,
			presentation_pdf: copierMedia(images, `adf${r.indexadf}.pdf`, 'financement'),
			date_creation: dt(r.dateinscriptadf!) ?? DATE_INCONNUE,
			nombre_visites: n(r.nbvisiteadf!),
			date_derniere_visite: dt(r.datevisiteadf!)
		});
	}
	charger(S.appelFond, appels);
	charger(
		S.collecteFond,
		T('collectefond')
			.filter((r) => fk('appel_fond', r.indexadf!, `collectefond#${r.indexcdf}`))
			.map((r) => ({
				id: r.indexcdf,
				reference: txt(r.referencecdf!),
				appel_fond_id: r.indexadf,
				membre_id: M(r.indexmbr!),
				date_engagement: d(r.dateaportcdf!),
				type_apport: n(r.typeaportcdf!) || 1,
				montant_promis: n(r.montantprevucdf!),
				echeance_mois: n(r.echeancecdf!),
				montant_verse: n(r.montantversecdf!),
				date_dernier_versement: d(r.dateversecdf!),
				remarque: txt(r.remarquecdf!),
				observation_mediateur: txt(r.observcdf!),
				etat: n(r.etatcdf!) || 1
			}))
	);
	charger(
		S.versementCollecte,
		T('mouvcollectefond')
			.filter((r) => fk('collecte_fond', r.indexcdf!, `mouvcollectefond#${r.indexmcf}`))
			.map((r) => ({
				id: r.indexmcf,
				collecte_id: r.indexcdf,
				date_versement: d(r.datemcf!) ?? new JourSeul(2016, 0, 1),
				montant: n(r.montantmcf!),
				etat: n(r.etatmcf!) || 2
			}))
	);

	// Likelemba ----------------------------------------------------------------------------------
	charger(
		S.groupeLikelemba,
		T('likelemba1').map((r) => ({
			id: r.indexlkb1,
			code: txt(r.codelkb1!),
			responsable_id: M(r.indexcheflkb1!),
			montant_cotisation: n(r.montantlkb1!),
			periodicite: n(r.periodelkb1!) || 1,
			date_debut: d(r.datedebutlkb1!),
			observation: txt(r.observatlkb1!),
			compteur_entrees: n(r.nbentrelkb1!),
			compteur_paiements: n(r.nbpayelkb1!),
			etat: n(r.etatlkb1!) || 2
		}))
	);
	charger(
		S.membreLikelemba,
		T('likelemba2')
			.filter((r) => fk('groupe_likelemba', r.indexlkb1!, `likelemba2#${r.indexlkb2}`))
			.map((r) => ({
				id: r.indexlkb2,
				groupe_id: r.indexlkb1,
				membre_id: M(r.indexmbr!),
				code: txt(r.codelkb2!),
				date_entree: d(r.dateentrelkb2!),
				observation: txt(r.observatlkb2!),
				etat: n(r.etatlkb2!) || 2,
				caution_nom: txt(r.personcautlkb2!),
				caution_est_membre: n(r.personcautmbrlkb2!) || 1,
				caution_piece_identite: txt(r.cnipersoncautlkb2!),
				caution_adresse: txt(r.adressepersoncautlkb2!),
				caution_activite: txt(r.activitepersoncautlkb2!),
				caution_telephone: txt(r.phonepersoncautlkb2!),
				temoins: [1, 2, 3].map((i) => ({
					nom: txt(r[`temoin${i}lkb2`]!),
					telephone: txt(r[`phonetemoin${i}lkb2`]!),
					emploi: txt(r[`emploitemoin${i}lkb2`]!),
					est_membre: n(r[`temoin${i}mbrlkb2`]!) || 1
				}))
			}))
	);
	charger(
		S.cotisationLikelemba,
		T('likelemba3')
			.filter((r) => fk('groupe_likelemba', r.indexlkb1!, `likelemba3#${r.indexlkb3}`))
			.map((r) => ({
				id: r.indexlkb3,
				groupe_id: r.indexlkb1,
				adhesion_id: fk('membre_likelemba', r.indexlkb2!),
				caissier_id: M(r.indcaisrlkb3!),
				numero_recu: txt(r.codelkb3!),
				date_paiement: d(r.datepayelkb3!),
				montant: n(r.montantlkb3!),
				mode_paiement: n(r.modepayelkb3!),
				code_transfert: txt(r.codechardenlkb3!),
				observation: txt(r.observatlkb3!),
				etat: n(r.etatlkb3!) || 2
			}))
	);

	// Épargne solidaire et carte de pointage -----------------------------------------------------
	charger(
		S.fondDeSoutien,
		T('fonddesoutien').map((r) => ({
			id: r.indexfds,
			reference: txt(r.referencefds!),
			membre_id: M(r.indexmbr!),
			date_souscription: d(r.datefds!),
			type_fond: n(r.typefds!) || 1,
			rapporteur_id: M(r.indrapporteurfds!),
			rapporteur_nom: txt(r.rapporteurfds!),
			souscripteur_id: M(r.indsouscripteurfds!),
			souscripteur_nom: txt(r.souscripteurfds!),
			motivation: txt(r.motivationfds!),
			montant: n(r.montantfds!),
			duree_mois: n(r.dureefds!),
			mode_paiement: n(r.modepayefds!),
			confirme: n(r.confirmefds!) || 2,
			etat: n(r.etatfds!) || 2
		}))
	);
	charger(
		S.pointCaisse,
		T('pointcaisse')
			.filter((r) => M(r.indexmbr!, `pointcaisse#${r.indexpcs}`))
			.map((r) => ({
				id: r.indexpcs,
				reference: txt(r.codepcs!),
				date_heure: dt(r.dateheurepcs!) ?? DATE_INCONNUE,
				operateur_id: M(r.indexcaissepcs!),
				membre_id: r.indexmbr,
				type_operation: n(r.operationpcs!),
				montant: n(r.montantpcs!),
				motif: txt(r.motifpcs!),
				solde_apres: n(r.soldepcs!),
				type_caisse: n(r.typecaissepcs!) || 1
			}))
	);

	// Opportunité d'affaire ----------------------------------------------------------------------
	const souscriptions: Record<string, unknown>[] = [];
	for (const r of T('souscriptoportuniteaffaire')) {
		if (!M(r.indexmbr!, `souscription#${r.indexsoa}`)) continue;
		souscriptions.push({
			id: r.indexsoa,
			reference: txt(r.referencesoa!),
			membre_id: r.indexmbr,
			date_creation: dt(r.datesoa!) ?? DATE_INCONNUE,
			objectifs: txt(r.zone02soa!),
			mon_histoire: txt(r.zone03soa!),
			disponibilite_hebdo: n(r.zone04soa!),
			formations: [1, 2, 3, 4].map((i) => ({
				prestation: i,
				date: texteDate(d(r[`zone09${i}soa`]!)),
				lieu: txt(r[`zone10${i}soa`]!),
				heure: txt(r[`zone11${i}soa`]!)
			})),
			nombre_rdv: n(r.zone12soa!),
			filleuls: [1, 2, 3].map((i) => ({
				nom: txt(r[`zone13${i}soa`]!),
				email: txt(r[`zone14${i}soa`]!),
				adresse: txt(r[`zone15${i}soa`]!),
				montant: n(r[`zone16${i}soa`]!),
				date_presentation: texteDate(d(r[`zone17${i}soa`]!))
			})),
			mode_souscription: n(r.zone21soa!),
			montant: n(r.zone22soa!),
			date_limite_complement: d(r.zone23soa!),
			etat: n(r.etatsoa!) || 1
		});
	}
	charger(S.souscription, souscriptions);
	charger(
		S.prospectSouscription,
		T('membreoportuniteaffaire')
			.filter((r) => fk('souscription', r.indexsoa!, `moa#${r.indexmoa}`))
			.map((r) => ({
				id: r.indexmoa,
				souscription_id: r.indexsoa,
				membre_id: M(r.indexmbr!),
				nom_prenom: txt(r.nomprenmoa!),
				telephone: txt(r.phonemoa!),
				email: txt(r.mailmoa!),
				commentaire: txt(r.commentairemoa!),
				etat: n(r.etatmoa!) || 2
			}))
	);
	charger(
		S.produitSouscription,
		T('produitoportuniteaffaire')
			.filter(
				(r) => fk('souscription', r.indexsoa!, `poa#${r.indexpoa}`) && fk('produit', r.indexpdt!)
			)
			.map((r) => ({
				id: r.indexpoa,
				souscription_id: r.indexsoa,
				produit_id: r.indexpdt,
				prix_unitaire: n(r.prixpoa!),
				quantite: n(r.quantitepoa!)
			}))
	);

	// Business plan ------------------------------------------------------------------------------
	const champsBp = [
		'type_activite',
		'description_projet',
		'moyens_actuels',
		'ressources_disponibles',
		'possessions',
		'organisation_actuelle',
		'organisation_souhaitee',
		'detail_besoin',
		'apport_actuel',
		'ambition',
		'strategie_resultats',
		'valeur_ajoutee',
		'prevision_ca_benefice',
		'processus_activite',
		'estimation_charges',
		'composantes_ca',
		'repartition_ca',
		'elements_environnementaux',
		'strategie_attaque',
		'devis_chiffre_besoin',
		'apport_prevu',
		'niveau_realisation',
		'difficultes_realisation',
		'planning_execution',
		'difficultes_futures'
	];
	const bps: Record<string, unknown>[] = [];
	const vusBp = new Set<number>();
	for (const r of T('businessplan')) {
		const membreId = Number(r.indexmbr);
		if (!M(r.indexmbr!, `businessplan#${r.indexbsp}`) || vusBp.has(membreId)) continue;
		vusBp.add(membreId);
		const ligne: Record<string, unknown> = {
			id: r.indexbsp,
			membre_id: membreId,
			reference: txt(r.zone27bsp!),
			date_creation: dt(r.zone28bsp!) ?? DATE_INCONNUE,
			etat: n(r.zone29bsp!) || 2
		};
		champsBp.forEach((champ, i) => {
			const v = r[`zone${String(i + 2).padStart(2, '0')}bsp`]!;
			ligne[champ] = champ === 'niveau_realisation' ? n(v) : txt(v);
		});
		bps.push(ligne);
	}
	charger(S.businessPlan, bps);

	// Comparateur de prix, marchés, projets, réussites --------------------------------------------
	charger(
		S.produitProspective,
		T('produitprospective').map((r) => ({
			id: r.indexptpv,
			nom: txt(r.nomproduitptpv!),
			etat: n(r.etatptpv!) || 2
		}))
	);
	// Bug legacy : `prospective1.indexent` reçoit l'id du membre, pas celui de l'entreprise.
	const entrepriseDuMembre = new Map<number, ValeurDump>();
	for (const e of T('entreprise')) {
		if (e.indexmbr) entrepriseDuMembre.set(Number(e.indexmbr), e.indexent!);
	}
	const fiches: Record<string, unknown>[] = [];
	const entreprisesVues = new Set<number>();
	for (const r of T('prospective1')) {
		const ent =
			entrepriseDuMembre.get(Number(r.indexent)) ?? entrepriseDuMembre.get(Number(r.indexmbr));
		if (!ent || entreprisesVues.has(Number(ent))) {
			noter(
				'fiches comparateur écartées (entreprise introuvable ou doublon)',
				`prospective1#${r.indexppv1} (indexent=${r.indexent})`
			);
			continue;
		}
		entreprisesVues.add(Number(ent));
		fiches.push({
			id: r.indexppv1,
			membre_id: M(r.indexmbr!),
			entreprise_id: ent,
			etat: n(r.etatppv1!) || 2
		});
	}
	charger(S.ficheProspective, fiches);
	charger(
		S.ligneProspective,
		T('prospective2')
			.filter(
				(r) =>
					fk('fiche_prospective', r.indexppv1!, `prospective2#${r.indexppv2}`) &&
					fk('produit_prospective', r.indexptpv!, `prospective2#${r.indexppv2}`)
			)
			.map((r) => ({
				id: r.indexppv2,
				fiche_id: r.indexppv1,
				offre_ou_demande: n(r.offredemandeppv2!) || 1,
				produit_id: r.indexptpv,
				unite_vente: txt(r.unitemesureppv2!),
				prix: n(r.prixppv2!),
				fournisseur_ou_client: txt(r.fournisseurclientppv2!),
				quantite_mensuelle: n(r.volumeppv2!),
				etat: n(r.etatppv2!) || 2
			}))
	);
	charger(
		S.marche,
		T('marche').map((r) => ({
			id: r.indexmch,
			reference: txt(r.referencemch!),
			auteur_id: M(r.indexmbr!),
			numero_appel_offre: txt(r.numerooffremch!),
			type_marche: n(r.typemch!) || 2,
			libelle: txt(r.libellemch!),
			description: txt(r.descriptionmch!),
			montant: n(r.montantmch!),
			date_limite: d(r.delaimch!),
			dossier_a_fournir: txt(r.dossiermch!),
			lieu_depot: txt(r.lieudepotmch!),
			email: txt(r.adressemailmch!),
			maitre_ouvrage: txt(r.maitreouvragemch!),
			publie_par: txt(r.publierparmch!),
			beneficiaire: txt(r.beneficiairemch!),
			etat: n(r.etatmch!) || 2,
			date_creation: DATE_INCONNUE // la table legacy n'a pas de date de création
		}))
	);
	charger(
		S.projet,
		T('projet').map((r) => ({
			id: r.indexpjt,
			reference: txt(r.referencepjt!),
			auteur_id: M(r.indexmbr!),
			responsable: txt(r.responsablepjt!),
			promoteur: txt(r.promoteurpjt!),
			objet: txt(r.objetpjt!),
			libelle: txt(r.libellepjt!),
			objectif: txt(r.objectifpjt!),
			description: txt(r.descriptionpjt!),
			adresse: txt(r.adressepjt!),
			duree_mois: n(r.dureepjt!),
			date_lancement: d(r.datelancementpjt!),
			conditions: txt(r.conditionpjt!),
			etat: n(r.etatpjt!) || 2,
			date_creation: DATE_INCONNUE // la table legacy n'a pas de date de création
		}))
	);
	charger(
		S.reussite,
		T('reussite')
			.filter((r) => M(r.indexmbr!, `reussite#${r.indexrst}`))
			.map((r) => ({
				id: r.indexrst,
				reference: txt(r.zone02rst!),
				membre_id: r.indexmbr,
				situation_avant: txt(r.zone03rst!),
				vision: txt(r.zone04rst!),
				projet: txt(r.zone05rst!),
				fond_demarrage: n(r.zone06rst!),
				besoin_reel_demarrage: n(r.zone07rst!),
				strategie: txt(r.zone08rst!),
				difficultes: txt(r.zone09rst!),
				deploiement_efforts: txt(r.zone10rst!),
				succes: txt(r.zone11rst!),
				conseil: txt(r.zone12rst!),
				etat: n(r.zone13rst!) || 1,
				date_creation: dt(r.zone14rst!) ?? DATE_INCONNUE,
				secteur_id: fk('secteur_activite', r.zone15rst!)
			}))
	);

	// Offres financières -------------------------------------------------------------------------
	const sujetsFinance = new Map<string, number>();
	for (const r of T('conseilfinance')) {
		if (n(r.sujetreponsecsf!) === 1) sujetsFinance.set(txt(r.referencecsf!), Number(r.indexcsf));
	}
	const cfSujets: Record<string, unknown>[] = [];
	const cfReponses: Record<string, unknown>[] = [];
	for (const r of T('conseilfinance')) {
		const reference = txt(r.referencecsf!);
		const ligne = {
			id: r.indexcsf,
			rubrique: n(r.typecsf!) || 1,
			reference,
			objet: txt(r.objetcsf!),
			texte: txt(r.textecsf!),
			auteur_id: M(r.indexmbr!),
			auteur_sujet_id: M(r.auteursujetcsf!),
			confidentialite: n(r.confidencecsf!) || 2,
			nombre_reponses: n(r.nbreponsecsf!),
			etat: n(r.etatcsf!) || 1,
			date_creation: dt(r.datecsf!) ?? DATE_INCONNUE
		};
		if (n(r.sujetreponsecsf!) === 1) cfSujets.push({ ...ligne, sujet_id: null });
		else if (sujetsFinance.has(reference)) {
			cfReponses.push({ ...ligne, sujet_id: sujetsFinance.get(reference) });
		} else noter('réponses de forum sans sujet écartées', `conseilfinance#${r.indexcsf}`);
	}
	charger(S.conseilFinance, [...cfSujets, ...cfReponses]);

	charger(
		S.placement,
		T('placement').map((r) => ({
			id: r.indexpcm,
			reference: txt(r.referencepcm!),
			membre_id: M(r.indexmbr!),
			type_placement: n(r.typepcm!) || 1,
			date_placement: dt(r.datepcm!) ?? DATE_INCONNUE,
			montant: n(r.montantpcm!),
			duree_mois: n(r.durepcm!),
			taux: f(r.tauxpcm!),
			banque: txt(r.banquepcm!),
			secteur_activite: txt(r.sectactivpcm!),
			observation: txt(r.observpcm!),
			etat: n(r.etatpcm!) || 2
		}))
	);
	charger(
		S.operationBanque,
		T('operatbanq').map((r) => ({
			id: r.indexopb,
			reference: txt(r.referenceopb!),
			membre_id: M(r.indexmbr!),
			date_saisie: dt(r.date1opb!) ?? DATE_INCONNUE,
			date_operation: d(r.date2opb!),
			montant: n(r.montantopb!),
			devise: n(r.deviseopb!) || 1,
			type_operation: n(r.typeopb!),
			banque_emettrice_id: fk('banque', r.indexbqe!),
			banque_emettrice_nom: txt(r.nombanqueemettriceopb!),
			banque_emettrice_email: txt(r.mailbanqueemettriceopb!),
			beneficiaire: txt(r.beneficiaireopb!),
			banque_beneficiaire_id: fk('banque', r.indexbanquebeneficiaireopb!),
			banque_beneficiaire_nom: txt(r.nombanquebeneficiaireopb!),
			banque_beneficiaire_adresse: txt(r.adressebanquebeneficiaireopb!),
			etat: n(r.etatopb!) || 2
		}))
	);
	charger(
		S.demandeCredit,
		T('demandecredit').map((r) => ({
			id: r.indexdct,
			reference: txt(r.referencedct!),
			membre_id: M(r.indexmbr!),
			date_demande: d(r.datedct!) ?? new JourSeul(2016, 0, 1),
			montant: n(r.montantdct!),
			objet: txt(r.objetdct!),
			duree_mois: n(r.duredct!),
			niveau_realisation: f(r.niveaurealisatdct!),
			garantie: txt(r.garantidct!),
			delai_reponse_jours: n(r.delaireponsedct!),
			observation: txt(r.observdct!),
			devis_global: txt(r.devisglobaldct!),
			apport_propre: txt(r.apportpropredct!),
			etat: n(r.etatdct!) || 2
		}))
	);

	const zonesContentieux: [string, string][] = [
		['dette_compromise', '04'],
		['revenus_journaliers', '05'],
		['revenus_hebdomadaires', '06'],
		['revenus_mensuels', '07'],
		['charges_fixes', '08'],
		['charges_variables', '09'],
		['entrees_activite_en_cours', '11'],
		['entrees_previsionnelles', '13'],
		['entrees_totales', '14'],
		['echeance_supportable', '16']
	];
	charger(
		S.contentieuxCredit,
		T('contentcredit').map((r) => {
			const montants: Record<string, unknown> = {};
			for (const [champ, z] of zonesContentieux) {
				montants[champ] = n(r[`zone${z}ctc`]!);
				montants[`${champ}_detail`] = txt(r[`zone${z}Actc`]!);
			}
			return {
				id: r.indexctc,
				reference: txt(r.referencectc!),
				membre_id: M(r.indexmbr!),
				date_dossier: dt(r.datectc!) ?? DATE_INCONNUE,
				...montants,
				activites_en_cours: txt(r.zone10ctc!),
				activite_previsionnelle: txt(r.zone12ctc!),
				echeance_actuelle: txt(r.zone15ctc!),
				elements_favorables: txt(r.zone17ctc!),
				etat: n(r.etatctc!) || 2
			};
		})
	);

	// Dossiers d'accompagnement --------------------------------------------------------------------
	const dossiers: Record<string, unknown>[] = [];
	const sourcesDossier: [string, string, number][] = [
		['acompbusinesplan', 'abp', 58],
		['acompprojetagricol', 'apa', 80],
		['acomprestructcredit', 'arc', 47],
		['acompcreditimmobil', 'aci', 38]
	];
	sourcesDossier.forEach(([table, suffixe, nb], index) => {
		for (const r of T(table)) {
			const reponses: Record<string, string> = {};
			for (let z = 4; z <= nb; z += 1) {
				reponses[String(z)] = txt(r[`zone${String(z).padStart(2, '0')}${suffixe}`]!);
			}
			dossiers.push({
				type_dossier: index + 1,
				reference: txt(r[`zone01${suffixe}`]!),
				membre_id: M(r.indexmbr!),
				date_creation: dt(r[`zone02${suffixe}`]!) ?? DATE_INCONNUE,
				objet: txt(r[`zone03${suffixe}`]!),
				reponses,
				etat: n(r[`etat${suffixe}`]!) || 2
			});
		}
	});
	charger(S.dossierAccompagnement, dossiers);

	// Tarifs bancaires -----------------------------------------------------------------------------
	charger(
		S.benchType,
		T('benchmarking1').map((r) => ({
			id: r.indexbm1,
			libelle: txt(r.libelebm1!),
			etat: n(r.etatbm1!) || 2
		}))
	);
	charger(
		S.benchOperation,
		T('benchmarking2')
			.filter((r) => fk('bench_type', r.indexbm1!, `benchmarking2#${r.indexbm2}`))
			.map((r) => ({
				id: r.indexbm2,
				type_id: r.indexbm1,
				libelle: txt(r.libelebm2!),
				etat: n(r.etatbm2!) || 2
			}))
	);
	charger(
		S.benchTarif,
		T('benchmarking3')
			.filter(
				(r) =>
					fk('bench_operation', r.indexbm2!, `benchmarking3#${r.indexbm3}`) &&
					fk('banque', r.indexbqe!)
			)
			.map((r) => ({
				id: r.indexbm3,
				operation_id: r.indexbm2,
				banque_id: r.indexbqe,
				tarif: txt(r.tarifbm3!),
				etat: n(r.etatbm3!) || 2
			}))
	);
}

/** Date en texte ISO (`2026-09-28`), chaîne vide quand la date est absente. */
function texteDate(jour: JourSeul | null): string {
	if (!jour) return '';
	const deux = (x: number): string => String(x).padStart(2, '0');
	return `${jour.getFullYear()}-${deux(jour.getMonth() + 1)}-${deux(jour.getDate())}`;
}

// --- Rapport -------------------------------------------------------------------------------------

function ecrireRapport(chemin: string): void {
	const deux = (x: number): string => String(x).padStart(2, '0');
	const m = new Date();
	const horodatage = `${deux(m.getDate())}/${deux(m.getMonth() + 1)}/${m.getFullYear()} ${deux(m.getHours())}:${deux(m.getMinutes())}`;
	const lignes = [
		'# Rapport de reprise des données legacy',
		'',
		`Généré le ${horodatage}.`,
		'',
		'## Lignes chargées',
		'',
		'| Table | Lignes |',
		'|---|---|'
	];
	for (const [table, c] of [...compte].sort(([a], [b]) => (a < b ? -1 : 1))) {
		lignes.push(`| ${table} | ${c} |`);
	}
	lignes.push('', '## Corrections et écarts', '');
	if (rapport.size === 0) lignes.push('Aucun.');
	for (const [titre, items] of rapport) {
		lignes.push(
			`### ${titre} (${items.length})`,
			'',
			...items.slice(0, 200).map((i) => `- ${i}`),
			''
		);
	}
	mkdirSync(dirname(chemin), { recursive: true });
	writeFileSync(chemin, lignes.join('\n'), 'utf8');
}

// --- Entrée --------------------------------------------------------------------------------------

export { reprendre, ecrireRapport, compte, rapport };

interface Options {
	dump: string;
	images: string | null;
	rapport: string;
}

function lireArguments(argv: string[]): Options {
	const positionnels: string[] = [];
	let images: string | null = null;
	let fichierRapport = join(BASE_DIR, 'data', 'rapport-reprise.md');
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--images') images = resolve(argv[++i] ?? '');
		else if (argv[i] === '--rapport') fichierRapport = resolve(argv[++i] ?? '');
		else positionnels.push(argv[i]!);
	}
	if (!positionnels[0]) {
		throw new Error(
			'Usage : tsx src/scripts/reprise-legacy.ts <dump.sql> [--images <dossier>] [--rapport <fichier.md>]'
		);
	}
	return { dump: resolve(positionnels[0]), images, rapport: resolve(fichierRapport) };
}

/** Vrai si ce fichier est lancé directement, et non simplement importé (voir `migrer.ts`). */
function lanceDirectement(): boolean {
	const argument = process.argv[1];
	if (!argument) return false;
	try {
		return import.meta.url === pathToFileURL(realpathSync(argument)).href;
	} catch {
		return false;
	}
}

if (lanceDirectement()) {
	const a = lireArguments(process.argv.slice(2));
	await reprendre(a.dump, a.images);
	ecrireRapport(a.rapport);

	const total = [...compte.values()].reduce((x, y) => x + y, 0);
	console.log(`Reprise terminée : ${total} lignes. Rapport : ${a.rapport}`);
	for (const [titre, items] of rapport) console.log(`  - ${titre} : ${items.length}`);
}
