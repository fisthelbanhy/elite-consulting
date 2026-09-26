# État d'avancement de la refonte

> Mis à jour le 22/09/2026. Remplace l'ancien `MIGRATION_STATUS.md` (tentative Django, archivée
> dans [historique/](historique/MIGRATION_STATUS-tentative-django.md) — son code n'existait plus).

## En bref

La refonte est **fonctionnellement complète** : les 7 sections du site legacy, les écrans
d'administration et les services transverses sont réécrits en SvelteKit 2 / Svelte 5 + FastAPI,
réorganisés en 3 piliers + boutique, et alimentés par les vraies données de production.

| Indicateur | Valeur |
|---|---|
| Pages SvelteKit | 149 (173 composants) |
| Endpoints API | 381 (259 chemins) |
| Tests automatisés backend | **185, tous verts** (`pytest`, ~2 min 30) |
| Typage frontend | `svelte-check` : **0 erreur** (26 avertissements mineurs « valeur initiale capturée » dans des formulaires) |
| Lint backend | `ruff` : aucune remarque |
| Build de production | OK (`npm run build`, adapter-node) |
| Poids de l'accueil (production) | ≈ 215 Ko transférés dont 83 Ko de JS (budget : 500 Ko / 100 Ko) — HTML non compressé par Node, à gzipper au reverse proxy |
| Code | ≈ 19 000 lignes Python (app) + ≈ 31 600 lignes Svelte/TS |

## 1. Analyse — terminée

| Livrable | Résultat |
|---|---|
| Visite du site en production | 7 sections × 3 onglets relevés en visiteur |
| Inventaire fonctionnel exhaustif | [inventaire/](inventaire/) : **483 points de recette** |
| Étude de marché et concurrence | [analyse-marche-concurrence.md](analyse-marche-concurrence.md) |
| Décisions | **11 ADR** dans [decisions/](decisions/README.md) |

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

## 3. Recette réalisée

- **Tests unitaires et d'API** : 185 tests (règles legacy, droits, machines à états, paiements,
  formats de références, sécurité).
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
| Déploiement : PostgreSQL, reverse proxy HTTPS + gzip, `LF_COOKIE_SECRET`, SMTP, sauvegardes | Exploitation | README |
| Tests de bout en bout navigateur automatisés (Playwright) — seuls des robots HTTP existent | Développement | — |

## 5. Commandes utiles

```bash
# Lancer l'API et le site ensemble (depuis la racine ; Ctrl+C arrête les deux)
npm run dev
# Recharger la base de dev avec les données de production (le dump reste local, ADR-0012)
npm run donnees:legacy
# Repartir du jeu de démonstration versionné (sans données personnelles)
npm run donnees:demo
# Comptes de démonstration (dev) : affiche des jetons de session à poser dans le cookie lf_session
node scripts/py.mjs scripts/comptes_demo.py
# Nouvelle migration après modification d'un modèle
node scripts/py.mjs -m alembic revision --autogenerate -m "description"
```
