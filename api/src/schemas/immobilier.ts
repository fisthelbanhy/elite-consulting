/**
 * Schémas de l'immobilier (portage de `app/schemas/immobilier.py` ; legacy `immobilier`,
 * écrans S3-A1 à S3-A3) et éléments communs aux petites annonces (états, intérêts).
 */
import { z } from 'zod';
import type { immobilier } from '../schema/commerce.js';

export type Bien = typeof immobilier.$inferSelect;

/**
 * Plafond de surface : le legacy proposait 0–2000 m² (stockés en tinyint, donc tronqués à 127) ;
 * relevé pour les terrains, en entier standard (ADR-0004).
 */
export const SURFACE_MAX = 100_000;

export interface VilleOut {
	id: number;
	nom: string;
}

export interface QuartierOut {
	id: number;
	nom: string;
	ville: VilleOut | null;
}

export const bienEntreeSchema = z.object({
	offre_ou_recherche: z.coerce.number().int().default(0),
	type_transaction: z.coerce.number().int().default(0),
	type_bien: z.coerce.number().int().default(0),
	quartier_id: z.coerce.number().int().nullable().optional(),
	localisation: z.string().max(250).default(''),
	surface_m2: z.coerce.number().int().min(0).default(0),
	nombre_pieces: z.coerce.number().int().min(0).max(100).default(0),
	nombre_chambres: z.coerce.number().int().min(0).max(100).default(0),
	situation: z.coerce.number().int().default(0),
	prix: z.coerce.number().int().min(0).max(1_000_000_000_000).default(0),
	description: z.string().max(5000).default('')
});

export type BienEntree = z.output<typeof bienEntreeSchema>;

export const interetEntreeSchema = z.object({
	message: z.string().max(2000).default('')
});

export const etatEntreeSchema = z.object({
	etat: z.coerce.number().int().min(1).max(4)
});
