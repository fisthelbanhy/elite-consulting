# Module « Financer & épargner » — partie fonds (section 4 legacy)

Appels de fonds (financement participatif + suivi des apports), Likelemba (tontines), épargne
solidaire (dons / placements, carte de pointage) et page pilier `/financer`.

Legacy : `choix4.php`, `incl-choix4A.php`, `incl-appelfond.php`, `incl-apportfond.php`,
`incl-paportfond.php` (code mort = spécification du suivi des apports), `incl-choix4B.php`,
`incl-likelemba.php`, `incl-membrelikelemba.php`, `incl-payelikelemba.php`, `incl-choix4C1.php`,
`incl-choix4C2.php`, `incl-fondsoutien.php`, `incl-pointcaisse.php`, `incl-enregpaye.php` (types 5, 7, 8).
Inventaire : `02-…` §3 (S4-0 à S4-C4), §4, §5, checklist F-S4-01 à F-S4-67 et F-PAY.
Arbitrages : ADR-0004, ADR-0006, ADR-0007 (S4a à S4d), ADR-0009.

## Fichiers

| Couche | Fichiers |
|---|---|
| API | `api/src/routes/{projets,likelemba,epargne}.ts` |
| Schémas | Zod, dans chaque routeur |
| Service | `api/src/services/fonds.ts` : agrégats des appels de fonds, versements, interrupteur du module d'épargne, `Traitement` des paiements types 5, 7 et 8 (déclarés à l'import par les 3 routeurs) |
| Modèle | `api/src/schema/fonds.ts` : **colonne ajoutée** `cotisation_likelemba.paiement_id` (FK `paiement.id`, nullable) |
| Tests | `api/tests/{projets,likelemba,epargne}.test.ts` (23 tests) |
| Pages | `/financer` · `/projets`, `/projets/nouveau`, `/projets/[id]`, `/projets/[id]/modifier`, `/projets/apports`, `/projets/apports/[id]` · `/likelemba`, `/likelemba/nouveau`, `/likelemba/[id]`, `/likelemba/[id]/modifier`, `/likelemba/[id]/adherer`, `/likelemba/[id]/cotiser`, `/likelemba/[id]/adhesions/[adhesion]` · `/epargne`, `/epargne/dons-placements`, `/epargne/dons-placements/nouveau`, `/epargne/dons-placements/[id]`, `/epargne/carte-pointage`, `/epargne/carte-pointage/nouvelle` |
| Composants | `lib/components/projets/*` (CarteProjet, ChiffresProjet, FormulaireProjet, FormulaireApport, ListeApports, GestionApport, EvaluationProjet, AvertissementProjets), `lib/components/likelemba/*` (CarteGroupe, CommentCaMarche, FormulaireGroupe, FormulaireAdhesion, ListeAdherents, Calendrier, TableauCotisations), `lib/components/epargne/*` (OngletsEpargne, AvertissementEpargne, ModuleDesactive, FormulaireFond, TableauPointages) |
| Serveur | `lib/server/projets.ts` (`enregistrerProjet` + PDF/photo), `lib/server/likelemba.ts` (`lireGroupe`, `lireAdhesion`), `lib/server/epargne.ts` (`statutEpargne`, `exigerEpargne`) |
| Types | `lib/types/{projets,likelemba,epargne}.ts` |

## Endpoints (`/api`)

### Appels de fonds — `projets.ts`

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /projets?q=&secteur_id=&devis_min=&besoin_min=&realisation_min=&miens=&etat=` | public (auteur : aussi les siens ; gestionnaire : tout) | Liste paginée ; `nom_promoteur` seulement pour l'auteur et les gestionnaires |
| `GET /projets/compteurs` | public | Projets publiés, besoin total, promis, collecté |
| `GET /projets/mes-entreprises` | connecté | Entreprises du membre (choix facultatif) |
| `GET /projets/{id}` | public (visibilité standard) | Fiche ; +1 visite pour un tiers ; promoteur et liste des apports (avec créancier) pour le porteur et les gestionnaires ; `mes_apports` pour le lecteur |
| `POST /projets`, `PUT /projets/{id}` | connecté / auteur ou gestionnaire habilité | Création (réf. `ALF…`, publiée, promis = collecté = 0) / modification |
| `POST /projets/{id}/evaluation` | gestionnaire | Observation + appréciation 0–10 (visibles de tous) |
| `POST /projets/{id}/presentation`, `/photo` | auteur ou gestionnaire habilité | PDF de présentation, photo |
| `POST /projets/{id}/etat`, `DELETE /projets/{id}` | droit Activation / auteur ou habilité | Modération, suppression logique |
| `POST /projets/{id}/apports` | connecté, non porteur, projet publié | Promesse d'apport (réf. `ATF…`, état 1), comptée immédiatement dans « promis », porteur prévenu |
| `GET /projets/{id}/apports` | porteur, gestionnaire | Apports du projet |
| `GET /projets/apports?appel_fond_id=&membre_id=&etat=&q=` | connecté | « Mes apports » ; gestionnaire : tous. Totaux promis / versé |
| `GET /projets/apports/{id}` | créancier, porteur, gestionnaire | Fiche : versements, reste, en attente de caisse |
| `POST /projets/apports/{id}/valider` | droit Activation | 1 → 2 (accusé, sans double comptage) |
| `POST /projets/apports/{id}/annuler` | droit Activation | → 3 ; retire du « promis » la seule part non versée |
| `POST /projets/apports/{id}/versements` | droit Activation | Versement reçu (≤ reste, date non future, anti-doublon), créancier prévenu |

### Likelemba — `likelemba.ts`

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /likelemba?montant_min=&montant_max=&q=&miens=&etat=` | public | Groupes publiés (une seule borne suffit), tri par date de début ; `nombre_adherents`, `mon_adhesion_id` |
| `GET /likelemba/compteurs` | public | Groupes publiés, adhérents actifs |
| `GET /likelemba/membres?q=` | gestionnaire ou responsable d'un groupe | Membres à choisir (responsable, inscription) |
| `GET /likelemba/mes-adhesions` | connecté | Adhésions du membre |
| `GET /likelemba/{id}` | public (visibilité standard, colonne `responsable_id`) | Fiche : adhérents (ordre, code, date, état), calendrier, cagnotte ; historique des cotisations pour adhérents, responsable, gestionnaires |
| `POST /likelemba` | droit Activation | Création (code `LKB…` par `nouvelle_reference`), responsable prévenu |
| `PUT /likelemba/{id}` | responsable ou gestionnaire habilité | Responsable, montant, périodicité, date, observation |
| `POST /likelemba/{id}/etat`, `DELETE /likelemba/{id}` | droit Activation / responsable ou habilité | |
| `POST /likelemba/{id}/adhesions` | connecté (soi-même) ; responsable ou gestionnaire habilité (un autre membre) | Code `{n}{code}`, caution + 3 témoins, anti-doublon groupe + membre, état 2 |
| `GET /likelemba/adhesions/{id}` | adhérent, responsable, gestionnaire | Fiche + paiements antérieurs + total |
| `PUT /likelemba/adhesions/{id}` | adhérent (caution/témoins), responsable ou habilité (+ date d'entrée) | |
| `POST /likelemba/adhesions/{id}/etat` | droit Activation | « Attente » ↔ active, retrait |
| `POST /likelemba/cotisations/{id}/valider` | responsable ou gestionnaire habilité | Génère le reçu manquant ou tronqué (legacy) et marque la cotisation validée |

### Épargne solidaire — `epargne.ts` (toutes les routes sauf `/statut` : 403 si le module est désactivé)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `GET /epargne/statut` | public | Module actif ?, message, don minimum, placement minimum, durées |
| `GET /epargne/fonds?du=&type_fond=&montant_min=&confirme=&q=&membre_id=` | connecté | Gestionnaire : tout ; membre : fiches créées, ou dont il est rapporteur ou souscripteur |
| `POST /epargne/fonds` | connecté (= rapporteur) | Don / placement (réf. `FDS…`), souscripteur = soi, un membre (pseudonyme / identifiant / téléphone) ou un nom libre ; message + e-mail au souscripteur |
| `GET /epargne/fonds/{id}` | auteur, rapporteur, souscripteur, gestionnaire | Fiche + état du dernier paiement type 7 |
| `PUT /epargne/fonds/{id}`, `POST /epargne/fonds/{id}/etat` | droit Activation | Motivation / montant (figé une fois payé) / durée ; état |
| `GET /epargne/pointages?du=&au=&operateur_id=&membre_id=&type_operation=&montant_min=&montant_max=&type_caisse=` | connecté | Gestionnaire : tout ; agent : ses saisies + sa carte ; membre : sa carte. Totaux, rentabilité (3 %), encaisse |
| `GET /epargne/pointages/titulaires?q=`, `GET …/titulaires/{id}` | agent (`point_caisse_actif`) ou gestionnaire | Membres pointables ; solde, dernière opération, photo, PIN attribué ? |
| `POST /epargne/pointages` | agent ou gestionnaire | Versement / retrait (voir règles) |

### Paiements (service `fonds.ts`, page générique `/paiement/{type}?objet=`)

| Type | Objet | Montant | Qui paie | Enregistrement | Confirmation caisse | Rejet caisse |
|---|---|---|---|---|---|---|
| 5 Likelemba | adhésion | cotisation du groupe | adhérent, responsable, gestionnaire | `CotisationLikelemba` état 1, reçu `{code}P{n}`, caissier = payeur, `paiement_id` | cotisation → 2 | cotisation → 3 (reçu consommé, exclu des totaux) |
| 7 Fond de soutien | fiche | montant de la fiche | auteur, rapporteur, souscripteur, gestionnaire | mode + `confirme = Oui` (legacy) | — | mode 0, `confirme = Non` |
| 8 Apport de fonds | engagement | libre ≤ reste − déclarations en attente | créancier seulement | rien (en attente) | `VersementCollecte` + recalcul des totaux | rien |

## Règles appliquées (correspondance checklist)

- **F-S4-05/06/07/08/10** : filtres secteur, devis, besoin, réalisation, texte (OR parenthésé) ;
  visibilité « public = publiés, auteur = les siens, gestionnaire = tout » ; carte avec devis,
  apport, besoin, réalisation, promis, collecté et jauge ; promoteur/état pour auteur et
  gestionnaire. La fiche est publique (SEO) mais sans coordonnées ; soutenir exige un compte.
- **F-S4-09** : « Suppression » = `PanneauModeration` avec confirmation.
- **F-S4-11 à F-S4-16** : toutes les règles bloquantes et cumulées (le téléphone n'efface plus
  les autres erreurs), messages legacy (orthographe corrigée), nom unique insensible à la casse,
  ville obligatoire, entreprise facultative parmi celles du membre, e-mail/adresse dans les bons
  champs, PDF + photo.
- **F-S4-17/18/19/20** : bloc promoteur privé ; promis / collecté / reste à collecter ;
  appréciation /10 et observations saisies par un gestionnaire, visibles de tous (« Avis de la
  frangine ») ; visites comptées pour les tiers.
- **F-S4-21 à F-S4-26** (ADR-0007 S4a, ADR-0004) : type obligatoire, montant > 0 et ≤ besoin,
  échéance 0–12 mois, anti-doublon projet + membre + jour + montant, pas d'apport sur son propre
  projet ; « promis » et « collecté » **recalculés** depuis les engagements
  (`services/fonds.recalculer_appel`) ; annulation tardive : seule la part non versée est
  retirée ; versements saisis par la frangine ou déclarés par le créancier (type 8) ; un premier
  versement valide la promesse.
- **F-S4-27 à F-S4-44** : création réservée aux gestionnaires habilités ; unicité arbitrée (voir
  écarts) ; adhésion de soi-même ou par le responsable / la frangine ; code `{n}{code}` ; date
  d'entrée correctement stockée ; caution et 3 témoins ; « Attente » ; cotisation rattachée à
  l'adhésion choisie, montant imposé ; reçus uniques `{code}P{n}` (colonne de 30 caractères) ;
  historique du membre et du groupe avec total ; « Valider » (ex-« Activation ? ») pour les
  reçus manquants ou tronqués.
- **F-S4-45 à F-S4-55** (ADR-0007 S4c) : liste, filtres (aussi pour le gestionnaire), don
  ≥ 100 FCFA, placement ≥ `parametre.montant_minimum_placement` (enfin contrôlé), durée 12–120
  mois, anti-doublon jour + motivation + montant, réf. `FDS…`, e-mail « Souscription
  placement / don » enfin envoyé, paiement fonctionnel, montant jamais écrasé.
- **F-S4-56 à F-S4-67** (ADR-0004, ADR-0007 S4d) : portée par rôle ; filtre dates (jour max
  inclus) ; colonnes et pieds (total, rentabilité 3 %, encaisse) ; PIN **du titulaire** vérifié
  (hash Argon2) ; anti-doublon « Ce pointage est déjà enregistré. » ; retrait refusé si
  `montant ≥ 97 % du solde lu en base` avec le message legacy exact ; référence `PCS…` générée
  après validation ; soldes titulaire et opérateur (effet miroir) ; `type_caisse` 1 / 2 ; tous les
  droits vérifiés côté API.
- **F-S4-01/02/04** : onglets et compteurs ; épargne réservée aux connectés (message sur
  `/epargne`) ; boutons « Nouveau » selon le rôle. **F-S4-03** (colonne « Les publicités ») :
  non porté ici (module Publicités d'un autre domaine).
- **ADR-0009** : `AvertissementProjets` (engagements entre membres, sans garantie) et
  `AvertissementEpargne` (« La Frangine ne détient pas vos fonds », « ne communiquez jamais votre
  PIN ») ; module d'épargne désactivable : API 403 + page explicative `/epargne`, sous-pages
  redirigées.

## Écarts et décisions (à reporter dans un ADR)

1. **Promesse d'apport** : état 1 à la création et comptée immédiatement (comportement réel) ;
   « Valider » = simple accusé (1 → 2) ; le premier versement vaut validation.
2. **Paiement type 8** : effet à la **confirmation** de la caisse (le versement n'est compté qu'une
   fois l'argent vérifié), contrairement aux autres types (effet à l'enregistrement). Le montant
   déclarable est plafonné au reste dû moins les déclarations en attente.
3. **Cotisation Likelemba** : créée à l'enregistrement du paiement (état 1), validée à la
   confirmation (2), annulée au rejet (3, reçu consommé). Nouvelle colonne
   `cotisation_likelemba.paiement_id`.
4. **Unicité d'un groupe Likelemba** : responsable + montant + périodicité + date de début
   (le legacy testait l'observation, ce qui interdisait deux groupes sans observation).
5. **Adhésion** : le responsable du groupe peut aussi inscrire un membre et valider les reçus ;
   il voit cautions, témoins et historique (il porte le risque du cercle). Les remarques de
   paiement ne sont visibles que de l'adhérent concerné, du responsable et des gestionnaires.
6. **Codes « Membre Frangine ? »** : les données legacy codent la case cochée = 2 ; ce codage est
   conservé en base (commentaire `OuiNon` du modèle trompeur) et l'API expose un booléen.
7. **Calendrier des tours** : ajout (indicatif) — un bénéficiaire par tour dans l'ordre d'entrée,
   cagnotte = cotisation × adhérents actifs.
8. **Don / placement** : le rapporteur est le membre connecté (le legacy proposait une liste) ;
   le souscripteur est désigné par pseudonyme, identifiant ou téléphone, ou par un nom libre ;
   la fiche est visible et payable par le souscripteur (il reçoit l'invitation à payer) ; l'e-mail
   est envoyé pour un don comme pour un placement ; anti-doublon limité au même auteur (legacy :
   tous membres confondus).
9. **Carte de pointage** : « agent » = membre avec `point_caisse_actif` (sans exiger une personne
   morale) ; l'agent voit aussi les opérations de sa propre carte ; **5 PIN erronés en 15 minutes
   bloquent la carte** (journal `tentative_connexion`, clé `pin:<id>`) et le titulaire est
   prévenu ; chaque opération envoie un message au titulaire ; un gestionnaire sans filtre voit
   l'« encaisse totale des agents » (legacy : premier agent trouvé) ; solde négatif de l'opérateur
   toujours possible (legacy).
10. **Module d'épargne désactivé** : API 403 avec message explicatif (`/epargne/statut` reste
    public) ; le paiement type 7 est aussi refusé.
11. **F-S4-03** (publicités en colonne) non porté par ce module.

## Besoins sur des fichiers partagés

- Base de dev : ajouter la colonne `cotisation_likelemba.paiement_id` (relancer la reprise ou
  migration Alembic) — sans elle, les lectures de cotisations échouent sur la base partagée.
- `lib/navigation.ts` : rien à changer (liens du pilier déjà présents).
- Espace membre (autre domaine) : peut exploiter `GET /likelemba/mes-adhesions`,
  `GET /projets/apports` et `GET /epargne/pointages` pour un tableau de bord.
- Gestion des paiements (autre domaine) : les libellés des types 5, 7 et 8 viennent de
  `services/fonds.ts` ; le rejet d'un type 5 annule la cotisation correspondante.
