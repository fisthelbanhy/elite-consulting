/**
 * Développement uniquement : crée (si besoin) deux comptes de démonstration et affiche un jeton de
 * session pour chacun, à poser dans le cookie `lf_session` du navigateur.
 * Portage de `backend/scripts/comptes_demo.py`.
 *
 * Utile pour entrer directement dans le site sans passer par le formulaire, et sans toucher aux
 * comptes réels issus de la reprise.
 *
 * Usage (depuis `api/`) : `npm run comptes:demo`.
 */
import { randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db.js';
import { Etat, TypeMembre } from '../enums.js';
import { membre as tableMembre, session } from '../schema/membres.js';
import { ville } from '../schema/core.js';
import { hacherMotDePasse, nouveauJeton } from '../securite.js';

interface CompteDemo {
	identifiant: string;
	nom: string;
	pseudonyme: string;
	type_compte: number;
	telephone: string;
}

const COMPTES: CompteDemo[] = [
	{
		identifiant: 'demo.gestion',
		nom: 'Démo Gestion',
		pseudonyme: 'Frangine démo',
		type_compte: TypeMembre.GESTIONNAIRE,
		telephone: '069990001'
	},
	{
		identifiant: 'demo.membre',
		nom: 'Démo Membre',
		pseudonyme: 'Membre démo',
		type_compte: TypeMembre.MEMBRE,
		telephone: '069990002'
	}
];

if (config.environnement !== 'dev') {
	console.error("Refusé : script réservé à l'environnement de développement.");
	process.exit(1);
}

const premiereVille = db.select({ id: ville.id }).from(ville).orderBy(asc(ville.id)).get();

for (const compte of COMPTES) {
	let m = db
		.select()
		.from(tableMembre)
		.where(eq(tableMembre.identifiant, compte.identifiant))
		.get();

	if (!m) {
		const gestionnaire = compte.type_compte === TypeMembre.GESTIONNAIRE;
		m = db
			.insert(tableMembre)
			.values({
				...compte,
				ville_id: premiereVille?.id ?? null,
				etat: Etat.AUTORISE,
				categorie: 1,
				// Mot de passe tiré au hasard et jamais affiché : on entre par le jeton, pas par le
				// formulaire. Un compte de démonstration ne doit pas ouvrir une porte devinable.
				mot_de_passe_hash: await hacherMotDePasse(randomBytes(18).toString('base64url')),
				droit_attribution: gestionnaire,
				droit_caisse: gestionnaire,
				droit_activation: gestionnaire
			})
			.returning()
			.get();
	}

	const [jeton, empreinte] = nouveauJeton();
	db.insert(session)
		.values({
			membre_id: m.id,
			jeton_hash: empreinte,
			date_expiration: new Date(Date.now() + 86_400_000),
			agent: 'comptes-demo'
		})
		.run();
	console.log(`${compte.identifiant.padEnd(14)} (id ${m.id}) lf_session=${jeton}`);
}
