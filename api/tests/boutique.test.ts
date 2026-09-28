/**
 * Boutique bien-être : catalogue, panier produits, fiches bien-être
 * (portage de `tests/test_boutique.py`).
 */
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { Etat, TypeMembre } from '../src/enums.js';
import { lignePanier, produit } from '../src/schema/commerce.js';
import { maladie, maladieProduit } from '../src/schema/contenu.js';
import { parametre } from '../src/schema/core.js';
import { souscription } from '../src/schema/opportunite.js';
import { MESSAGE_STOCK } from '../src/services/boutique.js';

basePropre();

function catalogue() {
	db.insert(produit)
		.values([
			{
				id: 1,
				reference: '015',
				nom: 'Aloe Vera Gel',
				description: "Pulpe d'aloès à boire",
				groupe: 1,
				prix_distributeur: 10_000,
				prix_non_distributeur: 12_000,
				prix_public: 15_000,
				quantite_stock: 5,
				photo: 'produits/legacy-pdt1.jpg'
			},
			{
				id: 2,
				reference: '027',
				nom: 'Forever Bee Pollen',
				groupe: 100,
				prix_distributeur: 6_500,
				prix_public: 9_000,
				quantite_stock: 1
			},
			{
				id: 3,
				reference: '051',
				nom: 'Produit retiré',
				groupe: 1,
				prix_distributeur: 1_000,
				prix_public: 2_000,
				quantite_stock: 10,
				etat: Etat.SUPPRIME
			},
			{
				id: 4,
				reference: '061',
				nom: 'Gelée aloès',
				groupe: 13,
				prix_distributeur: 0,
				prix_public: 0,
				quantite_stock: 3
			}
		])
		.run();
}

async function distributeur(identifiant: string): Promise<number> {
	const id = await creerMembre(identifiant);
	db.insert(souscription)
		.values({
			membre_id: id,
			reference: 'SOA0110126',
			etat: Etat.AUTORISE,
			etape_courante: 8
		})
		.run();
	return id;
}

describe('catalogue', () => {
	it('est public et applique le prix du statut du lecteur', async () => {
		catalogue();
		await distributeur('distri');

		const public_ = (await client().get('/api/boutique/produits')).body;
		expect(public_.total).toBe(3); // le produit retiré n'est pas proposé
		expect(public_.distributeur).toBe(false);
		const gel = public_.items.find((p: { id: number }) => p.id === 1);
		expect(gel.prix).toBe(15_000);
		expect(gel.prix_distributeur).toBe(10_000);
		expect(gel.photo_url).toBe('/media/produits/legacy-pdt1.jpg');
		// Produits vendables d'abord (prix connu).
		expect(public_.items.at(-1).id).toBe(4);

		const distri = (await client().get('/api/boutique/produits').set(await entetes('distri'))).body;
		expect(distri.distributeur).toBe(true);
		expect(distri.items.find((p: { id: number }) => p.id === 1).prix).toBe(10_000);

		expect((await client().get('/api/boutique/produits?q=pollen')).body.total).toBe(1);
		expect((await client().get('/api/boutique/produits?groupe=1')).body.total).toBe(1);
		// groupe 0 = produits rangés hors des 20 groupes FLP.
		expect(
			(await client().get('/api/boutique/produits?groupe=0')).body.items.map(
				(p: { id: number }) => p.id
			)
		).toEqual([2]);
	});

	it('compte les groupes FLP et les produits les plus consultés', async () => {
		catalogue();
		const groupes = (await client().get('/api/boutique/groupes')).body;
		expect(groupes).toHaveLength(21); // 20 groupes FLP + « Autres produits »
		expect(groupes.find((g: { groupe: number }) => g.groupe === 1).nombre).toBe(1);
		expect(groupes.at(-1)).toEqual({
			groupe: 0,
			libelle: 'Autres produits Forever',
			nombre: 1
		});

		await client().get('/api/boutique/produits/2');
		const populaires = (await client().get('/api/boutique/produits/populaires')).body;
		expect(populaires[0].id).toBe(2);
		expect(populaires).toHaveLength(3);
	});

	it('compte les visites de la fiche et cache un produit retiré', async () => {
		catalogue();
		await client().get('/api/boutique/produits/1');
		const fiche = (await client().get('/api/boutique/produits/1')).body;
		expect(fiche.nombre_visites).toBe(2);
		expect(fiche.prix_non_distributeur).toBe(12_000);
		expect(fiche.prix).toBe(15_000);
		expect(fiche.distributeur).toBe(false);
		expect((await client().get('/api/boutique/produits/3')).status).toBe(404);
	});
});

describe('panier', () => {
	it('fige le prix, regroupe les lignes et refuse un produit sans prix', async () => {
		catalogue();
		await creerMembre('awa');
		const h = await entetes('awa');

		expect(
			(await client().post('/api/panier').send({ lignes: [{ produit_id: 1, quantite: 2 }] })).status
		).toBe(401);
		const r = await client()
			.post('/api/panier')
			.set(h)
			.send({
				lignes: [
					{ produit_id: 1, quantite: 2 },
					{ produit_id: 2, quantite: 0 }
				]
			});
		expect(r.status).toBe(201);
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 1, quantite: 1 }] });

		// Le prix change après l'ajout : le panier garde le prix figé.
		db.update(produit).set({ prix_public: 20_000 }).where(eq(produit.id, 1)).run();

		const panier = (await client().get('/api/panier').set(h)).body;
		expect(panier.lignes).toHaveLength(1);
		expect(panier.lignes[0].quantite).toBe(3);
		expect(panier.lignes[0].prix_unitaire).toBe(15_000);
		expect(panier.lignes[0].montant).toBe(45_000);
		expect(panier.total).toBe(45_000);
		expect(panier.payable).toBe(true);
		expect((await client().get('/api/espace/compteurs').set(h)).body.panier).toBe(3);

		// Produit sans prix, produit retiré, quantité nulle.
		for (const lignes of [
			[{ produit_id: 4, quantite: 1 }],
			[{ produit_id: 3, quantite: 1 }],
			[{ produit_id: 1, quantite: 0 }]
		]) {
			expect((await client().post('/api/panier').set(h).send({ lignes })).status).toBe(400);
		}
	});

	it("n'est modifiable que par son propriétaire (correctif F-S5-15)", async () => {
		catalogue();
		await creerMembre('awa');
		await creerMembre('intrus');
		const h = await entetes('awa');
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 1, quantite: 2 }] });
		const ligne = (await client().get('/api/panier').set(h)).body.lignes[0].id;

		const hi = await entetes('intrus');
		expect((await client().delete(`/api/panier/${ligne}`).set(hi)).status).toBe(403);
		expect((await client().put(`/api/panier/${ligne}`).set(hi).send({ quantite: 9 })).status).toBe(
			403
		);
		expect((await client().put(`/api/panier/${ligne}`).set(h).send({ quantite: 4 })).status).toBe(
			200
		);
		expect((await client().get('/api/panier').set(h)).body.quantite_totale).toBe(4);
		expect((await client().delete(`/api/panier/${ligne}`).set(h)).status).toBe(200);
		expect((await client().get('/api/panier').set(h)).body.lignes).toEqual([]);
	});

	it('bloque le paiement quand le stock ne suit pas', async () => {
		catalogue();
		await creerMembre('awa');
		const h = await entetes('awa');
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 2, quantite: 1 }] });
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 2, quantite: 1 }] });

		const panier = (await client().get('/api/panier').set(h)).body;
		expect(panier.payable).toBe(false);
		expect(panier.message).toBe(MESSAGE_STOCK);
		expect(panier.lignes.every((li: { bloquante: boolean }) => li.bloquante)).toBe(true);

		const r = await client().post('/api/paiements').set(h).send({ type_objet: 1, mode: 1 });
		expect(r.status).toBe(400);
		expect(r.body.message).toBe(MESSAGE_STOCK);
	});
});

describe('paiement du panier', () => {
	it('décrémente le stock, et le rejet de la caisse le restitue', async () => {
		catalogue();
		await creerMembre('awa');
		await creerMembre('caisse', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const h = await entetes('awa');
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 1, quantite: 2 }] });

		const prep = (await client().get('/api/paiements/preparer?type_objet=1').set(h)).body;
		expect(prep.montant).toBe(30_000);
		expect(prep.retour).toBe('/panier');
		expect(prep.libelle).toContain('2 articles');

		const r = await client()
			.post('/api/paiements')
			.set(h)
			.send({ type_objet: 1, mode: 3, remarque: '066123456 TX889' });
		expect(r.status).toBe(201);
		const paiement = r.body.id;

		expect(db.select().from(produit).where(eq(produit.id, 1)).get()!.quantite_stock).toBe(3);
		let ligne = db.select().from(lignePanier).all()[0]!;
		expect(ligne.paye).toBe(true);
		expect(ligne.paiement_id).toBe(paiement);
		expect(ligne.date_paiement).not.toBeNull();
		expect((await client().get('/api/panier').set(h)).body.lignes).toEqual([]);

		// Panier vide : plus rien à payer.
		expect(
			(await client().post('/api/paiements').set(h).send({ type_objet: 1, mode: 1 })).status
		).toBe(400);

		expect(
			(
				await client()
					.post(`/api/paiements/${paiement}/rejeter`)
					.set(await entetes('caisse'))
			).status
		).toBe(200);
		expect(db.select().from(produit).where(eq(produit.id, 1)).get()!.quantite_stock).toBe(5);
		ligne = db.select().from(lignePanier).all()[0]!;
		expect(ligne.paye).toBe(false);
		expect(ligne.paiement_id).toBeNull();
		expect((await client().get('/api/panier').set(h)).body.total).toBe(30_000);
	});
});

describe('suivi des paniers', () => {
	it('est réservé aux gestionnaires', async () => {
		catalogue();
		await creerMembre('awa', { nom: 'Awa Mabiala', telephone: '061234567' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');
		await client()
			.post('/api/panier')
			.set(h)
			.send({
				lignes: [
					{ produit_id: 1, quantite: 1 },
					{ produit_id: 2, quantite: 1 }
				]
			});
		await client().post('/api/paiements').set(h).send({ type_objet: 1, mode: 1 });
		await client()
			.post('/api/panier')
			.set(h)
			.send({ lignes: [{ produit_id: 1, quantite: 1 }] });

		expect((await client().get('/api/panier/suivi').set(h)).status).toBe(403);
		const ha = await entetes('admin');
		const tout = (await client().get('/api/panier/suivi').set(ha)).body;
		expect(tout.total).toBe(3);
		expect(tout.somme).toBe(15_000 + 9_000 + 15_000);
		expect(tout.items[0].membre.telephone).toBe('061234567');
		expect((await client().get('/api/panier/suivi?etat_paiement=2').set(ha)).body.total).toBe(2);
		expect((await client().get('/api/panier/suivi?etat_paiement=1').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/panier/suivi?q=pollen').set(ha)).body.total).toBe(1);
	});
});

describe('fiches bien-être', () => {
	it('ne montre que les fiches publiées et obéit à l’interrupteur (ADR-0009)', async () => {
		catalogue();
		db.insert(maladie)
			.values([
				{ id: 1, libelle: 'Fatigue passagère', description: 'Quelques repères.' },
				{ id: 2, libelle: 'Fiche en attente', etat: Etat.NON_TRAITE }
			])
			.run();
		db.insert(maladieProduit)
			.values([
				{ maladie_id: 1, produit_id: 1, posologie: 'Un verre le matin', ordre: 1 },
				{ maladie_id: 1, produit_id: 3, posologie: 'Retiré', ordre: 2 }
			])
			.run();

		const liste = (await client().get('/api/bien-etre')).body;
		expect(liste.map((f: { libelle: string }) => f.libelle)).toEqual(['Fatigue passagère']);
		expect(liste[0].nombre_produits).toBe(1);

		const fiche = (await client().get('/api/bien-etre/1')).body;
		expect(fiche.produits.map((p: { produit: { id: number } }) => p.produit.id)).toEqual([1]);
		expect(fiche.produits[0].conseil_utilisation).toBe('Un verre le matin');
		expect(fiche.produits[0].produit.prix).toBe(15_000);
		expect((await client().get('/api/bien-etre/2')).status).toBe(404);

		db.update(parametre).set({ module_sante_actif: false }).where(eq(parametre.id, 1)).run();
		const r = await client().get('/api/bien-etre');
		expect(r.status).toBe(404);
		expect(r.body.message).toContain('bien-être');
	});
});
