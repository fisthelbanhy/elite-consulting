/**
 * Likelemba : groupes, adhésions, cotisations par paiement type 5, reçus
 * (portage de `tests/test_likelemba.py` ; F-S4-27 à F-S4-44, ADR-0007 S4b).
 */
import { describe, expect, it } from 'vitest';
import { basePropre, client, creerMembre, entetes } from './aides.js';
import { db } from '../src/db.js';
import { TypeMembre } from '../src/enums.js';
import { cotisationLikelemba } from '../src/schema/fonds.js';

basePropre();

const GROUPE = {
	montant_cotisation: 10_000,
	periodicite: 3,
	date_debut: '2026-01-15',
	observation: 'Commerçantes du marché Total'
};

const ADHESION = {
	caution_nom: 'Moukala Jean',
	caution_est_membre: true,
	caution_piece_identite: 'CNI 123456',
	caution_adresse: 'Poto-Poto',
	caution_activite: 'Commerçant',
	caution_telephone: '05 555 12 12',
	temoins: [
		{
			nom: 'Nkounkou Marie',
			telephone: '061112233',
			emploi: 'Couturière',
			est_membre: false
		},
		{ nom: '', telephone: '', emploi: '' }
	]
};

async function admin() {
	await creerMembre('admin', {
		type_compte: TypeMembre.GESTIONNAIRE,
		droit_activation: true,
		droit_caisse: true
	});
	return entetes('admin');
}

async function creerGroupe(
	h: Record<string, string>,
	responsableId: number,
	remplacements: Record<string, unknown> = {}
) {
	const r = await client()
		.post('/api/likelemba')
		.set(h)
		.send({ ...GROUPE, responsable_id: responsableId, ...remplacements });
	expect(r.status).toBe(201);
	return r.body.id as number;
}

describe('création', () => {
	it('est réservée au gestionnaire habilité et applique les règles', async () => {
		const chef = await creerMembre('chef');
		await creerMembre('admin_sans_droit', { type_compte: TypeMembre.GESTIONNAIRE });
		const hg = await admin();

		for (const identifiant of ['chef', 'admin_sans_droit']) {
			const r = await client()
				.post('/api/likelemba')
				.set(await entetes(identifiant))
				.send({ ...GROUPE, responsable_id: chef });
			expect(r.status).toBe(403);
		}

		const vide = await client().post('/api/likelemba').set(hg).send({ montant_cotisation: 0 });
		expect(vide.status).toBe(400);
		expect(vide.body.champs).toEqual({
			responsable_id: 'Veuillez indiquer le responsable du likelemba.',
			montant_cotisation: 'Le montant de participation ne peut être 0.',
			periodicite: 'Veuillez indiquer la périodicité du likelemba.'
		});

		const r = await client()
			.post('/api/likelemba')
			.set(hg)
			.send({ ...GROUPE, responsable_id: chef });
		expect(r.status).toBe(201);
		expect(r.body.reference).toMatch(/^LKB/);
		expect(
			(
				await client()
					.post('/api/likelemba')
					.set(hg)
					.send({ ...GROUPE, responsable_id: chef })
			).status
		).toBe(400);

		// Unicité arbitrée (F-S4-31) : responsable + montant + périodicité + date de début ;
		// deux groupes sans observation sont désormais possibles.
		const sansObs = {
			...GROUPE,
			observation: '',
			responsable_id: chef,
			date_debut: '2026-03-01'
		};
		expect((await client().post('/api/likelemba').set(hg).send(sansObs)).status).toBe(201);
		expect(
			(
				await client()
					.post('/api/likelemba')
					.set(hg)
					.send({ ...sansObs, montant_cotisation: 5_000 })
			).status
		).toBe(201);

		// Le responsable est prévenu.
		expect(
			(
				await client()
					.get('/api/espace/compteurs')
					.set(await entetes('chef'))
			).body.messages_non_lus
		).toBe(3);
	});

	it('filtre la liste avec une seule borne de montant (F-S4-27)', async () => {
		const chef = await creerMembre('chef');
		const hg = await admin();
		await creerGroupe(hg, chef);
		await creerGroupe(hg, chef, { montant_cotisation: 50_000, observation: 'Fonctionnaires' });

		expect((await client().get('/api/likelemba')).body.total).toBe(2);
		expect((await client().get('/api/likelemba?montant_min=20000')).body.total).toBe(1);
		expect((await client().get('/api/likelemba?montant_max=20000')).body.total).toBe(1);
		expect((await client().get('/api/likelemba/compteurs')).body.groupes).toBe(2);
	});
});

describe('adhésion', () => {
	it('numérote les adhérents, valide caution et témoins, refuse le doublon', async () => {
		const chef = await creerMembre('chef');
		await creerMembre('awa', { pseudonyme: 'awa' });
		const autre = await creerMembre('bob');
		const hg = await admin();
		const gid = await creerGroupe(hg, chef);
		const code = (await client().get(`/api/likelemba/${gid}`)).body.code;
		const ha = await entetes('awa');

		// Un membre ne peut pas inscrire quelqu'un d'autre.
		expect(
			(await client().post(`/api/likelemba/${gid}/adhesions`).set(ha).send({ membre_id: autre }))
				.status
		).toBe(403);

		const telInvalide = await client()
			.post(`/api/likelemba/${gid}/adhesions`)
			.set(ha)
			.send({ ...ADHESION, caution_telephone: '123' });
		expect(telInvalide.status).toBe(400);
		expect(telInvalide.body.champs).toHaveProperty('caution_telephone');

		const r = await client().post(`/api/likelemba/${gid}/adhesions`).set(ha).send(ADHESION);
		expect(r.status).toBe(201);
		expect(r.body.reference).toBe(`1${code}`);
		const adhesion = r.body.id;

		const doublon = await client()
			.post(`/api/likelemba/${gid}/adhesions`)
			.set(ha)
			.send(ADHESION);
		expect(doublon.status).toBe(400);
		expect(doublon.body.message).toBe('Ce membre est déjà enregistré dans ce likelemba.');

		// Le gestionnaire inscrit un autre membre (décision F-S4-36).
		const parAdmin = await client()
			.post(`/api/likelemba/${gid}/adhesions`)
			.set(hg)
			.send({ membre_id: autre, date_entree: '2026-01-10' });
		expect(parAdmin.status).toBe(201);
		expect(parAdmin.body.reference).toBe(`2${code}`);

		let fiche = (await client().get(`/api/likelemba/adhesions/${adhesion}`).set(ha)).body;
		expect(fiche.caution_est_membre).toBe(true);
		expect(fiche.caution_telephone).toBe('055551212');
		expect(fiche.temoins).toEqual([
			{ nom: 'Nkounkou Marie', telephone: '061112233', emploi: 'Couturière', est_membre: false }
		]);
		expect(fiche.ordre).toBe(1);
		expect(fiche.date_entree).not.toBeNull();

		// Fiche réservée : adhérent, responsable, gestionnaire.
		expect(
			(
				await client()
					.get(`/api/likelemba/adhesions/${adhesion}`)
					.set(await entetes('bob'))
			).status
		).toBe(403);
		expect(
			(
				await client()
					.get(`/api/likelemba/adhesions/${adhesion}`)
					.set(await entetes('chef'))
			).status
		).toBe(200);

		// L'adhérent modifie ses témoins.
		expect(
			(
				await client()
					.put(`/api/likelemba/adhesions/${adhesion}`)
					.set(ha)
					.send({ ...ADHESION, caution_est_membre: false })
			).status
		).toBe(200);
		fiche = (await client().get(`/api/likelemba/adhesions/${adhesion}`).set(ha)).body;
		expect(fiche.caution_est_membre).toBe(false);

		const groupe = (await client().get(`/api/likelemba/${gid}`).set(ha)).body;
		expect(groupe.nombre_adherents).toBe(2);
		expect(groupe.compteur_entrees).toBe(2);
		expect(groupe.cagnotte).toBe(20_000);
		expect(groupe.mon_adhesion_id).toBe(adhesion);
		expect(groupe.peut_adherer).toBe(false);

		// Calendrier indicatif : un bénéficiaire par tour, dans l'ordre d'entrée, tous les mois.
		expect(
			groupe.calendrier.map((e: { tour: number; date: string; beneficiaire: string }) => [
				e.tour,
				e.date,
				e.beneficiaire
			])
		).toEqual([
			[1, '2026-01-15', 'awa'],
			[2, '2026-02-15', 'bob']
		]);
	});
});

describe('cotisation (paiement type 5)', () => {
	it('impose le montant du groupe et numérote les reçus (F-S4-41/43)', async () => {
		const chef = await creerMembre('chef');
		await creerMembre('awa');
		await creerMembre('curieux');
		const hg = await admin();
		const gid = await creerGroupe(hg, chef);
		const code = (await client().get(`/api/likelemba/${gid}`)).body.code;
		const ha = await entetes('awa');
		const adhesion = (await client().post(`/api/likelemba/${gid}/adhesions`).set(ha).send({}))
			.body.id;

		const prep = (
			await client().get(`/api/paiements/preparer?type_objet=5&objet_id=${adhesion}`).set(ha)
		).body;
		expect(prep.montant).toBe(10_000);
		expect(prep.libelle).toContain(code);
		expect(prep.retour).toBe(`/likelemba/${gid}/cotiser?adhesion=${adhesion}`);

		// Un tiers ne peut pas payer pour cette adhésion.
		const corps = { type_objet: 5, objet_id: adhesion, mode: 1, remarque: '' };
		expect(
			(
				await client()
					.post('/api/paiements')
					.set(await entetes('curieux'))
					.send(corps)
			).status
		).toBe(403);

		// Le montant est imposé (celui du groupe choisi).
		const p1 = (
			await client()
				.post('/api/paiements')
				.set(ha)
				.send({ ...corps, montant: 1 })
		).body.id;
		const p2 = (
			await client()
				.post('/api/paiements')
				.set(hg)
				.send({ ...corps, mode: 3, remarque: 'MP123456789' })
		).body.id;

		let fiche = (await client().get(`/api/likelemba/adhesions/${adhesion}`).set(ha)).body;
		// Reçus uniques non tronqués (F-S4-43).
		expect(
			fiche.cotisations.map((c: { numero_recu: string }) => c.numero_recu).sort()
		).toEqual([`${code}P1`, `${code}P2`]);
		expect(fiche.total_cotisations).toBe(20_000);
		// F-S4-42 : cotisation rattachée à l'adhérent, caissier = payeur.
		expect(
			new Set(fiche.cotisations.map((c: { nom_caissier: string }) => c.nom_caissier))
		).toEqual(new Set(['awa', 'admin']));
		expect(
			fiche.cotisations.every(
				(c: { montant: number; etat: number }) => c.montant === 10_000 && c.etat === 1
			)
		).toBe(true);

		// Confirmation → validée ; rejet → cotisation annulée, exclue du total.
		await client().post(`/api/paiements/${p1}/confirmer`).set(hg);
		await client().post(`/api/paiements/${p2}/rejeter`).set(hg);
		fiche = (await client().get(`/api/likelemba/adhesions/${adhesion}`).set(ha)).body;
		expect(
			Object.fromEntries(
				fiche.cotisations.map((c: { numero_recu: string; etat: number }) => [
					c.numero_recu,
					c.etat
				])
			)
		).toEqual({ [`${code}P1`]: 2, [`${code}P2`]: 3 });
		expect(fiche.total_cotisations).toBe(10_000);

		// Historique du groupe : adhérents, responsable, gestionnaires seulement.
		expect(
			(
				await client()
					.get(`/api/likelemba/${gid}`)
					.set(await entetes('curieux'))
			).body.cotisations
		).toBeNull();
		expect((await client().get(`/api/likelemba/${gid}`)).body.cotisations).toBeNull();
		const groupe = (
			await client()
				.get(`/api/likelemba/${gid}`)
				.set(await entetes('chef'))
		).body;
		expect(groupe.total_cotisations).toBe(10_000);
		expect(groupe.cotisations).toHaveLength(2);
		// Le responsable voit les remarques.
		expect(groupe.cotisations[0].observation).not.toBeNull();
	});

	it("refuse la cotisation d'une adhésion en attente", async () => {
		const chef = await creerMembre('chef');
		await creerMembre('awa');
		const hg = await admin();
		const gid = await creerGroupe(hg, chef);
		const ha = await entetes('awa');
		const adhesion = (await client().post(`/api/likelemba/${gid}/adhesions`).set(ha).send({}))
			.body.id;

		expect(
			(await client().post(`/api/likelemba/adhesions/${adhesion}/etat`).set(ha).send({ etat: 1 }))
				.status
		).toBe(403);
		expect(
			(await client().post(`/api/likelemba/adhesions/${adhesion}/etat`).set(hg).send({ etat: 1 }))
				.status
		).toBe(200);

		const r = await client()
			.post('/api/paiements')
			.set(ha)
			.send({ type_objet: 5, objet_id: adhesion, mode: 1 });
		expect(r.status).toBe(400);
		expect(r.body.message).toContain('attente');
	});
});

describe('validation de reçu', () => {
	it('régénère un reçu legacy tronqué (F-S4-44)', async () => {
		const chef = await creerMembre('chef');
		const awa = await creerMembre('awa');
		await creerMembre('curieux');
		const hg = await admin();
		const gid = await creerGroupe(hg, chef);
		const adhesion = (
			await client()
				.post(`/api/likelemba/${gid}/adhesions`)
				.set(await entetes('awa'))
				.send({})
		).body.id;
		const code = (await client().get(`/api/likelemba/${gid}`)).body.code;

		// Cotisation reprise du legacy avec un reçu tronqué (« LKB…P », varchar(10)).
		const cid = db
			.insert(cotisationLikelemba)
			.values({
				groupe_id: gid,
				adhesion_id: adhesion,
				caissier_id: awa,
				numero_recu: `${code.slice(0, 9)}P`,
				montant: 10_000,
				etat: 1
			})
			.returning({ id: cotisationLikelemba.id })
			.get()!.id;

		const hc = await entetes('chef');
		const groupe = (await client().get(`/api/likelemba/${gid}`).set(hc)).body;
		expect(groupe.cotisations[0].recu_valide).toBe(false);
		expect(groupe.cotisations[0].peut_valider).toBe(true);

		expect(
			(
				await client()
					.post(`/api/likelemba/cotisations/${cid}/valider`)
					.set(await entetes('curieux'))
			).status
		).toBe(403);
		const r = await client().post(`/api/likelemba/cotisations/${cid}/valider`).set(hc);
		expect(r.status).toBe(200);
		expect(r.body.reference).toBe(`${code}P1`);

		const ligne = (await client().get(`/api/likelemba/${gid}`).set(hc)).body.cotisations[0];
		expect(ligne.recu_valide).toBe(true);
		expect(ligne.etat).toBe(2);
		expect(ligne.peut_valider).toBe(false);
	});
});

describe('modification du groupe', () => {
	it('permet la passation de responsabilité', async () => {
		const chef = await creerMembre('chef');
		const autre = await creerMembre('autre');
		const hg = await admin();
		const gid = await creerGroupe(hg, chef);
		const corps = { ...GROUPE, responsable_id: chef, montant_cotisation: 15_000 };

		expect(
			(
				await client()
					.put(`/api/likelemba/${gid}`)
					.set(await entetes('autre'))
					.send(corps)
			).status
		).toBe(403);
		expect(
			(
				await client()
					.put(`/api/likelemba/${gid}`)
					.set(await entetes('chef'))
					.send(corps)
			).status
		).toBe(200);
		expect((await client().get(`/api/likelemba/${gid}`)).body.montant_cotisation).toBe(15_000);

		expect(
			(
				await client()
					.put(`/api/likelemba/${gid}`)
					.set(await entetes('chef'))
					.send({ ...corps, responsable_id: autre })
			).status
		).toBe(200);
		expect((await client().get(`/api/likelemba/${gid}`)).body.responsable.id).toBe(autre);

		// Liste des membres pour choisir : gestionnaires et responsables seulement.
		expect(
			(
				await client()
					.get('/api/likelemba/membres')
					.set(await entetes('chef'))
			).status
		).toBe(403);
		expect((await client().get('/api/likelemba/membres').set(hg)).body).toHaveLength(3);
	});
});
