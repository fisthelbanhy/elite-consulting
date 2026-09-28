/**
 * Parcours « Devenir distributeur » (portage de `tests/test_distributeur.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { Etat, TypeMembre } from '../src/enums.js';
import { produit } from '../src/schema/commerce.js';

basePropre();

function produits() {
	db.insert(produit)
		.values([
			// id > 25 : le legacy n'enregistrait jamais ces produits dans le kit (ADR-0007 S5b).
			{
				id: 30,
				reference: '470',
				nom: 'Pack Aloe',
				groupe: 4,
				prix_distributeur: 28_000,
				prix_public: 40_000,
				quantite_stock: 10
			},
			{
				id: 31,
				reference: '015',
				nom: 'Aloe Vera Gel',
				groupe: 1,
				prix_distributeur: 10_000,
				prix_public: 15_000,
				quantite_stock: 10
			},
			{
				id: 32,
				reference: '999',
				nom: 'Ancien produit',
				groupe: 1,
				prix_distributeur: 5_000,
				etat: Etat.SUPPRIME
			}
		])
		.run();
}

function etape(h: Record<string, string>, donnees: Record<string, unknown>) {
	return client().put('/api/distributeur/souscription').set(h).send(donnees);
}

describe('assistant', () => {
	it('sauvegarde chaque étape et reprend où le membre s’était arrêté', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		expect((await client().get('/api/distributeur/souscription').set(h)).body).toBeNull();

		const r = await etape(h, { etape: 1, objectifs: 'Payer les études des enfants' });
		expect(r.status).toBe(200);
		expect(r.body.reference).toMatch(/^SOA/);
		expect(r.body.etape_courante).toBe(2);

		await etape(h, { etape: 2, mon_histoire: 'Je me lance' });
		await etape(h, { etape: 3, disponibilite_hebdo: 2 });

		await etape(h, {
			etape: 4,
			prospects: [
				{ nom_prenom: 'Grace Mabiala', telephone: '061234567' },
				{ nom_prenom: 'Jo', email: 'jo@x.cg' }
			],
			date_limite_complement: '2026-10-15'
		});
		let s = (await client().get('/api/distributeur/souscription').set(h)).body;
		// Règle legacy : seuls les noms de plus de 5 caractères sont enregistrés.
		expect(s.prospects.map((p: { nom_prenom: string }) => p.nom_prenom)).toEqual(['Grace Mabiala']);
		expect(s.date_limite_complement).toBe('2026-10-15');

		// Correctif : une nouvelle sauvegarde met la liste à jour (modification + retrait).
		await etape(h, {
			etape: 4,
			prospects: [{ nom_prenom: 'Grace Mabiala', telephone: '055000111' }]
		});
		s = (await client().get('/api/distributeur/souscription').set(h)).body;
		expect(s.prospects).toHaveLength(1);
		expect(s.prospects[0].telephone).toBe('055000111');

		const heure = '18 h 30, après le travail'; // plus de troncature à 8 caractères
		await etape(h, {
			etape: 5,
			formations: [{ prestation: 2, date: '2026-10-20', lieu: 'Bacongo', heure }]
		});
		// « Précédent » : sauvegarde sans faire avancer la progression.
		await etape(h, { etape: 7, nombre_rdv: 4, avancer: false });
		s = (await client().get('/api/distributeur/souscription').set(h)).body;
		expect(s.etape_courante).toBe(6);
		expect(s.nombre_rdv).toBe(4);
		expect(s.formations).toHaveLength(4);
		expect(s.formations[1]).toEqual({
			prestation: 2,
			date: '2026-10-20',
			lieu: 'Bacongo',
			heure
		});
		expect(s.objectifs).toBe('Payer les études des enfants');
		expect(s.mon_histoire).toBe('Je me lance');
		expect(s.disponibilite_hebdo).toBe(2);

		await etape(h, { etape: 8, filleuls: [{ nom: 'Mireille', montant: 150_000 }] });
		s = (await client().get('/api/distributeur/souscription').set(h)).body;
		expect(s.filleuls[0].montant).toBe(150_000);
		expect(s.etape_courante).toBe(9);
	});
});

describe('commande du kit', () => {
	it('cumule les contrôles à l’envoi et sauvegarde sans contrôle', async () => {
		produits();
		await creerMembre('awa');
		const h = await entetes('awa');

		const r = await etape(h, {
			etape: 9,
			produits: [{ produit_id: 31, quantite: 1 }],
			envoyer: true
		});
		expect(r.status).toBe(400);
		expect(r.body.champs.mode_souscription).toBe('Veuillez indiquer le mode de souscription.');
		expect(r.body.champs.produits).toBe(
			'Le montant de souscription ne peut être inférieur à 56 000 FCFA.'
		);

		const credit = await etape(h, {
			etape: 9,
			mode_souscription: 2,
			produits: [{ produit_id: 30, quantite: 3 }],
			envoyer: true
		});
		expect(credit.body.champs.produits).toBe(
			'Pour une souscription à crédit le montant ne peut être supérieur à 66 000 FCFA.'
		);

		// « Sauvegarder » : aucun contrôle ; montant recalculé côté serveur.
		const sauve = await etape(h, { etape: 9, produits: [{ produit_id: 31, quantite: 1 }] });
		expect(sauve.status).toBe(200);
		expect(sauve.body.message).toBe('Opération effectuée.');
		expect(sauve.body.montant).toBe(10_000);

		// Produit retiré refusé.
		expect((await etape(h, { etape: 9, produits: [{ produit_id: 32, quantite: 1 }] })).status).toBe(
			400
		);

		const kit = (await client().get('/api/distributeur/kit').set(h)).body;
		// Tous les produits actifs, triés par nom.
		expect(kit.map((p: { id: number }) => p.id)).toEqual([31, 30]);
	});
});

describe('fonds propres', () => {
	it('rend distributeur après paiement, et le rejet de la caisse annule', async () => {
		produits();
		await creerMembre('awa');
		await creerMembre('caisse', { type_compte: TypeMembre.GESTIONNAIRE, droit_caisse: true });
		const h = await entetes('awa');

		// Payer avant d'envoyer : refusé.
		await etape(h, { etape: 9, mode_souscription: 1, produits: [{ produit_id: 30, quantite: 2 }] });
		const sid = (await client().get('/api/distributeur/souscription').set(h)).body.id;
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(h)
					.send({ type_objet: 6, objet_id: sid, mode: 1 })
			).status
		).toBe(400);

		const envoi = await etape(h, {
			etape: 9,
			mode_souscription: 1,
			produits: [{ produit_id: 30, quantite: 2 }],
			envoyer: true
		});
		expect(envoi.status).toBe(200);
		expect(envoi.body.a_payer).toBe(true);
		expect(envoi.body.etape_courante).toBe(10);

		const prep = (
			await client().get(`/api/paiements/preparer?type_objet=6&objet_id=${sid}`).set(h)
		).body;
		expect(prep.montant).toBe(56_000);
		expect(prep.retour).toBe('/devenir-distributeur/adhesion');

		const paiement = await client()
			.post('/api/paiements')
			.set(h)
			.send({ type_objet: 6, objet_id: sid, mode: 1 });
		expect(paiement.status).toBe(201);

		const s = (await client().get('/api/distributeur/souscription').set(h)).body;
		expect(s.etat).toBe(2);
		expect(s.etat_paiement).toBe(2);
		expect(s.kit[0].montant).toBe(56_000);
		expect((await client().get('/api/distributeur/statut').set(h)).body.distributeur).toBe(true);

		// Kit verrouillé, second paiement refusé.
		expect(
			(
				await etape(h, {
					etape: 9,
					mode_souscription: 1,
					produits: [{ produit_id: 30, quantite: 3 }]
				})
			).status
		).toBe(400);
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(h)
					.send({ type_objet: 6, objet_id: sid, mode: 1 })
			).status
		).toBe(400);

		// Rejet par la caisse : la souscription redevient « Non traitée ».
		expect(
			(
				await client()
					.post(`/api/paiements/${paiement.body.id}/rejeter`)
					.set(await entetes('caisse'))
			).status
		).toBe(200);
		expect((await client().get('/api/distributeur/statut').set(h)).body.distributeur).toBe(false);
	});
});

describe('crédit', () => {
	it('est suivi par les gestionnaires, sans paiement en ligne', async () => {
		produits();
		await creerMembre('awa', { nom: 'Awa Mabiala', telephone: '061234567' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');

		const r = await etape(h, {
			etape: 9,
			mode_souscription: 2,
			produits: [{ produit_id: 30, quantite: 2 }],
			envoyer: true
		});
		expect(r.status).toBe(200);
		expect(r.body.a_payer).toBe(false);
		expect(r.body.message).toContain('crédit');
		const sid = r.body.id;

		// Pas de paiement en ligne pour un crédit.
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(h)
					.send({ type_objet: 6, objet_id: sid, mode: 1 })
			).status
		).toBe(400);

		// La frangine est prévenue dans la messagerie du membre.
		const ha = await entetes('admin');
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);

		expect((await client().get('/api/distributeur/souscriptions').set(h)).status).toBe(403);
		const suivi = (
			await client().get('/api/distributeur/souscriptions?mode=2&envoyees=true').set(ha)
		).body;
		expect(suivi.total).toBe(1);
		expect(suivi.items[0].etat).toBe(1);
		expect(suivi.items[0].envoyee).toBe(true);
		expect(suivi.items[0].membre.telephone).toBe('061234567');
		expect(
			(await client().get('/api/distributeur/souscriptions?q=mabiala').set(ha)).body.total
		).toBe(1);
		expect(
			(await client().get(`/api/distributeur/souscriptions/${sid}`).set(ha)).body.kit[0].quantite
		).toBe(2);

		const refus = await client()
			.post(`/api/distributeur/souscriptions/${sid}/etat`)
			.set(await entetes('admin_sans_droit'))
			.send({ etat: 2 });
		expect(refus.status).toBe(403);
		expect(
			(await client().post(`/api/distributeur/souscriptions/${sid}/etat`).set(ha).send({ etat: 2 }))
				.status
		).toBe(200);
		expect((await client().get('/api/distributeur/statut').set(h)).body.distributeur).toBe(true);
	});
});

describe('accès', () => {
	it('réserve l’adhésion aux membres', async () => {
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('awa');
		await creerMembre('curieux');

		expect((await client().put('/api/distributeur/souscription').send({ etape: 1 })).status).toBe(
			401
		);
		expect((await client().get('/api/distributeur/statut')).body).toEqual({
			connecte: false,
			gestionnaire: false,
			distributeur: false,
			souscription: null
		});
		expect((await etape(await entetes('admin'), { etape: 1, objectifs: 'x' })).status).toBe(403);

		const sid = (await etape(await entetes('awa'), { etape: 1 })).body.id;
		expect(
			(
				await client()
					.get(`/api/distributeur/souscriptions/${sid}`)
					.set(await entetes('curieux'))
			).status
		).toBe(404);
	});
});
