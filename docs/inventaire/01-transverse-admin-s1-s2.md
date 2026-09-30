# Inventaire fonctionnel — Transverse, Administration, Section 1 « Le saviez-vous ? », Section 2 « Ressources humaines »

> Source : code legacy en production `lafrangine/V04/prog/` (PHP 5, `mysql_*`), lu intégralement pour le périmètre ci-dessous, et contrôles d'agrégats sur le dump `cp1019011_lafrangine.sql` (comptages uniquement, aucune donnée personnelle recopiée).
> Cible : réécriture SvelteKit 2 / Svelte 5 + Express. Ce document décrit **ce que fait réellement le legacy** (y compris ses défauts), puis ce qu'il ne faut **pas** reproduire.

---

## 0. En-tête

### 0.1 Périmètre

1. **Transverse** : gabarit commun (méta, en-tête, menus, pied de page), accueil `choix0.php`, connexion, déconnexion, session, inscription et modification de profil, mot de passe oublié, aide « Comment m'utiliser ? », contact, publicité (widget, page d'affichage, gestion), messagerie privée, dialogue, suggestions, compteur de visites, upload, pagination, messages d'erreur et de fin d'opération, envoi de mail.
2. **Administration** : `pparametre`, `pmembre`, `pvilqtr`, `pdiplome`, `psatdat`, `pfamilart`, `pmaladie`, `pproduit`, `pproduitptpv`, `pbanque`, `pvisite`, `psugest`, `ppublicite`, `pmessage`, `pdialogue`, `pbenchmbanque` (mort), `pmotpasoublie`, `pcontact`.
3. **Section 1** : `choix1.php`, `incl-choix1A.php`, `incl-choix1B.php`, `incl-choix1C.php`, `incl-conseil.php`, `incl-sounga.php`, plus `incl-enregpaye.php` et `incl-formulairepaye.php` (paiement du panier Santé).
4. **Section 2** : `choix2.php`, `incl-choix2.php`, `incl-choix2-1.php` (variante morte), `incl-humaine.php`, module `besoin` (présentation de besoin et intéressement).

Hors périmètre (cités seulement quand ils sont appelés d'ici) : `paportfond.php`, `ppayement.php`, `pbenchmarking*.php`, `particlecourse.php`, `opportunite.php`, `choix3` à `choix7` et leurs `incl-*`.

### 0.2 Fichiers lus en entier

`choix0.php`, `choix1.php`, `choix2.php`, `incl-variable.php`, `incl-ouvrbd.php`, `inclouvrbd.php` (ancien, non utilisé), `incl-lecturetables.php`, `incl-contconnex.php`, `incl-connex.php`, `incl-connexion.php` (mort), `incl-menu.php`, `incl-menu1.php`, `incl-entete.php`, `incl-baspage.php`, `incl-meta.php`, `incl-erreur.php`, `incl-msgfinoperat.php`, `incl-publicite.php`, `incl-affichpub.php`, `incl-pagination.php`, `incl-calculpagination.php`, `incl-changpage.php`, `incl-upload.php`, `incl-envoimail.php`, `incl-saisie-texte.html`, `incl-membre.php`, `incl-formulairemembre.php`, `incl-message.php`, `incl-dialogue.php`, `incl-choix1A.php`, `incl-choix1B.php`, `incl-choix1C.php`, `incl-conseil.php`, `incl-sounga.php`, `incl-enregpaye.php`, `incl-formulairepaye.php`, `incl-choix2.php`, `incl-choix2-1.php`, `incl-humaine.php`, `pparametre.php`, `pmembre.php`, `pvilqtr.php`, `pdiplome.php`, `psatdat.php`, `pfamilart.php`, `pmaladie.php`, `pproduit.php`, `pproduitptpv.php`, `pbanque.php`, `pvisite.php`, `psugest.php`, `ppublicite.php`, `pmessage.php`, `pdialogue.php`, `pmotpasoublie.php`, `pcontact.php`, `index.php`, `../index.php`. Parcourus : `pbenchmbanque.php`, `index.html`, `style-demo.html`, `scripts/numerique.js`, `scripts/calendrier.js`, `scripts/saisie-texte.js`, extraits de `choix7.php` (contexte de `incl-dialogue.php`) et de `incl-venteproduit.php` (panier partagé).

### 0.3 Légende des droits

| Code | Signification | Détection legacy |
|---|---|---|
| V | Visiteur non connecté | `$gtre == 0` |
| M | Membre simple connecté | `typembr == 3` |
| Mp / Mm | Membre personne physique / personne morale | `categoriembr == 1` / `2` |
| Mb | Membre morale « Boutique » | `banqboutqmbr == 2` |
| Ma | Master | `typembr == 2` |
| G | Gestionnaire | `typembr == 1` |
| G+Droit | Gestionnaire avec le droit « Droit » | 1ᵉʳ caractère de `droitmbr` = 1 |
| G+Caisse | Gestionnaire avec le droit « Caisse » | 2ᵉ caractère = 1 (non utilisé dans ce périmètre) |
| G+Act | Gestionnaire avec le droit « Activation » | 3ᵉ caractère = 1 |
| Auteur | Utilisateur connecté propriétaire de la fiche | `$imbr == indexmbr` de la fiche |
| « Connecté » | M, Ma ou G | `$gtre != 0` |

Libellés des droits affichés en infobulle (`$arraydroitmembre1`) : Droit = « Donne et retire les droits aux autres membres » ; Caisse = « Confirme un payement » ; Activation = « Crée, Active, Annule, ou Supprime une fiche ». Le 4ᵉ libellé « Point caisse » de `$arraydroitmembre` n'est pas stocké dans `droitmbr` : il correspond à la colonne `pointcaissembr` (1 = Oui, 2 = Non).

> **Avertissement général d'accès.** Les écrans d'administration n'ont **aucun contrôle d'accès serveur** : ils incluent le menu gestionnaire sans condition et répondent à toute personne qui connaît l'URL. Le profil de n'importe quel membre (mot de passe compris) est lisible et modifiable par URL (§ 1.5). La colonne « Accès » ci-dessous décrit **l'intention** (visibilité des liens). La nouvelle version doit l'imposer côté serveur.

### 0.4 Conventions techniques du legacy (utiles pour lire les tableaux)

- Champs de formulaire nommés `chp00`… (`chp00` = clé primaire en caché) ; filtres de recherche `cht01`… ; `ajs` caché = 1 création, 2 modification, 3 recherche.
- Paramètres GET récurrents : `insc` (0 = liste/accueil, 1 = inscription ou profil, 2 = fiche ou formulaire, 3 = déconnexion, 10 = accueil avec boîte de connexion) ; `opt` (0 = liste, 1 = nouveau, 2 = consulter ou modifier, 3 = fiche produit, 4 = détail ou commentaires, 5 = panier) ; `chg=99` (réutilise les critères de recherche mémorisés en session `crittriegl`) ; `imp=1` (impression, cassée) ; `aide` (0/1).
- États de fiche (`$arrayetat`) : 1 Non traité, 2 Autorisé, 3 Supprimé, 4 Clôturé. Suppression toujours **logique** (état 3), sauf panier, visites et journaux supprimés physiquement.
- Messages génériques de fin d'opération (`$arraymessage`) : « Enregistrement effectué. » et « Modification effectuée. », affichés dans un bandeau `msgfinoperat`.
- Bloc d'erreurs (`incl-erreur.php`) : titre rouge « ERREURS » suivi des messages `msg[1..30]` dans l'ordre de leur indice. Plusieurs erreurs peuvent s'afficher en même temps.
- Références métier : `fonctreference(préfixe)` produit `PRÉFIXE + mois(2) + compteur global + année(2)` en majuscules. Le compteur unique est `parametre.numreferencepmt` (non transactionnel). Préfixes du périmètre : `MBR` membre, `LSG` découverte de soi, `DEI` demande d'emploi, `OE1` offre d'emploi, `PUB` publicité, `CSL` conseil.
- Dates saisies au format `jj-mm-aaaa` par un calendrier JS (`ds_sh`, `scripts/calendrier.js`). Affichage `jj-mm-aaaa hh:mm:ss`.
- Champs numériques filtrés au clavier par `checkNumber()` (`scripts/numerique.js`) : seuls `0-9`, `.` et `/` sont conservés.
- Barre d'édition riche (`incl-saisie-texte.html` : boutons G, I, barré, souligné, listes « Taille » et « Couleur ») utilisée sur les champs Aide, Condition course et Texte de publicité. Elle appelle `insertTag()`, défini dans `scripts/saisie-texte.js`, que `incl-meta.php` ne charge pas (il charge `test1.js`, absent du dépôt). **La barre est probablement inopérante en production (à vérifier).** Le HTML saisi à la main est cependant stocké et restitué sans échappement.

---

## 1. Transverse

### E-TRV-01 — Gabarit commun des pages

**Fichiers** : `incl-meta.php`, `incl-ouvrbd.php`, `incl-lecturetables.php`, `incl-contconnex.php`, `incl-entete.php`, `incl-menu.php` ou `incl-menu1.php`, `incl-connex.php`, `incl-baspage.php`.

**Ordre de rendu d'une page `choixN.php`** : méta → connexion BD → calcul des compteurs d'onglets → contrôle de connexion → en-tête → menu (visiteur ou membre : `incl-menu` ; gestionnaire : `incl-menu1`) → contenu → pied de page (connexion ou compte) → bas de page.

**Méta (`incl-meta.php`)** : charset déclaré ISO-8859-1 alors que les fichiers et la BD sont en UTF-8 (`SET NAMES UTF8`) ; meta description « lafrangine.com est le site dedie a l'entrepreneur junior… » ; mots-clés ; meta author (nom d'une personne, non recopié) ; favicon `../ip/favicon.png` ; CSS `layout.css`, `css-1.css`, `css-2.css` ; JS jQuery 1.2.6, `featured_slide.js`, `numerique.js`, `calendrier.js` (+ `test1.js` absent).

**En-tête (`incl-entete.php`)** — lit `parametre` (ligne 1) :
- logo `../image/demo/logo-site-3.png` (180×90) et nom du site (`nompmt`, police « matura mt script capitals ») ; les deux pointent vers `choix0.php?opt=3&insc=0` ;
- bloc info : « téléphone 1 / téléphone 2 », e-mail (lien vers `pcontact.php?opt=1&insc=0`), adresse ;
- formulaire de recherche global présent mais vide (champs commentés). **Aucune recherche globale.**

**Compteurs d'onglets (`incl-lecturetables.php`)** — calculés à chaque page (fiches à l'état 2) :

| Compteur | Affiché sur | Requête |
|---|---|---|
| `nombre[1][1]` | S1, onglet « Informations utiles » | `conseil` état 2 (sujets **et** commentaires confondus) |
| `nombre[1][3]` | S1, onglet « Santé et bien-être » | `produit` état 2 (nombre de **produits**, pas de maladies) |
| `nombre[2][1]` / `[2][2]` | S2, onglets « Demande » / « Offre » | `humaine` état 2 par type |
| `[3][1]`, `[3][2]`, `[4][1]`, `[4][2]`, `[5][3]`, `[6][3]` | sections 3 à 6 (hors périmètre) | immobilier, article, appelfond, likelemba1, partenariat, projet |

L'onglet « Découverte de soi » n'a pas de compteur.

**Menu visiteur et membre (`incl-menu.php`)** :
- bandeau image `../image/demo/slide_{choix}.jpg` avec le titre de section en majuscules (`$arraychoix1`) et un slogan fixe (`$arraychoix2`, ex. section 0 « Le site qui vous accompagne dans votre initiative », section 1 « Besoin conseil ou d'aide. Les membres sont a vous », section 2 « Recherche et demande des ressources humaines ») ;
- 7 vignettes-liens vers `choix{i}.php?insc=0&opt=0` (titre en majuscules, slogan en infobulle).

**Menu gestionnaire (`incl-menu1.php`)** — barre horizontale qui remplace le bandeau :
- « Accueil » (`choix0.php?opt=3&insc=0`) ;
- « FICHIERS » : La frangine (`pparametre.php?opt=2&insc=0`), Membres (`pmembre.php?opt=0`), Villes (`pvilqtr.php?opt=0&vilqtr=1`), Quartiers (`…vilqtr=2`), Diplômes (`pdiplome.php?opt=0`), Secteurs activités (`psatdat.php?opt=0&satdat=1`), Domaines activités (`…satdat=2`), Familles articles (`pfamilart.php?opt=0`), Maladies (`pmaladie.php?opt=0`), Produits (`pproduit.php?opt=0`), Les visites (`pvisite.php?opt=0`, infobulle « Liste des visiteurs chez la frangine »), Suggestions (`psugest.php?opt=0`), Produit prospective (`pproduitptpv.php?opt=0`). Les liens Banques, Bench Marking et Bench Marking & Banque sont commentés ;
- « SECTIONS » : les 7 sections, puis Publicité (`ppublicite.php?insc=0`), Payement (`ppayement.php?insc=0`, hors périmètre), Message (`pmessage.php?insc=0`).

**Pied de page (`incl-connex.php`)** :
- **Non connecté**, et seulement si `insc` vaut 0 ou 10 : boîte « Connexion ! », texte « Veuillez entrer votre identifiant et mot de passe », légende de fieldset « News Letter », champ identifiant (`idf`, 20 caractères max, infobulle « Indentifiant du membre »), mot de passe (`mps`, 20), bouton « GO » (`news_go`) ; lien « Pour s'inscrire cliquer ici » vers `choix{N}.php?insc=1&opt=1#connex` ; lien « Mot de passe oublié » vers `pmotpasoublie.php?insc=1&opt=1#connex`.
- **Connecté** : liens « Modifier » (`choix{N}.php?insc=1&opt=2&imbr={moi}#connex`) et « Deconnexion » en rouge (`choix{N}.php?insc=3&opt=1`).
- **Toujours** : lien « Comment m'utiliser ? » qui bascule `aide` 0/1 (voir E-TRV-07).
- **Connecté** : « Suggestion ? » (`psugest.php?opt=0`).
- **G ou Mb** : « Vos Articles » (`particlecourse.php?opt=0`, infobulle « Les articles en vente dans vôtre boutique », hors périmètre).
- **G** : « New Membres: N » (N = membres à l'état 1 Non traité).
- **Ma ou M** : « Message: N » (N = messages non lus qui me sont adressés) et boîte de messagerie intégrée (voir E-TRV-10). Fond vert si `parametre.connexmsgpmt = 1`, c'est-à-dire si la frangine est en ligne dans sa messagerie.

**Bas de page (`incl-baspage.php`)** : icônes Facebook et Twitter (liens génériques vers facebook.com et twitter.com), « Copyright © 2016 - Tous droits reservés », « Conception: Primera-C.com » (lien externe).

**Bugs et incohérences à ne pas reproduire** :
- identifiants de base de données écrits en dur dans `incl-ouvrbd.php` (non recopiés) ;
- charset ISO déclaré sur du contenu UTF-8 ;
- `prog/index.php` redirige vers `../v02/prog/choix0.php` (chemin obsolète) ; seul `V04/index.php` redirige correctement vers `prog/choix0.php` ;
- `index.html` et `style-demo.html` sont des maquettes statiques du gabarit, sans fonction.

---

### E-TRV-02 — Accueil

**Fichier et URL** : `choix0.php` (`?insc=0`, `?opt=3&insc=0` ; `?insc=1&opt=1` inscription ; `?insc=1&opt=2&imbr=` profil ; `?aide=1`).

**Accès** :
- V, M, Ma : page complète.
- **G : contenu vide.** Pour un gestionnaire, le code force `insc=99` ; il ne voit que le menu gestionnaire et le pied de page, ni cartes ni publicité, et ne peut pas modifier son profil depuis l'accueil (il le peut depuis `choix1` à `choix7`).

**Contenu (`insc=0`)** :
- **7 cartes de sections** dans un tableau de 3 lignes : [1][2][3] / [4][vide][5] / [6][vide][7]. Chaque carte affiche le titre (`$arraychoix1`), l'image `slide_{i}.jpg` et le texte descriptif **paramétrable** `parametre.choix{i}pmt`. Clic vers `choix{i}.php?insc=0&opt=0`.
- Colonne de droite : **widget publicité** (E-TRV-09a).
- Blocs « Derniers conseils » et « Immobiliers » : code commenté, non affiché.

**Effet de bord — compteur de visites anonymes** (sur l'accueil uniquement) :
- à chaque affichage, le code cherche la dernière visite de la même adresse IP dans `visite` ;
- si aucune visite n'existe ou si la dernière date de plus de 30 minutes, il insère une ligne `visite(datevst, timestampvst, adresipvst, datenumvst)` ; `indexmbr` prend la valeur par défaut 1 ;
- il tente ensuite `UPDATE parametre SET nbvisitepmt=nbvisitepmt+1, datevisitepmt=…`. **Ces colonnes n'existent pas dans le dump** : la requête échoue sans bruit, et seul le journal `visite` fonctionne (10 032 lignes en production) ;
- l'adresse IP est prise dans `X-Forwarded-For`, puis `Client-IP`, puis `REMOTE_ADDR`.

**Inscription et profil** : `insc=1` inclut `incl-membre.php` (E-TRV-05).

**Checklist** : F-TRV-01 à F-TRV-06.

---

### E-TRV-03 — Connexion, session, déconnexion

**Fichiers** : `incl-contconnex.php` (logique, incluse par toutes les pages), `incl-connex.php` (formulaire). `incl-connexion.php` n'est inclus nulle part (mort).

**Connexion** :
- le formulaire du pied de page poste `idf`, `mps` et `news_go=GO` sur la page courante ;
- recherche `membre` avec `identifmbr = idf`, `motpasmbr = mps` (mot de passe en clair) et `etatmbr != 3`. Un membre à l'état 1 (Non traité) **peut** se connecter ; seul l'état 3 (Supprimé) bloque ;
- en cas de succès : session `$_SESSION['idfmps'] = "identifiant*motdepasse"` (mot de passe en clair en session) ; contexte chargé : `$imbr`, `$gtre`, `droitmbr`, `categoriembr`, `banqboutqmbr`, `pointcaissembr`, `nomprenmbr` ; nombre de messages non lus ;
- à la connexion par formulaire uniquement : INSERT `visitembr(indexmbr, datevst, adresipvst, datenumvst)` et, pour un non-gestionnaire, `membre.connexmsgmbr = 1` (drapeau « membre en ligne ») ;
- à chaque page, la session est ré-authentifiée en relisant la base avec identifiant et mot de passe ;
- en cas d'échec : `$msg = "Veuillez verifier votre identifiant et votre mot de passe....."`, mais **ce message n'est jamais affiché** (ligne commentée). L'échec est silencieux.

**Déconnexion** (`choixN.php?insc=3&opt=1`) :
- G : `parametre.connexmsgpmt = 0` (la frangine n'est plus en ligne) ;
- autre profil : `membre.connexmsgmbr = 0` ;
- destruction de `idfmps`, puis affichage en visiteur (`insc` forcé à 0).

**À ne pas reproduire** : mot de passe en clair en base et en session ; message d'échec absent ; injection SQL (valeurs concaténées) ; comparaison `$_POST['news_go']='GO'` (affectation). La nouvelle version doit utiliser une session serveur ou un jeton, des mots de passe hachés, un message d'échec explicite et une limitation des tentatives.

**Checklist** : F-TRV-07 à F-TRV-12.

---

### E-TRV-04 — Inscription publique et E-TRV-05 — Modification de profil

**Fichiers** : `incl-membre.php` (traitement) + `incl-formulairemembre.php` (formulaire partagé avec `pmembre.php`).

**URL** :
- inscription : `choix{0..7}.php?insc=1&opt=1` ;
- profil : `choix{N}.php?insc=1&opt=2&imbr={id}` ;
- depuis la S1 : le gestionnaire clique sur un nom de membre dans la liste Découverte de soi (`?imbr=…&opt=2&insc=1&vcpm=2`) ;
- depuis la S2 : lien « Nom-Prénom » d'une offre (`?insc=1&opt=2&imbr=…`).

**Accès** :
- inscription : V (le lien n'est visible que pour un visiteur) ;
- profil : l'utilisateur connecté sur sa propre fiche (lien « Modifier ») ; G sur toute fiche via les liens S1/S2 ;
- **faille** : aucune vérification serveur. N'importe qui (visiteur compris) peut ouvrir `?insc=1&opt=2&imbr=X` et voir la fiche d'un autre membre, mot de passe compris (présent dans l'attribut `value` du champ), puis la modifier, y compris le **type de compte** transmis en champ caché (`chp09`) : **élévation de privilège possible**.

**Formulaire dynamique** — le premier champ « Personalité » (sic) est une liste qui soumet la page à chaque changement :
- valeur vide : seul ce champ est affiché ;
- Physique ou Morale : la page se réaffiche avec le formulaire correspondant ;
- en création, les valeurs déjà saisies sont perdues au changement de personnalité ;
- en modification, le changement est **ignoré** (la catégorie est relue en base). Seul `pmembre` (administration) permet de changer la catégorie.

#### Formulaire — Personne physique (`chp21 = 1`)

| Libellé affiché | Champ | Contrôle | Options | Oblig. | Règle de validation | Message d'erreur exact |
|---|---|---|---|---|---|---|
| Code: (modification seulement) | chp01 | texte lecture seule | — | — | généré `MBR…` à la création | — |
| Personalité: | chp21 | liste (soumission au changement) | « », Physique, Morale | oui | ≠ 0 | « Veuillez indiquer si le membre est une personne physique, association ou entreprise. » (inatteignable en pratique) |
| Type: (G seulement) | chp09 | liste | « », Gestionnaire, Master, Membre | — | forcé à 3 en caché pour les non-G | (voir `pmembre`) |
| Point caisse: (G seulement) | chp24 | liste | « », Oui, Non | oui | ≠ 0 (défaut 2 = Non) | « Veuillez indiquer si le membre à droit au point de caisse. » |
| Nom - Prénom *: | chp02 | texte, 35 max | — | oui | longueur ≥ 3 | « Vôtre nom et prénom doivent avoir 3 caractères minimun. » |
| Pseudonyme *: | chp22 | texte, 15 max | — | oui | longueur ≥ 6 | « Le pseudonyme doit avoir 6 caractères minimun. » |
| Sexe: | chp03 | liste | « », Feminin, Masculin, Indéfini | oui | ≠ 0 | « Veuillez indiquer le sexe » |
| Situation matrimoniale: | chp19 | liste | « », Célibataire, Concubinage, Marié, Veuf, Divorcé, Autres | oui | ≠ 0 | « Veuillez indiquer la situation matrimoniale pour la personne physique. » |
| Enfant: | chp20 | liste | 0 à 20 | non | — | — |
| Téléphone: | chp04 | texte, 30 max, `checkNumber` | — | non | **aucune** (contrôle `phone()` mort, indice 400 jamais atteint) | (« Veuillez vérifier le numéro de téléphone. » jamais affiché) |
| Mail: | chp05 | texte, 30 max | — | non | aucune | — |
| Adresse: | chp13 | texte, 120 max | — | non | — | — |
| Ville *: | chp10 | liste (table `ville`) | « » + villes triées | oui | ≠ 0 | « Veuillez indiquer la ville du Membre. » |
| Pièce d'identité: | chp14 | texte, 25 max | — | non | — | — |
| Employeur: | chp15 | texte, 50 max | — | non | — | — |

#### Formulaire — Personne morale (`chp21 = 2`)

| Libellé affiché | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Type: (G) | chp09 | liste | comme ci-dessus | — | — | — |
| Banque / Boutique: | chp17 | liste | « », Banque, Boutique | non | Banque déclenche une ligne `banque` (voir effets de bord) | — |
| Point caisse: (G) | chp24 | liste | « », Oui, Non | oui | ≠ 0 | idem |
| Nom entreprise: | chp02 | texte, 35 max | — | oui (libellé non rouge) | longueur ≥ 3 | « Le nom de la personne morale doit avoir 3 caractères minimun. » |
| Sigle *: | chp22 | texte, 15 max | — | oui | longueur ≥ 3 | « Le sigle de la société doit avoir 3 caractères minimun. » |
| Domaine Activité: | chp23 | liste groupée par secteur (optgroup en majuscules) | domaines | non | — | — |
| Forme juridique: | chp19 | liste | « », SA, SARL, SARLU (3 des 9 valeurs de `$arrayformjuridique`) | non | **stockée dans `situatmatrimmbr`** | — |
| Téléphone:, Mail:, Adresse:, Ville *: | chp04, chp05, chp13, chp10 | comme en physique | | | | |
| (caché) | chp03 = 3 (Indéfini), chp20 = 0, chp14 et chp15 vidés | | | | | |

#### Champs communs (physique et morale)

| Libellé affiché | Champ | Contrôle | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|
| Identifiant *: | chp06 | texte, 20 max (colonne BD : 15) | oui | non vide | « Veuillez vérifier votre mot de passe. » (sic : l'identifiant vide produit ce message) |
| Mot de passe *: | chp07 | **password**, 10 max ; **texte en clair** si G+Droit | oui | non vide et ≠ identifiant | « L'identifiant doit être différent du mot de passe. » |
| Mot de passe *: (confirmation) | chp07A | idem | oui | égal à chp07 | « Veuillez vérifier votre mot de passe. » |
| Les droits: (G+Droit seulement) | chp120, chp121, chp122 | 3 cases « Droit », « Caisse », « Activation » avec infobulles | — | — | (non enregistrées par `incl-membre`, voir `pmembre`) |
| Observation: | chp11 | zone de texte | non | **jamais enregistrée** par `incl-membre` | — |
| Date limite Master: | chp18 | texte (modification, affiché si type = 3, sic) | non | **jamais enregistrée** | — |
| Solde pointage caisse: / Date pointage: | chp25 / chp26 | lecture seule | — | — | — |
| Code pointage: | chp27 | G : lecture seule + case « Création code de pointage » (`chp27A`) ; propriétaire en modification : texte 4 max modifiable | non | — | — |
| Etat fiche: (G) | chp08 | liste Non traité, Autorisé, Supprimé | — | **non enregistré** par `incl-membre` | — |
| Image: | monfichier | fichier | non | voir E-TRV-13 | « Image trop grande. Veuillez la réduire ou changer. » |
| (mot de contrôle) | motmagiq | le mot aléatoire de 9 lettres A-Y s'affiche en gros ; champ de 9 caractères, infobulle « Tapez le mot ci-contre » | oui, **aussi en modification** | égal au mot affiché (mis en majuscules) | « Veuillez vérifier votre mot de contrôle. » |

Boutons « Enregistrer » et « Annuler » (le second remet le formulaire à zéro). Vignette de la photo `../image/ig/mbr{id}.jpg` en modification.

**Contrôles et effets à la création** :
- unicité : un membre existant avec le même `nomprenmbr` **ou** `identifmbr` **ou** `pseudombr` provoque « Veuillez changer votre nom et prénom ou votre pseudonyme ou votre identifiant » (physique) ou « Veuillez changer votre nom de la société ou votre sigle ou votre identifiant » (morale) ;
- INSERT `membre` avec code `MBR` + mois + compteur + année, `etatmbr = 1` (Non traité), `typembr = 3`, colonnes : code, nom, sexe, téléphone, mail, identifiant, mot de passe, état, ville, adresse, CNI, employeur, type, situation, enfants, catégorie, pseudo, banque/boutique, domaine. **Non écrits** : `droitmbr` (défaut `00000`), `observmbr`, `pointcaissembr` (défaut 2), `codepointagembr` ;
- si Banque/Boutique = Banque : INSERT `banque(indexmbr, nombqe = nom, etatbqe = 2)` ;
- photo : l'identifiant de la nouvelle fiche n'est pas retrouvé (recherche sur `chp00` vide), donc le fichier est enregistré sous **`mbr.jpg`** (bug) ;
- message : « Votre inscription est effective. Veuillez utiliser votre identifiant et mot de passe pour accéder aux contenus du site. » ;
- pas d'e-mail, pas de validation bloquante : le nouveau membre peut se connecter immédiatement ; il apparaît dans « New Membres » chez le gestionnaire.

**Contrôles et effets à la modification** :
- UPDATE `membre` de : sexe, téléphone, mail, identifiant, mot de passe, ville, adresse, CNI, employeur, type (**pris dans un champ caché**), situation, enfants, catégorie, pseudo, banque/boutique, domaine, code pointage ;
- **non modifiables par cet écran** : nom (`nomprenmbr`), état, droits, observation, date Master, point caisse ;
- le contrôle d'unicité de l'identifiant est **désactivé** (compteur forcé à 0) : deux membres peuvent avoir le même identifiant ;
- si Banque/Boutique = Banque : `UPDATE banque … WHERE indexbqe = 1`, qui **écrase toujours la banque n° 1** (bug) ;
- message « Modification effectuée. » ; photo `mbr{id}.jpg`.

**À ne pas reproduire** : mot de passe réaffiché dans le formulaire ; type de compte en champ caché ; captcha dont la réponse est écrite dans la page (`motmagiq1` caché) ; perte de saisie au changement de personnalité ; bugs banque n° 1 et `mbr.jpg` ; validation du téléphone morte ; colonnes plus courtes que les champs du formulaire (téléphone 9 contre 30, identifiant 15 contre 20, mail 35, nom 50) qui tronquent sans prévenir ; message « mot de passe » pour un identifiant vide.

**Checklist** : F-TRV-13 à F-TRV-30.

---

### E-TRV-06 — Mot de passe oublié

**Fichier et URL** : `pmotpasoublie.php?insc=1&opt=1#connex`. **Accès** : tous (lien affiché pour V). La boîte de connexion n'apparaît pas sur cette page (`insc = 1`).

**Formulaire** :

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Personalité: | chp04 | liste | « », Physique, Morale | de fait | doit correspondre à `categoriembr` | « Vos cordonnées ne sont pas excates » (sic, espace final) |
| Nom-Prénom ou Nom société: | chp01 | texte, 60 max | — | de fait | égal à `nomprenmbr` | idem |
| Pseudonyme ou Sigle: | chp02 | texte, 30 max | — | de fait | égal à `pseudombr` | idem |
| Numéro de phone: | chp03 | texte, 30 max | — | de fait | égal à `phonembr` | idem |

Boutons « Vérifier » (vert) et « Annuler ».

**Résultat** : si les quatre critères correspondent (sans filtre sur l'état, donc un membre supprimé aussi), la page affiche en clair « IDENTIFIANT: {identifiant} ----/---- MOT DE PASSE: {mot de passe} ».

**À ne pas reproduire** : restitution du mot de passe à l'écran. À remplacer par un lien de réinitialisation à usage unique envoyé par e-mail (ou une procédure validée par le gestionnaire si l'e-mail est absent ; à arbitrer, beaucoup de membres n'ont pas d'e-mail). Le besoin métier à conserver est « retrouver son identifiant et réinitialiser son mot de passe ».

**Checklist** : F-TRV-31, F-TRV-32.

---

### E-TRV-07 — Aide « Comment m'utiliser ? »

- Lien présent dans le pied de page de toutes les pages : `choix{N}.php?insc=0&opt=0&aide=1`, puis `aide=0` pour replier.
- Affiche `parametre.aidepmt` dans un cadre défilant de 150 px, sur fond blanc, sous le pied de page (sauts de ligne convertis ; HTML non échappé).
- Contenu en production : un texte d'aide général commençant par « Il est possible d'utiliser lafrangine.com sans s'inscrire. »
- Modifiable par le gestionnaire dans `pparametre` (champ « Aide »).

**Checklist** : F-TRV-33, F-TRV-34.

---

### E-TRV-08 — Contact

**Fichier et URL** : `pcontact.php?opt=1&insc=0` (formulaire, lien depuis l'e-mail de l'en-tête) ; `?ictt={id}&opt=2` (consultation ou réponse).

**Accès** :
- formulaire : V, M, Ma, G ;
- liste : connectés seulement. M ne voit que ses messages ; **Ma voit tous les messages** (aucun filtre) ; G voit tout ;
- réponse (champ « Réponse ») : G et **Ma** ;
- modification de l'objet, du texte et de l'état : quiconque ouvre la fiche, y compris le M auteur et, par URL, un visiteur.

**Formulaire** :

| Libellé | Champ | Contrôle | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|
| Date: (fiche existante) | chp03 | lecture seule | — | stockée en chaîne `AAAAMMJJhhmmss` | — |
| Nom-prénom: | chp02 | texte, 50 max ; connecté : lecture seule, prérempli avec le nom du membre | V : oui | V : longueur ≥ 5 | « Veuillez taper votre nom et prénom avec 5 caractères minimum » |
| Adresse mail: | chp07 | texte, 50 max ; connecté : lecture seule, prérempli | oui | longueur ≥ 3 | « Veuillez indiquer l'adresse mail » |
| Objet: | chp04 | texte, 120 max | oui | longueur ≥ 5 | « L'objet du message doit avoir 5 caractères minimum » |
| Texte: | chp05 | zone de texte | oui | longueur ≥ 10 | « Vôtre texte doit avoir 10 caractères minimum » |
| Réponse: (G, Ma) | chp08 | zone de texte | non | — | — |
| Etat fiche: (fiche existante) | chp06 | liste Non traité, Autorisé, Supprimé | — | défaut 2 | — |

Boutons « Envoyer » et « Annuler ».

**Effets** :
- création : anti-doublon sur objet + texte (« Ce message est déjà enregistré. ») ; INSERT `contact` avec `indexmbr` = membre connecté, ou **1** (compte système) pour un visiteur, et `etatctt = 2` ; message « Le message est envoyé » ;
- mise à jour : UPDATE de l'objet, du texte, de l'état, du mail et de `reponsectt` ; message « Le message est envoyé. » ;
- si l'utilisateur n'est pas un M et que la réponse n'est pas vide : envoi d'un e-mail (E-TRV-13e) à l'adresse du contact, avec l'objet du contact comme sujet et la réponse comme corps ; le message devient « Votre opération a bien été envoyée. ».
- **La colonne `reponsectt` est absente du dump** : si la base de production est conforme, l'UPDATE entier échoue (objet, texte et état ne sont pas enregistrés) alors que l'e-mail part quand même. À vérifier sur la base réelle.

**Liste** (connectés) — titre rouge « Formulaire de trie » :
- filtres : G : liste « Membre » (`cht01`, tous les membres) ; autres : identifiant caché = moi. Texte (`cht02`) recherché dans le texte du message. Bouton « OK » ;
- colonnes : Expéditeur (`nomctt`), Date (`jj-mm-aaaa hh:mm:ss`), Objet (lien, 150 caractères), Etat (initiale N, A ou S) ;
- tri par date décroissante ; pagination (E-TRV-13b).

**Code mort** : message « Il faut s'inscrire pour contacter la frangine » (condition `gtre < 0` jamais vraie).

**À ne pas reproduire** : modification du message par son auteur après envoi ; consultation de n'importe quelle fiche par URL ; e-mail envoyé même si l'enregistrement échoue ; e-mail sans validation de format.

**Checklist** : F-TRV-35 à F-TRV-42.

---

### E-TRV-09 — Publicité

#### a) Widget « publicités » (`incl-publicite.php`)

- **Présent sur** : accueil (V, M, Ma), S2 (sauf G, sous le titre « LES PUBLICITES »), et sections 4, 5, 6 et `opportunite.php` (hors périmètre). **Absent de la S1.**
- Sélection : au plus **10** publicités à l'état 2 dont la date du jour est comprise entre `datedebpub` et `datefinpub`, en **ordre aléatoire**.
- Chaque élément : image `../image/ig/pub{id}.jpg` (toujours `.jpg`, même pour un son ou une vidéo), texte complet suivi de « .. », lien « Continuer la suite » vers `incl-affichpub.php?ipub={id}&chx={section}&insc=0`.

#### b) Page d'affichage (`incl-affichpub.php`, page complète malgré son nom)

- **Accès** : tous.
- Colonne gauche (25 %, défilante) : toutes les publicités actives de la période, en ordre aléatoire (vignette au bon format et 50 premiers caractères) ; clic sur `?ipub=…`.
- Zone principale : la publicité choisie. Image à 50 % de largeur + texte ; son : lecteur `<audio>` en lecture automatique + texte ; vidéo : `<object type="application/x-mplayer2">` + texte.
- **Effet** : `nbvuepub + 1` et `datevuepub = maintenant` à chaque affichage d'une publicité.
- Le bandeau reprend la section d'origine (`chx`) ; le menu visiteur est affiché même pour G.

#### c) Gestion des publicités (`ppublicite.php`, voir aussi E-ADM-14)

Décrite en administration (E-ADM-14).

**À ne pas reproduire** : vignette `.jpg` codée en dur ; lecteur vidéo Windows Media (utiliser `<video>` HTML5).

**Checklist** : F-TRV-43 à F-TRV-47.

---

### E-TRV-10 — Messagerie privée membre ↔ « la frangine »

**Fichiers** : `incl-message.php` (boîte intégrée au pied de page pour Ma et M), `pmessage.php` (écran du gestionnaire, lien SECTIONS > Message).

**Modèle réel** (corrige le dictionnaire) : `message.indexmbr` = **destinataire** (0 = la frangine) ; `index1mbr` = **expéditeur** ; `etatmsg` 1 = non lu, 2 = lu. En production, 13 messages sur 35 ont `indexmbr = 0` et aucun n'a `index1mbr = 0`.

**Boîte membre (pied de page de toutes les pages, Ma et M)** :
- fil : messages que j'ai reçus (`indexmbr = moi`) et messages que j'ai envoyés à la frangine (`index1mbr = moi` et `indexmbr = 0`), par date croissante ; un séparateur de date encadré à chaque changement de jour ; bulle grise à gauche pour mes messages, bulle verte à droite pour les réponses ; heure en petit ;
- formulaire : zone de texte (`chp02`) + bouton « Envoyer » (rouge) + bouton « Actualiser » (jaune, simple rechargement) ; destinataire caché `chp01` = `dest` du GET ou 0 ;
- envoi : si le texte n'est pas vide, INSERT `message(datemsg, indexmbr = dest, index1mbr = moi, textemsg, etatmsg = 1)`. Si le texte est vide, le message « ERREUR. La zone de texte est vide. » est produit mais **jamais affiché** ;
- **marquage lu** : à chaque page affichée par un non-gestionnaire, UPDATE `etatmsg = 2` des messages qui lui sont adressés. Le compteur « Message: N » est calculé juste avant : il n'est donc visible qu'une fois ;
- fond vert de la boîte = la frangine a sa messagerie ouverte (`connexmsgpmt = 1`).

**Écran gestionnaire (`pmessage.php`)** :
- à l'ouverture : `parametre.connexmsgpmt = 1` (présence « la frangine en ligne », remis à 0 à la déconnexion du gestionnaire) ;
- colonne gauche : tous les membres sauf le n° 1, triés par nom, sous la forme « Nom--N » (N = messages non lus que ce membre a envoyés à la frangine). Couleurs : vert = conversation ouverte, **jaune = membre en ligne** (`connexmsgmbr = 1`), noir sinon. Clic sur `?dest={id}&opt=2&insc=2` ;
- fil de la conversation : (`indexmbr = 0` et `index1mbr = dest`) ou (`indexmbr = dest` et `index1mbr = moi`). Les réponses d'un **autre** gestionnaire n'apparaissent pas ;
- envoi : INSERT (`indexmbr = dest`, `index1mbr = G`), puis marquage « lu » de tous les messages de ce membre à la frangine. Message d'erreur « La zone de texte est vide. » jamais affiché ;
- accessible aussi à un membre par URL (colonne gauche vide, conversation avec la frangine).

**Checklist** : F-TRV-48 à F-TRV-55.

---

### E-TRV-11 — Dialogue contextuel

**Fichiers** : `incl-dialogue.php` (inclus uniquement par `choix7.php`, contexte Trésorerie et Conseil financier, `typedlg = podc` ; hors périmètre pour le contexte) ; `pdialogue.php` (page autonome **orpheline** : tous les liens « Ecrire à la frangine » sont commentés).

**Comportement commun** :
- recherche plein texte (`cht01`, placeholder « Rechercher », bouton « OK ») dans `textedlg` ; seuls les messages à l'état 2 ;
- **vue membre** : ses messages (à gauche) et ceux qui lui sont adressés (à droite, décalés) ; date en gris ;
- **vue G** : messages adressés à la frangine (`indexmbrdlg = 0`) avec le nom de l'auteur en bleu et un lien « Repondre » ; messages adressés à un membre avec le nom du destinataire ;
- formulaire « Message: » (« à {nom} » en mode réponse), zone de texte `chp05`, bouton « Envoyer » ; INSERT `dialogue(indexmbr, indexmbrdlg, typedlg, datedlg, textedlg, etatdlg = 2)` ;
- validation : `incl-dialogue` : G sans destinataire, « Veuillez indiquer le destinataire du message. » ; texte de moins de 2 caractères, « Votre message doit avoir 2 caractères minimun. ». `pdialogue` : moins de 5 caractères, « Votre message doit avoir 5 caractères minimun. ».

**Bugs à ne pas reproduire** :
- le destinataire d'une réponse du gestionnaire vaut `isset($_GET['imbrdlg'])`, soit **1** : toutes les réponses partent vers le membre n° 1, et le nom affiché est celui du membre n° 1 ;
- dans `pdialogue`, `typedlg` reçoit la valeur du destinataire au lieu du type ;
- un visiteur voit tous les messages adressés à la frangine (comparaison lâche entre `null` et 0) ;
- messages non modérés (état forcé à 2).

**Recommandation** : fusionner dialogue et messagerie privée dans la nouvelle version, sous réserve d'un arbitrage métier.

**Checklist** : F-TRV-56 à F-TRV-58.

---

### E-TRV-12 — Suggestions

**Fichier et URL** : `psugest.php?opt=0` (liste) ; `?opt=1` (nouvelle) ; `?isgt={id}&opt=2` (fiche). Lien « Suggestion ? » dans le pied de page (connectés) et dans le menu FICHIERS > Suggestions (G).

**Accès** : connectés par le lien ; aucune vérification (un visiteur passe par URL). **Tout utilisateur voit toutes les suggestions et peut les modifier**, état compris.

**Formulaire** (icône « Nouvelle suggestion ») :

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Date: | chp01 | lecture seule (maintenant) | — | — | — | — |
| Module: | chp02 | liste | Accueil (0), Le saviez-vous ?, Ressources humaines, E-commerce, Appels de fonds, Opportunite d'affaire, Entreprises - Marches, Offres Financieres, Tous les modules (8) | oui | ≠ 0, donc « Accueil » est **refusé** | « Veuillez indiquer le module » |
| Suggestion: | chp03 | zone de texte | — | oui | longueur ≥ 10 | « Vôtre suggestion doit avoir 10 caractères minimum » |
| Etat fiche: | chp04 | liste Non traité, Autorisé, Supprimé | — | — | ignoré à la création (forcé à 2) | — |

- Doublon : « Cette suggestion est déjà enregistrée. », mais le contrôle compare le module à la **date** et ne détecte donc jamais rien.
- Aucune trace de l'auteur. Messages « Enregistrement effectué. » et « Modification effectuée. ».

**Liste** : « Formulaire de trie » avec « Module ? » (`cht01`, 1 à 8) et Texte (`cht02`, valeur initiale « Texte » ignorée) ; G voit « N Suggestions » ; « NB. Pour consulter la fiche d'une suggestion, Veuillez cliquer sur dessus » ; colonnes Date, Suggestion (150 caractères, lien), Etat (initiale) ; tri par date **croissante** ; pagination.

**Production** : table vide (0 ligne).

**À ne pas reproduire** : modification et changement d'état par tous (réserver au gestionnaire) ; refus de la valeur « Accueil » ; anti-doublon cassé.

**Checklist** : F-TRV-59 à F-TRV-63.

---

### E-TRV-13 — Composants techniques

**a) Upload (`incl-upload.php`)**
- Entrée : `$_FILES['monfichier']` et un nom cible `$nomphoto`. Destination `../image/ig/{nomphoto}`, qui écrase le fichier existant.
- Plus de 4 227 532 octets : refus avec « Image trop grande. Veuillez la réduire ou changer. ».
- **Entre 250 000 et 4 227 532 octets seulement** : contrôle de l'extension (jpg, jpeg, gif, png, pdf, doc, vob, wmv, en minuscules ou majuscules) et redimensionnement **forcé à 300×250**, qui déforme l'image. Sous 250 000 octets, le fichier est copié tel quel, **sans contrôle d'extension**. Un fichier au-dessus du seuil mais d'extension refusée est quand même copié.
- Noms utilisés dans le périmètre : `mbr{id}.jpg`, `hmn{id}.jpg`, `cv{id}.pdf`, `pdt{id}.jpg`, `pub{id}.{jpg|mp3|mp4}`.
- Chemins d'affichage incohérents : `../image/ig/` en général, `../ic/` dans `incl-sounga` (lien cassé).

**b) Pagination (`incl-pagination.php`, `incl-calculpagination.php`, `incl-changpage.php`)**
- 50 lignes par défaut ; liste « Nombre de lignes par page: » de 50 à 500 par pas de 50 (mémorisée en session) ; liste « Page: » de 1 à N ; affichées uniquement s'il y a plus d'une page.
- **Bug** : le changement de page n'a aucun effet. La requête lit un paramètre `limit` jamais transmis, donc toujours `LIMIT 0, n`. Seule la taille de page fonctionne.
- Les critères de recherche sont mémorisés dans une **variable de session unique** `crittriegl`, partagée entre tous les écrans.

**c) Messages** : `incl-erreur.php` (titre « ERREURS » et `msg[1..30]`) ; `incl-msgfinoperat.php` (bandeau du message de fin). Après un enregistrement, plusieurs modules (conseil, RH) affichent le message et un lien « Retour … », puis **arrêtent la page** (`exit`) : ni pied de page ni bas de page.

**d) Impression** : les liens `imp=1` écrivent un fichier `../if/if*.txt` puis redirigent vers `ifmbr.php` ou `ifpub.php`, **absents du code** : fonction cassée. Le lien « IMPRIMER » de `ppublicite` imprime en outre la liste des **membres**. À reconstruire (export CSV ou PDF) seulement si le métier en a besoin.

**e) Envoi de mail (`incl-envoimail.php`)** : `mail()` PHP, en-têtes `From` et `Reply-to` = nom et e-mail de `parametre`, corps HTML UTF-8 en `multipart/alternative` avec une seule partie. Variables d'entrée : `$destinatairemail`, `$sujetmail`, `$messagemail`. Positionne `$message = "Votre opération a bien été envoyée."`. Utilisé par `pcontact` (réponse) et, hors périmètre, par les opérations bancaires et la prospective.

**f) Divers** : `phone()` accepte une valeur vide ou 9 chiffres commençant par 01, 04, 05, 06 ou 22 (numérotation congolaise ancienne ; à revalider pour la numérotation actuelle) ; `codecharden()` n'est pas utilisé dans ce périmètre ; `age()` renvoie « X ans Y mois ».

**Checklist** : F-TRV-64 à F-TRV-70.

---

## 2. Administration

### Règles communes des écrans p*.php

- **Accès voulu** : G (menu FICHIERS). **Accès réel** : aucun contrôle. Le menu gestionnaire est inclus sans condition, donc un visiteur qui tape l'URL voit l'écran et peut enregistrer. La nouvelle version doit exiger G, plus G+Act pour les changements d'état.
- Mise en page standard : icône « Nouveau » (`?opt=1`) → formulaire au-dessus → message → liste en dessous, avec lien de modification sur le libellé (`?i…=id&opt=2&insc=2`) et « NB. Pour consulter … cliquer sur son nom ».
- Aucune suppression physique dans les référentiels : pas de bouton, ou passage à l'état 3.
- Compteurs « N … » affichés au gestionnaire en tête de liste.
- Pagination commune (E-TRV-13b).

---

### E-ADM-01 — Paramètres « La frangine » (`pparametre.php?opt=2&insc=0`)

Écran unique qui modifie la ligne `parametre` n° 1.

| Libellé | Champ (colonne) | Contrôle | Règle | Message exact |
|---|---|---|---|---|
| Nom Site: | chp01 (`nompmt`) | texte, 50 max | **jamais enregistré** (absent de l'UPDATE) | — |
| Adresse: | chp02 (`adressepmt`) | texte, 120 max | — | — |
| Téléphone-1: | chp03 (`phone1pmt`) | texte, 9 max, `checkNumber` | `phone()` | « ERREUR. Veuillez vérifier le numéro de téléphone 1 » |
| Téléphone-2: | chp04 (`phone2pmt`) | idem | `phone()` | « ERREUR. Veuillez vérifier le numéro de téléphone 2 » |
| Mail: | chp05 (`mailpmt`) | texte, 40 max | — | — |
| Aide: | chp06 (`aidepmt`) | barre d'édition + zone de texte (HTML autorisé) | — | — |
| Fond Placement: | chp07 (`fondplacementpmt`) | numérique, 12 max | — | — |
| Montant course: | chp08 (`montantcoursepmt`) | numérique | — | — |
| Commission course: | chp09 (`commissioncoursepmt`) | numérique (le filtre JS vise par erreur le champ chp08) | — | — |
| Condition course: | chp10 (`conditioncoursepmt`) | barre d'édition + zone de texte | — | — |
| Le saviez-vous ?: … Offres Financieres: | chp111 à chp117 (`choix1pmt` à `choix7pmt`) | 7 zones de texte (textes des cartes de l'accueil) | — | — |

- Boutons « Enregistrer » et « Annuler » ; message « Modification effectuée. ».
- Les montants « Fond Placement », « Montant course » et « Commission course » sont consommés par les sections 3 et 7 (hors périmètre).
- **Bugs** : si le téléphone 1 est invalide mais le téléphone 2 valide, l'enregistrement passe (le second contrôle écrase le premier) ; en cas d'erreur, `err` est remis à 0 avant l'affichage, donc **aucun message n'apparaît** et rien n'est enregistré ; « Nom Site » est modifiable à l'écran mais ignoré.

**Checklist** : F-ADM-01 à F-ADM-04.

---

### E-ADM-02 — Membres (`pmembre.php`)

URL : `?opt=0` (liste), `?opt=1` (nouveau), `?imbr={id}&opt=2&insc=2` (fiche), `?opt=0&afi=1|2` (tri). Formulaire : `incl-formulairemembre.php`, en contexte gestionnaire.

**Différences avec le formulaire public (E-TRV-04)** :
- affichés : « Type » (Gestionnaire, Master, Membre) et « Point caisse » (Oui, Non) ; « Etat fiche » ; si G+Droit, le mot de passe en **clair** et les cases « Les droits » (Droit, Caisse, Activation) ; code de pointage en lecture seule avec la case « Création code de pointage » ;
- **le mot de contrôle reste obligatoire** ;
- le changement de personnalité est pris en compte en modification.

**Validation (messages exacts)** :
- type = 0 : « Veuillez indiquer Gestionnaire ou Membre. » ;
- nom trop court : « Vôtre nom et prénom doivent avoir 3 caractères minimun. » ou « Le nom de la personne morale doit avoir 3 caractères minimun. » ;
- sexe = 0 : « Veuillez indiquer le sexe. » ;
- identifiant vide : « Veuillez vérifier votre mot de passe. » ;
- identifiant égal au mot de passe : « l'identifiant doit être différent du mot de passe. » (les deux champs sont alors remplacés par « Erreur ») ;
- mot de passe vide ou confirmation différente : « Veuillez vérifier votre mot de passe » (sans point) ;
- ville = 0 : « Veuillez indiquer la ville du Gestionnaire ou Membre » ;
- personnalité = 0 : « Veuillez indiquer si le membre est une personne physique, association ou entreprise. » ;
- situation matrimoniale d'une personne physique : « Veuillez indiquer la situation matrimoniale pour la personne physique. » ;
- pseudonyme de moins de 6 caractères : « Le pseudonyme doit avoir 6 caractères minimun. » ;
- sigle : le code refuse **moins de 2** caractères mais le message dit « Le sigle de la société doit avoir 3 caractères minimun. » ;
- point caisse = 0 : « Veuillez indiquer si le membre à droit au point de caisse. » ;
- mot de contrôle : « Veuillez vérifier votre mot de contrôle. » ;
- téléphone : contrôle mort, comme en public ;
- doublons à la création : mêmes messages qu'en public.

**Effets** :
- création : INSERT complet (type, code `MBR…`, nom, sexe, téléphone, mail, ville, identifiant, mot de passe, état, observation, **droits sur 3 caractères**, adresse, CNI, employeur, situation, enfants, catégorie, pseudo, banque/boutique, domaine, point caisse, code pointage) ; photo `mbr.jpg` (même bug qu'en public) ;
- modification : UPDATE de tous ces champs, **nom compris**. `datemastermbr` n'est jamais enregistré ;
- case « Création code de pointage » cochée : code = nombre aléatoire entre 4 et 9999 (donc pas forcément à 4 chiffres) ;
- droits : chaîne de 3 caractères, un par case cochée. **Bug** : un G **sans** droit « Droit » qui enregistre une fiche remet les droits du membre à `000`, car les cases ne sont pas affichées et donc lues comme décochées.

**Liste** — « Formulaire de trie » :
- filtres : « Catégorie Membre » (`cht01`, en réalité le type Gestionnaire, Master ou Membre), « La ville du membre » (`cht02`), « Texte à rechercher » (`cht04`, dans l'observation **ou** le nom), « Etat » (`cht03`) ; bouton « OK » ;
- en-tête « N Membres » ; « NB. Pour consulter la fiche d'un membre, Veuillez cliquer sur son nom » ;
- colonnes : Type (3 lettres : Ges, Mas, Mem), Pers. (Phy, Mor), Nom - Prénom (lien), Phone, Mail, Ville, Etat (initiale) ;
- tri par nom puis type ; un clic sur l'en-tête « Nom - Prénom » bascule sur « plus récents d'abord » (`afi`) ;
- le membre n° 1 (compte système) est masqué, sauf pour lui-même ;
- les membres sans ville valide sont exclus (jointure).

**À ne pas reproduire** : captcha en administration ; mot de passe visible (prévoir une action « réinitialiser le mot de passe ») ; remise à zéro involontaire des droits ; précédence OR/AND du filtre texte ; code de pointage non borné à 4 chiffres.

**Checklist** : F-ADM-05 à F-ADM-15.

---

### E-ADM-03 — Villes et quartiers (`pvilqtr.php?vilqtr=1|2`)

| Écran | Champs | Règles et messages exacts |
|---|---|---|
| Villes (`vilqtr=1`) | « Nom ville: » (chp02, 35 max) | longueur ≥ 4 : « Le nom doit avoir 4 caractères minimun » ; doublon : « Cette ville est déjà enregistrée. » |
| Quartiers (`vilqtr=2`) | « Ville: » (chp01, liste) ; « Nom quartier: » (chp02, 35 max) | ville ≠ 0 : « Chaque quartier doit être lié a une ville » ; longueur ≥ 4 ; doublon (ville + nom) : « Cette ville est déjà enregistrée. » (même message pour les quartiers) |

- Pas d'état, pas de suppression.
- Liste des villes : Ville (lien), tri alphabétique. Liste des quartiers : Ville, Quartier (lien), tri par ville puis quartier.
- Le nom **n'est pas** mis en majuscules (le `strtoupper` est écrasé à la ligne suivante), contrairement à ce que dit le dictionnaire.
- `quartier.indexvil` est un `tinyint` (127 villes au maximum).
- Production : 4 villes, 22 quartiers.

**Checklist** : F-ADM-16, F-ADM-17.

---

### E-ADM-04 — Diplômes (`pdiplome.php`)

- Champs : « Code: » (chp01, 10 max, **mis en majuscules**) ; « Libellé: » (chp02, 50 max).
- Validation : libellé d'au moins 5 caractères, « Le libellé doit avoir 5 caractères minimul. » (sic) ; doublon de libellé, « Ce diplôme est déjà enregistré. ».
- Liste : Code, Libellé (lien), tri par libellé. Pas d'état, pas de suppression.
- **Aucune utilisation fonctionnelle** : `choix2.php` charge la table dans des tableaux jamais affichés, et le champ Diplômes des fiches RH est un texte libre. 9 lignes en production.

**Checklist** : F-ADM-18.

---

### E-ADM-05 — Secteurs et domaines d'activité (`psatdat.php?satdat=1|2`)

- Champs : domaine seulement, « Secteur activité: » (chp03, liste) ; « Libellé: » (chp01, 200 max) ; « Etat fiche: » (chp02, Non traité ou Autorisé, défaut 2).
- Validation : libellé d'au moins 5 caractères, « Le libellé doit avoir 5 caractères minimum. » ; domaine sans secteur, « Tout domaine d'activité est lié à un secteur. Veuillez indiquer le secteur. ». **Ce second contrôle est inopérant** : la première option vide de la liste vaut 1, donc le secteur n° 1 est choisi par défaut.
- Doublon : « Cette fiche est déjà enregistrée. ».
- Liste des secteurs : « Nom Secteur activité » (lien), Etat (initiale). Liste des domaines : Secteur (en majuscules, affiché une seule fois par groupe, lien vers la fiche du secteur), « Nom Domaine » (lien), Etat. En-tête « N Enregistrements ».
- L'état **n'est jamais utilisé comme filtre** dans les listes de domaines de l'inscription et de la RH : un domaine « Non traité » reste proposé. Production : 21 secteurs et 285 domaines, tous à l'état 2.

**Checklist** : F-ADM-19, F-ADM-20.

---

### E-ADM-06 — Familles d'articles (`pfamilart.php`)

- Champ « Libellé: » (chp01, 50 max, **pas** de majuscules forcées).
- Validation : moins de 5 caractères, « Le libellé doit avoir 5 caractères minimum. » ; doublon, « Cette famille de maladie est déjà enregistrée. » (message erroné, à corriger en « famille d'article »).
- Liste : Libellé (lien) ; en-tête « N Famille d'article » ; « NB. Pour consulter la fiche d'un article, Veuillez cliquer sur son nom ».
- Pas d'état, pas de suppression. Utilisé par la section 3 (articles). 6 lignes en production.

**Checklist** : F-ADM-21.

---

### E-ADM-07 — Maladies (`pmaladie.php`)

| Libellé | Champ (colonne) | Contrôle | Règle et message exact |
|---|---|---|---|
| Libellé: | chp01 (`libelemld`) | texte, 50 max | moins de 5 caractères : « Le libellé doit avoir 5 caractères minimum. » ; doublon : « Cette maladie est déjà enregistrée. » |
| Description: | chp02 (`descriptionmld`) | zone de texte | — |
| Produit et Posologie: (5 lignes) | chp031 à chp035 (`index1pdt` à `index5pdt`) + chp041 à chp045 (`posologie1pdtmld` à `posologie5pdtmld`) | 5 paires liste de **tous** les produits + zone de posologie | — |
| Etat fiche: | chp05 (`etatmld`) | liste Non traité, Autorisé, Supprimé (défaut 2) | — |

- Liste : Libellé (lien) ; en-tête « N Maladies » ; « NB. Pour consulter une fiche d'une maladie, Veuillez cliquer sur son nom ».
- **Découverte majeure** : ces 5 couples produit et posologie ne sont **lus par aucune page publique**. La page Santé (E-S1-04) utilise le lien inverse `produit.index1mld` à `index5mld`, qu'aucun écran ne permet plus de saisir.
- En production : Hypertension a 5 produits configurés ici, mais la page publique en affiche 2 ; Diabète a 1 produit configuré ; Paludisme, Courbature et Ebola n'ont rien de configuré ici mais affichent chacun 1 produit côté public.
- **Décision à prendre pour la réécriture** : une seule relation maladie ↔ produit avec posologie, alimentée à la migration par l'**union** des deux sources, puis administrée depuis cet écran.

**Checklist** : F-ADM-22 à F-ADM-24.

---

### E-ADM-08 — Produits (`pproduit.php`)

| Libellé | Champ (colonne) | Contrôle | Règle |
|---|---|---|---|
| Groupes: | chp08 (`groupepdt`) | liste des 20 groupes FLP (`$arraygroupeproduit`) + vide | — |
| Référence: | chp01 (`referencepdt`) | texte libre, 20 max | — |
| Libellé: | chp02 (`nompdt`) | texte, 50 max | le code refuse **moins de 3** caractères ; message « Le nom du produit doit avoir 4 caractères minimum. » |
| Description: | chp03 | zone de texte | — |
| Prix dist.: / Prix N.D: / Prix public: | chp04, chp05, chp06 (`prixdistpdt`, `prixcompdt`, `prixpubpdt`) | numérique, 7 max, affiché avec séparateur de milliers | espaces supprimés à l'enregistrement |
| Quantité: | chp07 (`quantitepdt`) | numérique | stock |
| Etat fiche: | chp09 | liste Non traité, Autorisé, Supprimé | **ignoré à la création** (forcé à 2) |
| Photo: | monfichier | fichier | `pdt{id}.jpg` |

- **Anti-doublon cassé** : la requête cite une colonne inexistante `gropupepdt` et compare la **quantité**. Le message « Ce produit est déjà enregistré » ne sort donc jamais.
- La posologie (`posologie1pdt` à `posologie5pdt`) et les liens vers les maladies (`index1mld` à `index5mld`) ne sont **pas modifiables** ici, alors qu'ils sont affichés côté public (S1 Santé).
- Liste — « Formulaire de trie » : « Groupe produit » (`cht01`), « Prix distr. » maximum (`cht02`), « Prix public » maximum (`cht03`), « Quantité » maximum (`cht04`), Texte (`cht05`, dans le nom ou la description) ; colonnes : vignette (agrandie au survol), Référence, Nom du produit (lien), Prix dist., Prix N.D., Prix public, Quantité ; tri par nom ; en-tête « N Produits ».
- 130 produits en production. Catalogue partagé avec la section 5 (vente de produits FLP).

**Checklist** : F-ADM-25 à F-ADM-27.

---

### E-ADM-09 — Produits prospective (`pproduitptpv.php`)

- Champs : « Nom du produit: » (chp01, 125 max ; moins de 4 caractères : « Le nom du produit doit avoir 4 caractères minimun » ; doublon : « Ce produit est déjà enregistré. ») ; « Etat fiche: » (chp02, 1 à 3, forcé à 2 à la création).
- Liste : « Nom produit » (lien), Etat (libellé complet) ; en-tête « N Produits ».
- Référentiel consommé par le comparateur de prix de la section 6 (hors périmètre). 3 lignes en production.

**Checklist** : F-ADM-28.

---

### E-ADM-10 — Banques (`pbanque.php`)

Page **orpheline** : le lien de menu est commenté, l'écran n'est accessible que par URL.

| Libellé | Champ | Contrôle | Règle et message exact |
|---|---|---|---|
| Sigle: | chp01 | texte, 7 max, mis en majuscules | — |
| Nom de la banque: | chp02 | texte, 50 max | moins de 3 caractères : « Veuillez saisir le nom de la banque avec 3 caractères minimum. » ; doublon sigle + nom : « Cette banque est déjà enregistrée. » |
| Téléphones:, Adresse:, Mail:, Adresse Site:, Contact:, Téléphone contact: | chp03 à chp08 | textes (50 ou 90 max) | — |
| Observation: | chp09 | zone de texte | — |
| Etat fiche: | chp10 | liste 1 à 3, défaut 2 | — |

- Liste : Banque (lien), « Contact avec banque », « Phone contact », Etat ; en-tête « N Banques ».
- Utilisé par la section 7 (benchmarking, opérations bancaires). 12 banques en production.
- **À décider** : réintégrer l'écran au menu d'administration de la nouvelle version.

**Checklist** : F-ADM-29.

---

### E-ADM-11 — Visites (`pvisite.php?opt=0`)

- Liste « Visites générale ou des membres » (`cht05`, soumission au changement) : « » (rien n'est affiché), « Visites générales » (table `visite`), « Visites des membres » (table `visitembr`).
- Filtres :
  - Date (`cht01` et `cht01A`, valeur initiale « 00-00-0000 », calendrier) : **déclenche une erreur fatale**, la fonction `datefr3()` n'existant pas ;
  - Heure de début et de fin (`cht02a` et `cht02b` heure et minute, `cht02c` et `cht02d`), comparées au format HHMM ;
  - Adresse IP (`cht03`, recherche partielle) ;
  - Membre (`cht04`, seulement pour les visites des membres) ;
  - bouton « OK ».
- En-tête « N Visites ». Colonnes : case à cocher (icône « Sélection et Suppression des visites »), Date-Heure, Adresse IP, Membre (visites des membres). Tri par date décroissante.
- Bouton « Supr » : **suppression physique** des lignes cochées de la page affichée.
- Production : 10 032 visites anonymes (toutes rattachées au membre 1) et 596 connexions de membres.
- **À ne pas reproduire** : erreur fatale du filtre date ; suppression sans confirmation (à remplacer par une purge par période, réservée au gestionnaire).

**Checklist** : F-ADM-30 à F-ADM-33.

---

### E-ADM-12 — Suggestions (modération)

Même écran que E-TRV-12. Le gestionnaire voit le compteur et change l'état. Dans la nouvelle version, la liste et la modification doivent être réservées au gestionnaire.

---

### E-ADM-13 — Messagerie gestionnaire

Voir E-TRV-10 (`pmessage.php`).

---

### E-ADM-14 — Gestion des publicités (`ppublicite.php`)

URL : `?opt=1` (nouveau), `?ipub={id}&opt=2`, `?pst=1|2` (vue tableau ou cartes). Lien SECTIONS > Publicité (G). Aucun contrôle d'accès.

| Libellé | Champ (colonne) | Contrôle | Oblig. | Règle et message exact |
|---|---|---|---|---|
| Demandeur *: | chp01 (`indexmbr`) | liste de tous les membres | oui | ≠ 0 : « Veuillez indiquer Gestionnaire ou Membre. » |
| Entreprise *: | chp02 (`indexent`) | liste des entreprises | oui | ≠ 0 : « Veuillez indiquer l'entreprise. » |
| Texte *: | chp05 (`textepub`) | barre d'édition + zone de texte (HTML stocké tel quel) | oui | au moins 6 caractères : « Le texte doit avoir 6 caractères minimum » ; doublon de texte : « Cette publicité est déjà enregistrée. » |
| Date début publicat *: | chp06 | date (calendrier) | de fait | **aucun contrôle** (ni ordre ni présence) |
| Date fin publicat° *: | chp07 | date | de fait | aucun |
| Date insertion : | chp08 | lecture seule | — | — |
| Date et nombre de vue: | chp09, chp10 | lecture seule | — | — |
| Etat fiche: (droit Activation seulement) | chp11 | liste 1 à 3 ; sinon caché = 1 | — | nouvelle publicité à l'état 1 (Non traité) sans droit Activation |
| Fichier: | monfichier | fichier | — | `pub{id}.{jpg, mp3 ou mp4}` |
| Type fichier: | chp12 (`typefichpub`) | liste « », Image, Son, Video | oui | ≠ 0 : « Veuillez indiquer le format du fichier de la publicité » |

- Objet (`objetpub`) : champ caché, vestige.
- Référence générée `PUB…` à la création.
- Liste — « Formulaire de trie » : « Demandeur de la publicité » (`cht01`), « Entreprise » (`cht02`), « Date début publication » entre `cht03` et `cht03A`, « Date fin publication » entre `cht04` et `cht04A`, « Nombre de vue » entre `cht05` et `cht05A`, « Texte » (`cht06`) ; boutons « OK » et « IMPRIMER » (cassé). Les filtres de date sont injectés sans conversion ni guillemets : **erreur SQL** si on les utilise.
- « Changement affichage ? » bascule entre :
  - vue tableau : Date Insc., Date début, Date fin, Demandeur, Texte (50 caractères, lien), Etat ;
  - vue cartes : Référence (lien si G ou Master demandeur), 100 caractères de texte, mini-tableau des dates et du nombre de vues, Demandeur et état (G ou Master demandeur).
- Tri par date d'insertion décroissante.
- Production : 6 publicités (images uniquement).

**Checklist** : F-ADM-34 à F-ADM-38.

---

### E-ADM-15 — Code mort ou orphelin dans le périmètre

- `pbenchmbanque.php` : référence des tables `benchmarking4` et `benchmarking5` et des variables non définies ; lien de menu commenté. **Page cassée**, signalée à l'analyste de la section 7.
- `pdialogue.php` : orphelin (E-TRV-11).
- `incl-connexion.php`, `incl-choix2-1.php` (ancienne liste RH), `inclouvrbd.php` (ancienne base « ndako ») : jamais inclus.
- Tables sans code : `aide`, `client`, `fonction` (famille « hôtel », colonne `indexhtl` ; `fonction` est absente du dictionnaire), `adhesion` (déclarée mais jamais lue ni écrite). Toutes ont 0 ligne.
- `suggestion` : fonctionnelle, mais 0 ligne en production.

---

## 3. Section 1 « Le saviez-vous ? » (`choix1.php`)

### E-S1-00 — Page de section et onglets

**URL** : `choix1.php?insc=0&opt=0&vcpm={1|2|3}`. `vcpm` provient du GET, puis du POST, sinon 0.

**Onglets** (`$arraymenuchoix1`, en majuscules) :
- « INFORMATIONS UTILES (N) » : N = conseils à l'état 2, sujets **et** commentaires ;
- « DECOUVERTE DE SOI » : sans compteur ;
- « SANTE ET BIEN ETRE (N) » : N = **produits** à l'état 2 (123 en production).

L'onglet courant a un style « actif ».

**Sans `vcpm`** (lien du menu) : les trois onglets s'affichent et rien d'autre.

Pas de widget publicité sur cette section. La page reprend l'inscription (`insc=1`) comme toutes les sections.

**Checklist** : F-S1-01, F-S1-02.

---

### E-S1-01 — Informations utiles : liste des sujets

**Fichiers** : `incl-choix1A.php` (liste, fil, commentaires) et `incl-conseil.php` (formulaire de sujet).

**Accès** :
- liste : **tous, visiteurs compris** ;
- création : connectés (icône « Nouveau conseil ou aide », `?insc=2&opt=1&vcpm=1`) ;
- modification : auteur ou G ;
- changement d'état : G+Act ;
- suppression : G.

**Recherche** : champ `cht01` (placeholder « Rechercher », infobulle « Tapez votre mot et cliquez sur OK », bouton « OK ») dans l'objet **ou** le texte.

**Liste** (`opt=0`) :
- sujets (`sujetreponsecsl = 1`) dont l'état n'est pas 3 (donc états 1, 2 et 4), triés par date décroissante ;
- chaque ligne :
  - nom de l'auteur en vert, seulement pour G, pour l'auteur lui-même, ou pour un Master si le sujet est public ;
  - date `jj-mm-aaaa hh:mm:ss` à droite ;
  - « objet: {objet} » en bleu, avec lien vers la fiche (`?icsl=…&opt=2&insc=2&vcpm=1`) pour l'auteur ou G ;
  - texte complet ;
  - lien « Vos commentaires » (`?icsl=…&opt=4&insc=0&vcpm=1`) pour un connecté qui est l'auteur ou si le sujet est public, et pour G ;
  - lien rouge « Suppression » pour G, qui passe l'état à 3 sans confirmation ni contrôle de droit ;
- lignes en couleurs alternées ; pagination.

**Colonne droite** : 10 derniers sujets à l'état 2 (objet sur 120 caractères) avec le lien « Commentaire » pour G, ou pour un connecté si le sujet est public.

**Confidentialité réelle** : Privé ou Public ne change que l'affichage du nom et des liens de commentaire. **Le texte d'un sujet privé est visible de tous, visiteurs compris.** Le libellé du formulaire promet pourtant « Privé: Conseil entre le membre et la frangine ». Dans la nouvelle version, un sujet privé doit être visible uniquement par son auteur et le gestionnaire (écart à valider avec le métier).

**Checklist** : F-S1-03 à F-S1-09.

### E-S1-02 — Informations utiles : fil et commentaires (`opt=4`)

- Lien « Retour aux sujets ? ».
- Encadré gris : « SUJET : {objet} en date du: {date} » suivi du texte.
- Commentaires (`sujetreponsecsl = 2`, même référence, état différent de 3) par date croissante, même rendu que la liste. Le texte d'un commentaire est un lien d'édition pour G ; lien « Suppression » pour G.
- Formulaire « Commentaire: » : zone de texte `chp06`, boutons « Enregistrer commentaire » et « Annuler ».
  - Validation : moins de 2 caractères, « Le commentaire doit avoir 2 caractères minimun. » ; doublon (même texte, **sur toute la table**), « Cet message est déjà enregistrée. ».
  - Effet : INSERT d'un commentaire avec la même référence, la confidentialité du sujet, `etatcsl = 2`, l'auteur = moi ; puis `nbreponsecsl + 1` sur le sujet (compteur jamais affiché).
- Lien « Retour aux sujets ? » en bas.

### E-S1-03 — Informations utiles : formulaire de sujet (`incl-conseil.php`)

| Libellé | Champ | Contrôle | Options | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Confidentialité: | chp09 | liste (infobulle « Confidentialité: Privé: Conseil entre le membre et la frangine. Public: Conseil entre tous les membres ») | « », Privé, Public | oui | ≠ 0 | « Indiquer la confidentialité du conseil: Prive ou public. » |
| Objet: | chp04 | texte, 120 max | — | oui | longueur ≥ 5 | « L'objet du conseil doit avoir 5 caractères minimun. » |
| Texte: | chp06 | zone de texte | — | oui | longueur ≥ 20 | « Le texte du conseil doit avoir 20 caractères minimun. » |
| Etat fiche: (G+Act, modification) | chp07 | liste | Non traité, Autorisé, Supprimé | — | défaut 2 | — |

- Création : doublon référence + objet, « Cette fiche est déjà enregistrée. » ; référence `CSL…` ; INSERT (`sujetreponsecsl = 1`, `etatcsl = 2`, pas de modération a priori) ; message « Enregistrement effectué. » + lien « Retour liste informations utiles » ; **la page s'arrête** (pas de pied de page).
- Modification : UPDATE de l'objet, du texte, de l'état et de la confidentialité ; message « Modification effectuée. ».
- **Bug** : la modification d'un **commentaire** par G passe par ce formulaire, qui exige un objet de 5 caractères et un texte de 20 caractères : un commentaire court ne peut pas être corrigé.
- Aucun contrôle que l'éditeur est bien l'auteur (manipulation d'URL).

**Checklist** : F-S1-10 à F-S1-16.

---

### E-S1-04 — Découverte de soi (« Lisungui »)

**Fichiers** : `choix1.php` (routage), `incl-choix1B.php` (liste), `incl-sounga.php` (questionnaire).

**Accès et routage** :
- **V** : onglet visible, contenu vide.
- **Ma ou M** :
  - s'il a une fiche **non clôturée** (`zone30sga = 2`), le questionnaire s'ouvre directement en modification ;
  - sinon, l'icône « Nouvelle fiche » (`?insc=0&opt=1&vcpm=2`) s'affiche ;
  - en dessous, la liste de **ses** fiches.
- **G** : liste de toutes les fiches ; ouverture par la référence (`choix1.php?isga=…&opt=2&insc=2&vcpm=2`). G ne peut pas créer de fiche.

**Liste (`incl-choix1B.php`)** :
- fiches dont `etatsga` n'est pas 3, triées par date décroissante ;
- G voit l'en-tête « N Lisungui » ;
- « NB. Pour consulter une fiche de découverte de soi, Veuillez cliquer sur sa référence » ;
- colonnes : Référence (lien), Date, Membre (lien vers le profil, `?imbr=…&opt=2&insc=1&vcpm=2`), et « X » rouge pour G (suppression logique par `etatsga = 3`, sans confirmation).

**Questionnaire** — en tête : nom du membre (gras, bleu, centré) et sexe ; en modification, vignette photo (chemin cassé `../ic/`) avec lien vers le profil pour G ou le propriétaire, puis Référence et Date en lecture seule.

Aucune validation (les contrôles sont commentés). Les listes Oui/Non proposent « », Oui (1), Non (2).

| # | Libellé exact | Champ | Contrôle |
|---|---|---|---|
| 1 | Que faites-vous actuellement | chp01 (zone01) | zone de texte |
| 2 | Que savez-vous faire | chp02 | zone de texte |
| 3 | A quoi consiste vôtre activité au quotidienne | chp03 | zone de texte |
| 4 | Quel est le secret que vous avez découvert dépuis et que vous souhaitez partager aux autres ? | chp04 | zone de texte |
| 5 | Comment avez vous eu cette idée | chp05 | zone de texte |
| 6 | Est-ce parce que vous avez vu une autre personne le faire | chp06 | Oui/Non |
| 7 | Si l'idée n'est pas personnelle, Quelle est votre participation | chp07 | zone de texte |
| 8 | Etes-vous une personne sociable | chp08 | Oui/Non |
| 9 | Vous interessez vous à ce que font les autres ? | chp09 | Oui/Non |
| 10 | Avez-vous déjà fait le commerce ? | chp10 | Oui/Non |
| 11 | Faites-vous rapidement des amis dans un environnement ? | chp11 | Oui/Non |
| 12 | Consevez-vous longtemps vos relations ? | chp12 | Oui/Non |
| 13 | Les autres vous trouvent-ils ouverte ? | chp13 | Oui/Non |
| 14 | A votre avis, que pensent les autres de vous ? | chp14 | zone de texte |
| 15 | Etes-vous un meneur d'homme ou un suiveur ? | chp15 | Oui/Non (question à deux branches, à revoir avec le métier) |
| 16 | Vous sentez vous mieux en étant seule ou préférez vous être entouré de vos amis ? | chp16 | Oui/Non (idem) |
| 17 | Avez-vous des amis avec lesquels vous partagez votre vie ? | chp17 | Oui/Non |
| 18 | Votre entourage accordent ils de l'importance ou de la considération à ce que vous faites ? | chp18 | Oui/Non |
| 19 | Amis, père, mère, soeurs, frères nièces et neveux, famille, frères d'église,collègue de travail,conjoint, autres ? | chp19 | zone de texte |
| 20 | Pouvez-vous établir une liste de personnes ayant pour vous de la considération ? | chp20 | zone de texte |
| 21 | Quelle est votre motivation ? | chp21 | zone de texte |
| 22 | Quel est le degré de votre implication et de votre motivation ? | chp22 | liste de 0 % à 100 % |
| 23 | Que disposez-vous pour ce projet ? | chp23 | zone de texte |
| 24 | Avez-vous le soutient de votre conjoint ? | chp24 | Oui/Non |
| 25 | De qui avez-vous le soutient ? | chp25 | zone de texte |
| 26 | Confrontez-vous souvent les autres aux faits ? | chp26 | Oui/Non (la présélection lit la réponse 24 : bug) |
| 27 | Correspondance membre | chp27 | zone de texte |
| 28 | Correspondance la frangine (modification seulement) | chp28 | zone de texte modifiable par G, en lecture seule pour les autres |
| 29 | Etat fiche (modification, G+Act ou propriétaire) | chp29 (zone29) | liste Non traité, Autorisé, Supprimé (défaut 2) |
| 30 | Clôture Fiche (modification, G+Act ou propriétaire) | chp30 (zone30) | Oui/Non (défaut 2 = Non) |

Boutons « Enregistrer » et « Annuler ». Liens « Retour liste découverte de soi ? » en haut et en bas.

**Effets** :
- création : **une seule fiche par membre, pour toujours**. Si une fiche existe, même clôturée : « Fiche de découverte de soi du membre déja enregistrée. ». Sinon, référence `LSG…` et INSERT de toutes les zones **sauf** zone28 ; message « Enregistrement effectué. » ;
- modification : UPDATE des zones 1 à 30 ; message « Modification effectuée. ». G modifie tous les champs, sans condition de droit ;
- le membre peut clôturer lui-même sa fiche (ou la rouvrir) et en changer l'état ;
- incohérence : une fiche clôturée fait réapparaître l'icône « Nouvelle fiche », mais la création échoue ensuite.

**Deux colonnes d'état** : `zone29sga` (« Etat fiche » du formulaire, sans effet sur les listes) et `etatsga` (utilisée pour filtrer et supprimer, jamais présentée à l'écran). La seconde est absente du dictionnaire.

**Production** : 3 fiches, toutes ouvertes.

**Checklist** : F-S1-17 à F-S1-26.

---

### E-S1-05 — Santé et bien-être (**section active**)

**Fichier** : `incl-choix1C.php` ; paiement : `incl-enregpaye.php` et `incl-formulairepaye.php`.

**URL** :
- `?vcpm=3&opt=0` : liste des maladies ;
- `?imld={id}&vcpm=3&opt=4&insc=0` : maladie et produits conseillés ;
- `?ipdt={id}&imld={id}&vcpm=3&opt=3&insc=0` : fiche produit ;
- `?insc=0&opt=5&vcpm=3` : panier ;
- `&mdpay=1|2|3` : mode de paiement choisi.

**Accès** :
- consultation : tous ;
- panier et paiement : connectés ;
- vue du panier de **tous** les membres : G.

**Écrans** :

1. **Grille des maladies** : bandeau gris-bleu, 5 maladies par ligne, **toutes les maladies sans filtre d'état** (7 en production). Clic vers le détail.

2. **Icône panier** (connectés) : caddie (infobulle « Vérifier le panier ») et pastille rouge avec la quantité totale.
   - Membre : somme de ses lignes de panier produit (`typepnr = 1`) non payées.
   - G : somme de **toutes** les lignes produit, tous membres, payées ou non.
   - **Ce panier est partagé avec la vente de produits de la section 5** (même `typepnr = 1`).

3. **Détail d'une maladie** (`opt=4`) :
   - libellé dans un bandeau, description, titre « Produits » ;
   - grille de 5 produits par ligne : produits dont **`produit.index1mld` à `index5mld`** vaut la maladie, **tous états confondus** ;
   - pour chaque produit : nom en vert, image (lien vers la fiche produit), « Prix : N FCFA » (prix public), « Stock : N », liste de quantité de 0 à 99 (champs `chp03{n}` caché = produit, `chp04{n}` = quantité), visible aussi par un visiteur ;
   - si connecté et au moins un produit : texte « Pour ajouter les produits sélectionnés, cliquez sur le panier ci-contre. » et bouton image « Panier » (infobulle « Cliquez pour enregistrer les produits sélectionnés »).

4. **Ajout au panier** : pour chaque quantité supérieure à 0, INSERT `panier(typepnr = 1, indexmbr = moi, datepnr, indexpdt, qtepnr, prixpnr = prix public du moment, etatpnr = 2)`. Pas de contrôle de stock à l'ajout ; une nouvelle ligne à chaque ajout, sans cumul.

5. **Fiche produit** (`opt=3`) :
   - **effet** : `nbvisitepdt + 1` et `datevisitpdt = maintenant` ;
   - image, Référence, Produit, Prix, Description, Posologie (`posologie1pdt` à `posologie4pdt`, sur 4 lignes) ;
   - liens « Retour liste des produits ? » en haut et en bas.

6. **Panier** (`opt=5`) :
   - lien « Retour liste des produits ? » ;
   - colonnes pour un membre : Date, Produit, Prix, Quantité « q / stock » (stock en rouge), Montant, icône d'annulation ;
   - colonnes pour G : Date, Membre, Produit, Prix, Quantité, Montant, Etat (N.P., P.N.C., P.C.), annulation ;
   - ligne de total (quantité et montant) ;
   - annulation = **suppression physique** de la ligne (G peut supprimer la ligne de n'importe qui) ;
   - si le total est positif et qu'aucune quantité ne dépasse le stock : icônes « Payement cash », « Payement par Charden Farell », « Payement par Mobile Money » (`mdpay` = 1, 2, 3) ;
   - si une quantité dépasse le stock : « Certaines quantités des produits dans le panier sont supérieures aux quantités en stock ».

7. **Formulaire de paiement** :

| Libellé et texte | Champ | Contrôle | Règle et message exact |
|---|---|---|---|
| (icône du mode) | chp03 = mode | caché | — |
| Montant : … FCFA | chp04 | lecture seule si le total est positif, modifiable sinon | supérieur à 0 : « Le montant ne peut être zéro. » |
| Cash : « Vous pouvez saisir une remarque ou observation » ; Charden : « Veuillez indiquer le nom, téléphone, agence de l'expéditeur et le Code de Charden Farell » ; Mobile Money : « Veuillez utiliser ces numéros téléphoniques ({tél. 1} / {tél. 2}) pour tous payements.et indiquer le votre. » | chp05 (`remarquepay`) | texte, 120 max | Charden : au moins 12 caractères, « Veuillez indiquer plus de 12 caractères minimum pour le code de Charden Farell. » ; Mobile Money : au moins 9 caractères, « Veuillez indiquer plus de 9 caractères minimum pour le numéro de téléphone. » |

Bouton « Confirmer payement ».

**Effets du paiement** :
- anti-doublon (membre + montant + remarque) ;
- INSERT `payement(indexmbr, datepay, typepay = mode, montantpay, remarquepay, etatpay = 2 « Payement non confirmé », typepnrpay = 1)` ;
- pour chaque ligne non payée du membre : **stock du produit décrémenté immédiatement** (avant toute confirmation par le gestionnaire) et ligne marquée payée (`etatpayepnr = 1`, date, n° de paiement) ;
- aucun message de succès ; comme `mdpay` reste dans l'URL, le formulaire se réaffiche avec un montant **modifiable** à 0 (bug) ;
- la confirmation du paiement par le gestionnaire se fait dans `ppayement.php` (hors périmètre).

**À ne pas reproduire** : deux sources de liens maladie ↔ produit (voir E-ADM-07) ; affichage de produits supprimés ; panier global pour G mêlé à son propre paiement ; décrément du stock avant confirmation (à arbitrer avec l'analyste finance) ; formulaire réaffiché après paiement ; suppression physique des lignes par G sans trace.

**Checklist** : F-S1-27 à F-S1-40.

---

## 4. Section 2 « Ressources humaines » (`choix2.php`)

### E-S2-00 — Page de section, onglets, liste

**URL** :
- `choix2.php?insc=0&opt=0&ode={0|1|2}` : liste ;
- `?insc=2&opt=1&ode=` : nouvelle fiche ;
- `?ihmn={id}&opt=2&insc=2&ode=` : fiche ;
- `…&dlt=1` : suppression.

**Onglets** : « DEMANDE D'EMPLOI (N) » et « OFFRE D'EMPLOI (N) », N = fiches du type à l'état 2.

**Accès** :
- liste : tous ;
- lien vers la fiche (référence) : connectés (le visiteur voit la référence en texte simple) ;
- création : connectés (icône « Ajout Demande d'emploi » ou « Ajout Offre d'emploi », seulement si un onglet est choisi) ;
- suppression : G (« X »).

**Mise en page** :
- M, Ma et V : liste à gauche et colonne « LES PUBLICITES » à droite (widget E-TRV-09a) ;
- G : liste pleine largeur, sans publicité.

**Recherche** : `cht01` (placeholder « Rechercher », bouton « OK ») dans le poste à pourvoir, les diplômes, l'expérience ou les compétences.

**Contenu de la liste** : fiches dont l'état n'est pas 3 (**les états 1 et 4 sont aussi montrés aux visiteurs**), jointes à leur domaine d'activité (les fiches sans domaine valide sont exclues).

**En-tête** : G voit « N demande et offre » ; tous voient « NB. Pour consulter une fiche {Demande d'emploi | Offre d'emploi | (vide)}, Veuillez cliquer sur sa référence ».

**Trois présentations** :
- **`ode=0`** (arrivée par le menu, sans onglet) : liste combinée **groupée par domaine**. Une ligne de titre par domaine (libellé en majuscules), sur deux blocs de colonnes « Demande » (Référence, Diplômes, Compétences) et « Offre » (Référence, Poste à pourvoir). Pas de colonne de suppression.
- **`ode=1`** : colonnes Référence, Domaine d'activité, Diplômes, Compétences, X (G).
- **`ode=2`** : colonnes Référence, Domaine d'activité, Poste à pourvoir, X (G).
- Tri par identifiant de domaine (pas par libellé), puis par référence décroissante. Textes tronqués à 40 caractères.

**Suppression** : G clique « X », état 3, sans confirmation ni contrôle de droit.

**Bug de recherche à ne pas reproduire** : les OR ne sont pas parenthésés. Une correspondance sur le poste, le diplôme ou l'expérience ignore le type, l'état et la jointure : la fiche est **dupliquée autant de fois qu'il y a de domaines (285)** et les fiches supprimées réapparaissent.

**Checklist** : F-S2-01 à F-S2-10.

---

### E-S2-01 — Fiche Demande ou Offre d'emploi (`incl-humaine.php`)

**Droits sur la fiche** :
- champs modifiables : G (tout droit) ou propriétaire ; les autres voient les champs en lecture seule ;
- bouton « Enregistrer » : G+Act, ou connecté propriétaire ;
- champs d'identité d'une demande (Nom, Prénom, Adresse, Téléphone, Mail) : affichés seulement à G+Act ou au propriétaire. **Les autres membres ne voient pas l'identité du candidat** (confidentialité à conserver) ;
- fichiers Photo et C.V. : propriétaire seulement ;
- consultation par URL sans être connecté : possible (aucun contrôle).

**Effet de consultation** : `nbrvisitehmn + 1` et `datevisitehmn = maintenant` si le lecteur n'est ni G ni le propriétaire.

| Libellé | Champ (colonne) | Type | Visible | Oblig. | Règle | Message exact |
|---|---|---|---|---|---|---|
| Référence: | chp17 | lecture seule | fiche existante | — | générée `DEI…` (demande) ou `OE1…` (offre) | — |
| Nom-Prénom: | chp041 | lien vers le profil (`?insc=1&opt=2&imbr={moi}`, bug : pointe sur l'utilisateur courant) | offre, G ou propriétaire | — | nom du membre auteur | — |
| (Demande ou Offre) | chp15 | caché = `ode` | — | oui | ≠ 0 | « Veuillez indiquer. Demande ou Offre d'emploi. » |
| (Secteur) | chp02 | caché (0) | — | — | contrôle mort | (« Veuillez indiquer le secteur d'activité. » jamais produit) |
| Domaine d'activité: | chp03 | liste groupée par secteur ; en lecture seule, seule l'option choisie est affichée | toujours | oui | ≠ 0 | « Veuillez indiquer le domaine d'activité. » |
| Poste à pourvoir: | chp18 | texte, 120 max | offre | non | — | — |
| Nom: / Prénom: | chp04 / chp05 | texte, 35 max ; nom mis en **majuscules**, prénom avec initiale en majuscule | demande (G+Act ou propriétaire) | demande | longueur > 3 | « Le nom doit avoir plus de trois caractères. » |
| Sexe: | chp06 | liste « », Feminin, Masculin | toujours | **oui, aussi pour une offre** | ≠ 0 | « Veuillez indiquer le sexe de la personne. » |
| Date Naissance: | chp07 | date (calendrier) | demande | non | — | — |
| Age: | chp07A | lecture seule, « X ans Y mois » | demande | — | calculé | — |
| Adresse: | chp08 | texte, 135 max | demande (G+Act ou propriétaire) | non | — | — |
| Téléphone: | chp09 | texte, 9 max, `checkNumber` | idem | non | demande : `phone()` (vide accepté) | « Veuillez vérifier le numéro de téléphone. » |
| Mail: | chp10 | texte, 30 max | idem | non | — | — |
| Diplômes: | chp11 | zone de texte libre | toujours | non | — | — |
| Compétences: / Compétences requises: | chp21 | zone de texte (libellé selon le type) | toujours | non | — | — |
| Expérience: | chp12 | zone de texte | toujours | non | — | — |
| Autres informations: | chp16 | zone de texte | toujours | non | — | — |
| Etat fiche: | chp13 | liste Non traité, Autorisé, Supprimé | G+Act | — | forcé à 2 à la création | — |
| Date inscription: | chp14 | lecture seule | fiche existante | — | — | — |
| Date & Nombre visite: | chp19, chp20 | lecture seule | fiche existante | — | — | — |
| Photo: / C.V.: | monfichier, monfichier1 | fichiers | propriétaire | non | `hmn{id}.jpg`, `cv{id}.pdf` | « Image trop grande. Veuillez la réduire ou changer. » |

- Vignette de la photo : demandes existantes seulement.
- Liens « Retour liste Demande emploi ? » ou « Retour liste Offre emploi ? » en haut et en bas.
- Boutons « Enregistrer » et « Annuler ».

**Effets** :
- **création** :
  - anti-doublon : « Cette fiche est déjà crée. ». Le premier critère (domaine + nom + prénom) compare le domaine au secteur (0) et ne détecte jamais rien ; le second (type + membre + poste + autres informations) fonctionne ;
  - INSERT avec l'état 2 (pas de modération a priori) et la date d'inscription ;
  - **bug critique** : la colonne auteur `indexmbr` reçoit la valeur du **type** (1 ou 2) au lieu de l'utilisateur. Les 4 fiches de production ont `indexmbr` égal à `typeinscripthmn`. L'auteur réel est perdu : le vrai créateur ne peut plus modifier sa fiche, et les membres n° 1 et n° 2 deviennent « propriétaires » de toutes les demandes ou de toutes les offres ;
  - upload : l'identifiant de la nouvelle fiche est recherché par secteur + nom + prénom. Pour une offre (nom vide), c'est la **première** fiche au nom vide qui est retrouvée : la photo et le CV écrasent ceux d'une autre fiche ;
  - message « Enregistrement effectué. » puis **arrêt de la page** ;
- **modification** : UPDATE de tous les champs affichés, secteur et état compris ; message « Modification effectuée. » ;
- **CV** : enregistré mais **jamais proposé en téléchargement** (fonction perdue à rétablir).

**Bug de validation à ne pas reproduire** : pour une demande, le contrôle du téléphone **réinitialise** l'indicateur d'erreur. Un téléphone valide ou vide annule les erreurs précédentes (domaine, nom, sexe) et la fiche est enregistrée malgré les messages.

**Colonnes inutilisées** : `savoirfairehmn`, `experience2hmn`.

**Checklist** : F-S2-11 à F-S2-26.

---

### E-S2-02 — Présentation de besoin et intéressement (module `besoin`)

**Visible** sur une fiche existante, pour Ma ou M qui **n'est pas** le propriétaire. Le libellé dépend du type de la fiche :
- sur une **Demande d'emploi** : « Présentation de besoin » (un employeur exprime son besoin au candidat) ;
- sur une **Offre d'emploi** : « Intéressement » (un candidat se déclare intéressé).

| Libellé | Champ | Contrôle | Règle | Message exact |
|---|---|---|---|---|
| Présentation de besoin / Intéressement | chp30 | zone de texte, 2 lignes, focus automatique | demande : longueur ≥ 5 ; offre : **aucune** (texte vide accepté) | « Présentation de besoin doit avoir 5 caractères minimum. » |
| (caché) | chp31 = 1 | — | ignoré ; `interesebsn` prend la valeur de `ode` | — |

- Bouton « Enregistrer Besoin » et lien « Retour liste … ».
- Unicité : une seule contribution par membre et par fiche. Sinon : « Opération déjà effectuée. ».
- Effet : INSERT `besoin(typebsn = 2, indexmbr = moi, indexhmn, datebsn, besoinbsn, interesebsn = ode, etatbsn = 2)`. Message « Votre Présentation de besoin est pris en compte » ou « Votre Intéressement est pris en compte », puis arrêt de la page.
- **Lecture** :
  - le propriétaire et G voient, sous la fiche, la liste des contributions (date et texte, **sans le nom** de l'auteur, donc impossible de recontacter) ;
  - **les autres membres voient aussi toutes les contributions** sous le formulaire (fuite de confidentialité).
- Pas de notification au propriétaire.

**Valeurs de `typebsn` observées dans le dump** (pour les autres analystes) : 2 = RH (`indexhmn`), 3 = immobilier et article (`indeximb`, `indexart`), 6 = partenariat (`indexptn`).

**Recommandation** : afficher le nom et le contact de l'auteur au propriétaire et à G seulement ; notifier le propriétaire.

**Checklist** : F-S2-27 à F-S2-33.

---

## 5. Corrections à apporter aux dictionnaires de données

| # | Dictionnaire (§) | Affirmation actuelle | Réalité constatée dans le code ou le dump |
|---|---|---|---|
| 1 | MIGRATION_STATUS, section « Le saviez-vous ? » | « Santé et Bien-être » non reprise car `choix1.php` serait commenté | **Fausse** : `incl-choix1C.php` est actif (7 maladies, produits, panier, paiement). Seule la colonne droite de `choix1.php` est commentée. |
| 2 | commerce §1 `produit` | `index1mld`–`index5mld` et `posologie1pdt`–`posologie5pdt` sont des « colonnes mortes » | **Fausse** : lues par la page publique Santé (produits d'une maladie et posologies 1 à 4 de la fiche produit). Non modifiables par l'interface actuelle (données figées : 4 produits liés). |
| 3 | membres §7 et contenu §9 `maladie` | `index1pdt`–`index5pdt` et posologies = produits conseillés | Écrits par `pmaladie` mais **lus par aucune page publique**. Divergence réelle en production (Hypertension : 5 produits configurés contre 2 affichés). Migration : union des deux sources. |
| 4 | contenu §2 `message` | `indexmbr` = expéditeur, `index1mbr` = destinataire | **Inversé** : `indexmbr` = destinataire (0 = la frangine), `index1mbr` = expéditeur (13 lignes avec `indexmbr = 0`, aucune avec `index1mbr = 0`). |
| 5 | contenu §2 | « envoi membre→frangine met `connexmsgpmt=1` » | **Faux** : `connexmsgpmt = 1` quand le gestionnaire ouvre `pmessage.php`, 0 à sa déconnexion (présence « la frangine en ligne », fond vert chez les membres). `connexmsgmbr` = présence d'un membre (1 à la connexion, 0 à la déconnexion, jaune dans `pmessage`). |
| 6 | membres §1 `phonembr` et règle 4 | « Validé par `phone()` » | **Faux** : contrôle mort (indice 400 hors boucle) en inscription, profil et `pmembre`. Aucune validation ; colonne de 9 caractères pour un champ de 30 (troncature). |
| 7 | membres §1 `pointcaissembr` | « Obligatoire (physique), défaut Non » | Contrôle identique pour physique et morale ; **jamais écrit** par l'inscription ni par le profil, seulement par `pmembre`. |
| 8 | membres §1 `situatmatrimmbr` | « Obligatoire si personne physique » | Pour une personne **morale**, la colonne stocke la **forme juridique** (SA, SARL, SARLU) ; valeurs 1 à 3 présentes en production. |
| 9 | membres §1 `droitmbr` | « Chaîne 3-5 caractères » | Le code n'écrit que 3 caractères (Droit, Caisse, Activation). Valeurs en base : `00000` (défaut, 35), `000` (29), `111` (4). « Point caisse » est la colonne `pointcaissembr`. Un G sans droit « Droit » remet les droits à `000` en enregistrant une fiche. |
| 10 | membres §1 règle 11 | Unicité nom, identifiant ou pseudo | À la création seulement ; en modification, l'unicité de l'identifiant est désactivée. |
| 11 | membres §1 règle 13 | Photo → `mbr{id}.jpg` | À l'inscription et à la création admin, le fichier est nommé `mbr.jpg` (identifiant non retrouvé). |
| 12 | membres §1 règle 14 | `typembr` forcé à 3 | Forcé par un **champ caché** : falsifiable, y compris en modification de profil (élévation de privilège). |
| 13 | membres §1 `banqboutqmbr` | « Si Banque(1) → ligne miroir dans `banque` » | À la création oui ; à la modification, écrase la banque n° 1. En production, aucune banque n'est liée à un membre. |
| 14 | membres §1 (implicite) | Profil modifiable par son propriétaire | `observmbr`, `etatmbr`, `droitmbr`, `datemastermbr` et **`nomprenmbr`** ne sont pas modifiables depuis le profil ; `datemastermbr` ne l'est nulle part. |
| 15 | membres §4 `humaine.indexmbr` | « auteur (FK membre) » | **Bug** : reçoit le type (1 ou 2). Vérifié sur les 4 lignes de production. Auteur non récupérable. |
| 16 | membres §4 règles | Type, secteur, domaine, sexe et téléphone obligatoires ; anti-doublon domaine + nom + prénom | Secteur : contrôle mort. Demande : l'erreur est réinitialisée par le contrôle du téléphone. Sexe exigé aussi pour les offres. Le premier anti-doublon ne fonctionne pas. |
| 17 | membres §4 « Upload photo + CV » | Fichiers `hmn{id}` et `cv{id}` | À la création, le fichier peut être rattaché à une autre fiche ; le CV n'est jamais consultable. |
| 18 | membres §4 module `besoin` et MIGRATION_STATUS | « typebsn 1/2 (RH) » | La RH écrit `typebsn = 2` ; 1 et 2 sont portés par `interesebsn` (= type de la fiche). `typebsn` 3 = immobilier et article, 6 = partenariat. |
| 19 | membres §5 `diplome` | Référentiel sans FK | Confirmé, et **aucun usage fonctionnel** (tableaux chargés dans `choix2` mais jamais affichés). |
| 20 | membres §6 et contenu §10 `familart` | « majuscules » | Pas de mise en majuscules. Message d'erreur erroné confirmé. |
| 21 | contenu §12 `ville` et `quartier` | « Nom ≥4 car., majuscules » | Pas de majuscules (`strtoupper` écrasé). `quartier.indexvil` est un `tinyint`. Le doublon de quartier affiche « Cette ville est déjà enregistrée. ». |
| 22 | contenu §3 `conseil` confidentialité | Privé = échange membre ↔ frangine seul | Le texte d'un sujet privé est **visible de tous**, visiteurs compris : seuls le nom et les liens sont masqués. Le compteur d'onglet compte sujets et commentaires. |
| 23 | contenu §6 `contact` | G voit tout, M voit les siens | **Le Master voit tout et peut répondre.** Un M peut modifier son message et son état. Le « Oui » à `reponsectt` absente est confirmé : l'UPDATE échoue entièrement mais l'e-mail part. |
| 24 | contenu §7 `soungangai` | `zone29sga` = état de la fiche | Il existe **aussi** une colonne `etatsga` (absente du dictionnaire), seule utilisée pour filtrer et supprimer. `zone28` n'est pas écrite à la création. Aucune validation. Une seule fiche par membre, même clôturée. |
| 25 | contenu §11 `parametre` | Liste des colonnes | `nompmt` n'est pas modifiable (absent de l'UPDATE). `choix0` met à jour `nbvisitepmt` et `datevisitepmt`, **absentes du dump** (échec silencieux). Le compteur s'appelle `numbusnessmt` (coquille). |
| 26 | contenu §14 `visite` | Filtre par date, IP, membre ; suppression en masse | Le filtre date provoque une **erreur fatale** (`datefr3` inexistante). Suppression physique. `indexmbr` vaut toujours 1 (valeur par défaut). |
| 27 | contenu §15 `suggestion` | `modulesgt` 0 = Accueil | La valeur 0 est **rejetée** ; anti-doublon cassé ; aucun auteur ; 0 ligne en production. |
| 28 | contenu §16-17 `aide` et `client` | Probablement morts | Confirmé (0 ligne, aucun code). Ajouter la table **`fonction`** (même famille « hôtel », 0 ligne, absente des dictionnaires). `adhesion` : 0 ligne, confirmé sans code. |
| 29 | contenu §18 upload | « max ~4 Mo, extensions…, redimensionnement auto » | Extension et redimensionnement ne s'appliquent **qu'au-delà de 250 000 octets** ; en dessous, aucun contrôle. Redimensionnement déformant forcé à 300×250. |
| 30 | contenu §18 pagination | Fonctionnelle | La **navigation de page est cassée** (toujours la première page) ; seule la taille de page fonctionne. |
| 31 | contenu §19 menu gestionnaire | « exclusivement des outils d'administration, non exposés » | Non exposés dans les menus, mais **accessibles à tous par URL** (aucun contrôle serveur). `pbanque` est orphelin ; `ppublicite`, `ppayement` et `pmessage` figurent sous « SECTIONS ». |
| 32 | contenu §5 `publicite` | Diffusion aléatoire | Au plus 10 publicités par widget. La vignette est toujours en `.jpg`. Une nouvelle publicité est à l'état 1 sans droit Activation. Le nombre de vues n'augmente que sur la page de détail. |
| 33 | commerce §1 `produit` règles | « unicité (groupe+nom), nom≥4 » | Anti-doublon inopérant (colonne `gropupepdt` inexistante) ; minimum réel de 3 caractères. |
| 34 | commerce §1 et finance | « quantité décrémentée à chaque paiement confirmé » | Décrémentée dès la **déclaration** du paiement par le membre (état 2 « non confirmé »), avant confirmation. |
| 35 | contenu §1 `dialogue` | Gestionnaire peut répondre à un membre précis | La réponse part toujours vers le membre n° 1 (bug `isset`). `pdialogue.php` est orphelin. |
| 36 | membres §3 authentification | Connexion : `etatmbr != 3` | Confirmé ; ajouter que l'échec de connexion n'affiche **aucun** message et que la session contient le mot de passe en clair. |

---

## 6. Checklist de recette

> Une ligne = une fonctionnalité vérifiable dans la nouvelle version. Les points marqués **(correctif)** décrivent le comportement attendu **à la place** du défaut legacy.

### Transverse

1. **F-TRV-01** — L'en-tête affiche le logo, le nom du site, les deux téléphones, l'e-mail et l'adresse lus dans les paramètres ; logo et nom mènent à l'accueil.
2. **F-TRV-02** — Dans l'en-tête, l'e-mail ouvre le formulaire de contact.
3. **F-TRV-03** — L'accueil affiche 7 cartes de sections (titre, image, texte paramétrable), chacune menant à sa section.
4. **F-TRV-04** — L'accueil affiche le widget publicité (au plus 10 publicités actives de la période, ordre aléatoire, lien « Continuer la suite »).
5. **F-TRV-05** — Chaque visite de l'accueil est journalisée (date, IP), au plus une fois par tranche de 30 minutes et par IP.
6. **F-TRV-06** — Le gestionnaire dispose d'une page d'accueil exploitable **(correctif : le legacy lui affiche une page vide)**.
7. **F-TRV-07** — Un visiteur se connecte avec identifiant et mot de passe depuis le pied de page de n'importe quelle page.
8. **F-TRV-08** — Un compte à l'état « Supprimé » ne peut pas se connecter ; un compte « Non traité » le peut.
9. **F-TRV-09** — Un échec de connexion affiche un message d'erreur **(correctif)**.
10. **F-TRV-10** — Chaque connexion par formulaire est journalisée (membre, date, IP).
11. **F-TRV-11** — La déconnexion ramène en mode visiteur et remet à zéro la présence en ligne (du membre, ou de la frangine pour un gestionnaire).
12. **F-TRV-12** — Le menu du visiteur et du membre montre le bandeau de la section courante et les 7 sections ; celui du gestionnaire montre Accueil, FICHIERS (13 écrans) et SECTIONS (7 sections, Publicité, Payement, Message).
13. **F-TRV-13** — Le lien « Pour s'inscrire cliquer ici » ouvre l'inscription depuis n'importe quelle section.
14. **F-TRV-14** — Le formulaire d'inscription commence par « Personnalité » (Physique ou Morale) et s'adapte au choix sans perdre les champs communs déjà saisis **(correctif)**.
15. **F-TRV-15** — Une personne physique renseigne nom-prénom, pseudonyme, sexe, situation matrimoniale, nombre d'enfants, téléphone, e-mail, adresse, ville, pièce d'identité et employeur.
16. **F-TRV-16** — Une personne morale renseigne Banque ou Boutique, nom d'entreprise, sigle, domaine d'activité (groupé par secteur), forme juridique, téléphone, e-mail, adresse et ville.
17. **F-TRV-17** — Les obligations et messages de validation de l'inscription (nom ≥ 3, pseudonyme ≥ 6 ou sigle ≥ 3, sexe et situation pour une personne physique, ville, identifiant, mot de passe confirmé et différent de l'identifiant) sont respectés.
18. **F-TRV-18** — Le téléphone est validé (format à redéfinir, le legacy ne validait rien) **(correctif)**.
19. **F-TRV-19** — Une inscription est refusée si le nom, l'identifiant ou le pseudonyme existe déjà, avec le message adapté à la personnalité.
20. **F-TRV-20** — Un mécanisme anti-robot protège l'inscription publique (le mot de contrôle legacy est remplacé par une solution réelle) **(correctif)**.
21. **F-TRV-21** — La fiche créée reçoit un code `MBR` + mois + compteur + année, le type Membre et l'état Non traité, et peut se connecter immédiatement.
22. **F-TRV-22** — Le message « Votre inscription est effective. Veuillez utiliser votre identifiant et mot de passe pour accéder aux contenus du site. » s'affiche après inscription.
23. **F-TRV-23** — Une personne morale « Banque » crée automatiquement une entrée dans le référentiel des banques.
24. **F-TRV-24** — Une photo facultative est jointe à l'inscription et rattachée à la bonne fiche **(correctif du `mbr.jpg`)**.
25. **F-TRV-25** — Le lien « Modifier » du pied de page ouvre le profil de l'utilisateur connecté, et **uniquement le sien** (sauf gestionnaire) **(correctif)**.
26. **F-TRV-26** — Le membre modifie ses coordonnées, son identifiant (unicité contrôlée), son mot de passe, sa ville, son domaine et son code de pointage.
27. **F-TRV-27** — Le mot de passe n'est jamais réaffiché, et un membre ne peut pas changer son type de compte **(correctif)**.
28. **F-TRV-28** — Le profil affiche en lecture seule le solde et la date du dernier pointage de caisse.
29. **F-TRV-29** — Une modification de profil n'altère pas la banque n° 1 **(correctif)**.
30. **F-TRV-30** — Le message « Modification effectuée. » s'affiche après modification du profil.
31. **F-TRV-31** — « Mot de passe oublié » identifie le compte par personnalité, nom, pseudonyme ou sigle et téléphone.
32. **F-TRV-32** — Le compte retrouvé reçoit une procédure de réinitialisation sécurisée ; le mot de passe n'est jamais affiché **(correctif)**.
33. **F-TRV-33** — « Comment m'utiliser ? » déplie et replie le texte d'aide paramétré, sur toutes les pages.
34. **F-TRV-34** — Le texte d'aide conserve sa mise en forme (sauts de ligne, balises autorisées).
35. **F-TRV-35** — Un visiteur envoie un message de contact (nom ≥ 5, e-mail, objet ≥ 5, texte ≥ 10).
36. **F-TRV-36** — Un membre connecté envoie un message de contact avec nom et e-mail préremplis et non modifiables.
37. **F-TRV-37** — Un message de contact identique (même objet et même texte) est refusé : « Ce message est déjà enregistré. ».
38. **F-TRV-38** — Le gestionnaire liste tous les messages de contact, les filtre par membre et par texte, et les trie par date décroissante.
39. **F-TRV-39** — Un membre ne voit que ses propres messages de contact, sans pouvoir les modifier après envoi **(correctif)**.
40. **F-TRV-40** — Le gestionnaire (et le Master si le métier le confirme) saisit une réponse, qui est enregistrée et envoyée par e-mail à l'expéditeur.
41. **F-TRV-41** — Le gestionnaire change l'état d'un message de contact (Non traité, Autorisé, Supprimé).
42. **F-TRV-42** — L'e-mail de réponse part de l'adresse et du nom du site, au format HTML UTF-8 ; il n'est envoyé que si l'enregistrement a réussi **(correctif)**.
43. **F-TRV-43** — Le widget publicité apparaît sur l'accueil et sur la section 2 (sauf pour le gestionnaire), mais pas sur la section 1.
44. **F-TRV-44** — « Continuer la suite » ouvre la page publicités : liste des publicités actives à gauche, publicité choisie en grand.
45. **F-TRV-45** — Une publicité image s'affiche avec son texte ; une publicité son est lue par un lecteur audio ; une publicité vidéo par un lecteur vidéo HTML5.
46. **F-TRV-46** — L'ouverture d'une publicité incrémente son nombre de vues et sa date de dernière vue.
47. **F-TRV-47** — La vignette du widget correspond au vrai type du fichier **(correctif)**.
48. **F-TRV-48** — Un Master ou un Membre dispose en pied de page d'une messagerie avec « la frangine » (fil daté, bulles différenciées, boutons Envoyer et Actualiser).
49. **F-TRV-49** — Le pied de page du membre affiche « Message: N » (messages non lus reçus).
50. **F-TRV-50** — Les messages reçus sont marqués lus quand le membre les consulte.
51. **F-TRV-51** — La boîte de messagerie du membre indique si la frangine est en ligne (fond vert).
52. **F-TRV-52** — Le gestionnaire voit la liste des membres avec leur nombre de messages non lus et leur présence en ligne (jaune).
53. **F-TRV-53** — Le gestionnaire ouvre la conversation d'un membre et lui répond ; les messages de ce membre sont alors marqués lus.
54. **F-TRV-54** — Un message vide est refusé avec un message visible **(correctif)**.
55. **F-TRV-55** — Les réponses de tous les gestionnaires apparaissent dans la conversation **(correctif)**.
56. **F-TRV-56** — Le dialogue contextuel (section 7) permet au membre d'écrire à la frangine et de voir ses échanges, avec recherche plein texte.
57. **F-TRV-57** — Le gestionnaire voit les messages adressés à la frangine et répond au bon membre **(correctif du destinataire n° 1)**.
58. **F-TRV-58** — Un visiteur ne voit aucun message de dialogue **(correctif)**.
59. **F-TRV-59** — Un utilisateur connecté dépose une suggestion (module de Accueil à Tous les modules, texte ≥ 10) depuis le lien « Suggestion ? ».
60. **F-TRV-60** — Le module « Accueil » peut être choisi pour une suggestion **(correctif)**.
61. **F-TRV-61** — Une suggestion en double (même module, même texte) est refusée **(correctif)**.
62. **F-TRV-62** — Seul le gestionnaire liste les suggestions, les filtre par module et par texte, et change leur état **(correctif)**.
63. **F-TRV-63** — La liste des suggestions affiche date, texte tronqué, état et compteur.
64. **F-TRV-64** — Un fichier téléversé est contrôlé (type et taille, 4 Mo maximum) quelle que soit sa taille **(correctif)** ; au-delà, message « Image trop grande. Veuillez la réduire ou changer. ».
65. **F-TRV-65** — Les images téléversées sont redimensionnées sans déformation **(correctif)**.
66. **F-TRV-66** — Les listes proposent 50 lignes par page (choix de 50 à 500) et une navigation entre pages qui fonctionne **(correctif)**.
67. **F-TRV-67** — Les critères de recherche d'une liste sont conservés lors du changement de page, sans interférer avec les autres écrans **(correctif)**.
68. **F-TRV-68** — Les erreurs de formulaire s'affichent groupées sous le titre « ERREURS », et le succès par « Enregistrement effectué. » ou « Modification effectuée. ».
69. **F-TRV-69** — Après un enregistrement, la page reste complète (menus, pied de page) avec un lien de retour **(correctif)**.
70. **F-TRV-70** — Le pied de page affiche le copyright, le lien du concepteur, les icônes des réseaux sociaux, et pour le gestionnaire « New Membres: N » (membres à l'état Non traité).

### Administration

71. **F-ADM-01** — Le gestionnaire modifie adresse, téléphones, e-mail et texte d'aide du site.
72. **F-ADM-02** — Le gestionnaire modifie le nom du site **(correctif : ignoré dans le legacy)**.
73. **F-ADM-03** — Le gestionnaire modifie les paramètres Fond placement, Montant course, Commission course et Condition course.
74. **F-ADM-04** — Le gestionnaire modifie les 7 textes des cartes de l'accueil ; un téléphone invalide est signalé par un message **(correctif)**.
75. **F-ADM-05** — Le gestionnaire liste les membres et les filtre par type, ville, état et texte (nom ou observation).
76. **F-ADM-06** — La liste des membres affiche type, personnalité, nom, téléphone, e-mail, ville, état et le compteur « N Membres ».
77. **F-ADM-07** — La liste des membres se trie par nom ou par plus récents d'abord.
78. **F-ADM-08** — Le compte système n° 1 est masqué de la liste des membres.
79. **F-ADM-09** — Le gestionnaire crée un membre ou un gestionnaire en choisissant type, point caisse et état.
80. **F-ADM-10** — Le gestionnaire modifie toute fiche membre, nom compris, et change sa personnalité.
81. **F-ADM-11** — Un gestionnaire avec le droit « Droit » attribue ou retire les droits Droit, Caisse et Activation.
82. **F-ADM-12** — Un gestionnaire sans le droit « Droit » ne modifie pas, même involontairement, les droits d'un membre **(correctif)**.
83. **F-ADM-13** — Le gestionnaire génère un code de pointage à 4 chiffres pour un membre **(correctif du tirage 4 à 9999)**.
84. **F-ADM-14** — Le gestionnaire réinitialise le mot de passe d'un membre sans le voir en clair **(correctif)**.
85. **F-ADM-15** — Le gestionnaire valide un nouveau membre en le passant de Non traité à Autorisé.
86. **F-ADM-16** — Le gestionnaire crée et modifie une ville (nom ≥ 4, unique).
87. **F-ADM-17** — Le gestionnaire crée et modifie un quartier rattaché à une ville (nom ≥ 4, unique par ville).
88. **F-ADM-18** — Le gestionnaire crée et modifie un diplôme (code en majuscules, libellé ≥ 5, unique).
89. **F-ADM-19** — Le gestionnaire crée et modifie un secteur d'activité (libellé ≥ 5, état).
90. **F-ADM-20** — Le gestionnaire crée et modifie un domaine d'activité rattaché obligatoirement à un secteur, dans une liste groupée par secteur **(correctif du secteur par défaut)**.
91. **F-ADM-21** — Le gestionnaire crée et modifie une famille d'article (libellé ≥ 5, unique, message « famille d'article ») **(correctif)**.
92. **F-ADM-22** — Le gestionnaire crée et modifie une maladie (libellé ≥ 5, unique, description, état).
93. **F-ADM-23** — Le gestionnaire associe jusqu'à 5 produits à une maladie, chacun avec sa posologie, ou davantage si le modèle le permet.
94. **F-ADM-24** — Les associations maladie-produit saisies en administration sont exactement celles de la page publique Santé **(correctif)**.
95. **F-ADM-25** — Le gestionnaire crée et modifie un produit (groupe FLP, référence, libellé, description, 3 prix, quantité, état, photo).
96. **F-ADM-26** — Un produit en double (même groupe, même nom) est refusé **(correctif)**.
97. **F-ADM-27** — Le gestionnaire filtre les produits par groupe, prix distributeur maximum, prix public maximum, quantité maximum et texte.
98. **F-ADM-28** — Le gestionnaire gère le référentiel des produits prospective (nom ≥ 4, unique, état).
99. **F-ADM-29** — Le gestionnaire gère le référentiel des banques (sigle, nom ≥ 3, coordonnées, contact, observation, état) depuis le menu.
100. **F-ADM-30** — Le gestionnaire consulte le journal des visites anonymes (date, heure, IP).
101. **F-ADM-31** — Le gestionnaire consulte le journal des connexions des membres (date, heure, IP, membre).
102. **F-ADM-32** — Le gestionnaire filtre les journaux par période de dates **(correctif de l'erreur fatale)**, plage horaire, IP et membre.
103. **F-ADM-33** — Le gestionnaire purge les visites sélectionnées, avec confirmation.
104. **F-ADM-34** — Le gestionnaire crée une publicité : demandeur, entreprise, texte ≥ 6, dates de début et de fin, fichier et type (Image, Son, Vidéo).
105. **F-ADM-35** — La publicité reçoit une référence `PUB…` ; son état initial est Non traité, sauf si le créateur a le droit Activation et choisit un autre état.
106. **F-ADM-36** — La date de fin d'une publicité ne peut pas précéder sa date de début **(correctif)**.
107. **F-ADM-37** — Le gestionnaire filtre les publicités par demandeur, entreprise, plages de dates, nombre de vues et texte **(correctif des filtres de date)**.
108. **F-ADM-38** — Le gestionnaire bascule la liste des publicités entre vue tableau et vue cartes (dates, nombre de vues, demandeur, état).
109. **F-ADM-39** — Tous les écrans d'administration refusent l'accès à un non-gestionnaire côté serveur **(correctif)**.
110. **F-ADM-40** — Les exports ou impressions des listes de membres et de publicités, s'ils sont conservés, produisent la bonne liste **(correctif)**.

### Section 1 « Le saviez-vous ? »

111. **F-S1-01** — La section affiche trois onglets : Informations utiles (compteur), Découverte de soi, Santé et bien-être (compteur).
112. **F-S1-02** — Le compteur « Informations utiles » ne compte que les sujets actifs **(correctif)**.
113. **F-S1-03** — Un visiteur consulte la liste des sujets publics (objet, texte, date), du plus récent au plus ancien.
114. **F-S1-04** — Un visiteur recherche un sujet par mot-clé (champ `cht01`, dans l'objet ou le texte), sans voir de sujets supprimés **(correctif)**.
115. **F-S1-05** — Le nom de l'auteur d'un sujet n'est visible que du gestionnaire, de l'auteur, et du Master pour un sujet public.
116. **F-S1-06** — Un sujet privé n'est visible que de son auteur et du gestionnaire **(correctif, à valider avec le métier)**.
117. **F-S1-07** — La colonne de droite liste les 10 derniers sujets publiés.
118. **F-S1-08** — Un connecté ouvre le fil d'un sujet (sujet encadré, commentaires chronologiques) s'il en est l'auteur ou si le sujet est public ; le gestionnaire ouvre tous les fils.
119. **F-S1-09** — Le gestionnaire supprime (logiquement) un sujet ou un commentaire, avec confirmation.
120. **F-S1-10** — Un connecté crée un sujet : confidentialité (Privé ou Public), objet ≥ 5, texte ≥ 20.
121. **F-S1-11** — Le nouveau sujet reçoit une référence `CSL…` et est publié immédiatement (état Autorisé).
122. **F-S1-12** — Un sujet en double (même objet) est refusé : « Cette fiche est déjà enregistrée. ».
123. **F-S1-13** — L'auteur et le gestionnaire modifient l'objet, le texte et la confidentialité d'un sujet ; personne d'autre ne le peut **(correctif)**.
124. **F-S1-14** — Un gestionnaire avec le droit Activation change l'état d'un sujet (Non traité, Autorisé, Supprimé).
125. **F-S1-15** — Un connecté ajoute un commentaire (≥ 2 caractères) qui hérite de la confidentialité du sujet et incrémente son nombre de réponses.
126. **F-S1-16** — Le gestionnaire corrige un commentaire sans contrainte d'objet ni de longueur minimale de 20 caractères **(correctif)**.
127. **F-S1-17** — Un visiteur ne voit aucun contenu sous l'onglet Découverte de soi.
128. **F-S1-18** — Un Master ou un Membre sans fiche voit « Nouvelle fiche » et remplit le questionnaire de 26 questions et la zone « Correspondance membre ».
129. **F-S1-19** — Un membre qui a une fiche ouverte arrive directement dessus en modification.
130. **F-S1-20** — La fiche reçoit une référence `LSG…` ; un membre n'a qu'une seule fiche.
131. **F-S1-21** — Les questions Oui/Non, le pourcentage d'implication (0 à 100 %) et les zones de texte sont restitués fidèlement, question 26 comprise **(correctif du bug de présélection)**.
132. **F-S1-22** — Le gestionnaire saisit la « Correspondance la frangine », visible en lecture seule par le membre.
133. **F-S1-23** — Le membre, ou un gestionnaire avec le droit Activation, clôture la fiche ou change son état.
134. **F-S1-24** — Le gestionnaire liste toutes les fiches (compteur « N Lisungui », référence, date, membre) et ouvre le profil du membre.
135. **F-S1-25** — Le gestionnaire supprime une fiche (logiquement), avec confirmation.
136. **F-S1-26** — Un membre dont la fiche est clôturée ne se voit pas proposer une création impossible ; le comportement attendu (réouverture ou nouvelle fiche) est tranché avec le métier **(correctif)**.
137. **F-S1-27** — Tous voient la grille des maladies actives.
138. **F-S1-28** — La page d'une maladie affiche son libellé, sa description et ses produits conseillés actifs.
139. **F-S1-29** — Chaque produit conseillé affiche nom, image, prix public et stock.
140. **F-S1-30** — La fiche produit affiche référence, nom, prix, description et posologie, et incrémente le compteur de consultations du produit.
141. **F-S1-31** — Un connecté choisit des quantités (0 à 99) et ajoute plusieurs produits au panier en une fois, au prix public du moment.
142. **F-S1-32** — L'icône panier affiche la quantité totale des produits non payés du membre (panier commun avec la vente de produits de la section 5).
143. **F-S1-33** — Le panier affiche date, produit, prix, quantité et stock, montant et total ; le membre annule une ligne.
144. **F-S1-34** — Le paiement est bloqué avec le message « Certaines quantités des produits dans le panier sont supérieures aux quantités en stock » si une quantité dépasse le stock.
145. **F-S1-35** — Le membre choisit un mode de paiement (Cash, Charden Farell, Mobile Money) et voit le texte d'aide correspondant, avec les téléphones du site pour Mobile Money.
146. **F-S1-36** — Le code Charden Farell doit faire au moins 12 caractères, le numéro Mobile Money au moins 9.
147. **F-S1-37** — Confirmer le paiement crée un paiement « non confirmé » et marque les lignes du panier payées.
148. **F-S1-38** — Le moment du décrément du stock est conforme à la règle arrêtée avec la finance (déclaration ou confirmation) **(à arbitrer)**.
149. **F-S1-39** — Après paiement, un message de succès s'affiche et le formulaire de paiement disparaît **(correctif)**.
150. **F-S1-40** — Le gestionnaire consulte les paniers produits de tous les membres, avec leur état de paiement (N.P., P.N.C., P.C.).

### Section 2 « Ressources humaines »

151. **F-S2-01** — La section affiche les onglets Demande d'emploi et Offre d'emploi avec le nombre de fiches publiées.
152. **F-S2-02** — Sans onglet choisi, la liste combine demandes et offres, groupées par domaine d'activité (colonnes Demande : Référence, Diplômes, Compétences ; Offre : Référence, Poste à pourvoir).
153. **F-S2-03** — L'onglet Demande liste Référence, Domaine, Diplômes et Compétences, triés par domaine.
154. **F-S2-04** — Un visiteur recherche une offre ou une demande par mot-clé (champ `cht01`, dans le poste, les diplômes, l'expérience ou les compétences), sans doublons ni fiches supprimées **(correctif)**.
155. **F-S2-05** — L'onglet Offre liste Référence, Domaine et Poste à pourvoir.
156. **F-S2-06** — Un visiteur voit les références sans pouvoir ouvrir les fiches ; un connecté les ouvre.
157. **F-S2-07** — Les visiteurs ne voient que les fiches publiées (état Autorisé) **(correctif : le legacy montrait aussi les états 1 et 4)**.
158. **F-S2-08** — Le gestionnaire voit le compteur « N demande et offre » et une liste pleine largeur sans publicité.
159. **F-S2-09** — Le gestionnaire supprime une fiche (logiquement), avec confirmation.
160. **F-S2-10** — Les visiteurs et les membres voient la colonne « LES PUBLICITES » à droite de la liste.
161. **F-S2-11** — Un connecté crée une demande d'emploi : domaine, nom, prénom, sexe, date de naissance, adresse, téléphone, e-mail, diplômes, compétences, expérience, autres informations, photo, CV.
162. **F-S2-12** — Un connecté crée une offre d'emploi : domaine, poste à pourvoir, diplômes, compétences requises, expérience, autres informations, photo, CV ; son nom de membre est affiché.
163. **F-S2-13** — L'exigence du champ Sexe pour une offre est confirmée ou supprimée avec le métier **(à arbitrer)**.
164. **F-S2-14** — Les contrôles d'une demande (domaine obligatoire, nom de plus de 3 caractères, sexe, téléphone valide) bloquent réellement l'enregistrement **(correctif)**.
165. **F-S2-15** — La fiche reçoit une référence `DEI…` (demande) ou `OE1…` (offre) et est publiée immédiatement.
166. **F-S2-16** — La fiche enregistre son **auteur réel** **(correctif du bug `indexmbr` = type)**.
167. **F-S2-17** — Une fiche en double (même type, même membre, même poste, mêmes informations) est refusée : « Cette fiche est déjà crée. ».
168. **F-S2-18** — Le nom est enregistré en majuscules et le prénom avec une initiale majuscule.
169. **F-S2-19** — L'âge est calculé à partir de la date de naissance (« X ans Y mois »).
170. **F-S2-20** — La photo et le CV sont rattachés à la bonne fiche **(correctif)**.
171. **F-S2-21** — Le CV est téléchargeable par les personnes autorisées **(correctif : fonction absente du legacy)**.
172. **F-S2-22** — Seuls l'auteur et le gestionnaire voient l'identité et les coordonnées du candidat ; les autres membres voient domaine, sexe, âge, diplômes, compétences, expérience, autres informations et photo.
173. **F-S2-23** — L'auteur, ou un gestionnaire avec le droit Activation, modifie la fiche ; les autres la consultent en lecture seule.
174. **F-S2-24** — Un gestionnaire avec le droit Activation change l'état d'une fiche et voit sa date d'inscription.
175. **F-S2-25** — Chaque consultation par un tiers (ni auteur ni gestionnaire) incrémente le nombre de visites de la fiche ; la date et le nombre sont affichés.
176. **F-S2-26** — Le lien « Retour liste … » ramène à l'onglet d'origine.
177. **F-S2-27** — Sur une demande d'emploi, un autre membre dépose une « Présentation de besoin » d'au moins 5 caractères.
178. **F-S2-28** — Sur une offre d'emploi, un autre membre dépose un « Intéressement », avec un texte facultatif ou obligatoire selon l'arbitrage métier.
179. **F-S2-29** — Un membre ne dépose qu'une contribution par fiche : « Opération déjà effectuée. ».
180. **F-S2-30** — Après dépôt, le message « Votre Présentation de besoin est pris en compte » ou « Votre Intéressement est pris en compte » s'affiche.
181. **F-S2-31** — L'auteur de la fiche et le gestionnaire voient la liste datée des contributions, avec le nom et le contact de leurs auteurs **(correctif)**.
182. **F-S2-32** — Un membre tiers ne voit pas les contributions des autres membres **(correctif)**.
183. **F-S2-33** — L'auteur de la fiche est notifié d'une nouvelle contribution (nouveauté à valider avec le métier).
