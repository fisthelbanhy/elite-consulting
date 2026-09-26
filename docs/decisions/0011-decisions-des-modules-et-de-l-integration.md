# ADR-0011 — Décisions prises pendant la construction des modules et l'intégration

- **Statut** : Accepté — 2026-09-22
- **Complète** : ADR-0004 (règles/bugs), ADR-0007 (arbitrages de l'inventaire), ADR-0008 (conversion).
- **Détail** : chaque document de [../modules/](../modules/) contient sa section « Écarts et décisions ».

Ces décisions sont des **écarts assumés par rapport au legacy** : correctifs, clarifications de
droits ou améliorations de parcours. Elles restent toutes réversibles (constantes ou règles
isolées dans le code).

## 1. Transverse (intégration)

| # | Décision | Pourquoi |
|---|---|---|
| I1 | Textes repris du legacy « dé-échappés » (`&amp;amp;`, `\'` → texte brut) | Le PHP stockait les saisies passées par `htmlspecialchars()` et `addslashes()` ; l'échappement se fait désormais à l'affichage |
| I2 | 16 produits aux codes de catégorie 0 et 100 (hors des 20 catégories FLP) reclassés : compléments alimentaires, produits de la ruche, buvables | La catégorie « Compléments alimentaires » était vide : le legacy utilisait 100 à sa place |
| I3 | Les 5 réponses de dialogue adressées par erreur au membre n° 1 sont rattachées au dernier membre ayant écrit dans la même rubrique | Bug legacy du destinataire (inventaire 01, §5) ; tracé dans le rapport de reprise |
| I4 | Secteur d'une entreprise reprise = secteur de son domaine | Le champ secteur était mort dans l'interface legacy |
| I5 | Le compte n° 1 (agence) est masqué des listes, mais sa fiche reste consultable en gestion | Des fiches y renvoient comme auteur ; une 404 cassait la navigation |
| I6 | Bouton d'accueil « Installer ma Likelemba » = contact WhatsApp | La création d'un groupe est réservée à la frangine (règle legacy) |
| I7 | Encart publicitaire sur l'accueil, les emplois, l'annuaire des entreprises et les appels de fonds ; masqué pour les gestionnaires | Emplacements legacy (F-TRV-43, F-S2-10, F-S4-03, F-S6-33) |
| I8 | La reprise des données marque la base comme à jour pour Alembic (`stamp head`) | Les migrations futures s'appliquent directement à une base rechargée |
| I9 | `npm run dev` à la racine lance l'API et le site : petit script Node sans dépendance (`scripts/dev.mjs`) plutôt que `concurrently` | Une seule commande et un seul terminal, sans `npm install` à la racine ; le script vérifie l'environnement Python, les dépendances du frontend et les ports avant de démarrer, et arrête l'arbre de processus d'uvicorn (rechargement) avec le reste |

## 2. Se lancer (forum, découverte de soi, diagnostic, réussites)

- Les visiteurs lisent les fils publics du forum ; répondre exige un compte. Un sujet clôturé
  reste lisible sans nouvelle réponse ; l'auteur peut supprimer son sujet.
- Notifications par la messagerie : réponse à un sujet, question privée, nouvelle réussite,
  nouveau diagnostic (vers la frangine), écrit de la conseillère, réussite publiée (vers le membre).
- Découverte de soi : l'« état de la fiche » est réservé au gestionnaire habilité ; une fiche
  supprimée repart à blanc ; questions 15 et 16 affichées « meneur·se / suiveur·se » et
  « entouré·e / seul·e » (stockage 1/2 inchangé). Un nouveau diagnostic rouvre une fiche close ;
  deux envois identiques en 24 h ne créent qu'un message.
- Une réussite modifiée après publication repasse en relecture.
- Nouvelles colonnes `soungangai.diagnostic` (JSON) et `date_diagnostic`. En production,
  définir `LF_COOKIE_SECRET` côté frontend (conservation du diagnostic en cours).

## 3. Communication (contact, suggestions, publicités, messagerie)

- Contacts et suggestions créés à l'état 1 « À traiter » (le legacy mettait 2) ; une réponse
  passe le contact à « Traité ». Un visiteur a un membre vide (et non le membre n° 1 « Aucun »).
- Contact limité à 5 messages par jour et par e-mail (10 pour un membre).
- Réponse au contact enregistrée **puis** envoyée par e-mail (texte brut UTF-8) ; le membre est
  aussi prévenu dans sa messagerie.
- Publicités : pas de lecture automatique ; le type affiché suit le vrai fichier ; les vues ne sont
  pas comptées pour le demandeur, les gestionnaires et les robots. La limite de 4 Mo est trop
  basse pour des vidéos : à relever par type de fichier si besoin.
- Texte d'aide paramétré : HTML échappé, seules quelques balises de mise en forme sont rétablies.
- Un gestionnaire peut écrire le premier à un membre.
- Pages légales livrées avec des marqueurs `[À compléter : …]` (RCCM, NIU, raison sociale,
  hébergeur, durées de conservation…).

## 4. E-commerce (immobilier, annonces, courses)

- L'adresse précise d'un bien n'est visible que de l'auteur et des gestionnaires.
- Surface plafonnée à 100 000 m² (au lieu de 2 000) ; un seul intérêt par membre et par fiche.
- Courses : le mode de paiement est choisi sur la page de paiement ; l'état « payé » suit le
  journal des paiements ; le montant payé inclut les frais de service ; une ligne incomplète
  bloque l'enregistrement ; la boutique fait avancer l'état, le client peut annuler une course en
  attente et non payée ; notifications aux étapes clés ; bornes de dates indépendantes.
- Catalogue boutique : nom ≥ 3 caractères ; un gestionnaire habilité peut ajouter un article
  pour une boutique.

## 5. Financer & épargner (appels de fonds, Likelemba, épargne solidaire)

- Promesse d'apport comptée immédiatement ; « Valider » vaut accusé de réception ; le premier
  versement vaut validation. Paiement type 8 : effet à la **confirmation** de la caisse (montant
  plafonné au reste dû, déclarations en attente déduites).
- Cotisation Likelemba créée à l'enregistrement du paiement, validée à la confirmation, annulée
  au rejet (le numéro de reçu reste consommé). Colonne ajoutée `cotisation_likelemba.paiement_id`.
- Unicité d'un groupe : responsable + montant + périodicité + date de début (et non
  l'observation). Le responsable inscrit des membres, valide des reçus, voit cautions et témoins.
  Calendrier indicatif des tours ajouté.
- Don / placement : rapporteur = membre connecté ; souscripteur désigné par pseudonyme,
  identifiant ou téléphone (ou nom libre) ; il voit et peut payer la fiche ; e-mail pour un don
  comme pour un placement.
- Carte de pointage : agent = membre avec point de caisse actif ; **5 PIN erronés en 15 min
  bloquent la carte** et préviennent le titulaire ; chaque opération envoie un message.
- Module d'épargne désactivé : l'API répond 403 (sauf `/epargne/statut`), le site affiche une
  page explicative (ADR-0009).

## 6. Bien-être (boutique, fiches, distributeur, business plan, partenariats)

- Catalogue public ; fiches bien-être non indexées (`noindex`).
- Panier : lignes identiques fusionnées, quantité modifiable, stock contrôlé sur le total ;
  les gestionnaires consultent les paniers sans les modifier.
- Assistant d'adhésion en 10 étapes (numérotation de `$arrayetapeadhesion`), sauvegarde à
  chaque étape ; kit = produits actifs ayant un prix distributeur ; distributeur = souscription
  à l'état 2 ou 4 ; mode crédit → message automatique et validation par un gestionnaire habilité.
- Business plan et partenariats : non créables par les gestionnaires ; modification par l'auteur
  ou un gestionnaire habilité ; doublon de partenariat contrôlé par auteur ; les intéressés ne
  sont visibles que de l'auteur et des gestionnaires (ADR-0007 S2d, contre F-S5-52).
- Vidéo produit legacy (`.WMV`) non affichée tant qu'elle n'est pas convertie en MP4 ; le
  catalogue PDF est remplacé par la boutique en ligne.

## 7. Entreprises & marchés

- Fiche entreprise publique et indexée ; les fiches non publiées ne sont plus visibles des autres
  membres.
- Unicité nom + domaine sans tenir compte de la casse ; secteur déduit du domaine.
- Modification : auteur ou gestionnaire habilité (le legacy autorisait tout gestionnaire).
- Comparateur réservé aux comptes entreprise, en consultation comme en saisie ; nom de produit
  ≥ 3 caractères (« Riz », « Gaz ») ; lignes modifiables, doublon produit + unité refusé.
- Marché : date limite passée refusée à la création ; numéro unique aussi en modification.
  Projets : libellés jusqu'à 150 caractères, unicité aussi en modification.
- Pagination : 20 par page (50 au comparateur).

## 8. Offres financières

- Objet d'un dossier d'accompagnement : **10 caractères minimum** (règle réelle du legacy,
  contre 11 dans la consigne ; constante `OBJET_MIN`).
- Dossiers : brouillon (1), envoyé (2), traité (4) ; membre prévenu à chaque changement ;
  non modifiable une fois traité.
- Clôture possible dans les deux rubriques du forum financier.
- Banques d'un placement : liste d'identifiants séparés par « * » (format legacy lisible).
- Opérations bancaires : une référence commune par lot ; un e-mail par banque (adresse du
  référentiel à défaut de saisie).
- Tarifs bancaires : un tarif actif par banque et par opération ; rattachement des 25 opérations
  aux 9 types décidé pour l'initialisation.

## 9. Gestion et espace membre

- Création d'un membre sans mot de passe → lien d'activation (24 h, usage unique, un nouveau
  lien annule le précédent).
- Écrire sur un membre exige le droit Activation ; nommer/rétrograder un gestionnaire ou agir sur
  un autre gestionnaire exige le droit Attribution ; on ne peut ni se supprimer, ni changer son
  propre type ou état, ni se retirer l'attribution.
- Valider un membre lui envoie un message de bienvenue ; le supprimer ferme ses sessions.
- Référentiels avec état : suppression logique ; sans état : suppression physique seulement si
  inutilisés. Doublons comparés sans casse ni accents.
- Purge des journaux de visites : physique, droit Activation requis.
