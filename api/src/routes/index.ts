/**
 * Registre des routeurs (portage de `app/routers/__init__.py`).
 *
 * Chaque module de domaine expose `routeur` et `prefixe` ; ce registre les monte tous sous
 * `/api`. Un module = un fichier, comme côté Python (voir docs/CONVENTIONS.md).
 */
import type { Router } from 'express';
import * as annonces from './annonces.js';
import * as auth from './auth.js';
import * as emplois from './emplois.js';
import * as espace from './espace.js';
import * as immobilier from './immobilier.js';
import * as paiements from './paiements.js';
import * as partenariats from './partenariats.js';
import * as referentiels from './referentiels.js';

export interface ModuleRoute {
	prefixe: string;
	routeur: Router;
}

export const ROUTEURS: ModuleRoute[] = [
	annonces,
	auth,
	emplois,
	espace,
	immobilier,
	paiements,
	partenariats,
	referentiels,
	{ prefixe: referentiels.prefixeVisites, routeur: referentiels.routeurVisites }
];
