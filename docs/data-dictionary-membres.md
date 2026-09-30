# Dictionnaire de données — Membres, Connexion, RH, Likelemba

> Reconstitué par analyse du code PHP legacy (V04). Sert de référence au schéma
> (`api/src/schema/membres.ts`) et aux vues SvelteKit correspondantes.

Périmètre analysé en intégralité : `incl-membre.php`, `incl-formulairemembre.php`, `incl-adhesion.php`, `incl-connexion.php`, `incl-connex.php`, `incl-contconnex.php`, `pmotpasoublie.php`, `pmembre.php`, `incl-humaine.php`, `incl-membrelikelemba.php`, `incl-payelikelemba.php`, `incl-likelemba.php`, `pdiplome.php`, `pfamilart.php`, `pmaladie.php`, `incl-variable.php`, `opportunite.php`.

---

## 0. Avertissement méthodologique important — un piège de nommage

**`incl-adhesion.php` ne touche PAS la table SQL `adhesion`.**

- La table `adhesion` (colonnes `indexahn`, `codeahn`, `dateahn`, `indexmbr`, `montantahn`, `modepayeahn`, `referenceahn`, `etatahn`) est déclarée (`$tablahn = 'adhesion';`) uniquement dans `opportunite.php`, **mais aucune requête SQL du périmètre lu ne lit ni n'écrit dans cette table**. La fonction `fonctcodeahn()` associée est commentée / morte dans `incl-variable.php`.
- `incl-adhesion.php` manipule en réalité 4 tables différentes : `souscriptoportuniteaffaire`, `membreoportuniteaffaire`, `produitoportuniteaffaire`, `produit`. C'est le workflow d'**adhésion à l'opportunité d'affaire FLP (Forever Living Products, MLM)**.

**Conclusion migration** : `adhesion` (indexahn) est probablement une table **historique/vestigiale**. À migrer en lecture seule (données brutes), sans logique applicative, sauf confirmation contraire du porteur de projet.

---

## 1. Table `membre` — Compte utilisateur / adhérent

| Colonne SQL | Nom métier | Preuve / règle |
|---|---|---|
| `indexmbr` | `id` (PK) | |
| `typembr` | `type_compte` (IntegerChoices `TypeMembre`) | 1=Gestionnaire, 2=Master, 3=Membre. Pilote `$gtre` = niveau d'habilitation partout dans l'appli |
| `codembr` | `code_membre` | Généré: préfixe `MBR` + mois + séquence + année |
| `nomprenmbr` | `nom_ou_raison_sociale` | "Nom - Prénom" (physique) / "Nom entreprise" (morale) |
| `sexembr` | `sexe` (`Sexe`) | Forcé à 3 (Indéfini) si personne morale |
| `phonembr` | `telephone` | Validé par `phone()` (préfixes congolais 01/04/05/06/22, 9 chiffres) |
| `mailmbr` | `email` | |
| `indexvil` | `ville` (FK → Ville) | Obligatoire |
| `identifmbr` | `identifiant_connexion` (login, unique) | |
| `motpasmbr` | mot de passe | **Stocké en clair dans le legacy** → haché à la reprise (Argon2, ADR-0005) |
| `observmbr` | `observation` | |
| `etatmbr` | `statut_fiche` (`Etat`) | Seul `etatmbr==3` (Supprimé) bloque la connexion — 1 (Non traité) n'empêche PAS de se connecter |
| `droitmbr` | 3 booléens explicites : `droit_attribution`, `droit_caisse`, `droit_activation` | Chaîne positionnelle 3-5 caractères '0'/'1' en legacy — éclatée en trois colonnes |
| `adressembr` | `adresse` | |
| `cnimbr` | `numero_piece_identite` | |
| `employeurmbr` | `employeur` | Personne physique seulement |
| `indexahn` | (probablement mort, voir §0) | Lu mais jamais réutilisé dans le formulaire |
| `datemastermbr` | `date_limite_master` | Redevance mensuelle FCFA 5000 pour statut Master |
| `situatmatrimmbr` | `situation_matrimoniale` (`EtatCivil`) | Obligatoire si personne physique |
| `nbenfantmbr` | `nombre_enfants` | 0-20, forcé 0 si morale |
| `categoriembr` | `type_personne` (`CategorieMembre`) | Champ pivot: 1=Physique, 2=Morale (association incluse) |
| `pseudombr` | `pseudonyme_ou_sigle` | ≥6 car. (physique) / ≥3 car. (morale) |
| `banqboutqmbr` | `type_partenaire` (`BanqueBoutique`) | Morale seulement. Si Banque(1) → ligne miroir créée dans `banque` |
| `indexdat` | `domaine_activite` (FK → DomaineActivite) | Morale seulement |
| `connexmsgmbr` | `notification_connexion_en_attente` (flag technique) | |
| `pointcaissembr` | `droit_point_caisse` (`OuiNon`) | Obligatoire (physique), défaut Non |
| `soldepointcaissembr` | `solde_point_caisse` | Calculé ailleurs (module caisse) |
| `datepointcaissembr` | `date_dernier_pointage` | readonly |
| `codepointagembr` | `code_pointage` | Code 4 chiffres aléatoire, généré par admin — usage exact (carte de pointage) hors périmètre |

### Règles de validation (inscription publique `incl-membre.php`)
1. Captcha "mot de contrôle" (9 lettres aléatoires, vérifié serveur).
2. Nom/raison sociale ≥3 caractères.
3. Sexe obligatoire si physique.
4. Téléphone validé par `phone()`.
5. Mot de passe ≠ identifiant, confirmation obligatoire.
6. Ville obligatoire.
7. Type de personne obligatoire.
8. Situation matrimoniale obligatoire si physique.
9. Pseudo ≥6 (physique) / Sigle ≥3 (morale).
10. Droit point de caisse obligatoire.
11. Unicité: nom OU identifiant OU pseudo déjà existant → rejet.
12. **Pas d'email de confirmation, pas de validation admin bloquante** — connexion immédiate possible après inscription.
13. Upload photo optionnelle → `mbr{id}.jpg`.
14. `typembr` forcé à 3 (Membre) côté inscription publique — impossible de s'auto-inscrire Gestionnaire/Master.

---

## 2. Table `visitembr` — Log de connexion membre

| Colonne | Nom métier | Note |
|---|---|---|
| `indexvst` | `id` | |
| `indexmbr` | `membre` (FK) | |
| `datevst` | `date_connexion` | |
| `adresipvst` | `adresse_ip` | |
| `datenumvst` | horodatage string YmdHis (doublon technique, ignorable — utiliser `datevst` seul) | |

Créée uniquement lors d'une connexion via formulaire (pas lors de la reconstruction de session par cookie).

---

## 3. Authentification — flux à reproduire

- Login: `identifmbr` + `motpasmbr`, exclusion `etatmbr!=3`.
- Session legacy: `$_SESSION['idfmps'] = "identifiant*motdepasse"` (persistance "remember me" artisanale) → **remplacé par une vraie session serveur** : jeton opaque en cookie httpOnly (ADR-0002).
- Déconnexion: détruit session, remet `connexmsgpmt`/`connexmsgmbr` à 0.
- Contexte posé à la connexion, équivalent futur de `request.user`: `$gtre` (type_compte), `$imbr` (id), `droitmbr`, `categoriembr`, `banqboutqmbr`, `pointcaissembr`, `nomprenmbr`.
- `incl-connexion.php` = **formulaire mort/non fonctionnel** (champs sans `name`) — ignorer, se baser sur `incl-connex.php` (vrai formulaire pied de page).

### Mot de passe oublié (`pmotpasoublie.php`) — À SÉCURISER lors de la migration
Flux legacy: vérification croisée (catégorie + nom + pseudo + téléphone) → **restitution du mot de passe en clair à l'écran**, sans email. **Remplacé par un vrai flux e-mail + lien de réinitialisation** (comportement fonctionnel équivalent — « retrouver l'accès à son compte » — mais implémentation sécurisée).

---

## 4. Table `humaine` — Ressources humaines (offres / demandes d'emploi)

Pilotée par `typeinscripthmn` (= `$ode`): 1=Demande d'emploi (préfixe réf. `DEI`), 2=Offre d'emploi (préfixe réf. `OE1`).

| Colonne | Nom métier | Note |
|---|---|---|
| `indexhmn` | `id` | |
| `indexmbr` | `auteur` (FK membre) | |
| `typeinscripthmn` | `type_annonce` (1/2) | |
| `indexsat` | `secteur_activite` (FK) | **Désactivé dans l'UI actuelle** — champ hidden, conserver en base mais ne pas exposer en formulaire modifiable |
| `indexdat` | `domaine_activite` (FK, obligatoire) | |
| `nomhmn` / `prenomhmn` | `nom` / `prenom` | Visible seulement si demande d'emploi |
| `sexehmn` | `sexe` | |
| `datenaishmn` | `date_naissance` | Âge calculé à la volée (readonly) |
| `adressehmn` | `adresse` | |
| `phonehmn` | `telephone` | Validé si demande d'emploi |
| `mailhmn` | `email` | |
| `diplomehmn` | `diplomes` (texte libre, PAS de FK vers table `diplome`) | |
| `savoirfairehmn` | `savoir_faire` | Colonne en base non utilisée dans ce périmètre de fichiers |
| `experience1hmn` | `experience_professionnelle` | |
| `experience2hmn` | (non utilisé dans ce périmètre) | |
| `autreinfohmn` | `autres_informations` | |
| `etathmn` | `statut_fiche` (`Etat` 1-4) | Défaut 2 (Autorisé) à la création — pas de modération a priori |
| `dateinscripthmn` | `date_creation` | |
| `referencehmn` | `reference` | |
| `postepourvoirhmn` | `poste_a_pourvoir` | Offres seulement |
| `datevisitehmn`/`nbrvisitehmn` | `date_derniere_consultation`/`nombre_consultations` | Pattern compteur de vues, récurrent dans toute l'appli (mixin `Viewable` recommandé) |
| `competencehmn` | `competences` / `competences_requises` | Label dynamique selon type |

**Règles**: type+secteur+domaine+sexe+téléphone(si demande) obligatoires, nom≥3 si demande. Anti-doublon (domaine+nom+prénom) ou (auteur+poste+info). Upload photo + CV PDF (`hmn{id}.jpg`, `cv{id}.pdf`). Édition: Gestionnaire+droit_gestion_fiches OU auteur lui-même.

**Module lié `besoin`** (table couplée, hors périmètre strict): commentaires "besoin"/"intérêt" déposés par d'autres membres sous une fiche RH (`arraybesoininteressement`: 1=Présentation de besoin, 2=Intéressement).

---

## 5. Table `diplome` — Référentiel simple

`indexdpm`→`id`, `codedpm`→`code_abrege`, `libeledpm`→`libelle` (≥5 car., unique). Pas de FK entrante confirmée (le champ `humaine.diplomehmn` est un texte libre indépendant). CRUD admin uniquement, pas de suppression physique, pas de colonne état.

---

## 6. Table `familart` — Famille d'ARTICLE (⚠ pas "maladie")

`indexfam`→`id`, `libelefam`→`libelle` (≥5 car., unique). Catégorise `article` (module e-commerce boutique).

**⚠ Bug de code source à NE PAS reproduire**: message d'erreur legacy dit "Cette famille de maladie est déjà enregistrée" (copier-coller depuis pmaladie.php) — utiliser "Cette famille d'article est déjà enregistrée." dans la nouvelle version.

---

## 7. Table `maladie` — Référentiel santé + produits conseillés

`indexmld`→`id`, `libelemld`→`libelle` (≥5, unique), `descriptionmld`→`description`.
`index1pdt`..`index5pdt` + `posologie1pdtmld`..`posologie5pdtmld`: 5 couples (produit FK, posologie texte).

**Fait**: le pattern « 5 colonnes fixes » est remplacé par la table de liaison `maladie_produit` (`maladie_id`, `produit_id`, `ordre`, `posologie`) — plus extensible, même comportement fonctionnel.

`etatmld`: `Etat` (1-3 utilisés), défaut 2.

---

## 8. Table `likelemba1` — Groupe de tontine (Likelemba)

> Likelemba = tontine communautaire (épargne rotative traditionnelle d'Afrique centrale).

| Colonne | Nom métier | Note |
|---|---|---|
| `indexlkb1` | `id` | |
| `codelkb1` | `code_groupe` | Préfixe `LKB` + mois+seq+année |
| `indexcheflkb1` | `responsable` (FK membre, obligatoire) | |
| `montantlkb1` | `montant_cotisation` (>0, obligatoire) | Montant fixe par échéance |
| `datedebutlkb1` | `date_debut` | |
| `observatlkb1` | `observation` | Sert aussi de critère d'unicité (fragile mais réel) |
| `nbentrelkb1` | `nombre_participants` (compteur séquentiel) | Génère le préfixe ordinal du code membre: `{n}{codelkb1}` |
| `nbpayelkb1` | `nombre_paiements` (compteur séquentiel) | Génère le suffixe des reçus: `{codelkb1}P{n}` |
| `etatlkb1` | `statut_fiche` (`Etat`) | |
| `periodelkb1` | `periodicite` (`Periode`: Semaine/Quinzaine/Mensuel, obligatoire) | |

**Migration**: `nbentrelkb1`/`nbpayelkb1` deviennent des compteurs recalculés, mais le **format des codes est préservé** (il a déjà été communiqué aux membres sur papier).

---

## 9. Table `likelemba2` — Adhésion membre↔groupe (+ caution & témoins)

| Colonne | Nom métier |
|---|---|
| `indexlkb2` | `id` |
| `indexlkb1` | `groupe` (FK) |
| `codelkb2` | `code_membre_groupe` |
| `indexmbr` | `membre` (FK) |
| `dateentrelkb2` | `date_entree` |
| `observatlkb2` | `observation` |
| `etatlkb2` | `statut_adhesion` (`Etat`) |
| `personcautlkb2` | `nom_caution` |
| `personcautmbrlkb2` | `caution_est_membre` (bool) |
| `cnipersoncautlkb2` | `piece_identite_caution` |
| `adressepersoncautlkb2` | `adresse_caution` |
| `activitepersoncautlkb2` | `activite_caution` |
| `phonepersoncautlkb2` | `telephone_caution` (colonne présente, champ UI non trouvé — vérifier avant de rendre obligatoire) |
| `temoin{1,2,3}lkb2` | `nom_temoin_{1,2,3}` |
| `phonetemoin{1,2,3}lkb2` | `telephone_temoin_{1,2,3}` |
| `emploitemoin{1,2,3}lkb2` | `emploi_temoin_{1,2,3}` |
| `temoin{1,2,3}mbrlkb2` | `temoin_est_membre_{1,2,3}` (bool) |

**Règles**: membre + date d'entrée obligatoires. Anti-doublon (groupe+membre) unique. Code généré seulement en contexte "nouveau membre" (`chp07==1`).

---

## 10. Table `likelemba3` — Cotisations / paiements

| Colonne | Nom métier |
|---|---|
| `indexlkb3` | `id` |
| `indexlkb1` | `groupe` (FK) |
| `indexlkb2` | `adhesion` (FK → likelemba2) |
| `indcaisrlkb3` | `caissier` (FK membre — celui qui encaisse) |
| `codelkb3` | `numero_recu` (`{codelkb1}P{n}`) |
| `datepayelkb3` | `date_paiement` |
| `montantlkb3` | `montant` |
| `observatlkb3` | `observation` |
| `etatlkb3` | `statut_fiche` (`Etat`) |
| `modepayelkb3` | `mode_paiement` (`ModePaye`) |
| `codechardenlkb3` | `code_transfert_charden` (si mode = Charden Farell, validé par `codecharden()`) |

**⚠ État du code legacy**: le formulaire de SAISIE d'un paiement (`incl-payelikelemba.php` lignes 24-238) est **entièrement commenté/mort**. Seules actives: régénération de reçu, et affichage lecture seule de l'historique. **Le code mort reste une excellente spec de référence** (validations, anti-doublon par date, génération de reçu) — mais vérifier où se fait réellement la saisie aujourd'hui (probablement le module caisse générique `incl-enregpaye.php`, cf. rapport finance).

---

## 11. Relations (FK implicites, aucune FK SQL déclarée dans le dump)

```
membre(indexmbr) ─┬─< visitembr.indexmbr
                   ├─< humaine.indexmbr
                   ├─< likelemba1.indexcheflkb1  (responsable)
                   ├─< likelemba2.indexmbr        (adhérent)
                   ├─< likelemba3.indcaisrlkb3    (caissier)
                   ├─< adhesion.indexmbr          (non exploité, voir §0)
                   └─< banque.indexmbr            (miroir si banqboutqmbr==1)

membre.indexvil ──> ville.indexvil
membre.indexdat ──> domaineactivite.indexdat
domaineactivite.indexsat ──> secteuractivite.indexsat

humaine.indexmbr ──> membre.indexmbr
humaine.indexsat ──> secteuractivite.indexsat (désactivé UI)
humaine.indexdat ──> domaineactivite.indexdat

likelemba1.indexcheflkb1 ──> membre.indexmbr
likelemba2.indexlkb1 ──> likelemba1.indexlkb1
likelemba2.indexmbr ──> membre.indexmbr
likelemba3.indexlkb1 ──> likelemba1.indexlkb1
likelemba3.indexlkb2 ──> likelemba2.indexlkb2
likelemba3.indcaisrlkb3 ──> membre.indexmbr

article.indexfam ──> familart.indexfam
maladie.index{1-5}pdt ──> produit.indexpdt
```

Table de séquencement partagée **`parametre`** (singleton `indexpmt=1`): compteurs `nummembrepmt`, `numreferencepmt`, `numadhesionpmt`, `numlikelembapmt`, etc. → remplacés par un compteur par table, **en préservant le format des codes déjà émis**.

---

## 12. Points d'attention prioritaires migration

1. **Mots de passe en clair** → migrer via `set_password()`, supprimer la restitution en clair de `pmotpasoublie.php`.
2. **`droitmbr`** (bitstring positionnelle) → 3 booléens explicites (`droit_attribution`, `droit_caisse`, `droit_activation`).
3. **Table `adhesion`**: sens non confirmé par ce périmètre — migrer données brutes seulement, sans logique.
4. **`familart`**: corriger le libellé d'erreur ("article", pas "maladie").
5. **`maladie` 5-colonnes**: remodeler en M2M avec table de liaison.
6. **`incl-payelikelemba.php`**: formulaire de saisie mort — vérifier le canal réel de saisie des paiements likelemba (probablement module caisse commun).
7. **`incl-connexion.php`**: formulaire mort, ignorer.
8. Compteurs séquentiels manuels → compteurs applicatifs propres, format de sortie identique.
9. Pattern compteur de vues (`nbvisiteX`/`datevisiteX`) répété sur `humaine`, `article`, `immobilier`, `appelfond` → factorisé dans le fragment de colonnes `consultable`.
