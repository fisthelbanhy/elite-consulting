/**
 * Petites annonces : fiches, panier, paiement, intéressement.
 * Portage de `tests/test_annonces.py`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { familleArticle } from '../src/schema/core.js';

basePropre();

beforeEach(() => {
	db.insert(familleArticle).values([
		{ id: 1, libelle: 'Chaussure' },
		{ id: 2, libelle: 'Sac à main' }
	]).run();
});

const OFFRE = {
	offre_ou_recherche: 1,
	famille_id: 1,
	libelle: 'Chaussures de ville en cuir',
	prix: 15000,
	quantite: 3,
	neuf_ou_occasion: 1,
	description: 'Pointure 42, jamais portées.'
};

const RECHERCHE = {
	offre_ou_recherche: 2,
	famille_id: 2,
	libelle: 'Sac à main en pagne',
	prix: 10000,
	neuf_ou_occasion: 2,
	description: 'Je cherche un sac artisanal.'
};

describe('création', () => {
	it('applique les règles, la référence et l’unicité', async () => {
		await creerMembre('vendeur');
		const h = await entetes('vendeur');

		const incomplet = await client().post('/api/annonces').set(h).send({ libelle: 'Sac' });
		expect(incomplet.status).toBe(400);
		const champs = incomplet.body.champs;
		expect(champs.libelle).toBe("Le libellé de l'article doit avoir 5 caractères minimum.");
		expect(champs.famille_id).toBe("Veuillez indiquer la famille de l'article.");
		expect(Object.keys(champs)).toEqual(
			expect.arrayContaining(['neuf_ou_occasion', 'offre_ou_recherche'])
		);

		const r = await client()
			.post('/api/annonces')
			.set(h)
			.send({ ...OFFRE, quantite: 500 });
		expect(r.status, r.text).toBe(201);
		expect(r.body.reference).toMatch(/^ACL/);

		const fiche = await client().get(`/api/annonces/${r.body.id}`).set(h);
		// Quantité sans plafond à 127 (F-S3-40), date réelle, publié immédiatement.
		expect(fiche.body.quantite).toBe(500);
		expect(fiche.body.date_creation).not.toBeNull();
		expect(fiche.body.etat).toBe(2);

		// Unicité libellé + description (F-S3-38, inopérante dans le legacy).
		const doublon = await client()
			.post('/api/annonces')
			.set(h)
			.send({ ...OFFRE, prix: 1 });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cet article est déjà enregistré.');
	});
});

describe('liste', () => {
	it('filtre, trie et respecte la visibilité', async () => {
		await creerMembre('vendeur');
		await creerMembre('curieux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('vendeur');
		const id = (await client().post('/api/annonces').set(h).send(OFFRE)).body.id;
		await client().post('/api/annonces').set(h).send(RECHERCHE);

		const total = async (url: string) => (await client().get(url)).body.total;
		expect(await total('/api/annonces?type=1')).toBe(1);
		expect(await total('/api/annonces?famille_id=2&neuf_ou_occasion=2')).toBe(1);
		expect(await total('/api/annonces?prix_min=12000')).toBe(1);

		// Mot cherché dans le libellé OU la description, sans casser les autres critères (F-S3-30).
		expect(await total('/api/annonces?q=pointure')).toBe(1);
		expect(await total('/api/annonces?q=pointure&famille_id=2')).toBe(0);

		const compteurs = await client().get('/api/annonces/compteurs');
		expect(compteurs.body).toEqual({ offres: 1, recherches: 1, total: 2 });

		// Tri legacy : famille puis prix.
		const familles = (await client().get('/api/annonces')).body.items.map(
			(a: { famille: { libelle: string } }) => a.famille.libelle
		);
		expect(familles).toEqual(['Chaussure', 'Sac à main']);

		// Un article supprimé n'est plus consultable par un tiers (F-S3-33).
		expect((await client().delete(`/api/annonces/${id}`).set(h)).status).toBe(200);
		expect((await client().get(`/api/annonces/${id}`).set(await entetes('curieux'))).status).toBe(404);
		expect((await client().get(`/api/annonces/${id}`).set(await entetes('admin'))).status).toBe(200);
	});
});

describe('panier', () => {
	it('contrôle le stock, les droits et fige le prix', async () => {
		await creerMembre('vendeur');
		await creerMembre('acheteur');
		await creerMembre('autre');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const hv = await entetes('vendeur');
		const ha = await entetes('acheteur');

		const offre = (await client().post('/api/annonces').set(hv).send(OFFRE)).body.id;
		const recherche = (await client().post('/api/annonces').set(hv).send(RECHERCHE)).body.id;

		const ajouter = (h: Record<string, string>, id: number, quantite: number) =>
			client().post(`/api/annonces/${id}/panier`).set(h).send({ quantite });

		expect((await ajouter(ha, offre, 0)).status).toBe(400);
		const trop = await ajouter(ha, offre, 4);
		expect(trop.status).toBe(400);
		expect(trop.body.champs.quantite).toContain('Il reste 3');

		expect((await ajouter(ha, offre, 2)).status).toBe(201);
		expect((await ajouter(ha, offre, 1)).status).toBe(201);
		expect((await ajouter(ha, offre, 1)).status).toBe(400); // stock épuisé
		expect((await client().get(`/api/annonces/${offre}`).set(ha)).body.quantite_panier).toBe(3);

		// Ni son propre article, ni une recherche, ni un gestionnaire.
		expect((await ajouter(hv, offre, 1)).status).toBe(400);
		expect((await ajouter(ha, recherche, 1)).status).toBe(400);
		expect((await ajouter(await entetes('admin'), offre, 1)).status).toBe(403);

		const panier = (await client().get('/api/annonces/panier').set(ha)).body;
		// Même article, même prix : quantités cumulées sur une seule ligne.
		expect(panier.lignes).toHaveLength(1);
		const ligne = panier.lignes[0];
		expect(ligne.quantite).toBe(3);
		expect(ligne.prix_unitaire).toBe(15000);
		expect(ligne.montant).toBe(45000);
		expect(panier.total_montant).toBe(45000);
		expect(panier.peut_payer).toBe(true);

		// Le prix est figé : une hausse ne change pas le panier.
		await client()
			.put(`/api/annonces/${offre}`)
			.set(hv)
			.send({ ...OFFRE, prix: 20000 });
		expect((await client().get('/api/annonces/panier').set(ha)).body.total_montant).toBe(45000);

		// Un autre membre ne touche pas aux lignes de l'acheteur (F-S3-43).
		const vol = await client()
			.delete(`/api/annonces/panier/${ligne.id}`)
			.set(await entetes('autre'));
		expect(vol.status).toBe(403);

		// Le gestionnaire voit les paniers de tous, sans pouvoir payer (F-S3-44).
		const gestion = (
			await client()
				.get('/api/annonces/panier')
				.set(await entetes('admin'))
		).body;
		expect(gestion.lignes[0].membre.pseudonyme).toBe('acheteur');
		expect(gestion.peut_payer).toBe(false);

		// Stock réduit par le vendeur : paiement bloqué (ADR-0007 S3a).
		await client()
			.put(`/api/annonces/${offre}`)
			.set(hv)
			.send({ ...OFFRE, prix: 20000, quantite: 2 });
		const bloque = (await client().get('/api/annonces/panier').set(ha)).body;
		expect(bloque.peut_payer).toBe(false);
		expect(bloque.lignes[0].stock_insuffisant).toBe(true);

		const refus = await client().post('/api/paiements').set(ha).send({ type_objet: 2, mode: 1 });
		expect(refus.status).toBe(400);
		expect(refus.body.message).toContain('stock');

		// Correction de la quantité puis retrait de la ligne.
		expect(
			(await client().put(`/api/annonces/panier/${ligne.id}`).set(ha).send({ quantite: 2 })).status
		).toBe(200);
		expect((await client().get('/api/annonces/panier').set(ha)).body.peut_payer).toBe(true);
		expect((await client().delete(`/api/annonces/panier/${ligne.id}`).set(ha)).status).toBe(200);
		expect((await client().get('/api/annonces/panier').set(ha)).body.lignes).toEqual([]);
	});
});

describe('paiement', () => {
	it('réserve le stock à la déclaration et le restitue au rejet', async () => {
		await creerMembre('vendeur');
		await creerMembre('acheteur');
		await creerMembre('caisse', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const hv = await entetes('vendeur');
		const ha = await entetes('acheteur');

		const offre = (await client().post('/api/annonces').set(hv).send(OFFRE)).body.id;
		await client().post(`/api/annonces/${offre}/panier`).set(ha).send({ quantite: 2 });

		const prep = await client().get('/api/paiements/preparer?type_objet=2').set(ha);
		expect(prep.body.montant).toBe(30000);
		expect(prep.body.retour).toBe('/annonces/panier');
		expect(prep.body.libelle).toContain('2 articles');

		const r = await client()
			.post('/api/paiements')
			.set(ha)
			.send({ type_objet: 2, mode: 3, remarque: '061234567 TX998877' });
		expect(r.status, r.text).toBe(201);
		const paiementId = r.body.id;

		// Stock réservé dès la déclaration (legacy conservé).
		expect((await client().get(`/api/annonces/${offre}`).set(hv)).body.quantite).toBe(1);
		const panier = (await client().get('/api/annonces/panier').set(ha)).body;
		expect(panier.lignes).toEqual([]);
		expect(panier.achats[0].etat_paiement).toBe(2);
		expect(panier.achats[0].montant).toBe(30000);

		// Plus rien à payer : le formulaire n'est plus proposé (F-PAY-09).
		expect((await client().get('/api/paiements/preparer?type_objet=2').set(ha)).status).toBe(400);

		// Rejet par la caisse : stock restitué, lignes remises dans le panier (ADR-0007 S3b).
		const rejet = await client()
			.post(`/api/paiements/${paiementId}/rejeter`)
			.set(await entetes('caisse'));
		expect(rejet.status).toBe(200);
		expect((await client().get(`/api/annonces/${offre}`).set(hv)).body.quantite).toBe(3);

		const rendu = (await client().get('/api/annonces/panier').set(ha)).body;
		expect(rendu.total_quantite).toBe(2);
		expect(rendu.peut_payer).toBe(true);
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);
	});
});

describe('intéressement', () => {
	it("n'est possible que sur une recherche", async () => {
		await creerMembre('vendeur');
		await creerMembre('fournisseur');
		const hv = await entetes('vendeur');
		const hf = await entetes('fournisseur');

		const offre = (await client().post('/api/annonces').set(hv).send(OFFRE)).body.id;
		const recherche = (await client().post('/api/annonces').set(hv).send(RECHERCHE)).body.id;

		const surOffre = await client()
			.post(`/api/annonces/${offre}/interet`)
			.set(hf)
			.send({ message: 'Je prends !' });
		expect(surOffre.status).toBe(400);

		const tropCourt = await client()
			.post(`/api/annonces/${recherche}/interet`)
			.set(hf)
			.send({ message: 'abc' });
		expect(tropCourt.body.message).toBe('Intéressement doit avoir 5 caractères minimum.');

		const bon = await client()
			.post(`/api/annonces/${recherche}/interet`)
			.set(hf)
			.send({ message: "J'en fabrique, passez à l'atelier." });
		expect(bon.status).toBe(201);
		expect(bon.body.message).toBe('Votre intéressement est pris en compte.');

		const second = await client()
			.post(`/api/annonces/${recherche}/interet`)
			.set(hf)
			.send({ message: 'Une seconde fois' });
		expect(second.status).toBe(400);

		const detail = await client().get(`/api/annonces/${recherche}`).set(hv);
		expect(detail.body.interets).toHaveLength(1);
		expect(detail.body.interets[0].membre.pseudonyme).toBe('fournisseur');

		const publique = await client().get(`/api/annonces/${recherche}`);
		expect(publique.body.interets).toBeNull();
		expect(publique.body.peut_manifester).toBe(true);
		expect(publique.body.peut_acheter).toBe(false);
	});
});
