/**
 * Tarifs bancaires — « Bench marking » (portage de `tests/test_tarifs_bancaires.py`).
 */
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { banque } from '../src/schema/core.js';

basePropre();

beforeEach(() => {
	db.insert(banque)
		.values([
			{ id: 1, nom: 'Autres' },
			{ id: 2, sigle: 'BGFI', nom: 'BGFIBank Congo' },
			{ id: 3, sigle: 'LCB', nom: 'LCB Bank' }
		])
		.run();
});

async function admin() {
	await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
	return entetes('admin');
}

describe('consultation', () => {
	it('est réservée aux membres connectés et masque la banque « Autres »', async () => {
		expect((await client().get('/api/tarifs-bancaires')).status).toBe(401);
		await creerMembre('awa');
		const c = (await client().get('/api/tarifs-bancaires').set(await entetes('awa'))).body;
		expect(c.referentiel_vide).toBe(true);
		expect(c.peut_gerer_referentiel).toBe(false);
		expect(c.banques_gerees).toEqual([]);
		expect(c.banques.map((b: { sigle: string }) => b.sigle)).toEqual(['BGFI', 'LCB']);
	});
});

describe('initialisation', () => {
	it('reprend les deux tableaux legacy jamais reliés (F-S7-43)', async () => {
		await creerMembre('awa');
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/initialiser')
					.set(await entetes('awa'))
			).status
		).toBe(403);

		const hg = await admin();
		const r = await client().post('/api/tarifs-bancaires/initialiser').set(hg);
		expect(r.status).toBe(201);
		expect(r.body.message).toBe('Référentiel initialisé : 9 types et 25 opérations.');
		expect((await client().post('/api/tarifs-bancaires/initialiser').set(hg)).status).toBe(400);

		const c = (await client().get('/api/tarifs-bancaires').set(hg)).body;
		expect(c.types).toHaveLength(9);
		expect(
			c.types.reduce((n: number, t: { operations: unknown[] }) => n + t.operations.length, 0)
		).toBe(25);
		expect(c.types[1].libelle).toBe('Virements');
		expect(c.types[1].operations).toHaveLength(2);
	});
});

describe('référentiel à trois niveaux', () => {
	it('applique les règles et les messages legacy', async () => {
		const hg = await admin();

		const court = await client()
			.post('/api/tarifs-bancaires/types')
			.set(hg)
			.send({ libelle: 'Vir' });
		expect(court.body.message).toBe("Le type de l'opération doit avoir 4 caractères minimum.");

		const typeId = (
			await client().post('/api/tarifs-bancaires/types').set(hg).send({ libelle: 'Virements' })
		).body.id;
		expect(
			(await client().post('/api/tarifs-bancaires/types').set(hg).send({ libelle: 'virements' }))
				.status
		).toBe(400);

		const sansType = await client()
			.post('/api/tarifs-bancaires/operations')
			.set(hg)
			.send({ libelle: 'Virement CEMAC' });
		expect(sansType.body.champs.type_id).toBe('Chaque opération doit être liée à un type.');

		const op = (
			await client()
				.post('/api/tarifs-bancaires/operations')
				.set(hg)
				.send({ type_id: typeId, libelle: 'Virement CEMAC' })
		).body.id;
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/operations')
					.set(hg)
					.send({ type_id: typeId, libelle: 'Virement CEMAC' })
			).body.message
		).toBe('Opération déjà enregistrée.');

		// Niveau 3 : banque obligatoire, tarif ≥ 1 caractère, un seul tarif par banque et opération.
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/tarifs')
					.set(hg)
					.send({ operation_id: op, tarif: '5 000 FCFA' })
			).body.message
		).toBe('Veuillez indiquer la banque concernée.');
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/tarifs')
					.set(hg)
					.send({ operation_id: op, banque_id: 2, tarif: ' ' })
			).body.champs.tarif
		).toBe('Le tarif doit avoir 1 caractère minimum.');

		const tarif = (
			await client()
				.post('/api/tarifs-bancaires/tarifs')
				.set(hg)
				.send({ operation_id: op, banque_id: 2, tarif: '5 000 FCFA' })
		).body.id;
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/tarifs')
					.set(hg)
					.send({ operation_id: op, banque_id: 2, tarif: '5 000 FCFA' })
			).status
		).toBe(400);

		// Modification effective (correctif F-S7-42).
		expect(
			(
				await client()
					.put(`/api/tarifs-bancaires/tarifs/${tarif}`)
					.set(hg)
					.send({ tarif: '4 500 FCFA' })
			).status
		).toBe(200);
		let c = (await client().get('/api/tarifs-bancaires').set(hg)).body;
		expect(c.types[0].operations[0].tarifs).toEqual([
			{ id: tarif, banque_id: 2, tarif: '4 500 FCFA' }
		]);

		// Filtre par banque.
		c = (await client().get('/api/tarifs-bancaires?banque_id=3').set(hg)).body;
		expect(c.banques.map((b: { id: number }) => b.id)).toEqual([3]);
		expect(c.nombre_tarifs).toBe(0);
	});
});

describe('grille par banque', () => {
	it('est saisissable par le membre banque, pour sa banque seulement', async () => {
		const hg = await admin();
		await client().post('/api/tarifs-bancaires/initialiser').set(hg);
		const banquier = await creerMembre('lcb', { categorie: 2 });
		db.update(banque).set({ membre_id: banquier }).where(eq(banque.id, 3)).run();
		const hb = await entetes('lcb');

		let c = (await client().get('/api/tarifs-bancaires').set(hb)).body;
		expect(c.banques_gerees).toEqual([3]);
		const ops: number[] = c.types.flatMap((t: { operations: { id: number }[] }) =>
			t.operations.map((o) => o.id)
		);

		const r = await client()
			.put('/api/tarifs-bancaires/banques/3')
			.set(hb)
			.send({ tarifs: { [String(ops[0])]: 'Gratuit', [String(ops[1])]: '1 %' } });
		expect(r.status).toBe(200);

		// Un membre banque ne saisit pas les tarifs d'une autre banque.
		expect(
			(
				await client()
					.put('/api/tarifs-bancaires/banques/2')
					.set(hb)
					.send({ tarifs: { [String(ops[0])]: '0' } })
			).status
		).toBe(403);

		// Vider une case retire le tarif.
		await client()
			.put('/api/tarifs-bancaires/banques/3')
			.set(hb)
			.send({ tarifs: { [String(ops[1])]: '' } });
		c = (await client().get('/api/tarifs-bancaires').set(hb)).body;
		expect(c.nombre_tarifs).toBe(1);

		// Le membre banque ne gère pas le référentiel.
		expect(
			(
				await client()
					.post('/api/tarifs-bancaires/types')
					.set(hb)
					.send({ libelle: 'Nouveau type' })
			).status
		).toBe(403);
	});
});
