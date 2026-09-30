/**
 * Authentification, inscription, profil, mot de passe (portage de `app/routers/auth.py` ;
 * legacy : incl-connex.php, incl-membre.php, incl-formulairemembre.php, pmotpasoublie.php).
 */
import { and, eq, gte, ne, or, sql } from 'drizzle-orm';
import { Router, type Request } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { db } from '../db.js';
import { exigerMembre, membreRequis } from '../deps.js';
import { CategorieMembre, Etat, Sexe, TypeMembre } from '../enums.js';
import { ErreurMetier, erreur } from '../erreurs.js';
import { parametre, ville } from '../schema/core.js';
import {
	membre as tableMembre,
	reinitialisationMotDePasse,
	session as tableSession,
	tentativeConnexion,
	visiteMembre,
	type Membre
} from '../schema/membres.js';
import {
	champsProfilSchema,
	changementMotDePasseSchema,
	connexionSchema,
	inscriptionSchema,
	motDePasseOublieSchema,
	reinitialisationSchema,
	verificationsInscription,
	verificationsNouveauMotDePasse,
	vueMembreMoi,
	type ChampsProfil,
	type MembreMoi
} from '../schemas/membres.js';
import { ok, valider, type Ok } from '../schemas/commun.js';
import { hacherMotDePasse, hashJeton, nouveauJeton, verifierMotDePasse } from '../securite.js';
import { envoyerEnArrierePlan } from '../services/emails.js';
import {
	enregistrer as enregistrerFichier,
	IMAGE,
	supprimer as supprimerFichier
} from '../services/fichiers.js';
import { nouveauCodeMembre } from '../services/references.js';
import { normaliserTelephone } from '../services/validation.js';

export const routeur = Router();
export const prefixe = '/auth';

const televersement = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.uploadMaxOctets }
});

/** Adresse du visiteur : le BFF SvelteKit la relaie dans `X-Client-IP`. */
function ipClient(req: Request): string {
	const relayee = req.header('x-client-ip');
	return (relayee || req.ip || '').slice(0, 64);
}

interface ReponseSession {
	jeton: string;
	expire: Date;
	membre: MembreMoi;
}

/** Crée la session, journalise la connexion, renvoie le jeton en clair (une seule fois). */
function ouvrirSession(membre: Membre, ip: string, agent: string): ReponseSession {
	const [jeton, jetonHash] = nouveauJeton();
	const expire = new Date(Date.now() + config.sessionJours * 24 * 60 * 60 * 1000);
	const maintenant = new Date();
	db.transaction(() => {
		db.insert(tableSession)
			.values({
				membre_id: membre.id,
				jeton_hash: jetonHash,
				date_expiration: expire,
				adresse_ip: ip,
				agent: agent.slice(0, 255)
			})
			.run();
		db.insert(visiteMembre).values({ membre_id: membre.id, adresse_ip: ip }).run();
		db.update(tableMembre)
			.set({ derniere_connexion: maintenant })
			.where(eq(tableMembre.id, membre.id))
			.run();
	});
	membre.derniere_connexion = maintenant;
	return { jeton, expire, membre: vueMembreMoi(membre) };
}

function tropDeTentatives(cles: string[]): boolean {
	const depuis = new Date(Date.now() - config.loginFenetreMinutes * 60 * 1000);
	for (const cle of cles) {
		const ligne = db
			.select({ n: sql<number>`count(*)` })
			.from(tentativeConnexion)
			.where(and(eq(tentativeConnexion.cle, cle), gte(tentativeConnexion.date_heure, depuis)))
			.get();
		if ((ligne?.n ?? 0) >= config.loginMaxEchecs) return true;
	}
	return false;
}

// --- Connexion / déconnexion ---------------------------------------------------------------------

routeur.post('/login', async (req, res) => {
	const donnees = valider(connexionSchema, req.body);
	const ip = ipClient(req);
	const ident = donnees.identifiant.trim();
	const cles = [`id:${ident.toLowerCase()}`.slice(0, 120), `ip:${ip}`];

	if (tropDeTentatives(cles)) {
		throw new ErreurMetier(
			`Trop de tentatives. Réessayez dans ${config.loginFenetreMinutes} minutes.`,
			429
		);
	}

	// L'identifiant peut être le pseudo de connexion, l'e-mail ou le numéro de téléphone.
	const tel = normaliserTelephone(ident);
	const parTelephone = /^\d{9}$/.test(tel) ? eq(tableMembre.telephone, tel) : undefined;
	const membre = db
		.select()
		.from(tableMembre)
		.where(
			or(
				sql`lower(${tableMembre.identifiant}) = ${ident.toLowerCase()}`,
				sql`lower(${tableMembre.email}) = ${ident.toLowerCase()}`,
				...(parTelephone ? [parTelephone] : [])
			)
		)
		.get();

	// Seul l'état « Supprimé » bloque la connexion (règle legacy). Le hachage est calculé même
	// quand le compte est introuvable, pour que la réponse prenne le même temps dans tous les cas
	// et ne révèle donc pas l'existence d'un compte.
	const utilisable = membre && membre.etat !== Etat.SUPPRIME ? membre : null;
	const motDePasseValide = await verifierMotDePasse(
		donnees.mot_de_passe,
		utilisable?.mot_de_passe_hash ?? null
	);

	if (!utilisable || !motDePasseValide) {
		for (const cle of cles) db.insert(tentativeConnexion).values({ cle }).run();
		throw erreur('Identifiant ou mot de passe incorrect.', {
			mot_de_passe: 'Identifiant ou mot de passe incorrect.'
		});
	}

	db.delete(tentativeConnexion).where(eq(tentativeConnexion.cle, cles[0]!)).run();
	res.json(ouvrirSession(utilisable, ip, req.header('user-agent') ?? ''));
});

routeur.post('/logout', (req, res) => {
	const autorisation = req.header('authorization');
	if (autorisation?.toLowerCase().startsWith('bearer ')) {
		db.delete(tableSession)
			.where(eq(tableSession.jeton_hash, hashJeton(autorisation.slice(7).trim())))
			.run();
	}
	res.json(ok('Vous êtes déconnecté.'));
});

routeur.get('/me', membreRequis, (req, res) => {
	res.json(vueMembreMoi(exigerMembre(req)));
});

// --- Profil ---------------------------------------------------------------------------------------

/** Refuse la création d'un doublon, avec un message par champ concerné (comme le legacy). */
function verifierUnicite(
	donnees: ChampsProfil,
	identifiant: string | null,
	exclureId?: number
): void {
	const existe = (condition: ReturnType<typeof eq>): boolean => {
		const conditions = [condition, ne(tableMembre.etat, Etat.SUPPRIME)];
		if (exclureId) conditions.push(ne(tableMembre.id, exclureId));
		return !!db
			.select({ id: tableMembre.id })
			.from(tableMembre)
			.where(and(...conditions))
			.limit(1)
			.get();
	};

	const champs: Record<string, string> = {};
	if (
		identifiant &&
		existe(sql`lower(${tableMembre.identifiant}) = ${identifiant.toLowerCase()}`)
	) {
		champs.identifiant = 'Cet identifiant est déjà utilisé.';
	}
	if (existe(sql`lower(${tableMembre.pseudonyme}) = ${donnees.pseudonyme.trim().toLowerCase()}`)) {
		champs.pseudonyme = 'Ce pseudonyme est déjà utilisé.';
	}
	if (existe(eq(tableMembre.telephone, donnees.telephone))) {
		champs.telephone = 'Un compte existe déjà avec ce numéro. Utilisez « Mot de passe oublié ».';
	}
	if (donnees.email && existe(sql`lower(${tableMembre.email}) = ${donnees.email.toLowerCase()}`)) {
		champs.email = 'Un compte existe déjà avec cet e-mail.';
	}
	if (Object.keys(champs).length) throw erreur('Ce membre semble déjà inscrit.', champs);
}

/**
 * Pseudonyme public déduit du nom (inscription minimale, ADR-0008) : « Grace M. » pour une
 * personne, sigle pour une entreprise ; unicité assurée par un suffixe numérique.
 */
function genererPseudonyme(nom: string, categorie: number): string {
	const mots = nom
		.trim()
		.split(/[\s-]+/)
		.filter(Boolean);
	let base: string;
	if (categorie === CategorieMembre.MORALE) {
		base = mots
			.map((m) => m[0])
			.filter((c): c is string => !!c && /[\p{L}\p{N}]/u.test(c))
			.join('')
			.toUpperCase();
		if (base.length < 3) base = nom.replace(/\W/gu, '').toUpperCase().slice(0, 6);
	} else if (mots.length) {
		const dernier = mots[mots.length - 1]!;
		const initiale = mots.length > 1 ? ` ${mots[0]![0]!.toUpperCase()}.` : '';
		base = dernier.charAt(0).toUpperCase() + dernier.slice(1).toLowerCase() + initiale;
		if (base.length < 6) base = `${base} ${'x'.repeat(6 - base.length)}`.trim();
	} else {
		base = 'Membre';
	}

	let candidat = base;
	let n = 1;
	while (
		db
			.select({ id: tableMembre.id })
			.from(tableMembre)
			.where(sql`lower(${tableMembre.pseudonyme}) = ${candidat.toLowerCase()}`)
			.limit(1)
			.get()
	) {
		n += 1;
		candidat = `${base}${n}`;
	}
	return candidat;
}

/** Champs du profil à écrire, selon la catégorie (personne physique ou morale). */
function champsAEcrire(donnees: ChampsProfil, categorie: number, pseudonyme: string) {
	const communs = {
		nom: donnees.nom.trim(),
		pseudonyme: pseudonyme.trim(),
		telephone: donnees.telephone,
		email: donnees.email,
		ville_id: donnees.ville_id,
		adresse: donnees.adresse.trim(),
		numero_piece_identite: donnees.numero_piece_identite.trim()
	};
	if (categorie === CategorieMembre.PHYSIQUE) {
		const sexe =
			donnees.sexe === Sexe.FEMININ || donnees.sexe === Sexe.MASCULIN
				? donnees.sexe
				: Sexe.INDEFINI;
		return {
			...communs,
			sexe,
			situation_matrimoniale: donnees.situation_matrimoniale ?? null,
			nombre_enfants: donnees.nombre_enfants,
			employeur: donnees.employeur.trim(),
			type_partenaire: null,
			domaine_activite_id: null
		};
	}
	// Personne morale : sexe « Indéfini », pas d'enfants (règle legacy).
	return {
		...communs,
		sexe: Sexe.INDEFINI,
		situation_matrimoniale: null,
		nombre_enfants: 0,
		forme_juridique: donnees.forme_juridique ?? null,
		type_partenaire: donnees.type_partenaire ?? null,
		domaine_activite_id: donnees.domaine_activite_id ?? null
	};
}

/** Contrôles communs à l'inscription et à la mise à jour : ville connue, pseudonyme assez long. */
function preparerProfil(donnees: ChampsProfil, categorie: number, pseudonymeActuel = ''): string {
	const villeConnue = db
		.select({ id: ville.id })
		.from(ville)
		.where(eq(ville.id, donnees.ville_id))
		.get();
	if (!villeConnue) throw erreur('Ville inconnue.', { ville_id: 'Veuillez choisir une ville.' });

	let pseudonyme = donnees.pseudonyme.trim();
	if (!pseudonyme) pseudonyme = pseudonymeActuel || genererPseudonyme(donnees.nom, categorie);

	const minimum = categorie === CategorieMembre.PHYSIQUE ? 6 : 3;
	if (pseudonyme.length < minimum) {
		const quoi = categorie === CategorieMembre.PHYSIQUE ? 'Le pseudonyme' : 'Le sigle';
		throw erreur('Pseudonyme trop court.', {
			pseudonyme: `${quoi} doit contenir au moins ${minimum} caractères.`
		});
	}
	return pseudonyme;
}

routeur.post('/inscription', async (req, res) => {
	const donnees = valider(inscriptionSchema, req.body, verificationsInscription);

	// Anti-robot : champ piège rempli, ou formulaire soumis en moins de 3 secondes.
	if (donnees.site_web || (donnees.duree_saisie_ms > 0 && donnees.duree_saisie_ms < 3000)) {
		throw erreur('Inscription refusée. Si vous êtes un humain, réessayez calmement.');
	}

	const identifiant = donnees.identifiant.trim() || donnees.telephone;
	const pseudonyme = preparerProfil(donnees, donnees.categorie);
	verifierUnicite({ ...donnees, pseudonyme }, identifiant);

	const motDePasseHash = await hacherMotDePasse(donnees.mot_de_passe);
	const cree = db.transaction(() =>
		db
			.insert(tableMembre)
			.values({
				categorie: donnees.categorie,
				// Jamais gestionnaire à l'inscription publique.
				type_compte: TypeMembre.MEMBRE,
				identifiant,
				mot_de_passe_hash: motDePasseHash,
				// N'empêche pas la connexion (règle legacy).
				etat: Etat.NON_TRAITE,
				code_membre: nouveauCodeMembre(),
				...champsAEcrire(donnees, donnees.categorie, pseudonyme)
			})
			.returning()
			.get()
	);

	res.status(201).json(ouvrirSession(cree, ipClient(req), req.header('user-agent') ?? ''));
});

routeur.put('/profil', membreRequis, (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(champsProfilSchema, req.body);
	const pseudonyme = preparerProfil(donnees, membre.categorie, membre.pseudonyme);
	verifierUnicite({ ...donnees, pseudonyme }, null, membre.id);

	const misAJour = db
		.update(tableMembre)
		.set(champsAEcrire(donnees, membre.categorie, pseudonyme))
		.where(eq(tableMembre.id, membre.id))
		.returning()
		.get();
	res.json(vueMembreMoi(misAJour!));
});

routeur.post('/profil/photo', membreRequis, televersement.single('photo'), async (req, res) => {
	const membre = exigerMembre(req);
	if (!req.file) throw erreur('Aucun fichier reçu.', { photo: 'Veuillez choisir une image.' });

	const ancienne = membre.photo;
	const chemin = await enregistrerFichier(req.file.buffer, 'membres', new Set([IMAGE]), 'photo');
	const misAJour = db
		.update(tableMembre)
		.set({ photo: chemin })
		.where(eq(tableMembre.id, membre.id))
		.returning()
		.get();
	supprimerFichier(ancienne);
	res.json(vueMembreMoi(misAJour!));
});

// --- Mots de passe --------------------------------------------------------------------------------

routeur.post('/mot-de-passe', membreRequis, async (req, res) => {
	const membre = exigerMembre(req);
	const donnees = valider(changementMotDePasseSchema, req.body, verificationsNouveauMotDePasse);

	if (!(await verifierMotDePasse(donnees.actuel, membre.mot_de_passe_hash))) {
		throw erreur('Mot de passe actuel incorrect.', { actuel: 'Mot de passe actuel incorrect.' });
	}
	if (donnees.nouveau.toLowerCase() === membre.identifiant.toLowerCase()) {
		throw erreur('Mot de passe refusé.', {
			nouveau: "Le mot de passe doit être différent de l'identifiant."
		});
	}
	const hash = await hacherMotDePasse(donnees.nouveau);
	db.update(tableMembre)
		.set({ mot_de_passe_hash: hash })
		.where(eq(tableMembre.id, membre.id))
		.run();
	res.json(ok('Votre mot de passe a été modifié.'));
});

/**
 * Vérification croisée legacy (catégorie + nom + pseudo + téléphone). Le mot de passe n'est
 * JAMAIS affiché : lien par e-mail, ou demande transmise aux gestionnaires (ADR-0005).
 */
routeur.post('/mot-de-passe-oublie', (req, res) => {
	const donnees = valider(motDePasseOublieSchema, req.body);
	const tel = normaliserTelephone(donnees.telephone);

	const membre = db
		.select()
		.from(tableMembre)
		.where(
			and(
				eq(tableMembre.categorie, donnees.categorie),
				sql`lower(${tableMembre.nom}) = ${donnees.nom.trim().toLowerCase()}`,
				sql`lower(${tableMembre.pseudonyme}) = ${donnees.pseudonyme.trim().toLowerCase()}`,
				eq(tableMembre.telephone, tel),
				ne(tableMembre.etat, Etat.SUPPRIME)
			)
		)
		.get();

	// Réponse identique que le compte existe ou non : on ne révèle rien.
	const reponse: Ok = ok(
		'Si ces informations correspondent à un compte, vous allez être recontacté : ' +
			'par e-mail si une adresse est enregistrée, sinon par la frangine au numéro indiqué.'
	);
	if (!membre) {
		res.json(reponse);
		return;
	}

	if (membre.email) {
		const [jeton, jetonHash] = nouveauJeton();
		db.insert(reinitialisationMotDePasse)
			.values({
				membre_id: membre.id,
				jeton_hash: jetonHash,
				canal: 'email',
				date_expiration: new Date(Date.now() + config.resetMinutes * 60 * 1000)
			})
			.run();
		const lien = `${config.siteUrl}/reinitialiser/${jeton}`;
		const nomSite =
			db.select({ nom: parametre.nom_site }).from(parametre).where(eq(parametre.id, 1)).get()
				?.nom ?? 'La Frangine';
		envoyerEnArrierePlan(
			membre.email,
			`${nomSite} — réinitialisation de votre mot de passe`,
			`Bonjour ${membre.pseudonyme},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien ` +
				`(valable ${config.resetMinutes} minutes) :\n${lien}\n\n` +
				"Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nLa frangine"
		);
	} else {
		db.insert(reinitialisationMotDePasse)
			.values({ membre_id: membre.id, canal: 'gestionnaire' })
			.run();
	}
	res.json(reponse);
});

routeur.post('/reinitialiser', async (req, res) => {
	const donnees = valider(reinitialisationSchema, req.body, verificationsNouveauMotDePasse);
	const demande = db
		.select()
		.from(reinitialisationMotDePasse)
		.where(eq(reinitialisationMotDePasse.jeton_hash, hashJeton(donnees.jeton)))
		.get();

	const perimee =
		!demande ||
		demande.date_utilisation !== null ||
		(demande.date_expiration !== null && demande.date_expiration.getTime() < Date.now());
	if (perimee) throw erreur("Ce lien n'est plus valide. Refaites une demande.");

	const membre = db.select().from(tableMembre).where(eq(tableMembre.id, demande.membre_id)).get();
	if (!membre) throw erreur("Ce lien n'est plus valide. Refaites une demande.");

	if (donnees.nouveau.toLowerCase() === membre.identifiant.toLowerCase()) {
		throw erreur('Mot de passe refusé.', {
			nouveau: "Le mot de passe doit être différent de l'identifiant."
		});
	}

	const hash = await hacherMotDePasse(donnees.nouveau);
	db.transaction(() => {
		db.update(tableMembre)
			.set({ mot_de_passe_hash: hash })
			.where(eq(tableMembre.id, membre.id))
			.run();
		db.update(reinitialisationMotDePasse)
			.set({ date_utilisation: new Date() })
			.where(eq(reinitialisationMotDePasse.id, demande.id))
			.run();
		// Déconnecte partout : une réinitialisation invalide les sessions ouvertes.
		db.delete(tableSession).where(eq(tableSession.membre_id, membre.id)).run();
	});
	res.json(ok('Mot de passe modifié. Vous pouvez vous connecter.'));
});
