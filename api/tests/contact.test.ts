/**
 * Formulaire de contact (portage de `tests/test_contact.py`).
 *
 * L'ancienne suite vérifiait l'envoi d'e-mail en inspectant le journal ; ici les e-mails partent
 * dans `boiteDeTest` (voir `services/emails.ts`), ce qui permet de vérifier destinataire et objet.
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { eq } from 'drizzle-orm';
import { TypeMembre } from '../src/enums.js';
import { contact } from '../src/schema/contenu.js';
import { boiteDeTest } from '../src/services/emails.js';

basePropre();

const VISITEUR = {
	nom: 'Grace Mabiala',
	email: 'grace@example.com',
	telephone: '',
	objet: "Demande d'information",
	texte: 'Bonjour, comment fonctionne la Likelemba ?'
};

describe('visiteur', () => {
	it('applique les règles et refuse les doublons', async () => {
		const incomplet = await client()
			.post('/api/contact')
			.send({ ...VISITEUR, nom: 'Ab', email: '', objet: 'Ok', texte: 'Court' });
		expect(incomplet.status).toBe(400);
		expect(Object.keys(incomplet.body.champs)).toEqual(
			expect.arrayContaining(['nom', 'email', 'objet', 'texte'])
		);

		// Format d'e-mail contrôlé, message en français.
		const mauvaisEmail = await client()
			.post('/api/contact')
			.send({ ...VISITEUR, email: 'pas-un-email' });
		expect(mauvaisEmail.status).toBe(422);
		expect(mauvaisEmail.body.champs.email).toContain('e-mail');

		expect((await client().post('/api/contact').send(VISITEUR)).status).toBe(201);

		const doublon = await client()
			.post('/api/contact')
			.send({ ...VISITEUR, nom: 'Autre Personne', email: 'autre@example.com' });
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce message est déjà enregistré.');
	});

	it('bloque les robots et limite le nombre de messages', async () => {
		expect(
			(
				await client()
					.post('/api/contact')
					.send({ ...VISITEUR, site_web: 'http://spam' })
			).status
		).toBe(400);
		expect(
			(
				await client()
					.post('/api/contact')
					.send({ ...VISITEUR, duree_saisie_ms: 800 })
			).status
		).toBe(400);

		for (let i = 0; i < 5; i++) {
			const r = await client()
				.post('/api/contact')
				.send({ ...VISITEUR, texte: `Message numéro ${i} pour tester` });
			expect(r.status).toBe(201);
		}
		const sixieme = await client()
			.post('/api/contact')
			.send({ ...VISITEUR, texte: "Un sixième message aujourd'hui" });
		expect(sixieme.status).toBe(400);
		expect(sixieme.body.message).toContain('plusieurs fois');
	});
});

describe('membre', () => {
	it("reprend le nom et l'e-mail du profil, non modifiables", async () => {
		await creerMembre('awa', {
			nom: 'Awa Nkounkou',
			email: 'awa@example.com',
			telephone: '061234567'
		});
		const h = await entetes('awa');

		const r = await client().post('/api/contact').set(h).send({
			nom: 'Usurpateur',
			email: 'faux@example.com',
			objet: 'Question sur mon compte',
			texte: 'Je ne trouve pas mon profil.'
		});
		expect(r.status, r.text).toBe(201);

		const c = db.select().from(contact).where(eq(contact.id, r.body.id)).get()!;
		expect(c.nom).toBe('Awa Nkounkou');
		expect(c.email).toBe('awa@example.com');
		expect(c.telephone).toBe('061234567');
		// File d'attente : « Non traité » (écart assumé au legacy qui créait à l'état 2).
		expect(c.etat).toBe(1);
	});
});

describe('visibilité', () => {
	it('cloisonne les listes selon le rôle', async () => {
		await creerMembre('awa');
		await creerMembre('bob');
		await creerMembre('master', { type_compte: TypeMembre.MASTER });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });

		await client()
			.post('/api/contact')
			.set(await entetes('awa'))
			.send({ ...VISITEUR, objet: "Message d'Awa" });
		await client()
			.post('/api/contact')
			.set(await entetes('bob'))
			.send({ ...VISITEUR, objet: 'Message de Bob' });
		await client().post('/api/contact').send(VISITEUR);

		expect((await client().get('/api/contact')).status).toBe(401);

		const awa = await client()
			.get('/api/contact')
			.set(await entetes('awa'));
		expect(awa.body.total).toBe(1);
		expect(awa.body.items[0].objet).toBe("Message d'Awa");

		// Le Master ne voit plus tous les messages (ADR-0007 T7).
		const master = await client()
			.get('/api/contact')
			.set(await entetes('master'));
		expect(master.body.total).toBe(0);

		const ha = await entetes('admin');
		expect((await client().get('/api/contact').set(ha)).body.total).toBe(3);
		expect((await client().get('/api/contact?q=bob').set(ha)).body.total).toBe(1);

		const idBob = (await client().get('/api/contact?q=bob').set(ha)).body.items[0].id;
		// Un membre ne peut ni lire ni modifier le message d'un autre.
		expect(
			(
				await client()
					.get(`/api/contact/${idBob}`)
					.set(await entetes('awa'))
			).status
		).toBe(404);
		expect(
			(
				await client()
					.post(`/api/contact/${idBob}/etat`)
					.set(await entetes('bob'))
					.send({ etat: 2 })
			).status
		).toBe(403);
		expect(
			(
				await client()
					.post(`/api/contact/${idBob}/reponse`)
					.set(await entetes('bob'))
					.send({ reponse: 'x'.repeat(10) })
			).status
		).toBe(403);

		const expediteurs = await client().get('/api/contact/expediteurs').set(ha);
		expect(expediteurs.body).toHaveLength(2);
		const bob = expediteurs.body.find((o: { label: string }) => o.label.includes('bob'));
		expect((await client().get(`/api/contact?membre_id=${bob.value}`).set(ha)).body.total).toBe(1);
		expect((await client().get('/api/contact/compteurs').set(ha)).body).toEqual({ a_traiter: 3 });
	});
});

describe('réponse', () => {
	it("est enregistrée avant d'être envoyée, et prévient le membre", async () => {
		boiteDeTest.length = 0;
		await creerMembre('awa', { email: 'awa@example.com' });
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const id = (
			await client()
				.post('/api/contact')
				.set(await entetes('awa'))
				.send(VISITEUR)
		).body.id;
		const ha = await entetes('admin');

		expect(
			(await client().post(`/api/contact/${id}/reponse`).set(ha).send({ reponse: ' ' })).status
		).toBe(400);

		const r = await client()
			.post(`/api/contact/${id}/reponse`)
			.set(ha)
			.send({ reponse: 'Bonjour Awa, voici comment faire.' });
		expect(r.status).toBe(200);
		expect(r.body.message).toContain('awa@example.com');

		const envoye = boiteDeTest.find((e) => e.sujet.includes("Re : Demande d'information"));
		expect(envoye).toBeDefined();
		expect(envoye!.destinataire).toBe('awa@example.com');

		// La réponse est conservée, visible du membre, et le message passe « traité ».
		const hAwa = await entetes('awa');
		const d = await client().get(`/api/contact/${id}`).set(hAwa);
		expect(d.body.reponse).toMatch(/^Bonjour Awa/);
		expect(d.body.repondu).toBe(true);
		expect(d.body.etat).toBe(2);
		expect(d.body.peut_repondre).toBe(false);

		// Le membre est prévenu dans sa messagerie.
		expect((await client().get('/api/espace/compteurs').set(hAwa)).body.messages_non_lus).toBe(1);

		// Changement d'état par un gestionnaire.
		expect((await client().post(`/api/contact/${id}/etat`).set(ha).send({ etat: 3 })).status).toBe(
			200
		);
		expect((await client().get('/api/contact').set(ha)).body.total).toBe(0);
		expect((await client().get('/api/contact?etat=3').set(ha)).body.total).toBe(1);
	});
});
