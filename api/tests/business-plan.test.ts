/**
 * Business plan « auto-diagnostic » (portage de `tests/test_business_plan.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

const FICHE = {
	type_activite: 'Agribusiness',
	description_projet: 'Transformation du manioc en foufou et en chikwangue',
	ambition: 'Livrer les supermarchés de Brazzaville',
	niveau_realisation: 40
};

describe('validation', () => {
	it('reprend les règles et les messages du legacy', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const court = await client()
			.post('/api/business-plan')
			.set(h)
			.send({ type_activite: 'Agr', description_projet: 'court' });
		expect(court.status).toBe(400);
		expect(court.body.champs).toEqual({
			type_activite: "Veuillez indiquer le type d'activité avec 5 caractères minimum.",
			description_projet: 'Veuillez décrire votre projet avec 10 caractères minimum.'
		});

		expect(
			(
				await client()
					.post('/api/business-plan')
					.set(h)
					.send({ ...FICHE, niveau_realisation: 120 })
			).status
		).toBe(422);
	});
});

describe('brouillon puis envoi', () => {
	it('distingue « Sauvegarder » et « Envoyer »', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');

		const r = await client().post('/api/business-plan').set(h).send(FICHE);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^BSP/);
		expect(r.body.message).toBe('Enregistrement effectué.');
		const id = r.body.id;

		const mien = await client().get('/api/business-plan/mien').set(h);
		expect(mien.body.etat).toBe(1);
		expect(mien.body.niveau_realisation).toBe(40);
		expect(mien.body.peut_modifier).toBe(true);

		// Une seule fiche par membre.
		const seconde = await client().post('/api/business-plan').set(h).send(FICHE);
		expect(seconde.status).toBe(400);
		expect(seconde.body.message).toBe('La fiche de business plan du membre est déjà enregistrée.');

		const envoi = await client()
			.put(`/api/business-plan/${id}`)
			.set(h)
			.send({ ...FICHE, apport_prevu: '500 000 FCFA', envoyer: true });
		expect(envoi.status).toBe(200);
		expect(envoi.body.message).toContain('envoyé');
		expect((await client().get(`/api/business-plan/${id}`).set(h)).body.etat).toBe(2);

		// La frangine est prévenue.
		const compteurs = await client()
			.get('/api/espace/compteurs')
			.set(await entetes('admin'));
		expect(compteurs.body.messages_non_lus).toBe(1);

		// « Sauvegarder » ne retire pas une fiche déjà envoyée.
		await client().put(`/api/business-plan/${id}`).set(h).send(FICHE);
		expect((await client().get(`/api/business-plan/${id}`).set(h)).body.etat).toBe(2);
	});
});

describe('visibilité et droits', () => {
	it('cloisonne les fiches et réserve la modération', async () => {
		await creerMembre('awa');
		await creerMembre('bob');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });

		const id = (
			await client()
				.post('/api/business-plan')
				.set(await entetes('awa'))
				.send({ ...FICHE, envoyer: true })
		).body.id;
		await client()
			.post('/api/business-plan')
			.set(await entetes('bob'))
			.send({ ...FICHE, description_projet: 'Salon de coiffure à Moungali' });

		// Invisible des visiteurs.
		expect((await client().get('/api/business-plan')).status).toBe(401);

		const hb = await entetes('bob');
		// Le sien seulement.
		expect((await client().get('/api/business-plan').set(hb)).body.total).toBe(1);
		expect((await client().get(`/api/business-plan/${id}`).set(hb)).status).toBe(404);
		expect((await client().put(`/api/business-plan/${id}`).set(hb).send(FICHE)).status).toBe(404);

		const ha = await entetes('admin');
		const tout = await client().get('/api/business-plan').set(ha);
		expect(tout.body.total).toBe(2);
		expect(['awa', 'bob']).toContain(tout.body.items[0].membre.pseudonyme);
		expect((await client().get('/api/business-plan?q=coiffure').set(ha)).body.total).toBe(1);

		// Le gestionnaire ne crée pas de business plan.
		expect((await client().post('/api/business-plan').set(ha).send(FICHE)).status).toBe(403);

		// État : gestionnaire avec le droit « Activation ».
		expect(
			(
				await client()
					.post(`/api/business-plan/${id}/etat`)
					.set(await entetes('admin_sans_droit'))
					.send({ etat: 3 })
			).status
		).toBe(403);
		expect(
			(await client().post(`/api/business-plan/${id}/etat`).set(ha).send({ etat: 3 })).status
		).toBe(200);

		// Fiche supprimée : le porteur peut en recréer une, la référence est conservée.
		const h = await entetes('awa');
		expect((await client().get('/api/business-plan/mien').set(h)).body).toBeNull();
		const reprise = await client().post('/api/business-plan').set(h).send(FICHE);
		expect(reprise.status).toBe(201);
		expect(reprise.body.id).toBe(id);
	});
});
