# ADR-0013 — Backend Express.js / TypeScript, déployé en un seul processus Node

- **Statut** : Accepté — 2026-09-28
- **Remplace** : [ADR-0001](0001-stack-technique.md) pour la couche backend (le choix FastAPI +
  SQLAlchemy + Alembic + Pydantic + Pillow) et [ADR-0002](0002-architecture-bff-et-authentification.md)
  pour le *transport* entre le site et l'API (le mécanisme d'authentification lui-même est conservé).
  Les ADR 0003 à 0012 restent valables : elles portent sur le modèle de données, les règles métier,
  la sécurité, les paiements et le design, tous indépendants du langage du backend.

## Contexte

Le backend a été livré en FastAPI (19 000 lignes Python, 381 endpoints, 62 tables, 185 tests verts)
et fonctionne. Le porteur demande néanmoins de le remplacer par **Express.js**, avec deux
motivations exprimées : pouvoir faire tourner le site en permanence (« même quand la machine est
éteinte ») et **réduire le coût d'hébergement**.

Deux mises au point ont été faites avant de décider, parce qu'elles changent ce qu'il faut faire :

1. **Le langage du backend ne détermine pas la disponibilité.** Un site joignable 24/7 demande un
   hébergeur allumé en permanence, que le backend soit en Python ou en JavaScript. C'est un sujet de
   déploiement, traité par le point 7 du reste-à-faire, pas de langage.
2. **Le langage ne détermine pas non plus le prix — mais le nombre de processus, si.** C'est ici que
   la demande du porteur touche un vrai levier : l'architecture livrée demande **deux services**
   (Node pour SvelteKit, Uvicorn pour FastAPI), or les offres d'hébergement bon marché facturent au
   service ou à l'instance (Render : un seul service web dans l'offre gratuite ; Fly.io, Railway :
   à la machine). Deux processus, c'est soit deux fois le prix, soit une offre gratuite qui ne suffit
   plus.

Le gain de coût ne vient donc pas d'Express en soi, mais du fait qu'un backend en TypeScript peut
être **fusionné avec le site dans un seul processus Node**, donc un seul service à héberger.

## Décision

### 1. Un seul processus, un seul déployable

Express monte les routes `/api/*`, sert `/media`, et délègue **tout le reste** au handler
`@sveltejs/adapter-node` de SvelteKit, dans le même processus :

```
Navigateur ──HTTPS──▶ Node (un seul processus)
                       ├── Express : /api/*  (routes métier)  ──▶ Drizzle ──▶ SQLite / PostgreSQL
                       ├── Express : /media/* (fichiers téléversés)
                       └── handler SvelteKit : tout le reste (SSR, form actions)
```

Conséquence sur l'ADR-0002 : le BFF est conservé (le navigateur ne parle qu'à SvelteKit, le jeton
reste dans un cookie `httpOnly`, l'API n'accepte que des jetons Bearer), mais l'appel de SvelteKit
vers l'API ne traverse plus le réseau — c'est un appel HTTP vers `127.0.0.1` dans le même processus.
`BACKEND_URL` reste configurable pour pouvoir **re-séparer les deux services** si la charge l'exige
un jour : la frontière logique est maintenue, seul le déploiement est fusionné.

### 2. Pile retenue

| Rôle | FastAPI (avant) | Express (après) | Raison du choix |
|---|---|---|---|
| Serveur HTTP | FastAPI / Uvicorn | **Express 5** + TypeScript | Demande du porteur ; un seul langage sur tout le projet |
| Validation | Pydantic v2 | **Zod** | Équivalent le plus proche : schéma typé, erreurs par champ, inférence TS |
| ORM | SQLAlchemy 2.0 | **Drizzle ORM** (dialecte SQLite) | Proche du SQL (le schéma legacy est imposé), typage complet, empreinte minimale — décisif pour un petit hébergeur |
| Migrations | Alembic | **drizzle-kit** | Même rôle : versions de schéma générées et rejouables |
| Mots de passe | `pwdlib` + Argon2 | **`@node-rs/argon2`** | Format PHC `$argon2id$…` lu et écrit **dans les deux sens** (vérifié : voir ci-dessous) — les mots de passe des 68 membres existants restent valides, aucune réinitialisation |
| Images | Pillow | **sharp** | Redimensionnement des photos téléversées |
| Tests | pytest + httpx | **Vitest + supertest** | Les 185 tests sont portés, pas abandonnés |
| Qualité | ruff | **ESLint + Prettier** | Déjà en place pour le frontend |

**Accès aux données synchrone.** Le pilote `better-sqlite3` est synchrone, et ses transactions
n'acceptent pas de rappel asynchrone. Les appels à la base sont donc écrits en synchrone
(`.get()`, `.all()`, `.run()`), ce qui rend les transactions naturelles et supprime toute une
classe de bugs ; `async` est réservé à ce qui l'est réellement — hachage Argon2, traitement des
images, envoi d'e-mails. À l'échelle du site (une requête SQLite se compte en microsecondes),
bloquer la boucle d'événements le temps d'une lecture n'a pas d'effet mesurable ; c'est d'ailleurs
l'usage recommandé par `better-sqlite3`.

**Compatibilité des mots de passe, vérifiée avant de s'engager** (2026-09-28) : un hash produit par
`pwdlib` (`m=65536,t=3,p=4`) est accepté par `@node-rs/argon2`, et un hash produit par Node
(`m=19456,t=2,p=1`, paramètres OWASP) est accepté par `pwdlib`. Les paramètres de coût sont portés
par la chaîne PHC elle-même, donc les deux implémentations se relisent sans configuration.
Conséquence pratique : **la bascule est réversible** — on peut revenir au backend Python sans que
personne ne perde l'accès à son compte, y compris pour les comptes créés entre-temps.

### 3. Ce qui ne change pas

- **Le schéma de base** : noms de tables, de colonnes, types et index sont conservés à l'identique
  (ADR-0003). La base de production reste lisible par le nouveau backend sans conversion.
- **Les règles métier, les messages en français, les droits vérifiés côté serveur** (ADR-0004, 0005).
- **Le contrat de l'API** : mêmes chemins, mêmes formes de requête et de réponse, même format
  d'erreur `{message, champs}`. Le frontend SvelteKit n'est pas modifié — c'est la garantie que la
  migration est bien une migration et non une refonte déguisée.

### 4. Méthode : parité vérifiable

Le contrat des 381 endpoints a été relevé depuis l'OpenAPI de FastAPI **avant** toute modification
et versionné comme liste à cocher : [`docs/migration-express-parite.md`](../migration-express-parite.md).
Le backend Python n'est supprimé qu'une fois les 381 lignes cochées et les tests portés au vert.

Trois outils, dans `api/scripts/`, transforment cette promesse en vérification mécanique. Ils
n'ont plus d'objet une fois `backend/` supprimé et disparaîtront avec lui.

| Outil | Question à laquelle il répond | Résultat |
|---|---|---|
| `verifier-schema.ts` | Les tables et colonnes sont-elles les mêmes ? | 62 tables, 718 colonnes identiques |
| `verifier-routes.ts` | Les opérations exposées sont-elles les mêmes ? | 381 montées / 381 attendues |
| `comparer-reponses.ts` | Les **réponses** sont-elles les mêmes ? | 162 routes de lecture identiques |
| `comparer-reprise.ts` | La **reprise des données legacy** donne-t-elle la même base ? | 62 tables, 110 lignes identiques |
| `verifier-hachages.ts` | Les mots de passe repris restent-ils valides ? | 5 comptes, mot de passe et code de pointage acceptés |

`comparer-reponses.ts` est le seul qui couvre le calcul, l'ordre de tri et le format des dates : il
interroge les deux backends sur le même jeu de démonstration et compare champ par champ, en
neutralisant les seules valeurs qui ne peuvent pas coïncider (jetons, horodatages de création).
C'est lui qui a révélé les écarts consignés en I10 à I14 de l'ADR-0011.

Les deux derniers portent sur la reprise du dump de production. Ce dump n'est pas versionné
(ADR-0012) : il n'est donc pas disponible pour servir de banc d'essai, et il serait imprudent de
s'en servir comme tel. La parité se prouve à la place sur un **dump de synthèse**
(`dump-synthetique.ts`) qui a la forme du vrai — mêmes tables, mêmes noms de colonnes — et qui
exerce délibérément les treize corrections que la reprise applique : dates impossibles, textes
doublement encodés, identifiants en double, e-mail et adresse du promoteur inversés, fiche RH sans
auteur, réponse de dialogue adressée au membre n° 1… Les deux reprises en tirent la même base et
le même rapport, au caractère près.

Les hachages, eux, ne peuvent pas être comparés : Argon2 tire un sel au hasard, donc deux hachages
du même mot de passe diffèrent — c'est le propre d'un bon hachage. `verifier-hachages.ts` vérifie
donc la seule chose qui compte : un hachage **produit par Python** est accepté par le backend
Express, et un mauvais mot de passe est refusé. C'est la propriété dont dépend l'accès des
68 membres à leur compte.

### 5. Deux modes d'exécution

| | Développement (`npm run dev`) | Production (`npm start`) |
|---|---|---|
| Site | Vite, port 5173, rechargement à chaud | handler `adapter-node`, monté dans Express |
| API | Express, port 8000 (`LF_SERVIR_SITE=0`) | Express, même processus, même port |
| Processus | deux | **un seul** |

`LF_SERVIR_SITE=0` est posé par `scripts/dev.mjs` : sans lui, un `frontend/build` laissé par une
construction précédente servirait sur le port de l'API une version figée du site.

`LF_SITE_URL` doit porter l'**adresse publique** du site : SvelteKit s'en sert pour sa protection
CSRF et rejette en 403 tout envoi de formulaire venu d'une autre origine — connexion comprise.
Restée à sa valeur de développement, le serveur refuse de démarrer en production plutôt que de
laisser chercher d'où viennent les 403.

## Conséquences

**Favorables**

- Un seul service à héberger : l'offre gratuite ou la plus petite instance payante redevient
  suffisante — l'objectif de coût du porteur.
- Un seul langage et un seul `package.json` : plus de venv Python, `npm run setup` devient
  un simple `npm install`. Le porteur peut relire et modifier tout le code.
- Plus d'appel réseau entre le site et l'API.

**Défavorables, assumés**

- **Le coût de la migration est élevé et le risque réel** : 19 000 lignes et 62 tables réécrites.
  Le danger n'est pas le code d'infrastructure mais les **règles métier subtiles reprises du legacy**
  (machines à états des appels de fonds, calculs de la trésorerie, codes Likelemba, effets des
  paiements à l'enregistrement et leur annulation au rejet). Le portage des 185 tests est la
  contre-mesure : une règle non couverte par un test est une règle qu'on peut perdre sans le voir.
- La recette métier des 483 points par le porteur devra porter sur le nouveau backend.
- Un plantage du processus emporte le site *et* l'API. Acceptable à ce stade (un seul service à
  redémarrer, supervision par l'hébergeur), à revoir si le trafic augmente.
- Perte de la documentation OpenAPI générée automatiquement par FastAPI (`/api/docs`). Le contrat
  reste décrit par `docs/migration-express-parite.md` et par les schémas Zod.
