# Module « Se lancer » (forum, Découverte de soi, diagnostic, réussites)

Pilier « Se lancer » de l'ADR-0008, hors Business plan et Accompagnement (autres modules).
Legacy : `incl-choix1A.php`, `incl-conseil.php` (forum « Informations utiles »),
`incl-choix1B.php`, `incl-sounga.php` (« Lisungui »), `incl-reussite.php`,
`incl-choix6B-Reussite.php` (réussites, module mort en V04). Inventaire : E-S1-00 à E-S1-04,
F-S1-01 à F-S1-26, F-S6-34. Arbitrages : ADR-0004, ADR-0007 S1a, S1c, S6b, ADR-0008 §3.

## Fichiers

| Couche | Fichiers |
|---|---|
| API | `backend/app/routers/{questions,decouverte,reussites}.py` |
| Schémas | `backend/app/schemas/{questions,decouverte,reussites}.py` |
| Service | `backend/app/services/decouverte.py` (questions du diagnostic, validation des codes, restitution, report dans la fiche, message à la conseillère) |
| Tests | `backend/tests/test_{questions,decouverte,reussites}.py` (18 tests) |
| Pages | `/se-lancer`, `/diagnostic`, `/diagnostic/resultat`, `/diagnostic/enregistrer` (point d'entrée GET, sans page), `/diagnostic/merci`, `/decouverte-de-soi`, `/decouverte-de-soi/fiches`, `/decouverte-de-soi/fiches/[id]`, `/questions`, `/questions/nouveau`, `/questions/[id]`, `/questions/[id]/modifier`, `/reussites`, `/reussites/[id]`, `/reussites/ma-fiche` |
| Composants | `lib/components/questions/{CarteSujet,FormulaireSujet,ReponseSujet}`, `lib/components/decouverte/{questions.ts,ChampQuestion,Questionnaire,ReponsesFiche,Correspondance,Presentation,PanneauSuivi}`, `lib/components/diagnostic/{EtapeQuestion,Restitution,PlanAction}`, `lib/components/reussites/{CarteReussite,FormulaireReussite}` |
| Serveur | `lib/server/questions.ts` (`enregistrerSujet`, `actionsReponses`), `lib/server/decouverte.ts` (`enregistrerFiche`, `cloturerFiche`), `lib/server/diagnostic.ts` (cookie signé, questions en cache), `lib/server/reussites.ts` (`enregistrerReussite`) |
| Types | `lib/types/{questions,decouverte,reussites}.ts` |

## Endpoints (`/api`)

### Forum « Questions & conseils » (`/questions`, table `conseil`)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /questions?q=&miens=&confidentialite=&etat=&page=&taille=` | public | Sujets du plus récent au plus ancien, recherche dans objet, texte, référence. Visiteur : sujets publics publiés ou clôturés ; membre : + ses sujets non supprimés ; gestionnaire : tout sauf supprimés (`etat` pour filtrer) |
| `GET /questions/derniers?n=10` | public | 10 derniers sujets publiés visibles (colonne de droite legacy) |
| `GET /questions/compteurs` | public | `{sujets}` : sujets publiés visibles, réponses exclues |
| `GET /questions/{id}` | selon visibilité | Fil : sujet + réponses chronologiques, `peut_modifier`, `peut_moderer`, `peut_repondre`, `est_auteur` ; `de_la_frangine` sur les réponses de gestionnaires |
| `POST /questions` | connecté | Création : confidentialité 1/2, objet ≥ 5 (120 max), texte ≥ 20, anti-doublon, référence `CSL…`, état 2 ; sujet privé → message dans le fil du membre pour la frangine |
| `PUT /questions/{id}` | auteur ou droit Activation | Objet, texte, confidentialité (répercutée sur les réponses) |
| `POST /questions/{id}/etat` | droit Activation | 1 masqué, 2 publié, 3 supprimé, 4 clôturé |
| `DELETE /questions/{id}` | auteur ou droit Activation | Suppression logique |
| `POST /questions/{id}/reponses` | connecté voyant le sujet | Réponse ≥ 2 caractères, hérite de la confidentialité et de la référence, état 2, recompte `nombre_reponses`, prévient l'auteur du sujet |
| `PUT /questions/reponses/{rid}` | auteur ou droit Activation | Correction sans contrainte d'objet ni de 20 caractères |
| `POST /questions/reponses/{rid}/etat`, `DELETE /questions/reponses/{rid}` | droit Activation / auteur ou droit Activation | Modération, suppression logique (compteur recalculé) |

### Découverte de soi et diagnostic (`/decouverte`, table `soungangai`)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /decouverte/diagnostic/questions` | public | Les 8 questions du diagnostic et leurs choix (codes + libellés ; villes lues en base) |
| `POST /decouverte/diagnostic/restitution` | public | Restitution sans rien enregistrer : profil, points d'appui, points d'attention, 3 étapes (liens du site), réponses lisibles, résumé |
| `POST /decouverte/diagnostic` | connecté | Crée ou complète la fiche du membre (sans écraser ses réponses), rouvre une fiche clôturée, stocke `diagnostic` + `date_diagnostic`, dépose le message « Nouveau diagnostic » (`de_la_frangine=False`) ; renvoi identique sous 24 h = pas de second message |
| `GET /decouverte/moi` | connecté | Sa fiche (ouverte ou clôturée) ou `null` |
| `GET /decouverte?q=&cloturee=&diagnostic=&page=&taille=` | gestionnaire | Toutes les fiches non supprimées (« N Lisungui »), recherche référence / nom / pseudonyme |
| `POST /decouverte` | connecté | Création (26 questions + correspondance membre), référence `LSG…`, une seule fiche par membre : « Fiche de découverte de soi du membre déjà enregistrée. » |
| `GET /decouverte/{id}` | propriétaire ou gestionnaire | Détail, `peut_modifier`, `peut_moderer`, `peut_repondre` |
| `PUT /decouverte/{id}` | propriétaire (fiche ouverte) ou droit Activation | Modification ; `notes_conseillere` n'est jamais modifiable par ce biais |
| `PUT /decouverte/{id}/correspondance` | gestionnaire | « Correspondance la frangine » ; le membre est prévenu dans sa messagerie |
| `POST /decouverte/{id}/cloture` | propriétaire ou droit Activation | `{cloturee: bool}` : clôture ou réouverture |
| `POST /decouverte/{id}/etat` | droit Activation | « État fiche » (suivi) : 1 à étudier, 2 suivie |
| `DELETE /decouverte/{id}` | droit Activation | Suppression logique (`etat` = 3) |

### Réussites (`/reussites`, table `reussite`)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /reussites?q=&secteur_id=&etat=&page=&taille=` | public | Réussites **publiées** seulement (même pour un gestionnaire, sauf `etat` explicite réservé aux gestionnaires), membres supprimés exclus ; recherche projet ou pseudonyme ; plus récentes d'abord. Contrat de l'accueil : `items[{id, projet, succes, conseil, auteur{id, pseudonyme, photo_url}, secteur}]` (+ `reference`, `situation_avant`, `secteur_id`, `photo_url`, `etat`, `date_creation`) |
| `GET /reussites/compteurs` | public | `{publiees, a_valider}` (`a_valider` = 0 hors gestionnaires) |
| `GET /reussites/moi` | connecté | Son témoignage ou `null` |
| `GET /reussites/{id}` | public si publiée ; auteur et gestionnaires sinon | Détail complet (montants compris), `est_auteur`, `peut_modifier`, `peut_moderer` |
| `POST /reussites` | connecté | Secteur obligatoire, projet ≥ 10, une seule fiche par membre, référence `RST…`, état 1 (à valider), message à la frangine |
| `PUT /reussites/{id}` | auteur ou droit Activation | Modification ; l'auteur d'une fiche publiée la renvoie en relecture (état 1) |
| `POST /reussites/{id}/photo` | auteur ou droit Activation | Photo (image), portrait prioritaire dans `auteur.photo_url` |
| `POST /reussites/{id}/etat` | droit Activation | Validation 1 → 2 : l'auteur est félicité dans sa messagerie |
| `DELETE /reussites/{id}` | auteur ou droit Activation | Suppression logique |

## Parcours du diagnostic (ADR-0008 §3)

1. `/diagnostic?etape=n` : une question par écran, un bouton par réponse (`name=clé`, `value=code`),
   barre de progression, « Question précédente ». Fonctionne **sans JavaScript** (form action
   `?/repondre` + redirection 303). On ne peut pas sauter une question sans réponse.
2. Réponses gardées dans le cookie httpOnly **signé HMAC-SHA256** `lf_diagnostic` (chemin
   `/diagnostic`, 7 jours). Pas de localStorage.
3. `/diagnostic/resultat` : restitution calculée par l'API, CTA unique « Recevoir mon plan
   d'action », CTA secondaire WhatsApp pré-rempli avec le résumé, « Revoir / modifier mes réponses ».
4. Connecté : action `?/enregistrer` → `POST /decouverte/diagnostic` → cookie effacé →
   `/diagnostic/merci`. Visiteur : `/inscription?suite=/diagnostic/enregistrer` (ou `/connexion?suite=…`) ;
   au retour, le GET `/diagnostic/enregistrer` enregistre, efface le cookie et redirige.
5. `/diagnostic/merci` relit la fiche (`GET /decouverte/moi`) : confirmation, téléphone à vérifier,
   restitution, CTA « Compléter ma Découverte de soi ».

Correspondance diagnostic → fiche (seulement si le champ est vide) : activité actuelle (q1),
savoir-faire (q2), moyens disponibles (q23), entourage valorise l'activité (q18 : oui → 1, non → 2),
a déjà fait du commerce (q10 = Oui si le membre vend déjà).

## Correspondance avec la checklist

| Point | Implémentation |
|---|---|
| F-S1-01 | Les anciens onglets deviennent des pages du pilier (`/questions`, `/decouverte-de-soi`, `/bien-etre` hors périmètre) présentées sur `/se-lancer` |
| F-S1-02 | `GET /questions/compteurs` : sujets publiés seulement (onglet « Tous les sujets ») |
| F-S1-03, F-S1-04 | `GET /questions` + recherche `q` ; supprimés jamais montrés |
| F-S1-05 | `auteur_nom` rempli pour gestionnaire, auteur, Master (sujet public) ; sinon pseudonyme seul |
| F-S1-06 | Visibilité SQL et contrôle du détail (404) ; test dédié |
| F-S1-07 | `GET /questions/derniers` (colonne « Derniers sujets », page pilier) |
| F-S1-08 | `/questions/[id]` ; les visiteurs lisent aussi les fils publics (écart ci-dessous) |
| F-S1-09 | `DELETE` sujet / réponse, confirmation côté interface |
| F-S1-10 à F-S1-12 | `POST /questions`, messages legacy, référence `CSL…`, état 2, doublon |
| F-S1-13 | `PUT /questions/{id}` protégé par `verifier_modification` |
| F-S1-14 | `POST /questions/{id}/etat` (+ état 4 « clôturé ») |
| F-S1-15, F-S1-16 | `POST /questions/{id}/reponses`, `PUT /questions/reponses/{rid}` |
| F-S1-17 | Visiteur : présentation + CTA, aucune fiche |
| F-S1-18, F-S1-19 | `/decouverte-de-soi` : création en 6 étapes ; fiche ouverte → modification directe |
| F-S1-20 | Référence `LSG…`, fiche unique (contrainte + message legacy) |
| F-S1-21 | Chaque champ Oui/Non restitue sa propre valeur (bug de la question 26 corrigé, test) |
| F-S1-22 | `PUT /decouverte/{id}/correspondance`, lecture seule côté membre |
| F-S1-23 | Clôture/réouverture : membre ou droit Activation ; « État fiche » : droit Activation |
| F-S1-24 | `/decouverte-de-soi/fiches` : compteur, référence, date, membre (lien profil) |
| F-S1-25 | Suppression logique avec confirmation (liste et fiche) |
| F-S1-26 | Fiche clôturée : lecture seule + « Rouvrir ma fiche » (ADR-0007 S1c) |
| F-S6-34 | Réussites conservées et mises en avant (ADR-0007 S6b) : validation, liste publique, accueil |

## Écarts et décisions (à reporter dans un ADR)

1. **Visiteurs et fils publics** : le legacy réservait « Vos commentaires » aux connectés ; les
   fils publics sont désormais lisibles par tous (SEO, valeur d'abord). Répondre exige un compte.
2. **État 4 « Clôturé » d'un sujet** : lisible, plus de réponse possible. État 1 = masqué au public.
3. **Doublon de sujet** : même objet (casse ignorée) qu'un de ses sujets ou qu'un sujet public ;
   doublon de réponse : même texte du même auteur dans le même fil (le legacy comparait toute la table).
4. **Suppression d'un sujet par son auteur** autorisée (règle commune `supprimer()`), en plus du gestionnaire.
5. **Notifications** (nouveau) : réponse → auteur du sujet prévenu ; question privée, relance
   privée, nouvelle réussite et diagnostic → message dans le fil du membre pour la frangine ;
   correspondance et publication d'une réussite → membre prévenu.
6. **Découverte de soi** : `etat` technique (3 = supprimée) distinct de `etat_fiche` (suivi,
   droit Activation seulement : changer cet état n'avait aucun effet dans le legacy) ; une fiche
   supprimée est reprise à blanc si le membre repart (la contrainte d'unicité est conservée) ;
   un gestionnaire ne crée pas de fiche (redirigé vers la liste).
7. **Questions 15 et 16** : réponses affichées « Plutôt meneur·se / suiveur·se » et « Entouré·e /
   seul·e » au lieu de Oui/Non (stockage 1/2 inchangé, sens donné par le nom de colonne).
8. **Réussites** : liste publique = publiées uniquement, y compris pour un gestionnaire (l'accueil
   ne doit jamais afficher un témoignage non validé) ; modification d'une fiche publiée par son
   auteur → relecture ; recherche sur le pseudonyme au lieu du nom (identité publique).
9. **Diagnostic** : réponses codées, libellés et restitution tenus par l'API (source unique) ;
   un nouveau diagnostic rouvre une fiche clôturée.

## Colonnes ajoutées

- `soungangai.diagnostic` (JSON : codes, profil, forces, attentions, étapes, réponses, résumé) et
  `soungangai.date_diagnostic` (DATETIME). Non alimentées par le legacy (mapping de reprise
  inchangé). **La base de dev doit être recréée** (reprise) pour que `/api/decouverte*` y fonctionne.

## Besoins sur des fichiers partagés

- Variable d'environnement **`LF_COOKIE_SECRET`** côté SvelteKit (production) pour signer le
  cookie du diagnostic ; sans elle, clé aléatoire par processus.
- Liens vers des pages d'autres domaines : `/gestion/membres/{id}`, `/gestion/messages?membre={id}`,
  `/espace/messages`, `/espace/profil`, `/business-plan`, `/accompagnement`, `/likelemba`, `/projets`,
  `/marches`, `/entreprises`, `/partenariats`, `/emplois`, `/conseil-financier`.
- `/connexion` et `/inscription` doivent respecter `?suite=/diagnostic/enregistrer` (lors du test
  de fumée, la connexion a redirigé vers `/espace` malgré `suite` : à vérifier par leur propriétaire).
