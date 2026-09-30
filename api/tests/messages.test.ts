/**
 * Messagerie privée membre ↔ la frangine (portage de `tests/test_messages.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

describe('fil du membre', () => {
	it("refuse un message vide et marque les réponses lues à l'ouverture", async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const h = await entetes('awa');

		// Message vide refusé avec un message visible (correctif F-TRV-54).
		const vide = await client().post('/api/messages').set(h).send({ texte: '   ' });
		expect(vide.status).toBe(400);
		expect(vide.body.message).toContain('vide');
		expect(vide.body.champs).toHaveProperty('texte');

		expect(
			(await client().post('/api/messages').set(h).send({ texte: 'Bonjour la frangine !' })).status
		).toBe(201);

		const ha = await entetes('admin');
		const awaId = (await client().get('/api/messages/fils').set(ha)).body.items[0].membre.id;
		expect(
			(
				await client()
					.post(`/api/messages/fils/${awaId}`)
					.set(ha)
					.send({ texte: 'Bonjour Awa, que puis-je faire ?' })
			).status
		).toBe(201);

		expect((await client().get('/api/espace/compteurs').set(h)).body.messages_non_lus).toBe(1);

		const fil = await client().get('/api/messages').set(h);
		expect(fil.body.messages.map((m: { de_la_frangine: boolean }) => m.de_la_frangine)).toEqual([
			false,
			true
		]);
		expect(fil.body.non_lus).toBe(1);
		// Signalé comme nouveau (état de lecture avant ouverture).
		expect(fil.body.messages[1].lu).toBe(false);
		// Le membre voit « la frangine », pas le gestionnaire.
		expect(fil.body.messages[1].auteur).toBeNull();
		// Le gestionnaire vient d'être actif.
		expect(fil.body.frangine_en_ligne).toBe(true);

		// Ouvert : les réponses sont désormais lues (F-TRV-50).
		expect((await client().get('/api/espace/compteurs').set(h)).body.messages_non_lus).toBe(0);
		expect((await client().get('/api/messages').set(h)).body.messages[1].lu).toBe(true);
	});
});

describe('liste des fils', () => {
	it("classe, recherche et marque lu à l'ouverture", async () => {
		await creerMembre('awa', { nom: 'Awa Nkounkou' });
		await creerMembre('bob', { nom: 'Bob Mabiala' });
		await creerMembre('carine', { nom: 'Carine Sans Fil' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });

		await client()
			.post('/api/messages')
			.set(await entetes('awa'))
			.send({ texte: "Premier message d'Awa" });
		const hb = await entetes('bob');
		await client().post('/api/messages').set(hb).send({ texte: 'Bob écrit' });
		await client().post('/api/messages').set(hb).send({ texte: 'Bob insiste' });

		expect((await client().get('/api/messages/fils').set(hb)).status).toBe(403);

		const ha = await entetes('admin');
		const fils = await client().get('/api/messages/fils').set(ha);
		expect(fils.body.total).toBe(2);

		const bob = fils.body.items.find(
			(f: { membre: { nom: string } }) => f.membre.nom === 'Bob Mabiala'
		);
		expect(bob.non_lus).toBe(2);
		expect(bob.total).toBe(2);
		expect(bob.dernier_message.texte).toBe('Bob insiste');
		// Actif il y a moins de 5 minutes (F-TRV-52).
		expect(bob.membre.en_ligne).toBe(true);
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(3);

		// Recherche, et membres sans fil (pour écrire le premier message).
		expect((await client().get('/api/messages/fils?q=carine').set(ha)).body.total).toBe(0);
		const tous = await client().get('/api/messages/fils?q=carine&tous=true').set(ha);
		expect(tous.body.total).toBe(1);
		expect(tous.body.items[0].total).toBe(0);

		// Ouverture du fil : les messages du membre sont marqués lus (F-TRV-53).
		const fil = await client().get(`/api/messages/fils/${bob.membre.id}`).set(ha);
		expect(fil.body.non_lus).toBe(2);
		expect(fil.body.messages).toHaveLength(2);
		expect((await client().get('/api/espace/compteurs').set(ha)).body.messages_non_lus).toBe(1);

		// Les fils non lus remontent en tête.
		const apres = await client().get('/api/messages/fils').set(ha);
		expect(apres.body.items[0].membre.nom).toBe('Awa Nkounkou');
	});
});

describe('réponses des gestionnaires', () => {
	it('appartiennent toutes au même fil (correctif F-TRV-55)', async () => {
		const awa = await creerMembre('awa');
		await creerMembre('admin1', {
			type_compte: TypeMembre.GESTIONNAIRE,
			pseudonyme: 'Maman Rose'
		});
		const admin2 = await creerMembre('admin2', {
			type_compte: TypeMembre.GESTIONNAIRE,
			pseudonyme: 'Tantine Julie'
		});
		const ha1 = await entetes('admin1');
		const ha2 = await entetes('admin2');

		await client().post(`/api/messages/fils/${awa}`).set(ha1).send({ texte: 'Réponse de Rose' });
		await client().post(`/api/messages/fils/${awa}`).set(ha2).send({ texte: 'Réponse de Julie' });

		// Chaque gestionnaire voit les réponses de ses collègues.
		const fil = await client().get(`/api/messages/fils/${awa}`).set(ha1);
		expect(
			fil.body.messages.map((m: { auteur: { pseudonyme: string } }) => m.auteur.pseudonyme)
		).toEqual(['Maman Rose', 'Tantine Julie']);

		const cote = await client()
			.get('/api/messages')
			.set(await entetes('awa'));
		expect(cote.body.messages).toHaveLength(2);

		// Un gestionnaire n'a pas de fil propre ; on n'ouvre pas le fil d'un gestionnaire.
		expect((await client().get('/api/messages').set(ha1)).status).toBe(403);
		expect((await client().get(`/api/messages/fils/${admin2}`).set(ha1)).status).toBe(400);
		expect((await client().get('/api/messages/fils/9999').set(ha1)).status).toBe(404);
	});
});

describe('présence', () => {
	it('signale la frangine hors ligne après 5 minutes', async () => {
		await creerMembre('awa');
		await creerMembre('admin', {
			type_compte: TypeMembre.GESTIONNAIRE,
			derniere_activite: new Date(Date.now() - 10 * 60 * 1000)
		});
		const fil = await client()
			.get('/api/messages')
			.set(await entetes('awa'));
		expect(fil.body.frangine_en_ligne).toBe(false);
		expect(fil.body.messages).toEqual([]);
	});
});
