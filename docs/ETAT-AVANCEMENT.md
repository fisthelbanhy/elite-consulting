# État d'avancement de la refonte

> Mis à jour le 28/09/2026.

## En bref

La refonte est **fonctionnellement complète** : les 7 sections du site legacy, les écrans
d'administration et les services transverses sont réécrits en SvelteKit 2 / Svelte 5 + Express 5,
réorganisés en 3 piliers + boutique, et alimentés par les vraies données de production.

Le backend a été réécrit en Express/TypeScript le 28/09/2026 (ADR-0013) : un seul
langage sur tout le projet, et surtout **un seul processus Node** en production, donc un seul
service à héberger. La bascule s'est faite à parité vérifiée, pas à l'estime — cinq outils de
comparaison le prouvent, détaillés dans l'ADR-0013.

| Indicateur | Valeur |
|---|---|
| Pages SvelteKit | 149 (173 composants) |
| Endpoints API | 381 (259 chemins) |
| Tests automatisés backend | **211, tous verts** (Vitest, ~17 s) |
| Typage frontend | `svelte-check` : **0 erreur** (26 avertissements mineurs « valeur initiale capturée » dans des formulaires) |
| Lint backend | Prettier + ESLint : aucune remarque ; `tsc` : 0 erreur |
| Build de production | OK (`npm run build`, adapter-node) |
| Poids de l'accueil (production) | ≈ 215 Ko transférés dont 83 Ko de JS (budget : 500 Ko / 100 Ko) — HTML non compressé par Node, à gzipper au reverse proxy |
| Code | ≈ 26 000 lignes TypeScript (API, hors table d'entités engendrée) + ≈ 31 650 lignes Svelte/TS (site) |

## 1. Analyse — terminée

| Livrable | Résultat |
|---|---|
| Visite du site en production | 7 sections × 3 onglets relevés en visiteur |
| Inventaire fonctionnel exhaustif | [inventaire/](inventaire/) : **483 points de recette** |
| Étude de marché et concurrence | [analyse-marche-concurrence.md](analyse-marche-concurrence.md) |
| Décisions | **13 ADR** dans [decisions/](decisions/README.md) |

## 2. Réalisation

- Socle backend/frontend, reprise des données, design system, accueil orienté conversion,
  authentification, paiement central : voir [modules/README.md](modules/README.md) (§ Socle).
- 8 modules métier : voir [modules/](modules/README.md) (un document par module, avec la
  correspondance point par point à la checklist).

### Couverture de la checklist de recette

| Bloc | Points | Couverture |
|---|---|---|
| Transverse (F-TRV) | 70 | Couverts (socle, Communication, Offres financières, Gestion) — F-TRV-24 : la photo est demandée dans le profil et non à l'inscription (inscription minimale, ADR-0008) |
| Administration (F-ADM) | 40 | Couverts (Gestion, Communication) |
| S1 Le saviez-vous ? | 40 | Couverts (Se lancer, Bien-être) |
| S2 Ressources humaines | 33 | Couverts (module Emplois) |
| S3 E-commerce | 75 | Couverts |
| S4 Appels de fonds | 67 | Couverts |
| Paiements (F-PAY) | 20 | Couverts (service central + 7 types d'objet payé) |
| S5 Opportunité d'affaire | 53 | Couverts — F-S5-52 volontairement modifié (intéressés visibles de l'auteur seulement) |
| S6 Entreprises - Marchés | 35 | Couverts |
| S7 Offres financières | 45 | Couverts (F-S7-44 via les référentiels de la gestion) |
| Transverse S5-S7 | 5 | Couverts |

Les écarts volontaires au legacy sont tous consignés dans les ADR 0004, 0007, 0008 et 0011.

### Migration du backend vers Express (28/09/2026)

Le contrat des 381 opérations a été gelé **avant** toute modification
([migration-express-parite.md](migration-express-parite.md)), puis chaque module porté et comparé
à l'original. Cinq outils, dans `api/scripts/`, transforment la promesse de parité en
vérification mécanique — ils disparaîtront avec l'ancien backend :

| Vérification | Résultat |
|---|---|
| Tables et colonnes | 62 tables, 718 colonnes identiques |
| Opérations exposées | 381 montées / 381 attendues |
| Réponses JSON, sur la même donnée | 162 routes de lecture identiques, champ par champ |
| Reprise des données legacy | 62 tables, 110 lignes identiques, même rapport |
| Mots de passe repris de l'ancien backend | acceptés ; les mauvais restent refusés |

La dernière ligne est la plus importante : les 68 membres gardent leur mot de passe, sans aucune
réinitialisation. La comparaison des réponses a révélé cinq régressions du portage (format des
dates, validation des paramètres de requête, dates du tableau de bord, apostrophes, ordre des
listes), toutes corrigées et consignées en I10 à I14 de l'ADR-0011.

## 3. Recette réalisée

- **Tests unitaires et d'API** : 211 tests (règles legacy, droits, machines à états, paiements,
  formats de références, sécurité). Chacun des 31 fichiers de tests de l'ancien backend a son
  équivalent, et trois s'y ajoutent (socle, référentiels, reprise legacy).
- **Parcours automatique en lecture** : robot suivant tous les liens avec 3 profils (visiteur,
  membre, gestionnaire) — ≈ 1 500 pages chargées, **aucune erreur serveur**, aucune page > 400 Ko.
- **Vérification des liens** : tous les liens internes (frontend et liens construits par l'API)
  pointent vers une route existante (6 liens cassés trouvés et corrigés à l'intégration).
- **Soumission automatique des formulaires** : ~40 formulaires de création/modification soumis
  comme un navigateur (membre et gestionnaire) : tous aboutissent ou renvoient la bonne erreur
  de validation. Parcours d'achat complet vérifié (panier → paiement → décrément de stock →
  confirmation par la caisse).
- **Recette visuelle** dans le navigateur (bureau et mobile) : accueil, inscription, emplois,
  appels de fonds, Likelemba, diagnostic, back-office.

## 4. Reste à faire

| Sujet | Qui | Référence |
|---|---|---|
| Validation juridique des modules à risque (épargne, carte de pointage, fiches santé, appels de fonds en crédit/actionnariat) | Porteur + juriste | ADR-0009 |
| Compléter les mentions légales (RCCM, NIU, raison sociale, hébergeur, durées de conservation) | Porteur | pages `/mentions-legales`, `/confidentialite`, `/conditions` |
| Connexion par code WhatsApp/SMS et paiement Mobile Money intégré (pawaPay) | Contrats puis développement | ADR-0010 |
| Séance photo (vraies personnes) pour remplacer les illustrations provisoires | Porteur | ADR-0008 |
| Convertir la vidéo produit legacy `pub3.WMV` en MP4 | — | ADR-0011 §6 |
| Recette métier par la frangine sur la checklist (483 points) avant mise en ligne | Porteur | `docs/inventaire/` |
| Déploiement : reverse proxy HTTPS + gzip, `LF_SITE_URL`, `LF_COOKIE_SECRET`, SMTP, sauvegardes du fichier SQLite | Exploitation | README |
| Tests de bout en bout navigateur automatisés (Playwright) — seuls des robots HTTP existent | Développement | — |
| Rejouer la reprise legacy sur le **vrai dump**, avec le script TypeScript, et relire le rapport | Porteur (poste local) | README § « vraies données » |

## 5. Commandes utiles

```bash
# Lancer l'API et le site ensemble (depuis la racine ; Ctrl+C arrête les deux)
npm run dev
# Production : un seul processus Node sert le site et l'API
npm run build && LF_SITE_URL=https://… npm start
# Recharger la base de dev avec les données de production (le dump reste local, ADR-0012)
npm run donnees:legacy -- ../cp1019011_lafrangine.sql --images ../lafrangine/V04/image/ig
# Repartir du jeu de démonstration versionné (sans données personnelles)
npm run donnees:demo
# Comptes de démonstration (dev) : affiche des jetons de session à poser dans le cookie lf_session
npm --prefix api run comptes:demo
# Nouvelle migration après modification du schéma, puis application
npm run migration && npm run migrer
```
