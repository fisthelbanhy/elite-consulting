/**
 * Parcours « Devenir distributeur » (portage de `app/services/distributeur.py` ; legacy
 * incl-adhesion.php, tables souscriptoportuniteaffaire, membreoportuniteaffaire,
 * produitoportuniteaffaire) et paiement de la souscription (type 6).
 *
 * Règles conservées (ADR-0004) : 1 souscription par membre, fonds propres ≥ 56 000 FCFA, crédit
 * entre 56 000 et 66 000 FCFA, prospects enregistrés seulement si le nom dépasse 5 caractères.
 * Corrections (ADR-0007 S5b, S5c) : le kit peut contenir **tous** les produits actifs ; la
 * référence est générée ; les prospects sont mis à jour ; le mode « Crédit » crée une souscription
 * « Non traitée » suivie par les gestionnaires ; la saisie est sauvegardée à chaque étape.
 */
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { db } from '../db.js';
import { Etat, ModeSouscription, Prestation, TypeObjetPaye } from '../enums.js';
import { erreur, interdit, introuvable } from '../erreurs.js';
import { paiement as tablePaiement, produit as tableProduit } from '../schema/commerce.js';
import { message as tableMessage } from '../schema/contenu.js';
import type { Membre } from '../schema/membres.js';
import {
	produitSouscription,
	prospectSouscription,
	souscription as tableSouscription,
	type FilleulSouscription,
	type FormationSouscription
} from '../schema/opportunite.js';
import { declarer } from './paiements.js';
import { nouvelleReference, Prefixe } from './references.js';

export const SEUIL_MINIMUM = 56_000;
export const PLAFOND_CREDIT = 66_000;
export const NOMBRE_PROSPECTS = 25;
export const NOMBRE_FILLEULS = 3;

/** `$arrayetapeadhesion` (orthographe corrigée) : titres des blocs de l'assistant. */
export const TITRES: Record<number, string> = {
	1: 'Préalables au développement de votre entreprise : fixez-vous des objectifs',
	2: 'Votre propre histoire',
	3: "Combien d'heures par semaine pensez-vous pouvoir consacrer à votre activité ?",
	4: 'Votre liste de noms',
	5: 'Comment devenir compétent dans le marketing de réseau',
	6: 'Contactez vos prospects par téléphone',
	7: 'Rendez-vous individuel',
	8: "Nombre d'intéressés",
	9: 'Commande des produits',
	10: 'Paiement'
};

/**
 * L'assistant suit les 10 blocs de `$arrayetapeadhesion` : 1 objectifs, 2 histoire,
 * 3 disponibilité, 4 liste de noms, 5 formations, 6 contacts téléphoniques (texte seul),
 * 7 rendez-vous individuels, 8 intéressés, 9 commande du kit ; 10 = paiement (souscription
 * envoyée).
 */
export const DERNIERE_ETAPE = 9;
export const ETAPE_ENVOYEE = 10;

/** Une souscription « validée » (payée ou acceptée par un gestionnaire) fait un distributeur. */
export const ETATS_DISTRIBUTEUR: number[] = [Etat.AUTORISE, Etat.CLOTURE];

export type Souscription = typeof tableSouscription.$inferSelect;
export type Produit = typeof tableProduit.$inferSelect;

export function souscriptionDe(membreId: number): Souscription | undefined {
	return db.select().from(tableSouscription).where(eq(tableSouscription.membre_id, membreId)).get();
}

export function prospectsDe(souscriptionId: number) {
	return db
		.select()
		.from(prospectSouscription)
		.where(eq(prospectSouscription.souscription_id, souscriptionId))
		.orderBy(asc(prospectSouscription.id))
		.all();
}

export function kitDe(souscriptionId: number) {
	return db
		.select()
		.from(produitSouscription)
		.where(eq(produitSouscription.souscription_id, souscriptionId))
		.orderBy(asc(produitSouscription.id))
		.all();
}

/** Distributeur = membre ayant une souscription validée (ADR-0007 S5a). */
export function estDistributeur(membre: Membre | null): boolean {
	if (!membre) return false;
	const s = souscriptionDe(membre.id);
	return !!s && ETATS_DISTRIBUTEUR.includes(s.etat);
}

/** Tous les produits actifs ayant un prix distributeur (le legacy se limitait aux id ≤ 25). */
export function produitsDuKit(): Produit[] {
	return db
		.select()
		.from(tableProduit)
		.where(and(eq(tableProduit.etat, Etat.AUTORISE), gt(tableProduit.prix_distributeur, 0)))
		.orderBy(asc(tableProduit.nom))
		.all();
}

export function dernierPaiement(souscriptionId: number) {
	return db
		.select()
		.from(tablePaiement)
		.where(
			and(
				eq(tablePaiement.type_objet, TypeObjetPaye.SOUSCRIPTION),
				eq(tablePaiement.objet_id, souscriptionId)
			)
		)
		.orderBy(desc(tablePaiement.date_paiement), desc(tablePaiement.id))
		.limit(1)
		.get();
}

export function etatPaiement(souscriptionId: number): number | null {
	const p = dernierPaiement(souscriptionId);
	return p ? p.etat : null;
}

function texte(v: string | null | undefined): string {
	return (v ?? '').trim();
}

/** `56 000 FCFA`. */
export function fcfa(montant: number): string {
	return `${montant.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

// --- Enregistrement d'une étape de l'assistant ---------------------------------------------------

export interface ProspectEntree {
	nom_prenom: string;
	telephone: string;
	email: string;
	commentaire: string;
}

export interface FormationEntree {
	prestation: number;
	date: Date | null;
	lieu: string;
	heure: string;
}

export interface FilleulEntree {
	nom: string;
	email: string;
	adresse: string;
	montant: number;
	date_presentation: Date | null;
}

export interface LigneKitEntree {
	produit_id: number;
	quantite: number;
}

export interface EtapeEntree {
	etape: number;
	avancer: boolean;
	objectifs: string;
	mon_histoire: string;
	disponibilite_hebdo: number;
	prospects: ProspectEntree[];
	date_limite_complement: Date | null;
	formations: FormationEntree[];
	nombre_rdv: number;
	filleuls: FilleulEntree[];
	mode_souscription: number;
	produits: LigneKitEntree[];
	envoyer: boolean;
}

/** `2026-09-28` — les dates des formations et des filleuls sont stockées en texte ISO. */
function iso(d: Date | null): string {
	if (!d) return '';
	const mois = String(d.getMonth() + 1).padStart(2, '0');
	const jour = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mois}-${jour}`;
}

function creer(membre: Membre): Souscription {
	return db
		.insert(tableSouscription)
		.values({
			membre_id: membre.id,
			reference: nouvelleReference(Prefixe.SOUSCRIPTION),
			etat: Etat.NON_TRAITE,
			etape_courante: 1,
			formations: [],
			filleuls: []
		})
		.returning()
		.get()!;
}

/**
 * Sauvegarde les données d'une étape de l'assistant et fait progresser `etape_courante`.
 * Retourne la souscription (relue) et le message à afficher.
 */
export function enregistrerEtape(
	membre: Membre,
	d: EtapeEntree
): { souscription: Souscription; message: string } {
	if (membre.type_compte === 1) throw interdit("L'adhésion distributeur est réservée aux membres.");
	const s = souscriptionDe(membre.id) ?? creer(membre);
	const valeurs: Record<string, unknown> = {};
	let message = 'Enregistrement effectué.';

	if (d.etape === 1) {
		valeurs.objectifs = texte(d.objectifs);
	} else if (d.etape === 2) {
		valeurs.mon_histoire = texte(d.mon_histoire);
	} else if (d.etape === 3) {
		valeurs.disponibilite_hebdo = d.disponibilite_hebdo;
	} else if (d.etape === 4) {
		// Correctif F-S5-35 : la liste enregistrée remplace l'ancienne (modifications et retraits
		// pris en compte) ; règle legacy F-S5-26 : seuls les noms de plus de 5 caractères sont gardés.
		db.delete(prospectSouscription).where(eq(prospectSouscription.souscription_id, s.id)).run();
		const gardes = d.prospects
			.slice(0, NOMBRE_PROSPECTS)
			.filter((p) => texte(p.nom_prenom).length > 5)
			.map((p) => ({
				souscription_id: s.id,
				membre_id: membre.id,
				nom_prenom: texte(p.nom_prenom),
				telephone: texte(p.telephone),
				email: texte(p.email),
				commentaire: texte(p.commentaire),
				etat: Etat.AUTORISE
			}));
		if (gardes.length) db.insert(prospectSouscription).values(gardes).run();
		valeurs.date_limite_complement = d.date_limite_complement;
	} else if (d.etape === 5) {
		const saisies = new Map(d.formations.map((f) => [f.prestation, f]));
		valeurs.formations = Object.values(Prestation).map<FormationSouscription>((p) => {
			const f = saisies.get(p);
			return {
				prestation: p,
				date: f ? iso(f.date) : '',
				lieu: f ? texte(f.lieu) : '',
				heure: f ? texte(f.heure) : ''
			};
		});
	} else if (d.etape === 7) {
		valeurs.nombre_rdv = d.nombre_rdv;
	} else if (d.etape === 8) {
		valeurs.filleuls = d.filleuls.slice(0, NOMBRE_FILLEULS).map<FilleulSouscription>((f) => ({
			nom: texte(f.nom),
			email: texte(f.email),
			adresse: texte(f.adresse),
			montant: f.montant,
			date_presentation: iso(f.date_presentation)
		}));
	}

	// Progression (reprise « là où l'on s'était arrêté ») : l'étape la plus avancée atteinte.
	if (d.etape < DERNIERE_ETAPE && d.avancer) {
		valeurs.etape_courante = Math.max(s.etape_courante || 1, d.etape + 1);
	}
	if (Object.keys(valeurs).length) {
		db.update(tableSouscription).set(valeurs).where(eq(tableSouscription.id, s.id)).run();
	}
	// L'étape 9 écrit elle-même (mode, montant, kit, étape) : elle est traitée après la sauvegarde
	// des autres champs pour que `etape_courante` reflète bien l'envoi.
	if (d.etape === DERNIERE_ETAPE) message = commande(s, d);

	return { souscription: souscriptionDe(membre.id)!, message };
}

/**
 * Étape 9 : mode de souscription + kit produits. « Sauvegarder » sans contrôle ; « Envoyer » avec
 * les 3 contrôles cumulés du legacy (messages exacts, orthographe corrigée).
 */
function commande(s: Souscription, d: EtapeEntree): string {
	if (ETATS_DISTRIBUTEUR.includes(s.etat)) {
		throw erreur('Votre souscription est validée : le kit ne peut plus être modifié.');
	}
	const quantites = new Map<number, number>();
	for (const ligne of d.produits) {
		if (ligne.quantite > 0) {
			quantites.set(ligne.produit_id, (quantites.get(ligne.produit_id) ?? 0) + ligne.quantite);
		}
	}
	const produits = new Map<number, Produit>(
		quantites.size ? produitsDuKit().map((p) => [p.id, p]) : []
	);
	if ([...quantites.keys()].some((pid) => !produits.has(pid))) {
		throw erreur("Un produit choisi n'est plus disponible.", {
			produits: "Un produit choisi n'est plus disponible : actualisez la page."
		});
	}

	// Montant toujours recalculé côté serveur (correctif F-S5-32 : jamais saisi à la main).
	let montant = 0;
	for (const [pid, q] of quantites) montant += produits.get(pid)!.prix_distributeur * q;
	const mode = d.mode_souscription || 0;

	if (d.envoyer) {
		const champs: Record<string, string> = {};
		if (mode !== ModeSouscription.FOND_PROPRE && mode !== ModeSouscription.CREDIT) {
			champs.mode_souscription = 'Veuillez indiquer le mode de souscription.';
		}
		if (montant < SEUIL_MINIMUM) {
			champs.produits = 'Le montant de souscription ne peut être inférieur à 56 000 FCFA.';
		} else if (mode === ModeSouscription.CREDIT && montant > PLAFOND_CREDIT) {
			champs.produits =
				'Pour une souscription à crédit le montant ne peut être supérieur à 66 000 FCFA.';
		}
		if (Object.keys(champs).length) throw erreur('Veuillez corriger les champs signalés.', champs);
	}

	db.delete(produitSouscription).where(eq(produitSouscription.souscription_id, s.id)).run();
	const lignes = [...quantites].map(([pid, q]) => ({
		souscription_id: s.id,
		produit_id: pid,
		prix_unitaire: produits.get(pid)!.prix_distributeur,
		quantite: q
	}));
	if (lignes.length) db.insert(produitSouscription).values(lignes).run();

	const dejaEnvoyee = (s.etape_courante || 0) >= ETAPE_ENVOYEE;
	// « Sauvegarder » : le kit modifié doit être renvoyé, la souscription redevient un brouillon.
	const etape = d.envoyer ? ETAPE_ENVOYEE : DERNIERE_ETAPE;
	db.update(tableSouscription)
		.set({ mode_souscription: mode, montant, etape_courante: etape })
		.where(eq(tableSouscription.id, s.id))
		.run();

	if (!d.envoyer) return 'Opération effectuée.';
	if (mode === ModeSouscription.CREDIT) {
		// ADR-0007 S5c : pas de paiement ; la souscription reste « Non traitée » et apparaît dans le
		// suivi des gestionnaires. La frangine est prévenue par la messagerie.
		if (!dejaEnvoyee) {
			db.insert(tableMessage)
				.values({
					membre_id: s.membre_id,
					auteur_id: s.membre_id,
					de_la_frangine: false,
					texte:
						'[Message automatique] Je souhaite devenir distributeur avec une souscription à ' +
						`crédit (référence ${s.reference}, kit de ${fcfa(montant)}). Merci de me recontacter.`
				})
				.run();
		}
		return 'Votre demande de souscription à crédit est transmise à votre frangine : elle vous recontacte très vite.';
	}
	return "Souscription enregistrée : il ne reste plus qu'à régler votre kit.";
}

// --- Paiement de la souscription (type 6) --------------------------------------------------------

function souscriptionPayee(membre: Membre, objetId: number | null): Souscription {
	const s = objetId
		? db.select().from(tableSouscription).where(eq(tableSouscription.id, objetId)).get()
		: souscriptionDe(membre.id);
	if (!s || s.membre_id !== membre.id) throw introuvable('Souscription introuvable.');
	return s;
}

declarer(TypeObjetPaye.SOUSCRIPTION, {
	libelle: (membre, objetId) =>
		`Souscription distributeur ${souscriptionPayee(membre, objetId).reference} — kit de démarrage`,
	montant: (membre, objetId) => {
		const s = souscriptionPayee(membre, objetId);
		return kitDe(s.id).reduce((total, p) => total + p.prix_unitaire * p.quantite, 0);
	},
	retour: () => '/devenir-distributeur/adhesion',
	verifier: (membre, objetId, montant) => {
		const s = souscriptionPayee(membre, objetId);
		if (ETATS_DISTRIBUTEUR.includes(s.etat)) throw erreur('Cette souscription est déjà payée.');
		if ((s.etape_courante || 0) < ETAPE_ENVOYEE) {
			throw erreur("Envoyez d'abord votre souscription à l'étape « Commande des produits ».");
		}
		if (s.mode_souscription !== ModeSouscription.FOND_PROPRE) {
			throw erreur(
				"Une souscription à crédit n'est pas payée en ligne : votre frangine vous recontacte."
			);
		}
		if (montant < SEUIL_MINIMUM) {
			throw erreur('Le montant de souscription ne peut être inférieur à 56 000 FCFA.');
		}
	},
	enregistrer: (p) => {
		const s = p.objet_id
			? db.select().from(tableSouscription).where(eq(tableSouscription.id, p.objet_id)).get()
			: p.membre_id
				? souscriptionDe(p.membre_id)
				: undefined;
		if (!s) return;
		if (p.objet_id !== s.id) {
			db.update(tablePaiement).set({ objet_id: s.id }).where(eq(tablePaiement.id, p.id)).run();
			p.objet_id = s.id;
		}
		db.update(tableSouscription)
			.set({ etat: Etat.AUTORISE })
			.where(eq(tableSouscription.id, s.id))
			.run();
		db.insert(tableMessage)
			.values({
				membre_id: s.membre_id,
				de_la_frangine: true,
				texte:
					`Bienvenue parmi les distributeurs ! Votre souscription ${s.reference} est ` +
					'enregistrée ; notre caisse confirmera votre paiement. Vous bénéficiez désormais du ' +
					'prix distributeur sur la boutique.'
			})
			.run();
	},
	rejeter: (p) => {
		if (!p.objet_id) return;
		const s = db.select().from(tableSouscription).where(eq(tableSouscription.id, p.objet_id)).get();
		if (s && s.etat === Etat.AUTORISE) {
			db.update(tableSouscription)
				.set({ etat: Etat.NON_TRAITE })
				.where(eq(tableSouscription.id, s.id))
				.run();
		}
	}
});
