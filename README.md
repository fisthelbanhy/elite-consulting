# La Frangine — refonte 2026

« La grande sœur de ceux qui se lancent » : plateforme d'accompagnement des entrepreneurs
congolais (conseil, Likelemba, financement, opportunités), refonte complète du site PHP
lafrangine.primera-c.net.

| Couche | Technologie |
|---|---|
| Frontend | SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS 4 (`frontend/`) |
| Backend | Express 5 · TypeScript · Zod 4 · Drizzle ORM (`api/`) |
| Base | SQLite (fichier local) |

En production, **un seul processus Node** sert le site et l'API : c'est le nombre de services, et
non le langage, qui détermine le coût d'un hébergement (ADR-0013).

## Démarrer (Windows, Linux ou macOS)

Prérequis : Node.js 22+, et rien d'autre.

```bash
npm run setup      # dépendances de api/ et frontend/, base de démonstration
npm run dev        # API + site dans un seul terminal → http://localhost:5173
```

Comptes de démonstration : `demo.gestion` (gestionnaire), `demo.membre`, `demo.candidat`,
`demo.entreprise`, `demo.boutique` — mot de passe `demo1234`, code de pointage `1234`.

`npm run comptes:demo` imprime en plus un jeton de session à coller dans le cookie `lf_session`,
pour entrer sans passer par le formulaire.

### Travailler sur les vraies données (poste local uniquement)

Le dump de production contient des données personnelles : il **n'est pas dans le dépôt** et ne
doit jamais y être ajouté (ADR-0012). Placez `cp1019011_lafrangine.sql` à la racine, puis :

```bash
npm run donnees:legacy -- ../cp1019011_lafrangine.sql --images ../lafrangine/V04/image/ig
```

Le rapport de reprise est écrit dans `api/data/rapport-reprise.md` : il liste les lignes écartées
et les corrections appliquées, et mérite d'être lu après chaque reprise. Pour revenir aux données
de démonstration : `npm run donnees:demo`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run setup` | Installe tout (idempotent) |
| `npm run dev` | API + site, un seul terminal |
| `npm run dev:api` / `npm run dev:site` | L'un ou l'autre seulement |
| `npm run build` puis `npm start` | Production : un seul processus Node sert le site et l'API |
| `npm test` | Tests de l'API (Vitest) |
| `npm run lint` | Prettier + ESLint, sur l'API et le site |
| `npm run check` | Types : `tsc` sur l'API, `svelte-check` sur le site |
| `npm run format` | Met en forme l'API et le site |
| `npm run migration` | Nouvelle migration Drizzle (après modification du schéma) |
| `npm run migrer` | Applique les migrations en attente |
| `npm run donnees:demo` / `npm run donnees:legacy` | Jeu de démonstration / données de production |

## Configuration

Toutes les variables de l'API portent le préfixe `LF_`.

| Variable | Rôle | Défaut |
|---|---|---|
| `LF_DATABASE_URL` | Base de données | SQLite `api/data/lafrangine.sqlite3` |
| `LF_MEDIA_DIR` | Dossier des fichiers téléversés | `api/media` |
| `LF_SITE_URL` | **Adresse publique du site** — sert aussi de `ORIGIN` à SvelteKit | `http://localhost:5173` |
| `LF_PORT` (ou `PORT`) | Port d'écoute du processus | `8000` |
| `LF_SERVIR_SITE` | `0` pour ne servir que l'API (posé par `npm run dev`, où Vite sert le site) | `1` |
| `LF_ENVIRONNEMENT` | `dev` en développement ; autre valeur en production (bloque les scripts de démonstration) | `dev` |
| `LF_SMTP_*` | Envoi d'e-mails (sinon journalisés) | — |
| `BACKEND_URL` (frontend) | Adresse interne de l'API vue par SvelteKit | `http://127.0.0.1:8000` |
| `LF_COOKIE_SECRET` (frontend) | Signature du diagnostic en cours — **obligatoire en production** | aléatoire au démarrage |

En production, `LF_SITE_URL` doit porter l'adresse publique réelle : SvelteKit s'en sert pour sa
protection CSRF et rejetterait sinon tous les envois de formulaire, connexion comprise. Le serveur
refuse de démarrer si elle est restée à sa valeur de développement.

## Développer dans le cloud

Le dépôt contient un `.devcontainer` (Node 22) dont la commande de création est `npm run setup`.
Une session Claude Code cloud, un Codespace ou un nouveau poste obtiennent donc un environnement
complet, avec la base de démonstration, sans configuration manuelle.

## Production

```bash
npm run build                                   # API (tsc) puis site (adapter-node)
LF_SITE_URL=https://… LF_ENVIRONNEMENT=prod npm start
```

Le processus applique les migrations en attente au démarrage, purge les sessions expirées, puis
écoute sur `LF_PORT`. Il se place derrière un reverse proxy HTTPS avec compression gzip (ADR-0002).

## Documentation

Tout est dans [`docs/`](docs/README.md) : inventaire fonctionnel (483 points de recette), étude de
marché, décisions d'architecture (12 ADR), conventions de développement, documentation des
modules, état d'avancement.
