# ADR-0002 — Architecture BFF et authentification par session

- **Statut** : Accepté — 2026-09-22 ; **transport révisé par [ADR-0013](0013-backend-express-et-processus-unique.md)**
  (2026-09-28 : le site et l'API sont fusionnés dans un seul processus Node, l'appel interne ne
  traverse plus le réseau). Le mécanisme d'authentification décrit ci-dessous — cookie `httpOnly`,
  jeton opaque haché en SHA-256, autorisations calculées côté API — est conservé tel quel.

## Contexte

Le legacy gardait l'identité dans `$_SESSION['idfmps'] = "identifiant*motdepasse"` (le mot de
passe en clair voyageait dans la session). Il faut une authentification moderne, compatible avec
le rendu serveur (SSR, indispensable au référencement des annonces, offres d'emploi, entreprises),
sans exposer de jeton au JavaScript du navigateur.

## Décision

**Backend-for-Frontend (BFF)** : le navigateur ne parle qu'à SvelteKit. SvelteKit parle à l'API
côté serveur.

```
Navigateur ──HTTPS──▶ SvelteKit (Node)  ──HTTP interne──▶ API (/api/...)  ──▶ BDD
            cookie httpOnly            Authorization: Bearer <jeton>
```

Depuis l'ADR-0013, les deux tournent dans le **même processus Node** : l'appel interne est une
boucle locale. La frontière logique est inchangée — c'est ce qui permettrait de re-séparer les
deux services si la charge l'exigeait.

1. **Connexion** : l'action `/connexion` de SvelteKit appelle `POST /api/auth/login`. L'API
   vérifie le mot de passe, crée une ligne `session` (jeton aléatoire 256 bits ; **seul son
   SHA-256 est stocké** en base) et renvoie le jeton en clair une seule fois.
2. SvelteKit pose ce jeton dans un cookie `lf_session` : `httpOnly`, `secure` en production,
   `sameSite=lax`, durée 30 jours (équivalent du « rester connecté » implicite du legacy).
3. `hooks.server.ts` lit le cookie à chaque requête, appelle `GET /api/auth/me` et place le membre
   dans `event.locals.user`. Les `load` et actions relaient le jeton à l'API.
4. **Déconnexion** : `POST /api/auth/logout` supprime la session en base, SvelteKit efface le cookie.
5. Pour les rares appels faits depuis le navigateur (widget de messagerie, compteurs),
   une route proxy SvelteKit `/api/[...chemin]` relaie la requête en ajoutant le jeton.
6. **CSRF** : les form actions SvelteKit vérifient l'en-tête `Origin` (protection native) ;
   l'API n'accepte que des jetons Bearer (jamais de cookie), donc pas de CSRF possible de son côté.
7. **Autorisations** calculées dans l'API (intergiciels `membreRequis`, `gestionnaireRequis`,
   `exigerDroit(...)`) — le frontend ne fait qu'adapter l'affichage.

## Conséquences

- Pas de CORS à configurer, pas de jeton accessible en JavaScript (résistant au vol par XSS).
- Chaque page authentifiée coûte un appel `/auth/me` serveur-à-serveur (quelques ms en local).
- L'API reste utilisable directement pour une future application mobile : il suffira d'obtenir un
  jeton via `/api/auth/login`.
