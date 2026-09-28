/**
 * Comparateur de prix B2B (portage de `tests/test_comparateur.py`).
 */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { CategorieMembre, TypeMembre } from '../src/enums.js';
import {
	entreprise,
	ficheProspective,
	ligneProspective,
	produitProspective
} from '../src/schema/entreprises.js';

basePropre();

const MESSAGE = "Il faut avoir un compte entreprise pour y avoir accès.";

/** Membre personne morale + son entreprise dans l'annuaire. */
async function societe(
	identifiant: string,
	nom: string,
	options: Record<string, unknown> = {}
): Promise<[Record<string, string>, number]> {
	await creerMembre(identifiant, { categorie: CategorieMembre.MORALE, nom, ...options });
	const h = await entetes(identifiant);
	const r = await client().post('/api/entreprises').set(h).send({
		domaine_id: 1,
		nom,
		forme_juridique: 2,
		ville_id: 2,
		telephone: '061112233',
		email: `${identifiant}@exemple.cg`
	});
	expect(r.status, r.text).toBe(201);
	return [h, r.body.id];
}

function ligne(entrepriseId: number, extra: Record<string, unknown> = {}) {
	return {
		entreprise_id: entrepriseId,
		offre_ou_demande: 1,
		nouveau_produit: 'ciment  50 kg',
		unite_vente: 'Sac',
		prix: 5000,
		quantite_mensuelle: 200,
		fournisseur_ou_client: 'Dangote',
		...extra
	};
}

describe('accès', () => {
	it('est réservé aux comptes entreprise', async () => {
		await creerMembre('particulier');
		await creerMembre('morale_sans_entreprise', { categorie: CategorieMembre.MORALE });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const [hSoc] = await societe('societe', 'Kongo Matériaux');

		expect((await client().get('/api/comparateur/acces')).body).toEqual({
			acces: false,
			motif: 'visiteur',
			message: MESSAGE,
			gestionnaire: false,
			entreprises: []
		});
		const visiteur = await client().get('/api/comparateur/lignes');
		expect(visiteur.status).toBe(401);
		expect(visiteur.body.message).toBe(MESSAGE);

		const hPhysique = await entetes('particulier');
		expect((await client().get('/api/comparateur/acces').set(hPhysique)).body.motif).toBe(
			'personne_physique'
		);
		const refus = await client().get('/api/comparateur/lignes').set(hPhysique);
		expect(refus.status).toBe(403);
		expect(refus.body.message).toBe(MESSAGE);

		const hSansEnt = await entetes('morale_sans_entreprise');
		expect((await client().get('/api/comparateur/acces').set(hSansEnt)).body.motif).toBe(
			'sans_entreprise'
		);
		expect((await client().get('/api/comparateur/produits').set(hSansEnt)).status).toBe(403);

		const acces = await client().get('/api/comparateur/acces').set(hSoc);
		expect(acces.body.acces).toBe(true);
		expect(acces.body.entreprises[0].nom).toBe('Kongo Matériaux');
		expect((await client().get('/api/comparateur/lignes').set(hSoc)).status).toBe(200);

		const ha = await entetes('admin');
		expect((await client().get('/api/comparateur/acces').set(ha)).body.gestionnaire).toBe(true);
		expect((await client().get('/api/comparateur/lignes').set(ha)).status).toBe(200);
	});
});

describe('fiche', () => {
	it("est rattachée à l'entreprise et crée les produits à la volée", async () => {
		const [h, ent] = await societe('societe', 'Kongo Matériaux');

		const incomplet = await client()
			.post('/api/comparateur/lignes')
			.set(h)
			.send(ligne(ent, { nouveau_produit: '', unite_vente: ' ', prix: 0 }));
		expect(incomplet.status).toBe(400);
		expect(incomplet.body.champs).toEqual({
			produit_id: 'Veuillez indiquer le produit.',
			unite_vente: "Veuillez indiquer l'unité de vente.",
			prix: 'Veuillez indiquer le prix.'
		});

		const nomCourt = await client()
			.post('/api/comparateur/lignes')
			.set(h)
			.send(ligne(ent, { nouveau_produit: 'Ri' }));
		expect(nomCourt.status).toBe(400);
		expect(nomCourt.body.champs).toHaveProperty('nouveau_produit');

		const r = await client().post('/api/comparateur/lignes').set(h).send(ligne(ent));
		expect(r.status).toBe(201);
		expect(r.body.message).toBe('Enregistrement effectué.');

		const fiche = db.select().from(ficheProspective).get()!;
		// Corrigé : plus l'id du membre (ADR-0007 S6a).
		expect(fiche.entreprise_id).toBe(ent);
		const produit = db.select().from(produitProspective).get()!;
		// Nom normalisé : espaces réduits, première lettre en majuscule.
		expect(produit.nom).toBe('Ciment 50 kg');

		// Même produit tapé autrement : réutilisé ; même unité = doublon.
		const doublon = await client()
			.post('/api/comparateur/lignes')
			.set(h)
			.send(ligne(ent, { nouveau_produit: 'CIMENT 50 KG', unite_vente: 'sac' }));
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toContain('déjà');

		// Autre unité : acceptée.
		expect(
			(
				await client()
					.post('/api/comparateur/lignes')
					.set(h)
					.send(ligne(ent, { unite_vente: 'Tonne', prix: 98000 }))
			).status
		).toBe(201);

		// La liste l'emporte sur le texte ; une demande du même produit est une autre ligne.
		expect(
			(
				await client()
					.post('/api/comparateur/lignes')
					.set(h)
					.send(
						ligne(ent, {
							offre_ou_demande: 2,
							produit_id: produit.id,
							nouveau_produit: 'Autre chose'
						})
					)
			).status
		).toBe(201);
		expect(db.select().from(produitProspective).all()).toHaveLength(1);
		expect(db.select().from(ficheProspective).all()).toHaveLength(1);

		const maFiche = await client().get('/api/comparateur/ma-fiche').set(h);
		expect(maFiche.body.entreprise.nom).toBe('Kongo Matériaux');
		expect(maFiche.body.sigle).toBe('societe');
		expect(maFiche.body.offres).toHaveLength(2);
		expect(maFiche.body.demandes).toHaveLength(1);
		expect(maFiche.body.offres[0].produit.nom).toBe('Ciment 50 kg');
	});

	it('refuse la fiche à un membre sans entreprise', async () => {
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const r = await client()
			.get('/api/comparateur/ma-fiche')
			.set(await entetes('admin'));
		expect(r.status).toBe(400);
		expect(r.body.message).toContain('annuaire');
	});
});

describe('comparaison', () => {
	it('trie par prix et se limite aux fiches publiées', async () => {
		const [h1, e1] = await societe('societe1', 'Kongo Matériaux');
		const [h2, e2] = await societe('societe2', 'Brazza Bâtiment');
		const [h3, e3] = await societe('societe3', 'Pointe Béton');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });

		await client().post('/api/comparateur/lignes').set(h1).send(ligne(e1, { prix: 5200 }));
		await client().post('/api/comparateur/lignes').set(h2).send(ligne(e2, { prix: 4800 }));
		await client().post('/api/comparateur/lignes').set(h3).send(ligne(e3, { prix: 4500 }));
		await client()
			.post('/api/comparateur/lignes')
			.set(h2)
			.send(ligne(e2, { offre_ou_demande: 2, nouveau_produit: 'Fer à béton', prix: 7000 }));

		// L'entreprise 3 est retirée de l'annuaire par la modération : ses prix disparaissent.
		await client()
			.post(`/api/entreprises/${e3}/etat`)
			.set(await entetes('admin'))
			.send({ etat: 1 });

		const offres = await client().get('/api/comparateur/lignes?type=1').set(h1);
		expect(offres.body.total).toBe(2);
		expect(
			offres.body.items.map((li: { entreprise: { nom: string }; prix: number }) => [
				li.entreprise.nom,
				li.prix
			])
		).toEqual([
			['Brazza Bâtiment', 4800],
			['Kongo Matériaux', 5200]
		]);

		const premiere = offres.body.items[0];
		expect(premiere.produit.nom).toBe('Ciment 50 kg');
		expect(premiere.unite_vente).toBe('Sac');
		expect(premiere.quantite_mensuelle).toBe(200);
		expect(premiere.fournisseur_ou_client).toBe('Dangote');
		// Pour le bouton « Contacter ».
		expect(premiere.entreprise.telephone).toBe('061112233');

		const decroissant = await client()
			.get('/api/comparateur/lignes?type=1&tri=prix_desc')
			.set(h1);
		expect(decroissant.body.items[0].prix).toBe(5200);

		expect((await client().get('/api/comparateur/lignes?type=2').set(h1)).body.total).toBe(1);
		expect((await client().get('/api/comparateur/lignes?q=fer').set(h1)).body.total).toBe(1);
		expect(
			(await client().get(`/api/comparateur/lignes?entreprise_id=${e2}`).set(h1)).body.total
		).toBe(2);

		const produits = await client().get('/api/comparateur/produits').set(h1);
		const ciment = produits.body.find((p: { nom: string }) => p.nom === 'Ciment 50 kg');
		expect(ciment.offres).toBe(2);
		expect(ciment.demandes).toBe(0);
		expect(
			(await client().get(`/api/comparateur/lignes?produit_id=${ciment.id}`).set(h1)).body.total
		).toBe(2);
	});
});

describe('droits sur les lignes', () => {
	it('réserve écriture et suppression au propriétaire', async () => {
		const [h1, e1] = await societe('societe1', 'Kongo Matériaux');
		const [h2, e2] = await societe('societe2', 'Brazza Bâtiment');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const id = (await client().post('/api/comparateur/lignes').set(h1).send(ligne(e1))).body.id;

		// Un concurrent ne peut ni écrire sur la fiche d'un autre, ni modifier ou supprimer ses
		// lignes (corrigé : le legacy le permettait).
		expect(
			(await client().post('/api/comparateur/lignes').set(h2).send(ligne(e1, { prix: 1 }))).status
		).toBe(403);
		expect(
			(
				await client()
					.put(`/api/comparateur/lignes/${id}`)
					.set(h2)
					.send(ligne(e2, { prix: 1 }))
			).status
		).toBe(403);
		expect((await client().delete(`/api/comparateur/lignes/${id}`).set(h2)).status).toBe(403);
		expect((await client().get(`/api/comparateur/ma-fiche?entreprise_id=${e1}`).set(h2)).status).toBe(403);

		// Sa propre fiche ne montre que ses lignes (corrigé : le legacy listait celles de tout le monde).
		expect((await client().get('/api/comparateur/ma-fiche').set(h2)).body.offres).toEqual([]);

		const modif = await client()
			.put(`/api/comparateur/lignes/${id}`)
			.set(h1)
			.send(ligne(e1, { prix: 5500, unite_vente: 'Sac' }));
		expect(modif.status).toBe(200);
		expect(modif.body.message).toBe('Modification effectuée.');
		expect((await client().get('/api/comparateur/ma-fiche').set(h1)).body.offres[0].prix).toBe(5500);

		expect((await client().delete(`/api/comparateur/lignes/${id}`).set(h1)).status).toBe(200);
		// Suppression physique, comme le legacy.
		expect(db.select().from(ligneProspective).where(eq(ligneProspective.id, id)).get()).toBeUndefined();

		// Le gestionnaire habilité gère la fiche de n'importe quelle entreprise.
		const id2 = (await client().post('/api/comparateur/lignes').set(h1).send(ligne(e1))).body.id;
		const ha = await entetes('admin');
		expect((await client().get(`/api/comparateur/ma-fiche?entreprise_id=${e1}`).set(ha)).status).toBe(200);
		expect((await client().delete(`/api/comparateur/lignes/${id2}`).set(ha)).status).toBe(200);
	});
});

describe('catalogue', () => {
	it('est géré par les gestionnaires habilités', async () => {
		const [h, ent] = await societe('societe', 'Kongo Matériaux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const ha = await entetes('admin');

		expect((await client().post('/api/comparateur/produits').set(h).send({ nom: 'Sucre' })).status).toBe(403);
		expect(
			(
				await client()
					.post('/api/comparateur/produits')
					.set(await entetes('admin_sans_droit'))
					.send({ nom: 'Sucre' })
			).status
		).toBe(403);

		const r = await client()
			.post('/api/comparateur/produits')
			.set(ha)
			.send({ nom: 'sucre en poudre' });
		expect(r.status).toBe(201);
		const pid = r.body.id;

		const doublon = await client()
			.post('/api/comparateur/produits')
			.set(ha)
			.send({ nom: 'Sucre en Poudre' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce produit est déjà enregistré.');
		expect((await client().post('/api/comparateur/produits').set(ha).send({ nom: 'Su' })).status).toBe(400);

		await client()
			.post('/api/comparateur/lignes')
			.set(h)
			.send(ligne(ent, { produit_id: pid, nouveau_produit: '' }));
		expect((await client().get('/api/comparateur/lignes').set(h)).body.total).toBe(1);

		// Un produit retiré disparaît du comparateur et ne peut plus être choisi.
		const retrait = await client()
			.put(`/api/comparateur/produits/${pid}`)
			.set(ha)
			.send({ nom: 'Sucre en poudre', etat: 3 });
		expect(retrait.status).toBe(200);
		expect((await client().get('/api/comparateur/lignes').set(h)).body.total).toBe(0);
		expect((await client().get('/api/comparateur/produits').set(h)).body).toEqual([]);
		expect((await client().get('/api/comparateur/produits?tous=true').set(ha)).body).toHaveLength(1);
		expect(
			(
				await client()
					.post('/api/comparateur/lignes')
					.set(h)
					.send(ligne(ent, { produit_id: pid, unite_vente: 'kg' }))
			).status
		).toBe(400);
	});
});

describe('e-mail à l’entreprise', () => {
	it('est réservé aux gestionnaires et vérifie l’adresse', async () => {
		const [h, ent] = await societe('societe', 'Kongo Matériaux');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const ha = await entetes('admin');
		const chemin = `/api/comparateur/entreprises/${ent}/email`;
		const message = 'Bonjour, nous avons un client pour votre ciment.';

		expect((await client().post(chemin).set(h).send({ message })).status).toBe(403);

		const court = await client().post(chemin).set(ha).send({ message: 'Trop cour' });
		expect(court.status).toBe(400);
		expect(court.body.message).toBe('Le message doit avoir 10 caractères minimum.');

		const r = await client().post(chemin).set(ha).send({ message });
		expect(r.status).toBe(200);
		expect(r.body.message).toBe('Votre opération a bien été envoyée.');

		// Sans adresse ni sur l'entreprise ni sur son propriétaire : refusé.
		db.update(entreprise).set({ email: '' }).where(eq(entreprise.id, ent)).run();
		const sansAdresse = await client().post(chemin).set(ha).send({ message });
		expect(sansAdresse.status).toBe(400);
		expect(sansAdresse.body.message).toBe("Veuillez vérifier l'adresse mail de l'entreprise.");
	});
});
