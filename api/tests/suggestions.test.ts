/**
 * Boîte à idées (portage de `tests/test_suggestions.py`).
 */
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { suggestion } from '../src/schema/contenu.js';

basePropre();

describe('dépôt', () => {
	it('est réservé aux connectés et reste anonyme', async () => {
		const idee = { module: 0, texte: 'Ajouter un annuaire des couturières de Bacongo.' };
		expect((await client().post('/api/suggestions').send(idee)).status).toBe(401);

		await creerMembre('awa');
		const h = await entetes('awa');

		const incomplet = await client()
			.post('/api/suggestions')
			.set(h)
			.send({ module: null, texte: 'court' });
		expect(incomplet.status).toBe(400);
		expect(Object.keys(incomplet.body.champs)).toEqual(expect.arrayContaining(['module', 'texte']));

		expect(
			(
				await client()
					.post('/api/suggestions')
					.set(h)
					.send({ ...idee, module: 9 })
			).status
		).toBe(400);

		// « Accueil » (0) est accepté (correctif F-TRV-60).
		expect((await client().post('/api/suggestions').set(h).send(idee)).status).toBe(201);

		// Doublon module + texte refusé ; même texte sur un autre module accepté (F-TRV-61).
		const doublon = await client().post('/api/suggestions').set(h).send(idee);
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette suggestion est déjà enregistrée.');
		expect(
			(
				await client()
					.post('/api/suggestions')
					.set(h)
					.send({ ...idee, module: 8 })
			).status
		).toBe(201);

		// Aucune trace de l'auteur dans le schéma.
		const colonnes = getTableConfig(suggestion).columns.map((c) => c.name);
		expect(colonnes).not.toContain('membre_id');
		expect(colonnes).not.toContain('auteur_id');
		expect(db.select().from(suggestion).all()).toHaveLength(2);
	});
});

describe('gestion', () => {
	it('est réservée aux gestionnaires', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');

		await client()
			.post('/api/suggestions')
			.set(h)
			.send({ module: 2, texte: "Afficher le salaire des offres d'emploi." });
		await client()
			.post('/api/suggestions')
			.set(h)
			.send({ module: 3, texte: 'Permettre le paiement Airtel Money.' });

		expect((await client().get('/api/suggestions').set(h)).status).toBe(403);

		const ha = await entetes('admin');
		const liste = await client().get('/api/suggestions').set(ha);
		expect(liste.body.total).toBe(2);
		// Plus récente d'abord.
		expect(liste.body.items[0].module).toBe(3);

		expect((await client().get('/api/suggestions?module=2').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/suggestions?q=airtel').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/suggestions/compteurs').set(ha)).body).toEqual({
			a_lire: 2,
			total: 2
		});

		const id = liste.body.items[0].id;
		expect(
			(await client().post(`/api/suggestions/${id}/etat`).set(h).send({ etat: 2 })).status
		).toBe(403);
		expect(
			(await client().post(`/api/suggestions/${id}/etat`).set(ha).send({ etat: 2 })).status
		).toBe(200);
		expect((await client().get('/api/suggestions?etat=2').set(ha)).body.total).toBe(1);
		expect((await client().get('/api/suggestions/compteurs').set(ha)).body).toEqual({
			a_lire: 1,
			total: 2
		});
	});
});
