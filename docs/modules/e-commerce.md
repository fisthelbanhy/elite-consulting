# Module E-commerce (section 3 legacy) — Immobilier, Petites annonces, Courses & livraison

> Sources : `docs/inventaire/02-s3-ecommerce-s4-fonds-paiements.md` (§2, §4, checklist F-S3-01 à
> F-S3-75, F-PAY), `docs/data-dictionary-commerce.md` (§2, §7, §12–14, §16), ADR-0004, 0006,
> 0007 (S3a, S3b, S3c), 0008. Legacy : `choix3.php`, `incl-choix3A/B/C.php`, `incl-immobilier.php`,
> `incl-article.php`, `incl-course-1.php` (actif), `particlecourse.php`.

## 1. Fichiers

| Couche | Fichiers |
|---|---|
| API | `backend/app/routers/immobilier.py`, `annonces.py`, `courses.py` |
| Schémas | `backend/app/schemas/immobilier.py` (+ intérêts, états partagés), `annonces.py`, `courses.py` |
| Service | `backend/app/services/ecommerce.py` : panier articles, contrôle de stock, `Traitement` de paiement types 2 et 4, notifications |
| Tests | `backend/tests/test_immobilier.py`, `test_annonces.py`, `test_courses.py` (17 tests) |
| BFF | `frontend/src/lib/server/immobilier.ts`, `annonces.ts`, `courses.ts` |
| Types | `frontend/src/lib/types/immobilier.ts`, `annonces.ts`, `courses.ts` |
| Composants | `frontend/src/lib/components/immobilier/*` (CarteBien, FiltresBiens, FormulaireBien, libelles.ts), `annonces/*` (CarteArticle, FormulaireArticle, BlocAchat, BlocInteret, InteretsRecus, EncartFiches, Vignette — les quatre derniers sont partagés avec l'immobilier), `courses/*` (CarteCourse, FiltresCourses, TableauGeneral, FormulaireCourse, LignesCourse, ChoixCatalogue, ChoixBoutique, RecapCourse, EtapesCourse, BadgeEtatCourse, PresentationCourses, FormulaireArticleCatalogue) |

Aucune colonne ajoutée aux modèles ; aucun fichier partagé modifié.

## 2. Pages

| URL | Rôle | Accès |
|---|---|---|
| `/immobilier` | Liste (onglets Tout / Offres / Recherches / Mes annonces avec compteurs), recherche + filtres repliables, encarts « Nouveautés » / « Les plus visités » | public (encarts masqués au gestionnaire) |
| `/immobilier/[id]` | Fiche (photo, caractéristiques, JSON-LD `RealEstateListing`), besoin/intéressement, contributions reçues, modération | public ; bloc intérêt : membres |
| `/immobilier/publier`, `/immobilier/[id]/modifier` | Formulaire | connecté / auteur ou gestionnaire habilité |
| `/annonces` | Grille d'articles, filtres, encarts, accès panier | public |
| `/annonces/[id]` | Fiche (JSON-LD `Product`), ajout au panier (offre) ou intéressement (recherche) | public |
| `/annonces/publier`, `/annonces/[id]/modifier` | Formulaire | connecté / auteur ou gestionnaire |
| `/annonces/panier` | Panier (quantité, retrait, stock), total, paiement → `/paiement/2`, derniers achats ; gestionnaire : paniers de tous | connecté |
| `/courses` | Visiteur : présentation du service (étapes, tarifs, conditions, boutiques). Membre : ses courses (+ « Commandes reçues » pour une boutique), filtres, vue Synthèse / Général | public / connecté |
| `/courses/nouvelle`, `/courses/[id]/modifier` | Choix facultatif d'une boutique (GET), catalogue + saisie libre, vérification puis confirmation | connecté |
| `/courses/[id]` | Suivi (étapes), articles, montants, paiement → `/paiement/4?objet={id}`, annulation, gestion de l'état, contact client (boutique/gestionnaire) | client, boutique concernée, gestionnaire |
| `/courses/catalogue`, `/catalogue/nouveau`, `/catalogue/[id]` | Catalogue « Vos articles » | boutique partenaire, gestionnaire |

## 3. Endpoints (`/api`)

**Immobilier** : `GET /immobilier` (`type, transaction, type_bien, ville_id, quartier_id, chambres, pieces_min, surface_min, surface_max, prix_min, prix_max, q, etat, miens, tri=prix|prix_desc|recent|visites`), `GET /immobilier/compteurs`, `GET /immobilier/encarts`, `GET /immobilier/{id}`, `POST /immobilier`, `PUT /immobilier/{id}`, `POST /immobilier/{id}/photo`, `POST /immobilier/{id}/etat`, `DELETE /immobilier/{id}`, `POST /immobilier/{id}/interet`.

**Petites annonces** : `GET /annonces` (`type, famille_id, neuf_ou_occasion, prix_min, prix_max, q, etat, miennes, tri=famille|recent|prix|prix_desc`), `GET /annonces/compteurs`, `GET /annonces/encarts`, `GET /annonces/panier`, `PUT /annonces/panier/{ligne}` (quantité), `DELETE /annonces/panier/{ligne}`, `GET|PUT|DELETE /annonces/{id}`, `POST /annonces`, `POST /annonces/{id}/photo|etat|interet|panier`.

**Courses** : `GET /courses/boutiques`, `GET|POST /courses/catalogue`, `GET|PUT|DELETE /courses/catalogue/{id}`, `POST /courses/catalogue/{id}/photo|etat`, `GET /courses` (`etat_course, commande_min/max, achat_min/max, livraison_min/max, q, role=client|boutique, boutique_id, etat`), `POST /courses/verifier` (`?course_id=` en modification), `POST /courses`, `GET|PUT|DELETE /courses/{id}`, `POST /courses/{id}/etat-course`, `POST /courses/{id}/etat`.

**Paiement** (page générique, `services/ecommerce.py`) : type 2 « Article » — montant = total du panier articles non payé du membre ; `enregistrer` décrémente les stocks, marque les lignes payées (+ date, `paiement_id`) ; `rejeter` restitue les stocks, remet les lignes impayées et prévient le membre. Type 4 « Course » — montant = achats + frais ; `enregistrer` : `course.paye = Oui`, `mode_paiement`, boutique prévenue ; `rejeter` : course de nouveau à payer, client prévenu. Libellé/montant refusés (400/403) si panier vide, stock insuffisant, course d'un autre, annulée ou déjà payée : le formulaire de paiement n'est alors plus proposé.

## 4. Règles appliquées (extraits)

- Droits vérifiés côté API (le legacy n'en vérifiait aucun) : auteur ou gestionnaire + Activation pour modifier/supprimer, Activation pour l'état de fiche, Caisse pour confirmer/rejeter (module paiements).
- Publication immédiate (état 2), références `IMB`/`ACL`/`CRS` au format legacy, messages legacy à l'orthographe corrigée (« Veuillez indiquer la transaction. », « Cette fiche existe déjà. », « Le libellé de l'article doit avoir 5 caractères minimum. », « Cet article est déjà enregistré. », « Veuillez indiquer le lieu des achats avec 10 caractères minimum. », « Le montant des courses ne doit pas être inférieur à 5 000 FCFA. », « Cette course est déjà faite. »…).
- Consultations comptées pour les tiers seulement, sans plafond ; surface et quantités en entiers standard.
- Intérêts via `services/interets.deposer` : 1 par membre et par fiche, 5 caractères minimum, auteur prévenu, liste visible de l'auteur et des gestionnaires ; refusés au gestionnaire et sur sa propre fiche.
- Panier : prix figé à l'ajout, cumul si même article et même prix, quantité ≤ stock restant (lignes déjà au panier comprises), paiement bloqué si une ligne dépasse le stock ou vise un article retiré.
- Course : montant calculé serveur sur les seules lignes enregistrées, frais figés à la création, date du jour acceptée, livraison 10 h–18 h 59 non passée et ≥ date des achats, lignes réellement remplacées en modification, fiche figée hors « En attente » ou une fois payée.

## 5. Correspondance checklist

| Points | Couverture |
|---|---|
| F-S3-01 à 03 | Rubriques Immobilier / Petites annonces / Courses dans le pilier « Opportunités » (ADR-0008) ; compteurs publiés dans les onglets ; pas de compteur pour Courses |
| F-S3-04, 05 | Onglets Offres/Recherches (+ « Tout ») ; CTA « Publier une annonce » pour tous (connexion demandée ensuite) |
| F-S3-06 à 08 | Encarts 5 + 5 pour visiteurs/membres, absents pour le gestionnaire ; aucun encart d'articles sur Courses (correctif) |
| F-S3-09 à 28 | Liste, filtres (ET, OU parenthésé), tri prix, pagination réelle 20/page, fiche, visites, besoin/intéressement, formulaire, unicité, droits API |
| F-S3-29 à 41 | Grille, filtres, tri famille+prix, fiche, article supprimé invisible, panier, intéressement recherche, règles, unicité réparée, vraie date, quantité > 127 |
| F-S3-42 à 46, F-PAY-02/07/08/09/18 | Panier, suppression de ses lignes, vue gestionnaire, blocage stock, paiement type 2 |
| F-S3-47 à 50 | Visibilité client / boutique / gestionnaire, filtres corrigés, vues Synthèse / Général, cartes |
| F-S3-51 à 65, 68 | Conditions, boutique facultative, règles, grille 25 lignes (ajout à la demande), vérification puis enregistrement, doublon, lignes modifiables, dates en `DATE`/`DATETIME` |
| F-S3-66, 67 | Paiement type 4 (achats + frais) qui met à jour l'état de paiement ; rejet de la caisse → à payer |
| F-S3-69 à 75 | Catalogue boutique ; mode catalogue porté comme option de la commande (ADR-0007 S3c) |

## 6. Écarts et décisions (à reporter dans un ADR)

1. **Adresse précise d'un bien** (`localisation`) réservée à l'auteur et aux gestionnaires (le legacy ne l'affichait pas ; sécurité des biens occupés).
2. **Surface** plafonnée à 100 000 m² (terrains) au lieu de 2 000.
3. **Onglet « Tout »** ajouté : la liste s'affiche sans sous-onglet (F-S3-04 assoupli).
4. **Intérêt** : unicité par membre et par fiche (ADR-0007 S2d) au lieu de « par jour » pour l'immobilier.
5. **Pagination** 20 (immobilier, courses) / 24 (annonces) au lieu du sélecteur 50–500 (ADR-0007 T2).
6. **Panier** : modification de quantité possible (le legacy imposait de supprimer puis réajouter) ; ajout de son propre article refusé.
7. **Courses — mode de paiement** : n'est plus demandé dans le formulaire de commande (F-S3-60) ; il est choisi sur la page de paiement générique et recopié dans `course.mode_paiement`. L'« état de paiement » n'est plus saisi à la main par le gestionnaire (F-S3-66) : il suit le journal des paiements (déclaration → Oui, rejet → Non).
8. **Courses — ligne incomplète bloquante** (le legacy la signalait sans bloquer et la comptait dans le montant sans l'enregistrer).
9. **Courses — lieu d'achat** facultatif quand une boutique est choisie (nom + adresse de la boutique repris).
10. **Courses — gestion de l'état** ouverte à la **boutique concernée** en plus du gestionnaire habilité ; le client peut seulement annuler une course en attente non payée ; suppression de la fiche réservée au gestionnaire habilité.
11. **Courses — filtres** : chaque borne de date s'applique seule (jour inclus) ; tri par date de commande décroissante (le tri legacy par référence texte n'avait pas de sens).
12. **Courses — heures** proposées par créneaux de 30 min (10 h – 18 h 30) ; l'API accepte toute minute de 10:00 à 18:59 et refuse une heure déjà passée.
13. **Catalogue** : nom ≥ 3 caractères (message et règle harmonisés), un gestionnaire habilité peut créer un article pour une boutique (impossible en legacy).
14. **Notifications** (messagerie de la frangine) : boutique prévenue d'une nouvelle commande et d'un paiement ; client prévenu d'un changement d'état et d'un paiement rejeté ; acheteur prévenu d'un paiement d'articles rejeté.

## 7. Besoins sur des fichiers partagés

- Pied de page (`components/layout`) : lien « Vos articles » → `/courses/catalogue` pour les boutiques et les gestionnaires (F-S3-69). En attendant, le lien figure sur `/courses`.
- `app/routers/paiements.py` / page `/paiement/[type]` : afficher le libellé « Course » (type 4) dans la liste de la caisse — l'énumération `TypeObjetPaye` le porte déjà.
