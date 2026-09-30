# Inventaire fonctionnel — S3 E-commerce, S4 Appels de fonds, Paiements & panier

> Source : code legacy en production `lafrangine/V04/prog/` (PHP 5, `mysql_*`), lu intégralement pour le périmètre ci-dessous.
> Les comportements « réels » ont été confrontés au dump `cp1019011_lafrangine.sql` (agrégats et formats uniquement, aucune donnée personnelle reprise).
> Cible : SvelteKit 2 / Svelte 5 + Express. Ce document décrit **ce que fait le legacy** (y compris ses défauts) ; les défauts sont signalés « ⚠ À NE PAS reproduire ».

---

## 0. En-tête

### 0.1 Périmètre

| Zone | Contenu |
|---|---|
| Section 3 « E-commerce » (`choix3.php`) | Onglets Immobiliers / Autres articles / Courses, sous-onglets Offre / Recherche, encarts NOUVEAUTES / LES PLUS VISITES, fiches, formulaires, besoin/intéressement (table `besoin`), panier articles, courses (commande de courses/livraison), catalogue boutique `particlecourse.php` |
| Section 4 « Appels de fonds » (`choix4.php`) | Financement participatif (appels de fonds + intéressements/apports), Likelemba (tontines : groupes, adhésions, cotisations), Épargne solidaire (Don/Placement + Carte de pointage) |
| Transverse paiement | `incl-formulairepaye.php`, `incl-enregpaye.php`, `ppayement.php` (validation gestionnaire), mécanique panier de `incl-venteproduit.php` |

### 0.2 Fichiers lus et statut réel (suivi des `include`)

| Fichier | Statut | Inclus / atteint par |
|---|---|---|
| `choix3.php` | **ACTIF** | Menus (`incl-menu1.php`, accueil) |
| `choix3-3.php` | **MORT** (orphelin : aucun lien, aucun include) | — ; ancienne version qui inclut `incl-course.php` et affiche les encarts aussi au gestionnaire |
| `incl-choix3A.php` | ACTIF | `choix3.php` (imbart=1, insc=0) |
| `incl-choix3B.php` | ACTIF | `choix3.php` (imbart=2, insc=0) |
| `incl-choix3C.php` | ACTIF | `choix3.php` (imbart=3, insc=0) |
| `incl-immobilier.php` | ACTIF | `choix3.php` (imbart=1, insc=2) |
| `incl-article.php` | ACTIF | `choix3.php` (imbart=2, insc=2) |
| `incl-course-1.php` | **ACTIF** (mode « texte libre ») | `choix3.php` (imbart=3, insc=2) |
| `incl-course.php` | **MORT** (mode « catalogue boutique ») | seulement `choix3-3.php` (orphelin) |
| `particlecourse.php` | ACTIF (page autonome) | lien « Vos Articles » du pied de page `incl-connex.php` (G ou Mb) |
| `incl-marche.php` | **Hors périmètre** (section 6 Marchés, inclus par `choix6.php`) — aucun lien avec S3 | — |
| `choix4.php` | **ACTIF** | Menus |
| `choix4-2.php` | **MORT** (orphelin) — ancienne S4 à 2 onglets, inclut `incl-paportfond.php` (apfd=1) et `incl-choix2X.php` | — |
| `incl-choix4A.php` | ACTIF | `choix4.php` (pjlk=1) |
| `incl-choix4B.php` | ACTIF | `choix4.php` (pjlk=2) |
| `incl-choix4B-1.php` | **MORT** (copie identique de `incl-choix4C.php`) | — |
| `incl-choix4C.php` | **MORT** (jamais inclus : `choix4.php` inclut `incl-choix4C{epso}.php` avec epso≠0) | — |
| `incl-choix4C1.php` | ACTIF (liste Don - Placement) | `choix4.php` (pjlk=3, epso=1, connecté) |
| `incl-choix4C2.php` | ACTIF (liste Carte de pointage) | `choix4.php` (pjlk=3, epso=2, connecté) |
| `incl-appelfond.php` | ACTIF | `choix4.php` (pjlk=1, insc=2) |
| `incl-apportfond.php` | ACTIF (formulaire « Intéressement ») | `incl-choix4A.php` (opt=4) ; aussi référencé par 4C1/4C/4B-1 (branche opt=4 inatteignable en pratique) |
| `incl-paportfond.php` | **MORT** (include commenté dans `choix4.php` l.235-237 ; seul `choix4-2.php` orphelin l'inclut) | — |
| `paportfond.php` | **MORT** (page autonome orpheline, ancienne version rattachée à `choix5`) | — |
| `incl-likelemba.php` | ACTIF | `choix4.php` (pjlk=2, insc=2) |
| `incl-membrelikelemba.php` | ACTIF | `incl-choix4B.php` (opt=4 / 42) |
| `incl-payelikelemba.php` | ACTIF partiellement (formulaire de saisie l.24-238 commenté ; actifs : « Activation » reçu + historique membre) | `incl-choix4B.php` (opt=6 / 62) |
| `incl-fondsoutien.php` | ACTIF | `choix4.php` (pjlk=3, epso=1, insc=2) |
| `incl-pointcaisse.php` | ACTIF | `choix4.php` (pjlk=3, epso=2, insc=2). Une copie identique existe à la racine `V04/` (non utilisée) |
| `incl-placement.php` | **Hors périmètre** : Trésorerie section 7 (table `placement`, `choix7.php` podc=1), aucun lien avec l'épargne solidaire | — |
| `incl-formulairepaye.php`, `incl-enregpaye.php` | ACTIFS (transverses) | 3B, course-1, 4B, fondsoutien, venteproduit, choix1C, adhesion, (paportfond mort) |
| `ppayement.php` | ACTIF (page autonome) | menu gestionnaire `incl-menu1.php` « Payement » |
| `incl-venteproduit.php` | ACTIF | `choix5.php` (opaf=1, ppa=2) — écran produit décrit par un autre analyste ; ici seulement la mécanique panier/paiement |
| `incl-lecturetables.php` | ACTIF | `incl-ouvrbd.php` (chaque page) : calcule les compteurs d'onglets |
| Utilitaires lus | `incl-variable.php`, `incl-contconnex.php`, `incl-pagination.php`, `incl-calculpagination.php`, `incl-changpage.php`, `incl-upload.php`, `incl-msgfinoperat.php`, `incl-erreur.php`, `incl-entete.php`, `incl-publicite.php`, `incl-connex.php` (extraits), `incl-envoimail.php`, `scripts/numerique.js`, `scripts/calendrier.js` | |

### 0.3 Légende des droits

| Code | Signification | Détection legacy |
|---|---|---|
| V | Visiteur non connecté | `$gtre==0` (souvent `$imbr` non défini) |
| M | Membre (compte standard) | `typembr=3` |
| Mp / Mm | Membre personne physique / morale | `categoriembr` 1 / 2 (`$catgmbr`) |
| Mb | Membre morale de type Boutique | `banqboutqmbr=2` (`$banqboutq`) |
| Mm-PC | Membre moral « agent de caisse » | `categoriembr=2` ET `pointcaissembr=1` (`$pointcaisse`) — **c'est ce champ membre, pas la position « Point caisse » de `droitmbr`, qui est testé** |
| Ma | Master | `typembr=2` |
| G | Gestionnaire | `typembr=1` |
| G+Act | Gestionnaire avec droit « Activation » | `substr(droitmbr,2,1)==1` |
| G+Caisse / G+Droit / G+PtCaisse | Gestionnaire avec droit Caisse (pos. 1) / Droit (pos. 0) / Point caisse (pos. 3) | **jamais testés dans ce périmètre** |
| C | Tout connecté (G, Ma ou M) | `$gtre!=0` |
| Auteur / Chef / Titulaire | Créateur de la fiche / responsable du likelemba / titulaire de la carte de pointage | comparaison `$imbr==indexmbr…` |

⚠ **Aucun contrôle d'autorisation côté serveur** dans tout le périmètre : les droits ne font que masquer liens/boutons. Toute URL (`insc=2`, `opt=2`, `dlt=1`, `ppayement.php`…) est exécutable par n'importe qui, y compris un visiteur. La réécriture doit appliquer les droits décrits ici **côté API**.

### 0.4 Conventions legacy communes (à connaître pour lire les URL)

- Paramètres GET de pilotage : `insc` (0=liste/consultation, 1=inscription membre `incl-membre.php`, 2=formulaire), `opt` (0=liste, 1=création, 2=édition, 3=détail ou paiement, 4=intéressement/suppression, 5=panier ou sous-liste, 6/62/7/42 likelemba), `imbart` (S3 onglet 1/2/3), `ofrdmd` (S3 sous-onglet 1=Offre, 2=Recherche), `pjlk` (S4 onglet 1/2/3), `epso` (S4 sous-onglet épargne 1/2), `apfd` (S4 : 1=liste des apports), `mdpay` (mode de paiement choisi 1/2/3), `dlt=1` (suppression), `chg=99` / `imp=1` (réutilisation du filtre en session).
- Champ caché `ajs` : 1=création, 2=modification, 3=soumission d'un formulaire de tri, 4/42/6/62 variantes S4.
- Références automatiques : `fonctreference(préfixe)` = `MAJUSCULES(préfixe + mois(2) + compteur + année(2))`, compteur **global unique** `parametre.numreferencepmt` incrémenté à chaque appel (même si l'enregistrement échoue ensuite). Préfixes du périmètre : `imb` (immobilier), `acl` (article), `crs` (course), `lkb` (likelemba), `fds` (don/placement), `alf` (appel de fonds), `atf` (apport/intéressement), `pcs` (pointage).
- Messages génériques (`$arraymessage`) : « Enregistrement effectué. » / « Modification effectuée. » affichés dans un bandeau `msgfinoperat`. Erreurs : bloc rouge « ERREURS » listant les messages (`incl-erreur.php`).
- Montants saisis avec séparateur de milliers espace (`number_format(x,0,',',' ')`), nettoyés par `supr_number_format`. Saisie numérique filtrée côté client par `checkNumber` (supprime le dernier caractère s'il n'est ni chiffre, ni `.`, ni `/`).
- Sélecteur de date `ds_sh()` : format `jj-mm-aaaa`.
- Suppression = passage `etat=3` (« Supprimé »), sauf panier (DELETE physique).
- Énumérations utilisées : `Etat` 1 Non traité / 2 Autorisé / 3 Supprimé / 4 Clôturé ; `OffreDemande` 1 Offre / 2 Demande ; sous-onglets S3 1 « Offre » / 2 « Recherche » ; `TypeBesoin` 0 indifférent / 1 Location / 2 Vente ; `TypeBien` 0..9 (indifférent, Maison, Appartement, Terrain, Commerce, Immeuble, Bureaux, Garage-Parking-Atelier, Dépôt, Autre bien) ; `SituationImb` 1 Disponible / 2 Occupé ; `NeufOccasion` 1 Neuf / 2 Occasion ; `EtatCourse` 1 En attente / 2 Supprimée / 3 Effectuée / 4 Livrée ; `ModePaye` 1 Cash / 2 Charden Farell / 3 Mobile Money ; `OuiNon` 1 Oui / 2 Non ; `TypeApportFond` 1 Don / 2 Crédit / 3 Actionnariat ; `DonPlacement` 1 Don / 2 Placement ; `Periode` 1 Semaine / 2 Quinzaine / 3 Mensuel ; `VersementRetrait` 1 Versement / 2 Retrait ; `BesoinInteressement` 1 « Présentation de besoin » / 2 « Intéressement » ; `EtatPayement` 1 Non payé (N.P.) / 2 Payement non confirmé (P.N.C.) / 3 Payement confirmé (P.C.) ; `TypePnr` 1 Produit / 2 Article / 5 Likelemba / 6 Souscription / 7 « Fond soutient » / 8 Apport fond (**4 = Course utilisé par le code mais libellé vide**) ; `OperatEncaisse` 1 Opération / 2 Encaisse ; `SyntheseGeneral` 1 Synthèse / 2 Général.

### 0.5 Volumétrie constatée dans le dump (aide à la priorisation)

immobilier 4 · article 15 · besoin 19 · panier 10 · payement 6 (**tous en état 2 « non confirmé »**) · course1 1 / course2 1 · articlecourse 0 · appelfond 2 · collectefond 8 (**tous en état 1**) · mouvcollectefond 0 · likelemba1 2 / likelemba2 2 / likelemba3 3 · fonddesoutien 7 (**aucun paiement**) · pointcaisse 89. Paramètres actuels : montant minimum course 5 000, frais de course 4 000, placement minimum 100 000 (FCFA).

---

## 1. Composants transverses aux deux sections

### 1.1 Gabarit de section (`choix3.php`, `choix4.php`)

- Bandeau de section (image + description `$arraychoix2[choix]`) via `incl-menu.php` (membre/visiteur) ou `incl-menu1.php` (gestionnaire).
- Barre d'onglets niveau 1 (3 onglets), onglet actif surligné. **Compteurs entre parenthèses** calculés à chaque page par `incl-lecturetables.php` :
  - S3 : IMMBOLIERS (n = nb `immobilier` état 2, offres + recherches confondues), AUTRES ARTICLES (n = nb `article` état 2), COURSES (pas de compteur).
  - S4 : FINANCEMENT PARTICIPATIF (n = nb `appelfond` état 2), LIKELEMBA (n = nb `likelemba1` état 2), EPARGNE SOLIDAIRE (pas de compteur).
  - ⚠ Libellé « Immboliers » (faute) dans `$arraymenuchoix3` → affiché « IMMBOLIERS ». À corriger.
- Barre de sous-onglets niveau 2 : S3 imbart 1-2 « Offre » / « Recherche » ; S4 pjlk 3 « Don - Placement » / « Carte de pointage ».
- Icône « Nouveau » (`ecrire.gif`) : conditions propres à chaque section (voir écrans).
- Pied de page commun (`incl-connex.php`) : lien « Vos Articles » vers `particlecourse.php` pour G ou Mb.

### 1.2 Pagination et filtres (tous les écrans liste)

- Taille de page par défaut **50**, sélecteur « Nombre de lignes par page: » 50..500 pas 50 (mémorisé en session `parpage`), sélecteur « Page: » 1..n. Affichés seulement si > 1 page.
- ⚠ Bug : le sélecteur « Page » ne fonctionne pas (la requête ne lit que `$_GET['limit']`, jamais fourni) → toujours la page 1. Changer la taille de page **perd les filtres** (le critère n'est réutilisé que si `chg=99`).
- ⚠ Critère de filtre stocké dans une variable de session unique `crittriegl` partagée par tous les écrans.
- Les formulaires de tri s'intitulent « Formulaire de trie » avec un bouton « OK ». Un champ vide ou « 0 » n'est pas appliqué.
- ⚠ Plusieurs filtres « mot » construisent `A LIKE … OR B LIKE …` sans parenthèses → le OR casse les autres conditions (résultats faux). À corriger.
- Les couleurs de lignes alternent (`#e1e1e1` / `#e9f0f5`).

### 1.3 Téléversement (`incl-upload.php`)

- Champ fichier `monfichier`, stocké dans `../image/ig/{préfixe}{id}.jpg` (ou `.pdf` pour appel de fonds) : `imb{id}`, `art{id}`, `artcse{id}`, `adf{id}.pdf`.
- Taille max 4 227 532 octets, sinon message « Image trop grande. Veuillez la réduire ou changer. ».
- Si fichier ≥ 250 000 octets et extension autorisée (jpg, jpeg, gif, png, pdf, doc, vob, wmv) : image redimensionnée à 300×250.
- ⚠ Sous 250 Ko aucune vérification d'extension : n'importe quel fichier est déplacé sous le nom `.jpg` → faille. Nom toujours `.jpg` même pour un PNG.

### 1.4 Encart « LES PUBLICITES » (S4 uniquement)

Colonne droite de `choix4.php` quand `pjlk≠0` et `insc=0` : jusqu'à 10 publicités `publicite` état 2 dont la date du jour est dans [datedeb, datefin], ordre aléatoire, image + texte + lien « Continuer la suite » vers `incl-affichpub.php`. (Écran publicité décrit ailleurs.)

### 1.5 Sécurité transverse

- ⚠ SQL construit par concaténation (injection possible partout), identifiants BDD en clair dans `incl-ouvrbd.php`, auteur/payeur transmis en champ caché (falsifiable), mot de passe en session. Ne rien reproduire.

---

## 2. Section 3 — E-commerce

### 2.1 Écran S3-0 : Page de section E-commerce

- **Fichier / URL** : `choix3.php?insc=0&opt=0` ; onglet `&imbart=1|2|3` ; sous-onglet `&ofrdmd=1|2`.
- **Accès** : tous (V, C).
- **Comportement** :
  - Sans `imbart` : seulement les onglets.
  - `imbart=1|2` sans `ofrdmd` : sous-onglets + encarts, pas de liste (la liste exige un sous-onglet).
  - Icône « Nouveau » (titre « Nouvelle {Offre|Recherche} {Immboliers|Autres articles|Courses} ») : visible si C et (imbart≠0 et ofrdmd≠0, ou imbart=3), hors formulaire et hors détail → `?insc=2&opt=1&imbart=…&ofrdmd=…`.
  - Mise en page : G voit la liste pleine largeur **sans encarts** ; V/M/Ma voient liste à gauche + encarts à droite.
- **Encarts (colonne droite, V/M/Ma)** :
  - « NOUVEAUTES » (bandeau vert) : 5 dernières fiches état 2 par date d'inscription décroissante.
  - « LES PLUS VISITES » (bandeau orange) : 5 fiches état 2 par nombre de visites décroissant.
  - Contenu : photo + 50 premiers caractères de la description + « .. », lien vers le détail (`opt=3`) **sans `ofrdmd`** (donc détail sans formulaire besoin/panier).
  - imbart=1 → immobiliers ; imbart=2 **et imbart=3** → articles (⚠ en onglet Courses les encarts montrent des articles). Encarts non filtrés par Offre/Recherche.
  - ⚠ Tri « NOUVEAUTES » des articles inopérant : toutes les dates d'inscription d'articles sont `0000-00-00` (bug §2.7).
- `insc=1` : affiche le formulaire d'inscription membre (hors périmètre).

### 2.2 Écran S3-A1 : Liste des immobiliers (Offre / Recherche)

- **Fichier / URL** : `incl-choix3A.php` — `choix3.php?insc=0&opt=0&imbart=1&ofrdmd=1|2`.
- **Accès** : V, C. Non-G : seulement fiches état 2 ; G : tous états + compteur « {n} Immobiliers ».
- **Filtre (« Formulaire de trie »)** :

| Libellé (placeholder / 1re option) | Champ | Contrôle | Options | Règle appliquée |
|---|---|---|---|---|
| Besoin | cht01 | select | Location, Vente | `transactionimb = valeur` |
| Type bien | cht02 | select | 9 types (Maison…Autre bien) | `typeimb = valeur` |
| Chambres | cht03 | select | 1..100 | `nbchambreimb = valeur` (égalité stricte) |
| Prix minimum | cht04 | texte numérique | — | `priximb >= valeur` |
| Le quartier | cht05 | select groupé par ville (optgroup en majuscules) | quartiers | `indexqtr = valeur` |

  Toujours : `offredemandeimb = ofrdmd`. (Filtres ville, surface min/max, pièces, situation, prix max existent en code commenté.)
- **Tri** : prix croissant. **Pagination** : §1.2.
- **Bandeau** : « NB. Pour consulter une fiche d'une {Offre|Demande}, Veuillez cliquer sur sa photo » (⚠ dit « Demande » alors que l'onglet dit « Recherche »).
- **Ligne** : photo 100×100 (lien) ; « {Type} en {Location|Vente|indifférent} » ; « {Ville} : {Quartier} » ; Surface « n m² », Pièces, Chambres, Prix « x FCFA » ; description complète ; pour G : « Nombre visite » et « Date visite ».
- **Lien de la photo** : vers le formulaire d'édition si **Ma auteur** ou G ; sinon vers le détail.
  - ⚠ Incohérence : un M (typembr 3) auteur de la fiche est envoyé vers le détail, pas vers l'édition (alors que pour les articles tout auteur connecté édite). À harmoniser : auteur ou G.

### 2.3 Écran S3-A2 : Fiche détail immobilier + Besoin / Intéressement

- **URL** : `choix3.php?iimb={id}&opt=3&insc=0&imbart=1&ofrdmd=1|2`.
- **Accès** : tous. Non-G : fiche affichée seulement si état 2 (sinon fiche vide). G : tout état.
- **Compteur de visites** : `nbvisiteimb+1` et `datevisiteimb=maintenant` **à chaque affichage, pour tout le monde (G compris), même si la fiche n'est pas affichable**. ⚠ Colonne `tinyint` signée : plafonne à 127 (constaté dans le dump).
- **Champs affichés** : photo (vignette agrandie au survol), Référence, Type, Besoin (transaction), Surface « m² » + « Nbe de pièce » + « Nbr de chambre », Prix, Situation, Ville-Quartier, Description. Non affichés : localisation, offre/demande, auteur.
- Lien « Retour liste immobiliers ? ».
- **Formulaire Besoin / Intéressement** (visible pour Ma et M, **pas G ni V**, et seulement si `ofrdmd≠0`) :

| Libellé affiché | Champ | Contrôle | Obligatoire | Règle | Message d'erreur exact |
|---|---|---|---|---|---|
| « Présentation de besoin » (sous-onglet Offre) / « Intéressement » (sous-onglet Recherche) | chp30 | textarea 2×60 | oui | ≥ 5 caractères | « Présentation de besoin doit avoir 5 caractères minimum. » / « Intéressement doit avoir 5 caractères minimum. » |
| (bouton) Enregistrer | Save | submit (titre « Enregistrer vôtre besoin ») | | Anti-doublon : même membre + même bien + même jour | « Opération déjà effectuée. » |

- **Effet** : INSERT `besoin` (typebsn=3, indexmbr=connecté, indeximb, datebsn=maintenant, besoinbsn=texte, interesebsn=ofrdmd, etatbsn=2). Message « Votre Présentation de besoin est pris en compte » / « Votre Intéressement est pris en compte ».
- **Liste sous le formulaire** (Ma/M) : tous les besoins du bien ayant `interesebsn=ofrdmd`, triés par date : « jj-mm-aaaa hh:mm:ss  texte » (sans nom d'auteur). ⚠ Chaque membre voit les messages des autres membres : à arbitrer (confidentialité).

### 2.4 Écran S3-A3 : Formulaire immobilier (création / modification)

- **URL** : création `choix3.php?insc=2&opt=1&imbart=1&ofrdmd=1|2` ; édition `?iimb={id}&opt=2&insc=2&imbart=1&ofrdmd=…`.
- **Accès voulu** : création C ; édition auteur ou G (cf. §2.2). ⚠ Aucun contrôle serveur.
- Liens « Retour liste immobiliers ? » (haut et bas).

| Libellé affiché | Champ | Contrôle | Options | Obligatoire | Règle | Message d'erreur exact |
|---|---|---|---|---|---|---|
| Référence: | chp16 | texte lecture seule (édition seulement) | — | auto | `IMB+mm+n+aa` à la création | — |
| Auteur: | chp01 | select figé (seul l'auteur en option) | — | auto | = connecté à la création | — |
| Transaction: | chp02 | select | indifférent(0), Location, Vente | oui | ≠ 0 | « Veuillez indiquer. la transaction. » |
| Type de bien: | chp03 | select | 0..9 | oui | ≠ 0 | « Veuillez indiquer le type de l'immobilier. » |
| Quartier: | chp04 | select groupé par ville, option vide | quartiers | **non contrôlé** | — | — (⚠ un bien sans quartier disparaît des listes, jointure) |
| Localisation: | chp05 | texte 125 (aide « 63 * rue primera * poto-poto ») | — | non | — | — |
| Surface: | chp06 | select | 0..2000 m² | oui | ≠ 0 | « Veuillez indiquer la surface. » (⚠ stockée en tinyint → tronquée à 127) |
| Nombre de pièces: | chp07 | select | 0..100 | non | — | — |
| Nombre de chambres: | chp08 | select | 0..100 | non | — | — |
| Situation: | chp09 | select | vide, Disponible, Occupé | oui | ≠ 0 | « Veuillez indiquer la situation du l'article. » |
| Prix: | chp15 | texte numérique 9 | — | non | — | — |
| Description: | chp10 | textarea 3×60 | — | non (mais clé d'unicité) | unicité description (création) | « Cette fiche existe déjà. » |
| Etat fiche: | chp11 | select (G+Act en édition seulement) | Non traité, Autorisé, Supprimé | — | défaut 2 | — |
| Date inscription: / Date et nombre visite: | chp12 / chp13 / chp14 | lecture seule (édition) | — | — | — | — |
| Photo: | monfichier | fichier | — | non | §1.3 | « Image trop grande. Veuillez la réduire ou changer. » |
| (caché) Offre/Recherche | chp17 | = sous-onglet courant | — | oui | ≠ 0 | « Veuillez indiquer Vente ou Recherche immobilier. » |

- Boutons « Enregistrer » et « Annuler » (reset). En édition, vignette de la photo actuelle.
- **Effets création** : référence (compteur global +1), INSERT `immobilier` avec **état 2 = publié immédiatement**, date d'inscription = maintenant, photo `imb{id}.jpg`. Message « Enregistrement effectué. ».
- **Effets modification** : UPDATE de tous les champs sauf auteur/référence/dates ; pas de contrôle d'unicité. Message « Modification effectuée. ».
- **En édition (auteur ou G)** : liste des besoins/intéressements reçus pour ce bien (`interesebsn=ofrdmd`) : date + texte.
- **Suppression** : uniquement via Etat fiche = Supprimé (G+Act).

### 2.5 Écran S3-B1 : Liste des autres articles (Offre / Recherche)

- **Fichier / URL** : `incl-choix3B.php` — `choix3.php?insc=0&opt=0&imbart=2&ofrdmd=1|2`.
- **Accès** : V, C ; non-G : état 2 seulement ; G : tous états + « {n} Articles ».
- **Icône panier** (C, sous-onglet Offre uniquement) : caddie + quantité totale des lignes panier « article » non payées (M/Ma : les siennes ; **G : celles de tous les membres**) → lien `opt=5`.
- **Filtre** :

| Libellé | Champ | Contrôle | Règle |
|---|---|---|---|
| Famille article | cht01 | select familles | `indexfam = valeur` |
| Etat article | cht02 | select Neuf/Occasion | `neufocasart = valeur` |
| Prix minimum | cht03 | texte numérique | `prixart >= valeur` |
| Le mot à recherche | cht04 | texte 40 | `descriptart LIKE %mot% OR libeleart LIKE %mot%` (⚠ OR sans parenthèses) |

- **Tri** : famille puis prix croissant.
- **Affichage** : grille 3 colonnes ; photo 160×180, libellé, prix « x FCFA » (vert). Bandeau « NB. Pour consulter une fiche d'une {Offre|Demande}, Veuillez cliquer sur sa photo ».
- **Lien photo** : édition si auteur connecté ou G ; sinon détail.

### 2.6 Écran S3-B2 : Fiche article + Ajout au panier (Offre) / Intéressement (Recherche)

- **URL** : `choix3.php?iart={id}&imbart=2&opt=3&insc=0&ofrdmd=1|2`.
- **Accès** : tous. ⚠ Aucun filtre d'état : un article supprimé reste consultable par URL.
- **Compteur de visites** incrémenté à chaque affichage (`nbvisiteart+1`, `datevisiteart`).
- **Champs** : photo, Référence, Famille, Article (libellé), Etat (Neuf/Occasion), Prix, Description. Lien « Retour liste des articles ? ».
- **Sous-onglet Offre, Ma/M** : « Quantité a prendre: » select 0..stock (`quantiteart`) + bouton « OK » (titre « Cliquez pour mettre la quantité dans le panier »). Si quantité > 0 : INSERT `panier` (typepnr=2, membre, date, article, quantité, **prix figé = prix courant**, etatpnr=2), puis retour à la liste (aucun message).
- **Sous-onglet Recherche, Ma/M** : textarea « Intéressement » + « Enregistrer » ; règle ≥ 5 caractères (« Intéressement doit avoir 5 caractères minimum. ») ; anti-doublon **même membre + même article, quelle que soit la date** (« Opération déjà effectuée. ») ; INSERT `besoin` (typebsn=3, indexart, interesebsn=2, etat 2) ; message « Votre Intéressement est pris en compte ». Liste des intéressements de l'article (date + texte) sous le formulaire.
- G : ni panier ni intéressement.

### 2.7 Écran S3-B3 : Formulaire article (création / modification)

- **URL** : `choix3.php?insc=2&opt=1&imbart=2&ofrdmd=…` ; édition `?iart={id}&imbart=2&opt=2&insc=2&ofrdmd=…`.
- **Accès voulu** : création C ; édition auteur ou G.

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Auteur: | chp01 | select figé | — | auto | connecté | — |
| Famille: | chp02 | select `familart` **sans option vide** | familles | oui | ≠ 0 (jamais déclenché, 1re famille présélectionnée) | « Veuillez indiquer. la famille de l'article. » |
| Référence: | chp03 | lecture seule (édition) | — | auto | `ACL+mm+n+aa` | — |
| Libellé: | chp04 | texte 50 | — | oui | ≥ 5 caractères | « Le libellé de l'article doit avoir 5 caractères minimun. » |
| Etat article: | chp08 | select | vide, Neuf, Occasion | oui | ≠ 0 | « Veuillez indiquer article neuf ou occasion. » |
| Prix: | chp05 | texte numérique 9 | — | non | — | — |
| Quantité: | chp06 | texte numérique 9 | — | non | — | — (⚠ colonne tinyint : max 127) |
| Description: | chp07 | textarea 3×57 | — | non | unicité (voir bug) | « Cet article est déjà enregistré. » |
| Etat fiche: | chp10 | select G+Act en édition | 1..3 | — | défaut 2 | — |
| Date inscription / Date et nombre visite | chp09 / chp11 / chp12 | lecture seule (édition) | | | | |
| Image de l'article: | monfichier | fichier | | non | §1.3 | « Image trop grande. Veuillez la réduire ou changer. » |
| (caché) offre/recherche | chp13 | = sous-onglet | | oui | ≠ 0 | « Veuillez indiquer Vente ou Recherche article. » |

- **Effets** : création → référence, INSERT `article` état 2 (publié), photo `art{id}.jpg`, « Enregistrement effectué. » ; modification → UPDATE (famille, libellé, prix, quantité, description, neuf/occasion, état, offre/demande), « Modification effectuée. ».
- ⚠ Bug unicité : la requête compare `libeleart` au **prix** (chp05) → le contrôle d'unicité ne se déclenche jamais. Règle voulue : libellé + description.
- ⚠ Bug date : la date d'inscription est convertie au format `jj-mm-aaaa` avant insertion dans un DATETIME → stockée `0000-00-00 00:00:00` (15/15 articles du dump). Stocker la vraie date.

### 2.8 Écran S3-B4 : Panier articles + paiement

- **URL** : `choix3.php?insc=0&opt=5&imbart=2&ofrdmd=1` ; suppression `&ipnr={id}&dlt=1` ; mode de paiement `&mdpay=1|2|3`.
- **Accès** : M/Ma (leurs lignes non payées) ; G (lignes non payées de **tous** les membres, colonne « Payé »).
- **Colonnes** : Date, Article, Prix (figé), Quantité « demandée / stock » (stock en rouge), Montant (prix×qté), [G : Payé], icône suppression « Annulation ». Ligne de total : quantité totale, montant total.
- **Suppression d'une ligne** : DELETE physique `panier` (⚠ sans contrôle de propriétaire).
- **Paiement** (M/Ma, total > 0, pas de mode déjà choisi) : 3 icônes Cash / Charden Farell / Mobile Money → formulaire de paiement §4.2 (typepnr=2, montant = total, en lecture seule).
- Contrôle de stock : si une quantité dépasse le stock, message « Certaines quantités des articles dans le panier sont supérieures aux quantités en stock » — ⚠ **affiché seulement quand un mode est déjà choisi (ou pour G), et ne bloque pas le paiement** (contrairement aux produits). Règle cible recommandée : bloquer comme pour les produits.
- ⚠ Colonne « Payé » (G) toujours vide (index 0 d'une énumération 1..3).
- Lien « Retour liste des articles ? » (haut et bas). Effets du paiement : §4.3.

### 2.9 Écran S3-C1 : Liste des courses

- **Fichier / URL** : `incl-choix3C.php` — `choix3.php?insc=0&opt=0&imbart=3`.
- **Accès** : G : toutes les courses ; M/Ma : **uniquement leurs propres courses** ; V : formulaire de tri visible mais liste toujours vide (requête invalide faute d'identifiant).
- **Filtre** :

| Libellé (placeholder) | Champ | Contrôle | Règle |
|---|---|---|---|
| Date Cmde Min / Date Cmde Max | cht01 / cht01A | date (sélecteur) | appliqué seulement si les deux sont saisis : date commande entre min 00:00:00 et max 59:59 (⚠ `cht01A` limité à 9 caractères → date tronquée, filtre cassé) |
| Date Achat Min / Max | cht02 / cht02A | date | date d'achat entre min et max (les deux requis) |
| Date Livr Min / Max | cht03 / cht03A | date | ⚠ `substr(…,0,10)` en SQL renvoie vide → filtre livraison ne trouve jamais rien |
| Etat course | cht04 | select | En attente, Supprimée, Effectuée (pas « Livrée ») | 
| Affichage (G seulement) | cht05 | select | Synthèse (défaut) / Général |

- **Tri** : référence décroissante puis date de commande décroissante.
- Bandeau : G « {n} Courses » ; si résultats : « {n} NB. Pour consulter une course, Veuillez cliquer sur la référence ».
- **Mode Synthèse** (une carte par course) : Auteur ; « Référence course » (lien vers le formulaire) ; Date commande, Date Achat, Date Livraison ; Montant « FCFA » ; Mode païement ; Etat course ; pour G : état de la fiche.
- **Mode Général** (G) : une ligne par article commandé : date d'achat (affichée au changement), date de livraison, « référence - état course » (au changement, lien), article, prix plafond, quantité, montant.

### 2.10 Écran S3-C2 : Formulaire de course (commande, fichier actif `incl-course-1.php`)

- **URL** : création `choix3.php?insc=2&opt=1&imbart=3&ofrdmd=0` (icône « Nouveau » pour C) ; édition `?icrs1={id}&opt=2&insc=2&imbart=3&ofrdmd=1`.
- **Accès voulu** : création C ; édition auteur ou G (⚠ aucun contrôle).
- **Bloc « CONDITIONS DES COURSES »** : texte libre `parametre.conditioncoursepmt` (retours à la ligne conservés).
- **Déroulement** : seul le champ « Boutique » est visible tant qu'aucune boutique n'est choisie ; le choix soumet le formulaire et affiche le reste.

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Auteur: | chp01 | select figé | | auto | connecté | — |
| Référence: / Date: | chp02 / chp03 | lecture seule (édition) | | auto | `CRS+mm+n+aa` ; date = horodatage AAAAMMJJhhmmss | — |
| Boutique: | chp14 | select (soumission au changement), option vide | membres `banqboutqmbr=2` | oui (sinon formulaire masqué) | — | — |
| Lieu d'achat: | chp04 | textarea 3×60 | | oui | ≥ 10 caractères | « Veuillez indiquer le lieu des achats avec 10 caractères minimum. » |
| Date course: | chp05 | date `jj-mm-aaaa` | | oui | non vide | « Veuillez indiquer la date des achats. » |
| | | | | | ≥ aujourd'hui (⚠ en pratique **aujourd'hui est refusé**, comparaison avec minuit < maintenant) | « La date des courses ne peut être antérieure à la date du jour. » |
| Date et heure livraison: | chp06 + chp061 + chp062 | date + select heure + select minute | 10H..18H ; 0M..59M | oui | non vide | « Veuillez indiquer la date de livraison ainsi que l'heure. » |
| | | | | | ≥ aujourd'hui (même défaut) | « La date de livraison ne peut être antérieure à la date du jour » |
| | | | | | livraison ≥ date course | « La date de livraison ne peut être antérieure à la date des courses » |
| Lieu de livraison: | chp07 | textarea (aide « Adresse et numéro de téléphone de livraison ») | | oui | ≥ 10 caractères | « Veuillez indiquer le numéro de téléphone et le lieu de livraison. » |
| Montant des courses: | chp08 | lecture seule, calculé serveur | | — | = Σ prix × quantité des lignes valides ; ≠ 0 | « Veuillez indiquer le montant des achats. » |
| | | | | | ≥ `parametre.montantcoursepmt` | « Le montant des courses ne doit pas être inférieur à {montant} FCFA » |
| Frais de course: | chp08A | lecture seule | | — | = `parametre.commissioncoursepmt` | — |
| Net à payer: | chp08B | lecture seule | | — | montant + frais | — |
| Moyen de païement: | chp09 | select | vide, Cash, Charden Farell, Mobile Money | oui | ≠ 0 | « Veuillez indiquer le mode de païement. » |
| Etat païement: | chp10 | select | G : Oui/Non ; autre (édition) : valeur courante seule | — | défaut 0 (ni oui ni non) | — |
| Observation: | chp11 | textarea | | non | — | — |
| Etat course: | chp12 | select (édition) | G : En attente, Supprimée, Effectuée, Livrée ; auteur : si « En attente » → En attente / Supprimée, sinon valeur figée | — | défaut 1 | — |
| Etat fiche: | chp13 | select (G) | 1..3 | — | défaut 2 | — |
| **Grille articles** (25 lignes en création ; en édition = nombre de lignes existantes) : Article | chp22{n} | texte 120 | | ligne facultative | ligne valide si libellé ≥ 3 car., prix ≥ 1, qté ≥ 1 ; ligne partiellement remplie → affichée en rouge (**non bloquant**) | — |
| Prix | chp23{n} | numérique (aide « Prix maxi à ne pas dépasser ») | | | | |
| Quantité | chp24{n} | numérique | | | | |
| Montant | — | lecture seule prix×qté | | | | |
| Observation | chp25{n} | texte 120 | | | | |

- **Validation en 2 temps** : boutons affichés seulement si état course = « En attente » ET (G, ou date de course future, ou date vide). M/Ma : bouton vert « Verification » (recalcule montant/frais/net et valide) ; si OK, apparaît le bouton rouge « Enregistrer ». G : « Enregistrer » directement, sans vérification.
- **Effets création** : anti-doublon même horodatage de commande (à la seconde) + même lieu d'achat → « Cette course est déjà faite. » ; référence ; INSERT `course1` (boutique, lieu, date achat AAAAMMJJ, date/heure livraison, lieu livraison, montant, **frais figés**, mode, état paiement 0, observation, état course 1, fiche 2) ; INSERT `course2` pour chaque ligne dont le libellé fait **≥ 5** caractères ; message « Vôtre course est bien enregistrée » ; formulaire vidé (boutique conservée).
- **Effets modification** : UPDATE `course1` (lieu, dates, lieu livraison, montant recalculé, mode, état paiement, observation, état course, état fiche, boutique) ; **les lignes `course2` ne sont pas mises à jour** (⚠ seules les modifications du montant passent, les lignes restent anciennes) ; aucun message. Si l'état paiement passe de « Non » à « Oui », affichage des icônes de paiement (§2.11).
- Liens « Retour liste course ? » et, en édition, « Nouvelle course ? ».
- ⚠ Bugs à ne pas reproduire : minute non complétée à 2 chiffres → date de livraison sur 13 caractères (constaté dans le dump) ; lignes de 3-4 caractères comptées dans le montant mais non enregistrées ; aujourd'hui refusé ; lignes non modifiables/ajoutables en édition ; pour l'auteur, les deux options « En attente »/« Supprimée » sont marquées sélectionnées (le navigateur retient probablement « Supprimée » → annulation involontaire ; comportement ambigu) ; dates stockées en chaînes (`varchar`).

### 2.11 Écran S3-C3 : Paiement d'une course

- **URL** : `choix3.php?insc=2&opt=3&icrs1={id}&imbart=3&ofrmdm=0&mdpay=1|2|3`.
- Déclenché seulement quand un G modifie l'« Etat païement » de « Non » (2) à « Oui » (1) ; comme une course est créée avec 0, ce chemin est quasi inaccessible (ambigu : intention probable « le client paie après validation »).
- Icônes Cash / Charden / Mobile Money → formulaire §4.2 avec montant = **montant des courses sans les frais** (⚠ différent du « Net à payer » affiché) ; typepnr=4.
- Effet (§4.3) : INSERT `payement` typepnr 4 + message « Payement effectué. » ; ⚠ `course1.etatpayecrs1` / `modepayecrs1` non mis à jour.

### 2.12 Machine à états « Course »

- `etatcoursecrs1` : création → 1 En attente. Auteur : 1 → 2 Supprimée (annulation). G : 1..4 libres (Effectuée, Livrée). Boutons d'enregistrement masqués dès que l'état ≠ En attente (fiche figée, y compris pour G).
- `etatpayecrs1` : 0 à la création ; seul G le change (Oui/Non).
- `etatcrs1` (fiche) : 2 à la création ; G 1..3. Visiteurs : seules les fiches état 2 (mais ils ne voient rien, cf. §2.9).

### 2.13 Variante morte : `incl-course.php` (mode catalogue, via `choix3-3.php` orphelin)

Pour mémoire (spécification alternative non en production) : la grille affiche **les articles du catalogue de la boutique choisie** (`articlecourse`), nom et prix en lecture seule, l'utilisateur saisit seulement quantité et observation ; « Lieu d'achat » non exigé mais « Veuillez indiquer la boutique. » ; validations seulement à l'enregistrement ; `course2.indexartcse` renseigné ; la boutique n'est pas modifiable en édition. En production `course2.indexartcse` vaut toujours 0.

### 2.14 Écran S3-D1/D2 : Catalogue boutique « Vos Articles » (`particlecourse.php`)

- **URL** : liste `particlecourse.php?opt=0` ; création `?opt=1` ; édition `?iartcse={id}&opt=2`.
- **Accès** : lien pour G et Mb. Liste : G voit tous les articles ; autres : seulement ceux de leur boutique. ⚠ Page sans contrôle d'accès ; icône « Nouveau » affichée à tous.
- ⚠ La page se déclare `$choix=4` (le lien d'aide renvoie vers la section 4).
- **Liste** : filtre « Boutique » (cht01, select boutiques), « Disponibilité » (cht02 Oui/Non — ⚠ colonne mal orthographiée dans la requête → erreur SQL, liste vide), « Prix minimum » / « Prix maximum » (cht03/cht03A, appliqués seulement si les deux… ⚠ si seul le min est saisi, `BETWEEN min AND ''` → rien), « Le mot à recherche » (cht04, sur code/nom/description/marque, ⚠ OR sans parenthèses). Tri par nom. Compteur « {n} Articles » pour tous. Bandeau « NB. Pour consulter une fiche d'un article, Veuillez cliquer sur son nom ». Colonnes : Boutique, Nom Article (lien édition), Prix, Marque, Dispo. (« Oui »/« Non »). Pas de filtre d'état (articles supprimés visibles).
- **Formulaire** :

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Boutique: | chp01 | select figé (connecté en création) | boutiques | oui | ≠ 0 (⚠ un G ne peut donc pas créer : il n'est pas boutique) | « Veuillez indiquer. la boutique. » |
| Code: | chp02 | texte 15 | | non | — | — |
| Nom: | chp03 | texte 125 | | oui | ≥ 4 caractères (message dit 3) | « Le nom de l'article doit avoir 3 caractères minimun. » |
| Marque: | chp04 | texte 30 | | non | — | — |
| Prix: | chp05 | numérique 9 | | oui | ≠ 0 | « Veuillez indiquer le prix de vente. » |
| Disponibilité: | chp06 | select | vide (défaut), Oui, Non | non | — | — |
| Description: | chp07 | textarea | | non | unicité boutique + nom + description (création) | « Cet article est déjà enregistré. » |
| Etat fiche: | chp08 | select | 1..3 (défaut 2) | — | affiché **en création pour tous**, en édition seulement G+Act | — |
| Image de l'article: | monfichier | fichier | | non | §1.3, `artcse{id}.jpg` | « Image trop grande. Veuillez la réduire ou changer. » |

- Effets : INSERT/UPDATE `articlecourse`, messages génériques. Pas de référence automatique. Liens « Retour liste articles ? ».
- Utilité actuelle : ce catalogue n'est **utilisé par aucune commande active** (le mode catalogue est mort) ; table vide dans le dump.

---

## 3. Section 4 — Appels de fonds

### 3.1 Écran S4-0 : Page de section

- **URL** : `choix4.php?insc=0&opt=0&pjlk=1|2|3[&epso=1|2][&apfd=0|1]`.
- Onglets FINANCEMENT PARTICIPATIF (compteur), LIKELEMBA (compteur), EPARGNE SOLIDAIRE ; sous-onglets « Don - Placement » / « Carte de pointage » pour pjlk=3 (visibles de tous).
- **Icône « Nouveau »** (hors formulaire, hors liste des apports) :
  - pjlk=1 : C → `?insc=2&opt=1&pjlk=1` (appel de fonds).
  - pjlk=2 : **G seulement** → `?insc=2&opt=1&pjlk=2&epso=0` (groupe likelemba).
  - pjlk=3, epso=1 : C → `?insc=2&opt=1&pjlk=3&epso=1` (don/placement).
  - pjlk=3, epso=2 : Mm-PC ou G → `?insc=2&opt=1&pjlk=3&epso=2` (pointage).
- **Épargne solidaire** : pour V, message « Veillez-vous connecter pour y avoir accès. » ; pour C sans sous-onglet : rien.
- Colonne droite « LES PUBLICITES » (§1.4) sur les écrans liste.

### 3.2 Écran S4-A1 : Liste des projets (financement participatif)

- **Fichier / URL** : `incl-choix4A.php` — `choix4.php?insc=0&opt=0&pjlk=1`.
- **Accès** : tous. Visibles : **tous les projets d'état ≠ 3** (Non traité, Autorisé, Clôturé), y compris pour V. ⚠ Incohérent avec le compteur d'onglet (état 2 seulement) : règle cible probable « V/M : état 2 ; auteur : les siens ; G : tous ».
- **Filtre** :

| Libellé | Champ | Contrôle | Règle |
|---|---|---|---|
| Secteur d'activité | cht01 | select secteurs | `indexsat = valeur` |
| Devis Minimum | cht02 | numérique | `devisprojetadf >= valeur` |
| Besoin Minimum | cht03 | numérique | `besoinfondadf >= valeur` |
| Réalisation | cht04 | select 0%..100% | `niveaurealisatadf >= valeur` (0 = pas de filtre) |
| Mots à rechercher | cht05 | texte 15 | `descriptprojetadf LIKE %mots%` (description du projet uniquement) |

- **Tri** : référence décroissante (tri alphabétique de chaîne ⚠, ex. mois/compteur mélangés).
- En-tête : G « {n} Projets » ; C : lien « Liste apport de fond ? » (aussi en bas « Liste apport de fond »).
- **Carte projet** : « Référence: » (lien vers la fiche pour **tout C** ; texte simple pour V) ; « Nom projet: » (40 car.) ; « Objet projet: » (40 car.) ; tableau DEVIS PROJET / APPORT FOND / BESOIN FOND / REALISATION (%) / FOND PROMIS / FOND COLLECTE ; pour auteur ou G : « Promoteur: » + libellé d'état ; pour C non auteur : lien « Interessement » (titre « Cliquez pour investir ») ; pour G non auteur : lien rouge « Suppression ».
- **Suppression** : `choix4.php?iadf={id}&opt=4&insc=0&pjlk=1&dlt=1` → `etatadf=3` immédiat, **sans confirmation**, puis liste.
- ⚠ Un mode tableau (Référence, Nom projet, Devis, Apport, Besoin, Promoteur, Etat) existe en code mais est désactivé (`$pst=2` forcé).

### 3.3 Écran S4-A2 : Fiche / formulaire appel de fonds

- **URL** : création `choix4.php?insc=2&opt=1&pjlk=1` ; fiche `?iadf={id}&opt=2&insc=2&pjlk=1`.
- **Accès** : création C ; consultation tout C (lecture seule si ni auteur ni G : champs `readonly`, listes réduites à la valeur courante, pas de bouton) ; modification auteur ou G. ⚠ Aucun contrôle serveur ; ⚠ le compteur de visites `nbvisiteadf` n'est **jamais incrémenté** (toujours 0).
- Liens « Retour Liste projets ? » (haut) / « Retour Liste projet ? » (bas).

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Référence: | chp02 | lecture seule (fiche) | | auto | `ALF+mm+n+aa` | — |
| Auteur: | chp01 | select figé | | auto | connecté | — |
| Entreprise: | chp03 | select `entreprise` avec option vide | | non | — | — |
| Nom projet: | chp04 | texte 50 | | oui | ≥ 11 caractères ; unicité (création) | « Le nom du projet doit avoir plus de 10 caractères. » ; « Ce projet est déjà enregistré. » |
| Objet projet: | chp05 | texte 125 | | oui | ≥ 11 | « Veuillez indiquer l'objet du projet avec 11 caractères minimum. » |
| Secteur activité: | chp06 | select secteurs + vide | | oui | ≠ 0 | « Veuillez indiquer le secteur d'activité du projet. » |
| Description activité: | chp07 | textarea | | oui | ≥ 31 | « Veuillez de décrire l'activité avec plus de 30 caractères. » |
| Description projet: | chp08 | textarea | | oui | ≥ 31 | « Veuillez de décrire le projet avec plus de 30 caractères. » |
| Devis projet: | chp09 | numérique 12 | | oui | > 10 000 | « Veuillez mentionner le montant du projet. » |
| Apport de fond: | chp10 | numérique 12 | | non | devis ≥ apport | (voir ligne suivante) |
| Besoin de fond: | chp11 | numérique 12 | | oui | > 10 000 | « Veuillez mentionner le montant du besoin . » |
| | | | | | devis ≥ apport et devis ≥ besoin (testé seulement si ville renseignée) | « Le montant du projet ne peut être inférieur à l'apport ou au besoin de fond . » |
| | | | | | besoin ≤ devis − apport | « Le montant du besoin de fond ne peut être superieur au la différence entre le montant du projet et l'apport de fond. » |
| Réalisation: | chp12 | select | 0%..100% | non | — | — |
| Fond promis: / Fond collecté: / Reste a collecté: | chp24 / chp25 / chp26 | lecture seule (fiche) | | calculés | reste = besoin − collecté | — |
| Nom promoteur: | chp13 | texte 35 | | oui | ≥ 6 | « Le nom du promoteur du projet doit avoir plus de 5 caractères. » |
| Phone: | chp14 | numérique 9 | | non (vide accepté) | 9 chiffres commençant par 01/04/05/06/22 | « Veuillez vérifier le numéro de téléphone du promoeteur du projet » |
| Mail: | chp15 | texte 30 | | non | — | — |
| Adresse: | chp16 | texte 125 (aide « Adresse complète. (Ex: 59 rue Bétou - Moungali - Brazzaville) ») | | non | — | — |
| Ville: | chp23 | select villes + vide | | oui | ≠ 0 | « Veuillez indiquer la ville du projet. » |
| Etat fiche: | chp17 | select G+Act (fiche) | 1..3 | — | défaut 2 | — |
| Observations sur projet: | chp21 | textarea ; éditable G, lecture seule autres (fiche) | | non | — | — |
| Appréciation: | chp22 | select 0/10..10/10 ; G éditable, autres figé | | non | — | — |
| Date inscription: / Date et nombre visite: | chp18 / chp19 / chp20 | lecture seule (fiche) | | | | |
| Fichier projet: | monfichier | fichier (aide « format PDF ») ; auteur ou G | | non | §1.3 → `adf{id}.pdf` | « Image trop grande. Veuillez la réduire ou changer. » |

- Bloc promoteur (nom, téléphone, mail, adresse) visible seulement en création, pour l'auteur ou G ; masqué (champs cachés) pour les autres.
- **Effets création** : référence, INSERT `appelfond` **état 2 (publié immédiatement)**, promis = collecté = 0, fichier PDF ; « Enregistrement effectué. ». Modification : UPDATE (y compris observation/appréciation/état) ; « Modification effectuée. ».
- ⚠ À ne pas reproduire :
  - Le contrôle du téléphone **réinitialise l'indicateur d'erreur** : si le téléphone est valide (ou vide), les erreurs des règles « nom, objet, secteur, descriptions, devis, besoin, promoteur » sont ignorées et l'enregistrement passe. Toutes les règles doivent être bloquantes.
  - À la création, mail et adresse du promoteur sont inversés en base (constaté dans le dump : adresse contenant « @ »). La modification les écrit correctement.
  - En fiche, la vignette affichée est `ent{id}.jpg` (image d'entreprise de même numéro) au lieu du document du projet.

### 3.4 Écran S4-A3 : Intéressement (« Formulaire: Apport de fond »)

- **URL** : `choix4.php?iadf={id}&opt=4&insc=0&pjlk=1` (lien « Interessement »).
- **Accès voulu** : C non auteur du projet. Lien « Retour liste projet ».

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Besoin de fond: | chp06A | lecture seule | | — | = besoin du projet | — |
| Type apport: | chp05 | select | vide, Don, Crédit, Actionnariat | oui | ≠ 0 | « Veuillez indiquer. le type de l'apport de fond. » |
| Montant prévu: | chp06 | numérique 9 | | oui | > 0 | « Veuillez indiquer le montant de l'apport. » |
| | | | | | ≤ besoin de fond du projet (pas le reste à financer) | « Le montant de l'apport ne peut être supérieur au besoin de fond. » |
| Echéance: | chp07 | select | 0 Mois..12 Mois | non | — | — |
| Remarque: | chp08 | textarea | | non | — | — |
| (bouton) Enregistrer interessement | Save1 | submit | | | anti-doublon projet + membre + même jour + même montant | « Cette fiche est déjà enregistrée. » |

- **Effets** : référence `ATF+mm+n+aa` ; INSERT `collectefond` (date du jour, type, montant prévu, échéance, remarque, **état 1**) ; **immédiatement `appelfond.promisfondadf += montant`** (le « FOND PROMIS » augmente dès la déclaration, sans validation) ; retour à la liste des projets. ⚠ Le message « Enregistrement effectué. » n'est pas affiché (formulaire masqué après succès).

### 3.5 Écran S4-A4 : « Liste apport de fond »

- **URL** : `choix4.php?opt=0&insc=0&pjlk=1&apfd=1` (lien pour C ; ⚠ URL accessible à V).
- Contenu : **toutes** les promesses `collectefond` à l'état 1 (tous membres, sans nom), triées par référence décroissante. Colonnes : APPORT FOND (réf. projet), COLLECTE FOND (réf. apport), TYPE, DATE, MONTANT PREVU, ECHEANCE, MONTANT VERSE, DATE VERSE. Aucune action. G : « {n} Projets » (⚠ libellé faux). Lien « Liste des projets ? ».
- ⚠ Colonne TYPE lue dans l'énumération Don/Placement au lieu de Don/Crédit/Actionnariat (Actionnariat affiché vide).

### 3.6 Workflow collectefond — état réel vs code mort

- **Actif en production** : création état 1 + incrément immédiat de « promis ». **Aucun écran actif** ne permet de valider (1→2), annuler (→3), saisir un versement, ni alimenter `mouvcollectefond` / `colectefondadf`. Dump : 8 promesses toutes en état 1, 0 mouvement, « FOND COLLECTE » = 0 partout, « promis » = somme des promesses.
- **Spécification de référence (code mort `incl-paportfond.php` / `paportfond.php`)**, utile si le métier veut réactiver le suivi :
  - Liste des apports : G avec filtre « Membre » (cht01) et « Texte » (cht02, sur la remarque) ; membre : ses apports seulement. Colonnes Appel Fond, Apport Fond (lien fiche pour G), Date, [G : Créancier], Montant prévu (lien « Indiquer le montant versé » pour le créancier → choix du mode de paiement, typepnr=8, montant libre), Montant versé, Etat (1re lettre). Bandeau G « NB. Pour confirmer le montant versé, Veuillez cliquer sur la référence de l'apport de fond. », membre « NB. Pour indiquer le montant versé, Veuillez cliquer sur le montant prévue. ». Membre : historique des versements (Date, Montant, Etat).
  - Fiche apport (G ou créancier) : Référence appel, Projet, Demandeur, tableau Devis / Fond propre / Besoin / Promis / Collecté, Référence apport, Créancier, Type apport (figé), Prévu (modifiable), Échéance (figée), Déjà Versé, Date apport, Date (dernier versement), « A versé » (montant du versement), Observation créancier (éditable par le créancier), Observation médiateur (éditable par G), Etat fiche 1..3.
  - Règles : 1→2 promis += prévu ; 2→3 promis −= prévu ; versement > 0 : cumul versé, date, INSERT `mouvcollectefond` (état 2), collecté += versement ; modification du prévu : promis ajusté de la différence. Messages (version `paportfond.php`) : « Le versement est superieur au montant promis. », « Ce versement est déjà éffectué. ». Paiement typepnr=8 : « Opération effectuée et mis en attente de vérification. ».
  - ⚠ Défauts de ce code mort : 1→2 recompte le promis déjà ajouté à la création (double comptage) ; un versement peut incrémenter « collecté » deux fois ; l'état n'est pas enregistré si un versement est saisi en même temps ; annulation tardive ne décrémente pas le collecté ; tout utilisateur voyant la fiche peut changer l'état.

### 3.7 Écran S4-B1 : Liste des likelembas (tontines)

- **Fichier / URL** : `incl-choix4B.php` — `choix4.php?insc=0&opt=0&pjlk=2`.
- **Accès** : tous ; groupes à l'état 2 uniquement (G compris). G : « {n} likelembas ».
- **Filtre** : « Montant minimum » (cht01) / « Montant manimum » [sic] (cht01A) : `montantlkb1 BETWEEN min AND max`, appliqué si le min est saisi (⚠ max vide → erreur SQL, liste vide).
- **Tri** : date de début croissante.
- **Carte** : « Code: » (lien vers le formulaire pour le chef ou G) ; « Nom Chef: » ; tableau MONTANT / DATE DEBUT / PERIODICITE / NOMBRE MEMBRE (= compteur d'entrées `nbentrelkb1`, pas le nombre réel d'adhérents actifs) ; observation (texte multi-lignes).
- Liens (C) : « Membres de likelemba ? » (opt=5) ; si le compteur d'entrées ≠ 0 : « Les payements de likelemba ? » (opt=7) et, si le connecté est adhérent du groupe, « Vôtre payement ? » (opt=6).

### 3.8 Écran S4-B2 : Formulaire groupe likelemba

- **URL** : création `choix4.php?insc=2&opt=1&pjlk=2&epso=0` (G) ; édition `?ilkb1={id}&opt=2&insc=2&pjlk=2` (chef ou G).

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Code: | chp01 | lecture seule | | auto | `LKB+mm+n+aa` (compteur global) | — |
| Responsable: (rouge) | chp02 | select tous membres + vide | | oui | ≠ 0 | « Veuillez indiquer. le chef du likelemba. » |
| Montant: (rouge) | chp03 | numérique 9 | | oui | > 0 | « Le montant de participation ne peut être 0. » |
| Date début: | chp04 | date (défaut « 00-00-0000 ») | | **non contrôlée** | — | — |
| Périodicité: | chp08 | select | vide, Semaine, Quinzaine, Mensuel | oui | ≠ 0 | « Veuillez indiquer la périodicité du likelemba. » |
| Observation: | chp05 | textarea | | non | **unicité de l'observation** (création) — ⚠ deux groupes sans observation impossibles | « Ce likelemba est déjà enregistré. » |
| Participant: | chp06 | lecture seule | | — | compteur d'entrées | — |
| Etat fiche: | chp07 | select visible par quiconque ouvre le formulaire (chef inclus) | 1..3 | — | défaut 2 | — |

- Boutons « Enregistrer » / « Annuler ». Lien « Retour liste des likelembas ? ». ⚠ Aucun message de succès.
- Effets : INSERT `likelemba1` (compteurs 0) / UPDATE (chef, montant, date, observation, état, périodicité).

### 3.9 Écran S4-B3 : Membres d'un likelemba

- **URL** : `choix4.php?ilkb1={id}&opt=5&insc=0&pjlk=2`.
- **Accès** : lien pour C (⚠ URL ouverte à V).
- En-tête « LIKELEMBA N°: {code} » (lien vers le formulaire du groupe pour G).
- Tableau (adhésions d'état ≠ 3, par nom) : Membre (lien vers la fiche d'adhésion opt=42 pour G ou soi-même), Code (code d'adhérent `{n}{code groupe}`), Date (entrée), Ordre (n = rang d'entrée extrait du code) ; pour G : si adhésion état 2, icône « Payement cotisation de likelemba » (→ opt=6 pour ce membre), sinon lien « Attente » (« Confirmation membre dans likelemba » → opt=42).
- Lien « Nouveau membre de likelemba ? » : G toujours ; C s'il n'est pas déjà adhérent. Liens « Retour liste des likelembas ? ».

### 3.10 Écran S4-B4 : Adhésion d'un membre à un likelemba (« Formulaire: Enregistrement membre de likelemba »)

- **URL** : nouvelle adhésion `choix4.php?ilkb1={id}&opt=4&insc=0&pjlk=2&nvmbr=0|1` ; fiche `?ilkb1=&ilkb2=&opt=42&insc=0&pjlk=2&imbrlkb2=`.
- **Accès** : nouvelle adhésion = **le connecté s'inscrit lui-même** (la liste « Membre » ne contient que lui, y compris pour G ⚠ : un G ne peut pas inscrire un autre membre) ; fiche = G ou l'adhérent.

| Libellé | Champ | Contrôle | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|
| Code: | chp02 | lecture seule (fiche) | auto | `{rang}{code groupe}`, rang = compteur d'entrées + 1 (généré à l'inscription) | — |
| Date entrée: | chp04 | date (fiche seulement ; en création = aujourd'hui, caché) | oui | ≠ « 00-00-0000 » | « Veuillez indiquer la date d'entrée du membre. » |
| Membre: | chp03 / chp03A | select figé (création) / texte lecture seule (fiche) | oui | ≠ 0 ; anti-doublon groupe + membre | « Veuillez indiquer le nouveau membre. » ; « Ce membre est déjà enregistré dans likelemba. » |
| Personne caution: | chp08 | texte 50 | non | — | — |
| Membre Frangine ?: | chp09 | case à cocher | non | cochée = 2, sinon 1 | — |
| Pièce d'identité: | chp10 | texte 30 | non | — | — |
| Adresse: | chp11 | texte 120 | non | — | — |
| Téléphone: | chp12 | numérique 20 | non | — | — |
| Activité: | chp13 | texte 120 | non | — | — |
| Témoins — NOM - PRENOM (×3) | chp14..16 | texte 50 | non | — | — |
| Témoins — TELEPHONE (×3) | chp17..19 | numérique 20 | non | — | — |
| Témoins — EMPLOI (×3) | chp20..22 | texte 80 | non | — | — |
| Témoins — MBR (×3) | chp23..25 | cases à cocher (2 = membre) | non | — | — |
| Observation: | chp05 | textarea | non | — | — |
| Etat fiche: | chp06 | ⚠ **jamais affiché** (condition inatteignable) → toujours 2 | — | — | — |

- Bouton « Enregistrer ». Photo de l'adhérent (lien vers sa fiche membre) pour G ou soi. Lien « Retour liste membres de likelemba ».
- **Effets création** : code + `nbentrelkb1 += 1` ; INSERT `likelemba2` **état 2 (actif immédiatement)** ; « Enregistrement effectué. » puis liste des membres. **Modification** : UPDATE (code généré s'il manquait et G), « Modification effectuée. ».
- Sous le formulaire : liste de tous les adhérents (tous états) : Membre, Code, Date, Ordre, Etat (lien de modification pour G).
- ⚠ À ne pas reproduire : date d'entrée écrite au mauvais format → `0000-00-00` en base (2/2 dans le dump) ; G ne peut pas changer l'état (« Attente » inopérant) ; code d'adhérent `varchar(10)` risquant la troncature.

### 3.11 Écran S4-B5 : Paiement de cotisation + historique de l'adhérent

- **URL** : `choix4.php?ilkb1=&ilkb2=&opt=6&insc=0&pjlk=2&imbrlkb2=[&mdpay=1|2|3]` (« Vôtre payement ? » pour l'adhérent ; icône pour G dans la liste des membres).
- Affichage : « LES PAYEMENTS ANTERIEURS DU MEMBRE » (pour l'adhésion `ilkb2`) : Reçu, Date, Montant, Observation (100 car.), ligne de total ; lien « Retour liste des likelembas ? ». Puis icônes Cash / Charden / Mobile Money → formulaire §4.2 (typepnr=5, montant = cotisation, lecture seule).
- **Effets** (§4.3, typepnr 5) : INSERT `payement` (état 2) + INSERT `likelemba3` (caissier = payeur, date du jour, montant, observation = remarque, **état 1**, mode) + numéro de reçu `{code groupe}P{n}` (compteur `nbpayelkb1 += 1`) ; ré-affichage de l'historique.
- ⚠ À ne pas reproduire :
  - Le montant et le groupe utilisés sont ceux du **premier likelemba du connecté**, pas celui choisi → erreur si membre de plusieurs groupes ; si G paie pour un membre (icône), la requête porte sur G → montant vide (saisie libre) et cotisation non enregistrée (paiement orphelin).
  - Le test « générer le reçu » compare un identifiant de membre à un identifiant d'adhésion → reçu quasi toujours généré.
  - Reçu tronqué à 10 caractères (`varchar(10)`) → tous les reçus identiques « LKB…P » (constaté dans le dump). Prévoir une colonne assez large.
  - Après paiement, le formulaire de paiement reste affiché (risque de double saisie).

### 3.12 Écran S4-B6 : Historique des paiements du likelemba + activation de reçu

- **URL** : `choix4.php?ilkb1={id}&opt=7&insc=0&pjlk=2` ; activation `?opt=62&insc=0&pjlk=2&ilkb3=&ilkb2=&ilkb1=&imbrlkb2=`.
- Accès : C (lien) — tous voient les paiements de tous les adhérents avec leur nom.
- Colonnes : Reçu (si vide et G : lien « Activation ? » titre « Activation payement »), Date, Membre, Montant, Observation (100 car.) ; total ; tri date décroissante.
- Activation (G) : génère le numéro de reçu `{code}P{n}` (compteur +1) sur la ligne, puis affiche l'historique de l'adhérent. ⚠ Aucun contrôle serveur du rôle.
- Le formulaire de saisie manuelle d'un paiement (date, mode, code Charden validé par `codecharden()`, état) est **mort** (commenté) ; ses messages « Veuillez indiquer la date de payement du likelemba. », « Veuillez indiquer le mode de payement du likelemba. », « Ce code de Charden Farell est incorrect », « Le payement de ce membre est déjà enregistré. » sont indicatifs seulement.

### 3.13 Machine à états Likelemba

- Groupe (`etatlkb1`) : création 2 (visible) ; chef/G : 1/2/3 ; seuls les groupes état 2 sont listés.
- Adhésion (`etatlkb2`) : création 2 ; aucune transition possible en pratique ; « Attente » affiché si ≠ 2 ; état 3 exclu de la liste des membres (visible dans la liste sous le formulaire).
- Cotisation (`likelemba3.etatlkb3`) : 1 à la création, jamais modifié ; reçu : vide → numéro (création ou « Activation ») ; le paiement associé (`payement`) suit §4.6 indépendamment.
- Compteurs : `nbentrelkb1` +1 à chaque adhésion (jamais décrémenté ; `tinyint` max 127), `nbpayelkb1` +1 à chaque reçu.

### 3.14 Écran S4-C1 : Liste « Don - Placement »

- **Fichier / URL** : `incl-choix4C1.php` — `choix4.php?insc=0&opt=0&pjlk=3&epso=1` (C seulement).
- **Portée** : G : toutes les fiches ; autres : **seulement les fiches qu'ils ont créées** (pas celles où ils sont rapporteur/souscripteur).
- **Filtre (M/Ma seulement, masqué pour G)** : « Date minimum » (cht01, `datefds >=`), « Type » (cht02 Don/Placement), « Montant minimum » (cht03), « Confirme » (cht04 Oui/Non sur `confirmefds`), « Mots à rechercher » (cht05, sur la motivation).
- **Tri** : date décroissante. G : « {n} Projets » (⚠ libellé). Bandeau « NB. Pour consulter une fiche de souscription, Veuillez cliquer sur sa référence ».
- **Colonnes** : Date, Référence (lien si auteur, G ou Ma), D/P (1re lettre), Montant, O/N (confirmation, 1re lettre), Rapporteur, Souscripteur, Etat (1re lettre). Rapporteur/souscripteur = nom du membre si identifiant ≠ 1, sinon le nom saisi librement.

### 3.15 Écran S4-C2 : Formulaire Don / Placement + paiement

- **URL** : création `choix4.php?insc=2&opt=1&pjlk=3&epso=1` ; fiche `?ifds={id}&opt=2&insc=2&pjlk=3&epso=1`.
- **Accès** : création C ; fiche auteur/G/Ma. Liens « Retour Liste Don - Placement ? ».
- Le formulaire n'affiche que « Type soutien » tant qu'il n'est pas choisi (changement = soumission).

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Auteur: | chp01 | select figé | | auto | connecté | — |
| Référence: / Date: | chp02 / chp03 | lecture seule (fiche) | | auto | `FDS+mm+n+aa` ; date du jour | — |
| Type soutien: | chp04 | select (soumission au changement) | vide, Don, Placement | oui | ≠ 0 | « Veuillez indiquer le type de l'épargne: Don ou placement. » |
| Rapporteur: (Placement seulement) | chp05 + chp05A | select membres (option vide de **valeur 5** ⚠) + texte « Rapporteur non listé » | | oui (placement) | si rapporteur = « aucun » (1) et textes rapporteur et souscripteur ≤ 2 car. | « Veuillez indiquer le nom du rapporteur. » (⚠ jamais déclenché à cause de la valeur 5) |
| Souscripteur: | chp06 + chp06A | select membres (option vide = 1 « aucun ») + texte « Souscripteur non listé » | | oui (don) | Don : si aucun membre choisi, nom libre ≥ 3 car. | « Veuillez indiquer le nom du soucripteur. » |
| Motivation: | chp07 | textarea 3×82 | | non | anti-doublon même jour + même motivation + même montant | « Cette épargne est déjà enregistré. » |
| Montant: | chp08 | numérique 12 (lecture seule si ni auteur ni G) | | oui | Don ≥ 100 | « Le montant ne doit pas être inférieur à 100 francs CFA. » |
| | | | | | Placement ≥ `parametre.fondplacementpmt` — ⚠ **jamais contrôlé** (test hors de la boucle) | (« Le montant ne doit pas être inférieur à {min} francs CFA. ») |
| Durée de placement: (Placement) | chp09 | select | 12 mois..120 mois | — | Don : 0 | — |
| mode paiement: / Confirmation: / Etat fiche: | chp10 / chp11 / chp12 | lecture seule / lecture seule / select 1..3 — affichés pour G, ou en fiche si confirmé | | — | défauts 0 / 2 (Non) / 2 | — |

- **Boutons** : création → « Enregistrer » / « Annuler » (auteur ou G). Fiche non payée (montant ≥ 100, mode 0) → « Enregistrer » pour G uniquement + icônes de paiement Cash / Charden / Mobile Money.
- **Effets création** : référence ; INSERT `fonddesoutien` (date, type, rapporteur id + nom, souscripteur id + nom, motivation, montant, durée, mode 0, confirmé 2, état 2) ; ouverture de la fiche ; « Enregistrement effectué. ». Si le souscripteur est choisi dans la liste, son nom est recopié ; si le rapporteur est choisi, c'est son **identifiant** qui est recopié dans le champ nom (⚠).
- **Email** : un message « Souscription Placement » (« M {rapporteur} à souscris un placement sous le numéro {réf} En votre nom, d'un montant de {montant} francs CFA pour une durée de {n} mois. Veuillez-vous connecter pour le paiement. Cordialement. ») est préparé pour le souscripteur d'un placement mais **jamais envoyé** (aucun appel `mail()`). Décision métier requise.
- **Modification (G)** : UPDATE motivation, montant, durée, état. ⚠ Un champ caché homonyme remplace le montant par le code du mode de paiement → Don : blocage « Le montant ne doit pas être inférieur à 100 francs CFA. » ; Placement : **montant remis à 0**. À ne pas reproduire.
- **Paiement** : ⚠ les liens de paiement omettent `epso` → la page de paiement est vide ; **aucun don/placement n'a jamais pu être payé** (dump : mode 0 et confirmation « Non » partout). Comportement voulu (d'après `incl-enregpaye`) : formulaire §4.2, typepnr=7, montant = montant de la fiche ; à l'enregistrement `modepayefds = mode`, `confirmefds = 1` (Oui) dès la déclaration.

### 3.16 Écran S4-C3 : Liste « Carte de pointage »

- **Fichier / URL** : `incl-choix4C2.php` — `choix4.php?insc=0&opt=0&pjlk=3&epso=2` (C).
- **Portée** : G : toutes les opérations ; Mm-PC : opérations **qu'il a saisies en tant que caisse** ; autres : opérations dont il est **titulaire**.
- **Filtre** :

| Libellé | Champ | Contrôle | Règle |
|---|---|---|---|
| Date min / Date max | cht01 / cht01A | dates | appliqué si les deux sont saisis (⚠ jour max exclu après minuit) |
| Caisse | cht02 | select (ne contient que soi si agent ; vide sinon) | `indexcaissepcs` ; forcé à soi pour un agent |
| membre | cht03 | select tous membres | titulaire |
| Opération | cht04 | Versement / Retrait | |
| Montant min / Montant max | cht05 / cht05A | numériques (les deux requis) | BETWEEN |
| Choix (G) | cht06 | Opération (1) / Encaisse (2) | `typecaissepcs` ; ⚠ pour non-G forcé à 1 dès qu'on soumet le filtre |

- **Tri** : date/heure décroissante. G : « {n} Opérations ».
- **Colonnes** : Date, Caisse (nom de l'opérateur), Membre (titulaire), Versement, Retrait (rouge), Solde (solde du titulaire après opération ; colonne visible si un membre est filtré ou pour G).
- **Pieds** : « TOTAL DES OPERATIONS » (Σ versements, Σ retraits, net si colonne solde) ; « RENTABILITE » = **3 % du total des versements** ; « ENCAISSE » = solde courant de la caisse filtrée (agent : lui-même ; sinon ⚠ le premier agent trouvé) — visible si membre filtré, G ou agent.

### 3.17 Écran S4-C4 : Formulaire de pointage (versement / retrait)

- **URL** : `choix4.php?insc=2&opt=1&pjlk=3&epso=2` (icône pour Mm-PC et G ; ⚠ URL non protégée).
- Bandeau jaune : Date (lecture seule), Agence (nom de l'opérateur connecté, lecture seule), Opération (select vide / Versement / Retrait, soumission au changement).
- Lien « Retour Liste pointages ? ».

| Libellé | Champ | Contrôle | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|
| Opération | chp03 | select | oui | ≠ 0 | « Veuillez indiquer le type de l'opération. » |
| Membre | chp04 | select (soumission au changement) : G → agents (morale + pointcaisse=1) ; autres → tous les membres sauf soi ; + recherche texte chp04A + bouton « OK » (filtre par nom) | oui | ≠ 0 | « Veuillez indiquer le type le membre. » |
| Solde: / Date dernière opération: | chp04B / chp04C | affichés + cachés | — | solde courant du titulaire | — |
| Montant: | chp05 | numérique | oui | > 0 | « Veuillez indiquer le montant. » |
| | | | | Retrait : refusé si montant ≥ 97 % du solde (`solde × 0,97 <= montant`) | « Impossible de faire un retrait, Le solde est inférieur au montant demandé. » |
| Motif: | chp06 | textarea 1 ligne | non | — | — |
| Code de pointage: | chp09 | mot de passe, 4 chiffres | oui | non vide | « Veuillez indiquer le code de pointage. » |
| | | | | = code PIN **du titulaire** (`membre.codepointagembr`) | « Le code de pointage est incorrect. » |
| (bouton) Valider / Annuler | Save | | | anti-doublon même jour + même opération + même titulaire + même montant | « Ce pointage est déjà enregistré. » |

- Photo du titulaire affichée dès qu'il est choisi.
- **Effets** (si tout est valide) : référence `PCS+mm+n+aa` (⚠ générée avant le contrôle du PIN : compteur consommé même en cas d'échec) ; INSERT `pointcaisse` (date/heure, caisse = opérateur, opération, titulaire, montant, motif, saisie immédiate = 1, solde après, référence, type = 1 si opérateur non-G « Opération », 2 si G « Encaisse ») ; `membre.soldepointcaissembr` du titulaire ± montant et date de dernière opération ; **effet miroir** : le solde de l'opérateur varie **du même montant et du même signe** (versement client → encaisse de l'agent augmente) — appliqué pour tout opérateur connecté, G compris ; message « Pointage éffectué » ; formulaire remis à zéro.
- ⚠ La règle des 97 % utilise le solde renvoyé par le navigateur (champ caché) : la recalculer côté serveur. Pas de contrôle de solde négatif pour l'opérateur.

### 3.18 Machines à états Épargne

- `fonddesoutien` : création confirmé = 2 (Non), mode = 0, état 2 → (paiement déclaré) confirmé = 1, mode = 1..3 → état G 1..3. Aucune étape de confirmation par G du paiement (`ppayement` confirme seulement la ligne `payement`).
- `pointcaisse` : journal en ajout seul (pas de modification ni suppression) ; solde courant porté par `membre`.

### 3.19 Fichiers morts S4 (ne pas porter, sauf décision)

`choix4-2.php`, `incl-choix4B-1.php`, `incl-choix4C.php` (liste FDS sans `epso` + restes de carte projet), `incl-paportfond.php`, `paportfond.php` (voir §3.6), bloc de saisie de `incl-payelikelemba.php`, branche `opt≥2` de `incl-pointcaisse.php` (copie de fondsoutien), branche `ajs=2` de `incl-apportfond.php`.

---

## 4. Paiement et panier transverses

### 4.1 Vue d'ensemble

```
[Panier (produit/article)] ou [objet à payer (course, cotisation, don/placement, apport)]
      → icônes Cash / Charden Farell / Mobile Money (&mdpay=1|2|3)
      → formulaire incl-formulairepaye (montant + remarque) → « Confirmer payement »
      → incl-enregpaye : INSERT payement (état 2 « non confirmé ») + effets immédiats selon typepnr
      → ppayement.php (menu G) : « Valider païement » → état 3 « confirmé » (aucun autre effet)
```

### 4.2 Formulaire de paiement (`incl-formulairepaye.php`)

- Affiché quand `mdpay` est dans l'URL. Icône du mode ; « Montant : » + « FCFA » (lecture seule si le montant calculé ≠ 0, saisissable s'il vaut 0) ; consigne :
  - Cash : « Vous pouvez saisir une remarque ou observation »
  - Charden Farell : « Veuillez indiquer le nom, téléphone, agence de l'expéditeur et le Code de Charden Farell »
  - Mobile Money : « Veuillez utiliser ces numéros téléphoniques ({téléphone 1} / {téléphone 2}) pour tous payements.et indiquer le votre. » (numéros issus de `parametre`)
- Champ remarque (chp05, texte 120) ; champs cachés : objet payé (chp00), payeur = connecté (chp01), date, mode (chp03), état = 2 (chp06). Bouton « Confirmer payement ».

| Règle | Message exact |
|---|---|
| Montant > 0 | « Le montant ne peut être zéro. » |
| Charden Farell : remarque ≥ 12 caractères | « Veuillez indiquer plus de 12 caractères minimum pour le code de Charden Farell. » |
| Mobile Money : remarque ≥ 9 caractères | « Veuillez indiquer plus de 9 caractères minimum pour le numéro de téléphone. » |
| Anti-doublon payeur + montant + remarque (toutes dates) | ⚠ aucun message (rien ne se passe) |

(`codecharden()` et `phone()` existent mais ne sont pas utilisés ici.)

### 4.3 Enregistrement (`incl-enregpaye.php`) — effets par type

| typepnr | Origine active | Effets immédiats (paiement encore « non confirmé ») | Message |
|---|---|---|---|
| 1 Produit | panier produits (`incl-venteproduit`, `incl-choix1C`) | Toutes les lignes panier produit non payées du payeur : stock produit −= quantité, ligne marquée payée (date, lien paiement) | aucun |
| 2 Article | panier articles S3 | idem sur `article.quantiteart` | aucun |
| 4 Course | S3-C3 | aucun | « Payement effectué. » |
| 5 Likelemba | S4-B5 | INSERT `likelemba3` + reçu (§3.11) | aucun |
| 6 Souscription | adhésion FLP (hors périmètre) | `souscriptoportuniteaffaire.etatsoa = 2` | aucun |
| 7 Fond soutien | S4-C2 (lien cassé) | `modepayefds`, `confirmefds = 1` | aucun |
| 8 Apport fond | code mort | aucun | « Opération effectuée et mis en attente de vérification. » |

- ⚠ Le stock est décrémenté à la **déclaration** du paiement (pas à la validation), sans vérifier le stock pour les articles, et toutes les lignes non payées sont soldées même si le montant saisi ne correspond pas.
- ⚠ Après un paiement produit/article le formulaire reste affiché avec un montant désormais nul donc **saisissable** : un deuxième paiement libre est possible.
- Le libellé du type 4 est vide dans l'énumération (écran de validation : colonne « Opération » vide, filtre impossible).

### 4.4 Panier produits (`incl-venteproduit.php`, mécanique seulement)

- Ajout multiple : pour chaque produit affiché, select quantité 0..999, bouton panier « Panier » (« Pour ajouter les produits sélectionnés, cliquez sur le panier ci-contre. ») → une ligne `panier` typepnr=1 par produit de quantité > 0, prix figé = **prix distributeur** (alors que la fiche détail produit affiche le prix public ⚠).
- Icône caddie + quantité non payée du membre ; écran panier (opt=5) : Date, Produit, Prix, Quantité « demandée / stock », Montant, suppression (DELETE physique) ; total.
- **Blocage de stock** : icônes de paiement affichées seulement si aucune quantité ne dépasse le stock ; sinon « Certaines quantités des produits dans le panier sont supérieures aux quantités en stock. Veuillez les supprimer dans le panier et prendre une nouvelle quantité en rapport avec le stock ».
- Paiement : §4.2/§4.3 typepnr=1.

### 4.5 Écran PAY-1 : Liste et validation des paiements (`ppayement.php`)

- **URL** : `ppayement.php?insc=0` (menu gestionnaire « Payement ») ; validation `ppayement.php?ipay={id}&opt=2`.
- **Accès voulu** : G (idéalement G+Caisse). ⚠ **Aucun contrôle** : ni rôle, ni droit Caisse ; page accessible à tous par URL.
- **Filtre** :

| Placeholder | Champ | Règle |
|---|---|---|
| Date | cht01 (date) | `datepay <= date` (⚠ exclut les paiements du jour même) |
| Montant | cht02 | `montantpay <= valeur` |
| Texte | cht03 | remarque contient |
| Membre | cht04 | payeur |
| Païement | cht05 | mode |
| Opération | cht06 | type (Produit, Article, Likelemba, Souscription, Fond soutient, Apport fond) |
| Etat | cht07 | Payement non confirmé / Payement confirmé |

- **Tri** : date décroissante. En-tête (G) : « {n} Païements pour un total de {Σ} FCFA » ; « NB. Pour valider un païement non confirmé (PNC), Veuillez cliquer sur son etat ».
- **Colonnes** : Date (aaaa-mm-jj hh:mm), Membre (lien vers la fiche membre), Mode, Montant, Observation (80 car.), Opération, Etat (N.P. / P.N.C. en lien vert / P.C.).
- **Validation** : formulaire lecture seule (Date, Membre, Mode païement, Opération, Montant, Observation) + « Valider païement » → état 3, « Modification effectuée. » ; « Annuler » → retour liste.

### 4.6 Machine à états `payement`

1 Non payé (jamais produit) → **2 Payement non confirmé** (création) → **3 Payement confirmé** (validation G). Aucun rejet, aucune annulation, aucun effet de bord à la validation (les effets ont eu lieu à la création). Dump : 6 paiements, tous en état 2.

---

## 5. Bugs et incohérences consolidés (à ne pas reproduire)

1. Absence totale de contrôle d'accès serveur (formulaires, suppressions, validation de paiement, activation de reçus).
2. Injection SQL, identifiants BDD en clair, champs cachés de confiance (auteur, payeur, solde).
3. Pagination : sélecteur de page inopérant, filtres perdus, filtre de session partagé.
4. Filtres `LIKE … OR …` sans parenthèses ; filtres cassés (livraison course, date max commande, disponibilité boutique, montant max vide).
5. Colonnes `tinyint` signées saturées à 127 (surface, visites immobilier, quantité article, compteurs likelemba, visites appel de fonds).
6. Dates écrites au mauvais format → `0000-00-00` (article, adhésion likelemba) ; dates en chaînes (course) ; minute non complétée.
7. Unicité article inopérante ; unicité likelemba sur l'observation.
8. Validations appel de fonds neutralisées par le contrôle du téléphone ; mail/adresse inversés à la création.
9. Promis appel de fonds incrémenté sans validation ; suivi des versements inexistant en production.
10. Paiement de cotisation rattaché au premier groupe du payeur ; reçus tronqués identiques.
11. Paiement don/placement impossible (lien sans `epso`) ; minimum de placement non contrôlé ; email jamais envoyé ; montant écrasé à la modification par G.
12. Règle 97 % calculée sur un solde fourni par le client ; référence de pointage consommée en cas d'échec.
13. Stock articles non bloquant ; décrément de stock avant validation ; formulaire de paiement ré-affiché après paiement.
14. Encarts S3 montrant des articles dans l'onglet Courses ; tri « Nouveautés » articles inopérant.
15. Libellés fautifs (« Immboliers », « Veillez-vous », « manimum », « promoeteur », « trie »…) : conserver le sens, corriger l'orthographe.

---

## 6. Corrections à apporter aux dictionnaires de données

### 6.1 `data-dictionary-finance.md`

| § | Affirmation du dictionnaire | Réalité constatée dans le code / le dump |
|---|---|---|
| §0 | Le droit « Caisse » autorise la confirmation des paiements | Jamais testé : `ppayement.php` n'a **aucun** contrôle (ni rôle ni droit). Seul le droit « Activation » (pos. 2) est testé, et uniquement pour **afficher** la liste « Etat fiche ». |
| §0 | Préfixes de référence | Ajouter pour ce périmètre : `imb`, `acl` (article), `crs` (course), `lkb`. Toutes les références (y compris `LKB`) utilisent le compteur global `numreferencepmt` ; `numlikelembapmt` n'est plus utilisé. |
| §1 | Pointcaisse « réservé aux membres Morale avec pointcaissembr=1 » | Saisie : Mm-PC **ou gestionnaire** ; consultation : tout connecté (ses opérations comme titulaire). |
| §1 règle 1 | PIN vérifié | C'est le PIN **du titulaire** (client) qui est exigé, pour les versements comme pour les retraits ; l'opérateur n'en saisit pas. |
| §1 règle 4 | Refus si `montant > solde×0,97` | Refus si `montant >= solde×0,97` (égalité refusée), sur un solde transmis par le navigateur. La liste affiche aussi une « RENTABILITE » = 3 % des versements. |
| §1 règle 6 | Miroir « si l'opérateur n'est pas un gestionnaire anonyme » | La condition (`$gtre!=0`) est toujours vraie pour un connecté : miroir **systématique**, G compris, même signe que l'opération. |
| §1 `typecaissepcs` | 1=self-service membre, 2=opéré par gestionnaire | 1 = opération saisie par un agent (non-G, libellé filtre « Opération »), 2 = saisie par un G (« Encaisse »). |
| §4 | Validation par gestionnaire droit Caisse ; effets 5/7/8 | Pas de droit testé. typepnr **4 = Course** existe (libellé vide). Effet 5 : utilise le premier likelemba du payeur, reçu quasi toujours généré et tronqué. Effet 7 : jamais atteint en production (lien de paiement cassé ; dump : aucun don/placement payé). Effet 8 : seulement depuis du code mort. Anti-doublon silencieux. |
| §5 | Règles de validation appel de fonds | Existent mais sont **neutralisées** quand le téléphone est valide ou vide (réinitialisation de l'indicateur d'erreur). |
| §5 | `datevisiteadf/nbvisiteadf` = visite terrain gestionnaire | Jamais alimentés (toujours 0) ; simple compteur de consultation prévu, non implémenté. |
| §5 | `promisfondadf` alimenté par collectefond | Plus précisément : incrémenté **à la création d'un intéressement (état 1)** par `incl-apportfond.php`, sans validation. Dump : promis = somme des promesses en état 1. |
| §5 | Upload PDF | `adf{id}.pdf` ; la fiche affiche à tort `ent{id}.jpg`. Visibilité : état ≠ 3 pour tous (visiteurs compris). |
| §6 | Machine à états 1→2 / 2→3 / versements « à reproduire à l'identique » | Ce workflow est dans du **code mort** (`incl-paportfond.php` inclus seulement par l'orphelin `choix4-2.php` ; `paportfond.php` orphelin). En production : création état 1 uniquement. Dump : 8 promesses toutes état 1, 0 `mouvcollectefond`, collecté = 0. Si réactivé tel quel : double comptage du promis (déjà ajouté à la création). `dateaportcdf` = date seule. |
| §7 | `mouvcollectefond` | Table vide, alimentée seulement par du code mort. |
| §8 | Placement : min = `fondplacementpmt` | Contrôle **jamais exécuté** (test `i==8` dans une boucle 1..7). Seul le minimum Don (100) est appliqué. |
| §8 | « Email auto au souscripteur » | Message préparé mais **jamais envoyé** (aucun `mail()`). |
| §8 | Rapporteur / souscripteur | Option vide du rapporteur = identifiant 5 (bug, visible dans le dump) ; `rapporteurfds` reçoit l'identifiant et non le nom quand un membre est choisi. |

### 6.2 `data-dictionary-commerce.md`

| § | Affirmation | Réalité |
|---|---|---|
| §1 `quantitepdt` | décrémentée à chaque paiement confirmé | Décrémentée à la **déclaration** du paiement (état 2), pas à la confirmation. |
| §2 `panier.typepnr` | `incl-course.php` fixe `typepnr=4` pour Course dans le panier | Aucune course ne passe par le panier. `typepnr=4` n'est utilisé que comme `payement.typepnrpay` (paiement de course). Dump : panier ne contient que 1 et 2. |
| §2 règle clé | Paiement bloqué si quantité > stock | Vrai pour les **produits** seulement. Pour les **articles** (S3) le paiement n'est pas bloqué et le message n'apparaît qu'après choix du mode. |
| §7 `surfaceimb` | tinyint max 255 | `tinyint(4)` **signé** : max 127 (valeurs saturées à 127 dans le dump). Idem `nbvisiteimb`. |
| §7 `nbvisiteimb/datevisiteimb` | non incrémentés | Incrémentés à chaque affichage du détail (`incl-choix3A.php`, opt=3), pour tous, y compris fiche non visible. |
| §7 | intéressement typebsn=3 | `interesebsn` = sous-onglet (1 Offre → « Présentation de besoin », 2 Recherche → « Intéressement ») ; anti-doublon membre + bien + jour ; fiche publiée à l'état 2 dès la création. |
| §12 | Deux flux concurrents à clarifier | **Actif : `incl-course-1.php` (texte libre)** via `choix3.php`. `incl-course.php` (catalogue) n'est atteint que par l'orphelin `choix3-3.php`. Dump : `course2.indexartcse` = 0. |
| §12 règles | Dates non antérieures à aujourd'hui | La date du jour est elle-même refusée. Minute non complétée (dump : `datelivraisoncrs1` sur 13 caractères). Validation 2 temps pour M/Ma seulement ; G enregistre directement. Lignes `course2` jamais mises à jour en modification. |
| §12 / §18 J | Paiement course (typepnr=4) | Chemin quasi inaccessible (déclenché seulement par un passage « Non »→« Oui » de l'état paiement par G) ; montant payé = montant sans frais ; `etatpayecrs1` jamais mis à jour par le paiement. |
| §13 `disponibleartcse` | défaut Oui | Défaut formulaire = vide (0) ; défaut base = 1. Filtre sur une colonne mal orthographiée (erreur SQL). Nom ≥ 4 caractères (message dit 3). |
| §14 article | unicité (libellé + description) | Contrôle **inopérant** (compare le libellé au prix). |
| §14 `nbvisiteart` | non incrémenté | Incrémenté à chaque affichage du détail (`incl-choix3B.php`, opt=3). |
| §14 `dateinscriptart` | date d'inscription | Toujours `0000-00-00 00:00:00` (conversion au format jj-mm-aaaa avant insertion) : 15/15 dans le dump. `quantiteart` tinyint (max 127). Intéressement seulement en « Recherche » ; en « Offre » c'est l'ajout au panier ; anti-doublon membre + article sans notion de date. |
| §16 `besoin.interesebsn` | sous-type variable | Pour S3 = sous-onglet Offre (1) / Recherche (2) ; `etatbsn` toujours 2. |

### 6.3 `data-dictionary-membres.md`

| § | Affirmation | Réalité |
|---|---|---|
| §8 `codelkb1` | préfixe LKB + séquence | Via `fonctreference('lkb')` et le compteur **global** `numreferencepmt`. Date de début non contrôlée. Unicité sur l'observation (deux groupes sans observation impossibles). Le chef peut changer l'état. |
| §9 `phonepersoncautlkb2` | « champ UI non trouvé » | **Faux** : champ « Téléphone: » (chp12) du bloc caution de `incl-membrelikelemba.php`. |
| §9 règles | Code généré seulement si `chp07==1` | `chp07` vaut toujours 1 → code généré à chaque adhésion (compteur d'entrées +1). `dateentrelkb2` toujours `0000-00-00` (bug de format, 2/2 dans le dump). État 2 à la création ; la liste « Etat fiche » n'est jamais affichée ; un G ne peut inscrire que lui-même. |
| §10 | Saisie des paiements « probablement » via le module caisse | **Confirmé** : saisie via `incl-formulairepaye.php` + `incl-enregpaye.php` (typepnr 5). `etatlkb3` toujours 1 ; `codechardenlkb3` jamais écrit par le code actif ; `codelkb3` tronqué à 10 caractères (dump : reçus identiques « LKB…P »). |

### 6.4 `data-dictionary-contenu.md`

- §19 « Variantes à clarifier » : `choix3-3.php` et `choix4-2.php` sont **orphelins** (aucun lien) → code mort. `choix3.php` / `choix4.php` sont les versions actives.
- §19 tableau : section 3 = `immobilier`, `article`/`familart`, `besoin`, `panier`, `course1`/`course2`, `articlecourse` (pas `produit`) ; section 4 inclut aussi `pointcaisse` et `payement`.

---

## 7. Checklist de recette

### Section 3 — E-commerce

1. F-S3-01 — La page E-commerce affiche 3 onglets Immobiliers / Autres articles / Courses ; l'onglet actif est mis en évidence.
2. F-S3-02 — L'onglet Immobiliers affiche entre parenthèses le nombre de biens publiés (état Autorisé, offres et recherches confondues).
3. F-S3-03 — L'onglet Autres articles affiche le nombre d'articles publiés ; l'onglet Courses n'a pas de compteur.
4. F-S3-04 — Les onglets Immobiliers et Autres articles proposent les sous-onglets « Offre » et « Recherche » ; aucune liste n'est affichée tant qu'aucun sous-onglet n'est choisi.
5. F-S3-05 — Un utilisateur connecté voit l'icône « Nouveau » (titre « Nouvelle {Offre|Recherche} {section} ») dans une liste immobilier/article avec sous-onglet et dans l'onglet Courses ; un visiteur ne la voit pas.
6. F-S3-06 — Visiteurs, membres et masters voient les encarts « NOUVEAUTES » (5 dernières fiches publiées) et « LES PLUS VISITES » (5 fiches publiées les plus consultées) ; le gestionnaire ne les voit pas et a une liste pleine largeur.
7. F-S3-07 — Chaque élément d'encart affiche photo + 50 premiers caractères de description et ouvre le détail.
8. F-S3-08 — L'onglet Courses n'affiche pas d'encarts d'articles (correction du bug legacy) — ou décision documentée.
9. F-S3-09 — Liste immobilier : un non-gestionnaire ne voit que les biens publiés du sous-onglet courant ; le gestionnaire voit tous les états et le compteur « {n} Immobiliers ».
10. F-S3-10 — Filtre immobilier par Besoin (Location/Vente), Type de bien, Chambres (égalité), Prix minimum et Quartier (groupé par ville) ; critères vides ignorés ; combinaison en ET.
11. F-S3-11 — Liste immobilier triée par prix croissant, paginée par 50 (choix 50 à 500) et le changement de page fonctionne en conservant les filtres.
12. F-S3-12 — Ligne immobilier : photo, « {Type} en {Transaction} », Ville : Quartier, Surface m², Pièces, Chambres, Prix FCFA, description ; le gestionnaire voit en plus nombre et date de visite.
13. F-S3-13 — Le clic sur la photo ouvre l'édition pour l'auteur ou le gestionnaire, le détail pour les autres.
14. F-S3-14 — Détail immobilier : Référence, Type, Besoin, Surface, pièces, chambres, Prix, Situation, Ville-Quartier, Description et photo agrandissable ; un bien non publié n'est pas affiché à un non-gestionnaire.
15. F-S3-15 — Chaque consultation du détail d'un bien incrémente son nombre de visites et met à jour la date de dernière visite (sans plafond à 127).
16. F-S3-16 — Depuis le sous-onglet Offre, un membre/master peut déposer une « Présentation de besoin » ; depuis Recherche, un « Intéressement » ; le gestionnaire et le visiteur n'ont pas ce formulaire.
17. F-S3-17 — Un besoin/intéressement de moins de 5 caractères est refusé : « {Présentation de besoin|Intéressement} doit avoir 5 caractères minimum. ».
18. F-S3-18 — Un second besoin du même membre sur le même bien le même jour est refusé : « Opération déjà effectuée. ».
19. F-S3-19 — Un besoin accepté est enregistré (type 3, sous-type = sous-onglet) et affiche « Votre {…} est pris en compte ».
20. F-S3-20 — Sous le formulaire, la liste datée des besoins du bien (même sous-type) est affichée (règle de confidentialité arbitrée).
21. F-S3-21 — Création immobilier : transaction, type, surface, situation et offre/recherche obligatoires avec les messages exacts (« Veuillez indiquer. la transaction. », « Veuillez indiquer le type de l'immobilier. », « Veuillez indiquer la surface. », « Veuillez indiquer la situation du l'article. », « Veuillez indiquer Vente ou Recherche immobilier. »).
22. F-S3-22 — Une description déjà existante est refusée : « Cette fiche existe déjà. ».
23. F-S3-23 — La surface accepte 1 à 2000 m² sans troncature ; pièces et chambres 0 à 100.
24. F-S3-24 — Un bien créé reçoit une référence IMB+mois+compteur+année, l'auteur = connecté, l'offre/recherche = sous-onglet et est publié immédiatement (état Autorisé) ; message « Enregistrement effectué. ».
25. F-S3-25 — Une photo facultative est enregistrée, redimensionnée si besoin ; un fichier trop grand donne « Image trop grande. Veuillez la réduire ou changer. » ; les formats non image sont refusés.
26. F-S3-26 — En modification, référence, dates et nombre de visites sont en lecture seule ; seul un gestionnaire avec droit Activation peut changer l'état (Non traité/Autorisé/Supprimé) ; message « Modification effectuée. ».
27. F-S3-27 — En modification, l'auteur ou le gestionnaire voit la liste des besoins/intéressements reçus pour le bien.
28. F-S3-28 — Seul l'auteur ou un gestionnaire peut modifier un bien (contrôle côté API).
29. F-S3-29 — Liste articles : grille de 3 par ligne (photo, libellé, prix FCFA), non-gestionnaire limité aux articles publiés du sous-onglet ; gestionnaire : tous états + « {n} Articles ».
30. F-S3-30 — Filtre articles par famille, neuf/occasion, prix minimum et mot (libellé OU description, correctement combiné avec les autres critères) ; tri famille puis prix.
31. F-S3-31 — Le clic sur un article ouvre l'édition pour son auteur ou le gestionnaire, le détail pour les autres.
32. F-S3-32 — Détail article : Référence, Famille, Article, Etat, Prix, Description, photo ; la consultation incrémente les visites.
33. F-S3-33 — Un article supprimé n'est pas consultable par un non-gestionnaire.
34. F-S3-34 — Sous-onglet Offre : un membre/master choisit « Quantité a prendre » (0 au stock) et « OK » ajoute une ligne au panier avec le prix courant figé ; quantité 0 n'ajoute rien.
35. F-S3-35 — Sous-onglet Recherche : un membre/master dépose un « Intéressement » (≥ 5 caractères) ; un second intéressement du même membre sur le même article est refusé « Opération déjà effectuée. ».
36. F-S3-36 — L'icône panier (sous-onglet Offre, connecté) affiche la quantité totale non payée du membre (tous membres pour le gestionnaire).
37. F-S3-37 — Création article : famille, neuf/occasion, libellé ≥ 5 caractères et offre/recherche obligatoires avec les messages exacts.
38. F-S3-38 — Un article de même libellé et même description est refusé : « Cet article est déjà enregistré. ».
39. F-S3-39 — Un article créé reçoit une référence ACL…, une date d'inscription réelle (non nulle), est publié immédiatement ; photo facultative.
40. F-S3-40 — La quantité d'un article accepte des valeurs supérieures à 127.
41. F-S3-41 — En modification d'article, seul un gestionnaire avec droit Activation change l'état ; l'auteur ou le gestionnaire voit les intéressements reçus.
42. F-S3-42 — Panier articles : colonnes Date, Article, Prix, Quantité « demandée / stock », Montant, suppression ; ligne de total quantité et montant.
43. F-S3-43 — Un membre ne peut supprimer que ses propres lignes de panier (suppression physique).
44. F-S3-44 — Le gestionnaire voit les lignes non payées de tous les membres mais ne peut pas payer.
45. F-S3-45 — Si une quantité du panier dépasse le stock, le paiement est bloqué avec le message de stock (règle alignée sur les produits, décision métier).
46. F-S3-46 — Le membre choisit Cash, Charden Farell ou Mobile Money puis confirme le paiement du montant total (lecture seule) ; les lignes sont marquées payées et le stock décrémenté.
47. F-S3-47 — Liste des courses : un membre ne voit que ses courses, le gestionnaire toutes, un visiteur aucune.
48. F-S3-48 — Filtre courses par intervalle de date de commande, d'achat, de livraison (chaque intervalle appliqué quand min et max sont saisis) et par état (En attente, Supprimée, Effectuée) ; tous les filtres fonctionnent.
49. F-S3-49 — Le gestionnaire choisit l'affichage Synthèse (une carte par course) ou Général (une ligne par article avec date d'achat/référence regroupées).
50. F-S3-50 — Carte course : Auteur, Référence (lien), dates commande/achat/livraison, Montant, Mode de paiement, Etat course (+ état de fiche pour le gestionnaire) ; tri référence puis date décroissantes.
51. F-S3-51 — Formulaire course : le bloc « CONDITIONS DES COURSES » affiche le texte paramétré.
52. F-S3-52 — Seul le choix de boutique (membres de type Boutique) est proposé tant qu'aucune boutique n'est sélectionnée ; la sélection fait apparaître le reste du formulaire.
53. F-S3-53 — Lieu d'achat ≥ 10 caractères : « Veuillez indiquer le lieu des achats avec 10 caractères minimum. ».
54. F-S3-54 — Date des courses et date/heure de livraison (10H-18H, minutes 0-59) obligatoires avec leurs messages exacts.
55. F-S3-55 — La date des courses et la date de livraison ne peuvent être antérieures à aujourd'hui (règle sur aujourd'hui tranchée par le métier) ; livraison ≥ date des courses (« La date de livraison ne peut être antérieure à la date des courses »).
56. F-S3-56 — Lieu de livraison ≥ 10 caractères : « Veuillez indiquer le numéro de téléphone et le lieu de livraison. ».
57. F-S3-57 — Grille de 25 lignes (Article, Prix maxi, Quantité, Montant calculé, Observation) ; une ligne partiellement remplie est signalée en rouge.
58. F-S3-58 — Le montant des courses est calculé côté serveur (Σ prix × quantité des lignes valides) ; nul → « Veuillez indiquer le montant des achats. » ; inférieur au minimum paramétré → « Le montant des courses ne doit pas être inférieur à {min} FCFA ».
59. F-S3-59 — Les frais de course (paramètre) et le Net à payer (montant + frais) sont affichés en lecture seule ; les frais sont figés sur la course.
60. F-S3-60 — Mode de paiement obligatoire : « Veuillez indiquer le mode de païement. ».
61. F-S3-61 — Un membre doit cliquer « Verification » avant que « Enregistrer » apparaisse ; le gestionnaire enregistre directement.
62. F-S3-62 — Une course enregistrée reçoit une référence CRS…, l'état « En attente », toutes ses lignes valides, et affiche « Vôtre course est bien enregistrée » ; un doublon (même instant, même lieu) est refusé « Cette course est déjà faite. ».
63. F-S3-63 — En modification, les lignes d'articles modifiées/ajoutées sont bien enregistrées (correction legacy).
64. F-S3-64 — L'auteur peut passer sa course de « En attente » à « Supprimée » sans que cet état soit présélectionné par défaut ; le gestionnaire peut choisir En attente/Supprimée/Effectuée/Livrée et l'état de fiche.
65. F-S3-65 — Une course qui n'est plus « En attente » n'est plus modifiable (boutons masqués).
66. F-S3-66 — Seul le gestionnaire modifie l'état de paiement (Oui/Non) d'une course ; le passage de « Non » à « Oui » propose le choix du mode de paiement.
67. F-S3-67 — Le paiement d'une course enregistre un paiement de type Course, affiche « Payement effectué. » et met à jour l'état de paiement de la course (règle du montant avec ou sans frais tranchée).
68. F-S3-68 — Les dates de course sont stockées en vrais types date/heure, minute sur 2 chiffres.
69. F-S3-69 — « Vos Articles » (catalogue boutique) est accessible depuis le pied de page aux boutiques et aux gestionnaires uniquement.
70. F-S3-70 — Liste catalogue : une boutique voit ses articles, le gestionnaire tous ; filtres boutique, disponibilité, prix min/max (un seul borne suffit), mot (code/nom/description/marque) ; tri par nom ; compteur « {n} Articles ».
71. F-S3-71 — Colonnes catalogue : Boutique, Nom Article (lien fiche), Prix, Marque, Dispo. (Oui/Non).
72. F-S3-72 — Formulaire catalogue : boutique obligatoire (« Veuillez indiquer. la boutique. »), nom ≥ 4 caractères (« Le nom de l'article doit avoir 3 caractères minimun. », libellé à harmoniser), prix obligatoire (« Veuillez indiquer le prix de vente. »).
73. F-S3-73 — Un article de catalogue de même boutique, nom et description est refusé « Cet article est déjà enregistré. ».
74. F-S3-74 — Code (15), marque (30), disponibilité (Oui/Non), description et image facultatifs ; l'état n'est modifiable que par un gestionnaire avec droit Activation.
75. F-S3-75 — (Décision) Le mode catalogue de commande de course (lignes = articles de la boutique, quantité seule saisie) est soit porté, soit explicitement abandonné.

### Section 4 — Appels de fonds

76. F-S4-01 — La page Appels de fonds affiche les onglets Financement participatif (compteur des projets publiés), Likelemba (compteur des groupes publiés) et Épargne solidaire.
77. F-S4-02 — L'onglet Épargne solidaire affiche les sous-onglets « Don - Placement » et « Carte de pointage » ; un visiteur reçoit « Veillez-vous connecter pour y avoir accès. » (orthographe corrigée).
78. F-S4-03 — Les écrans liste de la section affichent la colonne « LES PUBLICITES » (10 publicités actives au hasard).
79. F-S4-04 — L'icône « Nouveau » apparaît : projets pour tout connecté, likelemba pour le gestionnaire seulement, don/placement pour tout connecté, pointage pour les agents de caisse (membre moral avec point caisse) et le gestionnaire.
80. F-S4-05 — Liste des projets filtrable par secteur, devis minimum, besoin minimum, réalisation minimum (0-100 %) et mots dans la description du projet.
81. F-S4-06 — La visibilité des projets par rôle est conforme à la règle arbitrée (legacy : tous états sauf Supprimé, pour tous).
82. F-S4-07 — Carte projet : Référence, Nom projet, Objet projet, DEVIS PROJET, APPORT FOND, BESOIN FOND, REALISATION %, FOND PROMIS, FOND COLLECTE ; l'auteur et le gestionnaire voient aussi le promoteur et l'état.
83. F-S4-08 — La référence du projet est un lien vers la fiche pour tout connecté ; texte simple pour un visiteur.
84. F-S4-09 — Un connecté non auteur voit le lien « Interessement » ; un gestionnaire non auteur voit aussi « Suppression » qui passe le projet à l'état Supprimé (avec confirmation dans la nouvelle version).
85. F-S4-10 — Le gestionnaire voit « {n} Projets » ; tout connecté voit le lien « Liste apport de fond ».
86. F-S4-11 — Création de projet : nom ≥ 11 caractères, objet ≥ 11, secteur, descriptions activité et projet ≥ 31, devis > 10 000, besoin > 10 000, promoteur ≥ 6, ville obligatoires, **toutes bloquantes**, avec les messages exacts du legacy.
87. F-S4-12 — Le téléphone du promoteur est facultatif mais, s'il est saisi, doit faire 9 chiffres commençant par 01, 04, 05, 06 ou 22 (« Veuillez vérifier le numéro de téléphone du promoeteur du projet », orthographe corrigée).
88. F-S4-13 — Le devis doit être ≥ apport et ≥ besoin, et besoin ≤ devis − apport, avec les messages exacts.
89. F-S4-14 — Un nom de projet déjà existant est refusé : « Ce projet est déjà enregistré. ».
90. F-S4-15 — Un projet créé reçoit une référence ALF…, est publié immédiatement, promis et collecté à 0 ; mail et adresse du promoteur sont stockés dans les bons champs.
91. F-S4-16 — Un fichier de présentation (PDF) peut être joint par l'auteur ou le gestionnaire et est consultable depuis la fiche.
92. F-S4-17 — La fiche d'un projet est en lecture seule pour un connecté qui n'est ni l'auteur ni gestionnaire (aucun bouton, promoteur masqué).
93. F-S4-18 — La fiche affiche Fond promis, Fond collecté et Reste à collecter (= besoin − collecté) en lecture seule.
94. F-S4-19 — Le gestionnaire saisit « Observations sur projet » et « Appréciation » (0/10 à 10/10) ; les autres les voient en lecture seule ; seul un gestionnaire avec droit Activation change l'état.
95. F-S4-20 — (Décision) Le nombre de consultations d'un projet est incrémenté à chaque ouverture de fiche, ou le champ est retiré.
96. F-S4-21 — Formulaire Intéressement : Besoin de fond en lecture seule, Type apport (Don/Crédit/Actionnariat) obligatoire (« Veuillez indiquer. le type de l'apport de fond. »), montant > 0 (« Veuillez indiquer le montant de l'apport. »), montant ≤ besoin (« Le montant de l'apport ne peut être supérieur au besoin de fond. »), échéance 0-12 mois, remarque.
97. F-S4-22 — Un intéressement identique (même projet, membre, jour, montant) est refusé « Cette fiche est déjà enregistrée. ».
98. F-S4-23 — Un intéressement enregistré reçoit une référence ATF…, l'état Non traité, augmente le FOND PROMIS du projet (règle legacy, ou au moment de la validation selon décision) et un message de succès est affiché.
99. F-S4-24 — L'auteur d'un projet ne peut pas déclarer d'intéressement sur son propre projet.
100. F-S4-25 — « Liste apport de fond » affiche les intéressements non traités (APPORT FOND, COLLECTE FOND, TYPE en Don/Crédit/Actionnariat, DATE, MONTANT PREVU, ECHEANCE, MONTANT VERSE, DATE VERSE) aux seuls utilisateurs autorisés.
101. F-S4-26 — (Décision) Le suivi des apports (validation 1→2, annulation, saisie de versements, historique `mouvcollectefond`, FOND COLLECTE) est implémenté selon la spécification de référence du §3.6, sans double comptage, ou explicitement écarté.
102. F-S4-27 — Liste des likelembas : groupes publiés, filtre montant min/max (une seule borne suffit), tri par date de début.
103. F-S4-28 — Carte likelemba : Code (lien édition pour chef et gestionnaire), Nom Chef, MONTANT, DATE DEBUT, PERIODICITE, NOMBRE MEMBRE, observation ; le gestionnaire voit « {n} likelembas ».
104. F-S4-29 — Un connecté voit « Membres de likelemba ? », et si le groupe a des membres « Les payements de likelemba ? » ; un adhérent voit en plus « Vôtre payement ? ».
105. F-S4-30 — Création d'un groupe (gestionnaire) : responsable obligatoire (« Veuillez indiquer. le chef du likelemba. »), montant > 0 (« Le montant de participation ne peut être 0. »), périodicité obligatoire (« Veuillez indiquer la périodicité du likelemba. »), date de début, observation.
106. F-S4-31 — Un groupe reçoit un code LKB… et l'état Autorisé ; « Participant » affiche le nombre d'entrées en lecture seule ; la règle d'unicité (legacy : observation) est arbitrée.
107. F-S4-32 — Le chef ou le gestionnaire modifie responsable, montant, date, périodicité, observation et état d'un groupe ; un message de succès est affiché.
108. F-S4-33 — Liste des membres d'un groupe : en-tête « LIKELEMBA N°: {code} », colonnes Membre, Code, Date d'entrée, Ordre ; adhésions supprimées exclues.
109. F-S4-34 — Dans la liste des membres, le gestionnaire voit pour chaque adhérent actif l'icône de paiement de cotisation et « Attente » pour les adhésions non actives.
110. F-S4-35 — « Nouveau membre de likelemba ? » est proposé au gestionnaire et aux connectés non encore adhérents.
111. F-S4-36 — Un membre peut s'inscrire lui-même à un groupe ; un second enregistrement est refusé « Ce membre est déjà enregistré dans likelemba. » ; (décision) le gestionnaire peut inscrire un autre membre.
112. F-S4-37 — L'adhésion enregistre caution (nom, membre Frangine ?, pièce d'identité, adresse, téléphone, activité), 3 témoins (nom, téléphone, emploi, membre ?) et observation.
113. F-S4-38 — Chaque adhésion reçoit un code « {rang}{code groupe} » et incrémente le nombre d'entrées du groupe ; la date d'entrée est correctement stockée.
114. F-S4-39 — Le gestionnaire peut confirmer/modifier l'état d'une adhésion (« Attente » → Autorisé) ; l'adhérent peut modifier ses cautions/témoins.
115. F-S4-40 — « Vôtre payement ? » affiche « LES PAYEMENTS ANTERIEURS DU MEMBRE » (Reçu, Date, Montant, Observation, total) puis le choix du mode de paiement.
116. F-S4-41 — Le paiement d'une cotisation utilise le montant du groupe choisi (lecture seule) et crée un paiement « non confirmé » de type Likelemba et une cotisation rattachée à la bonne adhésion.
117. F-S4-42 — Le gestionnaire peut enregistrer la cotisation d'un adhérent pour le compte de celui-ci (rattachée à l'adhérent, pas au gestionnaire).
118. F-S4-43 — Chaque cotisation reçoit un numéro de reçu unique « {code groupe}P{n} » non tronqué.
119. F-S4-44 — Historique des paiements du groupe : Reçu, Date, Membre, Montant, Observation, total, tri date décroissante ; le gestionnaire peut « Activation ? » une ligne sans reçu pour générer son numéro.
120. F-S4-45 — Liste Don - Placement : le gestionnaire voit toutes les fiches, un membre les siennes ; colonnes Date, Référence, D/P, Montant, O/N, Rapporteur, Souscripteur, Etat ; tri date décroissante.
121. F-S4-46 — Filtre Don - Placement par date minimum, type, montant minimum, confirmation et mots de la motivation (disponible aussi pour le gestionnaire).
122. F-S4-47 — Le formulaire Don/Placement n'affiche que « Type soutien » tant que le type n'est pas choisi (« Veuillez indiquer le type de l'épargne: Don ou placement. »).
123. F-S4-48 — Placement : rapporteur (membre ou nom libre) et durée 12 à 120 mois ; Don : durée 0, pas de rapporteur.
124. F-S4-49 — Souscripteur choisi parmi les membres ou saisi librement ; pour un Don sans souscripteur : « Veuillez indiquer le nom du soucripteur. » ; pour un Placement sans rapporteur : « Veuillez indiquer le nom du rapporteur. ».
125. F-S4-50 — Un Don de moins de 100 FCFA est refusé « Le montant ne doit pas être inférieur à 100 francs CFA. » ; un Placement inférieur au minimum paramétré est refusé « Le montant ne doit pas être inférieur à {min} francs CFA. ».
126. F-S4-51 — Une épargne identique (même jour, motivation, montant) est refusée « Cette épargne est déjà enregistré. ».
127. F-S4-52 — Une fiche créée reçoit une référence FDS…, confirmation « Non », mode 0, état Autorisé, stocke nom et identifiant corrects du rapporteur/souscripteur, puis s'ouvre en consultation.
128. F-S4-53 — (Décision) Un placement souscrit au nom d'un autre membre lui envoie l'email « Souscription Placement ».
129. F-S4-54 — Sur une fiche non payée (montant ≥ 100), les icônes Cash/Charden/Mobile Money permettent effectivement de payer ; le paiement renseigne le mode et passe la confirmation à « Oui ».
130. F-S4-55 — Le gestionnaire peut modifier motivation, montant, durée et état d'une fiche sans que le montant soit écrasé.
131. F-S4-56 — Liste Carte de pointage : gestionnaire = toutes les opérations ; agent = opérations qu'il a saisies ; membre = opérations dont il est titulaire.
132. F-S4-57 — Filtre pointage par intervalle de dates (jour max inclus), caisse, membre, opération, intervalle de montants et (gestionnaire) Opération/Encaisse.
133. F-S4-58 — Colonnes pointage : Date, Caisse, Membre, Versement, Retrait (rouge), Solde (si membre filtré ou gestionnaire) ; tri date/heure décroissante ; « {n} Opérations » pour le gestionnaire.
134. F-S4-59 — Pieds de liste : « TOTAL DES OPERATIONS » (versements, retraits, net), « RENTABILITE » = 3 % des versements, « ENCAISSE » = solde de la caisse concernée.
135. F-S4-60 — Formulaire de pointage : Date, Agence (opérateur), Opération (Versement/Retrait) ; le choix du membre affiche son solde, sa date de dernière opération et sa photo.
136. F-S4-61 — Le gestionnaire ne peut pointer que des agents de caisse ; un agent peut pointer tout membre sauf lui-même ; la recherche par nom filtre la liste.
137. F-S4-62 — Opération, membre, montant > 0 et code de pointage sont obligatoires avec les messages exacts (« Veuillez indiquer le type de l'opération. », « Veuillez indiquer le type le membre. », « Veuillez indiquer le montant. », « Veuillez indiquer le code de pointage. »).
138. F-S4-63 — Un code de pointage différent du code du titulaire est refusé « Le code de pointage est incorrect. » sans consommer de référence.
139. F-S4-64 — Un retrait dont le montant atteint ou dépasse 97 % du solde (recalculé côté serveur) est refusé « Impossible de faire un retrait, Le solde est inférieur au montant demandé. ».
140. F-S4-65 — Un pointage identique (même jour, opération, titulaire, montant) est refusé « Ce pointage est déjà enregistré. ».
141. F-S4-66 — Un pointage valide crée une ligne de journal (référence PCS…, solde après opération, type Opération/Encaisse selon l'opérateur), met à jour solde et date du titulaire, répercute le même mouvement sur le solde de l'opérateur et affiche « Pointage éffectué ».
142. F-S4-67 — Toutes les actions S4 (création, modification, suppression, activation, pointage) sont refusées côté API à un utilisateur sans le rôle requis.

### Paiement et panier transverses

143. F-PAY-01 — Tout paiement commence par le choix Cash / Charden Farell / Mobile Money, puis affiche le formulaire avec l'icône du mode et le montant.
144. F-PAY-02 — Le montant est en lecture seule quand il est calculé (panier, cotisation, don, course) et saisissable seulement s'il est nul par construction.
145. F-PAY-03 — Les consignes affichées dépendent du mode (remarque libre / expéditeur + code Charden / numéros du site pour Mobile Money).
146. F-PAY-04 — Montant nul refusé « Le montant ne peut être zéro. ».
147. F-PAY-05 — Charden Farell exige au moins 12 caractères de remarque (« Veuillez indiquer plus de 12 caractères minimum pour le code de Charden Farell. ») ; Mobile Money au moins 9 (« Veuillez indiquer plus de 9 caractères minimum pour le numéro de téléphone. »).
148. F-PAY-06 — Un paiement identique (même payeur, montant, remarque) est refusé avec un message explicite.
149. F-PAY-07 — Tout paiement déclaré est enregistré à l'état « Payement non confirmé » avec son type d'opération (Produit, Article, Course, Likelemba, Souscription, Fond soutien, Apport fond).
150. F-PAY-08 — Paiement produit/article : toutes les lignes non payées du panier du type concerné sont marquées payées (date + lien paiement) et le stock est décrémenté.
151. F-PAY-09 — Après un paiement, un message de succès s'affiche et le formulaire n'est plus proposé.
152. F-PAY-10 — Panier produits : ajout de plusieurs produits en une fois (quantités 0-999), prix figé, icône avec quantité non payée, suppression de ligne.
153. F-PAY-11 — Panier produits : si une quantité dépasse le stock, aucune icône de paiement n'est proposée et le message « Certaines quantités des produits dans le panier sont supérieures aux quantités en stock… » s'affiche.
154. F-PAY-12 — Le prix figé au panier produit est celui arrêté par le métier (legacy : prix distributeur) et cohérent avec celui affiché.
155. F-PAY-13 — L'écran de gestion des paiements n'est accessible qu'aux gestionnaires (droit Caisse si retenu).
156. F-PAY-14 — Liste des paiements filtrable par date maximum (jour inclus), montant maximum, texte de remarque, membre, mode, type d'opération (y compris Course) et état ; tri date décroissante.
157. F-PAY-15 — En-tête « {n} Païements pour un total de {Σ} FCFA » et message « NB. Pour valider un païement non confirmé (PNC), Veuillez cliquer sur son etat ».
158. F-PAY-16 — Colonnes : Date, Membre (lien fiche), Mode, Montant, Observation, Opération, Etat (N.P./P.N.C./P.C.) ; seuls les P.N.C. sont cliquables.
159. F-PAY-17 — La validation affiche Date, Membre, Mode, Opération, Montant, Observation en lecture seule ; « Valider païement » passe l'état à « Payement confirmé » et affiche « Modification effectuée. » ; « Annuler » revient à la liste.
160. F-PAY-18 — (Décision) Les effets métier (stock, cotisation, confirmation don/placement, versement d'apport, état de paiement de course) sont appliqués à la déclaration (legacy) ou à la validation, de façon cohérente pour tous les types.
161. F-PAY-19 — La numérotation des références (IMB, ACL, CRS, LKB, FDS, ALF, ATF, PCS) conserve le format « PRÉFIXE + mois + compteur + année » des codes déjà émis, sans troncature.
162. F-PAY-20 — Les montants s'affichent avec séparateur de milliers espace et suffixe FCFA là où le legacy l'affiche ; la saisie numérique n'accepte que des chiffres.
