/**
 * Registre des routeurs (portage de `app/routers/__init__.py`).
 *
 * Chaque module de domaine expose `routeur` et `prefixe` ; ce registre les monte tous sous
 * `/api`. Un module = un fichier, comme côté Python (voir docs/CONVENTIONS.md).
 */
import type { Router } from 'express';
import * as auth from './auth.js';

export interface ModuleRoute {
	prefixe: string;
	routeur: Router;
}

export const ROUTEURS: ModuleRoute[] = [auth];
