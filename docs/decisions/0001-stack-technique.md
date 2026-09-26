# ADR-0001 — Stack technique : SvelteKit 2 / Svelte 5 + FastAPI

- **Statut** : Accepté — 2026-09-22
- **Remplace** : la tentative de migration Django + DRF décrite dans l'ancien `MIGRATION_STATUS.md`
  (dont le code `backend/`/`frontend/` n'existe plus ; seuls les dictionnaires de données ont été conservés).

## Contexte

Le site legacy (lafrangine.primera-c.net, dossier `lafrangine/V04/prog`) est écrit en PHP 5
procédural avec l'extension `mysql_*` (supprimée depuis PHP 7), sans framework, sans
séparation présentation/logique, avec des mots de passe stockés en clair. Il ne peut pas
être maintenu en l'état. Le porteur de projet demande explicitement SvelteKit 2.x / Svelte 5
et FastAPI.

## Décision

| Couche | Choix | Version installée |
|---|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (runes), TypeScript | kit 2.63, svelte 5.56, TS 6 |
| Style | Tailwind CSS 4 (+ plugins forms, typography), icônes `@lucide/svelte` | tailwind 4.3 |
| Build/serveur front | Vite 8, `@sveltejs/adapter-node` (déploiement Node derrière un reverse proxy) | |
| Backend | FastAPI + Pydantic v2 | fastapi 0.141, pydantic 2.13 |
| ORM / migrations | SQLAlchemy 2.0 (API typée `Mapped[]`, sessions synchrones) + Alembic | sqlalchemy 2.0.54 |
| Base de données | SQLite en développement, PostgreSQL en production (même code, via `DATABASE_URL`) | |
| Hachage | `pwdlib` + Argon2 (recommandation actuelle de la doc FastAPI) | |
| Images | Pillow (redimensionnement des photos, comme le legacy) | |
| Qualité | ruff, pytest + httpx (TestClient), svelte-check, eslint, prettier | |

Choix secondaires assumés :

- **Sessions SQLAlchemy synchrones** plutôt qu'async : FastAPI exécute les endpoints `def` dans un
  pool de threads ; pour le volume visé (quelques milliers de membres) c'est largement suffisant,
  et c'est plus simple et plus robuste (pas de pièges `lazy-load` en async).
- **Pas de bibliothèque de composants tierce** : composants maison sur Tailwind, éléments natifs
  (`<dialog>`, `<details>`) pour l'accessibilité. Moins de dépendances = site plus léger, ce qui
  compte pour des visiteurs sur réseau mobile lent.
- **Form actions SvelteKit** pour toutes les écritures : les formulaires fonctionnent même sans
  JavaScript (amélioration progressive via `use:enhance`) — important sur smartphones d'entrée de gamme.

## Conséquences

- Deux processus à déployer (Node pour SvelteKit, Uvicorn pour FastAPI) ; voir ADR-0002 pour le
  flux entre les deux.
- Le passage de SQLite à PostgreSQL ne demande que de changer `DATABASE_URL` et de lancer
  `alembic upgrade head`.
