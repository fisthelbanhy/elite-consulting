# ADR-0014 — Bascule du dépôt vers la pile Express et reprise des vraies données

- **Statut** : Accepté — 2026-09-30
- **Complète** : [ADR-0013](0013-pile-technique-et-processus-unique.md) (choix de la pile) et
  [ADR-0012](0012-depot-github-et-environnement-cloud.md) (dépôt privé, données locales).
  L'ADR-0013 décidait la pile ; celui-ci acte le **remplacement effectif** de l'arborescence
  FastAPI dans le dépôt de travail, et la reprise des données de production sur cette pile.

## Contexte

Deux arborescences coexistaient :

- le dépôt de travail, en **SvelteKit + FastAPI** (Python), poussé sur GitHub (commit `a64685e`) ;
- une archive `elite-consulting-hostinger.zip` livrée par l'hébergement retenu, qui contenait le
  **portage complet** de la même refonte vers la pile décidée en ADR-0013 (Express 5, TypeScript,
  Zod 4, Drizzle ORM, un seul processus Node), avec sa documentation à jour — mais **sans données** :
  seul le jeu de démonstration versionné y figure, conformément à l'ADR-0012.

Le porteur a demandé que le projet soit remplacé par le contenu de l'archive, alimenté par les
données de production.

## Décision

### 1. L'archive devient le dépôt de travail

Le contenu de l'archive remplace `backend/`, `frontend/`, `docs/`, `scripts/`, `package.json`,
`README.md` et `.gitignore`. La pile Python (FastAPI, SQLAlchemy, Alembic, pytest, ruff) disparaît
du projet : plus aucun Python n'est nécessaire pour développer ni pour déployer. `api/` (Express +
Drizzle) prend la place de `backend/`.

L'ancienne arborescence n'a pas été effacée sèchement : elle est conservée sur le poste dans
`.ancien-fastapi/`, ignorée par git, le temps que la nouvelle pile soit validée en recette
métier. Sa suppression ne perd rien — l'historique git en garde la trace complète.

Les ADR 0003 et 0012 citent encore des chemins de l'ancienne arborescence : ils sont des
**relevés de décision datés**, qu'on ne réécrit pas. La correspondance est directe —
`backend/` → `api/`, `backend/scripts/reprise_legacy.py` → `api/src/scripts/reprise-legacy.ts`,
`backend/fixtures/` → `api/fixtures/`, `backend/data|media/` → `api/data|media/`,
`donnees_demo.py` → `donnees-demo.ts`, `exporter_referentiels.py` → `exporter-referentiels.ts`.
Les décisions elles-mêmes (clés primaires legacy conservées, dump hors dépôt, référentiels sans
données personnelles versionnés) restent en vigueur telles quelles.

Deux fichiers absents de l'archive ont été **adaptés** plutôt que reconduits, car ils décrivaient
encore l'environnement Python :

| Fichier | Avant | Après |
|---|---|---|
| `.devcontainer/devcontainer.json` | image Python 3.12 + Node 22, extensions `ruff` et `python` | image Node 22, extensions Prettier et ESLint |
| `.claude/launch.json` | `scripts/py.mjs -m uvicorn app.main:app` | `npm run dev:api` |

### 2. Les données de production sont reprises par le script de l'archive

`api/src/scripts/reprise-legacy.ts` (portage fidèle de `backend/scripts/reprise_legacy.py`) est
lancé sur le dump local `cp1019011_lafrangine.sql`. Résultat : **11 548 lignes** et **49 fichiers**
(photos de membres, de produits, publicités) — soit exactement les totaux de la reprise Python, avec
les mêmes 13 corrections de défauts legacy (produits reclassés, réponses de dialogue réattribuées,
fiches RH sans auteur, e-mail/adresse d'appel de fonds inversés…). Le rapport est écrit dans
`api/data/rapport-reprise.md`.

Le dump reste **hors du dépôt** (ADR-0012) : il porte les données personnelles des 68 membres et
leurs mots de passe d'origine en clair.

### 3. Deux défauts de portabilité corrigés à la bascule

Ils ne se voyaient pas dans l'archive, faute d'avoir été exercés sous Windows sur les vraies données.

| Défaut | Effet | Correction |
|---|---|---|
| `npm run donnees:legacy -- … --images <dossier>` : npm retire les arguments en `--xxx` avant de les remettre au script (et le faisait deux fois, la commande racine relançant un `npm run` imbriqué) | **Silencieux et grave** : la reprise se terminait « avec succès » en ayant ignoré toutes les images. 11 499 lignes au lieu de 11 548, aucun avertissement | Nouveau relais `scripts/donnees-legacy.mjs` : le dossier d'images devient un argument **positionnel**, hors de portée de npm ; chemins résolus depuis la racine du dépôt |
| `api/scripts/verifier-routes.ts` lisait le contrat via `new URL(…).pathname`, qui rend `/D:/…` sous Windows | La vérification de parité des routes s'arrêtait sur `ENOENT` (`D:\D:\…`) | `fileURLToPath()` |

### 4. Dérive des outils de style, traitée au cas par cas

L'installation depuis les verrous a amené des versions plus récentes que celles ayant servi à
écrire le code : Prettier 3.9 (qui coupe les ternaires autrement — 456 fichiers du site remis en
forme, sans changement de comportement) et `eslint-plugin-svelte` avec de nouvelles règles.
Celles-ci ont été tranchées une par une plutôt que désactivées en bloc :

| Règle | Décision | Raison |
|---|---|---|
| `svelte/no-navigation-without-resolve` (261 cas) | Désactivée dans `eslint.config.js` | Elle protège les liens écrits en dur quand le site est servi sous un sous-chemin. Il est servi à la racine du domaine et n'importe nulle part `$app/paths`. À réactiver si un `base` apparaît |
| `svelte/no-at-html-tags` (20 cas) | **Maintenue**, dérogation commentée à chaque emploi | Les deux seules sources de HTML sont auditées : `jsonLd()` (échappement strict) et `texteAideHtml()` (liste blanche de balises sans attribut). La règle continue de protéger le code futur |
| `svelte/prefer-writable-derived` (2 cas) | Dérogation commentée | Le drapeau « le composant tourne côté navigateur » ne peut pas être un `$derived` : celui-ci s'évaluerait aussi au rendu serveur et casserait l'amélioration progressive |
| `svelte/prefer-svelte-reactivity` (3 cas) | Dérogation commentée | `URLSearchParams` et `Date` locaux à une fonction pure, jetés aussitôt : rien n'est observé |
| `no-irregular-whitespace` | `skipTemplates: true` | L'espace fine insécable de « 5 000 FCFA » est de la typographie française, écrite dans les gabarits de `format.ts` |

La règle sur `{@html}` est celle qui méritait le plus d'être gardée : c'est la seule qui aurait
signalé une faille réelle si un jour un texte non assaini y passait.

La perte silencieuse de `--images` mérite d'être retenue au-delà de ce projet : une option de
chargement de données qui peut être perdue en route **sans erreur** est un piège. D'où le choix
du positionnel, qu'aucun intermédiaire ne peut avaler.

### 5. L'archive de déploiement est fabriquée par un script, et porte les données à part

`npm run paquet` (`scripts/paquet.mjs`) remplace l'assemblage manuel. Deux choix y sont figés :

- **Les données ne vont pas dans `api/data`** mais dans un dossier `donnees-production/` de
  l'archive, avec la marche à suivre. `api/data` est dans l'arborescence de l'application, qu'un
  redéploiement remplace : la base et les photos des membres y seraient perdues au premier
  correctif publié. Elles doivent vivre à l'emplacement persistant que désignent
  `LF_DATABASE_URL` et `LF_MEDIA_DIR`.
- **Le script refuse de s'exécuter si un journal WAL traîne** à côté de la base. Une copie de
  fichier SQLite faite pendant qu'un serveur tourne emporte une base amputée des dernières
  écritures — panne silencieuse, découverte en production. Il faut arrêter le serveur, ce qui
  replie le journal.

L'archive exclut `node_modules` (binaires natifs de Windows), le dump legacy, `site.txt`, le code
PHP de l'ancien site et les `.env` réels ; elle conserve `api/.env.example`, qui est la liste des
variables à saisir chez l'hébergeur. Elle **contient des données personnelles** : elle ne doit être
ni versionnée (`*.zip` est ignoré) ni diffusée. `npm run paquet -- sans-donnees` donne la version
qui peut circuler.

## Conséquences

- **Un seul langage, un seul processus** : plus de dépendance Python, `npm run setup` suffit sur un
  poste neuf comme en session cloud ou en Codespace (devcontainer Node).
- **La recette automatisée est rejouée et verte sur la vraie base** : 211 tests Vitest (34 fichiers),
  `tsc` sans erreur, `svelte-check` 0 erreur (26 avertissements connus), schéma conforme au relevé
  de référence (62 tables, 718 colonnes), parité des routes 381/381, et — contrôle le plus lourd de
  conséquences — **les mots de passe legacy restent acceptés** : aucun des 68 membres n'a besoin de
  réinitialiser le sien.
- **Les commandes changent** : `npm test` (Vitest) au lieu de `pytest`, `npm run migrer`
  (drizzle-kit) au lieu d'Alembic, `npm --prefix api run comptes:demo` au lieu du script Python.
  `docs/CONVENTIONS.md` et le README de l'archive décrivent déjà la nouvelle pile.
- **Ce qui ne change pas** : le modèle de données et les clés primaires legacy (ADR-0003), les
  règles métier et les corrections de bugs (ADR-0004), la sécurité (ADR-0005), les paiements
  (ADR-0006), le positionnement et le design (ADR-0008), les 483 points de recette à valider.
