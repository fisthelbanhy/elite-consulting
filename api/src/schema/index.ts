/**
 * Registre de toutes les tables (portage de `app/models/__init__.py`).
 *
 * Les 62 tables du schéma legacy, réparties dans les mêmes 9 fichiers que côté Python pour
 * que la correspondance reste évidente.
 */
export * from './commerce.js';
export * from './contenu.js';
export * from './core.js';
export * from './entreprises.js';
export * from './finance.js';
export * from './fonds.js';
export * from './membres.js';
export * from './opportunite.js';
export * from './rh.js';
