# Dictionnaire de données — Vente produit, Opportunités d'affaire, Projets, Immobilier, Entreprise, Marché, Prospective, Partenariat, Course, Article, Réussite

> Reconstitué par analyse du code PHP legacy (V04).

Légende états génériques: 1=Non traité,2=Autorisé,3=Supprimé,4=Clôturé (`Etat`, rarement 4).

---

## 1. `produit` — Catalogue produits FLP (Forever Living Products, vente par distributeurs)

| Colonne | Nom métier | Note |
|---|---|---|
| `indexpdt` | `id` | |
| `referencepdt` | `reference` (saisie libre, **PAS auto-générée**, contrairement aux autres modules) | |
| `nompdt` | `nom` | |
| `descriptionpdt` | `description` | |
| `prixdistpdt` | `prix_distributeur` | |
| `prixcompdt` | `prix_non_distributeur` | |
| `prixpubpdt` | `prix_public` | |
| `index1mld`..`index5mld`, `posologie1pdt`..`posologie5pdt` | **Colonnes mortes** — bloc de saisie maladie/posologie entièrement commenté, absent de l'INSERT/UPDATE | À exclure ou réactiver consciemment |
| `etatpdt` | `etat_fiche` (1-3 seulement) | |
| `datevisitpdt`/`nbvisitepdt` | `date_derniere_consultation`/`nombre_visites` | |
| `groupepdt` | `groupe` (FK logique vers `arraygroupeproduit`, 20 catégories FLP fixes) | |
| `groupe1pdt` | **Colonne morte** (bitmask 20 car., UI commentée) | |
| `quantitepdt` | `quantite_stock` (décrémentée à chaque paiement confirmé) | |

**Règles**: unicité (groupe+nom), nom≥4 car.

---

## 2. `panier` — Panier d'achat générique multi-usage

| Colonne | Nom métier |
|---|---|
| `indexpnr` | `id` |
| `typepnr` | `type_panier`: 1=Produit,2=Article,5=Likelemba,6=Souscription,7=Fond soutien,8=Apport fond (`arraytypepnr`). ⚠ **Incohérence**: `incl-course.php` fixe `typepnr=4` pour "Course" alors que l'index 4 du tableau est vide `""` — décalage d'énumération dans le legacy, à noter mais reproduire (données existantes utilisent cette valeur) |
| `indexmbr` | `membre` (acheteur) |
| `datepnr` | `date_ajout` |
| `indexpdt`/`indexart` | `produit`/`article` (FK nullable selon type) |
| `qtepnr` | `quantite` |
| `prixpnr` | `prix_unitaire` (**snapshot** au moment de l'ajout, pas une jointure live) |
| `etatpnr` | `etat` (filtré=2; suppression = DELETE physique, PAS de soft-delete ici — incohérent avec le reste de l'appli) |
| `etatpayepnr` | `paye` (0/1) |
| `datepayepnr` | `date_paiement` |
| `indexpay` | `payement` (FK) |

**Règle clé**: au checkout, si quantité demandée > stock disponible pour au moins une ligne → paiement bloqué.

---

## 3. `produitoportuniteaffaire`/`membreoportuniteaffaire`/`souscriptoportuniteaffaire` — Adhésion FLP (devenir distributeur)

Pilotées par `incl-adhesion.php` (inclus depuis `opportunite.php?ppa=3`) — **PAS la table `adhesion`** (voir dictionnaire membres §0). Assistant d'inscription comme distributeur FLP (marketing de réseau).

### `souscriptoportuniteaffaire` (SOA) — fiche d'adhésion, assistant 9 étapes
| Colonne | Nom métier | Note |
|---|---|---|
| `indexsoa` | `id` | |
| `indexmbr` | `membre` (1 souscription max/membre) | |
| `datesoa` | `date_creation` | |
| `referencesoa` | `reference` | ⚠ **jamais renseignée** — absente de l'INSERT malgré le pattern `fonctreference()` partout ailleurs. À corriger ou documenter comme tel. |
| `zone02soa` | `objectifs_prioritaires` | Étape 1 |
| `zone03soa` | `mon_histoire` | Étape 1bis |
| `zone04soa` | `disponibilite_hebdo` (0-3: ""/5-10/10-20/20+ h/semaine) | Étape 1 |
| `zone091-173soa` (×4 formations × 3 champs, ×3 filleuls × 5 champs) | `formation_N_date/_lieu/_heure` (N=1..4: POA, Journée succès, Formation Animateur, Formation Manager) ; `filleul_N_nom/_mail/_adresse/_montant/_date_presentation` (N=1..3) | Étapes 2bis et 6 |
| `zone12soa` | `nombre_rdv_individuels` | Étape 5 |
| `zone21soa` | `mode_souscription` (1=Fond propre ≥56000 FCFA, 2=Crédit 56000-66000 FCFA) | Étape 7 |
| `zone22soa` | `montant_souscription` (calculé = Σ produits×quantité du kit) | |
| `zone23soa` | `date_limite_complement_noms` | |
| `etatsoa` | `etat_fiche` | ⚠ **toujours forcé à 2** (codé en dur) à l'INSERT, UPDATE et confirmation paiement — pas de vrai circuit de validation observé dans ce périmètre |

### `membreoportuniteaffaire` (MOA) — liste de 25 prospects du filleul
`indexmoa`→`id`, `indexsoa`→`souscription`(FK), `indexmbr`→`membre`(parrain), `nomprenmoa`→`nom_prenom`, `phonemoa`→`telephone`, `mailmoa`→`email`, `commentairemoa`→`commentaire`, `etatmoa`→`etat_fiche`.

### `produitoportuniteaffaire` (POA) — kit produit choisi à la souscription
`indexpoa`→`id`, `indexsoa`→`souscription`(FK), `indexmbr`→`membre`, `indexpdt`→`produit`(FK), `prixpoa`→`prix_unitaire`(snapshot), `quantitepoa`→`quantite`, `etatpoa`→`etat_fiche`.
**Comportement**: DELETE de toutes les lignes existantes puis ré-INSERT complet à chaque sauvegarde (pas de diff).

---

## 4. `produitprospective` — Catalogue libre (module Prospective/Répertoire B2B)

`indexptpv`→`id`, `nomproduitptpv`→`nom_produit`, `etatptpv`→`etat_fiche`. Alimenté en libre-service: quand une entreprise déclare une offre/demande d'un produit absent, une nouvelle ligne est auto-créée.

---

## 5. `projet` — Projets en recherche de financement

`indexpjt`→`id`, `indexmbr`→`membre`(porteur), `referencepjt`→`reference`(préfixe pjt), `responsablepjt`→`responsable`, `promoteurpjt`→`promoteur`, `objetpjt`→`objet`, `libellepjt`→`libelle`, `objectifpjt`→`objectif`, `descriptionpjt`→`description`, `adressepjt`→`adresse`, `dureepjt`→`duree_mois`(0-120), `datelancementpjt`→`date_lancement`, `conditionpjt`→`conditions_eligibilite`, `etatpjt`→`etat_fiche`.
**Règle**: unicité (responsable+objet). Édition: gestionnaire+droit_gestion_fiches OU auteur.

---

## 6. `businessplan` — Auto-diagnostic business léger (1/membre, distinct de `accompbusinessplan`)

29 zones, libellés en français clair (`type_activite`, `description_projet`, `moyens_actuels`, `ressources_disponibles`, `possessions`, `organisation_actuelle/souhaitee`, `detail_besoin`, `apport_actuel`, `ambition`, `strategie_resultats`, `valeur_ajoutee`, `prevision_ca_benefice`, `processus_activite`, `estimation_charges`, `composantes_ca`, `repartition_ca`(⚠ sémantique ambiguë, dérivée d'un ancien champ Oui/Non), `elements_environnementaux`, `strategie_attaque`, `devis_chiffre_besoin`, `apport_prevu`, `niveau_realisation_pct`, `difficultes_realisation`, `planning_execution`, `difficultes_futures`, `reference`(préfixe bsp), `date_creation`, `etat_fiche`).
**Règle**: unique par membre, `type_activite`≥5 car., `description_projet`≥10 car. Boutons "Sauvegarder"/"Envoyer" = même traitement (pas de différenciation réelle).

### `accompbusinessplan` (bonus, table sœur formelle "grade banque/investisseur", préfixe abp) — 58 zones
Sections: Identification entreprise/promoteur (04-13), Environnement socio-éco (14-17), Marché (18-27, sous-sections marché produits finis 19-21 / structure consommation 22-27), Environnement zone projet (28-31), Description projet (32-48, sous-section organisation générale 38-48), Études financières (49-58).
⚠ **Bug confirmé** (partagé avec le rapport finance): UPDATE écrit `zone53abp='$chp0A[43]'` et `zone44abp='$chp0A[54]'` (mauvais index/mauvaise cible) — corruption de données en cas de modification. Ne pas reproduire.

---

## 7. `immobilier` — Annonces immobilières (vente/location)

| Colonne | Nom métier | Note |
|---|---|---|
| `indeximb` | `id` | |
| `indexmbr` | `membre` (auteur) | |
| `transactionimb` | `type_transaction` (`TypeBesoin`: 0=indifférent,1=Location,2=Vente) | |
| `typeimb` | `type_bien` (`TypeBien`, 10 valeurs) | |
| `indexqtr` | `quartier` (FK) | |
| `localisationimb` | `localisation` (libre) | |
| `surfaceimb` | `surface_m2` | ⚠ **type SQL `tinyint` (max 255) incompatible avec l'UI 0-2000 m²** → risque de troncature réelle en legacy. **Migrer en IntegerField standard en Django.** |
| `nbpieceimb`/`nbchambreimb` | `nombre_pieces`/`nombre_chambres` | |
| `situationimb` | `situation` (1=Disponible,2=Occupé; 3,4 réservés inutilisés) | |
| `priximb` | `prix` | |
| `descriptimb` | `description` | |
| `dateinscriptimb` | `date_inscription` | |
| `nbvisiteimb`/`datevisiteimb` | compteur vues (présents mais pas incrémentés dans ce fichier) | |
| `etatimb` | `etat_fiche` | |
| `referenceimb` | `reference` (préfixe imb) | |
| `offredemandeimb` | `offre_ou_recherche` (`OffreDemande`) | |

**Règle**: unicité sur description. Section "intéressement" via table `besoin` (typebsn=3).

---

## 8. `entreprise` — Répertoire d'entreprises

| Colonne | Nom métier | Note |
|---|---|---|
| `indexent` | `id` | |
| `indexmbr` | `membre` (si categoriembr=2/Morale, ses coordonnées pré-remplissent la fiche) | |
| `referenceent` | `reference` (préfixe ent) | |
| `indexsat` | `secteur_activite` | ⚠ **Champ mort dans l'UI actuelle** — select commenté, transmis en hidden seulement. Fragilise l'unicité (secteur+nom). |
| `indexdat` | `domaine_activite` (FK, obligatoire, seul niveau réellement éditable) | |
| `noment` | `nom_entreprise` (obligatoire) | |
| `formeent` | `forme_juridique` (`FormeJuridique`, obligatoire) | |
| `capitalent` | `capital_social` | |
| `descriptent` | `description` | |
| `commentent` | `commentaire` | ⚠ colonne présente mais UI commentée (champ mort) |
| `gerantent` | `gerant` | |
| `phoneent`/`mailent`/`siteent`/`adresseent` | téléphone/email/site/adresse | |
| `indexvil` | `ville` (FK, obligatoire) | |
| `etatent` | `etat_fiche` | |
| `dateinscriptent` | `date_inscription` | |
| `datevisiteent`/`nbvisiteent` | compteur vues **incrémenté** (contrairement à immobilier) | |

**Règle**: unicité (secteur+nom) — fragile car secteur non saisi réellement. Photo `ent{id}.jpg`.
⚠ **`incl-formulaireentreprise.php`**: formulaire quasi-doublon (forme juridique 0-3 seulement au lieu de 0-9) — à réconcilier en un seul composant, clarifier lequel est actif.

---

## 9. `marche` — Marchés publics/privés (appels d'offres)

`indexmch`→`id`, `indexmbr`→`membre`(publicateur), `referencemch`→`reference`(préfixe mch), `numerooffremch`→`numero_appel_offre`(**clé d'unicité métier réelle**, pas la référence auto), `typemch`→`type_marche`(`Confidentialite`:1=Privé,2=Public), `libellemch`→`libelle`, `descriptionmch`→`description`, `montantmch`→`montant`(>0), `delaimch`→`delai_soumission`, `dossiermch`→`dossier_a_fournir`, `lieudepotmch`→`lieu_depot`, `adressemailmch`→`adresse_mail`, `maitreouvragemch`→`maitre_ouvrage`, `publierparmch`→`publie_par`, `beneficiairemch`→`beneficiaire`, `etatmch`→`etat_fiche`.

⚠ Message d'erreur "Ce marché est déjà enregistré" copié-collé dans `incl-projet.php` — sans conséquence fonctionnelle, corriger les libellés en migration.

---

## 10. `prospective1`/`prospective2` — Répertoire B2B Offres/Demandes ("Comparateur de prix")

### `prospective1` (en-tête, 1/entreprise)
`indexppv1`→`id`, `indexmbr`→`membre`, `indexent`→`entreprise`(FK, unique), `etatppv1`→`etat_fiche`.

### `prospective2` (lignes offre/demande)
`indexppv2`→`id`, `indexppv1`→`prospective`(FK parent), `offredemandeppv2`→`offre_ou_demande`(`OffreDemande`), `indexptpv`→`produit_prospective`(FK, créé à la volée si absent), `unitemesureppv2`→`unite_vente`(texte libre, l'enum `arrayunitemesure` existe mais commenté/inutilisé), `prixppv2`→`prix`, `fournisseurclientppv2`→`fournisseur_ou_client`, `volumeppv2`→`quantite_mensuelle`, `etatppv2`→`etat_fiche`.

**Particularité**: suppression = DELETE physique (incohérent avec le reste). Bouton "Envoyer mail" = action transitoire sans persistance.

---

## 11. `partenariat` — Partenariat & Troc

`indexptn`→`id`, `indexmbr`→`membre`, `referenceptn`→`reference` (préfixe généré "ptr" — ⚠ note: dérive du suffixe colonnes "ptn", sans impact fonctionnel), `dateptn`→`date_creation`, `actifptn`→`actif`(ressource proposée, obligatoire), `descriptptn`→`description`, `rechercheptn`→`recherche`(échange souhaité), `objectifptn`→`objectif`, `etatptn`→`etat_fiche`.

**Flux "intéressement"**: mini-formulaire dédié → crée une ligne dans `besoin` (typebsn=6, interesebsn=2 codé en dur="Intéressement"), ne modifie PAS `partenariat`.

---

## 12. `course1`/`course2` — Service de courses/livraison

### `course1` (commande, en-tête)
| Colonne | Nom métier | Note |
|---|---|---|
| `indexcrs1` | `id` | |
| `indexmbr` | `membre` (client) | |
| `referencecrs1` | `reference` (préfixe crs) | |
| `datecrs1` | `date_creation` | ⚠ stockée `varchar(14)` format YmdHis, pas un vrai type date — **convertir en DateTimeField Django** |
| `indexbtq` | `boutique` (FK membre, banqboutqmbr=2) | |
| `magasincrs1` | `lieu_achat` | |
| `dateachatcrs1` | `date_achat` (varchar(8) Ymd) | |
| `datelivraisoncrs1` | `date_heure_livraison` (varchar(14), composé séparément date+heure+minute) | |
| `lieulivraisoncrs1` | `lieu_livraison` | |
| `montantcrs1` | `montant_achats` (calculé, ≥ `parametre.montantcoursepmt`) | |
| `commissioncrs1` | `frais_service` (snapshot `parametre.commissioncoursepmt`) | |
| `modepayecrs1` | `mode_paiement` (`ModePaye`) | |
| `etatpayecrs1` | `etat_paiement` (`OuiNon`) | |
| `observationcrs1` | `observation` | |
| `etatcoursecrs1` | `etat_course` (`EtatCourse`) | |
| `etatcrs1` | `etat_fiche` | |

**Règles**: validation 2 temps (Vérification puis Enregistrer). Dates achat/livraison non antérieures à aujourd'hui, livraison≥achat, montant≥seuil configurable.

### `course2` (lignes articles)
`indexcrs2`→`id`, `indexcrs1`→`commande`(FK), `indexartcse`→`article_catalogue`(FK nullable, rempli seulement en mode catalogue), `articlecrs2`→`nom_article`, `prixcrs2`→`prix_plafond`("Prix maxi à ne pas dépasser", pas figé), `quantitecrs2`→`quantite`, `observationcrs2`→`observation`, `etatcrs2`→`etat_fiche`(non géré dans ce périmètre).

⚠ **Point à clarifier**: deux fichiers concurrents (`incl-course.php` catalogue-lié vs `incl-course-1.php` texte libre) gèrent la même table différemment. Identifier lequel est réellement actif avant de choisir le modèle Django cible.

---

## 13. `articlecourse` — Catalogue boutique partenaire (pour service Course)

`indexartcse`→`id`, `indexbtq`→`boutique`(FK membre), `codeartcse`→`code`(SKU), `nomartcse`→`nom`, `marqueartcse`→`marque`, `prixartcse`→`prix`, `disponibleartcse`→`disponible`(`OuiNon`, défaut Oui), `observationartcse`→`description`, `etatartcse`→`etat_fiche`.

---

## 14. `article` — Petites annonces d'occasion (distinct du catalogue FLP `produit`)

`indexart`→`id`, `indexmbr`→`membre`(vendeur), `indexfam`→`famille`(FK `familart`), `referenceart`→`reference`(préfixe acl), `libeleart`→`libelle`(≥5 car.), `prixart`→`prix`, `quantiteart`→`quantite`, `neufocasart`→`etat_article`(`NeufOccasion`), `descriptart`→`description`, `dateinscriptart`→`date_inscription`, `etatart`→`etat_fiche`, `datevisiteart`/`nbvisiteart`→compteur vues (non incrémenté dans ce fichier), `offredemandeart`→`offre_ou_recherche`(`OffreDemande`).

**Règle**: unicité (libellé+description). Intéressement via `besoin` (typebsn=3). Photo `art{id}.jpg`.

---

## 15. `reussite` — Témoignages / Réussites entrepreneuriales

`indexrst`→`id`, `indexmbr`→`membre`(1 fiche max/membre), `zone02rst`→`reference`(préfixe rst), `zone03rst`→`situation_avant`, `zone04rst`→`vision`, `zone05rst`→`projet`(≥10 car., champ recherché en liste publique), `zone06rst`→`fond_demarrage`, `zone07rst`→`besoin_reel_demarrage`, `zone08rst`→`strategie`, `zone09rst`→`difficultes_rencontrees`, `zone10rst`→`deploiement_efforts`, `zone11rst`→`succes_rencontre`, `zone12rst`→`conseil`, `zone13rst`→`etat_fiche`, `zone14rst`→`date_creation`, `zone15rst`→`secteur_activite`(FK, obligatoire).

**Liste publique**: filtre état=Autorisé pour visiteurs, recherche sur projet OU nom membre, tri par date.

---

## 16. `besoin` — Table transverse "expression d'intérêt/besoin" (polymorphe)

`indexbsn`→`id`, `typebsn`→`type_objet`(3=immobilier/article selon FK renseignée, 6=partenariat; 1,2,4,5 hors périmètre: RH/likelemba), `indexmbr`→`membre`(auteur intérêt), `indexhmn`→`ressource_humaine`(FK, hors périmètre), `indeximb`→`immobilier`(FK conditionnelle), `indexart`→`article`(FK conditionnelle), `indexptn`→`partenariat`(FK conditionnelle), `datebsn`→`date_creation`, `besoinbsn`→`message`, `interesebsn`→`sous_type`(variable selon contexte), `etatbsn`→`etat_fiche`.

**Recommandation Django**: modéliser via relation générique (GenericForeignKey) ou sous-classes plutôt que 3 FK nullables, mais conserver le comportement (1 seule cible renseignée à la fois par ligne).

---

## 17. `secteuractivite`/`domaineactivite` — cf. dictionnaire contenu (taxonomie 2 niveaux)

---

## 18. Flux fonctionnels clés

**A. Vente Produit**: catalogue par groupe FLP (20 catégories) → panier (snapshot prix) → blocage si stock insuffisant → paiement (typepnr=1) → décrémente stock + marque panier payé.

**B. Opportunité d'affaire (devenir distributeur FLP)**: assistant 9-10 étapes → objectifs → 25 prospects (MOA) → 4 formations → RDV → 3 filleuls → mode souscription + kit produit (POA, calcul auto montant) → sauvegarde SOA → paiement si Fond propre (typepnr=6) → confirmation.

**C. Répertoire B2B/Comparateur prix**: entreprise → fiche prospective1 unique → lignes offre/demande (prospective2) liées à produitprospective (existant ou créé à la volée). Annuaire filtrable + email direct sans persistance.

**D-I. Marché, Projet, Business Plan, Immobilier/Article, Partenariat, Réussite**: CRUD standards avec le pattern habituel (référence auto, état, droits gestionnaire/auteur), section "intéressement" via `besoin` pour immobilier/article/partenariat.

**J. Course/Livraison**: choix boutique (catalogue) ou saisie libre → date/heure livraison → montant≥seuil → frais fixes → validation 2 temps → paiement (typepnr=4).

---

## 19. Relations (vue textuelle, aucune FK SQL déclarée)

```
membre ─┬─< produit (pas de FK directe, géré par gestionnaire)
        ├─< panier >─ produit/article
        ├─< souscriptoportuniteaffaire (1:1) ─┬─< membreoportuniteaffaire
        │                                     └─< produitoportuniteaffaire >─ produit
        ├─< projet
        ├─< businessplan (1:1)
        ├─< accompbusinessplan (1:1)
        ├─< immobilier ─> quartier ─> ville
        ├─< entreprise ─> domaineactivite ─> secteuractivite
        │       └─< prospective1 (1:1/entreprise) ─< prospective2 ─> produitprospective
        ├─< marche
        ├─< partenariat
        ├─< article ─> familart
        ├─< reussite ─> secteuractivite
        ├─< course1 (client); course1.indexbtq ─> membre (boutique)
        │       └─< course2 ─> articlecourse (optionnel)
        ├─< articlecourse (boutique)
        └─< besoin ─> (immobilier | article | partenariat | humaine) selon typebsn

payement <(1:N)- panier.indexpay / course1 / souscriptoportuniteaffaire (état seulement)
```

---

## 20. Points de vigilance prioritaires

1. `produit`: colonnes mortes (maladie/posologie, groupe1pdt bitmask) — exclure.
2. `panier.typepnr=4` pour Course: décalage d'énumération legacy à documenter, pas à "corriger" silencieusement (données existantes en dépendent).
3. `souscriptoportuniteaffaire.referencesoa`: jamais alimentée — décider si on la génère rétroactivement ou si on la laisse vide comme le legacy.
4. `souscriptoportuniteaffaire.etatsoa`: pas de vrai workflow de validation dans ce périmètre — vérifier si géré ailleurs (fichiers hors périmètre choix5.php).
5. `accompbusinessplan`: même bug UPDATE zone53/44 que documenté dans le rapport finance.
6. `entreprise.indexsat`: champ mort dans l'UI, fragilise l'unicité — décider si on réactive la saisie du secteur en Django.
7. `immobilier.surfaceimb`: type SQL trop étroit (tinyint) vs plage UI réelle — corriger en IntegerField.
8. `course1`/`course2`: deux flux concurrents (catalogue vs texte libre) — clarifier lequel migrer.
9. `course1` dates en varchar formaté — convertir en vrais DateTimeField.
10. `prospective2`/`panier`: DELETE physique au lieu du pattern soft-delete habituel — harmoniser ou documenter l'exception.
11. `businessplan`: boutons Sauvegarder/Envoyer sans différenciation réelle — clarifier intention métier.
12. `incl-formulaireentreprise.php` vs `incl-entreprise.php`: doublons à réconcilier.
