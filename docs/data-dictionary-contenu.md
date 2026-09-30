# Dictionnaire de données — Dialogue, Message, Conseil, Publicité, Contact, Référentiels, Menu

> Reconstitué par analyse du code PHP legacy (V04).

Sources: `dialogue`, `message`, `conseil`, `conseilfinance`, `publicite`, `contact`, `soungangai`, `diplome`, `maladie`, `familart`, `parametre`, `visite`, `ville`, `quartier`, `suggestion`, `aide`, `client` + fichiers PHP associés + `incl-variable.php`, `incl-contconnex.php`, `incl-menu.php`/`incl-menu1.php`.

## Conventions générales (valables pour toutes les tables ci-dessous)
- `$gtre` = `typembr` du membre connecté: 0=visiteur, 1=Gestionnaire, 2=Master, 3=Membre.
- `etatXXX` suit généralement `Etat`: 1=Non traité, 2=Autorisé/actif/publié, 3=Supprimé (soft delete), 4=Clôturé (fils de discussion uniquement: `conseil`, `conseilfinance`).
- `droitmbr` 3ᵉ caractère = droit "Activation" → autorise un Gestionnaire à changer l'état d'une fiche.
- Génération de référence via `fonctreference()`: préfixe + mois + compteur + année. Préfixes (`arraycodereference`): `lsg`=sounga, `cfr`=conseilfinance, `pub`=publicite, `csl`=conseil.

---

## 1. Table `dialogue` — Messagerie contextuelle par rubrique

| Colonne | Nom métier | Preuve |
|---|---|---|
| `indexdlg` | `id` | |
| `indexmbr` | `auteur` (FK membre) | |
| `typedlg` | `type_dialogue` | Cloisonne des fils thématiques par rubrique |
| `datedlg` | `date_message` | |
| `textedlg` | `texte` (≥5 car. accueil / ≥2 car. contextuel) | |
| `etatdlg` | `etat` | Toujours forcé à 2 (Autorisé) — pas de modération a priori |
| `indexmbrdlg` | `destinataire` (FK membre, 0=la frangine/Gestionnaire) | |

**Règles**: Membre voit ses messages + réponses qui lui sont adressées. Gestionnaire voit tous les messages non traités (`indexmbrdlg==0`) + peut répondre à un membre précis. Recherche plein texte.

---

## 2. Table `message` — Messagerie privée 1-à-1 (distincte de `dialogue`)

| Colonne | Nom métier | Preuve |
|---|---|---|
| `indexmsg` | `id` | |
| `datemsg` | `date_message` | |
| `indexmbr` | `expediteur` (FK membre, 0=la frangine) | |
| `index1mbr` | `destinataire` (FK membre) | |
| `textemsg` | `texte` (obligatoire) | |
| `etatmsg` | **booléen lu/non-lu** (1=non lu, 2=lu) — ⚠ n'utilise PAS l'échelle `Etat` standard malgré le nom | Marqué lu à l'ouverture; badge de compteur non-lus par membre |

**Flux**: envoi membre→frangine met `parametre.connexmsgpmt=1` (notif Gestionnaire), remis à 0 à la connexion suivante du Gestionnaire. Envoi frangine→membre marque l'ancien message du membre comme lu.

**Différence avec `dialogue`**: `message` = vraie conversation privée organisée par interlocuteur avec compteur non-lus; `dialogue` = fil contextuel par rubrique, public/semi-public. Les deux coexistent (dette technique du legacy, à conserver telle quelle pour fidélité fonctionnelle).

---

## 3. Table `conseil` — Forum "Informations utiles" (Choix1-A)

| Colonne | Nom métier | Preuve |
|---|---|---|
| `indexcsl` | `id` | |
| `referencecsl` | `reference` (préfixe CSL) | |
| `sujetreponsecsl` | `type_message` (1=Sujet, 2=Réponse) | |
| `objetcsl` | `objet` (vide si réponse) | |
| `indexmbr` | `auteur` (FK membre) | |
| `datecsl` | `date_creation` | |
| `textecsl` | `texte` | |
| `etatcsl` | `etat` (`Etat` complet 1-4) | |
| `nbreponsecsl` | `nombre_reponses` (compteur incrémenté) | |
| `confidencecsl` | `confidentialite` (`Confidentialite`: Privé=échange membre↔frangine seul / Public=visible tous) | |

**Règles**: objet≥5, texte≥20, confidentialité obligatoire. Anti-doublon (référence+objet). Modif état réservée Gestionnaire+droit Activation. Fils géré par `sujetreponsecsl` regroupé par `referencecsl` (pas de FK SQL, logique applicative).

---

## 4. Table `conseilfinance` — Forum "Offres Financières" (Choix7-A), 3 sous-rubriques

Même structure que `conseil` + :
- `typecsf` = `type_rubrique`: 1=Conseil financier, 2=Rumeurs Économiques, 3=Accompagnement (`arraymenuchoix71`)
- `etatcsf`: va jusqu'à 4 explicitement (Clôturé)
- `auteursujetcsf`: `auteur_sujet` (FK membre) — permet à l'auteur du SUJET d'éditer même sans droit Gestionnaire

**Droit de modification étendu**: Gestionnaire+Activation OU auteur du sujet lui-même.

---

## 5. Table `publicite` — Bandeaux publicitaires (image/son/vidéo)

| Colonne | Nom métier | Preuve |
|---|---|---|
| `indexpub` | `id` | |
| `indexmbr` | `demandeur` (FK membre) | |
| `indexent` | `entreprise` (FK entreprise) | |
| `referencepub` | `reference` (préfixe PUB) | |
| `objetpub` | `objet` (vestige, plus saisi) | |
| `textepub` | `texte` (≥6 car., légende affichée) | |
| `dateinscpub` | `date_creation` | |
| `datedebpub`/`datefinpub` | `date_debut_diffusion`/`date_fin_diffusion` | |
| `datevuepub` | `date_derniere_vue` | |
| `nbvuepub` | `nombre_vues` (compteur) | |
| `etatpub` | `etat` (1/2/3) | |
| `typefichpub` | `type_fichier` (0=vide,1=Image,2=Son,3=Video; index+4 donne l'extension jpg/mp3/mp4) | |

**Règles**: demandeur+entreprise obligatoires. Fichier nommé `pub{id}.{ext}`, stocké `../image/ig/`, redimensionné si image. Diffusion: sélection aléatoire parmi actives dans la fenêtre de dates (`ORDER BY RAND()`). Rendu vidéo legacy en `<object>` (Windows Media obsolète) → **moderniser en `<video>` HTML5** lors de la migration (comportement équivalent, techno actuelle).

---

## 6. Table `contact` — Formulaire de contact

| Colonne | Nom métier | Preuve |
|---|---|---|
| `indexctt` | `id` | |
| `indexmbr` | `membre` (FK, id=1 "Aucun" si visiteur) | |
| `nomctt` | `nom_expediteur` | |
| `datectt` | `date_envoi` | |
| `objetctt` | `objet` (≥5) | |
| `textectt` | `texte` (≥10) | |
| `etatctt` | `etat` (1=Non traité,2=Autorisé/traité,3=Supprimé — forcé à 2 à la création, sert de suivi pas de modération) | |
| `mailctt` | `mail_expediteur` (obligatoire ≥3) | |
| `reponsectt` | `reponse` | **⚠ Colonne absente du dump SQL fourni mais utilisée activement dans le code (lecture/écriture). À vérifier contre la base réelle avant migration** — schéma probablement désynchronisé du dump. |

**Règles**: anti-doublon (objet+texte). Réponse Gestionnaire déclenche envoi mail (`incl-envoimail.php`). Visibilité: Gestionnaire voit tout, Membre voit ses contacts, visiteur ne voit rien.

---

## 7. Table `soungangai` — Questionnaire "Découverte de soi" (Choix1-B)

Module d'auto-évaluation entrepreneuriale. 30 zones dont le libellé exact est affiché en `$title` dans le code — preuve directe non ambiguë.

| Colonne | Nom métier |
|---|---|
| `zone01sga` | `activite_actuelle` ("Que faites-vous actuellement") |
| `zone02sga` | `savoir_faire` ("Que savez-vous faire") |
| `zone03sga` | `description_activite_quotidienne` |
| `zone04sga` | `secret_a_partager` |
| `zone05sga` | `origine_idee` |
| `zone06sga` | `idee_vue_chez_autrui` (Oui/Non) |
| `zone07sga` | `participation_si_idee_non_personnelle` |
| `zone08sga` | `est_sociable` (Oui/Non) |
| `zone09sga` | `interet_pour_autrui` (Oui/Non) |
| `zone10sga` | `a_deja_fait_commerce` (Oui/Non) |
| `zone11sga` | `se_fait_facilement_des_amis` (Oui/Non) |
| `zone12sga` | `conserve_relations_longtemps` (Oui/Non) |
| `zone13sga` | `percu_comme_ouvert` (Oui/Non) |
| `zone14sga` | `perception_par_autrui` |
| `zone15sga` | `meneur_ou_suiveur` (Oui/Non) |
| `zone16sga` | `prefere_solitude_ou_entourage` |
| `zone17sga` | `a_des_amis_proches` (Oui/Non) |
| `zone18sga` | `entourage_valorise_activite` (Oui/Non) |
| `zone19sga` | `liste_entourage_proche` |
| `zone20sga` | `liste_personnes_consideration` |
| `zone21sga` | `motivation` |
| `zone22sga` | `pourcentage_implication` (0-100%) |
| `zone23sga` | `moyens_disponibles_pour_projet` |
| `zone24sga` | `soutien_conjoint` (Oui/Non) |
| `zone25sga` | `origine_du_soutien` |
| `zone26sga` | `confronte_les_autres_aux_faits` (Oui/Non) — ⚠ bug legacy: le select compare `$i==$chp24` au lieu de `$chp26` (affichage de sélection erroné) — **corriger dans la ré-implémentation, ne pas reproduire le bug** |
| `zone27sga` | `correspondance_membre` (notes du membre) |
| `zone28sga` | `correspondance_frangine` (notes Gestionnaire seul) |
| `zone29sga` | `etat_fiche` (`Etat` standard) |
| `zone30sga` | `cloture_fiche` (Oui/Non) |

**Règles**: 1 seul questionnaire par membre (relation 1-1 de fait). Édition: Gestionnaire+Activation OU le membre concerné. Référence préfixe LSG.

---

## 8. Table `diplome` — cf. dictionnaire membres (référentiel simple, code/libellé)

## 9. Table `maladie` — cf. dictionnaire membres (référentiel santé + 5 produits/posologies)

## 10. Table `familart` — Référentiel familles d'articles

`indexfam`→`id`, `libelefam`→`libelle` (≥5, unique, majuscules). ⚠ message d'erreur copié-collé depuis maladie ("famille de maladie") → corriger en "famille d'article".

---

## 11. Table `parametre` — Singleton de configuration globale (indexpmt=1)

| Colonne | Nom métier |
|---|---|
| `nompmt` | `nom_site` |
| `adressepmt` | `adresse` |
| `phone1pmt`/`phone2pmt` | `telephone_1`/`telephone_2` |
| `mailpmt` | `mail` |
| `aidepmt` | `texte_aide` |
| `fondplacementpmt` | `montant_minimum_placement` |
| `montantcoursepmt` | `montant_minimum_course` |
| `commissioncoursepmt` | `commission_course` |
| `conditioncoursepmt` | `conditions_course` |
| `choix1pmt`..`choix7pmt` | `description_section_1`..`description_section_7` (texte des 7 sections du menu) |
| `nummembrepmt`,`numreferencepmt`,`numadhesionpmt`,`numlikelembapmt`,`numbusnessmt`,`numsoungapmt`,`numreussitepmt`,`numplacementpmt` | compteurs de séquence pour génération de références |
| `connexmsgpmt` | `notification_nouveau_message` (flag Gestionnaire) |

---

## 12. Tables `ville` / `quartier` — Référentiel géographique 2 niveaux

`ville`: `indexvil`→`id`, `nomvil`→`nom`. `quartier`: `indexqtr`→`id`, `indexvil`→`ville` (FK obligatoire), `nomqtr`→`nom`. Nom ≥4 car., majuscules.

## 13. Tables `secteuractivite` / `domaineactivite` (couplées, gérées par `psatdat.php`)

`secteuractivite`: `indexsat`→`id`, `libelesat`→`libelle`, `etatsat`→`etat`.
`domaineactivite`: `indexdat`→`id`, `libeledat`→`libelle`, `etatdat`→`etat`, `indexsat`→`secteur` (FK obligatoire).
Hiérarchie Secteur→Domaine, utilisée par `entreprise` et `humaine` pour classer par secteur économique congolais.

---

## 14. Table `visite` — Log technique visites anonymes (jumelle de `visitembr`)

`indexvst`→`id`, `indexmbr`→`membre` (défaut 1="Aucun" si anonyme), `datevst`→`date_heure`, `timestampvst`→timestamp Unix (redondant), `adresipvst`→`adresse_ip`, `datenumvst`→date numérique YmdHis. Gestion admin: filtre par date/IP/membre, suppression en masse par sélection.

---

## 15. Table `suggestion` — Boîte à idées

`indexsgt`→`id`, `datesgt`→`date`, `modulesgt`→`module` (index dans `arraychoix1`, 0=Accueil,1-7=sections,8=Tous), `textesgt`→`texte` (≥10), `etatsgt`→`etat`.

## 16-17. Tables `aide` et `client` — ⚠ Probablement du code MORT / vestige

Aucun fichier PHP du périmètre lu (`paide.php`/`incl-aide.php`) ne référence ces tables. Le schéma de `client` (`indexhtl`, `datereservclt`, `dateocupclt`) évoque un **module de réservation hôtelière** — vraisemblablement un template générique réutilisé, jamais adapté au métier "lafrangine". **Recommandation: NE PAS migrer de logique applicative pour ces 2 tables sans confirmation du porteur de projet.** Migrer les données brutes uniquement si elles existent, par précaution.

---

## 18. Flux transverses

- **Upload fichiers** (`incl-upload.php`): max ~4 Mo, extensions jpg/jpeg/gif/png/pdf/doc/vob/wmv, redimensionnement auto images. Convention de nommage `{prefixe}{id}.{ext}`.
- **Pagination**: `incl-calculpagination.php`/`incl-changpage.php`.
- **Message de fin d'opération**: "Enregistrement effectué."/"Modification effectuée." après chaque sauvegarde.

---

## 19. Structure de navigation (Choix0 à Choix7)

| Choix | Section (`arraychoix1`) | Sous-sections | Tables principales |
|---|---|---|---|
| 0 | Accueil | — | `publicite` (carousel) |
| 1 | Le saviez-vous ? | A=Infos utiles, B=Découverte de soi, C=Santé/bien-être | `conseil`, `soungangai`, `maladie`+`produit` |
| 2 | Ressources humaines | Demande/Offre emploi | `humaine` |
| 3 | E-commerce | A=Immobiliers, B=Autres articles, C=Courses | `immobilier`, `produit`/`familart`, `course1`/`course2` |
| 4 | Appels de fonds | A=Financement participatif, B=Likelemba, C=Épargne solidaire | `appelfond`/`collectefond`, `likelemba1/2/3`, `fonddesoutien` |
| 5 | Opportunité d'affaires | A=Proposition, B=Business Plan, C=Partenariat & Troc | `demandecredit`/`contentcredit` |
| 6 | Entreprises - Marchés | A=Répertoire entreprise, B=Comparateur prix, C=Marchés/projets | `entreprise`, `marche`, projets |
| 7 | Offres Financières | A=Conseil Financier, B=Trésorerie, C=Bench Marking | `conseilfinance`, `placement`/`operatbanq`/`demandecredit` |

**Menu Gestionnaire** (`incl-menu.php`): accès direct aux écrans admin de référentiels (`pparametre`, `pmembre`, `pvilqtr`, `pdiplome`, `psatdat`, `pfamilart`, `pmaladie`, `pproduit`, `pvisite`, `psugest`, `pproduitptpv`) — ces écrans sont exclusivement des outils d'administration, non exposés aux membres simples.

**Variantes notées** (`choix4-2.php`, `choix5-3.php`, `choix3-3.php`, `choix7-4.php`): possibles versions alternatives/V2 des écrans principaux — **à clarifier avec le porteur de projet** avant de choisir laquelle porter dans la nouvelle stack.

---

## 20. Relations (aucune FK SQL déclarée — toute l'intégrité est applicative en PHP)

```
membre ─< dialogue (indexmbr, indexmbrdlg)
membre ─< message (indexmbr, index1mbr)
membre ─< conseil (indexmbr)
membre ─< conseilfinance (indexmbr, auteursujetcsf)
membre ─< contact (indexmbr)
membre ─< soungangai (indexmbr)   [quasi 1-1]
membre ─< publicite (indexmbr)
entreprise ─< publicite (indexent)
membre ─< visite / visitembr (indexmbr)
ville ─< quartier (indexvil)
secteuractivite ─< domaineactivite (indexsat)
maladie ──> produit (index1pdt..index5pdt)
parametre: singleton référencé par quasi tous les modules pour les séquences
```

**Recommandation migration**: le legacy ne fait jamais de suppression physique (toujours `etat=3` soft delete) → préférer une clé étrangère qui protège ou met à NULL plutôt qu'une suppression en cascade, pour rester fidèle au comportement d'origine.
