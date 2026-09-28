/**
 * Outil de migration : vérifie que les **mots de passe** repris par l'ancien script Python restent
 * valides pour le backend Express — et réciproquement.
 *
 * C'est la propriété la plus lourde de conséquences de toute la migration : si elle est fausse,
 * les 68 membres perdent l'accès à leur compte et il faut réinitialiser chaque mot de passe à la
 * main. Elle ne se déduit pas de la comparaison des bases : Argon2 tire un sel au hasard, donc les
 * hachages diffèrent forcément d'une reprise à l'autre — seule leur **vérification** peut être
 * comparée.
 *
 * Ce que le script contrôle, sur chaque base :
 * - le bon mot de passe est accepté ;
 * - un mauvais mot de passe est refusé (un « toujours vrai » passerait le premier contrôle) ;
 * - le code de pointage à 4 chiffres est accepté ;
 * - un membre sans mot de passe legacy porte bien le marqueur `!`, qu'aucun mot de passe ne valide.
 *
 * Usage : `npx tsx scripts/verifier-hachages.ts <base.sqlite3> [<base.sqlite3>…]`, avec des bases
 * issues du dump de synthèse (`dump-synthetique.ts`), où le mot de passe du membre n° i est
 * `motdepassei` et le code de pointage du membre n° 1 est `1234`.
 *
 * Comme les autres vérificateurs, il disparaîtra avec `backend/`.
 */
import Database from 'better-sqlite3';
import { verifierMotDePasse } from '../src/securite.js';

interface MembreRepris {
	id: number;
	identifiant: string;
	mot_de_passe_hash: string;
	code_pointage_hash: string | null;
}

const bases = process.argv.slice(2);
if (!bases.length) {
	throw new Error('Usage : npx tsx scripts/verifier-hachages.ts <base.sqlite3> [<base.sqlite3>…]');
}

let echecs = 0;

function controler(condition: boolean, description: string): void {
	if (condition) return;
	echecs += 1;
	console.log(`  ÉCHEC  ${description}`);
}

for (const chemin of bases) {
	console.log(`\n--- ${chemin}`);
	const db = new Database(chemin, { readonly: true });
	const membres = db
		.prepare(
			'select id, identifiant, mot_de_passe_hash, code_pointage_hash from membre order by id'
		)
		.all() as MembreRepris[];

	for (const m of membres) {
		// Le dump de synthèse laisse le dernier membre sans mot de passe : la reprise pose `!`,
		// qui n'est pas un hachage valide et n'ouvre donc aucune session.
		if (m.mot_de_passe_hash === '!') {
			controler(
				!(await verifierMotDePasse(`motdepasse${m.id}`, m.mot_de_passe_hash)),
				`membre#${m.id} sans mot de passe : aucune connexion possible`
			);
			console.log(`  membre#${m.id} ${m.identifiant} : sans mot de passe, marqueur « ! »`);
			continue;
		}

		const bon = await verifierMotDePasse(`motdepasse${m.id}`, m.mot_de_passe_hash);
		const mauvais = await verifierMotDePasse('mauvais mot de passe', m.mot_de_passe_hash);
		controler(bon, `membre#${m.id} : le mot de passe legacy est accepté`);
		controler(!mauvais, `membre#${m.id} : un mot de passe faux est refusé`);

		let pointage = 'sans code';
		if (m.code_pointage_hash) {
			const codeBon = await verifierMotDePasse('1234', m.code_pointage_hash);
			const codeFaux = await verifierMotDePasse('9999', m.code_pointage_hash);
			controler(codeBon, `membre#${m.id} : le code de pointage legacy est accepté`);
			controler(!codeFaux, `membre#${m.id} : un code de pointage faux est refusé`);
			pointage = 'code de pointage vérifié';
		}
		// L'algorithme est écrit dans la chaîne PHC elle-même : c'est ce qui rend les deux
		// implémentations interopérables, quels que soient leurs paramètres de coût.
		const algorithme = m.mot_de_passe_hash.split('$')[1] ?? '?';
		console.log(`  membre#${m.id} ${m.identifiant} : ${algorithme}, ${pointage}`);
	}
}

console.log(
	echecs === 0
		? '\nTous les mots de passe repris restent valides pour le backend Express.'
		: `\n${echecs} contrôle(s) en échec.`
);
if (echecs) process.exit(1);
