/**
 * Trésorerie : placements, opérations bancaires, demandes de crédit et contentieux
 * (portage de `tests/test_tresorerie.py`).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { banque } from '../src/schema/core.js';
import { boiteDeTest } from '../src/services/emails.js';
import { idsBanques, serialiserBanques } from '../src/services/tresorerie.js';

basePropre();

beforeEach(() => {
	db.insert(banque)
		.values([
			{ id: 1, nom: 'Autres' },
			{ id: 2, sigle: 'BGFI', nom: 'BGFIBank Congo', email: 'ordres@bgfi.cg' },
			{ id: 3, sigle: 'LCB', nom: 'LCB Bank' },
			// id > 20 : impossible en legacy.
			{ id: 25, sigle: 'UBA', nom: 'UBA' }
		])
		.run();
	boiteDeTest.length = 0;
});

const PLACEMENT = {
	type_placement: 1,
	montant: 250000,
	duree_mois: 6,
	taux: 3.5,
	banques: [2, 25],
	observation: ''
};

const LIGNE = {
	date_operation: '2026-10-01',
	montant: 150000,
	devise: 1,
	type_operation: 5,
	banque_emettrice_id: 2,
	beneficiaire: 'Ets Mabiala',
	banque_beneficiaire_id: 3,
	banque_beneficiaire_adresse: 'Brazzaville'
};

const CREDIT = {
	montant: 5000000,
	objet: "Achat d'un four",
	duree_mois: 24,
	niveau_realisation: 40,
	garantie: 'Nantissement du matériel',
	delai_reponse_jours: 30,
	devis_global: '6 000 000',
	apport_propre: '1 000 000'
};

const CONTENTIEUX = {
	dette_compromise: 3000000,
	revenus_mensuels: 400000,
	charges_fixes: 150000,
	dette_compromise_detail: 'Prêt 2024',
	echeance_supportable: 120000
};

describe('accès', () => {
	it('est réservé aux membres connectés', async () => {
		for (const chemin of ['placements', 'operations', 'credits', 'contentieux', 'compteurs']) {
			expect((await client().get(`/api/tresorerie/${chemin}`)).status).toBe(401);
		}
	});
});

describe('placement', () => {
	it('exige type, montant, durée, taux et banques (F-S7-25/27)', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const vide = await client()
			.post('/api/tresorerie/placements')
			.set(h)
			.send({ type_placement: 0, montant: 0, duree_mois: 0, taux: 0 });
		expect(vide.status).toBe(400);
		expect(vide.body.champs).toEqual({
			type_placement: 'Indiquez le type de placement.',
			montant: 'Veuillez indiquer le montant à placer.',
			duree_mois: 'Veuillez indiquer la durée du placement.',
			taux: 'Veuillez indiquer le taux escompté.',
			banques: 'Veuillez indiquer la ou les banques.'
		});

		// La banque « Autres » n'est pas une banque de placement.
		expect(
			(
				await client()
					.post('/api/tresorerie/placements')
					.set(h)
					.send({ ...PLACEMENT, banques: [1] })
			).status
		).toBe(400);

		const r = await client().post('/api/tresorerie/placements').set(h).send(PLACEMENT);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^PCM/);
		expect(r.body.message).toBe('Le placement est enregistré.');

		const d = (await client().get(`/api/tresorerie/placements/${r.body.id}`).set(h)).body;
		expect(d.banques.map((b: { sigle: string }) => b.sigle)).toEqual(['BGFI', 'UBA']);
		expect(d.peut_annuler).toBe(true);

		// Deux placements sans observation ne sont plus un doublon ; deux identiques, oui.
		expect(
			(
				await client()
					.post('/api/tresorerie/placements')
					.set(h)
					.send({ ...PLACEMENT, montant: 300000 })
			).status
		).toBe(201);
		expect(
			(await client().post('/api/tresorerie/placements').set(h).send(PLACEMENT)).body.message
		).toBe('Placement déjà effectué.');
	});

	it('relit la chaîne positionnelle du legacy et écrit la nouvelle forme (F-S7-26)', () => {
		expect(idsBanques('0*0*0*0*0*0*0*0*0*9*0*0*0*0*0*0*0*0*0*0*0*')).toEqual([9]);
		expect(serialiserBanques([25, 2])).toBe('2*25');
	});
});

describe('visibilité et annulation', () => {
	it('cloisonne les fiches, prévient le titulaire et garde la fiche annulable', async () => {
		await creerMembre('awa');
		await creerMembre('autre');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');
		const ha = await entetes('autre');
		const hg = await entetes('admin');

		const id = (await client().post('/api/tresorerie/credits').set(h).send(CREDIT)).body.id;
		await client()
			.post('/api/tresorerie/credits')
			.set(ha)
			.send({ ...CREDIT, objet: 'Autre projet' });

		expect((await client().get('/api/tresorerie/credits').set(h)).body.total).toBe(1);
		expect((await client().get('/api/tresorerie/credits').set(hg)).body.total).toBe(2);
		expect((await client().get(`/api/tresorerie/credits/${id}`).set(ha)).status).toBe(404);
		expect((await client().delete(`/api/tresorerie/credits/${id}`).set(ha)).status).toBe(404);

		// État par le gestionnaire habilité : le membre est prévenu.
		expect(
			(await client().post(`/api/tresorerie/credits/${id}/etat`).set(h).send({ etat: 4 })).status
		).toBe(403);
		expect(
			(await client().post(`/api/tresorerie/credits/${id}/etat`).set(hg).send({ etat: 4 })).status
		).toBe(200);
		expect((await client().get('/api/espace/compteurs').set(h)).body.messages_non_lus).toBe(1);

		// Une fiche traitée n'est plus modifiable par son titulaire, mais reste annulable.
		expect((await client().put(`/api/tresorerie/credits/${id}`).set(h).send(CREDIT)).status).toBe(
			403
		);
		expect((await client().delete(`/api/tresorerie/credits/${id}`).set(h)).status).toBe(200);
		expect((await client().get('/api/tresorerie/credits').set(h)).body.total).toBe(0);
		expect((await client().get('/api/tresorerie/compteurs').set(hg)).body.credits).toBe(1);
	});
});

describe('demande de crédit', () => {
	it("affiche l'apport avec sa propre valeur (correctif F-S7-35)", async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		const vide = await client()
			.post('/api/tresorerie/credits')
			.set(h)
			.send({ montant: 0, objet: '', duree_mois: 0, garantie: '' });
		expect(new Set(Object.keys(vide.body.champs))).toEqual(
			new Set(['montant', 'objet', 'duree_mois', 'garantie'])
		);
		expect(vide.body.champs.montant).toBe('Indiquez le montant du crédit.');

		const r = await client().post('/api/tresorerie/credits').set(h).send(CREDIT);
		expect(r.body.message).toBe('Votre demande de crédit est enregistrée.');
		expect(r.body.reference).toMatch(/^DDC/);

		const d = (await client().get(`/api/tresorerie/credits/${r.body.id}`).set(h)).body;
		expect(d.apport_propre).toBe('1 000 000');
		expect(d.devis_global).toBe('6 000 000');

		expect(
			(await client().post('/api/tresorerie/credits').set(h).send(CREDIT)).body.message
		).toBe('Cette demande de crédit est déjà effectuée.');
		expect(
			(
				await client()
					.post('/api/tresorerie/credits')
					.set(h)
					.send({ ...CREDIT, delai_reponse_jours: 400 })
			).status
		).toBe(422);
	});
});

describe('contentieux', () => {
	it("n'est modifiable que par son titulaire et s'annule enfin (F-S7-24/36)", async () => {
		await creerMembre('awa');
		await creerMembre('autre');
		const h = await entetes('awa');

		const vide = await client()
			.post('/api/tresorerie/contentieux')
			.set(h)
			.send({ dette_compromise: 0, revenus_mensuels: 0 });
		expect(vide.body.champs).toEqual({
			dette_compromise: 'Veuillez indiquer le montant de la dette compromise.',
			revenus_mensuels: 'Veuillez indiquer le montant des revenus mensuels.'
		});

		const r = await client().post('/api/tresorerie/contentieux').set(h).send(CONTENTIEUX);
		expect(r.body.message).toBe('Ce contentieux est enregistré.');
		expect(r.body.reference).toMatch(/^CCT/);
		const id = r.body.id;

		expect(
			(await client().post('/api/tresorerie/contentieux').set(h).send(CONTENTIEUX)).body.message
		).toBe('Ce contentieux de crédit est déjà enregistré.');

		expect(
			(
				await client()
					.put(`/api/tresorerie/contentieux/${id}`)
					.set(await entetes('autre'))
					.send(CONTENTIEUX)
			).status
		).toBe(404);
		expect(
			(
				await client()
					.put(`/api/tresorerie/contentieux/${id}`)
					.set(h)
					.send({ ...CONTENTIEUX, charges_variables: 50000 })
			).status
		).toBe(200);
		expect(
			(await client().get(`/api/tresorerie/contentieux/${id}`).set(h)).body.charges_variables
		).toBe(50000);
		expect((await client().delete(`/api/tresorerie/contentieux/${id}`).set(h)).status).toBe(200);
	});
});

describe('opérations bancaires', () => {
	it('partagent une référence de lot et partent par e-mail à la banque émettrice', async () => {
		await creerMembre('awa', { nom: 'Awa Commerce' });
		const h = await entetes('awa');
		const lot = {
			lignes: [
				LIGNE,
				{
					...LIGNE,
					montant: 90000,
					type_operation: 2,
					banque_emettrice_id: null,
					banque_emettrice_nom: 'HSBC Paris',
					banque_emettrice_email: 'ops@hsbc.fr',
					banque_beneficiaire_id: 25
				},
				// Ligne vide ignorée.
				{}
			]
		};

		const r = await client().post('/api/tresorerie/operations').set(h).send(lot);
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^OPB/);
		expect(r.body.ids).toHaveLength(2);
		expect(r.body.emails).toBe(2);

		const liste = (
			await client().get(`/api/tresorerie/operations?reference=${r.body.reference}`).set(h)
		).body;
		expect(liste.total).toBe(2);
		expect(
			new Set(liste.items.map((o: { nom_banque_emettrice: string }) => o.nom_banque_emettrice))
		).toEqual(new Set(['BGFIBank Congo', 'HSBC Paris']));

		// E-mail « Programmation opérations bancaires » à la banque émettrice.
		expect(new Set(boiteDeTest.map((c) => c.destinataire))).toEqual(
			new Set(['ordres@bgfi.cg', 'ops@hsbc.fr'])
		);
		expect(boiteDeTest.every((c) => c.sujet === 'Programmation opérations bancaires')).toBe(true);
		const bgfi = boiteDeTest.find((c) => c.destinataire === 'ordres@bgfi.cg')!;
		expect(bgfi.texte).toContain('SOCIÉTÉ : Awa Commerce');
		expect(bgfi.texte).toContain('MONTANT : 150 000 FCFA');

		// Anti-doublon membre + date + montant + banque + bénéficiaire, signalé ligne par ligne.
		const doublon = await client()
			.post('/api/tresorerie/operations')
			.set(h)
			.send({ lignes: [LIGNE] });
		expect(doublon.status).toBe(400);
		expect(doublon.body.champs).toHaveProperty('lignes.0.montant');

		// Renvoi du mail depuis la fiche.
		const d = (await client().get(`/api/tresorerie/operations/${r.body.ids[0]}`).set(h)).body;
		expect(d.email_destinataire).toBe(true);
		expect(d.lot).toHaveLength(1);
		expect(d.sens).toBe('debit');
		expect(
			(await client().post(`/api/tresorerie/operations/${r.body.ids[0]}/mail`).set(h)).body.message
		).toBe('Mail envoyé.');
	});

	it('signale les lignes incomplètes au lieu de les ignorer (F-S7-30)', async () => {
		await creerMembre('awa');
		const h = await entetes('awa');

		expect(
			(await client().post('/api/tresorerie/operations').set(h).send({ lignes: [{}] })).status
		).toBe(400);

		const r = await client()
			.post('/api/tresorerie/operations')
			.set(h)
			.send({ lignes: [LIGNE, { montant: 1000, banque_emettrice_id: 1 }] });
		expect(r.status).toBe(400);
		expect(r.body.champs['lignes.1.date_operation'].startsWith('Ligne 2 :')).toBe(true);
		expect(r.body.champs).toHaveProperty('lignes.1.banque_emettrice_id');
		expect(r.body.champs).not.toHaveProperty('lignes.0.montant');

		// Un versement n'exige pas de banque bénéficiaire.
		expect(
			(
				await client()
					.post('/api/tresorerie/operations')
					.set(h)
					.send({ lignes: [{ ...LIGNE, type_operation: 3, banque_beneficiaire_id: null }] })
			).status
		).toBe(201);
	});

	it('enregistre enfin la date en modification et totalise par sens (F-S7-33)', async () => {
		await creerMembre('awa');
		await creerMembre('admin', { type_compte: TypeMembre.GESTIONNAIRE, droit_activation: true });
		const h = await entetes('awa');
		const hg = await entetes('admin');

		const ids = (
			await client()
				.post('/api/tresorerie/operations')
				.set(h)
				.send({ lignes: [LIGNE, { ...LIGNE, type_operation: 1, montant: 70000 }] })
		).body.ids;

		expect(
			(
				await client()
					.put(`/api/tresorerie/operations/${ids[0]}`)
					.set(h)
					.send({ ...LIGNE, date_operation: '2026-11-15' })
			).status
		).toBe(200);
		expect(
			(await client().get(`/api/tresorerie/operations/${ids[0]}`).set(h)).body.date_operation
		).toBe('2026-11-15');

		// Filtres gestionnaire utilisables seuls ; banque opérante (émettrice ou bénéficiaire).
		expect(
			(await client().get('/api/tresorerie/operations?montant_min=100000').set(hg)).body.total
		).toBe(1);
		expect((await client().get('/api/tresorerie/operations?banque_id=3').set(hg)).body.total).toBe(
			2
		);
		expect(
			(await client().get('/api/tresorerie/operations?date_min=2026-11-01').set(hg)).body.total
		).toBe(1);

		const synthese = (await client().get('/api/tresorerie/operations/synthese').set(hg)).body;
		expect(
			new Set(synthese.map((x: { sens: string; total: number }) => `${x.sens}:${x.total}`))
		).toEqual(new Set(['debit:150000', 'credit:70000']));
	});
});
