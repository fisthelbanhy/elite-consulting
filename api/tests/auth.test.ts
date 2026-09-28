/**
 * Authentification, inscription, mots de passe (portage de `tests/test_auth.py`).
 * Mêmes cas, mêmes assertions : c'est la preuve de parité du module.
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { nouvelleReference } from '../src/services/references.js';

basePropre();

const INSCRIPTION = {
	categorie: 1,
	nom: 'Mabiala - Grace',
	pseudonyme: 'gracem',
	telephone: '06 123 45 67',
	ville_id: 2,
	identifiant: 'grace.m',
	mot_de_passe: 'unmotdepasse',
	confirmation: 'unmotdepasse',
	accepte_conditions: true,
	duree_saisie_ms: 20000
};

describe('inscription et connexion', () => {
	it('inscrit puis laisse se connecter par téléphone', async () => {
		const r = await client().post('/api/auth/inscription').send(INSCRIPTION);
		expect(r.status, r.text).toBe(201);
		// Jamais gestionnaire à l'inscription publique.
		expect(r.body.membre.type_compte).toBe(3);
		expect(r.body.membre.telephone).toBe('061234567');
		expect(r.body.membre.code_membre).toMatch(/^MBR/);

		const c = await client()
			.post('/api/auth/login')
			.send({ identifiant: '061234567', mot_de_passe: 'unmotdepasse' });
		expect(c.status).toBe(200);

		const moi = await client().get('/api/auth/me').set('Authorization', `Bearer ${c.body.jeton}`);
		expect(moi.body.pseudonyme).toBe('gracem');
	});

	it('applique les règles de validation du legacy', async () => {
		const mauvais = {
			...INSCRIPTION,
			telephone: '0712345',
			identifiant: 'gracemabiala',
			mot_de_passe: 'gracemabiala',
			confirmation: 'autre'
		};
		const r = await client().post('/api/auth/inscription').send(mauvais);
		expect(r.status).toBe(422);
		expect(r.body.champs).toHaveProperty('telephone');
		expect(r.body.champs.mot_de_passe).toContain("différent de l'identifiant");

		const r2 = await client()
			.post('/api/auth/inscription')
			.send({ ...INSCRIPTION, confirmation: 'autre chose' });
		expect(r2.status).toBe(422);
		expect(r2.body.champs).toHaveProperty('confirmation');

		const r3 = await client()
			.post('/api/auth/inscription')
			.send({ ...INSCRIPTION, pseudonyme: 'gra' });
		expect(r3.status).toBe(400);
		expect(r3.body.champs.pseudonyme).toContain('6 caractères');

		// Personne morale : un sigle de 3 caractères est accepté.
		const r4 = await client()
			.post('/api/auth/inscription')
			.send({ ...INSCRIPTION, categorie: 2, pseudonyme: 'SGC' });
		expect(r4.status, r4.text).toBe(201);
	});

	it('refuse les doublons et les robots', async () => {
		expect((await client().post('/api/auth/inscription').send(INSCRIPTION)).status).toBe(201);

		const doublon = await client()
			.post('/api/auth/inscription')
			.send({ ...INSCRIPTION, identifiant: 'autre' });
		expect(doublon.status).toBe(400);
		expect(Object.keys(doublon.body.champs)).toEqual(
			expect.arrayContaining(['pseudonyme', 'telephone'])
		);

		const robot = await client()
			.post('/api/auth/inscription')
			.send({ ...INSCRIPTION, identifiant: 'robot1', site_web: 'http://spam' });
		expect(robot.status).toBe(400);
	});

	it("déduit l'identifiant et le pseudonyme d'une inscription minimale", async () => {
		const corps = {
			categorie: 1,
			nom: 'Mabiala - Grace',
			telephone: '055551234',
			ville_id: 2,
			mot_de_passe: 'unmotdepasse',
			confirmation: 'unmotdepasse',
			accepte_conditions: true
		};
		const r = await client().post('/api/auth/inscription').send(corps);
		expect(r.status, r.text).toBe(201);
		expect(r.body.membre.identifiant).toBe('055551234');
		expect(r.body.membre.pseudonyme).toBe('Grace M.');

		// Homonyme : pseudonyme rendu unique.
		const r2 = await client()
			.post('/api/auth/inscription')
			.send({ ...corps, telephone: '055551235' });
		expect(r2.status).toBe(201);
		expect(r2.body.membre.pseudonyme).toBe('Grace M.2');

		// Entreprise : sigle.
		const r3 = await client()
			.post('/api/auth/inscription')
			.send({ ...corps, categorie: 2, nom: 'Société Générale Congo', telephone: '055551236' });
		expect(r3.body.membre.pseudonyme).toBe('SGC');
	});
});

describe('règles de connexion', () => {
	it('bloque un membre supprimé mais pas un membre « non traité »', async () => {
		await creerMembre('supprime', { etat: 3 });
		await creerMembre('nontraite', { etat: 1 });

		const r = await client()
			.post('/api/auth/login')
			.send({ identifiant: 'supprime', mot_de_passe: 'motdepasse1' });
		expect(r.status).toBe(400);

		// L'état « Non traité » n'empêche pas la connexion (règle legacy).
		const r2 = await client()
			.post('/api/auth/login')
			.send({ identifiant: 'nontraite', mot_de_passe: 'motdepasse1' });
		expect(r2.status).toBe(200);
	});

	it('limite les tentatives répétées', async () => {
		await creerMembre('cible');
		for (let i = 0; i < 5; i++) {
			await client().post('/api/auth/login').send({ identifiant: 'cible', mot_de_passe: 'faux' });
		}
		const r = await client()
			.post('/api/auth/login')
			.send({ identifiant: 'cible', mot_de_passe: 'motdepasse1' });
		expect(r.status).toBe(429);
	});

	it('invalide le jeton à la déconnexion', async () => {
		await creerMembre('sortie');
		const h = await entetes('sortie');
		expect((await client().get('/api/auth/me').set(h)).status).toBe(200);
		await client().post('/api/auth/logout').set(h);
		expect((await client().get('/api/auth/me').set(h)).status).toBe(401);
	});
});

describe('mot de passe oublié', () => {
	it('ne révèle jamais le mot de passe', async () => {
		await creerMembre('oubli', {
			nom: 'Oubli Test',
			pseudonyme: 'oublieux',
			telephone: '061112233'
		});
		const r = await client().post('/api/auth/mot-de-passe-oublie').send({
			categorie: 1,
			nom: 'oubli test',
			pseudonyme: 'OUBLIEUX',
			telephone: '06 111 22 33'
		});
		expect(r.status).toBe(200);
		expect(r.text).not.toContain('motdepasse1');
	});

	it('répond la même chose quand le compte est inconnu', async () => {
		const r = await client().post('/api/auth/mot-de-passe-oublie').send({
			categorie: 1,
			nom: 'Personne Inexistante',
			pseudonyme: 'fantome',
			telephone: '061119999'
		});
		expect(r.status).toBe(200);
		expect(r.body.message).toContain('Si ces informations correspondent');
	});
});

describe('références', () => {
	it('reprend le format du legacy', () => {
		const ref = db.transaction(() => nouvelleReference('dei', new Date(2017, 10, 5)));
		// Préfixe + mois + compteur (100+1) + année
		expect(ref).toBe('DEI1110117');
	});
});
