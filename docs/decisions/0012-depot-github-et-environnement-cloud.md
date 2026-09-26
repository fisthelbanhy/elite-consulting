# ADR-0012 — Dépôt GitHub privé, données de démonstration et environnement cloud

- **Statut** : Accepté — 2026-09-26

## Contexte

Le projet doit pouvoir être repris depuis une **session Claude Code dans le cloud** (conteneur
Linux, sans accès au poste local). Une session cloud travaille à partir d'un dépôt Git distant :
il faut donc publier le code sur GitHub (`fisthelbanhy/elite-consulting`), ce qui pose trois
questions : que publier, avec quelles données, et comment l'environnement s'installe.

## Décisions

### 1. Dépôt **privé**, contenu restreint

Ne sont **jamais** publiés (exclusions `.gitignore`) :

| Élément | Raison |
|---|---|
| `cp1019011_lafrangine.sql` | Dump de production : données personnelles de 68 membres, mots de passe d'origine |
| `lafrangine/` (code PHP legacy) | Contient les **identifiants de connexion** à la base de production |
| `site.txt` | Accès au site en production |
| `backend/data/`, `backend/media/`, `*.sqlite3` | Bases locales, fichiers téléversés, jetons de démonstration |
| `site.zip`, `*.zip` | Archives locales (100 Mo) |

Le dépôt reste **privé** : `docs/inventaire/` décrit précisément des failles exploitables du site
legacy **encore en ligne** (absence de contrôle d'accès serveur, injections SQL, mots de passe en
clair). Publier ces documents avant la mise hors service de l'ancien site fournirait une carte
d'attaque. Si le dépôt devait devenir public un jour, il faudrait au préalable retirer ces détails.

### 2. Jeu de données de démonstration versionné

Sans le dump, une session cloud aurait une base vide. Deux scripts :

- `backend/scripts/exporter_referentiels.py` : exporte depuis une base locale les référentiels
  **non personnels** vers `backend/fixtures/referentiels.json` (507 lignes : paramètres du site,
  4 villes, 22 quartiers, 21 secteurs, 285 domaines, diplômes, familles d'articles, 12 banques
  *sans leurs contacts nominatifs*, 130 produits du catalogue, 7 fiches bien-être). Ce fichier
  est versionné.
- `backend/scripts/donnees_demo.py` : recrée la base, charge ces référentiels et ajoute des
  comptes et des fiches de démonstration dans chaque module (5 comptes — gestionnaire, membres,
  entreprise, boutique —, emplois, annonces, immobilier, partenariat, marché, projet, appel de
  fonds avec engagement, Likelemba avec adhésion et cotisation, forum, réussite, business plan,
  messages). Mot de passe commun `demo1234`, code de pointage `1234` ; le script **refuse de
  s'exécuter hors développement**.

Travailler sur les vraies données reste possible en local avec `reprise_legacy.py` et le dump,
qui ne quitte jamais le poste.

### 3. Commandes indépendantes du système

Le cloud tourne sous Linux, le poste du porteur sous Windows. Les chemins du type
`backend/.venv/Scripts/python.exe` ne fonctionnent que sous Windows. Ajoutés :

- `scripts/py.mjs` : trouve le Python du projet (`.venv/Scripts`, `.venv/bin`, sinon le système)
  et l'exécute depuis `backend/` ;
- `scripts/setup.mjs` : installe tout (environnement Python, dépendances, base de démonstration) ;
- un `package.json` à la racine qui expose les commandes : `npm run setup`, `dev:api`, `dev:site`,
  `test`, `lint`, `check`, `build`, `donnees:demo`, `donnees:legacy` ;
- `.claude/launch.json` réécrit pour passer par ces commandes.

### 4. Environnement cloud

`.devcontainer/devcontainer.json` (Python 3.12 + Node 22, `postCreateCommand: npm run setup`,
ports 5173 et 8000). Une session cloud, un Codespace ou un nouveau poste obtiennent ainsi un
environnement identique en une commande.

## Conséquences

- Le travail peut se poursuivre dans le cloud, mais **sans les données de production** : les
  recettes portant sur les vraies données (rapport de reprise, volumétrie) restent locales.
- Toute reprise du dump en cloud exigerait une anonymisation préalable — non faite à ce jour.
