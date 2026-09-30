/**
 * Règles partagées de la trésorerie (portage de `app/services/tresorerie.py` ; legacy
 * incl-placement.php, incl-operationbanque.php…) : banques d'un placement, résolution des noms de
 * banque, e-mail « Programmation opérations bancaires » envoyé à la banque émettrice.
 */
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '../db.js';
import { Devise, Etat, libelle, TypeOperationBanque } from '../enums.js';
import { banque as tableBanque } from '../schema/core.js';
import { operationBanque } from '../schema/finance.js';
import type { Membre } from '../schema/membres.js';

export type Banque = typeof tableBanque.$inferSelect;
export type OperationBanque = typeof operationBanque.$inferSelect;

/**
 * Présentation « Débit / Crédit » de la vue gestionnaire (S7-11, intitulés corrigés) : sorties du
 * compte du membre à gauche, entrées à droite.
 */
export const DEBITS: number[] = [
	TypeOperationBanque.TRANSFERT,
	TypeOperationBanque.VIREMENT_EMIS,
	TypeOperationBanque.RETRAIT
];

/** Types pour lesquels une banque bénéficiaire n'a pas de sens (dépôt / retrait d'espèces). */
export const SANS_BANQUE_BENEFICIAIRE: number[] = [
	TypeOperationBanque.VERSEMENT,
	TypeOperationBanque.RETRAIT
];

const EMAIL = /^[^@\s;,]+@[^@\s;,]+\.[^@\s;,]+$/;

export function sens(typeOperation: number): 'debit' | 'credit' {
	return DEBITS.includes(typeOperation) ? 'debit' : 'credit';
}

// --- Banques d'un placement ----------------------------------------------------------------------
// Le legacy stockait une chaîne positionnelle « 0*0*9*0… » limitée aux banques d'id ≤ 20. On garde
// la colonne texte (aucune migration) mais on y range la liste des id séparés par « * » : les
// données reprises restent lisibles et le nombre de banques n'est plus limité (F-S7-26).

export function idsBanques(valeur: string | null | undefined): number[] {
	const ids: number[] = [];
	for (const morceau of (valeur ?? '').split('*')) {
		const net = morceau.trim();
		if (!/^\d+$/.test(net)) continue;
		const n = Number(net);
		if (n > 0 && !ids.includes(n)) ids.push(n);
	}
	return ids;
}

export function serialiserBanques(ids: Iterable<number>): string {
	return [...new Set(ids)].sort((a, b) => a - b).join('*');
}

/** La banque « Autres » (id 1 en production) n'est qu'une valeur sentinelle « non listée ». */
export function estAutres(banque: Banque | null | undefined): boolean {
	if (!banque) return false;
	const nom = banque.nom.trim().toLowerCase();
	return nom === 'autres' || nom === 'autre';
}

export function banqueValide(banqueId: number | null | undefined): Banque | null {
	if (!banqueId) return null;
	const b = db.select().from(tableBanque).where(eq(tableBanque.id, banqueId)).get();
	if (!b || b.etat !== Etat.AUTORISE || estAutres(b)) return null;
	return b;
}

/** Nom affiché : le nom saisi librement (« banque non listée ») sinon celui du référentiel. */
export function nomBanque(banque: Banque | null | undefined, nomLibre: string): string {
	return (nomLibre || '').trim() || (banque ? banque.nom : '');
}

/** Le legacy acceptait « a@x.cg; b@y.com » : on découpe et on garde les adresses valides. */
export function adresses(valeur: string | null | undefined): string[] {
	return (valeur ?? '')
		.split(/[;,\s]+/)
		.map((a) => a.trim())
		.filter(Boolean);
}

export function adressesValides(valeur: string | null | undefined): boolean {
	return adresses(valeur).every((a) => EMAIL.test(a));
}

/** Adresse saisie pour la banque émettrice, sinon celle du référentiel. */
export function destinataires(op: OperationBanque): string[] {
	const saisies = adresses(op.banque_emettrice_email).filter((a) => EMAIL.test(a));
	if (saisies.length) return saisies;
	const emettrice = op.banque_emettrice_id
		? db.select().from(tableBanque).where(eq(tableBanque.id, op.banque_emettrice_id)).get()
		: undefined;
	if (emettrice?.email) return adresses(emettrice.email).filter((a) => EMAIL.test(a));
	return [];
}

function montantFr(v: number): string {
	return v.toLocaleString('fr-FR').replace(/ | /g, ' ');
}

function dateFr(d: Date | null): string {
	if (!d) return '';
	const deux = (n: number) => String(n).padStart(2, '0');
	return `${deux(d.getDate())}-${deux(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/**
 * Contenu legacy (S7-10) : « SOCIETE : … / DATE : … / OPERATION : … / MONTANT : … /
 * BANQUE EMETRICE : … / BANQUE BENEFICIAIRE : … », complété de la devise et du bénéficiaire.
 */
export function ligneMail(op: OperationBanque, membre: Membre | null | undefined): string {
	const lire = (id: number | null) =>
		id ? db.select().from(tableBanque).where(eq(tableBanque.id, id)).get() : undefined;
	let beneficiaire = nomBanque(lire(op.banque_beneficiaire_id), op.banque_beneficiaire_nom);
	if (op.banque_beneficiaire_adresse) {
		beneficiaire = beneficiaire
			? `${beneficiaire} (${op.banque_beneficiaire_adresse})`
			: op.banque_beneficiaire_adresse;
	}
	return [
		`SOCIÉTÉ : ${membre ? membre.nom : ''}`,
		`DATE : ${dateFr(op.date_operation)}`,
		`OPÉRATION : ${libelle('TypeOperationBanque', op.type_operation)}`,
		`MONTANT : ${montantFr(op.montant)} ${libelle('Devise', op.devise)}`,
		`BANQUE ÉMETTRICE : ${nomBanque(lire(op.banque_emettrice_id), op.banque_emettrice_nom)}`,
		`BÉNÉFICIAIRE : ${op.beneficiaire}`,
		`BANQUE BÉNÉFICIAIRE : ${beneficiaire}`
	].join(' / ');
}

export const SUJET_MAIL = 'Programmation opérations bancaires';

export function corpsMail(
	operations: OperationBanque[],
	membre: Membre | null | undefined,
	nomSite = 'La Frangine'
): string {
	return [
		'Bonjour,',
		'',
		`Votre client vous transmet, par l'intermédiaire de ${nomSite}, la programmation suivante ` +
			`(référence ${operations[0]!.reference}) :`,
		'',
		...operations.map((op) => `- ${ligneMail(op, membre)}`),
		'',
		'Merci de bien vouloir confirmer la bonne réception de cet ordre directement à votre client.',
		'',
		`— ${nomSite}`
	].join('\n');
}

export function regrouperParDestinataire(
	operations: OperationBanque[]
): Map<string, OperationBanque[]> {
	const groupes = new Map<string, OperationBanque[]>();
	for (const op of operations) {
		for (const a of destinataires(op)) {
			const cle = a.toLowerCase();
			const liste = groupes.get(cle) ?? [];
			liste.push(op);
			groupes.set(cle, liste);
		}
	}
	return groupes;
}

/** Opérations saisies ensemble : le legacy leur donne une référence commune (décision F-S7-31). */
export function lot(reference: string, exclureId?: number): OperationBanque[] {
	const conditions = [
		eq(operationBanque.reference, reference),
		ne(operationBanque.etat, Etat.SUPPRIME)
	];
	if (exclureId) conditions.push(ne(operationBanque.id, exclureId));
	return db
		.select()
		.from(operationBanque)
		.where(and(...conditions))
		.orderBy(asc(operationBanque.id))
		.all();
}

/** Devises acceptées, réexportées pour les schémas de saisie. */
export const DEVISES: number[] = Object.values(Devise);
