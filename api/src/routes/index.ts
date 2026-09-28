/**
 * Registre des routeurs (portage de `app/routers/__init__.py`).
 *
 * Chaque module de domaine expose `routeur` et `prefixe` ; ce registre les monte tous sous
 * `/api`. Un module = un fichier, comme côté Python (voir docs/CONVENTIONS.md).
 */
import type { Router } from 'express';
import * as accompagnement from './accompagnement.js';
import * as annonces from './annonces.js';
import * as auth from './auth.js';
import * as boutique from './boutique.js';
import * as businessPlan from './business-plan.js';
import * as comparateur from './comparateur.js';
import * as conseilFinancier from './conseil-financier.js';
import * as contact from './contact.js';
import * as courses from './courses.js';
import * as decouverte from './decouverte.js';
import * as dialogues from './dialogues.js';
import * as distributeur from './distributeur.js';
import * as emplois from './emplois.js';
import * as entreprises from './entreprises.js';
import * as epargne from './epargne.js';
import * as espace from './espace.js';
import * as immobilier from './immobilier.js';
import * as marches from './marches.js';
import * as messages from './messages.js';
import * as paiements from './paiements.js';
import * as partenariats from './partenariats.js';
import * as projets from './projets.js';
import * as publicites from './publicites.js';
import * as questions from './questions.js';
import * as suggestions from './suggestions.js';
import * as tarifsBancaires from './tarifs-bancaires.js';
import * as referentiels from './referentiels.js';
import * as reussites from './reussites.js';

export interface ModuleRoute {
	prefixe: string;
	routeur: Router;
}

export const ROUTEURS: ModuleRoute[] = [
	accompagnement,
	annonces,
	auth,
	boutique,
	{ prefixe: boutique.prefixePanier, routeur: boutique.routeurPanier },
	{ prefixe: boutique.prefixeBienEtre, routeur: boutique.routeurBienEtre },
	businessPlan,
	comparateur,
	conseilFinancier,
	contact,
	courses,
	decouverte,
	dialogues,
	distributeur,
	emplois,
	entreprises,
	epargne,
	espace,
	immobilier,
	{ prefixe: marches.prefixeProjets, routeur: marches.routeurProjets },
	marches,
	messages,
	paiements,
	partenariats,
	projets,
	publicites,
	questions,
	referentiels,
	reussites,
	suggestions,
	tarifsBancaires,
	{ prefixe: referentiels.prefixeVisites, routeur: referentiels.routeurVisites }
];
