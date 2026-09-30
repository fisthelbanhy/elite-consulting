# ADR-0013 — Pile technique : SvelteKit + Express, déployés en un seul processus Node

- **Statut** : Accepté — 2026-09-28
- **Remplace** : [ADR-0002](0002-architecture-bff-et-authentification.md) pour le *transport* entre
  le site et l'API (le mécanisme d'authentification lui-même est conservé). Les ADR 0003 à 0012
  restent valables : elles portent sur le modèle de données, les règles métier, la sécurité, les
  paiements et le design.

## Contexte

Le site legacy (lafrangine.primera-c.net, dossier `lafrangine/V04/prog`) est écrit en PHP 5
procédural avec l'extension `mysql_*` (supprimée depuis PHP 7), sans framework, sans séparation
présentation/logique, avec des mots de passe stockés en clair. Il ne peut pas être maintenu en
l'état.

Deux exigences du porteur encadrent la refonte :

1. **SvelteKit 2 / Svelte 5** pour le site, demandé explicitement.
2. **Réduire le coût d'hébergement.** Ce point mérite d'être formulé précisément, parce qu'il est
   souvent mal posé : ce n'est pas le langage du backend qui détermine le prix, ni la disponibilité
   du site. Un site joignable en permanence demande un hébergeur allumé en permanence, quel que
   soit le langage. En revanche, **le nombre de processus, lui, se paie** : les offres bon marché
   facturent au service ou à l'instance (Render : un seul service web dans l'offre gratuite ;
   Fly.io, Railway : à la machine). Deux services, c'est soit deux fois le prix, soit une offre
   gratuite qui ne suffit plus.

Le levier de coût est donc de tenir le site **et** l'API dans un seul processus. C'est possible dès
lors que les deux sont en TypeScript sur Node.

## Décision

### 1. Un seul processus, un seul déployable

Express monte les routes `/api/*`, sert `/media`, et délègue **tout le reste** au handler
`@sveltejs/adapter-node` de SvelteKit, dans le même processus :

```
Navigateur ──HTTPS──▶ Node (un seul processus)
                       ├── Express : /api/*   (routes métier)  ──▶ Drizzle ──▶ SQLite
                       ├── Express : /media/* (fichiers téléversés)
                       └── handler SvelteKit : tout le reste (SSR, form actions)
```

Conséquence sur l'ADR-0002 : le BFF est conservé (le navigateur ne parle qu'à SvelteKit, le jeton
reste dans un cookie `httpOnly`, l'API n'accepte que des jetons Bearer), mais l'appel de SvelteKit
vers l'API ne traverse plus le réseau — c'est un appel HTTP vers `127.0.0.1` dans le même processus.
`BACKEND_URL` reste configurable pour pouvoir **re-séparer les deux services** si la charge l'exige
un jour : la frontière logique est maintenue, seul le déploiement est fusionné.

### 2. Pile retenue

| Rôle | Choix | Version | Raison |
|---|---|---|---|
| Site | SvelteKit 2 + Svelte 5 (runes), TypeScript | kit 2.63, svelte 5.56, TS 6 | Demande du porteur ; rendu serveur et form actions |
| Style | Tailwind CSS 4 (+ plugins forms, typography), icônes `@lucide/svelte` | tailwind 4.3 | Pas de bibliothèque de composants tierce (voir ci-dessous) |
| Build / serveur du site | Vite 8, `@sveltejs/adapter-node` | vite 8.0 | L'adaptateur Node est ce qui permet la fusion des deux processus |
| Serveur HTTP de l'API | **Express 5** + TypeScript | express 5.2 | Un seul langage sur tout le projet ; empreinte minimale |
| Validation | **Zod 4** | zod 4.6 | Schéma typé, erreurs par champ, inférence TypeScript |
| ORM | **Drizzle ORM** (dialecte SQLite) | drizzle 0.45 | Proche du SQL — le schéma legacy est imposé (ADR-0003) — typage complet, empreinte minimale, décisif pour un petit hébergeur |
| Migrations | **drizzle-kit** | | Versions de schéma générées et rejouables |
| Base de données | **SQLite**, fichier local (`better-sqlite3`) | 13.0 | Un fichier à sauvegarder, aucun service de base à héberger : c'est la cohérence du choix « un seul service ». Le serveur refuse de démarrer sur une autre base |
| Mots de passe | **`@node-rs/argon2`** | 2.2 | Argon2id, format PHC standard (ADR-0005) |
| Images | **sharp** | 0.35 | Redimensionnement des photos téléversées |
| Tests | **Vitest + supertest** | vitest 5.0 | 211 tests sur les règles métier, les droits et les machines à états |
| Qualité | **ESLint + Prettier** | | Mêmes règles pour le site et l'API |

Choix secondaires assumés :

- **Accès aux données synchrone.** Le pilote `better-sqlite3` est synchrone, et ses transactions
  n'acceptent pas de rappel asynchrone. Les appels à la base sont donc écrits en synchrone
  (`.get()`, `.all()`, `.run()`), ce qui rend les transactions naturelles et supprime toute une
  classe de bugs ; `async` est réservé à ce qui l'est réellement — hachage Argon2, traitement des
  images, envoi d'e-mails. À l'échelle du site (une requête SQLite se compte en microsecondes),
  bloquer la boucle d'événements le temps d'une lecture n'a pas d'effet mesurable ; c'est d'ailleurs
  l'usage recommandé par `better-sqlite3`.
- **Pas de bibliothèque de composants tierce** : composants maison sur Tailwind, éléments natifs
  (`<dialog>`, `<details>`) pour l'accessibilité. Moins de dépendances = site plus léger, ce qui
  compte pour des visiteurs sur réseau mobile lent.
- **Form actions SvelteKit** pour toutes les écritures : les formulaires fonctionnent même sans
  JavaScript (amélioration progressive via `use:enhance`) — important sur smartphones d'entrée de
  gamme.

### 3. Ce que le legacy impose

- **Le schéma de base** : noms de tables, de colonnes, types et formats de stockage sont conservés
  à l'identique (ADR-0003), y compris les dates écrites en texte sans fuseau. La base de production,
  avec ses 68 membres, reste lisible sans conversion.
- **Les règles métier, les messages en français, les droits vérifiés côté serveur** (ADR-0004, 0005).
- **Le format des références** (codes membres, numéros de reçu Likelemba) : il a déjà été communiqué
  aux membres, parfois sur papier.

### 4. Garanties automatisées

Quatre outils, dans `api/scripts/`, vérifient mécaniquement ce que la section précédente promet.
Ils ne sont pas des tests unitaires : ils portent sur le contrat avec l'existant.

| Outil | Question à laquelle il répond | Résultat |
|---|---|---|
| `verifier-schema.ts` | La base garde-t-elle exactement le schéma attendu ? | 62 tables, 718 colonnes conformes au relevé de référence |
| `verifier-routes.ts` | Les 381 opérations sont-elles toutes exposées, et aucune de plus ? | 381 montées / 381 attendues |
| `dump-synthetique.ts` | La reprise legacy tient-elle face aux bizarreries du dump ? | 61 tables de synthèse, 13 corrections exercées |
| `verifier-hachages.ts` | Les mots de passe repris permettent-ils de se connecter ? | mot de passe et code de pointage acceptés, les faux refusés |

`verifier-schema.ts` compare à `schema-reference.json`, le schéma de la base de production relevé
avant toute modification : c'est lui qui garantit qu'une mise à jour du code ne rendra pas la base
existante illisible.

`dump-synthetique.ts` mérite une explication. Le dump de production contient les données
personnelles des membres et n'est pas versionné (ADR-0012) : il n'est pas disponible pour servir de
banc d'essai, et il serait imprudent de s'en servir comme tel. L'outil fabrique donc un dump qui a
la **forme** du vrai — mêmes tables, mêmes noms de colonnes — et qui exerce délibérément les treize
corrections que la reprise applique : dates impossibles, textes doublement encodés, identifiants en
double, e-mail et adresse du promoteur inversés, fiche RH sans auteur, réponse de dialogue adressée
au membre n° 1…

`verifier-hachages.ts` couvre la propriété la plus lourde de conséquences : si elle est fausse, les
68 membres perdent l'accès à leur compte et il faut réinitialiser chaque mot de passe à la main.
Elle ne se déduit d'aucune comparaison de bases, puisque Argon2 tire un sel au hasard et que deux
hachages du même mot de passe diffèrent — seule la **vérification** peut être contrôlée.

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

- Un seul service à héberger : l'offre gratuite ou la plus petite instance payante suffit — c'est
  l'objectif de coût du porteur.
- Un seul langage et deux `package.json` : `npm run setup` se réduit à des installations npm. Le
  porteur peut relire et modifier tout le code du projet.
- Pas d'appel réseau entre le site et l'API.

**Défavorables, assumés**

- Un plantage du processus emporte le site *et* l'API. Acceptable à ce stade (un seul service à
  redémarrer, supervision par l'hébergeur), à revoir si le trafic augmente.
- SQLite suppose un disque persistant chez l'hébergeur et se sauvegarde par copie du fichier ;
  il ne se prête pas à plusieurs instances en parallèle. C'est le prix du « un seul service », et
  cela correspond au volume visé (quelques milliers de membres).
- Pas de documentation d'API générée automatiquement. Le contrat des 381 opérations est décrit par
  [`docs/migration-express-parite.md`](../migration-express-parite.md) et par les schémas Zod.
- La recette métier des 483 points par le porteur reste à faire (`docs/inventaire/`).
