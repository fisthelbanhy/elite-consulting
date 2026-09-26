# Dictionnaire de données — Caisse, Banque, Fonds, Crédit

> Reconstitué par analyse du code PHP legacy (V04).

## 0. Notions transverses
- `$gtre==1` = gestionnaire (admin). `droitmbr` position "Activation" (`substr($droitmbr,2,1)==1`) conditionne le droit de changer l'état d'une fiche partout. Position "Caisse" (`substr($droitmbr,1,1)`) autorise la confirmation des paiements.
- `fonctreference($prefixe)`: `PREFIXE + mois(2) + compteur_global + année(2)`. Compteur **global partagé** dans `parametre.numreferencepmt`. Préfixes: `abp`=Business Plan, `apa`=Projet Agricole, `arc`=Restructuration Crédit, `aci`=Crédit Immobilier, `opb`=Opération Banque, `ddc`=Demande Crédit, `cct`=Contentieux, `alf`=Appel de Fond, `atf`=Apport/Collecte Fond, `pcs`=Point Caisse, `fds`=Fond de Soutien.
- `Etat` générique: 1=Non traité,2=Autorisé,3=Supprimé,4=Clôturé — **mais réinterprété différemment sur `collectefond`** (voir §6).
- `EtatPayement`: 1=Non payé,2=Payement non confirmé,3=Payement confirmé.
- Tables "formulaire long à zones numérotées" (`contentcredit`, `acompbusinesplan`, `acompprojetagricol`, `acomprestructcredit`, `acompcreditimmobil`): chaque `zoneNNxxx` = une question dont le libellé exact est dans `$arrayaccompXXX2[N]` (preuve directe, `echo` juste avant le champ).

---

## 1. `pointcaisse` — Carte de pointage / journal de mouvements (PAS une caisse comptable classique)

Système de carte de pointage sécurisée par code PIN, réservé aux membres Morale avec `pointcaissembr=1`. Le solde courant vit dans `membre.soldepointcaissembr`/`datepointcaissembr` — `pointcaisse` n'est que le **journal append-only** des mouvements.

| Colonne | Nom métier | Note |
|---|---|---|
| `indexpcs` | `id` | |
| `dateheurepcs` | `date_heure_operation` | |
| `indexcaissepcs` | `operateur` (FK membre) | Membre qui EFFECTUE l'opération (peut différer du titulaire) |
| `operationpcs` | `type_operation` (`VersementRetrait`: 1=Versement,2=Retrait) | |
| `indexmbr` | `membre` (FK, titulaire du compte) | |
| `montantpcs` | `montant` | |
| `motifpcs` | `motif` | |
| `tempssaisipcs` | `saisie_immediate` (toujours 1, codé en dur) | Champ quasi mort |
| `soldepcs` | `solde_apres_operation` (copie figée, historisation) | |
| `codepcs` | `reference` (préfixe PCS) | |
| `typecaissepcs` | `type_caisse` (1=self-service membre, 2=opéré par gestionnaire) | |

**Champ lié critique**: `membre.codepointagembr` (PIN 4 chiffres) = 2ème facteur obligatoire, vérifié en `WHERE codepointagembr=$chp09` avant toute écriture.

### Règles métier (à reproduire exactement)
1. PIN obligatoire et vérifié serveur (`membre.codepointagembr`).
2. Anti-doublon: même jour + même opération + même membre + même montant → refusé.
3. Calcul solde: Versement → `+montant`; Retrait → `-montant`.
4. **Règle de rétention 3% sur retrait**: `if (operationpcs==2 AND montant > solde_actuel*0.97) → refus "Impossible de faire un retrait, Le solde est inférieur au montant demandé."` — un retrait ne peut dépasser 97% du solde. **Règle métier non documentée ailleurs, à confirmer intentionnelle mais À REPRODUIRE telle quelle** (pénalité/marge de sécurité implicite).
5. Mise à jour `membre.soldepointcaissembr`/`datepointcaissembr` du titulaire après écriture.
6. **Effet miroir sur l'opérateur**: si l'opérateur n'est pas un gestionnaire anonyme (`$gtre!=0`), le même mouvement est répercuté AUSSI sur le solde de l'opérateur — modèle "agent mobile money": le solde de l'agent absorbe le mouvement du client.

---

## 2. `banque` — Référentiel des banques partenaires (pas de mouvement financier)

`indexbqe`→`id`, `indexmbr`→`index_membre_createur` (jamais alimenté, vestige), `siglebqe`→`sigle` (majuscules), `nombqe`→`nom`, `phonebqe`→`telephones`, `adressebqe`→`adresse`, `mailbqe`→`email`, `sitebqe`→`site_web`, `nomcontactbqe`→`nom_contact`, `phonecontactbqe`→`telephone_contact`, `observatbqe`→`observation`, `etatbqe`→`etat` (défaut 2=Autorisé/utilisable).

---

## 3. `operatbanq` — Carnet d'ordres de virement (pas un relevé bancaire réel)

Instructions de virement programmées par le membre, transmises par email à la banque, avec suivi d'état. **Deux variantes de code coexistent** — `incl-operationbanque-Liste.php` (ancienne, saisie grille 15 lignes, colonnes `nomemeteuropb`/`objetopb`/`motifopb` absentes du schéma actuel = code mort) vs `incl-operationbanque.php` (actuelle, active).

| Colonne | Nom métier |
|---|---|
| `indexopb` | `id` |
| `indexmbr` | `membre` (donneur d'ordre) |
| `referenceopb` | `reference` (préfixe OPB) |
| `date1opb` | `date_saisie` |
| `date2opb` | `date_operation` (date effective souhaitée) |
| `montantopb` | `montant` |
| `deviseopb` | `devise` (`Devise`) |
| `typeopb` | `type_operation` (`TypeOperationBanque`) |
| `indexbqe` | `banque_emettrice` (FK banque) |
| `nombanqueemettriceopb` | `nom_banque_emettrice_libre` (si absente du référentiel) |
| `mailbanqueemettriceopb` | `email_banque_emettrice` |
| `beneficiaireopb` | `beneficiaire` |
| `indexbanquebeneficiaireopb` | `banque_beneficiaire` (FK banque) |
| `nombanquebeneficiaireopb` | `nom_banque_beneficiaire_libre` |
| `adressebanquebeneficiaireopb` | `adresse_banque_beneficiaire` (le `title` HTML dit "Mail" mais label+colonne disent "Adresse" — retenu "adresse", à vérifier métier) |
| `etatopb` | `etat` (forcé à 2 à la création) |

**Règles**: saisie en grille de 15 opérations simultanées (legacy). Anti-doublon (membre+date+montant+banque+bénéficiaire). Email auto envoyé à la banque/bénéficiaire.

---

## 4. `payement` — Journal générique des paiements (table PIVOT transverse)

Utilisée par tous les modules nécessitant un encaissement. Le type d'objet payé est déterminé par `typepnrpay`.

| Colonne | Nom métier |
|---|---|
| `indexpay` | `id` |
| `indexmbr` | `membre` (payeur) |
| `datepay` | `date_paiement` |
| `typepay` | `mode_paiement` (`ModePaye`) |
| `montantpay` | `montant` |
| `remarquepay` | `remarque` (code Charden Farell ou n° Mobile Money) |
| `etatpay` | `etat` (`EtatPayement`) |
| `typepnrpay` | `type_operation_source`: 1=Produit,2=Article,5=Likelemba,6=Souscription,7=Fond soutien,8=Apport fond (`arraytypepnr`) |

### Workflow
1. Création: `etatpay` toujours fixé à **2 (Payement non confirmé)** en pratique — 1 (Non payé) jamais réellement atteint par ce flux.
2. Anti-doublon (membre+montant+remarque).
3. Validation format: Charden Farell ≥12 car. dans `remarque`; Mobile Money ≥9 car.
4. Confirmation manuelle par gestionnaire (droit "Caisse"): `etatpay` 2→3 (Payement confirmé) — le système ne peut pas vérifier automatiquement un virement externe.
5. **Effets de bord immédiats à l'INSERTION** (indépendants de la confirmation, dans `incl-enregpaye.php`), selon `typepnrpay`:
   - 1/2 (Produit/Article): décrémente stock, marque lignes `panier` payées (`etatpayepnr=1`).
   - 5 (Likelemba): insère mouvement dans `likelemba3`.
   - 6 (Souscription): `UPDATE table_souscription SET etatsoa=2`.
   - 7 (Fond soutien): `UPDATE fonddesoutien SET modepayefds=..., confirmefds=1`.
   - 8 (Apport fond): message "mis en attente" seulement — pas d'écriture immédiate dans `collectefond` (confirmation via `incl-paportfond.php`, §6).

---

## 5. `appelfond` — Appels de fonds (crowdfunding B2B)

| Colonne | Nom métier | Note |
|---|---|---|
| `indexadf` | `id` | |
| `indexmbr` | `membre_auteur` | |
| `referenceadf` | `reference` (préfixe ALF) | |
| `indexent` | `entreprise` (FK) | |
| `nomprojetadf` | `nom_projet` (≥11 car., unique) | |
| `objetprojetadf` | `objet_projet` (≥11 car.) | |
| `indexsat` | `secteur_activite` (FK) | |
| `descriptactiviteadf` | `description_activite` (≥31 car.) | |
| `descriptprojetadf` | `description_projet` (≥31 car.) | |
| `devisprojetadf` | `devis_projet` (coût total, ≥10001) | |
| `apportfondadf` | `apport_fond_propre` | |
| `besoinfondadf` | `besoin_financement` (≥10001) | |
| `niveaurealisatadf` | `niveau_realisation` (%) | |
| `nompromotadf` | `nom_promoteur` (≥6 car.) | |
| `phonepromotadf` | `telephone_promoteur` | |
| `mailpromotadf` | `mail_promoteur` | ⚠ **BUG legacy confirmé**: à la CRÉATION (INSERT), `$chp15`(mail) et `$chp16`(adresse) sont inversés dans le mapping SQL — mail écrit dans `adressepromotadf` et vice-versa. L'UPDATE, lui, mappe correctement. **Auditer les données existantes avant migration**; ne pas reproduire le bug. |
| `adressepromotadf` | `adresse_promoteur` | (voir bug ci-dessus) |
| `etatadf` | `etat` | |
| `dateinscriptadf` | `date_creation` | |
| `datevisiteadf`/`nbvisiteadf` | `date_derniere_visite`/`nombre_visites` (visite terrain gestionnaire) | |
| `observatadf` | `observation_gestionnaire` | |
| `appreciatadf` | `appreciation` (note /10) | |
| `indexvil` | `ville` (FK) | |
| `promisfondadf` | `montant_promis` (**agrégat calculé, jamais saisi directement**) | Alimenté uniquement par le module `collectefond` |
| `colectefondadf` | `montant_collecte` (**agrégat calculé**) | Idem |

**Règles**: `devisprojetadf` ≥ `apportfondadf` et ≥ `besoinfondadf`; `besoinfondadf` ≤ `devisprojetadf - apportfondadf` (cohérence plan de financement). Upload PDF présentation. **`promisfondadf`/`colectefondadf` à modéliser en Django via agrégation (annotate/Sum) ou signal post_save — jamais en saisie manuelle**, pour rester fidèle au comportement legacy.

---

## 6. `collectefond` — Engagements d'apport sur un appel de fonds (machine à états CLÉ)

| Colonne | Nom métier |
|---|---|
| `indexcdf` | `id` |
| `indexadf` | `appel_fond` (FK) |
| `indexmbr` | `membre_creancier` |
| `referencecdf` | `reference` (préfixe ATF) |
| `dateaportcdf` | `date_engagement` |
| `typeaportcdf` | `type_apport` (`TypeApportFond`) |
| `montantprevucdf` | `montant_promis` |
| `echeancecdf` | `echeance_mois` |
| `montantversecdf` | `montant_verse_cumule` |
| `remarquecdf` | `remarque_creancier` |
| `observcdf` | `observation_mediateur` (gestionnaire) |
| `dateversecdf` | `date_dernier_versement` |
| `etatcdf` | `etat` — **réinterprétation métier spécifique, PAS l'échelle générique standard** |

### Machine à états `etatcdf` (comportement comptable réel, à reproduire à l'identique)
- **1 (Non traité)** = promesse non encore validée (neutre, pas encore comptabilisée).
- **1→2** = promesse validée: `appelfond.promisfondadf += montantprevucdf`.
- **2→3** = promesse annulée: `appelfond.promisfondadf -= montantprevucdf`.
- Tant que `etatcdf==2`, chaque versement saisi (`$chp13>0`): `collectefond.montantversecdf += chp13`; `appelfond.colectefondadf += chp13`; **+ insertion dans `mouvcollectefond`**.
- Modification de `montantprevucdf`: recalcul différentiel de `appelfond.promisfondadf`.

**Trou fonctionnel identifié (legacy, non corrigé)**: en cas d'annulation tardive (2→3) après versements déjà effectués, **`colectefondadf` (montant collecté) n'est jamais décrémenté** — le montant reste affiché comme "collecté" même si la promesse est annulée. À clarifier avec le porteur de projet: faut-il corriger ce comportement dans la version Django, ou le reproduire à l'identique par fidélité ?

---

## 7. `mouvcollectefond` — Journal détaillé des versements (append-only)

`indexmcf`→`id`, `indexcdf`→`collecte_fond` (FK), `datemcf`→`date_versement`, `montantmcf`→`montant_verse`, `etatmcf`→`etat` (toujours 2 à l'insertion). Relation stricte 1 `collectefond` → N `mouvcollectefond`, justifie le cumul `collectefond.montantversecdf`.

---

## 8. `fonddesoutien` — Épargne solidaire (Don / Placement)

*(Table hors périmètre SQL initial mais manipulée par `incl-pointcaisse.php`, incluse par nécessité)*

Mécanisme entre membres: **Don** (pur) ou **Placement** (rémunéré), avec "rapporteur" (initiateur) et "souscripteur" (bénéficiaire, peut différer). Colonnes clés: `typefds` (`DonPlacement`), `indrapporteurfds`/`rapporteurfds`, `indsouscripteurfds`/`souscripteurfds`, `motivationfds`, `montantfds` (Don: min 100 FCFA; Placement: min = `parametre.fondplacementpmt`), `dureefds` (12-120 mois), `modepayefds`, `confirmefds` (`OuiNon`), `etatfds`. Email auto au souscripteur quand un rapporteur souscrit en son nom.

---

## 9. `demandecredit` — Demandes de crédit bancaire

`indexdct`→`id`, `indexmbr`→`membre`, `referencedct`→`reference` (préfixe DDC), `datedct`→`date_demande`, `montantdct`→`montant_credit`, `objetdct`→`objet`, `duredct`→`duree_remboursement_mois` (0-120), `niveaurealisatdct`→`niveau_realisation_projet` (%), `garantidct`→`garantie`, `delaireponsedct`→`delai_reponse_souhaite_jours` (0-366), `observdct`→`observation_et_choix_banques`, `etatdct`→`etat`, `devisglobaldct`→`devis_global`, `apportpropredct`→`apport_fond_propre`.

Pas de calcul auto (pas de taux d'intérêt/échéancier) — le crédit reste externe, traité par la banque elle-même.

---

## 10. `contentcredit` — Dossier de contentieux/restructuration de dette

⚠ 3 variantes historiques dans le code (`$new==1/2/3`), **seule `$new=3` est active** (codé en dur). Les autres branches = code mort.

| Colonne(s) | Nom métier |
|---|---|
| `indexctc`,`indexmbr`,`referencectc` (préfixe CCT),`datectc` | id, membre, reference, date_dossier |
| `zone04ctc`/`zone04Actc` | `montant_dette_compromise`/`detail_dette_compromise` |
| `zone05/06/07 ctc`+`Actc` | revenus journaliers/hebdomadaires/mensuels + détail |
| `zone08/09 ctc`+`Actc` | charges fixes/variables mensuelles + détail |
| `zone10ctc` | `activites_encours` |
| `zone11ctc`/`Actc` | `entrees_attendues_activite_encours`+détail |
| `zone12ctc` | `activite_previsionnelle` |
| `zone13/14 ctc`+`Actc` | entrées attendues prévisionnelles/totales + détail |
| `zone15ctc` | `echeance_credit_actuelle` |
| `zone16ctc`/`Actc` | `montant_echeance_supportable`+détail (donnée d'entrée, PAS calculée) |
| `zone17ctc` | `elements_environnementaux_favorables` |
| `etatctc` | `etat` |

---

## 11-14. Formulaires d'accompagnement (structure identique × 4 tables)

Questionnaires libres remplis par le membre, relus/validés par un conseiller. `zone01`=référence, `zone02`=date création, `zone03`=Objet (seul champ validé, ≥11 car.), `etat`=validation gestionnaire.

### 11. `acompbusinesplan` (préfixe BSP) — zones 03 à 58 utilisées (60 en base)
Sections: Identification entreprise/promoteur, Environnement socio-éco, Marché, Environnement zone projet, Description projet, Études financières. Libellés détaillés: voir rapport complet de l'agent (denomination, historique, forme juridique, siège social... jusqu'à tableau de financement).
⚠ `zone59abp`/`zone60abp`: **colonnes mortes**, toujours écrites vides — ne pas rendre obligatoires en Django.
⚠ Bug UPDATE: `zone53abp`/`zone44abp` reçoivent les valeurs de `chp0A[43]`/`chp0A[54]` (erreur de copier-coller) — ne pas reproduire.

### 12. `acompprojetagricol` (préfixe PJT/APA) — zones 03 à 80, TOUTES utilisées
Sections: Identification, Environnement socio-éco, Marché, Description projet, Études financières. Seule table des 4 où toutes les zones déclarées sont effectivement peuplées.
⚠ Même bug UPDATE que ci-dessus sur `zone53apa`/`zone44apa`.

### 13. `acomprestructcredit` (préfixe ARC) — zones 03 à 47 utilisées (50 en base)
Sections: Historique société, Historique crédit, Objet crédit, Situation actuelle.
⚠ `zone48/49/50arc`: colonnes mortes, jamais écrites.

### 14. `acompcreditimmobil` (préfixe ACI) — zones 03 à 38 utilisées (40 en base)
Sections: Activité, Financement et projet.
⚠ `zone39/40aci`: colonnes mortes.

**Note générale sur les 4 tables**: pour les libellés exacts de chaque zone (question), se référer au rapport source de l'agent d'analyse finance (conservé dans l'historique de session) ou relire directement `incl-acompbusinesplan.php` etc. — la liste complète est longue (jusqu'à 80 items) et a été omise ici pour concision; elle est nécessaire uniquement au moment de générer les formulaires Django/SvelteKit de ces 4 modules spécifiques.

---

## 15-17. `benchmarking1/2/3` — Comparateur tarifaire bancaire (hiérarchie 3 niveaux)

⚠ **Incohérence schéma/code détectée**: `pbenchmarking.php` (version "membre", filtrée par `indexmbr`) référence des colonnes (`benchmarking1.indexmbr`, `benchmarking2.tarifbm2`) **absentes du schéma SQL fourni**. Seule `pbenchmarking-2.php` (version admin globale) est cohérente avec le schéma réel. **Recommandation: ne migrer que le modèle admin.**

- `benchmarking1`: `indexbm1`→`id`, `indexbqe` (vestige, jamais écrit), `libelebm1`→`libelle` (type d'opération racine), `etatbm1`→`etat`.
- `benchmarking2`: `indexbm2`→`id`, `indexbm1`→`type_operation` (FK), `libelebm2`→`libelle` (sous-type détaillé), `etatbm2`→`etat`.
- `benchmarking3`: `indexbm3`→`id`, `indexbm2`→`operation` (FK), `indexbqe`→`banque` (FK), `tarifbm3`→`tarif` (texte libre, pas typé montant), `etatbm3`→`etat`. Seule table matérialisant une donnée comparative réelle ("banque X, opération Y coûte Z"). Anti-doublon (banque+opération+tarif).

Hiérarchie: `benchmarking1` (type) → `benchmarking2` (sous-type) → `benchmarking3` (tarif×banque). Libellé affiché: `libelebm1 . ' -> ' . libelebm2`.

---

## Relations (FK logiques, aucune FK SQL déclarée)

```
pointcaisse.indexmbr / indexcaissepcs ──> membre (×2: titulaire + operateur)
operatbanq.indexmbr ──> membre
operatbanq.indexbqe / indexbanquebeneficiaireopb ──> banque (×2)
payement.indexmbr ──> membre  (lien logique vers appelfond/collectefond/fonddesoutien/panier via typepnrpay)
appelfond.indexmbr/indexent/indexsat/indexvil ──> membre/entreprise/secteuractivite/ville
collectefond.indexadf/indexmbr ──> appelfond/membre
mouvcollectefond.indexcdf ──> collectefond
fonddesoutien.indexmbr/indrapporteurfds/indsouscripteurfds ──> membre (×3)
demandecredit.indexmbr / contentcredit.indexmbr / acomp*.indexmbr ──> membre
benchmarking2.indexbm1 ──> benchmarking1
benchmarking3.indexbm2/indexbqe ──> benchmarking2/banque
```

## Points de vigilance prioritaires (à trancher avec le métier avant modélisation finale)

1. Bug mapping mail/adresse promoteur dans `appelfond` (INSERT) — auditer données réelles.
2. Bugs UPDATE zone53/zone44 dans `acompbusinesplan` et `acompprojetagricol`.
3. Colonnes mortes en fin des 4 tables d'accompagnement — ne pas les rendre obligatoires.
4. `benchmarking1/2` version "membre" incohérente avec le schéma — migrer seulement le modèle admin.
5. **Règle de rétention 3% sur retrait `pointcaisse`** — à confirmer intentionnelle mais reproduire telle quelle.
6. **Trou fonctionnel `collectefond`**: pas de décrément de `colectefondadf` en cas d'annulation tardive — décider si on corrige ou reproduit à l'identique.
