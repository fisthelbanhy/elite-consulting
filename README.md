# La Frangine — refonte 2026

« La grande sœur de ceux qui se lancent » : plateforme d'accompagnement des entrepreneurs
congolais (conseil, Likelemba, financement, opportunités), refonte complète du site PHP
lafrangine.primera-c.net.

| Couche | Technologie |
|---|---|
| Frontend | SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS 4 (`frontend/`) |
| Backend | FastAPI · Pydantic 2 · SQLAlchemy 2 · Alembic (`backend/`) |
| Base | SQLite en développement, PostgreSQL en production |

## Démarrer (Windows, Linux ou macOS)

Prérequis : Python 3.12+ et Node.js 22+.

```bash
npm run setup      # environnement Python, dépendances, base de démonstration
npm run dev:api    # API FastAPI     → http://127.0.0.1:8000/api/docs
npm run dev:site   # site SvelteKit  → http://localhost:5173
```

Comptes de démonstration : `demo.gestion` (gestionnaire), `demo.membre`, `demo.candidat`,
`demo.entreprise`, `demo.boutique` — mot de passe `demo1234`, code de pointage `1234`.

### Travailler sur les vraies données (poste local uniquement)

Le dump de production contient des données personnelles : il **n'est pas dans le dépôt** et ne
doit jamais y être ajouté (ADR-0012). Placez `cp1019011_lafrangine.sql` à la racine, puis :

```bash
npm run donnees:legacy   # recharge les 11 548 lignes du dump dans la base locale
```

Le rapport de reprise est écrit dans `backend/data/rapport-reprise.md`. Pour revenir aux données
de démonstration : `npm run donnees:demo`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run setup` | Installe tout (idempotent) |
| `npm run dev:api` / `npm run dev:site` | Serveurs de développement |
| `npm test` | Tests backend (pytest) |
| `npm run lint` | `ruff` sur le backend |
| `npm run check` | `svelte-check` sur le frontend |
| `npm run build` | Build de production du site |
| `npm run migration -- "description"` | Nouvelle migration Alembic (après modification d'un modèle) |
| `npm run donnees:demo` / `npm run donnees:legacy` | Jeu de démonstration / données de production |

## Configuration

| Variable | Rôle | Défaut |
|---|---|---|
| `LF_DATABASE_URL` | Base de données (ex. `postgresql+psycopg://…`) | SQLite `backend/data/lafrangine.sqlite3` |
| `LF_MEDIA_DIR` | Dossier des fichiers téléversés | `backend/media` |
| `LF_SITE_URL` | URL publique (liens des e-mails) | `http://localhost:5173` |
| `LF_ENVIRONNEMENT` | `dev` en développement ; autre valeur en production (bloque les scripts de démonstration) | `dev` |
| `LF_SMTP_*` | Envoi d'e-mails (sinon journalisés) | — |
| `BACKEND_URL` (frontend) | Adresse interne de l'API vue par SvelteKit | `http://127.0.0.1:8000` |
| `LF_COOKIE_SECRET` (frontend) | Signature du diagnostic en cours — **obligatoire en production** | aléatoire au démarrage |
| `ORIGIN` (frontend) | URL publique, exigée par adapter-node (protection CSRF) | — |

## Développer dans le cloud

Le dépôt contient un `.devcontainer` (Python 3.12 + Node 22) dont la commande de création est
`npm run setup`. Une session Claude Code cloud, un Codespace ou un nouveau poste obtiennent donc
un environnement complet, avec la base de démonstration, sans configuration manuelle.

## Production

- Base : `LF_DATABASE_URL=postgresql+psycopg://…` puis `npm run migration` / `alembic upgrade head`,
  ou reprise du dump legacy sur une base vide.
- API : `uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2` (non exposée publiquement).
- Frontend : `npm run build` puis `node frontend/build` (adapter-node), derrière un reverse proxy
  HTTPS avec compression gzip (ADR-0002).

## Documentation

Tout est dans [`docs/`](docs/README.md) : inventaire fonctionnel (483 points de recette), étude de
marché, décisions d'architecture (12 ADR), conventions de développement, documentation des
modules, état d'avancement.
