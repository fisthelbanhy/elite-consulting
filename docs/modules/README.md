# Modules de la nouvelle version

Chaque document décrit : fichiers, endpoints `/api`, pages, règles implémentées, correspondance
avec la checklist de recette (`docs/inventaire/`), écarts et décisions (consolidés dans
l'[ADR-0011](../decisions/0011-decisions-des-modules-et-de-l-integration.md)).

| Module | Pages principales | Sections legacy | Points de recette |
|---|---|---|---|
| Socle (accueil, authentification, emplois, paiement) — voir ci-dessous | `/`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/emplois/**`, `/paiement/[type]` | Accueil, connexion, S2 | F-TRV-01 à 32, 43, 64 à 69 ; F-S2-01 à 33 ; F-PAY (service central) |
| [Se lancer](se-lancer.md) | `/se-lancer`, `/diagnostic`, `/decouverte-de-soi`, `/questions`, `/reussites` | S1-A, S1-B, réussites | F-S1-01 à 26, F-S6-34 |
| [Communication](communication.md) | `/contact`, `/suggestion`, `/publicites`, `/espace/messages`, `/aide`, pages légales | transverse | F-TRV-33 à 55, 59 à 63, F-ADM-34 à 38 |
| [E-commerce](e-commerce.md) | `/immobilier`, `/annonces`, `/courses` | S3 | F-S3-01 à 75, F-PAY types 2 et 4 |
| [Financer & épargner](financer-epargner.md) | `/financer`, `/projets`, `/likelemba`, `/epargne` | S4 | F-S4-01 à 67, F-PAY types 5, 7, 8 |
| [Bien-être & distributeur](bien-etre-distributeur.md) | `/boutique`, `/panier`, `/bien-etre`, `/devenir-distributeur`, `/business-plan`, `/partenariats` | S1-C, S5 | F-S5-01 à 53, F-S1-27 à 40, F-PAY types 1 et 6 |
| [Entreprises & marchés](entreprises-marches.md) | `/opportunites`, `/entreprises`, `/comparateur-prix`, `/marches` | S6 | F-S6-01 à 35 |
| [Offres financières](offres-financieres.md) | `/conseil-financier`, `/accompagnement`, `/tresorerie`, `/tarifs-bancaires` | S7 | F-S7-01 à 45, F-TRV-56 à 58 |
| [Gestion & espace membre](gestion-espace.md) | `/gestion/**`, `/espace`, `/espace/profil`, `/espace/paiements` | écrans `p*.php`, profil | F-ADM-01 à 33, 39, 40 ; F-TRV-06, 23, 25 à 30, 66, 67, 70 |

## Socle (réalisé hors agents)

- **Backend** (`api/src/`) : `config.ts`, `db.ts`, `enums.ts`, `erreurs.ts`, `securite.ts`, `deps.ts`,
  `schema/*` (62 tables), `services/{references,validation,fichiers,emails,fiches,interets,paiements}.ts`,
  `routes/{auth,referentiels,espace (compteurs),paiements,emplois}.ts`,
  `scripts/{reprise-legacy,lire-dump,donnees-demo,comptes-demo,exporter-referentiels}.ts`,
  `api/migrations/` (drizzle-kit).
- **Frontend** : `hooks.server.ts` (session BFF, visites, redirections legacy, en-têtes de sécurité),
  `lib/server/{api,session,referentiels,moderation,redirections,emplois}.ts`, `lib/components/ui/*`
  (système de design), `lib/components/layout/*`, `lib/navigation.ts`, `lib/format.ts`,
  `lib/forms.ts`, `routes/{+layout,+page,+error}`, authentification, emplois, paiement,
  `sitemap.xml`, `robots.txt`, `service-worker.ts`, manifeste PWA.
- **Endpoints socle** : `/api/auth/*` (login, logout, me, inscription, profil, photo, mot de passe,
  mot-de-passe-oublie, reinitialiser), `/api/referentiels/*` (enums, villes, secteurs, diplomes,
  familles-articles, banques, parametres, stats, a-la-une), `/api/visites`, `/api/espace/compteurs`,
  `/api/paiements/*` (preparer, declarer, miens, liste caisse, confirmer, rejeter), `/api/emplois/*`.
