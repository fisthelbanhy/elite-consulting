/**
 * Accompagnement : 4 questionnaires de dossier bancable (portage de
 * `tests/test_accompagnement.py`).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { TypeMembre } from '../src/enums.js';

basePropre();

interface OptionsDossier {
	type?: number;
	objet?: string;
	envoyer?: boolean;
	reponses?: Record<string, string>;
}

function nouveau(h: Record<string, string>, o: OptionsDossier = {}) {
	const {
		type = 3,
		objet = 'Renégocier le prêt du camion',
		envoyer = false,
		reponses = {}
	} = o;
	return client()
		.post('/api/accompagnement')
		.set(h)
		.send({ type_dossier: type, objet, reponses, envoyer });
}

describe('questionnaires', () => {
	it('expose les libellés et le découpage legacy', async () => {
		const r = await client().get('/api/accompagnement/questionnaires');
		expect(r.status).toBe(200);
		const parSlug = new Map<string, Record<string, never>>(
			r.body.map((x: { slug: string }) => [x.slug, x])
		);

		// F-S7-14 à F-S7-17 : 55, 77, 45 et 35 questions.
		expect(
			['business-plan', 'projet-agricole', 'restructuration-credit', 'credit-immobilier'].map(
				(k) => parSlug.get(k)!.nombre_questions
			)
		).toEqual([55, 77, 45, 35]);
		expect(r.body.map((x: { prefixe: string }) => x.prefixe)).toEqual([
			'ABP',
			'APA',
			'ARC',
			'ACI'
		]);

		const bp = parSlug.get('business-plan')!.sections as unknown as {
			titre: string;
			groupes: { titre: string | null }[];
		}[];
		expect(bp).toHaveLength(6);
		expect(bp[2]!.titre).toBe('Marché');
		expect(bp[2]!.groupes.map((g) => g.titre)).toEqual([
			null,
			'Le marché des produits finis',
			null,
			'Structure de la consommation',
			null
		]);

		const sections = parSlug.get('restructuration-credit')!.sections as unknown as {
			groupes: { titre: string | null; questions: { zone: number }[] }[];
		}[];
		const rc = sections.at(-1)!.groupes.at(-1)!;
		expect(rc.titre).toBe("Point sur l'environnement du projet");
		expect(rc.questions.at(-1)!.zone).toBe(48);

		expect((await client().get('/api/accompagnement/questionnaires/inconnu')).status).toBe(404);
	});
});

describe('objet du dossier', () => {
	it('exige 10 caractères et refuse le doublon', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const court = await nouveau(h, { objet: 'Trop cour' }); // 9 caractères
		expect(court.status).toBe(400);
		expect(court.body.message).toBe("Veuillez indiquer l'objet avec 10 caractères minimum.");

		const r = await nouveau(h);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^ARC/);
		expect(r.body.message).toBe(
			'Votre accompagnement de restructuration de crédit est sauvegardé.'
		);

		const doublon = await nouveau(h);
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toContain('déjà enregistrée');
	});
});

describe('réponses', () => {
	it('enregistre et recharge toutes les zones, question 48 comprise (correctif S7a)', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		const reponses: Record<string, string> = {};
		for (let z = 4; z <= 48; z++) reponses[String(z)] = `Réponse ${z}`;

		const r = await nouveau(h, { reponses: { ...reponses, '99': 'zone inconnue' }, envoyer: true });
		expect(r.status).toBe(201);
		expect(r.body.message).toContain('enregistré et envoyé');

		let d = (await client().get(`/api/accompagnement/${r.body.id}`).set(h)).body;
		expect(d.reponses['48']).toBe('Réponse 48');
		expect(d.reponses).not.toHaveProperty('99');
		expect(d.nombre_repondues).toBe(45);
		expect(d.nombre_questions).toBe(45);
		expect(d.etat).toBe(2);

		// Modification effective (le legacy ne modifiait rien).
		const maj = { ...reponses, '48': "Compte d'exploitation mis à jour", '10': '' };
		const m = await client()
			.put(`/api/accompagnement/${d.id}`)
			.set(h)
			.send({ objet: d.objet, reponses: maj });
		expect(m.status).toBe(200);
		expect(m.body.message).toBe('Modification effectuée.');

		d = (await client().get(`/api/accompagnement/${d.id}`).set(h)).body;
		expect(d.reponses['48']).toBe("Compte d'exploitation mis à jour");
		expect(d.nombre_repondues).toBe(44);
		expect(d.etat).toBe(2); // un dossier envoyé le reste
	});
});

describe('brouillon puis envoi', () => {
	it('distingue « Sauvegarder » et « Envoyer »', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');
		const id = (await nouveau(h, { type: 1, objet: 'Boulangerie de quartier' })).body.id;
		expect((await client().get(`/api/accompagnement/${id}`).set(h)).body.etat).toBe(1);

		const r = await client()
			.put(`/api/accompagnement/${id}`)
			.set(h)
			.send({ objet: 'Boulangerie de quartier', envoyer: true });
		expect(r.body.message).toContain('enregistré et envoyé');
		expect((await client().get(`/api/accompagnement/${id}`).set(h)).body.etat).toBe(2);
	});
});

describe('listes, droits et validation par le conseiller', () => {
	it('cloisonne les dossiers et prévient le membre', async () => {
		await creerMembre('awa');
		await creerMembre('autre');
		await creerMembre('conseiller', {
			type_compte: TypeMembre.GESTIONNAIRE,
			droit_activation: true,
			telephone: '061234567'
		});
		const h = await entetes('awa');
		const ha = await entetes('autre');
		const hg = await entetes('conseiller');

		const id = (
			await nouveau(h, { type: 4, objet: 'Immeuble de rapport à Moungali', envoyer: true })
		).body.id;
		await nouveau(ha, { type: 4, objet: 'Villa à louer à Pointe-Noire' });

		expect((await client().get('/api/accompagnement?type=4').set(h)).body.total).toBe(1);
		expect((await client().get('/api/accompagnement?type=4').set(hg)).body.total).toBe(2);
		expect((await client().get('/api/accompagnement?type=4&q=Moungali').set(hg)).body.total).toBe(1);

		// Pas de consultation du dossier d'un autre membre (correctif S7-3).
		expect((await client().get(`/api/accompagnement/${id}`).set(ha)).status).toBe(404);
		expect((await client().get(`/api/accompagnement/${id}`).set(h)).body.contact).toBeNull();
		expect(
			(await client().get(`/api/accompagnement/${id}`).set(hg)).body.contact.pseudonyme
		).toBe('awa');

		// Validation par le conseiller : le membre est prévenu et ne modifie plus un dossier traité.
		expect(
			(await client().post(`/api/accompagnement/${id}/etat`).set(h).send({ etat: 4 })).status
		).toBe(403);
		expect(
			(await client().post(`/api/accompagnement/${id}/etat`).set(hg).send({ etat: 4 })).status
		).toBe(200);
		expect((await client().get('/api/espace/compteurs').set(h)).body.messages_non_lus).toBe(1);

		const bloque = await client()
			.put(`/api/accompagnement/${id}`)
			.set(h)
			.send({ objet: 'Immeuble de rapport à Moungali' });
		expect([400, 403]).toContain(bloque.status);

		expect((await client().get('/api/accompagnement/compteurs').set(h)).body.par_type['4']).toBe(1);
		expect((await client().get('/api/accompagnement')).status).toBe(401);
	});
});
