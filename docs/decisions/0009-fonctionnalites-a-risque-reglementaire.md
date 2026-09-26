# ADR-0009 — Fonctionnalités à risque réglementaire : conservées, encadrées, désactivables

- **Statut** : Accepté — 2026-09-22 (à revoir avec un juriste avant la mise en production)
- **Source** : [../analyse-marche-concurrence.md](../analyse-marche-concurrence.md) §1.5, §3.6

## Contexte

L'étude de marché signale trois zones de risque :

1. **Épargne solidaire (placements rémunérés entre membres) et carte de pointage** : peuvent
   relever de la collecte d'épargne / des services de paiement réglementés (COBAC).
2. **Appels de fonds en crédit ou actionnariat** : le financement participatif en prêt ou en
   capital exige un agrément (COSUMAF).
3. **Fiches « maladie → produit + posologie »** : allégations thérapeutiques interdites par la
   politique Forever Living Products, et risque sanitaire.

Le porteur demande de ne perdre aucune fonctionnalité ; l'étude recommande d'en retirer certaines.

## Décision

**Tout est conservé et fonctionnel**, mais :

- chaque module concerné peut être **désactivé depuis la gestion** (interrupteurs dans
  `parametre` : `module_epargne_actif`, `module_sante_actif`) sans perte de données ;
- des **avertissements** sont affichés là où c'est nécessaire :
  - épargne / carte de pointage : « La Frangine ne détient pas vos fonds… » + rappel « nous ne vous
    demanderons jamais votre code PIN » ;
  - appels de fonds : rappel que les promesses sont des engagements entre membres, sans
    garantie de La Frangine ;
  - fiches bien-être : « Informations fournies à titre indicatif, elles ne remplacent pas l'avis
    d'un professionnel de santé. » ; le mot « posologie » devient « conseil d'utilisation ».
- La décision de désactiver un module reste **celle du porteur de projet**, après avis juridique.

## Conséquences

- Deux colonnes booléennes ajoutées à `parametre`.
- La recette vérifie aussi que le module désactivé disparaît de la navigation et renvoie une
  page explicative (pas une erreur).
