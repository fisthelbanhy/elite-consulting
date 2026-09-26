# Inventaire fonctionnel — S5 Opportunité d'affaire · S6 Entreprises - Marchés · S7 Offres Financières

> Source : code PHP **en production** `lafrangine/V04/prog/` (PHP 5, `mysql_*`). `prog-1/` ignoré.
> Dump de référence : `cp1019011_lafrangine.sql` (volumétries citées ci-dessous = nombre de lignes dans le dump ; aucune donnée personnelle reproduite).
> Cible : SvelteKit 2 / Svelte 5 + FastAPI. Ce document décrit **les écrans, formulaires, comportements et règles** ; le mapping colonnes → noms métier reste dans `docs/data-dictionary-*.md` (corrigé en §5).
> Méthode : tous les fichiers listés ci-dessous ont été lus intégralement ; les `include` ont été suivis depuis `choix5.php`, `choix6.php`, `choix7.php`. Quand un comportement est ambigu, c'est signalé « ⚠ Ambigu ».

---

## 0. En-tête

### 0.1 Périmètre

| Section | Point d'entrée | Libellé menu (`$arraychoix1`) | Sous-titre bandeau (`$arraychoix2`) | `<title>` |
|---|---|---|---|---|
| S5 | `choix5.php` | Opportunite d'affaire | Gagner l'argent en devenant revendeur des produits Aloe-Vera | lafrangine: Opportunité d'affaire |
| S6 | `choix6.php` | Entreprises - Marches | Repertoire des entreprises et marchés publics au Congo | lafrangine: Entreprises - Marchés |
| S7 | `choix7.php` | Offres Financieres | Les conseils bancaires et offres financières | lafrangine: Opérations bancaires |

Chaque page affiche : bandeau `incl-entete.php` (nom du site, téléphones, mail → `pcontact.php`, adresse, tirés de `parametre`), menu (`incl-menu1.php` si G, sinon `incl-menu.php`, hors périmètre), image `../image/demo/slide_{N}.jpg` + libellé de section en majuscules + sous-titre, puis sélecteur des 7 sections, puis le contenu, puis `incl-connex.php` (formulaire de connexion du pied de page) et `incl-baspage.php`.

### 0.2 Fichiers lus et statut réel

Légende statut : **ACTIF** = atteint en production par un `include`/lien ; **MORT** = jamais inclus ni lié ; **ORPHELIN** = page autonome dont tous les liens sont commentés (accessible seulement par URL tapée) ; **CASSÉ** = produit des erreurs SQL/PHP s'il est exécuté ; **MANQUANT** = référencé mais absent du disque.

| Fichier | Statut | Preuve / remarque |
|---|---|---|
| `choix5.php` | ACTIF | Lien menu « SECTIONS » + sélecteur de sections |
| `choix5-3.php` | MORT | Aucun lien. Copie de `choix3` (onglets `$arraymenuchoix3`, inclut `incl-choix3A/B.php`) avec `$choix=5` |
| `incl-choix5A.php` | MORT | `choix5.php` n'inclut `incl-choix5{X}.php` que pour `opaf>=2` (B, C). Copie quasi identique de `incl-choix5B.php` |
| `incl-choix5A3.php` | **MANQUANT** | Inclus par `choix5.php` quand `opaf=1&ppa=3` et utilisateur G → warning PHP, zone vide. **Le gestionnaire n'a aucun écran de suivi des adhésions** |
| `incl-choix5B.php` | ACTIF | Liste Business Plan (`opaf=2`) |
| `incl-choix5B-Supp.php` | MORT | Copie de `incl-choix5C.php` (lien fiche avec `opaf=2` au lieu de 3) |
| `incl-choix5C.php` | ACTIF | Liste Partenariat & Troc (`opaf=3`) |
| `opportunite.php` | ORPHELIN + CASSÉ | Aucun lien entrant. `$choix=6` (bandeau S6 !). Ne déclare pas `$tablsoa/$tablmoa/$tablpoa/$tablpdt` → `incl-adhesion.php` y produit des requêtes invalides. Onglets « OPPORTUNITE » (vidéo `pub3.mp4` en `<object>` mplayer) / « ADHESION » |
| `incl-presentation.php` | ACTIF | `opaf=1&ppa=1` |
| `incl-venteproduit.php` | ACTIF | `opaf=1&ppa=2` (catalogue FLP + panier) |
| `incl-adhesion.php` | ACTIF | `opaf=1&ppa=3` pour Ma/M uniquement |
| `incl-businessplan.php` | ACTIF | `opaf=2&insc=2` |
| `incl-partenariat.php` | ACTIF | `opaf=3&insc=2` |
| `pproduit.php` | Hors périmètre | Non appelé depuis S5 ; écran admin G (menu FICHIERS > Produits) qui alimente le catalogue (réf., libellé, description, prix dist./N.D./public, quantité, groupe, état, photo) |
| `incl-enregpaye.php`, `incl-formulairepaye.php` | Lien seulement | Mécanisme de paiement décrit par un autre analyste ; points de contact décrits en S5-2 et S5-3 |
| `choix6.php` | ACTIF | |
| `incl-choix6A.php` | ACTIF | Liste répertoire (`rere=1`) |
| `incl-choix6A-0001.php` | MORT | Copie **identique** (diff vide) de `incl-choix6A.php` |
| `incl-choix6A-0000.php` | MORT | Ancienne version de la liste « comparateur » (≈ `incl-choix6B.php`) |
| `incl-choix6B.php` | ACTIF | Liste comparateur de prix (`rere=2`, membre non « morale ») |
| `incl-choix6B-Reussite.php` | MORT | Ancien onglet 2 « Reussite entrepreneuriale » (menu `$arraymenuchoix6` d'origine commenté) |
| `incl-choix6C1.php` / `incl-choix6C2.php` | ACTIFS | Listes Marchés (`rere=3&mept=1`) / Projets (`mept=2`) |
| `incl-entreprise.php` | ACTIF | Fiche/formulaire entreprise |
| `incl-formulaireentreprise.php` | MORT | Jamais inclus (grep). Force `$imbr=1`, forme juridique 0-3 seulement |
| `incl-prospective.php` | ACTIF | Comparateur : fiche offres/demandes |
| `incl-marche.php` / `incl-projet.php` | ACTIFS | |
| `incl-reussite.php` | MORT | Jamais inclus (onglet remplacé par Comparateur de prix). Table `reussite` : 0 ligne |
| `choix7.php` | ACTIF | |
| `choix7-4.php` | MORT + CASSÉ | Aucun lien ; utilise `$arraymenuchoix41/42/412` (inexistants) et `incl-choix4*.php` |
| `incl-choix7A.php` | ACTIF | Forum Conseil financier / Rumeurs (`cgb=1&recf=1|2`) |
| `incl-choix7A3.php` | ACTIF | Liste des dossiers d'accompagnement (`cgb=1&recf=3&bprc=1..4`) |
| `incl-choix713.php` | MORT | Ancienne version de `incl-choix7A3.php` (sans filtre membre) |
| `incl-conseilfinance.php` | ACTIF | Formulaire sujet forum |
| `incl-accompagnement.php` | MORT + CASSÉ | Jamais inclus ; ancienne copie de `incl-choix7B.php`, appelle `banques()` (fonction inexistante) |
| `incl-acompbusinesplan.php`, `incl-acompprojetagricol.php`, `incl-acomprestructcredit.php`, `incl-acompcreditimmobil.php` | ACTIFS | Questionnaires (`cgb=1&recf=3&bprc=1..4&insc=2`) |
| `incl-choix7B.php` | ACTIF | Listes Trésorerie (`cgb=2&podc=1..4`) |
| `incl-choix7B1.php` | ACTIF | Liste Opérations bancaires **vue G** (`cgb=2&podc=2`, G) |
| `incl-placement.php`, `incl-operationbanque.php`, `incl-dmdcredit.php`, `incl-contentcredit.php` | ACTIFS | Formulaires Trésorerie (inclus en haut de page pour tout connecté) |
| `incl-operationbanque-Liste.php` | MORT | Ancienne saisie (colonnes `nomemeteuropb/objetopb/motifopb` absentes du schéma) |
| `incl-dialogue.php` | ACTIF | « Ecrire à la frangine » de Trésorerie (`dlg`) |
| `pdialogue.php` | ORPHELIN | Seuls liens entrants commentés |
| `incl-choix7C.php` | ACTIF (fonctionnellement vide) | Consultation Bench Marking (`cgb=3`) — lit `benchmarking2.tarifbm2` qui n'existe pas |
| `incl-choix7C-1.php` | MORT | Ancienne consultation (cohérente avec `benchmarking3`) |
| `incl-benchmarking.php` | ACTIF + CASSÉ | Saisie Bench Marking par membre banque (`cgb=3&bmg=1`) ; dépend de `banque.indexmbr` (toujours 0 dans le dump) et de `tarifbm2` (inexistante) |
| `pbenchmarking.php` | ORPHELIN + CASSÉ | Liens menu commentés ; `benchmarking1.indexmbr`, `benchmarking2.tarifbm2` inexistants |
| `pbenchmarking-2.php` | ORPHELIN | Version admin cohérente avec le schéma (3 niveaux) sauf UPDATE niveau 3 (`libelebm3` inexistant) |
| `pbenchmbanque.php` | ORPHELIN + CASSÉ | `benchmarking4/5`, `$tablque`, `$tablbm4/5` inexistants |
| `pbanque.php` | ORPHELIN | Lien menu commenté ; **seul écran de gestion du référentiel `banque`** utilisé par la Trésorerie |
| Support lus : `incl-variable.php`, `incl-contconnex.php`, `incl-lecturetables.php`, `incl-pagination.php`, `incl-calculpagination.php`, `incl-changpage.php`, `incl-erreur.php`, `incl-msgfinoperat.php`, `incl-publicite.php`, `incl-upload.php`, `incl-envoimail.php`, `incl-menu.php`, `incl-menu1.php`, `incl-entete.php`, `incl-meta.php`, `scripts/numerique.js`, `scripts/calendrier.js` | | |

Volumétries du dump utiles : `souscriptoportuniteaffaire` 0, `membreoportuniteaffaire` 0, `produitoportuniteaffaire` 0, `produit` 123 (ids 1..123), `panier` 10, `businessplan` 2, `partenariat` 6, `besoin` 19 (tous types), `entreprise` 3, `prospective1` 2, `prospective2` 5, `produitprospective` 3, `marche` 1, `projet` 1, `reussite` 0, `conseilfinance` 8, `acompbusinesplan`/`acompprojetagricol`/`acomprestructcredit`/`acompcreditimmobil` 0 (tables **présentes**), `placement` 1, `operatbanq` 22, `demandecredit` 1, `contentcredit` 1, `dialogue` 10, `banque` 12, `benchmarking1/2/3` 0 (tables **présentes**).

### 0.3 Légende des droits

Contexte posé par `incl-contconnex.php` : `$gtre` = `membre.typembr` (0 visiteur, 1 Gestionnaire, 2 Master, 3 Membre), `$imbr` (id connecté ; **non défini** pour un visiteur), `$droitmbr` (chaîne positionnelle), `$catgmbr` (= `categoriembr`, 1 physique / 2 morale), `$banqboutq` (= `banqboutqmbr`, 1 banque / 2 boutique).

| Code | Signification | Condition legacy |
|---|---|---|
| V | Visiteur non connecté | `$gtre==0`, `$imbr` non défini |
| M | Membre | `$gtre==3` |
| Mp / Mm | Membre personne physique / morale | `$catgmbr==1` / `==2` |
| Mbq | Membre « banque » | `$banqboutq==1` |
| Ma | Master | `$gtre==2` |
| G | Gestionnaire | `$gtre==1` |
| G+Act | Gestionnaire avec droit « Activation » | `$gtre==1 AND substr($droitmbr,2,1)==1` |
| G+Caisse / G+Droit | positions 1 / 0 de `droitmbr` | **non utilisés dans S5-S7** (la confirmation de paiement se fait ailleurs) |
| C | Tout connecté | `$gtre!=0` (G, Ma, M) |
| Ma/M | Connecté non gestionnaire | `$gtre>1` |
| Auteur | Propriétaire de la fiche | `indexmbr` de la fiche == `$imbr` |

⚠ **Aucun contrôle d'accès côté serveur** dans les fichiers du périmètre : les restrictions ne portent que sur l'affichage des liens/boutons. Toute fiche (`opt=2&i…=id`) peut être ouverte, et souvent modifiée ou annulée, par URL directe. La nouvelle version DOIT appliquer ces règles côté API (voir les « Bugs à ne pas reproduire »).

---

## 1. Conventions transverses (valables pour S5, S6, S7)

### 1.1 Paramètres de navigation
| Param. | Rôle |
|---|---|
| `insc` | 0 = mode liste/contenu ; 1 = fiche membre (`incl-membre.php`, hors périmètre) ; 2 = mode formulaire ; 3 = déconnexion (traité par `incl-contconnex.php`) |
| `opt` | 0 = liste ; 1 = création ; 2 = consultation/modification (id passé en GET) ; 3 = fiche lecture (produit) ; 4 = action spéciale (liste produits d'un groupe, fil de réponses, annulation) ; 5 = panier |
| `ajs` (POST caché) | 1 = INSERT, 2 = UPDATE, 3 = formulaire de recherche |
| S5 | `opaf` (1 Proposition, 2 Business Plan, 3 Partenariat & Troc), `ppa` (1 Présentation, 2 Produit, 3 Adhésion), `prst` (1..3 présentation), `gppdt` (1..20 groupe produit), `etape` (adhésion), `mdpay` (1 Cash, 2 Charden Farell, 3 Mobile Money) |
| S6 | `rere` (1 Répertoire, 2 Comparateur, 3 Marchés et projets), `mept` (1 Marchés, 2 Projets) |
| S7 | `cgb` (1 Conseil Financier, 2 Trésorerie, 3 Bench Marking), `recf` (1 Conseil financier, 2 Rumeurs Economiques, 3 Accompagnement), `bprc` (1..4 questionnaire), `podc` (1 Placement, 2 Opération Bancaire, 3 Demande de Crédit, 4 Contentieux), `dlg` (dialogue), `bmg` (0 consultation / 1 saisie bench marking), `bhmg` (1 type / 2 libellé & taxe) |

### 1.2 Onglets et compteurs
- Onglets niveau 1 en majuscules (`strtoupper`), onglet actif mis en évidence ; sous-onglets niveau 2 sous un séparateur.
- Compteur entre parenthèses sur l'onglet, calculé par `incl-lecturetables.php` (appelé par `incl-ouvrbd.php`) : **S5 « PARTENARIAT & TROC (n) »** = nb `partenariat` état 2 ; **S6 « MARCHES ET PROJETS (n) »** = nb `projet` état 2 (les marchés ne sont **pas** comptés). S7 n'affiche aucun compteur.

### 1.3 Colonne de droite « LES PUBLICITES »
`incl-publicite.php` : jusqu'à 10 publicités `etatpub=2` dont la fenêtre `datedebpub..datefinpub` contient aujourd'hui, ordre aléatoire ; image `pub{id}.jpg`, texte, lien « Continuer la suite » → `incl-affichpub.php`. Affichée en S5 (sauf `ppa=2`), en S6 (onglets 1, 3 avec `mept`), pas en S7 (colonne droite vide).

### 1.4 Recherche / tri
- Formulaire POST `ajs=3` ; critères `chtNN` ; la valeur 0 d'un select = « pas de filtre ».
- Les critères sont stockés en session (`crittriegl`) mais **ne sont relus que si `chg=99`**, paramètre jamais produit → tout clic (pagination, retour) **perd la recherche**. À corriger (garder les filtres dans l'URL).
- ⚠ Plusieurs recherches combinent des `OR` sans parenthèses avec les conditions de jointure/état (S5-5, S6-3) → résultats faux / fuite de fiches non autorisées. Ne pas reproduire.

### 1.5 Pagination (`incl-calculpagination.php` + `incl-changpage.php`)
- Taille par défaut **50**, choix 50 à 500 par pas de 50 (select « Nombre de lignes par page: », mémorisé en session `parpage`) ; select « Page: » 1..n ; barre affichée seulement si plus d'une page.
- ⚠ **Bug** : le numéro de page posté n'est jamais appliqué (la requête lit `$_GET['limit']` jamais fourni) → seule la page 1 est affichée. La nouvelle version doit implémenter une vraie pagination (taille 50 par défaut, options 50..500).

### 1.6 Messages standard
- Erreurs : bloc rouge centré « ERREURS » suivi des messages (un par ligne) — `incl-erreur.php`.
- Fin d'opération : bloc `msgfinoperat` ; valeurs usuelles `$arraymessage` : « Enregistrement effectué. » / « Modification effectuée. » (certains écrans ont un message propre, indiqué écran par écran).

### 1.7 Références et états
- `fonctreference(prefixe)` = `MAJUSCULES(prefixe) + mois(2) + compteur + année(2)`, compteur **global** `parametre.numreferencepmt` incrémenté à chaque appel. Préfixes utilisés dans le périmètre (`$arraycodereference`) : `bsp`[11] Business plan, `ptr`[12] Partenariat, `ent`[13] Entreprise, `mch`[14] Marché, `pjt`[15] Projet, `cfr`[16] Conseil financier, `abp`[17], `apa`[18], `arc`[19], `aci`[20] (accompagnements), `pcm`[21] Placement, `opb`[22] Opération bancaire, `ddc`[23] Demande de crédit, `cct`[24] Contentieux, `rst`[28] Réussite (mort).
- ⚠ `businessplan.zone27bsp` et `reussite.zone02rst` sont `varchar(10)` : une référence dépasse 10 caractères dès que le compteur atteint 4 chiffres → troncature silencieuse. Prévoir ≥ 15 caractères.
- États (`$arrayetat`) : 1 Non traité, 2 Autorisé, 3 Supprimé, 4 Clôturé. Suppression = passage à l'état 3 (sauf exceptions signalées : panier et lignes du comparateur supprimés physiquement).

### 1.8 Contrôles de saisie côté navigateur
- `checkNumber` (onKeyUp) : n'accepte que chiffres, « . » et « / » (supprime le dernier caractère sinon).
- Calendrier `ds_sh` : format **jj-mm-aaaa** ; converti par `datefr(...,1)` (inversion) avant stockage `aaaa-mm-jj`.
- Montants affichés avec `number_format(x, 0, ',', ' ')` (séparateur de milliers espace), espaces retirés à l'enregistrement (`supr_number_format`).

### 1.9 Upload d'image (`incl-upload.php`)
Champ `monfichier` ; ≤ 4 227 532 octets ; si ≥ 250 000 octets et extension jpg/jpeg/gif/png → redimensionnement 300×250 ; fichier déplacé vers `../image/ig/{nom}` **quelle que soit l'extension** (⚠ pas de contrôle de type au-delà de la taille : à durcir). Trop gros → message « Image trop grande. Veuillez la réduire ou changer. ».

### 1.10 Envoi de mail (`incl-envoimail.php`)
`mail()` HTML multipart, expéditeur/Reply-To = `parametre.nompmt <mailpmt>` ; positionne ensuite `$message = "Votre opération a bien été envoyée."`.

---

## 2. Section 5 — Opportunité d'affaire (`choix5.php`)

### S5-0 Accueil de section
- **URL** : `choix5.php?insc=0&opt=0` (sans `opaf`).
- **Accès** : tous. Affiche uniquement les 3 onglets `$arraymenuchoix5` : PROPOSITION / BUSINESS PLAN / PARTENARIAT & TROC (n). Zone centrale vide, pas de colonne publicité.
- **Icône « Nouveau »** (image `ecrire.gif`, `title="Nouveau"`) : affichée pour **Ma/M** uniquement quand `opaf>=2`, en mode liste → `?insc=2&opt=1&opaf={opaf}&ppa={ppa}`. Le G ne peut pas créer de Business Plan ni de Partenariat.

### S5-1 Proposition › Présentation
- **Fichiers** : `choix5.php` + `incl-presentation.php`. **URL** : `?insc=0&opt=0&opaf=1&ppa=1[&prst=1|2|3]`.
- **Accès** : tous (V compris). Colonne droite : publicités.
- **Contenu** :
  - Barre de 3 icônes (`../image/ip/present1.png`, `present2.png`, `present3.png`, 65×60) ; l'icône de la page courante (`prst`) est masquée. Sans `prst` : icônes seules.
  - `prst=1` : vidéo `../image/ig/pub3.WMV` (lecteur `<object type="application/x-mplayer2">` 730×420, autostart).
  - `prst=2` : **même vidéo** `pub3.WMV` (⚠ doublon probable — à confirmer avec le métier).
  - `prst=3` : 5 blocs texte, titres = `$arraypresentation[1..5]` en majuscules : « LE MARKETING DE RÉSEAU », « QUELLE VOIE CHOISISSEZ-VOUS ? », « LE PLAN DE RÉMUNÉRATION DE FLP », « VENTE DES PRODUITS », « ET MAINTENANT ? ».
  - `prst=4` : `catalogue.pdf` dans un `<object>` — **inaccessible** (pas de 4e icône alors que `present4.png` est déclarée).
- **Textes exacts** : à extraire mécaniquement de `incl-presentation.php` (bloc 1 l.231-234, bloc 2 l.242-244 avec les 2 choix « Vente/consommation personnelle » et « Marketing de réseau », bloc 3 l.252, bloc 4 l.260, bloc 5 l.268-270). Résumé : (1) croissance du marketing de réseau et revenus issus du réseau ; (2) plan FLP = vente au détail (différentiel de 43 %) + vente par réseau, choix de l'activité à privilégier (liste à puces, non saisissable) ; (3) revoir le plan de rémunération vu en POA ; (4) minimum 4 PC/mois pour être qualifié au bonus de groupe à partir du niveau animateur ; (5) réduction de l'obligation de PC par le parrainage (2 PC → 2 PC restants ; ≥2 filleuls à 2 PC → 1 PC). Ces textes semblent dérivés de documentation FLP : ils sont référencés par ligne plutôt que recopiés, afin d'être repris à l'identique par extraction.
- **Bugs à ne pas reproduire** : lecteurs vidéo `<object>` Windows Media → `<video>` HTML5 (fichier `.WMV` à convertir) ; icône catalogue manquante.

### S5-2 Proposition › Produit (catalogue Aloe Vera / FLP + panier)
- **Fichiers** : `choix5.php` + `incl-venteproduit.php` (+ `incl-enregpaye.php`, `incl-formulairepaye.php` pour le paiement). **URL** : `?insc=0&opt=0&opaf=1&ppa=2` ; groupe `&gppdt={1..20}&opt=4` ; panier `&opt=5` ; paiement `&opt=5&mdpay={1..3}` ; suppression ligne `&opt=5&ipnr={id}&dlt=1` ; fiche produit `&opt=3&ipdt={id}`.
- **Accès** :
  - V : zone centrale **vide** (condition `ppa==2 AND isset($imbr)`). Seule la colonne droite est affichée.
  - C (G, Ma, M) : catalogue complet et panier. ⚠ Le message « Il faut faire une adhésion afin d’accéder à ce module. » (condition : pas de souscription ET `$gtre==0`) n'est atteignable qu'après un échec de connexion/déconnexion (`$imbr=0`) : **en pratique aucune adhésion n'est exigée**. ⚠ Ambigu : l'intention était probablement « réservé aux adhérents » → à trancher.
- **Colonne droite (spécifique `ppa=2`)** : bandeau orange « Les plus demandés » + noms (50 car.) des 10 premiers produits `etatpdt=2` (⚠ aucun tri de popularité, `LIMIT 10` sans `ORDER BY`, pas de lien).
- **Écran « groupes »** (défaut, `opt!=3`) : grille 4 colonnes des 20 groupes `$arraygroupeproduit[1..20]` (Buvables Forever, Compléments alimentaires, Produits de la ruche, Programmes Forever, Produits pour la ligne, Produits pour les sportifs, Soins du coprs Forever, Soins du visage Forever, Soins anti-âge Forever, Fleur de jouvence, Sonya Skin care, Flawless by Sonya, Premiers soins Forever, Produit d'hygiène Forever, Soins des cheveux Forever, Soins pour enfants, Soins pour femmes, Soins pour hommes, Soins pour annimaux, Soins pour chevaux) ; + icône caddie (`caddy1.gif`, title « Vérifier le panier ») avec badge = Σ `qtepnr` du panier non payé (`typepnr=1, etatpnr=2, etatpayepnr=0`) → lien panier.
- **Liste d'un groupe** (`opt=4&gppdt=N`) : produits `groupepdt=N AND etatpdt=2`, sans ordre explicite, pagination 50 ; pour chaque produit : vignette `pdt{id}.jpg` 60×80 (zoom au survol, pas de lien), « Référence : », « Nom produit: », description, « Prix : » = **`prixdistpdt` (prix distributeur)**, « Quantité : » = stock `quantitepdt`, select quantité 0..999 (`chp04{idpdt}`, caché `chp03{idpdt}`). Texte « Pour ajouter les produits sélectionnés, cliquez sur le panier ci-contre. » + bouton image « Panier » (title « Cliquez pour enregistrer les produits sélectionnés »).
- **Action Ajouter au panier** (POST `Panier`) : pour chaque produit avec quantité > 0 : INSERT `panier` (`typepnr=1`, membre, date, produit, quantité, `prixpnr` = `prixdistpdt` **au moment de l'ajout**, `etatpnr=2`). Aucun contrôle de stock à l'ajout, aucun regroupement (deux ajouts = deux lignes). Retour sur la liste du groupe.
- **Panier** (`opt=5`) : lien « Retour liste des produits ? » (haut et bas) ; tableau Date | Produit | Prix | Quantité (`qté / stock` avec stock en rouge) | Montant | X (suppression, title « Annulation ») ; ligne de total (quantité, montant). Tri par date d'ajout.
  - Si total > 0 et aucune ligne avec quantité > stock : 3 icônes de mode de paiement (Payement cash / Payement par Charden Farell / Payement par Mobile Money) → `mdpay`.
  - Si au moins une ligne dépasse le stock : message « Certaines quantités des produits dans le panier sont supérieures aux quantités en stock. Veuillez les supprimer dans le panier et prendre une nouvelle quantité en rapport avec le stock » ; paiement impossible.
  - Suppression X : **DELETE physique** de la ligne panier (⚠ sans contrôle de propriétaire).
- **Paiement** (lien vers l'analyse paiement) : `incl-formulairepaye.php` (montant = total panier, en lecture seule si > 0 ; zone remarque/code ; bouton « Confirmer payement ») → `incl-enregpaye.php` avec `typepnr=1` : INSERT `payement` (`etatpay=2`, `typepnrpay=1`), décrément `produit.quantitepdt`, lignes panier marquées payées (`etatpayepnr=1`, date, `indexpay`).
- **Fiche produit** (`opt=3&ipdt`) : incrémente `nbvisitepdt` et `datevisitpdt` ; affiche lien « Retour a la Liste », photo 160×180, Référence, Produit, **Prix = `prixpubpdt` (prix public)**, Description. ⚠ **Code inatteignable** : aucun lien `opt=3` n'existe dans S5 (les vignettes de la liste n'ont pas de lien) et `incl-venteproduit.php` n'est inclus que par `choix5.php` (les liens `opt=3&ipdt` de la section 1 pointent vers `choix1.php`, hors périmètre). À réactiver consciemment (lien depuis la vignette) ou abandonner.
- **Règles de prix** : liste et panier = prix distributeur ; fiche = prix public ; **prix non distributeur (`prixcompdt`) jamais utilisé** en S5.
- **Bugs à ne pas reproduire** : suppression de ligne sans contrôle de propriétaire ; « Les plus demandés » non trié ; lien « Retour liste des produits ? » qui perd le groupe (`gppdt` vide) ; pagination (§1.5).

### S5-3 Proposition › Adhésion (assistant distributeur FLP)
- **Fichiers** : `choix5.php` + `incl-adhesion.php` (+ `incl-formulairepaye.php`, `incl-enregpaye.php`, `incl-msgfinoperat.php`). **URL** : `?insc=0&opt=0&opaf=1&ppa=3` ; navigation interne en POST (`precsuiv`, `etape`) ; paiement `?insc=0&opt=2&opaf=1&etape=9&ppa=3&mdpay={1..3}`.
- **Accès** : **Ma/M uniquement** (`$gtre>1`). V : zone vide. G : inclusion d'un fichier manquant (`incl-choix5A3.php`) → aucun écran (⚠ à créer : liste des souscriptions pour le back-office).
- **Tables** : `souscriptoportuniteaffaire` (SOA, 1 par membre), `membreoportuniteaffaire` (MOA, prospects), `produitoportuniteaffaire` (POA, kit), lecture `produit`. Toutes vides en production.
- **Chargement initial** (étape 0 ou 9) : si le membre a déjà une SOA, pré-remplissage de tous les champs (prospects, formations, filleuls, kit : quantités de la POA mais **prix = prix distributeur actuel** du produit, pas `prixpoa`). Sinon formulaire vide (`ajs=1`).
- **Navigation** : boutons « Précédent » (absent à l'étape 1) / « Suivant » ; toutes les valeurs saisies sont transportées en champs cachés d'une étape à l'autre ; rien n'est enregistré avant « Sauvegarder »/« Envoyer » (étape 7). Titre de chaque bloc = `$arrayetapeadhesion[n]` en majuscules.

**Correspondance étapes écran ↔ `$arrayetapeadhesion`**

| Étape écran | Bloc(s) `$arrayetapeadhesion` | Contenu |
|---|---|---|
| 1 | [1] « Prealables au developpement de votre entreprise: Fixer vous des objectifs », [2] « Votre propre histoire », [3] « Combien d'heures par semaine pensez-vous pouvoir consacrer a votre activite » | 2 textareas + 1 select |
| 2 | [4] « Votre liste des nom » | 25 prospects + date butoir |
| 3 | [5] « Comment devenir competent dans le marketing de reseau » | 4 formations (date/lieu/heure) |
| 4 | [6] « Contactez vos prospects par telephone » | Texte seul (3 scénarios d'appel), aucun champ |
| 5 | [7] « Rendez-vous individuel » | Nombre de RDV |
| 6 | [8] « Nombre d'interesses » | 3 filleuls |
| 7 | [9] « Commande des produits » | Mode de souscription + kit produit + montant + Sauvegarder/Envoyer |
| 8 | [10] « Payement » | Choix du mode de paiement (si Envoyer + Fond propre) ou « Opération éffectuée » (si Sauvegarder) |
| 9 | — | Formulaire de paiement (`incl-formulairepaye.php`) |
| 10 | — | Message de fin « Adhésion affectuée. » |

**Textes d'introduction** (à extraire à l'identique de `incl-adhesion.php`) : étape 1 bloc 1 l.466-475 (fixer 3 objectifs prioritaires + 8 exemples à puces : temps en famille, juste récompense, études des enfants, voyager, maison de rêve, maîtriser son destin, sécurité financière, échapper au « taxi, boulot, dodo ») ; bloc 2 l.485 (rédiger « votre propre histoire ») ; étape 2 l.521-530 (pourquoi une liste de noms, « Commencez à inscrire tout de suite 25 noms ») + phrase du champ date l.557 ; étape 3 l.575-582 (Forever Business Academy : POA, Journées de Succès, formations Animateur, aide du parrain ; « Notez maintenant vos dates de formation dans votre agenda : ») ; étape 4 l.621-643 (contact téléphonique, conférence à trois, 3 scénarios dont le 3e est titré à tort « Scenario 2 », règles : être bref, pas de détail, enthousiasme) ; étape 5 l.659-663 (rendez-vous individuel, brochure « choix de carrière », « Maintenant, discutez avec votre parrain du nombre de rendez-vous individuels… ») ; étape 7 NB l.735-736.

**Formulaire — étape 1**

| Libellé affiché | Champ | Contrôle | Options | Oblig. | Validation | Message |
|---|---|---|---|---|---|---|
| (sous le texte « Fixer vous des objectifs ») | `chp02` → `zone02soa` | textarea 3×100 | — | non | aucune | — |
| (sous « Votre propre histoire ») | `chp03` → `zone03soa` | textarea 3×100 | — | non | aucune | — |
| (sous « Combien d'heures… », title « Nombre d'heure ») | `chp04` → `zone04soa` | select | 0 « », 1 « 5 - 10 », 2 « 10 - 20 », 3 « 20 + » | non | — | — |

**Formulaire — étape 2 (liste de 25 noms)** — tableau 25 lignes, en-têtes Nom - Prénom | Téléphone | Email | Commentaire.

| Libellé | Champ (n = 1..25) | Contrôle | Oblig. | Validation / règle | Message |
|---|---|---|---|---|---|
| Nom - Prénom | `chp05n` → `nomprenmoa` | texte, maxlength 30 | non | Ligne enregistrée seulement si longueur **> 5** caractères | — (ligne ignorée silencieusement) |
| Téléphone | `chp06n` → `phonemoa` | texte, maxlength 9 | non | aucune | — |
| Email | `chp07n` → `mailmoa` | texte, maxlength 30 | non | aucune | — |
| Commentaire | `chp08n` → `commentairemoa` | texte, maxlength 120 | non | aucune | — |
| « Dans les tous prochains jours, il vous faudra rallonger votre liste des noms, Fixez-vous une date: » | `chp23` → `zone23soa` | date (calendrier, lecture seule clavier) | non | — | — |

**Formulaire — étape 3 (4 formations)** — lignes fixes (`$arrayprestation` recopié en dur) : POA, Journée de succès, Formation Animateur, Formation Manager ; colonnes Date | Lieu | Heure.

| Libellé | Champ (n = 1..4) | Contrôle | Règle |
|---|---|---|---|
| Date | `chp09n` → `zone09nsoa` | date (calendrier, lecture seule clavier) | stockée aaaa-mm-jj |
| Lieu | `chp10n` → `zone10nsoa` | texte, maxlength 50 | — |
| Heure | `chp11n` → `zone11nsoa` | texte, maxlength 30 | ⚠ colonne `varchar(8)` → troncature |

**Formulaire — étape 5**

| Libellé | Champ | Contrôle | Règle |
|---|---|---|---|
| Nombre: | `chp12` → `zone12soa` | texte numérique (checkNumber), maxlength 30 | ⚠ colonne `tinyint` (≤127) |

**Formulaire — étape 6 (3 filleuls / intéressés)** — colonnes Nom - Prénom | Mail | Adresse | Montant | Date.

| Libellé (title) | Champ (n = 1..3) | Contrôle | Règle |
|---|---|---|---|
| Nom et Prénom | `chp13n` → `zone13nsoa` | texte, maxlength 30 | — |
| Adresse mail | `chp14n` → `zone14nsoa` | texte, maxlength 50 | — |
| Adrese physique | `chp15n` → `zone15nsoa` | texte, maxlength 50 | — |
| Montant | `chp16n` → `zone16nsoa` | numérique, maxlength 15 | ⚠ `zone163soa` est `tinyint` (≤127) alors que 161/162 sont `int` → montant du 3e filleul tronqué |
| Date de présentation | `chp17n` → `zone17nsoa` | date (calendrier, **saisissable**), maxlength 10 | — |

**Formulaire — étape 7 (commande du kit)**

| Libellé | Champ | Contrôle | Options | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|---|
| Mode de souscription: | `chp21` → `zone21soa` | select | 0 « », 1 « Fond propre », 2 « Credit » (`$arraysouscription`) | oui (sur Envoyer) | `chp21==0` | « Veuillez indiquer le mode de souscription. » |
| (tableau Produit / Prix / Quantité / Valeur) | `chp18{idpdt}` (id caché), `chp19{idpdt}` (prix caché = `prixdistpdt`), `chp20{idpdt}` (quantité) | 1 ligne par produit : nom (lecture seule), prix distributeur (lecture seule), quantité (numérique), valeur = prix × quantité (lecture seule, **recalculée seulement au rechargement**, pas de JS) | **tous les produits de la table, tous états confondus**, triés par nom | — | — | — |
| (montant total, fond gris) | `chp22` → `zone22soa` | texte (⚠ modifiable) | — | — | Sur Save : recalculé = Σ prix × quantité si au moins une quantité > 0 | — |
| — | — | — | — | Envoyer | `chp22 < 56000` | « Le montant de souscription ne peut être inférieur à 56 000 FCFA. » |
| — | — | — | — | Envoyer | `chp21==2 AND chp22 > 66000` | « Pour une souscription à crédit le montant ne peut être superieur à 66 000 FCFA. » |

Texte NB affiché : « NB. Pour une souscription sur fond propre le montant doit être supérieur à 56 000 FCFA. » / « Pour une souscription à crédit le montant est compris entre 56 000 et 66 000 FCFA. » (la règle réelle est **≥ 56 000**). Les 3 contrôles sont cumulatifs (tous les messages s'affichent). En cas d'erreur : bloc ERREURS et retour à l'étape 7.

- **Actions (étape 7)** : « Sauvegarder » (bouton blanc/rouge) = enregistrement **sans aucune validation** ; « Envoyer » (bouton rouge) = mêmes écritures après les 3 contrôles ci-dessus.
- **Effets de bord (Sauvegarder / Envoyer)** :
  - SOA inexistante → INSERT (`etatsoa=2`, `datesoa`, `referencesoa` **non renseignée**) puis INSERT d'une MOA par prospect dont le nom fait > 5 caractères (`etatmoa=2`).
  - SOA existante → UPDATE de tous les champs (`etatsoa` forcé à 2) ; pour les prospects : INSERT seulement des noms **nouveaux** (recherche par membre + nom exact) ; ⚠ les prospects existants ne sont **jamais mis à jour** (téléphone, mail, commentaire modifiés perdus) ni supprimés.
  - POA : DELETE de toutes les lignes du membre puis INSERT d'une ligne par produit à quantité > 0 (`prixpoa` = prix distributeur affiché, `etatpoa=2`) — ⚠ **boucle limitée aux produits d'id 1 à 25** alors que le montant est calculé sur les id 1 à 150 : 98 des 123 produits du catalogue ne sont jamais enregistrés dans le kit. Ne pas reproduire.
- **Étape 8** : titre « PAYEMENT ». Si « Envoyer » ET mode = Fond propre : 3 icônes (Payement cash / Charden Farell / Mobile Money) → étape 9 avec `mdpay`. Si « Envoyer » ET mode = Crédit : **titre seul, aucune suite** (⚠ pas de circuit crédit). Si « Sauvegarder » : message « Opération éffectuée ».
- **Étape 9** : recharge la SOA depuis la base, montant à payer = Σ (prix distributeur **actuel** × quantité POA) — pas `zone22soa` ; formulaire de paiement (montant en lecture seule, remarque/code, « Confirmer payement »).
- **Confirmation** (POST `Save=Confirmer payement`) : `incl-enregpaye.php` avec `typepnr=6` → INSERT `payement` (`etatpay=2` « Payement non confirmé », `typepnrpay=6`) + `UPDATE souscriptoportuniteaffaire SET etatsoa=2` ; puis étape 10 : message « Adhésion affectuée. » — ⚠ affiché **même si le paiement a échoué** (montant nul, code Charden < 12 car., n° Mobile Money < 9 car., doublon).
- **Bugs à ne pas reproduire** : kit limité aux id ≤ 25 ; prospects jamais mis à jour ; message de succès même en cas d'échec ; valeur de ligne non recalculée en direct ; montant modifiable à la main ; produits inactifs proposés ; `referencesoa` vide ; troncatures `tinyint`/`varchar(8)` ; aucune suite pour le mode Crédit ; aucun écran G.

### S5-4 Business Plan (auto-diagnostic)
- **Fichiers** : liste `incl-choix5B.php`, formulaire `incl-businessplan.php`. **URL** : liste `?insc=0&opt=0&opaf=2` ; création `?insc=2&opt=1&opaf=2` ; fiche `choix5.php?ibsp={id}&opt=2&insc=2&opaf=2` ; fiche membre (G) `?imbr={id}&opt=2&insc=1&vcpm=3`.
- **Accès** : V = champ de recherche seul, aucune liste. Ma/M = leur propre business plan (0 ou 1 ligne). G = tous. Création : Ma/M (icône « Nouveau », affichée même si une fiche existe déjà). Modification : auteur ou G (tout G, sans droit). État : G+Act, en modification seulement.
- **Liste** : recherche `cht01` (placeholder « Rechercher », title « Recherche un mot dans la description du projet », LIKE sur `zone03bsp`) ; compteur « n Business Plan » (G) ; note rouge « NB. Pour consulter une fiche de business plan. Veuillez cliquer sur sa référence » (C, si lignes) ; tableau Référence (lien si G ou auteur, title « Voir fiche1 ») | Date (`zone28bsp`, jj-mm-aaaa hh:mm:ss) | Membre (lien vers la fiche membre pour G) | Projet (40 premiers car. de la description) ; tri date décroissante ; pagination 50.
- **Fiche/formulaire** : lien « Retour liste des Business plan ? » (haut ; bas aussi pour G) ; en-tête nom du membre + sexe ; vignette membre `../ic/mbr{id}.jpg` → `pmembre.php` (G ou auteur) ; Référence + Date (lecture seule, en modification seulement).

| Libellé affiché | Champ → colonne | Contrôle | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|
| Quel est le type d'activité | `chp02` → `zone02bsp` | texte 80, maxlength 120 | oui | longueur < 5 | « Veuillez indiquer. le type d'activité avec 5 caractères minimum. » |
| Description du projet | `chp03` → `zone03bsp` | textarea | oui | longueur < 10 | « Veuillez décrire votre projet avec 10 caractères minimum. » |
| Les moyens actuels pour le projet | `chp04` → `zone04bsp` | textarea | non | — | — |
| Vos ressources disponibles | `chp05` → `zone05bsp` | textarea | non | — | — |
| Qu'est ce que vous possedez | `chp06` → `zone06bsp` | textarea | non | — | — |
| Quelle est l'organisation actuelle | `chp07` → `zone07bsp` | textarea | non | — | — |
| Quelle est l'organisation souhaitée | `chp08` → `zone08bsp` | textarea | non | — | — |
| Le détail de votre besoin | `chp09` → `zone09bsp` | textarea | non | — | — |
| Quel est votre apport | `chp10` → `zone10bsp` | textarea | non | — | — |
| Quelle est votre ambition | `chp11` → `zone11bsp` | textarea | non | — | — |
| Comment comptez-vous atteindre vos résultats | `chp12` → `zone12bsp` | textarea | non | — | — |
| Quelle est votre valeur ajoutée | `chp13` → `zone13bsp` | textarea | non | — | — |
| Combien comptez-vous brasser une fois le projet lancé en vente et en bénefice | `chp14` → `zone14bsp` | textarea | non | — | — |
| Quel est le processus de cette activité | `chp15` → `zone15bsp` | textarea | non | — | — |
| A combien quantifiez-vous l'ensemble des charges | `chp16` → `zone16bsp` | textarea | non | — | — |
| Quels sont les composantes de votre chiffre d'affaires | `chp17` → `zone17bsp` | textarea | non | — | — |
| Quelle est la repartition de votre chiffre d'affaire | `chp18` → `zone18bsp` | textarea | non | — | — |
| Quels sont les éléments environnementaux qui vous confortent dans votre projet | `chp19` → `zone19bsp` | textarea | non | — | — |
| Quelle sera votre stratégie d'attaque | `chp20` → `zone20bsp` | textarea | non | — | — |
| Quel est le devis chiffré de votre besoin | `chp21` → `zone21bsp` | textarea | non | — | — |
| Quel sera votre apport | `chp22` → `zone22bsp` | textarea | non | — | — |
| Quel est le niveau de réalisation de votre projet | `chp23` → `zone23bsp` | select | 0 % à 100 % (pas 1) | — | — |
| Quels sont les difficultés dans la réalisation de votre projet | `chp24` → `zone24bsp` | textarea | non | — | — |
| Quel est votre planning d'exécution du projet | `chp25` → `zone25bsp` | textarea | non | — | — |
| Quelles sont les difficultés à venir aux quelles vous pourrez êtres confrontés | `chp26` → `zone26bsp` | textarea | non | — | — |
| Etat fiche: (G+Act, modification) | `chp29` → `zone29bsp` | select | 1..3 (Non traité, Autorisé, Supprimé) | — | — |
| (création) | `zone27bsp` référence `BSP…`, `zone28bsp` date | auto | | Unicité : 1 business plan par membre | « Fiche de business plan du membre est déja enregistrée. » |

- **Actions** : boutons « Sauvegarder » (vert) et « Envoyer » (rouge) — **traitement strictement identique** (aucune différence de statut ni d'envoi). Création : état 2 (publié). Messages : « Enregistrement effectué. » / « Modification effectuée. » (⚠ affiché deux fois).
- **Bugs à ne pas reproduire** : message de fin en double ; pas de contrôle serveur de propriété sur `opt=2` ; icône « Nouveau » affichée alors qu'une fiche existe ; troncature de référence (§1.7).

### S5-5 Partenariat & Troc
- **Fichiers** : liste `incl-choix5C.php`, fiche `incl-partenariat.php`. **URL** : liste `?insc=0&opt=0&opaf=3` ; création `?insc=2&opt=1&opaf=3` ; fiche `?iptn={id}&opt=2&insc=2&opaf=3`.
- **Accès** : V = liste des fiches **état 2** en lecture (pas de lien) ; C = toutes les fiches (tous états, y compris supprimées) + lien fiche ; création Ma/M ; modification auteur ou G ; état G+Act (modification) ; intéressement : Ma/M non auteurs.
- **Liste** : recherche `cht01` (title « Recherche un mot dans la recherche et objectif du partenariat », LIKE sur description OU recherche OU objectif) ; compteur « n Partenariats » (G) ; note « Pour afficher une fiche de partenariat, veuillez Cliquer sur RECHERCHE. » (C) ; chaque carte : « ACTIF : » + actif ; « RECHERCHE : » (lien fiche pour C) + texte ; « OBJECTIF : » + texte ; tri date décroissante ; pagination 50.

| Libellé affiché | Champ → colonne | Contrôle | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|
| Référence: (modification) | `chp02` → `referenceptn` | lecture seule | auto | préfixe `PTR` | — |
| Date: (modification) | `chp03` → `dateptn` | texte (modifiable par auteur/G mais **jamais enregistré** en UPDATE) | auto | date du jour à la création | — |
| Auteur: | `chp01` → `indexmbr` | select à une seule option (membre auteur) | auto | = connecté à la création | — |
| Actif: | `chp04` → `actifptn` | texte 50, maxlength 50 | oui | longueur < 5 | « Veuillez saisir l'actif avec 3 caractères minimum. » (⚠ message dit 3, règle = 5) |
| Description: | `chp05` → `descriptptn` | textarea 3×60 | non | — | — |
| Recherche: | `chp06` → `rechercheptn` | textarea 3×60 | non | — | — |
| Objectif: | `chp07` → `objectifptn` | textarea 3×60 | non | — | — |
| Etat fiche: (G+Act, modification) | `chp08` → `etatptn` | select 1..3 | — | défaut 2 | — |
| — | — | — | — | Unicité sur l'actif (création) | « Ce recherche de partenariat & troc est déjà enregistré. » |

- Champs en lecture seule et pas de bouton pour les non-auteurs non-G. Boutons « Enregistrer » + « Annuler » (reset).
- **Après enregistrement** : message « Votre recherche de partenariat & troc a bien été enregistrée » (création comme modification), formulaire masqué, seul le lien « Retour liste des recherches de partenariat & troc ? » reste.
- **Intéressement** (Ma/M non auteur, fiche ouverte) : label vert « Intéressement », textarea 2×60 (`chp30`, autofocus), lien « Retour liste des recherches de partenariat & troc ? », bouton « Enregistrer intéressement ». Règles : longueur < 5 → « Intéressement doit avoir 5 caractères minimum. » ; anti-doublon → « Opération déjà effectuée. » ; succès → « Votre Intéressement est pris en compte ». Écriture : INSERT `besoin` (`typebsn=6`, `indexptn`, membre, date, texte, `interesebsn=2`, `etatbsn=2`) ; `partenariat` inchangé.
- **Liste des intéressements** (sous la fiche pour auteur/G, sous le formulaire pour les autres) : date + texte, triés par date ; **nom de l'auteur non affiché**.
- **Bugs à ne pas reproduire** : recherche sans parenthèses (`A OR B OR C AND jointure AND état`) → produit cartésien et fuite des fiches non publiées aux visiteurs ; anti-doublon d'intéressement testé sur `indexhmn` (colonne RH) au lieu de `indexptn` → doublons possibles ; date modifiable mais ignorée ; incohérence 3/5 caractères.

---

## 3. Section 6 — Entreprises - Marchés (`choix6.php`)

### S6-0 Accueil de section et routage
- **URL** : `choix6.php?insc=0&opt=0` (sans `rere`) : 3 onglets `$arraymenuchoix6` : REPERTOIRE D'ENTREPRISE / COMPARATEUR DE PRIX / MARCHES ET PROJETS (n = projets état 2). Zone centrale vide, pas de publicités.
- **Routage** :
  - `rere=1` : liste `incl-choix6A.php` ; icône « Nouveau » pour **C** (G compris) → `?insc=2&opt=1&rere=1` → `incl-entreprise.php`.
  - `rere=2` : V → message « Il faut avoir un compte entreprise pour y avoir accès. » ; **Mm (catégorie morale, quel que soit le type de compte)** → formulaire `incl-prospective.php` affiché directement (pas de liste) ; **C non morale** → liste `incl-choix6B.php` ; clic sur une ligne → `incl-prospective.php` en consultation (`ippv1`).
  - `rere=3` : sous-onglets `$arraymenuchoix63` Marchés / Projets ; sans `mept` rien d'autre ; `mept=1` → `incl-choix6C1.php`, `mept=2` → `incl-choix6C2.php` ; icône « Nouveau » pour C quand `mept≠0` → `incl-marche.php` / `incl-projet.php`.
- Colonne « LES PUBLICITES » : onglets 1, 2 (liste) et 3 (si `mept`).
- ⚠ Le message « Il faut avoir un compte entreprise… » n'est montré qu'aux visiteurs : un membre physique connecté voit la liste (règle d'accès réelle : **consultation = tout connecté, saisie = personne morale**).

### S6-1 Répertoire d'entreprise — liste
- **Fichier** : `incl-choix6A.php`. **URL** : `?insc=0&opt=0&rere=1`.
- **Accès** : V = entreprises **état 2** uniquement, sans lien ni référence ; C = toutes (tous états), liens vers la fiche.
- **Formulaire de tri** (titre rouge « Formulaire de trie », POST `ajs=3`, bouton « OK ») :

| Placeholder / option vide | Champ | Contrôle | Filtre appliqué |
|---|---|---|---|
| Secteur d'activité | `cht01` | select `secteuractivite` (ordre libellé) | secteur **du domaine** de l'entreprise (`domaineactivite.indexsat`) |
| Domaine d'activité | `cht02` | select domaines groupés par secteur (`optgroup` en majuscules), ordre secteur puis domaine | `entreprise.indexdat` |
| Ville | `cht03` | select `ville` (ordre id) | `entreprise.indexvil` |
| Rechercher la description | `cht04` | texte, maxlength 15 (title « Mots à rechercher ») | LIKE sur `descriptent` |

- **Résultat** : compteur « n Entreprises » (G) ; note rouge « NB. Pour consulter une fiche d'une entreprise, Veuillez cliquer sur son nom ou référence » ; une carte par entreprise : nom (40 car.) + « (forme juridique) » en gras (lien pour C, title « Consultation ou Modification fiche ») ; « Secteur d'activité : » ; « Domaine d'activité : » ; pour C « Référence: » (lien, rouge) ; libellé d'état pour G ou auteur. Tri : secteur décroissant (id), puis nom. Jointures obligatoires domaine/secteur/ville (une entreprise sans domaine ou ville valide n'apparaît pas). Pagination 50.

### S6-2 Répertoire d'entreprise — fiche / formulaire
- **Fichier** : `incl-entreprise.php`. **URL** : création `?insc=2&opt=1&rere=1` ; fiche `choix6.php?ient={id}&opt=2&insc=2&rere=1`.
- **Accès** : création C ; modification auteur ou G (tout G) ; lecture seule pour les autres connectés (selects réduits à la valeur, pas de bouton, pas d'upload) ; état : G+Act (création **et** modification).
- **Compteur de visites** : chaque ouverture `opt=2` fait `nbvisiteent+1` et `datevisiteent=maintenant` (y compris pour l'auteur/G et après chaque enregistrement).
- **Pré-remplissage à la création** si le connecté est une personne morale : nom = `nomprenmbr`, téléphone, mail, adresse, ville du membre ; ⚠ **bug** : domaine ← `sexembr` et forme juridique ← `situatmatrimmbr` (mauvaises colonnes) → à remplacer par `membre.indexdat` et une forme vide.
- Liens « Retour liste entreprises ? » (haut et bas).

| Libellé affiché | Champ → colonne | Contrôle | Options | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|---|
| Référence: (modification) | `chp02` → `referenceent` | lecture seule | — | auto | préfixe `ENT` | — |
| Auteur: (auteur/G) | `chp01` → `indexmbr` | select 1 option | — | auto | — | — |
| (secteur) | `chp03` → `indexsat` | **caché** (0 à la création) | — | — | contrôle `chp03<0` jamais vrai | (« Veuillez indiquer le secteur d'activité. » inatteignable) |
| Domaine d'activité: | `chp04` → `indexdat` | select groupé par secteur, option vide | — | oui | `=0` | « Veuillez indiquer le domaine d'activité. » |
| Nom entreprise: | `chp05` → `noment` | texte 40, maxlength 35 | — | oui | longueur ≤ 3 | « Le nom de l'entreprise doit avoir plus de 2 caractères. » (⚠ règle réelle ≥ 4) |
| Forme juridique: | `chp06` → `formeent` | select | 0 « », SA, SARL, SARLU, SAU, ETS, EI, SCI, Association, Fondation | oui | `=0` | « Veuillez indiquer la forme juridique de l'entreprise. » |
| Capital: | `chp07` → `capitalent` | numérique, milliers espacés, maxlength 20 | — | non | — | — |
| Description: | `chp08` → `descriptent` | textarea 3×60 | — | non | — | — |
| (commentaire) | `chp09` → `commentent` | caché (UI commentée) | — | — | ⚠ valeur non quotée → tronquée au 1er espace à chaque UPDATE | — |
| Gérant: | `chp10` → `gerantent` | texte, maxlength 35 | — | non | — | — |
| Téléphone: | `chp11` → `phoneent` | numérique, maxlength 9 | — | non | aucune (pas de `phone()`) | — |
| Mail: | `chp12` → `mailent` | texte, maxlength 30 | — | non | — | — |
| site: | `chp13` → `siteent` | texte, maxlength 30 | — | non | — | — |
| Adresse: (title « Adresse complète. (Ex: 59 rue Bétou - Moungali - Brazzaville) ») | `chp14` → `adresseent` | texte 100, maxlength 125 | — | non | — | — |
| Ville: | `chp15` → `indexvil` | select villes, option vide | — | oui | `=0` | « Veuillez indiquer la ville ou est située l'entreprise. » |
| Etat fiche: (G+Act) | `chp16` → `etatent` | select 1..3 | défaut 2 | — | — | — |
| Date inscription: / Date et nombre visite: (modification) | `chp17/18/19` | lecture seule (jj-mm-aaaa hh:mm:ss, nombre) | — | — | — | — |
| Image de l'entreprise: (auteur/G) | `monfichier` → `../image/ig/ent{id}.jpg` | fichier | — | non | §1.9 | « Image trop grande. Veuillez la réduire ou changer. » |
| — | — | — | — | — | Unicité (secteur caché + nom) à la création | « Cette entreprise est déjà enregistrée. » |

- **Actions** : « Enregistrer » + « Annuler » (reset). INSERT (état 2 par défaut, date d'inscription) / UPDATE (tous champs sauf date). Messages « Enregistrement effectué. » / « Modification effectuée. ». Photo affichée en vignette (zoom) en modification.
- **Bugs à ne pas reproduire** : mauvais pré-remplissage personne morale ; secteur jamais saisi qui fragilise l'unicité (utiliser le secteur déduit du domaine, unicité nom + domaine à arbitrer) ; message « plus de 2 caractères » ; troncature du commentaire ; visite comptée pour l'auteur ; upload sans contrôle de type ; aucune limite du nombre d'entreprises par membre (⚠ Ambigu : à confirmer).

### S6-3 Comparateur de prix — liste (consultation)
- **Fichier** : `incl-choix6B.php`. **URL** : `?insc=0&opt=0&rere=2`.
- **Accès** : C **non morale** (G/Ma/M de catégorie physique). V : message « Il faut avoir un compte entreprise pour y avoir accès. ». Mm : ne voit jamais cette liste (formulaire direct, S6-4).
- **Tri** (titre « Formulaire de trie », bouton « OK ») : select `cht01` « Produit » (tous les `produitprospective`, ordre nom). Un champ caché `cht02` (vide) est prévu pour « client/fournisseur » mais inutilisé (la colonne visée `clientfournisseur` n'existe pas).
- **Affichage** : tableau à 2 colonnes « Offre » (fond vert clair, `offredemandeppv2=1`) et « Demande » (fond vert foncé, `=2`) ; chaque ligne = nom de l'entreprise (lien title « Consultation ou Modification fiche » → `?ippv1={id}&rere=2&mept=&opt=2&insc=2`) + prix (milliers espacés) ; tri par nom de produit. ⚠ Le nom du produit n'est pas affiché (seulement entreprise + prix) ; le filtre `etatptpv=2` n'est appliqué qu'aux visiteurs (qui n'ont pas accès) ; aucun filtre sur `etatppv2`/`etatent`. Pagination sur la colonne Offre seulement.
- ⚠ **Bug de donnée majeur** : l'entreprise affichée est celle dont `indexent` = `prospective1.indexent`, or le code actuel y enregistre **l'id du membre** (voir S6-4) → le nom affiché est celui d'une entreprise sans rapport (ou rien). Le dump contient les deux formes (une ligne avec un vrai id entreprise, une avec l'id membre). À corriger : rattacher la fiche au membre (personne morale) ou à son entreprise, et migrer les données en conséquence.

### S6-4 Comparateur de prix — fiche offres/demandes de l'entreprise
- **Fichier** : `incl-prospective.php`. **URL** : Mm : `?insc=0&opt=0&rere=2` (forcé en `insc=2&opt=1`) ; consultation depuis la liste : `?ippv1={id}&rere=2&opt=2&insc=2` ; suppression d'une ligne : `?ippv2={id}&rere=2&chp10={1|2}&opt=2&insc=2&dlte=1`.
- **Accès** : Mm = sa propre fiche (création de lignes) ; C non morale via lien de liste = fiche d'un autre (⚠ **peut aussi ajouter et supprimer des lignes**, aucun contrôle) ; envoi de mail = **G uniquement**, en consultation (`opt=2`).
- **En-tête** (lecture seule, tiré de la table `membre` du propriétaire, pas de `entreprise`) : Dénomination sociale (`nomprenmbr`), Sigle (`pseudombr`), Adresse, Téléphone, Mail. Lien « Retour Liste des prospectives ? » (C, haut et bas).
- **Bascule Offre / Demande** : deux boutons « Offre » (title « Offre produit ») et « Demande » (title « Demande produit ») ; le bouton actif est mis en évidence ; tant qu'aucun n'est choisi (`chp10=0`) ni la saisie ni la liste n'apparaissent.
- **Saisie d'une ligne** (après choix Offre/Demande) : texte vert « Si votre produit ne figure pas dans la liste, veuillez tapez son nom. » ; tableau :

| Libellé (en-tête) | Champ → colonne | Contrôle | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|
| Nom produit | `chp11` → `indexptpv` | select `produitprospective` (title « Produit. Si votre produit ne figure pas dans la liste, merci de nous contacter. ») | l'un des deux | `chp11=0` ET longueur(`chp12`) < 6 | « Veuillez indiquer le type produit. » |
| (sous le select) | `chp12` → nouveau `produitprospective.nomproduitptpv` | texte 62, maxlength 50, placeholder « Tapez le nom du produit ne figurant pas dans la liste » | | si select vide et nom saisi : recherche par nom exact, sinon **création** du produit (état 2) | — |
| Unité | `chp13` → `unitemesureppv2` | texte libre, maxlength 25 (title « Unité de vente ») | oui | vide | « Veuillez indiquer l'unité de vente. » |
| Prix | `chp14` → `prixppv2` | numérique, maxlength 12 (title « Prix en francs cfa ») | oui | `=0` | « Veuillez indiquer le prix. » |
| Quantité mensuelle | `chp15` → `volumeppv2` | numérique, maxlength 12 | non | — | — |
| Client-Fournisseur | `chp16` → `fournisseurclientppv2` | texte, maxlength 50 (title « Fournisseur ») | non | — | — |
| (type) | `chp10` → `offredemandeppv2` | caché (1 Offre, 2 Demande) | | | |

  - Boutons « Enregistrer » + « Annuler » (reset). Si le select ET le texte sont renseignés, le select l'emporte.
  - Effets : création de l'en-tête `prospective1` (1 par `indexent`) s'il n'existe pas — ⚠ `indexmbr` **et** `indexent` reçoivent l'id du membre ; INSERT `prospective2` (pas d'anti-doublon ; `etatppv2` par défaut 2) ; message « Enregistrement effectué. » ; on reste sur le même type (Offre/Demande).
- **Liste des lignes** (sous le formulaire) : note rouge « NB. Pour supprimer un produit de la liste, veuillez cliquer sur X. » ; tableau (en-tête vert) Nom produit | Unité | Prix | Quantité mensuelle | Client-Fournisseur | X (title « Annulation ») ; tri par nom de produit ; pagination 50. Suppression = **DELETE physique** de la ligne.
  - ⚠ **Bug majeur** : la requête ne filtre pas sur la fiche courante → la liste affiche les offres (ou demandes) de **toutes** les entreprises, chacune avec son X de suppression. La cible : n'afficher que les lignes de la fiche, suppression réservée au propriétaire (et G).
- **Mail à l'entreprise** (G, consultation) : textarea « Message mail » 5×80 (`chp20`) + bouton « Envoyer » ; destinataire caché = mail du membre propriétaire (`chp21`). Validation : longueur < 10 → « Le message doit avoir 10 caractères minimum. » ; adresse vide ou sans « @ » (après la 1re position) → « Veuillez vérifier l'adresse mail de l'entreprise. ». Sujet « Proposition des produits ». Aucune trace en base.
- **Bugs à ne pas reproduire** : `indexent` = id membre ; liste non filtrée + suppression globale ; aucune vérification de propriétaire ; bascule Offre/Demande obligatoire avant tout affichage (conserver l'ergonomie mais afficher les deux listes) ; `arrayunitemesure` (Unité, Dizaine, Douzaine, Kilogramme, M3) existe mais la saisie est libre (⚠ Ambigu : liste fermée ou libre ?).

### S6-5 Marchés et projets › Marchés — liste
- **Fichier** : `incl-choix6C1.php`. **URL** : `?insc=0&opt=0&rere=3&mept=1`.
- **Accès** : V = marchés état 2, sans lien ; C = tous états, lien fiche.
- **Tri** (« Formulaire de trie », « OK ») : `cht01` select « Privé - Public » (1 Privé, 2 Public = `$arrayconfidence`, filtre `typemch`) ; `cht02` « Montant minimum » (numérique, maxlength 19, filtre `montantmch >= valeur`) ; `cht03` « Mots à rechercher sur description » (maxlength 15, LIKE sur libellé OU description OU dossier).
- **Cartes** : « Numéro marché {Privé|Public} : » + numéro d'appel d'offre (rouge, lien pour C) ; « Libellé: » (80 car.) ; « Montant: » + « FCFA » ; « Maitre d'ouvrage: » (80 car.) ; état (G ou auteur). Compteur « n Marchés » (G) ; note « NB. Pour consulter une fiche d'un marché, Veuillez cliquer sur son numéro d'offre du marché ». Tri référence décroissante. Pagination 50.
- ⚠ Recherche texte sans parenthèses (OR mêlés aux conditions de jointure/état) : ne pas reproduire.

### S6-6 Marchés — fiche / formulaire
- **Fichier** : `incl-marche.php`. **URL** : création `?insc=2&opt=1&rere=3&mept=1` ; fiche `?imch={id}&opt=2&insc=2&rere=3&mept=1`. Liens « Retour liste marchés ? ».
- **Accès** : création C (G compris) ; modification auteur ou G ; état G+Act ; lecture seule sinon (le select « Type marché » reste modifiable mais sans bouton). Aucun compteur de visites.

| Libellé affiché | Champ → colonne | Contrôle | Options | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|---|
| Auteur: (auteur/G) | `chp01` → `indexmbr` | select 1 option | — | auto | — | — |
| Référence: (modification) | `chp02` → `referencemch` | lecture seule | — | auto | préfixe `MCH` | — |
| Numero d'appel offre: | `chp03` → `numerooffremch` | texte 30, maxlength 20 | — | oui | longueur ≤ 3 | « Veuillez indiquer le Numéro d’appel d’offre. » |
| Type marché: | `chp04` → `typemch` | select | 1 Privé, 2 Public | oui | `=0` (inatteignable) | « Veuillez indiquer marché privé ou public. » |
| Libellé: | `chp05` → `libellemch` | texte 63, maxlength 125 | — | oui | longueur ≤ 3 | « Veuillez indiquer le libellé du marché. » |
| Description du marché: | `chp06` → `descriptionmch` | textarea 3×60 | — | non | — | — |
| Montant marché: | `chp07` → `montantmch` | numérique milliers espacés, maxlength 19 | — | oui | ≤ 0 | « Veuillez indiquer le montant du marché. » |
| Délai de souscription: | `chp08` → `delaimch` | date (calendrier en création seulement) | — | non | — | — |
| Dossier à fournir: | `chp09` → `dossiermch` | textarea 3×60 | — | non | — | — |
| Lieu de dépôt: | `chp10` → `lieudepotmch` | texte, maxlength 120 | — | non | — | — |
| Adresse mail: | `chp11` → `adressemailmch` | texte, maxlength 120 | — | non | aucune | — |
| Maitre d'ouvrage: | `chp12` → `maitreouvragemch` | texte, maxlength 120 | — | non | — | — |
| Publier par: | `chp13` → `publierparmch` | texte, maxlength 120 | — | non | — | — |
| Bénéficiaire: | `chp14` → `beneficiairemch` | texte, maxlength 120 | — | non | — | — |
| Etat fiche: (G+Act) | `chp15` → `etatmch` | select 1..3 | défaut 2 | — | — | — |
| — | — | — | — | — | Unicité du numéro d'appel d'offre (création seulement) | « Ce marché est déjà enregistré. » |

- **Actions** : « Enregistrer » + « Annuler ». Message unique « Opération effectuée avec sucés » (création et modification). UPDATE sans contrôle d'unicité du numéro (doublons possibles) → à corriger.

### S6-7 Marchés et projets › Projets — liste
- **Fichier** : `incl-choix6C2.php`. **URL** : `?insc=0&opt=0&rere=3&mept=2`.
- **Accès** : V = projets état 2 sans lien ; C = tous, lien fiche.
- **Tri** : `cht01` « Mots à rechercher » (maxlength 15) → LIKE sur libellé OU objet OU description (⚠ sans parenthèses, cf. §1.4).
- **Cartes** : « Référence projet: » (lien pour C) ; « Promoteur: » ; « Objet: » ; « Libellé: » (80 car.) ; « Durée: » n « mois » ; état (G ou auteur). Compteur « n Projets » (G) ; note « NB. Pour consulter une fiche d'un projet, Veuillez cliquer sur sa référence ». Tri référence décroissante. Pagination 50.

### S6-8 Projets — fiche / formulaire
- **Fichier** : `incl-projet.php`. **URL** : création `?insc=2&opt=1&rere=3&mept=2` ; fiche `?ipjt={id}&opt=2&insc=2&rere=3&mept=2`. Liens « Retour liste projets ? ».
- **Accès** : création C ; modification auteur ou G (tout G) ; état G+Act.

| Libellé affiché | Champ → colonne | Contrôle | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|
| Membre: (auteur/G) | `chp01` → `indexmbr` | select 1 option | auto | — | — |
| Référence: (modification) | `chp02` → `referencepjt` | lecture seule | auto | préfixe `PJT` | — |
| Responsable: | `chp03` → `responsablepjt` | texte, **maxlength 20** | oui | longueur ≤ 3 | « Veuillez indiquer le responsable du projet. » |
| Promoteur: | `chp04` → `promoteurpjt` | texte, maxlength 20 | oui | longueur ≤ 3 | « Veuillez indiquer le promoteur du projet. » |
| Objet du projet: | `chp05` → `objetpjt` | texte, maxlength 20 | oui | longueur ≤ 3 | « Veuillez indiquer l'objet du projet. » |
| Libellé: | `chp06` → `libellepjt` | texte, maxlength 20 | oui | longueur ≤ 3 | « Veuillez indiquer le libellé du projet. » |
| Objectif: | `chp07` → `objectifpjt` | texte, maxlength 20 | non | — | — |
| Description du projet: | `chp08` → `descriptionpjt` | textarea 3×60 | non | — | — |
| Adresse: | `chp09` → `adressepjt` | texte, maxlength 20 | non | — | — |
| Durée: | `chp10` → `dureepjt` | select 0..120 « mois » | oui | vide (inatteignable, 0 accepté) | « Veuillez indiquer la durée du projet. » |
| Date de lancement: | `chp11` → `datelancementpjt` | date (calendrier) | non | — | — |
| Conditions d’éligibilité: | `chp12` → `conditionpjt` | textarea 3×60 | non | — | — |
| Etat fiche: (G+Act) | `chp13` → `etatpjt` | select 1..3, défaut 2 | — | — | — |
| — | — | — | — | Unicité responsable + objet (création) | « Ce marché est déjà enregistré. » (⚠ libellé copié-collé : afficher « Ce projet est déjà enregistré. ») |

- **Actions** : « Enregistrer » + « Annuler » ; messages « Enregistrement effectué. » / « Modification effectuée. ». ⚠ `maxlength 20` sur des colonnes `text` : limite UI probablement involontaire (⚠ Ambigu, à arbitrer).

### S6-9 Écrans morts de la section 6 (à ne pas porter sans décision métier)
- « Réussite entrepreneuriale » (`incl-choix6B-Reussite.php` + `incl-reussite.php`) : ancien onglet 2, remplacé par « Comparateur de prix » ; table vide. Pour mémoire : fiche unique par membre (secteur obligatoire « Veuillez indiquer. le secteur d'activité. », projet ≥ 10 car. « Veuillez décrire votre projet avec 10 caractères minimum. », doublon « Cette fiche de Reussite du membre est déja enregistrée. », préfixe `RST`), champs « Ce que vous étiez avant », « Votre vision », « Votre projet », « Votre fond de démarrage », « Besoin réel pour le démarrage », « Stratégie mise en place », « Difficultés rencontrées », « Déploiement des efforts », « Succès rencontré », « Conseil ». ⚠ La migration précédente l'a réintroduit en 4e onglet : décision métier requise.
- `incl-formulaireentreprise.php`, `incl-choix6A-0000.php`, `incl-choix6A-0001.php` : voir §0.2.

---

## 4. Section 7 — Offres Financières (`choix7.php`)

### S7-0 Accueil de section, accès et routage
- **Onglets** `$arraymenuchoix7` : CONSEIL FINANCIER (`cgb=1`) / TRESORERIE (`cgb=2`) / BENCH MARKING (`cgb=3`). Sous-onglets : `cgb=1` → `$arraymenuchoix71` Conseil financier / Rumeurs Economiques / Accompagnement ; sous `recf=3`, un sous-menu vertical `$arraymenuchoix712` Business Plan / Projet Agricole / Restructuration de Crédit / Crédit immobilier (`bprc=1..4`). `cgb=2` → `$arraymenuchoix72` Placement / Opération Bancaire / Demande de Crédit / Contentieux (`podc=1..4`). `cgb=3` : pas de sous-onglet.
- **Visiteur** : message « Veillez-vous connecter pour y avoir accès. » affiché sur `cgb=1` (sans `recf`), `cgb=2`, `cgb=3`. ⚠ Sur `cgb=1&recf=n` le visiteur voit les sous-onglets et **aucun message** (incohérence à corriger : même message partout).
- **Connecté** (routage réel) :

| URL | Contenu haut de page | Contenu bas de page (mode `insc=0`) |
|---|---|---|
| `cgb=1` | — | rien |
| `cgb=1&recf=1|2` | formulaire `incl-conseilfinance.php` si `insc=2&opt≠0` | forum `incl-choix7A.php` |
| `cgb=1&recf=3` | — | sous-menu des 4 questionnaires seulement |
| `cgb=1&recf=3&bprc=1..4` | questionnaire `incl-acomp*.php` si `insc=2&opt≠0` | liste `incl-choix7A3.php` |
| `cgb=2` | — | rien |
| `cgb=2&podc=1..4` | **toujours** le fichier de saisie (`incl-placement/operationbanque/dmdcredit/contentcredit.php`) : icône « Nouveau » + formulaire si `opt=1|2` | liste `incl-choix7B.php` ; **G & podc=2** : `incl-choix7B1.php` |
| `cgb=2&podc=n&dlg=n` | idem | fil de dialogue `incl-dialogue.php` (à la place de la liste) ; ⚠ pour G & podc=2, c'est `incl-choix7B1.php` qui s'affiche (dialogue inaccessible) |
| `cgb=3` | — | `incl-choix7C.php` (consultation) ; `&bmg=1` → `incl-benchmarking.php` (saisie) |

- Colonne droite : vide en S7 (liste des derniers sujets commentée).

### S7-1 Conseil financier / Rumeurs Economiques — forum
- **Fichiers** : `incl-choix7A.php` (liste, fil, réponse, clôture) ; `incl-conseilfinance.php` (création/modification d'un sujet). **Table** `conseilfinance` (`typecsf` = `recf` : 1 Conseil financier, 2 Rumeurs Economiques ; la valeur 3 n'est jamais utilisée).
- **URL** : liste `?insc=0&opt=0&cgb=1&recf={1|2}` ; nouveau sujet `?insc=2&opt=1&cgb=1&recf=n&bprc=0` ; sujet (modif.) `choix7.php?icsf={id}&opt=2&insc=2&cgb=1&recf=n` ; fil `choix7.php?icsf={id}&opt=4&insc=0&cgb=1&recf=n`.
- **Icône « Nouveau »** (title « Nouveau Conseil financier » / « Nouvelle Rumeurs Economiques ») : G toujours ; Ma/M seulement s'ils n'ont **aucun sujet ouvert** (état < 3) de ce type, sinon texte rouge « Pour entamer un nouveau sujet, il faut clôturer le précédent. ».
- **Recherche** : `cht01` (placeholder « Rechercher », title « Tapez votre mot et cliquez sur OK ») → LIKE sur le texte.
- **Liste (sujets seulement, `sujetreponsecsf=1`)** :
  - Conseil financier, Ma/M : **tous** les sujets de tous les membres hors état 3, tri date croissante.
  - Conseil financier, G : sujets hors état 4 (⚠ inclut les supprimés, exclut les clôturés), tri date croissante.
  - Rumeurs, tous : sujets hors état 4 (⚠ inclut les supprimés), tri date décroissante.
  - Compteur « n Conseil financier » / « n Rumeurs Economiques » (G).
  - Chaque sujet : auteur (pseudo, sinon nom) visible seulement pour G, l'auteur lui-même, ou Master si le sujet est public (`confidencecsf=2`) — sinon blanc ; date ; « objet: » + objet (lien « Consultation ou Modification sujet » pour G, Master auteur, Master si public — ⚠ **un Membre ne peut pas rouvrir son propre sujet**) ; texte (toujours affiché, ⚠ même pour un sujet privé) ; lien vert « Voir les réponses a la question et Répondre » pour C si auteur, sujet public ou G.
- **Fil (`opt=4`)** : sujet encadré + toutes les réponses (même référence, même type, hors état 3), tri date croissante ; lien « Retour liste {rubrique} ? » (haut et bas) ; pour G, chaque réponse est un lien vers sa modification.
  - **Formulaire de réponse** (si le sujet n'est pas à l'état 3) : label vert « Réponse: », textarea 3×130 (`chp06`) ; boutons « Enregistrer réponse », « Annuler » (retour liste), et pour Conseil financier seulement « Clôture sujet ».
  - Validation : longueur < 2 → « L'objet du conseil doit avoir 2 caractères minimun. » (⚠ libellé à corriger : « La réponse… ») ; texte identique déjà existant (toutes rubriques) → « Ce message est déjà envoyé. ».
  - Effets : INSERT réponse (`sujetreponsecsf=2`, même référence, objet vide, auteur = connecté, état 2, `confidencecsf` = **recf** (⚠ bug : la confidentialité reçoit le n° de rubrique), `typecsf=recf`, `auteursujetcsf` = auteur du sujet) ; `nbreponsecsf+1` sur le sujet.
  - « Clôture sujet » : `etatcsf=4` sur le sujet — ⚠ possible par **n'importe quel connecté** voyant le fil (pas seulement l'auteur/G).
  - Si sujet état 3 : bandeau « Sujet clôturé » (⚠ confusion : un sujet **clôturé (4)** reste ouvert aux réponses, un sujet **supprimé (3)** est présenté comme « clôturé »).
- **Formulaire sujet** (`incl-conseilfinance.php`) : lien « Retour liste {rubrique} ? » ; en modification Référence + Date (lecture seule).

| Libellé | Champ → colonne | Contrôle | Oblig. | Validation (réelle) | Message exact |
|---|---|---|---|---|---|
| Objet: | `chp04` → `objetcsf` | texte 83, maxlength 120 | voulu | ⚠ contrôle conditionné à `chp01==1` (référence) → **jamais exécuté** | « L'objet du conseil doit avoir 2 caractères minimun. » |
| Texte: | `chp06` → `textecsf` | textarea 5×80 | voulu | idem, jamais exécuté | « Le texte doit avoir 2 caractères minimun. » |
| Etat fiche: (G+Act ou auteur, modification) | `chp07` → `etatcsf` | select 1..4 (dont Clôturé) | — | défaut 2 | — |
| (cachés) | `chp09` confidentialité = recf (1 Privé pour Conseil financier, 2 Public pour Rumeurs) ; `chp10` type = recf ; `chp02` = 1 (sujet) | | | Doublon : même objet existant → refus **sans message** (bloc ERREURS vide) | — |

  - Boutons « Enregistrer » + « Annuler » visibles en création, et en modification pour G+Act ou l'auteur. Création : référence `CFR…`, état 2, `auteursujetcsf` non renseigné. Modification : objet, texte, état, confidentialité. Messages « Enregistrement effectué. » / « Modification effectuée. ».
- **Règle métier implicite** : Conseil financier = échange privé membre ↔ la frangine (sujet créé « Privé »), Rumeurs = public. ⚠ Ambigu : la visibilité réelle ne respecte pas cette intention (tous les membres voient tous les textes) → à confirmer.

### S7-2 Conseil financier › Accompagnement — liste des dossiers
- **Fichier** : `incl-choix7A3.php`. **URL** : `?insc=0&opt=0&cgb=1&recf=3&bprc={1..4}`.
- **Accès** : C. Icône « Nouveau {type} » (`$arrayaccompagnement` : Business Plan, Projet Agricole, Restructuration de Crédit, Crédit immobilier) pour tout connecté → `?insc=2&opt=1&cgb=1&recf=3&bprc=n`.
- Bandeau vert avec le nom du type ; recherche `cht01` (LIKE sur l'objet `zone03`) ; compteur « n {type} » (G) ; note « NB. Pour consulter une fiche d'un accompagnement, Veuillez cliquer sur sa référence ».
- Tableau Référence (lien → `choix7.php?ibprc={id}&opt=2&insc=2&cgb=1&recf=3&bprc=n`) | Date (jj-mm-aaaa) | Objet (100 car.). **Filtre état = 2 uniquement** ; G voit tous les membres, Ma/M leurs seuls dossiers ; aucun tri explicite ; pagination 50.
- Code mort dans ce fichier : lien « Ecrire à la frangine » (condition `podc>=3` jamais vraie en `cgb=1`) et formulaire « Réponse » (`opt=4`, jamais atteint).

### S7-3 Questionnaires d'accompagnement — comportement commun (4 fichiers `incl-acomp*.php`)
- **Tables** : `acompbusinesplan` (préfixe **ABP**), `acompprojetagricol` (**APA**), `acomprestructcredit` (**ARC**), `acompcreditimmobil` (**ACI**) — présentes, 0 ligne.
- **Accès** : création C ; boutons visibles pour G ou l'auteur ; état : G+Act en modification (Crédit immobilier : G+Act aussi en création, libellé « Etat fiche » toujours affiché).
- **Mise en page** : bandeau vert (BUSINESS PLAN / PROJET AGRICOL / RESTRUCTURATION CREDIT / CREDIT IMMOBILIER) ; nom + sexe du membre ; vignette `../ic/mbr{id}.jpg` (G ou auteur) → fiche membre ; Référence + Date (lecture seule, modification) ; zone 03 « Objet » (texte 87, maxlength 125) ; puis une **textarea 2 lignes par question** (nom de champ `chp0{N}` : `chp04`…`chp09`, `chp010`…`chp080`, libellé = `$arrayaccomp…2[N]`), titres de section (`…0`, majuscules) et de sous-section (`…1`, majuscules, décalés à droite). Liens « Retour liste … ? » haut/bas (sauf pour G sur Business Plan).
- **Validation** : Objet < 10 caractères → « Veuillez indiquer l'objet avec 10 caractères minimum. » (seul champ contrôlé). Doublon (même membre + même objet) → « Fiche accompagnement business plan du membre est déjà enregistre. » / « Fiche accompagnement projet agricol du membre est déja enregistrée. » / « Fiche accompagnement restructuration de crédit du membre est déja enregistrée. » / « Fiche accompagnement crédit immobilier du membre est déja enregistrée. ».
- **Actions** : « Sauvegarder » et « Envoyer » → **même traitement** (INSERT, état 2, référence, date) ; seul le message diffère : « Vôtre accompagnement {business plan | de projet agricole | de restructuration de crédit | de crédit immobilier} est sauvegardé. » / « … est enregistré et envoyé. ». Aucun mail, aucune notification, aucun circuit de validation. Modification : « Modification effectuée. » (BP, RC) ou « Modification enregistrée. » (PA, CI).
- ⚠ **Bugs majeurs (ne pas reproduire)** :
  1. **Consultation vide** : la boucle d'affichage remet chaque réponse à vide (`$chp0A[$nbzone]=""`) → en ouverture d'un dossier existant, seules la référence, la date et l'objet sont affichés ; toutes les réponses 04..fin apparaissent vides.
  2. **Modification impossible** : l'id caché `chp00` est écrasé par le nom de champ `"chp058"` / `"chp080"`… → `UPDATE … WHERE index… = 'chp0NN'` ne touche aucune ligne. (Le bug `zone53←chp0A[43]` / `zone44←chp0A[54]` signalé par les dictionnaires est donc sans effet réel, mais ne doit pas non plus être reproduit.)
  3. Restructuration de crédit : la question 48 est **affichée mais jamais enregistrée** (INSERT/UPDATE s'arrêtent à 47).
  4. Message de fin affiché deux fois ; formulaire vierge ré-affiché après création (risque de doublon).
  5. Pas de contrôle de propriétaire en consultation (URL).

### S7-4 Questionnaire « Business Plan » (`bprc=1`, `incl-acompbusinesplan.php`, zones 03..58)
Libellés = `$arrayaccompbusinessplan2[N]` (orthographe d'origine conservée ; à corriger à l'affichage si souhaité). Colonne de stockage `zoneNNabp`, champ `chp0N`. « ↳ » = question affichée en retrait sous une sous-section.

| Zone | Section / sous-section | Question |
|---|---|---|
| 01 | (auto) | Référence `ABP…` |
| 02 | (auto) | Date de création |
| 03 | En-tête | Objet (obligatoire ≥ 10 car.) |
| 04 | **1. Idendification de l'entreprise et du promoteur** | Dénomination de l'entreprise |
| 05 | 1 | Historique |
| 06 | 1 | Forme juridique |
| 07 | 1 | Siège social |
| 08 | 1 | Nature d'activité |
| 09 | 1 | Lieu d'implantation |
| 10 | 1 | Montant du capital social |
| 11 | 1 | Composition du capital |
| 12 | 1 | Gérant statutaire de la société |
| 13 | 1 | Présentation des promoteurs ou actionnaires |
| 14 | **2. Environnement socio-économique** | Données générales sur le Congo |
| 15 | 2 | Secteur d'activitéé |
| 16 | 2 | Cadre institutionnel |
| 17 | 2 | Cadre environnemental |
| 18 | **3. Marché** | Définition des produits finis |
| 19 | 3 › *Le marché des produits finis* ↳ | Monde |
| 20 | 3 › *Le marché des produits finis* ↳ | Zone CEMAC |
| 21 | 3 | Caractéristique du marché congolais |
| 22 | 3 › *Structure de la consommation* ↳ | Monde |
| 23 | 3 › *Structure de la consommation* ↳ | Zone CEMAC |
| 24 | 3 › *Structure de la consommation* ↳ | Congo |
| 25 | 3 | Concurrence |
| 26 | 3 | Les prix |
| 27 | 3 | Conclusion |
| 28 | **4. Environnement de la zone du projet** | Localisation |
| 29 | 4 | Cadre géographique |
| 30 | 4 | Envioronnement économique |
| 31 | 4 | Acteurs majeurs de la production du produit fini ou service |
| 32 | **5. Description du projet** | Caractéristique générale |
| 33 | 5 | Justification |
| 34 | 5 | Site de réalisation du projet |
| 35 | 5 | Objectifs |
| 36 | 5 | Caractéristiques technique |
| 37 | 5 | Echéancier et implantation |
| 38 | 5 › *Organisation générale* ↳ | Approvisionnement de la matières premières |
| 39 | 5 › *Organisation générale* ↳ | Transformation et production des produits finis |
| 40 | 5 › *Organisation générale* ↳ | Planning de réalisation du projet |
| 41 | 5 › *Organisation générale* ↳ | Niveau de réalisation actuel du projet |
| 42 | 5 › *Organisation générale* ↳ | Besoin en matériel |
| 43 | 5 › *Organisation générale* ↳ | Besoin en ressources humaine |
| 44 | 5 › *Organisation générale* ↳ | Approche marketing |
| 45 | 5 › *Organisation générale* ↳ | Politique de publicité |
| 46 | 5 › *Organisation générale* ↳ | Définition des canaux de distribution et débouché |
| 47 | 5 › *Organisation générale* ↳ | Marché potentiel |
| 48 | 5 › *Organisation générale* ↳ | Prévision de vente |
| 49 | **6. Etudes financières** | Devis glabal du projet, |
| 50 | 6 | Programme détaillé des investissements |
| 51 | 6 | Financement du projet |
| 52 | 6 | Définition des moyens de financement |
| 53 | 6 | Cout du crédit |
| 54 | 6 | Bilan d'ouverture |
| 55 | 6 | Compte d'exploitation prévisionnel |
| 56 | 6 | Analyse des soldes intermédiaires de gestion et des ratios significative |
| 57 | 6 | Bilan prévisionnel |
| 58 | 6 | Tableau de financement |
| 59, 60 | — | Colonnes écrites vides, sans question (mortes) |

### S7-5 Questionnaire « Projet Agricole » (`bprc=2`, `incl-acompprojetagricol.php`, zones 03..80)
Libellés = `$arrayaccompprojetagricol2[N]`, colonnes `zoneNNapa`. Sections (`…0`) aux zones 4, 14, 18, 36, 72 ; sous-sections (`…1`) aux zones 19, 22, 25, 36, 48, 54, 66, 76 ; retrait annulé à la zone 45 et à la section 72.

| Zone | Section / sous-section | Question |
|---|---|---|
| 01 / 02 | (auto) | Référence `APA…` / Date |
| 03 | En-tête | Objet (obligatoire ≥ 10 car.) |
| 04 | **1. Identification de l'entreprise et du promoteur** | Dénomination de l'entreprise |
| 05 | 1 | Historique |
| 06 | 1 | Forme juridique |
| 07 | 1 | Siège social |
| 08 | 1 | Nature d'activité |
| 09 | 1 | Lieu d'implantation |
| 10 | 1 | Montant du capital social |
| 11 | 1 | Composition du capital |
| 12 | 1 | Gérant statutaire de la société |
| 13 | 1 | Présentation des promoteurs ou actionnaires |
| 14 | **2. Environnement socio-économique** | Données générales sur le Congo |
| 15 | 2 | Secteur agricole |
| 16 | 2 | Cadre institutionnel |
| 17 | 2 | Cadre environnement |
| 18 | **3. Marché** | Définition des produits finis |
| 19 | 3 › *Le marché des produits finis* ↳ | Monde |
| 20 | 3 › *Le marché des produits finis* ↳ | Zone CEMAC |
| 21 | 3 › *Le marché des produits finis* ↳ | Congo |
| 22 | 3 › *Structure de la consommation* ↳ | Monde |
| 23 | 3 › *Structure de la consommation* ↳ | Zone CEMAC |
| 24 | 3 › *Structure de la consommation* ↳ | Congo |
| 25 | 3 › *Caractéristique du marché congolais* ↳ | Production locale actuelle |
| 26 | idem ↳ | Etat de la demande |
| 27 | idem ↳ | Opportunités à saisir |
| 28 | idem ↳ | Mécanismes à mettre en place |
| 29 | idem ↳ | Coût de la mise en place du mécanisme |
| 30 | idem ↳ | La concurence |
| 31 | idem ↳ | Difficultés rencontrés par les concurents |
| 32 | idem ↳ | Stratégie pour surmonter les difficultés actuelles |
| 33 | idem ↳ | Prix du marché |
| 34 | idem ↳ | Clients potentiels |
| 35 | idem ↳ | Stratégie commerciale |
| 36 | **4. Description du projet** › *Contexte et justification* ↳ | Quelle localisation |
| 37 | idem ↳ | Quelle superficie |
| 38 | idem ↳ | Quelle culture |
| 39 | idem ↳ | La qualité de la terre |
| 40 | idem ↳ | La qualité de la production sur cette terre |
| 41 | idem ↳ | La qualité du grain semé |
| 42 | idem ↳ | Les engrains utilisés |
| 43 | idem ↳ | Qualité du grain récolte |
| 44 | idem ↳ | Justification |
| 45 | 4 | Site de réalisation du projet |
| 46 | 4 | Objectifs |
| 47 | 4 | Caractéristiques-échéancier et implantation |
| 48 | 4 › *Organisation générale* ↳ | Type de plan |
| 49 | idem ↳ | Organisation actuelle sur place |
| 50 | idem ↳ | La surveillance des champs |
| 51 | idem ↳ | L'arrosage ou irrigation |
| 52 | idem ↳ | Planning de réalisation du projet |
| 53 | idem ↳ | Niveau de réalisation actuel du projet |
| 54 | 4 › *Méthode de production* ↳ | Approvisionnement de la matière première |
| 55 | idem ↳ | Actifs disponibles (Tracteurs...) |
| 56 | idem ↳ | Approvisionnement en engrains, graines |
| 57 | idem ↳ | Besoin en ressources humaines |
| 58 | idem ↳ | Coût d'approvisionnement |
| 59 | idem ↳ | Transformation et production des produits finis |
| 60 | idem ↳ | Quel sera le produit fini |
| 61 | idem ↳ | Actifs disponibles (machine,...) |
| 62 | idem ↳ | Production escompté |
| 63 | idem ↳ | Quantité de matière première pour avoir la production de produits finis voulus |
| 64 | idem ↳ | Besoin en ressources humaines |
| 65 | idem ↳ | Coût de production du projet fini |
| 66 | 4 › *Mise en marché des produits* ↳ | Chiffre d'affaire attendu |
| 67 | idem ↳ | Approche marketing |
| 68 | idem ↳ | Politique de publicité |
| 69 | idem ↳ | Définition des canaux de distribution et débouché |
| 70 | idem ↳ | Marché potentiel |
| 71 | idem ↳ | Prévision de vente |
| 72 | **5. Etudes financières** | Devis global du projet |
| 73 | 5 | Programme détaillé des investissements |
| 74 | 5 | Définition des moyens de financement |
| 75 | 5 | Coût du crédit |
| 76 | 5 › *Analyse financière du projet* ↳ | Bilan d'ouverture |
| 77 | idem ↳ | Compte d'exploitation prévisionnel |
| 78 | idem ↳ | Analyse des soldes intermédiaires de gestion et des ratios significative |
| 79 | idem ↳ | Bilan prévisionnel |
| 80 | idem ↳ | Tableau de financement |

### S7-6 Questionnaire « Restructuration de Crédit » (`bprc=3`, `incl-acomprestructcredit.php`, zones 03..48)
Libellés = `$arrayaccomprestructcredit2[N]`, colonnes `zoneNNarc`. Sections aux zones 4, 22, 29, 39 ; sous-section à la zone 44 (retrait 3 %).

| Zone | Section / sous-section | Question |
|---|---|---|
| 01 / 02 | (auto) | Référence `ARC…` / Date |
| 03 | En-tête | Objet (obligatoire ≥ 10 car.) |
| 04 | **1. Historique et activites de la societe** | Historique de la société |
| 05 | 1 | Date de création |
| 06 | 1 | Développement progressif de la société |
| 07 | 1 | Evolution des activités |
| 08 | 1 | Patrimoine actuel |
| 09 | 1 | Activité actuelle |
| 10 | 1 | Client |
| 11 | 1 | Fournisseurs |
| 12 | 1 | Délais de règlement clients |
| 13 | 1 | Délais de règlement fournisseurs |
| 14 | 1 | Point de vente |
| 15 | 1 | Heures et dates d'ouverture |
| 16 | 1 | Nombre du personnel employé |
| 17 | 1 | Qualification du personnel |
| 18 | 1 | Réalisation déjà faite |
| 19 | 1 | Point sur vos actif |
| 20 | 1 | Prévision d'activité |
| 21 | 1 | Contrats existants et encours de négociation |
| 22 | **2. Historique du credit** | Objet du crédit |
| 23 | 2 | Modalités de remboursements |
| 24 | 2 | Anciennes prévisions d'entrées |
| 25 | 2 | Le remboursement du crédit devrait se faire de quelle manière |
| 26 | 2 | Point sur ce qui a été réalisé dans le cadre du projet |
| 27 | 2 | Point sur ce qui a été réalisé dans le cadre du remboursement de la dette |
| 28 | 2 | Historique du dossier. Pourquoi cette situation |
| 29 | **3. Objet du credit** | A quoi consitait le projet |
| 30 | 3 | Quel était le maitre d'oeuvre |
| 31 | 3 | Site du projet |
| 32 | 3 | Caractéristique du projet |
| 33 | 3 | Devis du projet réalisé |
| 34 | 3 | Part de financement sur fonds propre |
| 35 | 3 | Par de financement sur concours bancaire |
| 36 | 3 | Situation actuelle du projet |
| 37 | 3 | Quelle appréciation faite vous de la réalisation du projet |
| 38 | 3 | Description de vos actifs actuels |
| 39 | **4. Point sur la situation actuelle** | Difficultés rencontées. Pourquoi le nom remboursement |
| 40 | 4 | Solution entrevues pour y remédier |
| 41 | 4 | Comment l'entreprise compte s'organiser pour couvrir les échéanciers convenues |
| 42 | 4 | Expertise du bien |
| 43 | 4 | Situation du bien |
| 44 | 4 › *Point sur l'environnement du projet* ↳ | Contexte économique |
| 45 | idem ↳ | Les prix sur le marché |
| 46 | idem ↳ | La concurence |
| 47 | idem ↳ | Revenus attendus dans le cas d'une exploitation à plein regime ou normal |
| 48 | idem ↳ | Compte d'exploitation simplifié justifiant la situation actuelle — ⚠ **affichée mais jamais enregistrée** (à enregistrer dans `zone48arc`) |
| 49, 50 | — | Colonnes sans question (mortes) |

### S7-7 Questionnaire « Crédit immobilier » (`bprc=4`, `incl-acompcreditimmobil.php`, zones 03..38)
Libellés = `$arrayaccompcreditimmobil2[N]`, colonnes `zoneNNaci`. Sections aux zones 4 et 12 ; sous-section à la zone 25 ; retrait annulé à la zone 32.

| Zone | Section / sous-section | Question |
|---|---|---|
| 01 / 02 | (auto) | Référence `ACI…` / Date |
| 03 | En-tête | Objet (obligatoire ≥ 10 car.) |
| 04 | **1. Activite** | Historique et présentation de la société |
| 05 | 1 | Depuis la création de l'entreprise, quelels sont les réalisation de la société en termes de gestion ou acquisition du patrimoine |
| 06 | 1 | Détail du parc immobilier de la société |
| 07 | 1 | revenus généré dans l'exploitation de l'actif immobilier de la société |
| 08 | 1 | Etat récapitulatif du chiffre d'affaires et du résultat généré par l'activité de la société |
| 09 | 1 | Les associés, les dirigeants, leur moralité et leur expérience dans la matière |
| 10 | 1 | Le positionnement de la société dans le secteur par rapport à la concurrence |
| 11 | 1 | Moralité des dirigeants |
| 12 | **2. Financement et projet** | La société à d'autres immeubles mis en ploitation |
| 13 | 2 | Le financement demandé servira à quoi exactement |
| 14 | 2 | Situation du terrain et surperficie |
| 15 | 2 | Etat des lieux actuel |
| 16 | 2 | Quelle est la valeur du terrain |
| 17 | 2 | Le détail des sommes déjà engagées dans le cadre dudit projet |
| 18 | 2 | Niveau de réalisation actuel du projet |
| 19 | 2 | Dévis détaillé des travaux |
| 20 | 2 | Les différentes étapes d'évolution des travaux et leur financement |
| 21 | 2 | Date de début des travaux et planning de réalisation |
| 22 | 2 | Qui est le maitre d'ouvrage |
| 23 | 2 | Quel est le cabinet de contrôle |
| 24 | 2 | Description du projet |
| 25 | 2 › *Comment sera l'immeuble* ↳ | La conception des chambres (pour quel but) |
| 26 | idem ↳ | Le revêtement de la façade |
| 27 | idem ↳ | Le parking |
| 28 | idem ↳ | Disposition pour l'alimentation en eau et en éléctricité |
| 29 | idem ↳ | Les mesures de sécurité |
| 30 | idem ↳ | Les ascenceurs, les escaliers |
| 31 | idem ↳ | Le service de gardiennage et les concierges |
| 32 | 2 | La capacité du projet |
| 33 | 2 | Quelle sont les prévisions d'occupation (Négociation, lettre d'intention...) |
| 34 | 2 | Quel est le taux d'occupation actuel |
| 35 | 2 | revenus attendus dans le cas d'une exploitation à 70% |
| 36 | 2 | Quels sont les prix appliqués pa rapport à ceux du marché immobilier |
| 37 | 2 | Joindre un prévisionnnel d'exploitation (⚠ zone texte, aucun upload : ⚠ Ambigu, pièce jointe attendue ?) |
| 38 | 2 | Quelle est la stratégie commercial (⚠ exclue de l'UPDATE legacy) |
| 39, 40 | — | Colonnes sans question (mortes) |

### S7-8 Trésorerie — listes communes (`incl-choix7B.php`)
- **URL** : `?insc=0&opt=0&cgb=2&podc={1..4}`. **Accès** : C ; Ma/M voient leurs fiches, G toutes (sauf Opération bancaire → S7-11). Au-dessus de la liste : icône « Nouveau/Nouvelle {sous-onglet} » (fichier de saisie, voir S7-9..S7-13).
- **Filtre** : état = 2 uniquement (les fiches annulées disparaissent). Aucune recherche (formulaire commenté). Compteur « n {sous-onglet} » (G) ; note « NB. Pour consulter une fiche {sous-onglet}, Veuillez cliquer sur sa référence » ; pagination 50 ; aucun tri sauf Opération bancaire (id décroissant).
- **Colonnes** :

| podc | Colonnes | Lien fiche |
|---|---|---|
| 1 Placement | Référence · Date (jj-mm-aaaa) · Type (`$arrayplacement`) · Montant · Durée (« n M ») · Taux · Banques (noms des banques cochées séparés par « - ») · X | `?ipcm={id}&opt=2&insc=2&cgb=2&podc=1` |
| 2 Opération Bancaire (Ma/M) | Référence · Montant · Devise (`$arraydevise`) · Opération (`$arrayoperationbanque`, 15 car.) · Banque émettrice (nom libre stocké) · Banque bénéficiaire · X | `?iopb={id}&opt=2&insc=2&cgb=2&podc=2` |
| 3 Demande de Crédit | Référence · Date · Montant · Durée (« nMois ») · Niveau (« n% ») · Garantie · X | `?idct={id}&opt=2&insc=2&cgb=2&podc=3` |
| 4 Contentieux | Référence · Date · Montant dette (zone04) · Revenue Mensuel (zone07) · Charge Mensuelle (zone08) · Entrée Attendue (zone13) · Montant Echeance (zone16) · X | `?ictc={id}&opt=2&insc=2&cgb=2&podc=4` |

- **Annulation « X »** (title « Annulation », lien `…&opt=4&insc=0…`) : passe l'état à **3** pour Placement, Opération bancaire, Demande de crédit ; **sans confirmation**, sans contrôle de propriétaire. ⚠ Pour Contentieux, l'annulation **ne fait rien** (aucune requête prévue) alors que le X est affiché → à implémenter.
- Opération bancaire : jointure obligatoire sur la banque émettrice (`indexbqe` doit exister dans `banque`).
- Lien « Ecrire à la frangine » centré sous la liste → `?insc=0&opt=0&cgb=2&podc=n&dlg=n` (voir S7-14).
- Code mort : formulaire « Réponse: » / « Enregistrer Réponse » (`opt=4`, jamais atteint car `opt` remis à 0 après annulation).

### S7-9 Trésorerie › Placement (`incl-placement.php`, table `placement`)
- **URL** : création `?insc=2&opt=1&cgb=2&podc=1` ; fiche `?ipcm={id}&opt=2&insc=2&cgb=2&podc=1`. Liens « Retour liste placement ? » (haut et bas) ; si arrivée par le dialogue (`dlg=1`) : « Retour liste Placement ? ».
- **Accès** : création C ; bouton « Envoyer » pour G ou le propriétaire ; état : G (création et modification, options 0..3 dont vide) et Master sur ses propres fiches — ⚠ la condition legacy contient une **affectation** (`$imbr=$chp01`) : tout Master qui ouvre n'importe quel placement voit le select d'état ET le bouton d'enregistrement. À ne pas reproduire.

| Libellé | Champ → colonne | Contrôle | Options | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|---|
| Membre: (modification) | nom du membre | lecture seule | — | — | — | — |
| Référence: / Date: (modification) | `chp03` → `referencepcm` / `chp05` → `datepcm` | lecture seule | — | auto | préfixe `PCM`, date = maintenant | — |
| Placement: | `chp02` → `typepcm` | select (création ; **soumet le formulaire au changement**) ; lecture seule en modification | 0 « », 1 Dépôt à terme, 2 Investissement | oui | `=0` | « Indiquez le type de placement. » |
| Secteur d'activité: (si Investissement) | `chp04` → `sectactivpcm` | texte 85, maxlength 120 (title « Secteur d'activité à investir. ») | — | non | — | — |
| Montant: | `chp06` → `montantpcm` | numérique milliers espacés, maxlength 9 | — | oui | `=0` | « Veuillez indiquer le montant à placer. » |
| Durée: | `chp07` → `durepcm` | select 0..120 « Mois » | — | oui | `=0` | « Veuillez indiquer la durée du placement. » |
| Taux: | `chp08` → `tauxpcm` | numérique, maxlength 9 | — | oui | `=0` | « Veuillez indiquer le taux escompté. » |
| Banques: | `chp09{idbqe}` → `banquepcm` | cases à cocher, une par banque état 2 (ordre nom, 6 par ligne) | — | voulu | ⚠ contrôle jamais déclenché | « Veuillez indiquer la ou les banques. » |
| Observation: | `chp10` → `observpcm` | textarea 3×80 | — | non | — | — |
| Etat: (voir accès) | `chp11` → `etatpcm` | select 0..3 | défaut 2 | — | — | — |
| — | — | — | — | — | Doublon : même membre + même observation (création) | « Placement déjà effectué. » |

- **Stockage des banques** : chaîne de 21 positions séparées par « * » (position i = i si la banque d'id i est cochée, sinon 0) → seules les banques d'id 0..20 sont gérables. Modèle cible : relation N-N placement ↔ banque.
- **Actions** : bouton « Envoyer » (title « Enregistrer ») ; INSERT (état 2) → « Le placement est enregistré. » ; UPDATE (secteur, montant, durée, taux, banques, observation, état ; le type n'est pas modifiable) → « Modification effectuée. ». Aucun mail, aucun calcul d'intérêts.
- ⚠ Le changement de type recharge la page et **réinitialise** les autres champs saisis ; l'anti-doublon sur l'observation bloque un 2e placement sans observation. À revoir.

### S7-10 Trésorerie › Opération Bancaire — saisie et fiche (`incl-operationbanque.php`, table `operatbanq`)
- **URL** : saisie `?insc=2&opt=1&cgb=2&podc=2` ; fiche `?iopb={id}&opt=2&insc=2&cgb=2&podc=2`. Icône « Nouvelle Opération Bancaire ». Liens « Retour liste opération bancaire ? » ; si `dlg=2` : « Retour liste Opération Bancaire ? ».
- **Accès** : saisie C ; fiche : bouton « Enregistrer » pour G+Act ou propriétaire ; état : G (tout G) ; bouton « Envoyer Mail » : tout connecté.
- **Saisie en grille (création)** : tableau de **15 lignes** identiques (ordre de virement programmé), bouton unique « Envoyer ». Colonnes :

| En-tête | Champ (n = 1..15) → colonne | Contrôle | Options |
|---|---|---|---|
| DATE | `chp04n` → `date2opb` | date (calendrier) | — |
| MONTANT | `chp05n` → `montantopb` | numérique, maxlength 9 | — |
| DEVISE | `chp06n` → `deviseopb` | select | 0 « », FCFA, €, $, RMB |
| TYPE | `chp07n` → `typeopb` | select | 0 « », Rapatriement, Virement reçu, Versement, Transfert, Virement Emis, Retrait |
| BANQUE EMETTRICE | `chp08n` → `indexbqe` | select banques état 2 (ordre nom, **sans option vide** → 1re banque présélectionnée) | — |
| BANQUE EMETTRICE NON LISTEE | `chp09n` → `nombanqueemettriceopb` | texte, maxlength 120 | — |
| MAIL BANQUE EMETTRICE | `chp10n` → `mailbanqueemettriceopb` | texte, maxlength 120 | — |
| BENEFICIAIRE | `chp11n` → `beneficiaireopb` | texte, maxlength 120 | — |
| BANQUE BENEFICIAIRE | `chp12n` → `indexbanquebeneficiaireopb` | select banques état 2 | — |
| BANQUE BENEFICIAIRE NON LISTEE | `chp13n` → `nombanquebeneficiaireopb` | texte, maxlength 130 | — |
| ADRESSE BANQUE BENEFICIAIRE | `chp14n` → `adressebanquebeneficiaireopb` | texte, maxlength 120 | — |

  - **Règles par ligne** : ligne **ignorée silencieusement** si date vide, montant vide ou ≤ 0, devise = 0, type = 0 ou banque émettrice = 0. Banque sélectionnée d'id > 1 → son nom remplace le nom libre ; banque id 1 (= « Autres » dans le référentiel) + nom libre > 2 car. → nom libre conservé (même règle pour la banque bénéficiaire). Doublon (membre + date opération + montant + banque émettrice + bénéficiaire) → ligne ignorée.
  - **Effets** : INSERT `operatbanq` (état 2, `date1opb` = maintenant) ; **une seule référence `OPB…` générée pour tout le lot** (toutes les lignes d'une même saisie partagent la référence — constaté dans le dump) ; si un mail de banque émettrice est saisi : envoi d'un mail sujet « Programmation opérations bancaires », corps « SOCIETE : {nom membre} / DATE : {date} / OPERATION : {type} / MONTANT : {montant} / BANQUE EMETRICE : {nom} / BANQUE BENEFICIAIRE : {nom} ».
  - ⚠ Aucun message d'erreur ni de succès en création, formulaire vierge ré-affiché. À améliorer (retour ligne par ligne).
- **Fiche (modification)** :

| Libellé | Champ → colonne | Contrôle | Validation | Message exact |
|---|---|---|---|---|
| Membre: | nom | lecture seule | — | — |
| Référence: / Date demande: | `chp02` / `chp03` (`date1opb`) | lecture seule | — | — |
| Date opération: | `chp04` → `date2opb` | date | ⚠ **jamais enregistrée** par l'UPDATE | — |
| Montant: | `chp05` | numérique | `=0` | « Veuillez indiquer. le montant de la transaction. » |
| Devise: / Type: | `chp06` (1..4) / `chp07` (1..6) | selects | — | — |
| Banque émettrice: | `chp08` | select banques | id < 2 ET nom libre < 3 car. | « Veuillez indiquer la banque émettrice. » |
| Banque émettrice non listée: | `chp09` | texte, maxlength 130 | (voir ci-dessus) | — |
| Mail banque émettrice: | `chp10` | texte | — | — |
| Bénéficiaire: | `chp11` | texte | longueur < 3 | « Veuillez indiquer le nom du bénéficiaire. » |
| Banque bénéficiaire: | `chp12` | select banques | id < 2 ET nom libre < 6 car. | « Veuillez indiquer le nom et mail de la banque bénéficiaire. » |
| Banque bénéficiaire non listée: | `chp13` | texte | — | — |
| Adresse de la banque bénéficiaire: (title « Mail banque bénéficiaire ») | `chp14` | texte | — | — |
| Etat: (G) | `chp15` → `etatopb` | select 1..3 | — | — |

  - Boutons « Enregistrer » + « Annuler » (G+Act ou propriétaire). UPDATE sans message de succès (commenté). ⚠ Les champs ne sont pas en lecture seule pour les autres (variable non définie) mais le bouton est masqué. ⚠ Balise `</select>` manquante après « Banque bénéficiaire ».
- **« Envoyer Mail »** (fiche, tout connecté) : renvoie le même mail récapitulatif à `mailbanqueemettriceopb` (sans vérification de l'adresse) → message « Mail envoyé ». Aucune trace en base.

### S7-11 Trésorerie › Opération Bancaire — vue gestionnaire (`incl-choix7B1.php`)
- **URL** : `?insc=0&opt=0&cgb=2&podc=2` pour G (remplace la liste S7-8 et le dialogue).
- **Formulaire de tri** (« Formulaire de trie », « OK ») : `cht01`/`cht01A` « Date min » / « Date max » (calendrier ; filtre `date1opb` entre les deux, **les deux obligatoires** sinon ignorés) ; `cht02` « Banques » (select) — ⚠ **inopérant** (un champ caché homonyme vide l'écrase) ; `cht03` « Opération » (1..6) ; `cht04`/`cht04A` « Montant min » / « Montant max » (les deux obligatoires).
- **Affichage sans filtre de type** : 2 colonnes « Débit » / « Credit » ; pour chaque couple (Transfert↔Rapatriement, Virement Emis↔Virement reçu, Retrait↔Versement) : à gauche les opérations de type 4/5/6 (lien = nom banque émettrice, date, montant, nom du membre), à droite celles de type 1/2/3 (lien = nom banque bénéficiaire, date, montant, bénéficiaire). ⚠ Les **intitulés de groupe sont inversés** (la colonne Débit est titrée « RAPATRIEMENT / VIREMENT REÇU / VERSEMENT »).
- **Avec filtre de type** : un seul tableau (lien banque émettrice, date, montant, membre), tri date puis référence décroissantes.
- Aucun filtre d'état (les opérations annulées apparaissent), jointure obligatoire sur la banque émettrice, pas de pagination effective.

### S7-12 Trésorerie › Demande de Crédit (`incl-dmdcredit.php`, table `demandecredit`)
- **URL** : création `?insc=2&opt=1&cgb=2&podc=3` ; fiche `?idct={id}&opt=2&insc=2&cgb=2&podc=3`. Icône « Nouvelle Demande de Crédit ». Liens « Retour liste de demande de crédit ? » ; si `dlg=3` : « Retour liste Demande de Crédit ? ».
- **Accès** : création C ; bouton « Envoyer » : G ou propriétaire ; état : même règle (et même bug d'affectation) que Placement.

| Libellé | Champ → colonne | Contrôle | Options | Oblig. | Validation | Message exact |
|---|---|---|---|---|---|---|
| Membre: / Référence: / Date: (modification) | nom / `referencedct` / `datedct` | lecture seule | — | auto | préfixe `DDC`, date du jour | — |
| Devis: | `chp12` → `devisglobaldct` | textarea 3×80 (texte libre) | — | non | — | — |
| Apport sur fond propre: | `chp13` → `apportpropredct` | textarea 3×80 | — | non | ⚠ **affiche la valeur du devis** (bug) → la ré-enregistrer écrase l'apport | — |
| Montant: | `chp04` → `montantdct` | numérique milliers espacés, maxlength 15 | — | oui | `=0` | « Indiquez le montant du crédit. » |
| Objet: | `chp05` → `objetdct` | textarea 3×80 | — | oui | vide | « Veuillez indiquer l'objet. » |
| Durée: | `chp06` → `duredct` | select 0..120 « Mois » (title « Durée de remboursement ») | — | oui | `=0` | « Veuillez indiquer la durée de remboursement. » |
| Niveau réalisation: | `chp07` → `niveaurealisatdct` | select 0..100 % | — | non | — | — |
| Garantie: | `chp08` → `garantidct` | textarea 3×80 (title « La garantie proposée. ») | — | oui | vide | « Veuillez indiquer la garantie. » |
| Délai réponse: | `chp09` → `delaireponsedct` | select 0..366 « jours » (title « Le délai de réponse souhaité. ») | — | non | — | — |
| Observation et choix de banques: | `chp10` → `observdct` | textarea 3×80 | — | non | — | — |
| Etat: | `chp11` → `etatdct` | select 0..3 | défaut 2 | — | — | — |
| — | — | — | — | — | Doublon : même membre + même observation (création) | « Cette demande de crédit déjà effectuée. » |

- **Actions** : « Envoyer » ; messages « Vôtre demande de crédit est enregistrée. » / « Modification effectuée. ». Aucun envoi aux banques, aucun calcul (échéancier, taux).

### S7-13 Trésorerie › Contentieux (`incl-contentcredit.php`, table `contentcredit`, variante `$new=3` seule active)
- **URL** : création `?insc=2&opt=1&cgb=2&podc=4` ; fiche `?ictc={id}&opt=2&insc=2&cgb=2&podc=4`. Icône « Nouveau Contentieux ». Liens « Retour liste contentieux crédit ? » ; si `dlg=4` : « Retour liste Contentieux ? ».
- **Accès** : création C ; ⚠ boutons « Enregistrer » / « Envoyer » / « Annuler » affichés à **tout connecté** qui ouvre la fiche (aucun contrôle de propriétaire) ; état : G+Act (création et modification). En-tête : nom + sexe du membre, vignette (G ou propriétaire), Référence + Date en modification.
- **Formulaire** (chaque rubrique « Montant et Detail » = un montant numérique maxlength 12 + une textarea 2×80 de détail) :

| Libellé affiché | Montant → colonne | Détail → colonne | Validation | Message exact |
|---|---|---|---|---|
| Montant et Detail de la dette compromise | `chp04` → `zone04ctc` | `chp04A` → `zone04Actc` | montant ≤ 0 | « Veuillez indiquer. le montant de la dette compromise. » |
| Montant et Detail des revenus journaliers | `chp05` → `zone05ctc` | `chp05A` | — | — |
| Montant et Detail des revenus hebdomadaire | `chp06` → `zone06ctc` | `chp06A` | — | — |
| Montant et Detail des revenus mensuels | `chp07` → `zone07ctc` | `chp07A` | montant ≤ 0 | « Veuillez indiquer le montant des revenus mensuels. » |
| Montant et Detail des charges fixes mensuelles | `chp08` → `zone08ctc` | `chp08A` | — | — |
| Montant et Detail des charges variables mensuels | `chp09` → `zone09ctc` | `chp09A` | — | — |
| Activités encours | — | `chp10` → `zone10ctc` (textarea) | — | — |
| Entrées et Detail attendues sur activité encours | `chp11` → `zone11ctc` | `chp11A` | — | — |
| Activité prévisionnelle | — | `chp12` → `zone12ctc` | — | — |
| Entrées et Detail attendues sur activité prévisionnelle | `chp13` → `zone13ctc` | `chp13A` | — | — |
| Entrée et Detail attendues | `chp14` → `zone14ctc` | `chp14A` | — | — |
| Echéance crédit actuelle | — | `chp15` → `zone15ctc` (textarea) | — | — |
| Montant et Detail écheance capable à supporter | `chp16` → `zone16ctc` | `chp16A` | — | — |
| Quels sont les éléments environnementaux qui vous confortent dans votre projet | — | `chp17` → `zone17ctc` | — | — |
| Etat fiche: (G+Act) | `chp20` → `etatctc` (select 1..3, défaut 2) | | | |
| — | Doublon : même membre + même montant de dette (création) | | | « Ce contextieux de credit est déja enregistré. » |

- **Actions** : « Enregistrer » et « Envoyer » identiques ; « Annuler » = reset ; messages « Ce contentieux est enregistré. » / « Modification effectuée. ». Préfixe `CCT`, date = maintenant. Aucun calcul (capacité de remboursement = saisie). Branches `$new=1/2` = code mort.

### S7-14 Trésorerie — dialogue contextuel « Ecrire à la frangine » (`incl-dialogue.php`, table `dialogue`)
- **Principe** : un fil de messages par sous-onglet de Trésorerie : `typedlg` = `podc` (1 Placement, 2 Opération Bancaire, 3 Demande de Crédit, 4 Contentieux) ; destinataire 0 = « la frangine » (gestionnaires).
- **URL** : depuis la liste S7-8, lien « Ecrire à la frangine » → `?insc=0&opt=0&cgb=2&podc=n&dlg=n` ; réponse G → `?insc=0&opt=0&cgb=2&podc=n&imbrdlg={id membre}&dlg=1`.
- **Affichage** (remplace la liste) : recherche `cht01` (LIKE sur le texte) ; messages `typedlg=n`, état 2, tri date croissante, pagination 50.
  - Ma/M : leurs messages (bulle gauche, date grise) et les messages qui leur sont adressés (bulle décalée à droite) ; rien d'autre.
  - G : messages adressés à la frangine (destinataire 0) avec nom de l'auteur, texte, date et lien « Repondre » ; messages adressés à un membre avec le nom du destinataire (bulle droite).
- **Formulaire** (affiché seulement si `dlg=1` dans l'URL) : label vert « Message: » (+ « à {nom} » si destinataire), textarea 2×97 (`chp05`), bouton « Envoyer ». Validation : G sans destinataire → « Veuillez indiquer le destinataire du message. » ; longueur < 2 → « Votre message doit avoir 2 caractères minimun. ». INSERT `dialogue` (auteur, destinataire, `typedlg`, date, texte, état 2). Aucune notification, aucun mail.
- ⚠ **Bugs majeurs à ne pas reproduire** :
  1. Le lien membre pose `dlg=podc` : le formulaire n'apparaît donc **que pour Placement** (`podc=1`) ; en Opération bancaire / Demande de crédit / Contentieux le membre voit le fil mais **ne peut pas écrire**.
  2. La réponse du G est adressée au membre **id 1** (`$chp02 = isset($_GET['imbrdlg'])` = vrai = 1) au lieu du membre visé → le membre ne voit jamais la réponse.
  3. Pour G en Opération bancaire, le fil n'est pas accessible (liste S7-11 affichée à la place).
  Cible : fil de discussion par (membre, sous-onglet), écriture possible dans les 4 sous-onglets, réponse G au bon destinataire.

### S7-15 Bench Marking — consultation (`incl-choix7C.php`)
- **URL** : `?insc=0&opt=0&cgb=3`. **Accès** : C.
- Si le connecté est un membre « banque » (Mbq) : lien en gras « TRAITEMENT BENCH MARKING ? » → `?insc=0&opt=0&cgb=3&bmg=1` (S7-16).
- Select « Banque: » (onchange = soumission) listant les **membres** `banqboutqmbr=1` état 2 (pas la table `banque`) — ⚠ la sélection n'est **pas utilisée** par la requête.
- Tableau « Type & Opération » | « Tarif » : pour chaque type (`benchmarking1`, en gras) ses opérations (`benchmarking2`), tri type puis libellé ; tarif lu dans `benchmarking2.tarifbm2` — **colonne inexistante** → toujours vide. Tables vides en production : l'écran affiche un tableau vide.
- **Intention métier reconstituée** (cf. `incl-choix7C-1.php` mort et `pbenchmarking-2.php`) : comparer les tarifs des banques par opération — filtre par banque (liste des opérations avec le tarif de cette banque) ou par type d'opération (Banque | « type -> opération » | tarif). La cible doit reposer sur `benchmarking3` (tarif × banque).
- `$arraybenchmarking` (9 types : Opérations sur espèces, Virements, Chèques, Escompte d'effet, Encaissement d'effet, Opérations internationales, Principales conditions d'arretes et de tenues de compte, Placements, Services divers) et `$arraybenchmarking2` (25 opérations) sont déclarés mais **utilisés nulle part** : candidats pour initialiser le référentiel (⚠ Ambigu, décision métier).

### S7-16 Bench Marking — saisie par une banque (`incl-benchmarking.php`)
- **URL** : `?insc=0&opt=0&cgb=3&bmg=1&bhmg={1|2}` ; création `&opt=1` ; fiche `&opt=2&ibm={id}`.
- **Accès** : lien affiché aux seuls Mbq, mais aucune vérification (URL). La banque du membre = `banque` dont `indexmbr` = connecté — ⚠ dans le dump **aucune banque n'est rattachée à un membre** (`indexmbr=0` partout) → requêtes invalides, écran inutilisable en production.
- Deux sous-onglets : « TYPE OPERATION » (`bhmg=1`) et « LIBELLE OPERATION & TAXE BANQUE » (`bhmg=2`) ; icône « New {Type Opération | Libelle opération & Taxe}. ».
- Formulaire `bhmg=1` : « Type de l'opération: » (`chp02`, maxlength 120 → `libelebm1`) + « Etat fiche: » 1..3. Formulaire `bhmg=2` : « Type de l'opération: » (select des types de la banque, `chp01`), « Libellé de l'opération: » (`chp02` → `libelebm2`), « Taxe: » (`chp03` → `tarifbm2` **inexistante**), « Etat fiche: ». Boutons « Enregistrer » / « Annuler ».
- Validations : type absent → « Chaque opération doit être liée a un type. » ; libellé < 4 car. → « L'opération doit avoir 4 caractères minimun. » ; « La taxe doit avoir 1 caractères minimun. » (teste le libellé au lieu de la taxe) ; doublon → « Opération déjà enregistrée. ». Messages « Enregistrement effectué. » / « Modification effectuée. ».
- Listes : `bhmg=1` « Type opération » (lien) ; `bhmg=2` « Type opération » | « Libellé » (lien) | « Taxe » ; compteur (G) ; notes « Pour consulter et modifier un type d'opération, Veuillez cliquer sur son libellé. » / « … un libellé d'opération, … ».

### S7-17 Écrans d'administration orphelins liés à S7 (liens de menu commentés)
- **`pbanque.php` — référentiel des banques (à porter : indispensable à la Trésorerie)**. Icône « Nouvelle banque » ; formulaire : Sigle: (`chp01`, maxlength 7, mis en MAJUSCULES) ; Nom de la banque: (`chp02`, maxlength 50, **≥ 3 car.** → « Veuillez saisir le nom de la banque avec 3 caractères minimum. ») ; Téléphones: ; Adresse: (maxlength 90) ; Mail: ; Adresse Site: ; Contact: ; Téléphone contact: ; Observation: ; Etat fiche: (1..3, défaut 2). Doublon sigle + nom → « Cette banque est déjà enregistrée. ». Liste triée par nom : Banque (lien) | Contact avec banque | Phone contact | Etat (initiale) ; compteur « n Banques » (G) ; note « NB. Pour consulter la fiche d'une banque, Veuillez cliquer sur son nom ». Aucun contrôle d'accès (page admin atteignable par URL). La banque id 1 « Autres » sert de valeur sentinelle « banque non listée » (S7-10).
- **`pbenchmarking-2.php` — référentiel bench marking 3 niveaux (version cohérente avec le schéma)** : onglets « TYPE OPERATION », « LIBELLE OPERATION », « TAXE/BANQUE » ; niveau 1 : libellé (≥ 4 car. « Le type de l'opération doit avoir 4 caractères minimun. », unicité du libellé) ; niveau 2 : type (select) + libellé (unicité type + libellé) ; niveau 3 : « Banque: » (select `banque`, obligatoire « Veuillez indiquer la banque concernée. »), « Opération: » (select « type -> libellé »), « Taxe: » (texte ≥ 1 car. « La taxe doit avoir 1 caractères minimun. »), unicité banque + opération + tarif ; état 1..3. Liste niveau 3 : Banque | Type Opération (« type -> libellé ») | Taxe (lien). ⚠ UPDATE niveau 3 vise une colonne `libelebm3` inexistante (modification des taxes impossible). **Modèle recommandé pour la cible.**
- `pbenchmarking.php` (variante « par membre », colonnes inexistantes) et `pbenchmbanque.php` (tables `benchmarking4/5` inexistantes) : CASSÉS, à ne pas porter.
- `pdialogue.php` : page dialogue autonome orpheline (hors routage S7), non portée.

### S7-18 Fichiers morts de S7 (rappel)
`choix7-4.php`, `incl-choix713.php`, `incl-choix7C-1.php`, `incl-accompagnement.php`, `incl-operationbanque-Liste.php` — voir §0.2. Aucun comportement à porter, sauf l'intention de consultation par banque/par type de `incl-choix7C-1.php` (S7-15).

---

## 5. Corrections à apporter aux dictionnaires de données (et à `MIGRATION_STATUS.md`)

### 5.1 `data-dictionary-commerce.md`
| § | Affirmation actuelle | Correction (preuve) |
|---|---|---|
| 3 | Adhésion « pilotée par `incl-adhesion.php` (inclus depuis `opportunite.php?ppa=3`) » | Le point d'entrée réel est `choix5.php?opaf=1&ppa=3` (Ma/M). `opportunite.php` est orpheline et cassée (tables non déclarées, `$choix=6`). |
| 3 | « assistant 9 étapes », « Étape 1bis », « Étapes 2bis et 6 » | 7 étapes de saisie + étape 8 paiement/fin + 9 formulaire de paiement + 10 message (mapping exact en S5-3). Formations = étape 3, filleuls = étape 6, RDV = étape 5, kit = étape 7. |
| 3 | MOA : `indexmbr` → « membre (parrain) », « 25 prospects du filleul » | `indexmbr` = le membre adhérent lui-même ; ce sont **ses** prospects. Les prospects existants ne sont jamais mis à jour ni supprimés. |
| 3 | POA : « DELETE puis ré-INSERT complet » | Ré-INSERT limité aux produits d'**id 1 à 25** (98 produits sur 123 jamais enregistrés) ; au rechargement, le prix affiché est le prix distributeur **courant**, pas `prixpoa`. |
| 3 | `zone163soa` montant filleul 3 | Colonne `tinyint` (≤ 127) contrairement à 161/162 (`int`) ; `zone11nsoa` (heure) `varchar(8)` pour une saisie de 30 car. ; `zone12soa` `tinyint`. |
| 3 / 20.4 | « `etatsoa` : vérifier si un workflow existe ailleurs » | Aucun : le G n'a **aucun écran** (fichier `incl-choix5A3.php` manquant). Le mode « Crédit » n'a aucune suite. Tables SOA/MOA/POA vides en production. |
| 2 / 18.A | Vente produit en « E-commerce », « catalogue par groupe FLP » | La vente produit est dans **S5 Proposition › Produit** (pas en E-commerce). Liste/panier au **prix distributeur**, fiche au prix public ; prix N.D. jamais utilisé en S5. Aucune adhésion requise en pratique. |
| 4 / 10 | `prospective1.indexent` → entreprise (FK, unique) | Le code actif y écrit **l'id du membre** (`chp02 = indexmbr`) ; le dump mélange les deux sémantiques. L'en-tête de fiche est lu dans `membre`, pas dans `entreprise`. |
| 10 | Bouton « Envoyer mail » | Réservé au **G** en consultation ; destinataire = mail du **membre** propriétaire. |
| 10 | (non documenté) | La liste de saisie n'est pas filtrée par fiche : tout membre morale voit et peut **supprimer** les lignes de toutes les entreprises. |
| 8 | `incl-formulaireentreprise.php` : « clarifier lequel est actif » | `incl-entreprise.php` est le seul actif ; `incl-formulaireentreprise.php` est mort (jamais inclus). |
| 8 | Pré-remplissage personne morale | Bug : domaine ← `sexembr`, forme juridique ← `situatmatrimmbr`. |
| 5 | Projet : « Édition : gestionnaire + droit_gestion_fiches OU auteur » | Édition : **tout G** ou auteur ; le droit Activation ne conditionne que le champ état. Idem entreprise, marché, partenariat, business plan. |
| 6 | Business plan : champs | Ajouter : `zone27bsp` référence en `varchar(10)` (troncature dès compteur à 4 chiffres) ; message de fin affiché deux fois. |
| 6 / 11 (finance) | `accompbusinessplan` « bug UPDATE zone53/zone44 » | Plus grave : l'UPDATE ne modifie **jamais** aucune ligne (id écrasé par `"chp058"`), et l'écran de consultation affiche toutes les réponses vides. Voir S7-3. |
| 11 | Partenariat : flux intéressement | Anti-doublon testé sur `indexhmn` (au lieu de `indexptn`) ; message règle « 3 caractères » alors que la règle est 5 ; recherche sans parenthèses. |
| 15 | Réussite : « Liste publique : filtre état=Autorisé… » | Module **mort** en V04 (onglet remplacé par « Comparateur de prix », table vide). |
| 20.12 | Doublon entreprise/formulaire | Tranché (voir ci-dessus). |

### 5.2 `data-dictionary-finance.md`
| § | Affirmation actuelle | Correction |
|---|---|---|
| 11-14 | Tables acomp* « présentes » (implicite) / MIGRATION_STATUS : « tables absentes du dump réel » | Les 4 tables **existent** dans le dump avec 0 ligne (idem `benchmarking1/2/3`). |
| 11 | `acompbusinesplan` « (préfixe BSP) » | Préfixe **ABP** (`$arraycodereference[17]`) ; BSP = `businessplan`. |
| 12 | `acompprojetagricol` « (préfixe PJT/APA) » | Préfixe **APA**. |
| 11-14 | « `zone03`=Objet (seul champ validé, ≥11 car.) » | Règle : **≥ 10** caractères (`strlen < 10` → erreur). |
| 11-14 | « relus/validés par un conseiller » | Aucun circuit : état 2 à la création, liste filtrée état 2, état modifiable par G+Act uniquement via une modification qui ne s'enregistre pas. « Sauvegarder » = « Envoyer ». |
| 13 | `acomprestructcredit` « zone48/49/50 colonnes mortes, jamais écrites » | La question **48** (« Compte d'exploitation simplifié justifiant la situation actuelle ») est **affichée** à l'utilisateur mais jamais enregistrée (bug) ; seules 49/50 sont mortes. |
| 11-14 | « libellés à reprendre du rapport de l'agent » | Liste complète fournie en S7-4 à S7-7. |
| 3 | `operatbanq` : « Email auto envoyé à la banque/bénéficiaire » | Mail envoyé **uniquement** à l'adresse de la banque émettrice saisie ; une **référence commune** pour toutes les lignes d'une même saisie ; `date2opb` non modifiable en édition ; banque id 1 = « Autres ». |
| 3 | « saisie en grille de 15 opérations (legacy) » | Toujours vrai dans la version **active** (pas seulement l'ancienne) ; lignes invalides ignorées sans message. |
| 9 | `demandecredit` | Ajouter : bug d'affichage « Apport sur fond propre » = valeur du devis ; anti-doublon membre + observation. |
| 15-17 | « Seule `pbenchmarking-2.php` (version admin globale) est cohérente » | Exact pour le schéma, mais la page est **orpheline** (lien commenté) et son UPDATE niveau 3 vise `libelebm3` (inexistante). L'écran **actif** (`choix7.php?cgb=3` → `incl-choix7C.php`, `incl-benchmarking.php`) est incohérent avec le schéma et inutilisable. |
| 2 | `banque.indexmbr` « jamais alimenté, vestige » | Alimenté à l'inscription d'un membre « banque » (`incl-membre.php` : INSERT miroir) ; à la modification d'un tel membre, `incl-membre.php` **écrase la banque id 1 « Autres »** (bug hors périmètre à signaler). Dans le dump toutes les banques ont `indexmbr=0`. |
| 0 | Préfixes | Ajouter `pcm` (placement), `cfr` (conseil financier) ; `fonctaccompagn`/`foncttresorerie` (préfixes `AC…`, `PL-`…) sont **commentées** : `$arrayoperation`/`$arrayoperation1` inutilisés. |

### 5.3 `data-dictionary-contenu.md`
| § | Affirmation actuelle | Correction |
|---|---|---|
| 1 | `dialogue` : « Gestionnaire … peut répondre à un membre précis » | La réponse G est adressée au membre id 1 (bug `isset`) ; le membre ne peut écrire que depuis Placement (`dlg=1`). `typedlg` 1..4 = sous-onglets Trésorerie. |
| 4 | `conseilfinance.typecsf` 3 = Accompagnement | `typecsf` ne prend que 1 ou 2 ; « Accompagnement » ouvre les 4 questionnaires (tables acomp*). |
| 4 | `auteursujetcsf` « permet à l'auteur du SUJET d'éditer » | Renseigné uniquement sur les **réponses**, jamais lu. Les droits d'édition reposent sur `indexmbr` (auteur) ou G+Act. |
| 4 | Confidentialité | À la création, `confidencecsf` = n° de rubrique (1 Privé pour Conseil financier, 2 Public pour Rumeurs) ; les réponses reçoivent aussi le n° de rubrique ; la clôture (état 4) est possible pour tout lecteur du fil. |
| 19 | Choix 5 « Tables principales `demandecredit`/`contentcredit` » ; Choix 6 « C = Marchés/projets » | S5 : `produit`, `panier`, `souscriptoportuniteaffaire`, `membreoportuniteaffaire`, `produitoportuniteaffaire`, `businessplan`, `partenariat`, `besoin`. S6 : `entreprise`, `prospective1/2`, `produitprospective`, `marche`, `projet`. |
| 19 | « Variantes `choix5-3`, `choix7-4` : à clarifier » | Mortes (aucun lien ; `choix7-4` cassée). |

### 5.4 `MIGRATION_STATUS.md` (points erronés pour ce périmètre)
- « tables `benchmarking1/2/3`, `acomp*` n'existent pas dans le dump » → elles existent (0 ligne).
- « Bench Marking : page informative statique… la section équivalente est du code mort/commenté » → l'écran est actif (`incl-choix7C.php`, `incl-benchmarking.php`) mais non fonctionnel ; `$arraybenchmarking` n'est affiché nulle part dans le legacy.
- « Réussites entrepreneuriales conservé en 4e onglet » → absent de la V04 en production (décision métier à tracer).

---

## 6. Checklist de recette

Une ligne = une fonctionnalité vérifiable dans la nouvelle version. Les comportements marqués « (corrigé) » sont attendus dans leur version corrigée, pas dans leur version legacy.

### 6.1 Section 5 — Opportunité d'affaire
1. **F-S5-01** Onglets PROPOSITION / BUSINESS PLAN / PARTENARIAT & TROC affichés à tous, avec compteur des partenariats publiés sur le 3e onglet.
2. **F-S5-02** Sous-onglets Présentation / Produit / Adhésion sous PROPOSITION.
3. **F-S5-03** Présentation : 3 entrées (vidéo 1, vidéo 2, texte) sélectionnables, l'entrée courante masquée ou désactivée.
4. **F-S5-04** Présentation : lecture vidéo en HTML5 (corrigé : plus de lecteur Windows Media).
5. **F-S5-05** Présentation texte : 5 blocs titrés `$arraypresentation[1..5]` avec les textes exacts extraits de `incl-presentation.php`.
6. **F-S5-06** Décision tracée sur le catalogue PDF (entrée `prst=4` inaccessible en legacy).
7. **F-S5-07** Produit : visiteur → contenu non accessible (message de connexion) ; connecté → catalogue.
8. **F-S5-08** Décision tracée : adhésion requise ou non pour accéder au catalogue (non exigée en pratique en legacy).
9. **F-S5-09** Colonne « Les plus demandés » (10 produits actifs) sur l'onglet Produit.
10. **F-S5-10** Grille des 20 groupes de produits FLP (`$arraygroupeproduit`).
11. **F-S5-11** Badge panier = quantité totale non payée du membre, lien vers le panier.
12. **F-S5-12** Liste d'un groupe : produits actifs du groupe avec photo (zoom), référence, nom, description, prix distributeur, stock, sélecteur de quantité 0..999.
13. **F-S5-13** Ajout au panier multi-produits en une action, prix distributeur figé à l'ajout, sans contrôle de stock à l'ajout.
14. **F-S5-14** Panier : colonnes Date / Produit / Prix / Quantité « qté / stock » / Montant / suppression, ligne de total.
15. **F-S5-15** Suppression d'une ligne de panier par son seul propriétaire (corrigé).
16. **F-S5-16** Blocage du paiement et message exact si une quantité dépasse le stock.
17. **F-S5-17** Choix du mode de paiement (Cash, Charden Farell, Mobile Money) puis formulaire de paiement (lien analyse paiement) avec `typepnr=1`.
18. **F-S5-18** Après paiement : `payement` état 2, stock décrémenté, lignes panier marquées payées.
19. **F-S5-19** Décision tracée sur la fiche produit (prix public, compteur de visites) inatteignable en legacy.
20. **F-S5-20** Adhésion accessible aux seuls Master/Membre ; message pour visiteur.
21. **F-S5-21** Écran back-office G de consultation des souscriptions (manquant en legacy, à créer).
22. **F-S5-22** Pré-remplissage de l'assistant avec la souscription existante du membre.
23. **F-S5-23** Navigation Précédent/Suivant sur 7 étapes sans perte des saisies, pas de « Précédent » à l'étape 1.
24. **F-S5-24** Étape 1 : objectifs (texte), histoire (texte), heures/semaine (vide, 5 - 10, 10 - 20, 20 +), textes d'intro exacts.
25. **F-S5-25** Étape 2 : 25 prospects (nom ≤30, tél ≤9, email ≤30, commentaire ≤120) + date butoir de complément de liste.
26. **F-S5-26** Étape 2 : seuls les prospects dont le nom dépasse 5 caractères sont enregistrés.
27. **F-S5-27** Étape 3 : 4 formations fixes (POA, Journée de succès, Formation Animateur, Formation Manager) × date/lieu/heure, sans troncature de l'heure (corrigé).
28. **F-S5-28** Étape 4 : texte des scénarios téléphoniques (sans champ).
29. **F-S5-29** Étape 5 : nombre de rendez-vous individuels (numérique).
30. **F-S5-30** Étape 6 : 3 filleuls × nom, mail, adresse, montant, date de présentation, sans troncature du montant du 3e (corrigé).
31. **F-S5-31** Étape 7 : mode de souscription (Fond propre / Credit) + tableau de **tous les produits actifs** (corrigé) avec prix distributeur, quantité, valeur recalculée en direct (corrigé), total.
32. **F-S5-32** Étape 7 : total non modifiable manuellement (corrigé) et = Σ prix × quantité.
33. **F-S5-33** « Sauvegarder » enregistre sans validation ; « Envoyer » valide mode obligatoire, total ≥ 56 000, total ≤ 66 000 si Crédit, messages exacts cumulés.
34. **F-S5-34** Enregistrement du kit pour **tous** les produits à quantité > 0 (corrigé : pas de limite id ≤ 25).
35. **F-S5-35** Mise à jour/suppression des prospects modifiés lors d'une nouvelle sauvegarde (corrigé).
36. **F-S5-36** Référence de souscription générée (corrigé : vide en legacy).
37. **F-S5-37** Étape 8 : après « Envoyer » + Fond propre, choix du mode de paiement ; après « Sauvegarder », message « Opération éffectuée » (orthographe corrigée).
38. **F-S5-38** Décision tracée et suite implémentée pour « Envoyer » + Crédit (aucune suite en legacy).
39. **F-S5-39** Paiement de la souscription (`typepnr=6`) : `payement` état 2, `etatsoa=2`, message de succès **uniquement si le paiement est enregistré** (corrigé).
40. **F-S5-40** Business Plan : liste invisible aux visiteurs ; Ma/M voient le leur, G tous ; recherche dans la description ; compteur G ; colonnes Référence/Date/Membre/Projet ; tri date décroissante.
41. **F-S5-41** Business Plan : création réservée Ma/M, un seul par membre (message exact), bouton « Nouveau » masqué si déjà existant (corrigé).
42. **F-S5-42** Business Plan : 25 questions (libellés exacts), niveau de réalisation 0-100 %, validations type ≥ 5 et description ≥ 10 avec messages exacts.
43. **F-S5-43** Business Plan : modification par l'auteur ou tout G ; état modifiable par G+Act en modification.
44. **F-S5-44** Business Plan : Sauvegarder/Envoyer (décision tracée sur la différence), message de fin affiché une seule fois (corrigé).
45. **F-S5-45** Business Plan : lien G vers la fiche du membre depuis la liste.
46. **F-S5-46** Partenariat : liste publique des fiches publiées (cartes ACTIF / RECHERCHE / OBJECTIF), tous états pour les connectés, tri date décroissante.
47. **F-S5-47** Partenariat : recherche sur description/recherche/objectif correctement parenthésée (corrigé).
48. **F-S5-48** Partenariat : création Ma/M (actif ≥ 5 car. avec message cohérent, unicité de l'actif), publication immédiate (état 2), référence PTR.
49. **F-S5-49** Partenariat : modification auteur ou G ; état G+Act ; lecture seule pour les autres.
50. **F-S5-50** Partenariat : message « Votre recherche de partenariat & troc a bien été enregistrée ».
51. **F-S5-51** Partenariat : intéressement par Ma/M non auteur (≥ 5 car., un seul par membre et par fiche — corrigé), écriture `besoin` type 6.
52. **F-S5-52** Partenariat : liste des intéressements (date + texte) visible par l'auteur, le G et les autres membres sur la fiche.
53. **F-S5-53** Contrôle d'accès serveur sur toutes les fiches S5 (corrigé).

### 6.2 Section 6 — Entreprises - Marchés
54. **F-S6-01** Onglets REPERTOIRE D'ENTREPRISE / COMPARATEUR DE PRIX / MARCHES ET PROJETS (compteur des projets publiés).
55. **F-S6-02** Répertoire : visiteur voit les entreprises publiées sans lien ni référence ; connecté voit toutes, avec lien et référence ; état affiché au G et à l'auteur.
56. **F-S6-03** Répertoire : filtres secteur (via domaine), domaine (groupé par secteur), ville, mots dans la description, combinables.
57. **F-S6-04** Répertoire : carte nom + forme juridique, secteur, domaine ; tri secteur puis nom ; compteur G.
58. **F-S6-05** Entreprise : création par tout connecté (G compris) ; auteur = créateur.
59. **F-S6-06** Entreprise : pré-remplissage correct depuis le membre personne morale (nom, domaine, téléphone, mail, adresse, ville — corrigé).
60. **F-S6-07** Entreprise : validations domaine, nom (≥ 4 car., message cohérent — corrigé), forme juridique (SA…Fondation), ville, avec messages exacts.
61. **F-S6-08** Entreprise : unicité du nom (règle clarifiée, secteur déduit du domaine — corrigé).
62. **F-S6-09** Entreprise : capital avec séparateur de milliers ; téléphone ≤ 9 chiffres ; mail ; site ; adresse ; gérant ; description.
63. **F-S6-10** Entreprise : état modifiable par G+Act (création et modification), défaut Autorisé.
64. **F-S6-11** Entreprise : modification par l'auteur ou tout G ; lecture seule sinon.
65. **F-S6-12** Entreprise : upload de la photo (taille ≤ 4 Mo, redimensionnement, type contrôlé — corrigé) et affichage en vignette.
66. **F-S6-13** Entreprise : compteur de visites et date de dernière visite incrémentés à la consultation (hors auteur si décidé) ; affichage date d'inscription / dernière visite / nombre.
67. **F-S6-14** Comparateur : visiteur → message « Il faut avoir un compte entreprise pour y avoir accès. ».
68. **F-S6-15** Comparateur : membre personne morale → accès direct à sa fiche offres/demandes.
69. **F-S6-16** Comparateur : autre connecté → liste Offre / Demande (entreprise + prix, nom du produit ajouté — corrigé), filtre par produit.
70. **F-S6-17** Comparateur : rattachement correct de la fiche à l'entreprise/au membre (corrigé : plus d'id membre dans `indexent`) et migration des données existantes.
71. **F-S6-18** Fiche comparateur : en-tête dénomination, sigle, adresse, téléphone, mail du propriétaire.
72. **F-S6-19** Fiche comparateur : bascule Offre / Demande.
73. **F-S6-20** Fiche comparateur : ajout d'une ligne (produit existant ou nouveau produit créé à la volée, unité, prix, quantité mensuelle, client-fournisseur) avec validations et messages exacts.
74. **F-S6-21** Fiche comparateur : liste limitée aux lignes de la fiche (corrigé), suppression par le seul propriétaire/G (corrigé).
75. **F-S6-22** Fiche comparateur : envoi de mail par le G (message ≥ 10 car., adresse vérifiée, sujet « Proposition des produits »).
76. **F-S6-23** Sous-onglets Marchés / Projets sous MARCHES ET PROJETS.
77. **F-S6-24** Marchés : liste (visiteur = publiés sans lien), filtres Privé/Public, montant minimum, mots (libellé/description/dossier, parenthésés — corrigé) ; carte numéro, libellé, montant FCFA, maître d'ouvrage ; tri référence décroissante.
78. **F-S6-25** Marché : création par tout connecté ; 14 champs (libellés exacts) ; validations numéro (≥ 4), type, libellé (≥ 4), montant (> 0) avec messages exacts.
79. **F-S6-26** Marché : unicité du numéro d'appel d'offre en création **et** en modification (corrigé).
80. **F-S6-27** Marché : modification auteur ou G ; état G+Act ; message « Opération effectuée avec succès ».
81. **F-S6-28** Projets : liste (visiteur = publiés sans lien), recherche libellé/objet/description ; carte référence, promoteur, objet, libellé, durée.
82. **F-S6-29** Projet : création par tout connecté ; champs responsable, promoteur, objet, libellé (≥ 4, messages exacts), objectif, description, adresse, durée 0..120 mois, date de lancement, conditions d'éligibilité.
83. **F-S6-30** Projet : unicité responsable + objet avec message « Ce projet est déjà enregistré. » (corrigé).
84. **F-S6-31** Projet : modification auteur ou G ; état G+Act.
85. **F-S6-32** Décision tracée sur les limites de 20 caractères des champs texte du projet.
86. **F-S6-33** Publicités affichées dans la colonne droite des onglets Répertoire, Comparateur (liste) et Marchés/Projets.
87. **F-S6-34** Décision tracée sur le module « Réussite entrepreneuriale » (mort en V04).
88. **F-S6-35** Contrôle d'accès serveur sur toutes les fiches S6 (corrigé).

### 6.3 Section 7 — Offres Financières
89. **F-S7-01** Onglets CONSEIL FINANCIER / TRESORERIE / BENCH MARKING et leurs sous-onglets (Conseil financier / Rumeurs Economiques / Accompagnement ; Placement / Opération Bancaire / Demande de Crédit / Contentieux ; 4 questionnaires sous Accompagnement).
90. **F-S7-02** Visiteur : message « Veillez-vous connecter pour y avoir accès. » (orthographe corrigée) sur tous les onglets et sous-onglets (corrigé).
91. **F-S7-03** Forum : bouton « Nouveau » ; Ma/M limité à un sujet ouvert par rubrique avec message « Pour entamer un nouveau sujet, il faut clôturer le précédent. ».
92. **F-S7-04** Forum : création de sujet (objet + texte obligatoires ≥ 2 car. — corrigé), référence CFR, confidentialité Privé pour Conseil financier / Public pour Rumeurs, état Autorisé.
93. **F-S7-05** Forum : refus d'un objet en doublon avec un message explicite (corrigé).
94. **F-S7-06** Forum : liste des sujets (auteur visible selon règles G/auteur/Master-public, date, objet, texte), tri croissant (Conseil financier) / décroissant (Rumeurs), exclusion correcte des sujets supprimés (corrigé), recherche texte, compteur G.
95. **F-S7-07** Forum : décision tracée sur la visibilité réelle des sujets privés (texte visible par tous en legacy).
96. **F-S7-08** Forum : modification d'un sujet par l'auteur (y compris Membre — corrigé) ou G+Act ; état 1..4.
97. **F-S7-09** Forum : fil des réponses (sujet encadré + réponses chronologiques) et lien « Voir les réponses a la question et Répondre ».
98. **F-S7-10** Forum : réponse (≥ 2 car., message corrigé), refus des doublons, incrément du nombre de réponses, confidentialité héritée du sujet (corrigé).
99. **F-S7-11** Forum : « Clôture sujet » (Conseil financier) réservée à l'auteur et au G (corrigé) ; sujet clôturé fermé aux réponses (corrigé).
100. **F-S7-12** Accompagnement : liste par type (référence, date, objet), dossiers publiés, G tous / membre les siens, recherche sur l'objet, compteur G.
101. **F-S7-13** Accompagnement : bouton « Nouveau {type} » pour tout connecté.
102. **F-S7-14** Questionnaire Business Plan : 55 questions (zones 04..58) + objet, sections et sous-sections exactes (S7-4).
103. **F-S7-15** Questionnaire Projet Agricole : 77 questions (04..80) + objet, structure exacte (S7-5).
104. **F-S7-16** Questionnaire Restructuration de Crédit : 45 questions (04..48) + objet, **question 48 enregistrée** (corrigé) (S7-6).
105. **F-S7-17** Questionnaire Crédit immobilier : 35 questions (04..38) + objet (S7-7).
106. **F-S7-18** Questionnaires : objet ≥ 10 car. (message exact), unicité membre + objet (messages exacts), références ABP/APA/ARC/ACI, date de création.
107. **F-S7-19** Questionnaires : consultation affichant toutes les réponses enregistrées (corrigé).
108. **F-S7-20** Questionnaires : modification effective par l'auteur ou le G (corrigé) ; état modifiable par G+Act.
109. **F-S7-21** Questionnaires : Sauvegarder / Envoyer avec leurs messages distincts (décision tracée sur un éventuel statut « envoyé »).
110. **F-S7-22** Trésorerie : bouton « Nouveau/Nouvelle » au-dessus de chaque liste.
111. **F-S7-23** Trésorerie : listes par sous-onglet (colonnes S7-8), fiches actives seulement, G tous / membre les siennes, compteur G.
112. **F-S7-24** Trésorerie : annulation (état 3) avec confirmation (corrigé) par le propriétaire ou le G, y compris pour Contentieux (corrigé).
113. **F-S7-25** Placement : type (Dépôt à terme / Investissement), secteur si Investissement, montant, durée 1..120 mois, taux, banques cochées (≥ 1 — corrigé), observation ; messages exacts.
114. **F-S7-26** Placement : changement de type sans perte des autres saisies (corrigé) ; nombre de banques non limité aux id ≤ 20 (corrigé).
115. **F-S7-27** Placement : anti-doublon clarifié (corrigé : pas sur la seule observation vide) ; référence PCM ; messages « Le placement est enregistré. » / « Modification effectuée. ».
116. **F-S7-28** Placement / Demande de crédit : état modifiable par G (et Master propriétaire si décidé) sans faille d'affectation (corrigé).
117. **F-S7-29** Opération bancaire : saisie multi-lignes (jusqu'à 15) date, montant, devise (FCFA, €, $, RMB), type (6 valeurs), banque émettrice/bénéficiaire (liste ou « Autres » + nom libre), mail banque émettrice, bénéficiaire, adresse banque bénéficiaire.
118. **F-S7-30** Opération bancaire : lignes incomplètes signalées (corrigé : ignorées silencieusement en legacy), anti-doublon membre + date + montant + banque + bénéficiaire.
119. **F-S7-31** Opération bancaire : décision tracée sur la référence commune à un lot vs une référence par opération.
120. **F-S7-32** Opération bancaire : mail « Programmation opérations bancaires » à la banque émettrice (contenu exact S7-10) et bouton « Envoyer Mail » sur la fiche (« Mail envoyé »).
121. **F-S7-33** Opération bancaire : modification (montant, devise, type, banques, bénéficiaire, **date d'opération** — corrigé) avec validations et messages exacts ; état par G.
122. **F-S7-34** Opération bancaire vue G : filtres période, banque (corrigé : opérant), type, fourchette de montant ; présentation Débit / Crédit avec intitulés corrects (corrigé) ; filtre d'état décidé.
123. **F-S7-35** Demande de crédit : devis, apport sur fonds propres (affichage corrigé), montant, objet, durée, niveau de réalisation, garantie, délai de réponse 0..366 j, observation et choix de banques ; validations et messages exacts ; référence DDC.
124. **F-S7-36** Contentieux : 14 rubriques montant + détail (S7-13), validations dette > 0 et revenus mensuels > 0, anti-doublon membre + montant de dette, référence CCT, messages exacts, boutons réservés au propriétaire/G (corrigé).
125. **F-S7-37** Dialogue Trésorerie : fil par sous-onglet (typedlg 1..4), lien « Ecrire à la frangine » sous chaque liste.
126. **F-S7-38** Dialogue : le membre peut écrire dans les 4 sous-onglets (corrigé) ; message ≥ 2 car.
127. **F-S7-39** Dialogue : le G voit les messages adressés à la frangine avec l'auteur et répond au **bon** membre (corrigé) ; le membre voit ses messages et les réponses reçues ; recherche texte.
128. **F-S7-40** Dialogue accessible au G aussi en Opération bancaire (corrigé).
129. **F-S7-41** Bench Marking consultation : par banque (opérations + tarif) et par type d'opération (banque, « type -> opération », tarif), à partir des tarifs par banque (corrigé).
130. **F-S7-42** Bench Marking saisie par une banque (Mbq) ou par le G : types, opérations, tarifs par banque, états, unicités et messages (S7-16/S7-17) ; modification des tarifs effective (corrigé).
131. **F-S7-43** Décision tracée sur l'initialisation du référentiel bench marking avec `$arraybenchmarking` / `$arraybenchmarking2`.
132. **F-S7-44** Référentiel des banques administrable par le G (sigle en majuscules, nom ≥ 3 car., unicité sigle + nom, coordonnées, contact, observation, état), banque « Autres » préservée (corrigé).
133. **F-S7-45** Contrôle d'accès serveur sur toutes les fiches S7 (propriétaire / G / droits) (corrigé).

### 6.4 Transverse
134. **F-TR-01** Pagination réelle (50 par défaut, 50..500) conservant les filtres (corrigé).
135. **F-TR-02** Recherches conservées lors de la pagination et des retours de fiche (corrigé).
136. **F-TR-03** Références générées au format `PREFIXE + mm + compteur + aa` sans troncature.
137. **F-TR-04** Messages d'erreur groupés « ERREURS » et messages de fin d'opération.
138. **F-TR-05** Dates saisies au format jj-mm-aaaa, montants avec séparateur de milliers.

