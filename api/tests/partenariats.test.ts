/**
 * Partenariat & troc (portage de `tests/test_partenariats.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const FICHE = {
	actif: '120 hectares de manioc',
	description: 'Manioc à maturité, route praticable',
	recherche: 'Partenaire avec une unité de transformation',
	objectif: 'Produire de la pâte de manioc'
};

describe('création', () => {
	it('applique les règles, la référence et refuse les doublons', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');

		const court = await client()
			.post('/api/partenariats')
			.set(h)
			.send({ ...FICHE, actif: 'Toit' });
		expect(court.status).toBe(400);
		expect(court.body.champs.actif).toBe("Veuillez saisir l'actif avec 5 caractères minimum.");

		const r = await client().post('/api/partenariats').set(h).send(FICHE);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^PTR/);
		expect(r.body.message).toBe('Votre recherche de partenariat & troc a bien été enregistrée.');

		// Doublon détecté sans tenir compte de la casse ni des espaces de bord.
		const doublon = await client()
			.post('/api/partenariats')
			.set(h)
			.send({ ...FICHE, actif: '120 HECTARES de manioc ' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe(
			'Cette recherche de partenariat & troc est déjà enregistrée.'
		);

		// Réservé aux membres : ni gestionnaire, ni visiteur.
		expect(
			(
				await client()
					.post('/api/partenariats')
					.set(await entetes('admin'))
					.send(FICHE)
			).status
		).toBe(403);
		expect((await client().post('/api/partenariats').send(FICHE)).status).toBe(401);
	});
});

describe('liste publique', () => {
	it('recherche, compte et respecte la visibilité', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');

		const id = (await client().post('/api/partenariats').set(h).send(FICHE)).body.id;
		await client().post('/api/partenariats').set(h).send({
			actif: 'Un local commercial',
			recherche: 'Des associés',
			objectif: 'Ouvrir une boutique'
		});

		const publique = await client().get('/api/partenariats');
		expect(publique.body.total).toBe(2);
		// Tri par date décroissante : la plus récente en tête.
		expect(publique.body.items[0].actif).toBe('Un local commercial');
		expect(publique.body.items[0].auteur.pseudonyme).toBe('awa');

		expect((await client().get('/api/partenariats?q=transformation')).body.total).toBe(1);
		expect((await client().get('/api/partenariats?q=boutique')).body.total).toBe(1);
		expect((await client().get('/api/partenariats/compteur')).body).toEqual({ publies: 2 });

		await client()
			.post(`/api/partenariats/${id}/etat`)
			.set(await entetes('admin'))
			.send({ etat: 1 });

		expect((await client().get('/api/partenariats')).body.total).toBe(1);
		expect((await client().get(`/api/partenariats/${id}`)).status).toBe(404);
		// L'auteur voit toujours la sienne.
		expect((await client().get('/api/partenariats').set(h)).body.total).toBe(2);
		expect((await client().get('/api/partenariats/compteur')).body).toEqual({ publies: 1 });
	});
});

describe('modification', () => {
	it("est réservée à l'auteur", async () => {
		await creerMembre('awa');
		await creerMembre('bob');
		const ha = await entetes('awa');
		const hb = await entetes('bob');
		const id = (await client().post('/api/partenariats').set(ha).send(FICHE)).body.id;

		expect((await client().put(`/api/partenariats/${id}`).set(hb).send(FICHE)).status).toBe(403);
		expect((await client().delete(`/api/partenariats/${id}`).set(hb)).status).toBe(403);

		const vuParBob = await client().get(`/api/partenariats/${id}`).set(hb);
		expect(vuParBob.body.peut_modifier).toBe(false);
		expect(vuParBob.body.interets).toBeNull();

		const modif = await client()
			.put(`/api/partenariats/${id}`)
			.set(ha)
			.send({ ...FICHE, objectif: 'Exporter' });
		expect(modif.status).toBe(200);
		expect((await client().get(`/api/partenariats/${id}`).set(ha)).body.objectif).toBe('Exporter');

		expect((await client().delete(`/api/partenariats/${id}`).set(ha)).status).toBe(200);
		expect((await client().get('/api/partenariats')).body.total).toBe(0);
	});
});

describe('intéressement', () => {
	it("est unique, notifie l'auteur et reste confidentiel", async () => {
		await creerMembre('awa');
		await creerMembre('bob', { nom: 'Bob Nkouka', telephone: '055123456' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const ha = await entetes('awa');
		const hb = await entetes('bob');
		const id = (await client().post('/api/partenariats').set(ha).send(FICHE)).body.id;

		const court = await client()
			.post(`/api/partenariats/${id}/interet`)
			.set(hb)
			.send({ message: 'ok' });
		expect(court.status).toBe(400);
		expect(court.body.champs.message).toBe("L'intéressement doit avoir 5 caractères minimum.");

		const bon = await client()
			.post(`/api/partenariats/${id}/interet`)
			.set(hb)
			.send({ message: "J'ai une presse à manioc" });
		expect(bon.status).toBe(201);
		expect(bon.body.message).toBe('Votre intéressement est pris en compte.');

		expect(
			(
				await client()
					.post(`/api/partenariats/${id}/interet`)
					.set(hb)
					.send({ message: 'Encore moi !' })
			).status
		).toBe(400);
		expect((await client().get(`/api/partenariats/${id}`).set(hb)).body.mon_interet).toBe(true);

		// Ni sur sa propre fiche, ni par un gestionnaire.
		expect(
			(await client().post(`/api/partenariats/${id}/interet`).set(ha).send({ message: 'Moi-même' }))
				.status
		).toBe(400);
		expect(
			(
				await client()
					.post(`/api/partenariats/${id}/interet`)
					.set(await entetes('admin'))
					.send({ message: 'Gestion' })
			).status
		).toBe(403);

		// L'auteur voit l'intéressement avec les coordonnées et a reçu un message.
		const detail = await client().get(`/api/partenariats/${id}`).set(ha);
		expect(detail.body.nombre_interets).toBe(1);
		expect(detail.body.interets[0].membre.telephone).toBe('055123456');
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);

		// Le public ne voit que le nombre.
		const publique = await client().get(`/api/partenariats/${id}`);
		expect(publique.body.interets).toBeNull();
		expect(publique.body.nombre_interets).toBe(1);
	});
});
