# Module « Bien-être » + Business plan + Partenariat & troc

Boutique Forever Living Products (catalogue, panier produits, paiement), fiches bien-être (legacy
« Santé »), parcours « Devenir distributeur » (présentation + assistant d'adhésion + suivi
gestionnaire), business plan « auto-diagnostic » et partenariat & troc.

Legacy : `choix5.php`, `incl-presentation.php`, `incl-venteproduit.php`, `incl-adhesion.php`,
`incl-choix5B.php`, `incl-businessplan.php`, `incl-choix5C.php`, `incl-partenariat.php`,
`incl-choix1C.php` (santé), `incl-enregpaye.php` (effets types 1 et 6).
Inventaire : `03-…` §2 (S5-0 à S5-5, F-S5-01 à F-S5-53) ; `01-…` E-S1-05 (F-S1-27 à F-S1-40) ;
`02-…` §4.3-4.4. Arbitrages : ADR-0004, ADR-0006, ADR-0007 (S1b, S3b, S5a à S5d), ADR-0009.

## Fichiers

| Couche | Fichiers |
|---|---|
| API | `api/src/routes/{boutique,distributeur,business-plan,partenariats}.ts` (`boutique.ts` expose 3 routeurs : `/boutique`, `/panier`, `/bien-etre`) |
| Schémas | Zod, dans chaque routeur (aucun de ces modules n'a assez de schémas pour justifier un fichier à part) |
| Services | `api/src/services/boutique.ts` (prix selon le statut, panier, `Traitement` type 1), `api/src/services/distributeur.ts` (assistant, `est_distributeur`, `Traitement` type 6) |
| Tests | `api/tests/{boutique,distributeur,business-plan,partenariats}.test.ts` (21 tests) |
| Pages | `/boutique`, `/boutique/[id]`, `/panier`, `/panier/suivi` (gestionnaires), `/bien-etre`, `/bien-etre/[id]`, `/devenir-distributeur`, `/devenir-distributeur/adhesion`, `/devenir-distributeur/suivi`, `/devenir-distributeur/suivi/[id]`, `/business-plan`, `/business-plan/fiches`, `/business-plan/fiches/[id]`, `/partenariats`, `/partenariats/nouveau`, `/partenariats/[id]`, `/partenariats/[id]/modifier` |
| Composants | `lib/components/boutique/*` (CarteProduit, GrilleProduits, Prix, SelecteurQuantite, EtatStock, Rayons, TableauPanier, SectionArticles, BandeauDistributeur, AvertissementBienEtre, ModuleIndisponible), `lib/components/distributeur/*` (contenus.ts = textes legacy, Chapitres, AppelAdhesion, Progression, Etape*, StatutSouscription, TexteBloc), `lib/components/business-plan/*` (questions.ts, FormulaireBusinessPlan), `lib/components/partenariats/*` |
| Serveur | `lib/server/boutique.ts` (`ajouterAuPanier`), `distributeur.ts` (`corpsEtape`), `business-plan.ts`, `partenariats.ts` |
| Types | `lib/types/{boutique,distributeur,business-plan,partenariats}.ts` |

## Endpoints (`/api`)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /boutique/groupes` | public | 20 groupes FLP + nombre de produits actifs ; `groupe = 0` « Autres produits » (données legacy hors nomenclature, groupe 100) |
| `GET /boutique/produits?q=&groupe=&tri=&page=&taille=` | public | Catalogue des produits actifs ; `prix` = prix du lecteur ; `distributeur` = statut du lecteur. Tri par défaut : vendables d'abord |
| `GET /boutique/produits/populaires?limite=` | public | « Les plus demandés » (tri par consultations) |
| `GET /boutique/produits/{id}` | public (gestionnaire : aussi inactifs) | Fiche : 3 prix, stock ; +1 consultation (sauf gestionnaire) |
| `GET /panier` | connecté | Lignes produits non payées, total, `payable`, `message` (blocage stock) |
| `POST /panier` | connecté | Ajout multiple `{lignes: [{produit_id, quantite}]}`, prix figé ; ligne existante même produit + même prix complétée |
| `PUT /panier/{id}`, `DELETE /panier/{id}` | propriétaire | Quantité (prix figé conservé) ; retrait (suppression physique), lignes non payées seulement |
| `GET /panier/suivi?etat_paiement=&membre_id=&q=` | gestionnaire | Lignes de tous les membres + état N.P./P.N.C./P.C. + somme |
| `GET /bien-etre`, `GET /bien-etre/{id}` | public si `parametre.module_sante_actif` (sinon 404) | Fiches actives ; produits conseillés actifs + `conseil_utilisation` |
| `GET /distributeur/statut` | public | Connecté ? gestionnaire ? distributeur ? souscription en cours |
| `GET /distributeur/kit` | connecté | Tous les produits actifs ayant un prix distributeur, triés par nom |
| `GET /distributeur/souscription` | connecté | Sa souscription (ou `null`) |
| `PUT /distributeur/souscription` | membre (pas gestionnaire) | Sauvegarde d'une étape `{etape: 1..9, avancer, …champs, envoyer}` → `EtapeOk` (`etape_courante`, `a_payer`, `montant`) |
| `GET /distributeur/souscriptions?q=&etat=&mode=&envoyees=` | gestionnaire | Suivi |
| `GET /distributeur/souscriptions/{id}` | gestionnaire ou souscripteur | Détail complet |
| `POST /distributeur/souscriptions/{id}/etat` | droit Activation | Valider (2) un crédit ⇒ distributeur + message au membre |
| `GET /business-plan?q=&etat=` | connecté | Gestionnaire : tous ; membre : le sien |
| `GET /business-plan/mien`, `GET /business-plan/{id}` | porteur ou gestionnaire | Détail (`peut_modifier`, `peut_moderer`) |
| `POST /business-plan`, `PUT /business-plan/{id}` | membre ; porteur ou gestionnaire habilité | `envoyer: false` = brouillon, `true` = soumis |
| `POST /business-plan/{id}/etat` | droit Activation | État |
| `GET /partenariats?q=&etat=&miennes=`, `GET /partenariats/compteur` | public | Liste (visibilité standard), nombre publié |
| `GET /partenariats/{id}` | public si publiée | Détail ; intéressements (coordonnées) pour l'auteur et les gestionnaires |
| `POST /partenariats`, `PUT /partenariats/{id}` | membre ; auteur ou gestionnaire habilité | Actif ≥ 5, anti-doublon, `PTR…`, publication immédiate |
| `POST /partenariats/{id}/etat`, `DELETE /partenariats/{id}` | droit Activation ; auteur ou habilité | Modération, suppression logique |
| `POST /partenariats/{id}/interet` | membre non auteur | Intéressement ≥ 5 caractères, un par membre, auteur notifié |

Paiements (page générique `/paiement/{type}`) : **type 1** montant = total du panier produits,
`enregistrer` décrémente les stocks et marque les lignes payées, `rejeter` restitue ; retour
`/panier?paye=1`. **Type 6** (`/paiement/6?objet={souscription}`) : montant = kit, uniquement
après « Envoyer » en fonds propres ; `enregistrer` passe la souscription à l'état 2 (distributeur)
et envoie un message de bienvenue, `rejeter` la remet à 1 ; retour `/devenir-distributeur/adhesion?paye=1`.

## Règles clés

- **Prix unique (ADR-0007 S5a)** : distributeur = souscription à l'état 2 (ou 4) → prix
  distributeur (à défaut, prix public) ; sinon prix public. Le prix non distributeur n'est
  qu'affiché (fiche produit). Un produit dont le prix applicable est nul n'est pas vendable en
  ligne (« Prix sur demande », lien WhatsApp).
- **Stock** : pas de contrôle à l'ajout (legacy) ; paiement bloqué si la quantité **cumulée** d'un
  produit dépasse le stock (message legacy exact) ou si un produit a été retiré. L'interface limite
  le sélecteur au stock et n'affiche pas d'ajout pour un produit en rupture.
- **Adhésion** : 10 étapes = 10 blocs de `$arrayetapeadhesion` (1 objectifs, 2 histoire,
  3 disponibilité, 4 liste de 25 noms, 5 formations, 6 contacts, 7 rendez-vous, 8 intéressés,
  9 commande, 10 paiement). `etape_courante` = étape la plus avancée (10 = envoyée) ; reprise
  automatique ; on ne saute pas d'étape. Étape 9 : « Sauvegarder » sans contrôle (la souscription
  redevient brouillon), « Envoyer » avec les 3 contrôles cumulés (messages legacy). Kit verrouillé
  une fois la souscription validée.
- **Crédit (S5c)** : souscription « Non traitée », étape 10, message automatique dans la
  messagerie de la frangine, visible dans `/devenir-distributeur/suivi` ; un gestionnaire avec le
  droit Activation la valide.
- **Business plan (S5d)** : 1 par membre (fiche supprimée réutilisée), type ≥ 5 et description
  ≥ 10 (messages legacy), « Envoyer » ⇒ état 2 + message à la frangine ; « Sauvegarder » ne retire
  pas une fiche déjà envoyée.

## Correspondance checklist

| Points | Couverture |
|---|---|
| F-S5-01, 02 | Nouvelle navigation (ADR-0008) : onglets Présentation / Produits / Adhésion sur `/devenir-distributeur` ; business plan (pilier « Se lancer ») et partenariats (« Opportunités ») séparés ; compteur des partenariats publiés sur l'onglet de `/partenariats` |
| F-S5-03, 04, 06 | Présentation texte ; vidéo HTML5 prête (`VIDEO_PRESENTATION`) mais **fichier à fournir** (le `.WMV` legacy n'est pas converti) ; catalogue PDF non repris (remplacé par la boutique en ligne) |
| F-S5-05 | 5 chapitres, textes legacy (orthographe corrigée) + lexique POA/PC et mention « aucun gain garanti » |
| F-S5-07, 08 | **Écart** : catalogue public, sans adhésion (conversion, SEO) ; connexion demandée à l'ajout au panier |
| F-S5-09 à 19 | Couverts (plus demandés triés par consultations ; fiche produit accessible depuis chaque carte) |
| F-S5-20 à 39 | Couverts (10 étapes ; écran de suivi gestionnaire ; messages exacts ; kit = tous les produits actifs ; prospects mis à jour ; référence `SOA…`) |
| F-S5-40 à 45 | Couverts ; lien vers `/gestion/membres/{id}` (page du module Gestion) |
| F-S5-46 à 53 | Couverts (voir écarts) |
| F-S1-27 à 40 | Couverts ; F-S1-38 : décrément à la déclaration + restitution au rejet (S3b) ; F-S1-39 : `/panier?paye=1` affiche le succès, plus de formulaire ré-affiché |

## Écarts et décisions (à reporter dans un ADR)

1. Catalogue public (F-S5-07/08) ; fiches bien-être `noindex` (risque réglementaire).
2. Panier : lignes regroupées (même produit + même prix) ; quantité modifiable ; blocage calculé
   sur la quantité cumulée par produit ; ligne d'un produit retiré bloquante.
3. Gestionnaire : consultation seule des paniers (`/panier/suivi`), plus de suppression des
   lignes d'autrui.
4. Adhésion : sauvegarde à chaque étape (le legacy n'enregistrait qu'à l'étape 7) ; étapes
   renumérotées sur les 10 blocs `$arrayetapeadhesion` ; « Précédent » à l'étape Commande ne
   réenregistre pas le kit ; limites de saisie élargies (nom 60, téléphone 20, e-mail 120 ;
   heure 30 ; montant filleul sans plafond) ; seuls les produits actifs **ayant un prix
   distributeur** sont proposés dans le kit ; texte d'introduction ajouté pour l'étape 8.
5. Distributeur = souscription validée (état 2 ou 4) : payée (fonds propres) ou validée par un
   gestionnaire (crédit).
6. Business plan et partenariat : création réservée aux membres (pas aux gestionnaires) comme le
   legacy ; modification par l'auteur ou un gestionnaire **avec droit Activation** (le legacy :
   tout gestionnaire) ; liste des business plans invisible des visiteurs.
7. Partenariat : anti-doublon de l'actif **par auteur** (legacy : global) ; recherche aussi dans
   l'actif et la référence ; intéressements visibles de l'auteur et des gestionnaires seulement
   (ADR-0007 S2d, alors que F-S5-52 les montrait aux autres membres) ; un gestionnaire ne peut pas
   se manifester ; les connectés ne voient plus les fiches non publiées des autres.
8. `/panier` affiche aussi, en lecture/retrait, les articles de petites annonces (API
   `/annonces/panier`, paiement type 2 du module Annonces) pour que le badge et le contenu
   concordent.

Aucune colonne ajoutée : l'état « envoyée » d'une souscription est `etape_courante = 10`.
