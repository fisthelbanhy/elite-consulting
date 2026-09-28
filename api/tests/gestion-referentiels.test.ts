/**
 * Référentiels, paramètres du site et journaux (portage de `tests/test_gestion_referentiels.py` ;
 * F-ADM-01 à F-ADM-04, F-ADM-16 à F-ADM-33).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { visite } from '../src/schema/core.js';
import { visiteMembre } from '../src/schema/membres.js';

basePropre();

const G = TypeMembre.GESTIONNAIRE;
const R = '/api/gestion/referentiels';

async function admin(droits: Record<string, unknown> = {}) {
	await creerMembre('systeme', { type_compte: G });
	await creerMembre('admin', {
		type_compte: G,
		...(Object.keys(droits).length ? droits : { droit_activation: true, droit_attribution: true })
	});
	return entetes('admin');
}

describe('villes et quartiers', () => {
	it("refuse les doublons et la suppression d'une ville utilisée (F-ADM-16/17)", async () => {
		const h = await admin();

		const court = await client().post(`${R}/villes`).set(h).send({ nom: 'Oyo' });
		expect(court.status).toBe(400);
		expect(court.body.champs.nom).toContain('4 caractères');
		expect(
			(await client().post(`${R}/villes`).set(h).send({ nom: 'brazzaville' })).body.message
		).toBe('Cette ville est déjà enregistrée.');

		const id = (await client().post(`${R}/villes`).set(h).send({ nom: 'Dolisie' })).body.id;
		expect(
			(await client().put(`${R}/villes/${id}`).set(h).send({ nom: 'Dolisie-Centre' })).status
		).toBe(200);

		const sansVille = await client().post(`${R}/quartiers`).set(h).send({ nom: 'Tié-Tié' });
		expect(sansVille.body.champs).toHaveProperty('ville_id');

		// Même nom, autre ville : accepté.
		const q = await client().post(`${R}/quartiers`).set(h).send({ ville_id: id, nom: 'Bacongo' });
		expect(q.status).toBe(201);
		expect(
			(await client().post(`${R}/quartiers`).set(h).send({ ville_id: 2, nom: 'BACONGO' })).status
		).toBe(400);
		expect((await client().get(`${R}/quartiers?ville_id=${id}`).set(h)).body.total).toBe(1);

		// Suppression physique refusée tant que la ville est utilisée.
		const refus = await client().delete(`${R}/villes/${id}`).set(h);
		expect(refus.status).toBe(400);
		expect(refus.body.message).toContain('quartier');
		expect((await client().delete(`${R}/quartiers/${q.body.id}`).set(h)).status).toBe(200);
		expect((await client().delete(`${R}/villes/${id}`).set(h)).status).toBe(200);

		const villes = (await client().get(`${R}/villes`).set(h)).body;
		expect(villes.total).toBe(2);
		expect(villes.items[0].nombre_quartiers).toBe(1);
	});
});

describe('secteurs, domaines, diplômes et familles', () => {
	it('lie chaque domaine à un secteur et supprime logiquement (F-ADM-18 à F-ADM-21)', async () => {
		const h = await admin();

		// Correctif F-ADM-20 : plus de secteur n° 1 par défaut.
		const sansSecteur = await client()
			.post(`${R}/domaines`)
			.set(h)
			.send({ libelle: 'Agriculture vivrière' });
		expect(sansSecteur.status).toBe(400);
		expect(sansSecteur.body.champs.secteur_id).toContain('secteur');

		const sid = (
			await client().post(`${R}/secteurs`).set(h).send({ libelle: 'Agriculture', etat: 2 })
		).body.id;
		const did = (
			await client().post(`${R}/domaines`).set(h).send({ secteur_id: sid, libelle: 'Maraîchage' })
		).body.id;
		expect(
			(await client().post(`${R}/domaines`).set(h).send({ secteur_id: sid, libelle: 'maraîchage' }))
				.status
		).toBe(400);

		// Suppression logique : disparaît des listes publiques.
		expect((await client().delete(`${R}/domaines/${did}`).set(h)).status).toBe(200);
		const publics = (await client().get('/api/referentiels/secteurs')).body;
		expect(publics.find((s: { id: number }) => s.id === sid).domaines).toEqual([]);
		expect((await client().get(`${R}/domaines/${did}`).set(h)).body.etat).toBe(3);

		const d = await client()
			.post(`${R}/diplomes`)
			.set(h)
			.send({ code: 'bts', libelle: 'Brevet de technicien supérieur' });
		expect((await client().get(`${R}/diplomes/${d.body.id}`).set(h)).body.code).toBe('BTS');
		expect((await client().post(`${R}/diplomes`).set(h).send({ libelle: 'BTS' })).status).toBe(400);

		await client().post(`${R}/familles`).set(h).send({ libelle: 'Électroménager' });
		const famille = await client().post(`${R}/familles`).set(h).send({ libelle: 'électroménager' });
		expect(famille.body.message).toBe("Cette famille d'article est déjà enregistrée.");
	});
});

describe('produits et fiches bien-être', () => {
	it('ordonne les conseils sans limite à cinq (F-ADM-23/26)', async () => {
		const h = await admin();
		const p = {
			groupe: 1,
			reference: '015',
			nom: 'Aloe Vera Gel',
			prix_distributeur: 15000,
			prix_public: 20000,
			quantite_stock: 12
		};
		const ids: number[] = [];
		for (let i = 0; i < 6; i++) {
			ids.push(
				(
					await client()
						.post(`${R}/produits`)
						.set(h)
						.send({ ...p, nom: `Produit ${i}` })
				).body.id
			);
		}
		expect(
			(
				await client()
					.post(`${R}/produits`)
					.set(h)
					.send({ ...p, nom: 'Produit 1' })
			).body.message
		).toBe('Ce produit est déjà enregistré.');
		expect(
			(
				await client()
					.post(`${R}/produits`)
					.set(h)
					.send({ ...p, nom: 'Produit 1', groupe: 2 })
			).status
		).toBe(201);
		expect(
			(
				await client()
					.post(`${R}/produits`)
					.set(h)
					.send({ ...p, groupe: 100 })
			).status
		).toBe(400);
		expect((await client().get(`${R}/produits?prix_public_max=19999`).set(h)).body.total).toBe(0);
		expect((await client().get(`${R}/produits?groupe=2&q=produit`).set(h)).body.total).toBe(1);

		// Conseils d'utilisation : liste ordonnée, plus de 5 produits (F-ADM-23).
		const inverses = [...ids].reverse();
		const conseils = inverses.map((id, n) => ({
			produit_id: id,
			posologie: `${n + 1} fois par jour`
		}));
		const r = await client()
			.post(`${R}/maladies`)
			.set(h)
			.send({ libelle: 'Fatigue', produits: conseils });
		expect(r.status).toBe(201);
		const mid = r.body.id;

		const fiche = (await client().get(`${R}/maladies/${mid}`).set(h)).body;
		expect(fiche.produits.map((x: { produit_id: number }) => x.produit_id)).toEqual(inverses);
		expect(fiche.nombre_produits).toBe(6);

		const doublon = await client()
			.put(`${R}/maladies/${mid}`)
			.set(h)
			.send({ libelle: 'Fatigue', produits: [conseils[0], conseils[0]] });
		expect(doublon.status).toBe(400);
		expect(doublon.body.champs).toHaveProperty('produits.1.produit_id');

		await client()
			.put(`${R}/maladies/${mid}`)
			.set(h)
			.send({ libelle: 'Fatigue', produits: conseils.slice(0, 2) });
		expect((await client().get(`${R}/maladies/${mid}`).set(h)).body.produits).toHaveLength(2);
		expect(
			(await client().post(`${R}/maladies`).set(h).send({ libelle: 'fatigue' })).body.message
		).toBe('Cette maladie est déjà enregistrée.');
	});
});

describe('comparateur, banques et sommaire', () => {
	it('supprime logiquement une banque et recompte le sommaire (F-ADM-28/29)', async () => {
		const h = await admin();
		expect(
			(await client().post(`${R}/produits-comparateur`).set(h).send({ nom: 'Riz' })).status
		).toBe(400);
		expect(
			(await client().post(`${R}/produits-comparateur`).set(h).send({ nom: 'Ciment 50 kg' })).status
		).toBe(201);

		const b = await client()
			.post(`${R}/banques`)
			.set(h)
			.send({ sigle: 'bgfi', nom: 'BGFI Bank Congo' });
		expect(b.status).toBe(201);
		expect(
			(await client().post(`${R}/banques`).set(h).send({ sigle: 'BGFI', nom: 'bgfi bank congo' }))
				.status
		).toBe(400);
		expect((await client().get(`${R}/banques/${b.body.id}`).set(h)).body.sigle).toBe('BGFI');

		await client().delete(`${R}/banques/${b.body.id}`).set(h);
		expect((await client().get('/api/referentiels/banques')).body).toEqual([]);

		const sommaire = Object.fromEntries(
			(await client().get(R).set(h)).body.map((x: { cle: string; total: number }) => [
				x.cle,
				x.total
			])
		);
		expect(sommaire.villes).toBe(2);
		expect(sommaire.banques).toBe(0);
		expect(sommaire['produits-comparateur']).toBe(1);
	});
});

describe('paramètres du site', () => {
	it('enregistre tous les champs et valide chaque téléphone (F-ADM-02/04)', async () => {
		const h = await admin();
		const params = (await client().get('/api/gestion/parametres').set(h)).body;

		const mauvais = await client()
			.put('/api/gestion/parametres')
			.set(h)
			.send({ ...params, telephone_1: '0712' });
		expect(mauvais.status).toBe(422);
		expect(mauvais.body.champs.telephone_1).toContain('téléphone 1');

		const corps = {
			...params,
			nom_site: 'La Frangine Congo',
			whatsapp: '06 569 77 97',
			module_sante_actif: false,
			description_section_2: 'Emplois au Congo'
		};
		expect((await client().put('/api/gestion/parametres').set(h).send(corps)).status).toBe(200);

		const public_ = (await client().get('/api/referentiels/parametres')).body;
		expect(public_.nom_site).toBe('La Frangine Congo');
		expect(public_.whatsapp).toBe('065697797');
		expect(public_.module_sante_actif).toBe(false);
		expect(public_.description_section_2).toBe('Emplois au Congo');

		expect(
			(
				await client()
					.put('/api/gestion/parametres')
					.set(h)
					.send({ ...corps, nom_site: ' ' })
			).status
		).toBe(400);
	});
});

describe('journaux', () => {
	it('filtre par période et par plage horaire, puis purge (F-ADM-30 à F-ADM-33)', async () => {
		const h = await admin();
		const membre = await creerMembre('visiteur');
		const maintenant = new Date();
		const hier = new Date(
			maintenant.getFullYear(),
			maintenant.getMonth(),
			maintenant.getDate() - 1
		);
		const a = (heures: number, minutes = 0, joursAvant = 0) =>
			new Date(hier.getFullYear(), hier.getMonth(), hier.getDate() - joursAvant, heures, minutes);

		db.insert(visite)
			.values([
				{ adresse_ip: '10.0.0.1', date_heure: a(8, 15) },
				{ adresse_ip: '10.0.0.2', date_heure: a(23, 30) },
				{ adresse_ip: '192.168.1.9', date_heure: a(12, 0, 40), membre_id: membre }
			])
			.run();
		db.insert(visiteMembre)
			.values({ membre_id: membre, adresse_ip: '10.0.0.1', date_connexion: a(9) })
			.run();

		const V = '/api/gestion/journaux/visites';
		expect((await client().get(V).set(h)).body.total).toBe(3);

		const deux = (n: number) => String(n).padStart(2, '0');
		const j = `${hier.getFullYear()}-${deux(hier.getMonth() + 1)}-${deux(hier.getDate())}`;
		// Correctif F-ADM-32 : le filtre par période fonctionne.
		expect((await client().get(`${V}?du=${j}&au=${j}`).set(h)).body.total).toBe(2);
		expect((await client().get(`${V}?heure_debut=08:00&heure_fin=09:00`).set(h)).body.total).toBe(
			1
		);
		// Plage qui passe minuit.
		expect((await client().get(`${V}?heure_debut=22:00&heure_fin=06:00`).set(h)).body.total).toBe(
			1
		);
		expect((await client().get(`${V}?ip=192.168`).set(h)).body.items[0].membre.pseudonyme).toBe(
			'visiteur'
		);
		expect((await client().get(`${V}?heure_debut=25:00`).set(h)).status).toBe(400);
		expect((await client().get(`${V}?du=${j}&au=2000-01-01`).set(h)).status).toBe(400);

		const c = (await client().get(`/api/gestion/journaux/connexions?membre_id=${membre}`).set(h))
			.body;
		expect(c.total).toBe(1);
		expect(c.items[0].membre.pseudonyme).toBe('visiteur');

		// Purge : droit Activation, lignes cochées ou antérieures à une date.
		await creerMembre('lecteur', { type_compte: G });
		const ids = (await client().get(`${V}?ip=10.0.0`).set(h)).body.items.map(
			(x: { id: number }) => x.id
		);
		expect(
			(
				await client()
					.post('/api/gestion/journaux/visites/purger')
					.set(await entetes('lecteur'))
					.send({ ids })
			).status
		).toBe(403);
		expect(
			(await client().post('/api/gestion/journaux/visites/purger').set(h).send({ ids })).body
				.message
		).toBe('2 lignes supprimées.');

		const avant = new Date(
			maintenant.getFullYear(),
			maintenant.getMonth(),
			maintenant.getDate() - 30
		);
		const avantIso = `${avant.getFullYear()}-${deux(avant.getMonth() + 1)}-${deux(avant.getDate())}`;
		expect(
			(await client().post('/api/gestion/journaux/visites/purger').set(h).send({ avant: avantIso }))
				.body.message
		).toBe('1 ligne supprimée.');
		expect(
			(await client().post('/api/gestion/journaux/visites/purger').set(h).send({})).status
		).toBe(400);
	});
});
