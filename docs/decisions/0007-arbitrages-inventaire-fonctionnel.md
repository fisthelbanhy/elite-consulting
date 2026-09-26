# ADR-0007 — Arbitrages issus de l'inventaire fonctionnel

- **Statut** : Accepté — 2026-09-22
- **Sources** : `docs/inventaire/01-*.md`, `02-*.md`, `03-*.md` (483 points de recette `F-…`).
- **Complète** : ADR-0004 (règles conservées / bugs corrigés).

L'inventaire, fait en lisant tout le code actif, a révélé que plusieurs comportements décrits
dans les anciens dictionnaires n'existaient qu'en code mort, et que le legacy **ne vérifiait
aucun droit côté serveur**. Les arbitrages ci-dessous tranchent chaque cas « à arbitrer ».

## 1. Transverse

| # | Sujet | Legacy constaté | Décision |
|---|---|---|---|
| T1 | Contrôle d'accès | Aucun côté serveur (droits = liens masqués ; élévation de privilège possible via champ caché) | Chaque endpoint vérifie rôle et droit ; l'auteur ne modifie que ses fiches ; `type_compte` jamais modifiable par le membre |
| T2 | Pagination | Changement de page cassé (toujours page 1) | Pagination réelle ; 20 éléments par page côté public, 50 en gestion ; filtres conservés dans l'URL |
| T3 | Présence en ligne | `connexmsgpmt`/`connexmsgmbr` = en ligne/hors ligne | `membre.derniere_activite` (mise à jour à chaque requête authentifiée) ; « en ligne » = actif < 5 min |
| T4 | Droits | `droitmbr` = 3 caractères (Droit, Caisse, Activation) ; « Point caisse » = `pointcaissembr` | 3 booléens + `point_caisse_actif` ; un gestionnaire sans droit « attribution » ne peut pas modifier les droits |
| T5 | Forme juridique d'une personne morale | Rangée dans `situatmatrimmbr` | Colonne dédiée `membre.forme_juridique` (reprise corrige) |
| T6 | Unicité à l'inscription | Nom OU identifiant OU pseudo | Identifiant, pseudonyme, téléphone et e-mail uniques. Le nom seul n'est plus bloquant (homonymes réels au Congo) |
| T7 | Contact | Master voit et répond à tous les messages ; réponse perdue (colonne absente) mais e-mail envoyé | Seuls les gestionnaires voient tout et répondent ; la réponse est enregistrée **puis** envoyée ; un membre voit ses messages sans pouvoir les modifier |
| T8 | Suggestions | Module « Accueil » refusé, anti-doublon cassé | Réservées aux connectés, anonymes en base, module 0 autorisé, doublon (module + texte) refusé ; gestion par les gestionnaires |
| T9 | Dialogue contextuel | Réponse envoyée au membre n° 1 ; écriture possible depuis Placement seulement | Fil par rubrique (accueil + 4 sous-onglets de trésorerie) ; la réponse part au bon membre ; les visiteurs ne voient rien |
| T10 | Messagerie privée | OK (sens des colonnes corrigé à la reprise) | Fil par membre, compteur de non-lus, marquage lu à l'ouverture, réponses de tous les gestionnaires visibles |
| T11 | Téléversement | Contrôles seulement au-delà de 250 Ko ; redimensionnement déformant 300×250 | Contrôle systématique (ADR-0005), redimensionnement proportionnel |

## 2. Sections

| # | Sujet | Legacy constaté | Décision |
|---|---|---|---|
| S1a | Sujet privé du forum | Texte visible de tous | Visible seulement de l'auteur et des gestionnaires |
| S1b | Santé : produits conseillés | Deux listes divergentes (admin écrit `maladie.index*pdt`, page publique lit `produit.index*mld`) | Une seule liste `maladie_produit` = union des deux à la reprise ; l'écran d'administration édite exactement ce que voit le public |
| S1c | Découverte de soi clôturée | Impossible d'en créer une autre | Le membre peut rouvrir sa fiche (une seule fiche par membre, conservée) |
| S2a | Auteur d'une fiche RH | Écrasé par le type de fiche | Auteur réel enregistré (les 4 fiches reprises sont sans auteur, gérées par la frangine) |
| S2b | Sexe pour une offre d'emploi | Exigé | Exigé seulement pour une demande (un recruteur n'a pas de sexe à déclarer) |
| S2c | Coordonnées du candidat | Visibles de tous les connectés | Visibles de l'auteur et des gestionnaires ; les recruteurs passent par « Intéressement » (message transmis) ; CV téléchargeable par les connectés |
| S2d | Contribution (besoin / intéressement) | 1 par membre et par fiche ; visible de personne | 1 par membre et par fiche ; visible de l'auteur de la fiche et des gestionnaires ; l'auteur est notifié par la messagerie |
| S2e | Consultation d'une fiche emploi par un visiteur | Impossible (référence non cliquable) | Fiche consultable publiquement **sans identité ni coordonnées** (référencement Google Jobs, JSON-LD `JobPosting`) ; postuler / se manifester et télécharger le CV exigent un compte (levier d'inscription) |
| S3a | Stock des articles | Non contrôlé au paiement | Contrôlé comme pour les produits |
| S3b | Moment du décrément de stock | À la **déclaration** du paiement | Conservé (réservation) ; si un gestionnaire **rejette** le paiement, le stock est restitué et les lignes redeviennent impayées (nouvel état « rejeté » = retour à « Non payé ») |
| S3c | Courses | Deux variantes ; la variante **texte libre** est active | Texte libre (actif) + choix optionnel dans le catalogue d'une boutique partenaire (`particlecourse`) |
| S4a | Promesses d'apport | En production : la promesse augmente immédiatement le « promis » ; validation/versements = code mort | La promesse compte immédiatement (comportement réel) ; les totaux sont **recalculés** depuis les engagements (jamais incrémentés à la main). Le gestionnaire (droit activation) peut annuler une promesse (retrait de la part non versée, cf. ADR-0004) et enregistrer des versements ; le créancier déclare un versement via le paiement (type 8), confirmé par la caisse |
| S4b | Likelemba : cotisation | Rattachée au premier groupe du payeur ; reçus tronqués identiques | Rattachée à l'adhésion choisie ; reçu unique `{code}P{n}` |
| S4c | Don / placement | Paiement impossible (lien cassé), minimum de placement non contrôlé, e-mail jamais envoyé | Paiement fonctionnel, minimum `parametre.montant_minimum_placement` contrôlé, e-mail au souscripteur envoyé |
| S4d | Carte de pointage | Règle des 97 % calculée sur un solde envoyé par le navigateur ; référence consommée même en cas d'échec | Solde lu en base ; référence générée après validation du PIN ; « rentabilité » = 3 % des versements affichée |
| S5a | Prix du panier produits | Prix distributeur dans le catalogue S5, prix public dans Santé S1 | **Un seul panier**. Un distributeur (souscription validée) paie le prix distributeur ; les autres le prix public. Le catalogue affiche les deux (levier de conversion vers l'adhésion) |
| S5b | Kit d'adhésion | Seuls les produits d'id 1 à 25 sont enregistrés | Tous les produits |
| S5c | Mode de souscription « Crédit » | Aucune suite | La souscription est créée « Non traitée » et apparaît dans un écran de suivi gestionnaire (absent du legacy) |
| S5d | Business plan Sauvegarder / Envoyer | Même effet | Brouillon (1) / soumis (2) — voir ADR-0004 |
| S6a | Comparateur de prix | Fiche rattachée à l'id du membre au lieu de l'entreprise ; tout membre moral peut supprimer les lignes des autres | Fiche rattachée à l'entreprise du membre ; seul le propriétaire modifie ses lignes ; consultation réservée aux comptes entreprise (règle legacy « Il faut avoir un compte entreprise ») |
| S6b | Réussites entrepreneuriales | Module mort en production (retiré du menu) | **Conservé** et mis en avant : les témoignages validés sont la meilleure preuve sociale pour la conversion |
| S7a | Dossiers d'accompagnement | Réponses non rechargées, modification sans effet ; question 48 (restructuration) jamais enregistrée | Chargement et modification fonctionnels ; toutes les questions enregistrées |
| S7b | Bench marking | Écran membre inutilisable (colonnes inexistantes) ; écran admin accessible par URL seulement | Référentiel à 3 niveaux géré par les gestionnaires, consultable par les membres connectés sous forme de tableau comparatif par banque |
| S7c | Préfixes de référence accompagnement | Doc : BSP/PJT | Réels : ABP, APA, ARC, ACI (conservés) |

## Conséquences

- Les points « (correctif) » et « (à arbitrer) » des checklists sont réputés tranchés par ce
  document ; la recette vérifie le comportement décidé ici.
- Toute nouvelle divergence découverte pendant le développement donne lieu à un complément
  de cet ADR.
