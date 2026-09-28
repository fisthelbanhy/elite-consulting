/** Vérifications du socle : schéma applicable, pagination, recherche, visibilité, références. */
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, JourSeul, serialiserDate, sqlite } from '../src/db.js';
import { appliquerMigrations } from '../src/scripts/migrer.js';
import { paginer, recherche, visibilite } from '../src/services/fiches.js';
import { nouvelleReference, Prefixe } from '../src/services/references.js';
import { article } from '../src/schema/commerce.js';
import { parametre } from '../src/schema/core.js';
import { membre } from '../src/schema/membres.js';
import { Etat } from '../src/enums.js';

beforeAll(() => {
	appliquerMigrations();
	db.insert(parametre).values({ id: 1 }).run();
	db.insert(membre).values({ id: 1, nom: 'Auteur', identifiant: 'auteur', mot_de_passe_hash: 'x' }).run();
	for (let i = 1; i <= 25; i++) {
		db.insert(article).values({
			libelle: `Chaise numéro ${i}`, auteur_id: 1,
			etat: i <= 20 ? Etat.AUTORISE : Etat.NON_TRAITE
		}).run();
	}
	db.insert(article).values({ libelle: 'Table basse', auteur_id: 1, etat: Etat.AUTORISE }).run();
});

describe('pagination', () => {
	it('compte le total et renvoie une page', () => {
		const r = paginer<{ id: number }>(
			db.select().from(article).where(eq(article.etat, Etat.AUTORISE)).$dynamic(),
			{ page: 2, taille: 10, offset: 10 }
		);
		expect(r.total).toBe(21); // 20 chaises publiées + 1 table
		expect(r.items).toHaveLength(10);
		expect(r.page).toBe(2);
	});
});

describe('recherche', () => {
	it('trouve sans tenir compte de la casse', () => {
		const r = paginer<{ libelle: string }>(
			db.select().from(article).where(recherche('CHAISE', article.libelle)).$dynamic(),
			{ page: 1, taille: 100, offset: 0 }
		);
		expect(r.total).toBe(25);
	});
	it('ne filtre pas si le terme est vide', () => {
		expect(recherche('   ', article.libelle)).toBeUndefined();
	});
});

describe('visibilité', () => {
	const gestionnaire = { id: 9, type_compte: 1 } as never;
	const visiteur = null;
	it('le gestionnaire voit tout', () => {
		expect(visibilite({ etat: article.etat, auteur: article.auteur_id }, gestionnaire)).toBeUndefined();
	});
	it('le visiteur ne voit que les fiches publiées', () => {
		const r = paginer<unknown>(
			db.select().from(article).where(visibilite({ etat: article.etat, auteur: article.auteur_id }, visiteur)).$dynamic(),
			{ page: 1, taille: 100, offset: 0 }
		);
		expect(r.total).toBe(21);
	});
	it("l'auteur voit aussi ses fiches non publiées", () => {
		const auteur = { id: 1, type_compte: 3 } as never;
		const r = paginer<unknown>(
			db.select().from(article).where(visibilite({ etat: article.etat, auteur: article.auteur_id }, auteur)).$dynamic(),
			{ page: 1, taille: 100, offset: 0 }
		);
		expect(r.total).toBe(26);
	});
});

describe('références', () => {
	it('reprend le format du legacy PRÉFIXE+mois+compteur+année', () => {
		const r = nouvelleReference(Prefixe.ARTICLE, new Date(2017, 10, 15));
		expect(r).toBe('ACL11117');
		expect(nouvelleReference(Prefixe.ARTICLE, new Date(2017, 10, 15))).toBe('ACL11217');
	});
});

describe('base', () => {
	it('crée bien les 62 tables du schéma legacy', () => {
		// `__drizzle_migrations` est le journal des migrations, il ne fait pas partie du schéma.
		const n = sqlite
			.prepare(
				"select count(*) n from sqlite_master where type='table' " +
					"and name not like 'sqlite_%' and name <> '__drizzle_migrations'"
			)
			.get() as { n: number };
		expect(n.n).toBe(62);
	});
});

describe('dates en JSON', () => {
	it("reprend le format naïf de l'ancien backend (jamais d'UTC)", () => {
		// Une date-heure sort naïve, sans « Z » : le site la relit avec `new Date(…)` et doit
		// afficher l'heure telle qu'elle est enregistrée.
		expect(serialiserDate(new Date(2026, 8, 28, 14, 30, 5))).toBe('2026-09-28T14:30:05');
		expect(serialiserDate(new Date(2026, 8, 28, 14, 30, 5, 123))).toBe('2026-09-28T14:30:05.123');
		// Une date seule sort sans heure : sinon un `<input type="date">` resterait vide.
		expect(serialiserDate(new JourSeul(2026, 9, 15))).toBe('2026-10-15');
		// Et c'est bien ce que renvoie une colonne `DATE` relue en base.
		db.insert(membre)
			.values({
				id: 2, nom: 'Jour', identifiant: 'jour', mot_de_passe_hash: 'x',
				date_limite_master: new Date(2026, 9, 15)
			})
			.run();
		const lu = db.select().from(membre).where(eq(membre.id, 2)).get()!;
		expect(serialiserDate(lu.date_limite_master!)).toBe('2026-10-15');
	});
});
