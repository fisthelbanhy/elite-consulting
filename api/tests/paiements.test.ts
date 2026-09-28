/**
 * Service de paiement central (ADR-0006), testé avec un traitement fictif.
 * Portage de `tests/test_paiements.py`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { EtatPaiement, ModePaiement, TypeMembre } from '../src/enums.js';
import { declarer } from '../src/services/paiements.js';

basePropre();

const JOURNAL: string[] = [];
const TYPE_TEST = 99;

beforeEach(() => {
	JOURNAL.length = 0;
	declarer(TYPE_TEST, {
		libelle: (_membre, objetId) => `Objet ${objetId}`,
		montant: (_membre, objetId) => (objetId === 1 ? 5000 : null),
		retour: (_membre, objetId) => `/objets/${objetId}`,
		enregistrer: (p) => JOURNAL.push(`enregistrer:${p.id}`),
		confirmer: (p) => JOURNAL.push(`confirmer:${p.id}`),
		rejeter: (p) => JOURNAL.push(`rejeter:${p.id}`)
	});
});

function declarerPaiement(h: Record<string, string>, corps: Record<string, unknown> = {}) {
	return client()
		.post('/api/paiements')
		.set(h)
		.send({ type_objet: TYPE_TEST, objet_id: 1, mode: ModePaiement.CASH, remarque: '', ...corps });
}

describe('préparation', () => {
	it('impose le montant dû quand le module en fixe un', async () => {
		await creerMembre('payeur');
		const h = await entetes('payeur');

		const prep = await client()
			.get(`/api/paiements/preparer?type_objet=${TYPE_TEST}&objet_id=1`)
			.set(h);
		expect(prep.body.montant).toBe(5000);
		expect(prep.body.retour).toBe('/objets/1');
		expect(prep.body.libelle).toBe('Objet 1');

		// Montant saisi ignoré : le montant dû fait foi.
		const r = await declarerPaiement(h, { montant: 1 });
		expect(r.status).toBe(201);

		const miens = await client().get('/api/paiements/miens').set(h);
		expect(miens.body.items[0].montant).toBe(5000);
		expect(JOURNAL).toEqual([`enregistrer:${r.body.id}`]);
	});

	it('signale les paramètres de requête en faute sous leur nom', async () => {
		await creerMembre('payeur');
		const h = await entetes('payeur');

		// `type_objet` est obligatoire : la clé absente et une valeur illisible ne donnent pas le
		// même message.
		const absent = await client().get('/api/paiements/preparer').set(h);
		expect(absent.status).toBe(422);
		expect(absent.body.champs).toEqual({ type_objet: 'Ce champ est obligatoire.' });

		const illisible = await client().get('/api/paiements/preparer?type_objet=abc').set(h);
		expect(illisible.status).toBe(422);
		expect(illisible.body.champs).toEqual({ type_objet: 'Nombre entier attendu.' });

		// `objet_id` est facultatif, mais `?objet_id=` reste une valeur — et elle est invalide.
		const vide = await client()
			.get(`/api/paiements/preparer?type_objet=${TYPE_TEST}&objet_id=`)
			.set(h);
		expect(vide.status).toBe(422);
		expect(vide.body.champs).toEqual({ objet_id: 'Nombre entier attendu.' });

		// Absent, en revanche, il vaut bien « aucun objet ».
		const sansObjet = await client().get(`/api/paiements/preparer?type_objet=${TYPE_TEST}`).set(h);
		expect(sansObjet.status).toBe(200);
		expect(sansObjet.body.objet_id).toBeNull();
	});
});

describe('montant libre', () => {
	it('applique les règles legacy de saisie', async () => {
		await creerMembre('payeur');
		const h = await entetes('payeur');

		// « Le montant ne peut être zéro. »
		expect((await declarerPaiement(h, { objet_id: 2, montant: 0 })).status).toBe(400);

		const charden = await declarerPaiement(h, {
			objet_id: 2,
			montant: 2000,
			mode: ModePaiement.CHARDEN_FARELL,
			remarque: 'court'
		});
		expect(charden.status).toBe(400);
		expect(charden.body.champs.remarque).toContain('12 caractères');

		const mobile = await declarerPaiement(h, {
			objet_id: 2,
			montant: 2000,
			mode: ModePaiement.MOBILE_MONEY,
			remarque: '0612'
		});
		expect(mobile.status).toBe(400);
		expect(mobile.body.champs.remarque).toContain('9 caractères');

		const bon = {
			objet_id: 2,
			montant: 2000,
			mode: ModePaiement.MOBILE_MONEY,
			remarque: '061234567 TX42'
		};
		expect((await declarerPaiement(h, bon)).status).toBe(201);
		// Anti-doublon : même payeur, même montant, même remarque.
		expect((await declarerPaiement(h, bon)).status).toBe(400);
	});
});

describe('caisse', () => {
	it('réserve la confirmation et le rejet au droit « Caisse »', async () => {
		await creerMembre('payeur');
		await creerMembre('sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('caissier', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const h = await entetes('payeur');

		const p1 = (await declarerPaiement(h)).body.id;
		const p2 = (
			await declarerPaiement(h, { objet_id: 3, montant: 700, remarque: 'espèces au bureau' })
		).body.id;

		expect((await client().post(`/api/paiements/${p1}/confirmer`).set(h)).status).toBe(403);
		expect(
			(
				await client()
					.post(`/api/paiements/${p1}/confirmer`)
					.set(await entetes('sans_droit'))
			).status
		).toBe(403);

		const hc = await entetes('caissier');
		const liste = await client().get('/api/paiements?etat=2').set(hc);
		expect(liste.body.total).toBe(2);
		expect(liste.body.somme).toBe(5700);

		expect((await client().post(`/api/paiements/${p1}/confirmer`).set(hc)).status).toBe(200);
		expect((await client().post(`/api/paiements/${p2}/rejeter`).set(hc)).status).toBe(200);

		// On ne confirme pas deux fois, on ne rejette pas un paiement déjà traité.
		expect((await client().post(`/api/paiements/${p1}/confirmer`).set(hc)).status).toBe(400);
		expect((await client().post(`/api/paiements/${p2}/confirmer`).set(hc)).status).toBe(400);
		expect(JOURNAL).toContain(`confirmer:${p1}`);
		expect(JOURNAL).toContain(`rejeter:${p2}`);

		const tous = await client().get('/api/paiements').set(hc);
		const etats = Object.fromEntries(
			tous.body.items.map((p: { id: number; etat: number }) => [p.id, p.etat])
		);
		expect(etats).toEqual({
			[p1]: EtatPaiement.CONFIRME,
			[p2]: EtatPaiement.NON_PAYE
		});
	});
});
