/**
 * Dialogue contextuel « Écrire à la frangine » (portage de `tests/test_dialogues.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

describe('accès', () => {
	it('ferme tout au visiteur (correctif du legacy)', async () => {
		expect((await client().get('/api/dialogues?type=1')).status).toBe(401);
		expect(
			(await client().post('/api/dialogues').send({ type_dialogue: 1, texte: 'Bonjour' })).status
		).toBe(401);
	});
});

describe('membre', () => {
	it('écrit dans les 4 rubriques (correctif F-S7-38)', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		for (const t of [1, 2, 3, 4]) {
			const r = await client()
				.post('/api/dialogues')
				.set(h)
				.send({ type_dialogue: t, texte: `Question rubrique ${t}` });
			expect(r.status, r.text).toBe(201);
		}

		const court = await client()
			.post('/api/dialogues')
			.set(h)
			.send({ type_dialogue: 1, texte: 'x' });
		expect(court.status).toBe(400);
		expect(court.body.message).toBe('Votre message doit avoir 2 caractères minimum.');

		const fil = await client().get('/api/dialogues?type=2').set(h);
		expect(fil.body.total).toBe(1);
		expect(fil.body.items[0].de_moi).toBe(true);
		expect(fil.body.items[0].a_la_frangine).toBe(true);
	});

	it('refuse un double envoi', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		expect(
			(await client().post('/api/dialogues').set(h).send({ type_dialogue: 1, texte: 'Bonjour' }))
				.status
		).toBe(201);
		const second = await client()
			.post('/api/dialogues')
			.set(h)
			.send({ type_dialogue: 1, texte: 'Bonjour' });
		expect(second.status).toBe(400);
		expect(second.body.message).toBe('Ce message est déjà envoyé.');
	});
});

describe('réponse du conseiller', () => {
	it('part au bon membre et reste cloisonnée (correctif F-S7-39 / F-TRV-57)', async () => {
		// Le « membre n° 1 » du bug legacy : il ne doit rien recevoir.
		const premier = await creerMembre('premier');
		const awa = await creerMembre('awa');
		await creerMembre('binta');
		await creerMembre('conseiller', {
			type_compte: TypeMembre.GESTIONNAIRE,
			droit_activation: true
		});
		const ha = await entetes('awa');
		const hb = await entetes('binta');
		const hg = await entetes('conseiller');

		await client()
			.post('/api/dialogues')
			.set(ha)
			.send({ type_dialogue: 3, texte: 'Où en est mon crédit ?' });
		await client()
			.post('/api/dialogues')
			.set(hb)
			.send({ type_dialogue: 3, texte: 'Et le mien ?' });

		// Le gestionnaire voit les messages adressés à la frangine, avec leur auteur.
		const tout = await client().get('/api/dialogues?type=3').set(hg);
		expect(tout.body.total).toBe(2);
		expect(
			new Set(tout.body.items.map((m: { auteur: { pseudonyme: string } }) => m.auteur.pseudonyme))
		).toEqual(new Set(['awa', 'binta']));

		// Une réponse sans destinataire est refusée.
		const sansDestinataire = await client()
			.post('/api/dialogues')
			.set(hg)
			.send({ type_dialogue: 3, texte: 'Patience' });
		expect(sansDestinataire.status).toBe(400);
		expect(sansDestinataire.body.message).toBe('Veuillez indiquer le destinataire du message.');

		const reponse = await client().post('/api/dialogues').set(hg).send({
			type_dialogue: 3,
			texte: 'Votre dossier est en cours.',
			destinataire_id: awa
		});
		expect(reponse.status).toBe(201);

		const filAwa = (await client().get('/api/dialogues?type=3').set(ha)).body.items;
		expect(filAwa.map((m: { texte: string }) => m.texte)).toEqual([
			'Où en est mon crédit ?',
			'Votre dossier est en cours.'
		]);
		expect(filAwa[1].de_la_frangine).toBe(true);

		expect((await client().get('/api/dialogues?type=3').set(hb)).body.total).toBe(1);
		expect(
			(
				await client()
					.get('/api/dialogues?type=3')
					.set(await entetes('premier'))
			).body.total
		).toBe(0);
		expect(premier).not.toBe(awa);

		// Awa est prévenue dans sa messagerie.
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);

		// Conversations : binta attend une réponse, awa non.
		const conv = await client().get('/api/dialogues/conversations?type=3').set(hg);
		expect(
			conv.body.map((c: { membre: { pseudonyme: string }; en_attente: boolean }) => [
				c.membre.pseudonyme,
				c.en_attente
			])
		).toEqual([
			['binta', true],
			['awa', false]
		]);
		expect((await client().get('/api/dialogues/conversations?type=3').set(ha)).status).toBe(403);

		// Fil d'un membre précis et recherche plein texte.
		expect((await client().get(`/api/dialogues?type=3&membre_id=${awa}`).set(hg)).body.total).toBe(2);
		expect((await client().get('/api/dialogues?type=3&q=mien').set(hg)).body.total).toBe(1);
	});
});
