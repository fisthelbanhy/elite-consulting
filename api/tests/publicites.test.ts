/**
 * Publicités : diffusion publique et gestion (portage de `tests/test_publicites.py`).
 */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { basePropre, client, creerMembre, entetes, imagePng } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { publicite } from '../src/schema/contenu.js';
import { entreprise } from '../src/schema/entreprises.js';

basePropre();

const AUJOURDHUI = new Date();
const jour = (decalage: number) => {
	const d = new Date(AUJOURDHUI);
	d.setDate(d.getDate() + decalage);
	return d;
};
const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function creerEntreprise(nom = 'CECILIA &amp; SARICKA'): number {
	return db.insert(entreprise).values({ nom, etat: 2 }).returning({ id: entreprise.id }).get()!.id;
}

function pub(demandeur: number | null, ent: number | null, extra: Record<string, unknown> = {}) {
	return {
		demandeur_id: demandeur,
		entreprise_id: ent,
		texte: 'Pour la beauté de vos enfants',
		date_debut: iso(jour(-1)),
		date_fin: iso(jour(30)),
		type_fichier: 1,
		...extra
	};
}

function inserer(n: number, ent: number, extra: Record<string, unknown> = {}) {
	for (let i = 0; i < n; i++) {
		db.insert(publicite)
			.values({
				reference: `PUB${i}`,
				entreprise_id: ent,
				texte: `Publicité ${i}`,
				etat: 2,
				date_debut: jour(-1),
				date_fin: jour(1),
				...extra
			})
			.run();
	}
}

describe('création', () => {
	it('applique les règles, la référence et l’état initial', async () => {
		const ent = creerEntreprise();
		const admin = await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		await creerMembre('chef', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		await creerMembre('awa');
		const ha = await entetes('admin');

		// Réservé aux gestionnaires.
		expect(
			(
				await client()
					.post('/api/publicites')
					.set(await entetes('awa'))
					.send(pub(admin, ent))
			).status
		).toBe(403);

		const incomplet = await client()
			.post('/api/publicites')
			.set(ha)
			.send(pub(null, null, { texte: 'Court', date_debut: null, type_fichier: null }));
		expect(incomplet.status).toBe(400);
		expect(Object.keys(incomplet.body.champs)).toEqual(
			expect.arrayContaining(['demandeur_id', 'entreprise_id', 'texte', 'date_debut', 'type_fichier'])
		);

		// Correctif F-ADM-36 : la fin ne peut pas précéder le début.
		const datesInversees = await client()
			.post('/api/publicites')
			.set(ha)
			.send(pub(admin, ent, { date_fin: iso(jour(-5)) }));
		expect(datesInversees.status).toBe(400);
		expect(datesInversees.body.champs).toHaveProperty('date_fin');

		const lienDangereux = await client()
			.post('/api/publicites')
			.set(ha)
			.send(pub(admin, ent, { lien: 'javascript:alert(1)' }));
		expect(lienDangereux.status).toBe(400);
		expect(lienDangereux.body.champs).toHaveProperty('lien');

		// Sans droit « Activation » : l'état demandé est ignoré (reste « Non traité »).
		const r = await client()
			.post('/api/publicites')
			.set(ha)
			.send(pub(admin, ent, { etat: 2 }));
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^PUB/);
		const id = r.body.id;
		expect((await client().get(`/api/publicites/${id}`).set(ha)).body.etat).toBe(1);

		// Doublon de texte.
		const doublon = await client().post('/api/publicites').set(ha).send(pub(admin, ent));
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Cette publicité est déjà enregistrée.');

		// Avec droit « Activation » : l'état choisi est appliqué.
		const parChef = await client()
			.post('/api/publicites')
			.set(await entetes('chef'))
			.send(pub(admin, ent, { texte: 'Nouvelle boutique à Poto-Poto', etat: 2 }));
		expect((await client().get(`/api/publicites/${parChef.body.id}`).set(ha)).body.etat).toBe(2);

		// Modification, puis changement d'état réservé au droit « Activation ».
		const modif = await client()
			.put(`/api/publicites/${id}`)
			.set(ha)
			.send(pub(admin, ent, { texte: 'Texte corrigé de la publicité' }));
		expect(modif.status).toBe(200);
		expect((await client().post(`/api/publicites/${id}/etat`).set(ha).send({ etat: 2 })).status).toBe(403);
		expect(
			(
				await client()
					.post(`/api/publicites/${id}/etat`)
					.set(await entetes('chef'))
					.send({ etat: 2 })
			).status
		).toBe(200);
		expect((await client().delete(`/api/publicites/${id}`).set(ha)).status).toBe(403);
	});
});

describe('diffusion publique', () => {
	it('limite à 10, masque les statistiques et exclut les publicités hors période', async () => {
		const ent = creerEntreprise();
		inserer(12, ent);
		db.insert(publicite).values([
			{
				reference: 'PUBX',
				entreprise_id: ent,
				texte: 'Expirée',
				etat: 2,
				date_debut: jour(-10),
				date_fin: jour(-1)
			},
			{
				reference: 'PUBY',
				entreprise_id: ent,
				texte: 'Non validée',
				etat: 1,
				date_debut: AUJOURDHUI,
				date_fin: AUJOURDHUI
			}
		]).run();

		const encart = await client().get('/api/publicites/diffusion');
		// Au plus 10 (F-TRV-04).
		expect(encart.body).toHaveLength(10);
		expect(
			encart.body.every((p: { texte: string }) => p.texte.startsWith('Publicité'))
		).toBe(true);
		// Le nom de l'annonceur est débarrassé du HTML stocké par le legacy.
		expect(encart.body[0].annonceur).toBe('CECILIA & SARICKA');
		expect(encart.body[0]).not.toHaveProperty('nombre_vues');
		expect(encart.body[0]).not.toHaveProperty('demandeur');

		expect((await client().get('/api/publicites/diffusion?limite=50')).body).toHaveLength(12);

		// La publicité expirée n'est pas consultable par le public.
		const expiree = db.select().from(publicite).where(eq(publicite.reference, 'PUBX')).get()!;
		expect((await client().get(`/api/publicites/${expiree.id}`)).status).toBe(404);
	});
});

describe('vues', () => {
	it('ne compte que les affichages publics, hors robots', async () => {
		const ent = creerEntreprise();
		const admin = await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		inserer(1, ent, { demandeur_id: admin });

		const id = (await client().get('/api/publicites/diffusion')).body[0].id;
		const publique = await client().get(`/api/publicites/${id}`);
		expect(publique.body.nombre_vues).toBeNull();
		expect(publique.body.demandeur).toBeNull();
		expect(publique.body.en_diffusion).toBe(true);

		await client().get(`/api/publicites/${id}`);
		// Robot : ignoré.
		await client().get(`/api/publicites/${id}`).set('User-Agent', 'Googlebot/2.1');

		const vueAdmin = await client()
			.get(`/api/publicites/${id}`)
			.set(await entetes('admin'));
		expect(vueAdmin.body.nombre_vues).toBe(2);
		expect(vueAdmin.body.date_derniere_vue).not.toBeNull();
		expect(vueAdmin.body.peut_gerer).toBe(true);
	});
});

describe('fichier', () => {
	it('doit correspondre au type déclaré', async () => {
		const ent = creerEntreprise();
		const admin = await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const ha = await entetes('admin');
		const id = (
			await client()
				.post('/api/publicites')
				.set(ha)
				.send(pub(admin, ent, { type_fichier: 2 }))
		).body.id;

		// Une image pour une publicité « Son » est refusée.
		const mauvais = await client()
			.post(`/api/publicites/${id}/fichier`)
			.set(ha)
			.attach('fichier', await imagePng(), 'a.png');
		expect(mauvais.status).toBe(400);
		expect(mauvais.body.message).toContain('Son');

		const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)]);
		const bon = await client()
			.post(`/api/publicites/${id}/fichier`)
			.set(ha)
			.attach('fichier', mp3, 'a.mp3');
		expect(bon.status, bon.text).toBe(200);

		const d = await client().get(`/api/publicites/${id}`).set(ha);
		expect(d.body.genre).toBe('son');
		expect(d.body.fichier_url).toMatch(/\.mp3$/);

		// Passage en vidéo : le fichier MP4 est accepté.
		await client()
			.put(`/api/publicites/${id}`)
			.set(ha)
			.send(pub(admin, ent, { type_fichier: 3 }));
		const mp4 = Buffer.concat([
			Buffer.from([0x00, 0x00, 0x00, 0x18]),
			Buffer.from('ftypmp42'),
			Buffer.alloc(64)
		]);
		expect(
			(
				await client()
					.post(`/api/publicites/${id}/fichier`)
					.set(ha)
					.attach('fichier', mp4, 'v.mp4')
			).status
		).toBe(200);
		expect((await client().get(`/api/publicites/${id}`).set(ha)).body.genre).toBe('video');
	});
});

describe('filtres de gestion', () => {
	it('filtrent par entreprise, demandeur, dates, vues et texte', async () => {
		const ent1 = creerEntreprise('Boutique A');
		const ent2 = creerEntreprise('Boutique B');
		const admin = await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE });
		const awa = await creerMembre('awa');
		const ha = await entetes('admin');

		await client()
			.post('/api/publicites')
			.set(ha)
			.send(pub(admin, ent1, { texte: 'Soldes de la boutique A' }));
		await client()
			.post('/api/publicites')
			.set(ha)
			.send(
				pub(awa, ent2, {
					texte: 'Ouverture de la boutique B',
					date_debut: '2030-01-01',
					date_fin: '2030-02-01'
				})
			);

		const total = async (url: string) => (await client().get(url).set(ha)).body.total;
		expect(await total('/api/publicites')).toBe(2);
		expect(await total(`/api/publicites?entreprise_id=${ent2}`)).toBe(1);
		expect(await total(`/api/publicites?demandeur_id=${awa}`)).toBe(1);
		expect(await total('/api/publicites?debut_du=2029-12-01&debut_au=2030-01-31')).toBe(1);
		expect(await total('/api/publicites?fin_au=2029-01-01')).toBe(1);
		expect(await total('/api/publicites?vues_min=1')).toBe(0);
		expect(await total('/api/publicites?q=soldes')).toBe(1);

		// Un membre demandeur ne voit que ses publicités.
		const vueAwa = await client()
			.get('/api/publicites')
			.set(await entetes('awa'));
		expect(vueAwa.body.total).toBe(1);

		const choix = await client().get('/api/publicites/choix').set(ha);
		expect(choix.body.membres).toHaveLength(2);
		expect(choix.body.entreprises).toHaveLength(2);
	});
});
