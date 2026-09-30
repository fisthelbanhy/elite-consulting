# Module « Offres financières » (section 7 legacy)

> Pilier **Financer & épargner** (ADR-0008) — conseil financier, accompagnement, trésorerie,
> dialogue « Écrire à la frangine », tarifs bancaires. Spécifications : inventaire
> `03-…` §4 (S7-0 à S7-18) et checklist F-S7-01 à F-S7-45 ; `01-…` E-TRV-11 (F-TRV-56 à 58).

## 1. Fichiers

| Couche | Fichiers |
|---|---|
| Routeurs | `api/src/routes/{conseil-financier,accompagnement,tresorerie,dialogues,tarifs-bancaires}.ts` |
| Schémas | Zod, dans chaque routeur |
| Services | `api/src/services/questionnaires-accompagnement.ts` (libellés et découpage des 4 questionnaires), `api/src/services/tresorerie.ts` (banques, e-mail aux banques, Débit/Crédit), `api/src/services/tarifs-bancaires.ts` (initialisation du référentiel) |
| Tests | `api/tests/{conseil-financier,accompagnement,tresorerie,dialogues,tarifs-bancaires}.test.ts` (29 tests) |
| Frontend serveur | `src/lib/server/{conseil-financier,accompagnement,tresorerie,dialogues,tarifs-bancaires}.ts` |
| Types | `src/lib/types/` (mêmes noms) |
| Composants | `src/lib/components/{conseil-financier,accompagnement,tresorerie,dialogues,tarifs-bancaires}/` |

Aucune colonne ni table ajoutée : les tables existantes de `finance.ts` et `dialogue` suffisent.

## 2. Pages

| URL | Contenu | Accès |
|---|---|---|
| `/conseil-financier?rubrique=1\|2` | Onglets Conseil financier / Actus & décryptages / Accompagnement (→ `/accompagnement`), recherche, liste | Présentation pour les visiteurs, liste pour les membres |
| `/conseil-financier/nouveau` | Sujet (rubrique, objet, texte, confidentialité) | Membre |
| `/conseil-financier/[id]` | Sujet, fil de réponses, réponse, clôture, `?modifier=1`, modération | Auteur / public / gestionnaire |
| `/accompagnement` | Présentation des 4 accompagnements (« on prépare votre dossier avec vous ») | Public (SEO) |
| `/accompagnement/[type]` | `business-plan`, `projet-agricole`, `restructuration-credit`, `credit-immobilier` : sommaire + mes dossiers (gestionnaire : tous, filtres) | Public / membre |
| `/accompagnement/[type]/nouveau`, `/[id]` | Formulaire long par sections repliables, progression, Sauvegarder / Envoyer | Membre (ses dossiers), gestionnaire |
| `/tresorerie` | Accueil des 4 services | Public |
| `/tresorerie/{placements,operations,credits,contentieux}` | Liste + fil « Écrire à la frangine » ; vue gestionnaire Débit/Crédit pour les opérations | Membre |
| `…/nouveau`, `…/[id]` | Saisie ; fiche, `?modifier=1`, suivi (état, annulation), dialogue ; « Envoyer le mail » (opérations) | Titulaire / gestionnaire |
| `/tarifs-bancaires` | Tableau comparatif (filtres type / banques), `?saisie={banque}` grille de tarifs, `?gestion=1` référentiel | Membre ; saisie : gestionnaire habilité ou membre « banque » |

## 3. Endpoints (`/api`)

- **Conseil financier** : `GET /conseil-financier?rubrique&q&etat&miens`, `GET /conseil-financier/compteurs`,
  `GET|PUT|DELETE /conseil-financier/{id}` (PUT/DELETE valent aussi pour une réponse),
  `POST /conseil-financier`, `POST /{id}/reponses`, `POST /{id}/cloture`, `POST /{id}/etat`.
- **Accompagnement** : `GET /accompagnement/questionnaires[/{slug}]` (public), `GET /accompagnement?type&q&etat&membre_id`,
  `GET /accompagnement/compteurs`, `GET|PUT|DELETE /accompagnement/{id}`, `POST /accompagnement`
  (`{type_dossier, objet, reponses: {"4": "…"}, envoyer}`), `POST /{id}/etat`.
- **Trésorerie** : `GET /tresorerie/compteurs` ; pour `placements`, `operations`, `credits`, `contentieux` :
  `GET` (liste), `POST`, `GET|PUT|DELETE /{id}` (DELETE = annulation), `POST /{id}/etat`.
  Opérations : `POST /tresorerie/operations` (`{lignes: [...]}`, 1 à 15), filtres gestionnaire
  `date_min, date_max, banque_id, type_operation, montant_min, montant_max, reference, membre_id`,
  `GET /tresorerie/operations/synthese` (totaux Débit/Crédit par devise), `POST /{id}/mail`.
- **Dialogue** : `GET /dialogues?type&q&membre_id`, `GET /dialogues/conversations?type` (gestionnaire), `POST /dialogues`.
- **Tarifs bancaires** : `GET /tarifs-bancaires?type_id&banque_id…`, `POST /initialiser`,
  `POST|PUT|DELETE /types[/{id}]`, `POST|PUT|DELETE /operations[/{id}]`, `POST|PUT|DELETE /tarifs[/{id}]`,
  `PUT /tarifs-bancaires/banques/{banque_id}` (grille `{tarifs: {operation_id: texte}}`).

## 4. Règles et correspondance checklist

| Points | Mise en œuvre |
|---|---|
| F-S7-01, F-S7-02 | Onglets conservés (Actus & décryptages = Rumeurs économiques) ; visiteurs : encart « Veuillez vous connecter pour y avoir accès. » sur tous les écrans ; l'API renvoie 401 |
| F-S7-03 à F-S7-06 | Un sujet ouvert (état 1/2) par rubrique pour un membre ; objet et texte ≥ 2 ; référence CFR ; doublon d'objet signalé ; tri croissant (conseil) / décroissant (actus) ; recherche objet + texte + référence ; supprimés exclus |
| F-S7-07 | **Décision** : un sujet privé n'est visible que de son auteur et des gestionnaires (cf. S1a) |
| F-S7-08 à F-S7-11 | Modification par l'auteur (même simple membre) ou gestionnaire habilité ; réponses ≥ 2, doublon « Ce message est déjà envoyé. » (dans le sujet), confidentialité héritée, compteur ; clôture par l'auteur ou un gestionnaire, sujet clôturé fermé aux réponses ; l'auteur est prévenu quand un conseiller répond |
| F-S7-12 à F-S7-21 | Libellés exacts (orthographe corrigée) et découpage legacy dans `questionnaires-accompagnement.ts` (55, 77, 45, 35 questions) ; objet ≥ 10 ; doublon membre + objet ; ABP/APA/ARC/ACI ; toutes les zones enregistrées et rechargées (question 48 incluse) ; modification effective ; consultation réservée au titulaire et aux gestionnaires |
| F-S7-22 à F-S7-24 | Listes par sous-rubrique (membre : les siennes ; gestionnaire : toutes + filtre d'état), annulation avec confirmation, contentieux compris |
| F-S7-25 à F-S7-28 | Placement : messages legacy, banques ≥ 1 sans limite d'id, type modifiable sans perte, anti-doublon clarifié, état par gestionnaire habilité |
| F-S7-29 à F-S7-34 | Grille 1–15 ordres, lignes incomplètes signalées ligne par ligne, anti-doublon legacy, e-mail « Programmation opérations bancaires » à la banque émettrice (saisie, sinon adresse du référentiel), renvoi depuis la fiche, date d'opération modifiable, vue gestionnaire Débit/Crédit corrigée |
| F-S7-35, F-S7-36 | Crédit : messages legacy, apport affiché avec sa propre valeur, délai 0–366 ; contentieux : 10 montants + détails, dette et revenus mensuels > 0, boutons réservés au titulaire/gestionnaire |
| F-S7-37 à F-S7-40, F-TRV-56 à 58 | Fil par sous-rubrique sur chaque page de trésorerie (liste et fiche), écriture dans les 4 rubriques, réponse au bon membre (et notification), conversations « À répondre » pour le gestionnaire, visiteurs exclus, recherche |
| F-S7-41 à F-S7-43 | Comparatif banques × opérations, filtres par type et banques, saisie par gestionnaire habilité ou membre « banque » (`banque.membre_id`), modification effective, initialisation proposée si vide |
| F-S7-45 | Tous les droits vérifiés côté API |

## 5. Écarts et décisions (à reporter dans un ADR)

1. **Objet d'accompagnement ≥ 10 caractères** (et non 11) : règle réelle du legacy (`strlen < 10`), message exact et inventaire §5.2 ; constante `OBJET_MIN`.
2. **Sauvegarder / Envoyer** (accompagnement) : brouillon = état 1, envoyé = état 2, traité = état 4 (comme ADR-0004 pour le business plan). Le membre ne modifie plus un dossier traité ; le changement d'état par le conseiller le prévient par la messagerie.
3. **Sujet privé** visible du seul auteur et des gestionnaires ; en « Conseil financier » le membre peut choisir de rendre sa question publique (privé par défaut), « Actus » toujours public.
4. **Clôture** possible dans les deux rubriques (sinon un membre ne pourrait jamais ouvrir un nouveau sujet « Actus ») ; doublon de réponse contrôlé dans le sujet, non plus sur tout le forum.
5. **Banques d'un placement** : colonne texte conservée, liste d'identifiants séparés par « * » (lecture compatible avec le format positionnel legacy) — pas de table N-N, pas de migration.
6. **Référence commune** à un lot d'opérations bancaires (comportement legacy constaté) ; une banque bénéficiaire n'est pas exigée pour un versement ou un retrait ; « Autres » n'est plus proposée (remplacée par « Autre banque (non listée) » + nom libre).
7. **E-mail aux banques** : un e-mail par adresse, regroupant les ordres du lot ; `Reply-To` = e-mail du membre ; adresse du référentiel utilisée si aucune n'est saisie.
8. **Tarifs** : un seul tarif actif par banque et par opération (la règle legacy banque + opération + tarif est incluse) ; initialisation des 9 types / 25 opérations avec un rattachement opération → type décidé ici (voir `services/tarifs-bancaires.ts`), les types « Escompte » et « Encaissement d'effets » restent vides.
9. **États de trésorerie** affichés « En attente / Enregistrée / Annulée / Traitée » ; le titulaire ne modifie plus une fiche traitée ; le changement d'état notifie le membre.
10. **Dialogue** : type 0 (accueil) accepté par l'API ; anti-double envoi (même texte < 2 min) ; la page 1 contient les 50 messages les plus récents.

## 6. Points ouverts / fichiers partagés

- Données reprises : les 5 réponses legacy de `dialogue` adressées au membre n° 1 (bug) restent telles quelles ; une correction de reprise (réattribuer au dernier auteur du fil) relèverait de `api/src/scripts/reprise-legacy.ts`.
- F-S7-44 (administration du référentiel `banque`) n'est pas dans ce module : l'écran gestionnaire des banques reste à porter (lecture seule ici).
