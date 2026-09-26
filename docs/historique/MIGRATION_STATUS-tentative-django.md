# État de la migration lafrangine — PHP legacy → Django + SvelteKit + SQLite

## Fait

### Analyse (base de la migration)
- 4 dictionnaires de données complets reconstituant le sens métier des 65 tables
  à partir du code PHP (labels de formulaires, variables, règles de validation) :
  [data-dictionary-membres.md](data-dictionary-membres.md),
  [data-dictionary-contenu.md](data-dictionary-contenu.md),
  [data-dictionary-finance.md](data-dictionary-finance.md),
  [data-dictionary-commerce.md](data-dictionary-commerce.md).
- Bugs et zones mortes du legacy identifiés et documentés (pour ne pas les reproduire).

### Backend Django ([backend/](../backend))
- Projet Django 6 + DRF + SQLite, 5 apps par domaine : `core`, `membres`, `finance`, `commerce`, `contenu`.
- **Les 65 tables sont modélisées** (`models.py` de chaque app), migrées et appliquées sur SQLite.
- `core/choices.py` : toutes les énumérations métier reconstituées depuis `incl-variable.php`.
- `membres.Membre` = `AUTH_USER_MODEL` (remplace l'auth legacy en clair par le hachage Django standard).
- Logique métier critique déjà implémentée en code (pas juste en schéma) :
  - `core.SequenceReference` : génère les références au même format que le legacy (`fonctreference()`).
  - `finance.PointCaisse` : règle de rétention de 3% sur les retraits, effet miroir sur le solde de l'opérateur.
  - `finance.CollecteFond` : machine à états (promesse → validée → annulée) avec impact sur les totaux de l'appel de fonds.
  - `membres.GroupeLikelemba` : génération des codes membres/reçus séquentiels.
- Admin Django enregistré pour les 65 modèles (utilisable immédiatement pour saisie/vérification).
- API REST (session + CSRF) : `core` (référentiels : villes, quartiers, secteurs, domaines, banques...),
  `membres` (inscription, connexion, déconnexion, `/me/`, ressources humaines).
- **Vérifié dans le navigateur** : inscription, connexion, déconnexion, CSRF cross-origin, création
  d'une annonce RH avec génération de référence — tout fonctionne de bout en bout.

### Frontend SvelteKit ([frontend/](../frontend))
- SvelteKit 2 + Svelte 5 (runes) + TypeScript + Tailwind 4.
- Client API avec gestion CSRF/session (`src/lib/api.ts`), store d'authentification réactif (`src/lib/auth.svelte.ts`).
- Layout avec navigation (7 sections du menu principal), pages Connexion/Inscription complètes
  (reproduisant les règles de validation legacy : pseudo ≥6/3 car., champs conditionnels physique/morale...).
- Page Ressources Humaines complète (liste filtrable + création).
- Page Appels de fonds complète (liste avec barre de progression, création, détail avec
  proposition d'engagement) — **la machine à états CollecteFond (promesse → validée → total
  "promis" mis à jour) a été vérifiée de bout en bout dans le navigateur**, y compris le
  changement d'état via l'admin déclenchant correctement le recalcul.
- API minimale Entreprise (`commerce`) pour débloquer la sélection d'entreprise dans le
  formulaire Appel de fonds.
- Page Likelemba complète (liste des groupes, détail avec adhésion et enregistrement de
  cotisation) — **codes générés vérifiés identiques au legacy** : groupe `LKB09126`, adhésion
  `1LKB09126`, reçu de paiement `LKB09126P1`.
- Page Point de caisse complète — **les deux règles de sécurité critiques vérifiées en
  conditions réelles** : PIN à 4 chiffres obligatoire (rejet si incorrect) et règle de
  rétention de 3% sur les retraits (retrait de 90 000 sur solde de 100 000 accepté ; retrait
  de 100 000 refusé avec le message d'erreur legacy exact).
- Annuaire minimal des membres (`/api/auth/membres/`) pour peupler les listes de sélection.
- Page Offres Financières — Demandes de crédit (liste + création).
- Page E-commerce — Vente Produit complète : catalogue groupé par catégorie FLP, panier,
  paiement — **vérifié de bout en bout** : décrément de stock (3→1) et vidage du panier
  confirmés après paiement, avec blocage si stock insuffisant.
- Sous-menu E-commerce (Vente Produit / Immobiliers / Autres articles) avec pages Immobilier et
  Articles complètes (liste + création) — vérifiées, références générées conformes au legacy
  (`IMB09126`, `ACL09126`).
- Section "Entreprises - Marchés" complète (Répertoire d'entreprise, Marchés, Réussites
  entrepreneuriales) avec sous-menu — **bug réel trouvé et corrigé** : le queryset Réussite
  filtrait `etat=2` pour tout le monde y compris les gestionnaires, rendant impossible la
  validation des fiches en attente (404 sur la fiche à valider). Corrigé pour que les
  gestionnaires voient tout, les membres voient les fiches approuvées + les leurs, les
  visiteurs anonymes voient seulement les approuvées. Flux de validation vérifié de bout en
  bout (création état 1 → invisible en public → validation gestionnaire état 2 → visible).
- App `contenu` : API complète pour Conseil (forum), Contact (formulaire + réponse
  gestionnaire avec envoi d'email), Message (messagerie privée), Soungangai (découverte de
  soi).
- Page "Informations utiles" = forum Conseil (liste + création de sujet) — vérifiée,
  référence générée `CSL09126` conforme au legacy.
- Page Contact accessible depuis le pied de page, fonctionnelle pour visiteurs et membres
  connectés.
- Page placeholder restante : Opportunités d'affaire (FLP) — module complexe (souscription en
  9 étapes), à traiter en priorité suivante.

### Bugs corrigés pendant la vérification (à ne pas réintroduire)
- Pagination DRF par défaut cassait les listes déroulantes de référentiels → désactivée sur `ReferentielReadOnlyViewSet`.
- `CSRF_TRUSTED_ORIGINS` manquant pour le frontend cross-origin.
- Champ `auteur`/`membre_creancier`/`membre` déduit de `request.user` dans `perform_create` doit
  toujours être `read_only_fields` dans le serializer DRF correspondant, sinon la validation le
  réclame comme obligatoire avant même d'atteindre la vue (pattern rencontré 2 fois — vérifier
  systématiquement pour chaque nouveau module).

## Migration des données réelles (cp1019011_lafrangine.sql)

Les vraies données de production ont été migrées depuis le dump MySQL vers SQLite,
remplaçant toutes les données de test. Scripts permanents dans
[backend/scripts/](../backend/scripts/) (`sqldump_parser.py` + `migrate_real_data.py`),
ré-exécutables à tout moment (`python scripts/migrate_real_data.py` après un `manage.py flush`).

**Stratégie** : les PK originales (`indexXXX`) sont réutilisées telles quelles comme `id`
Django (pas de table de correspondance). Les lignes dont une clé étrangère pointe vers un
enregistrement inexistant dans les données sources elles-mêmes (intégrité déjà rompue dans le
legacy, ex. `appelfond` avec `indexent=0`) sont écartées proprement plutôt que fabriquées.

**Résultat** : 47 tables sur 65 contenaient des données (les 18 autres — dont les 4 tables
d'accompagnement et les 3 de benchmarking — sont vides même dans la production réelle).
Compte quasi exhaustif migré avec succès, notamment :

| Table | Lignes migrées | Table | Lignes migrées |
|---|---|---|---|
| Membre | 68/68 | Produit | 130/130 |
| VisiteMembre | 596/596 | Visite (log) | 10 032/10 032 |
| PointCaisse | 89/89 | OperationBanque | 22/22 |
| Article | 15/15 | Partenariat | 6/6 |
| Message | 35/35 | Conseil | 14/14 |

**Vérifié dans le navigateur** : connexion réussie avec les **vrais identifiants de
production** (`lafrangine` / `elitus`, compte gestionnaire "La FRANGINE", solde de caisse
200 000 FCFA identique à la source) — le mot de passe legacy en clair a été haché via
`set_password()` en conservant sa valeur d'origine, donc les comptes existants restent
utilisables tels quels. Catalogue Produit affichant les 130 vrais produits Aloe Vera/Forever
Living avec leurs descriptions marketing complètes. Le référentiel Secteur d'activité affiche
les libellés réels avec leurs coquilles d'origine ("Automobilme", "Chaudrenerie") — preuve que
ce sont bien les données de production et non ma ressaisie manuelle antérieure.

**Écarts mineurs, tous légitimes** (référence orpheline déjà présente dans la donnée source, pas
un bug de migration) :
- `appelfond` id=1 avait `indexent=0` (référence entreprise invalide dans le legacy lui-même) → écarté.
- Les 6 `collectefond` qui en dépendaient → écartés en cascade.
- 3 `prospective1`/2 `prospective2` référençaient une entreprise (id=4) absente du dump → écartés.

**Bugs de modèle corrigés pendant la migration** (trouvés parce que de vraies données ont été
testées, pas des cas fictifs) :
- `ConseilFinance` n'avait pas de champ `confidentialite` alors que la colonne source
  (`confidencecsf`) existe bien — ajouté.
- `Besoin` n'avait pas de FK vers `Humaine` alors que `typebsn` 1/2 (RH) est utilisé dans les
  vraies données — ajoutée (`ressource_humaine`), `TypeObjet` élargi.
- Ajout du modèle `Placement` (table `placement`, section Trésorerie) qui manquait entièrement.

## Session d'amélioration à partir du site en production (lafrangine.primera-c.net)

Le site legacy réel a été exploré dans le navigateur pour corriger des erreurs de structure et
enrichir l'app avec des données réelles :

- **Correction structurelle majeure** : le catalogue "Vente Produit" (Aloe Vera/FLP) appartient
  à **Opportunité d'affaire** (onglet Proposition > Produit), pas à E-commerce comme supposé
  initialement. E-commerce ne contient que Immobiliers / Autres articles / Courses (confirmé sur
  le site réel). Le module Produit/Panier a été déplacé en conséquence.
- **Vrai logo** récupéré et intégré (`logo-site-3.png`), couleur d'en-tête confirmée identique
  (#1F3D63) à celle déjà utilisée.
- **Vraies données de référence** injectées : les 21 secteurs d'activité réels, les 10 vrais
  produits Aloe Vera/Forever Living, les coordonnées et textes marketing réels de chaque section
  (téléphone, email, adresse, descriptions des 7 sections du menu).
- **Formulaire de filtrage** de la liste des Appels de fonds ajouté (secteur, devis minimum,
  besoin minimum, réalisation %, recherche texte) — fonctionnalité présente sur le site réel et
  absente de la première version migrée.
- Nouveaux modules construits : Business Plan (auto-diagnostic), Partenariat & Troc (avec
  manifestation d'intérêt), Adhésion (souscription distributeur simplifiée — objectifs, mode de
  souscription, kit produit avec calcul de montant et seuils 56 000/66 000 FCFA), Courses
  (service de livraison, saisie libre d'articles).
- **Bug de course (race condition) découvert et corrigé** : plusieurs pages chargeaient leurs
  données dans `onMount` en testant `auth.connecte`, qui pouvait encore valoir `false` au moment
  du montage car `auth.charger()` (déclenché par `$effect` dans le layout parent) n'avait pas
  fini de résoudre. Remplacé par un pattern `$effect` qui attend `auth.pret` avant de charger.
  Fichiers corrigés : `adhesion`, `business-plan`, `produit` (opportunités), `courses`,
  `offres-financieres`. **À vérifier systématiquement pour tout nouveau module chargeant des
  données propres à l'utilisateur connecté.**
- Module Opportunité d'affaire non couvert dans cette passe : le calendrier des 4 formations et
  la liste des 25 prospects (étape 2 de l'assistant legacy) — omis volontairement pour rester
  dans un temps raisonnable, le cœur du parcours (objectifs, mode de souscription, kit produit)
  est fonctionnel.

## Clôture des lacunes de l'audit (post-migration des données réelles)

Suite à la migration des données réelles (section précédente), tous les gaps identifiés lors de
l'audit "toutes les fonctionnalités ont-elles été reprises ?" ont été traités :

- **Backend — 4 nouveaux modèles/API Finance** : `ContentieuxCredit` (dossier de restructuration
  de dette, ~25 champs), `OperationBanque` (carnet d'ordres de virement), `FondDeSoutien`
  (épargne solidaire Don/Placement), `Placement` (Trésorerie — modèle absent du code repris,
  recréé d'après la table `placement` du dump réel).
- **Backend — 3 nouveaux serializers/vues Contenu** : `ConseilFinance` (le champ `confidentialite`
  manquait au modèle malgré la colonne `confidencecsf` réelle — ajouté), `Dialogue`, `Publicite`.
- **Backend — Comparateur de prix (Commerce)** : `ProduitProspective`, `FicheProspective`,
  `LigneProspective` exposés en API (lecture ouverte pour comparaison inter-entreprises, écriture
  restreinte au propriétaire de la fiche). `Besoin` élargi (choix `DEMANDE_EMPLOI`/`OFFRE_EMPLOI`
  et FK `ressource_humaine` manquants). `Projet` (table `projet`, 0 API auparavant) exposé.
- **Restructuration des menus pour correspondre exactement au site réel**, structure retrouvée dans
  `incl-variable.php` (`$arraymenuchoix4/6/7...`) :
  - **Appels de fonds** : le 3ᵉ onglet était improprement nommé "Épargne solidaire (carte de
    pointage)" alors qu'il ne couvrait que Point Caisse. Restructuré en "Épargne solidaire" avec
    2 sous-onglets fidèles au legacy : **Don - Placement** (`FondDeSoutien`, nouveau) et
    **Carte de pointage** (Point Caisse, déplacé de `/appels-de-fonds/point-caisse`).
  - **Entreprises - Marchés** : le 2ᵉ onglet legacy réel est "Comparateur de prix" (pas
    "Réussites" comme dans la version précédente). Ajouté ; "Marchés" renommé/étoffé en
    "Marchés et projets" avec sous-onglets Marchés/Projets (fidèle à `$arraymenuchoix63`) ;
    "Réussites entrepreneuriales" conservé en 4ᵉ onglet (fonctionnalité déjà bâtie, non présente
    dans le menu actif du legacy mais gardée accessible plutôt que supprimée).
  - **Offres Financières** : n'exposait que "Demandes de crédit" en vrac. Restructuré en 3 onglets
    fidèles à `$arraymenuchoix7` : **Conseil Financier** (forum `ConseilFinance`, 3 sous-rubriques
    Conseil financier/Rumeurs Economiques/Accompagnement), **Trésorerie** (4 sous-onglets Placement/
    Opération Bancaire/Demande de Crédit/Contentieux), **Bench Marking** (page informative statique
    listant les 9 thèmes de `$arraybenchmarking` — la section équivalente est du code mort/commenté
    dans le legacy réel, aucune donnée à migrer, page volontairement simple).
  - **Le saviez-vous ?** : ajout du sous-onglet **Découverte de soi** (`Soungangai`, questionnaire
    personnel ~28 champs). 3ᵉ onglet legacy "Santé et Bien-être" non repris car son code source
    (`choix1.php`) est entièrement commenté/mort — aucune fonctionnalité réelle à préserver.
- **Bug corrigé pendant la vérification** : la page Découverte de soi prenait `results[0]` de la
  liste API sans filtrer par utilisateur — correct pour un membre normal (le backend filtre déjà),
  mais un gestionnaire (qui voit toutes les fiches) récupérait la fiche de quelqu'un d'autre comme
  si c'était la sienne. Corrigé en filtrant côté client sur `membre === auth.utilisateur.id`.
- **Bug latent découvert et corrigé (Tailwind v4)** : `frontend/src/routes/layout.css` définissait
  `.btn-primary`/`.btn-secondary`/`.btn-accent`/`.btn-ghost` via `@apply btn ...`, chaînant l'une
  vers l'autre des classes de composant personnalisées (`@layer components`). Tailwind v4 refuse ce
  chaînage (`Cannot apply unknown utility class 'btn'`), ce qui faisait planter TOUT le serveur de
  dev SvelteKit (500 sur chaque page, y compris l'accueil) — bug préexistant, non lié aux pages
  ajoutées dans cette session, découvert en vérifiant les erreurs console après coup. Corrigé en
  dupliquant les utilitaires communs dans un sélecteur groupé plutôt que de les chaîner via `@apply`.
- Toutes les nouvelles API vérifiées avec les données réelles migrées (ConseilFinance: 8,
  Dialogue: 10, Publicite: 6, ContentieuxCredit: 1, OperationBanque: 22, FondDeSoutien: 7,
  Placement: 1, ProduitProspective/FicheProspective/LigneProspective: 3/1/2) et toutes les pages
  frontend testées dans le navigateur avec la session réelle `lafrangine`/`elitus`.

## Fermeture des derniers gaps (session "implémente ces fonctionnalités")

Tous les points listés dans l'audit précédent ont été traités.

- **Bug critique découvert et corrigé — migration `Message`** : `migrate_message()` existait déjà
  et avait tourné (35 lignes) mais inversait expéditeur/destinataire. Analyse du schéma legacy
  (`incl-message.php` + `incl-contconnex.php`, où `$imbr` désigne le compte connecté quel que soit
  son rôle) : `index1mbr` est TOUJOURS l'auteur réel, `indexmbr` est la cible (0 = pool générique).
  Corrigé pour que `destinataire` (Django) soit toujours le membre propriétaire du fil, `expediteur`
  étant `None` seulement quand l'auteur est un compte gestionnaire. Un cas limite (échange entre
  deux comptes gestionnaire — l'agence Primera-C testant le système — non représentable dans ce
  modèle) est explicitement écarté. Après correctif : 33 lignes réelles, migration re-vérifiée en
  navigateur avec la session `lafrangine`/`elitus`. **Frontend construit** : widget flottant membre
  (mini-chat avec la frangine) + boîte de réception complète côté gestion (`/gestion/messages`,
  liste de correspondants + fil de discussion).
- **Bug critique découvert et corrigé — `DialogueViewSet`** : copié depuis `MessageViewSet` sans
  tenir compte du fait que `Dialogue.auteur` n'est **pas** nullable (contrairement à
  `Message.expediteur`) — un gestionnaire ne pouvait tout simplement pas créer de message
  (`auteur=None` levait une erreur d'intégrité), et un membre ne voyait jamais les réponses de la
  frangine (`auteur__isnull=True` ne correspondait jamais à rien). Corrigé : `auteur` toujours
  renseigné, `destinataire` nullable (vide = adressé au pool). **Frontend construit** : panneau
  "Échanges" repliable dans chaque sous-onglet de Trésorerie (Placement/Opération Bancaire/Demande
  de Crédit/Contentieux), correspond à `type_dialogue` 1-4 fidèle au legacy (`$podc`/`$dlg`).
- **`Suggestion`** : API ajoutée (`/api/contenu/suggestions/`, sans auteur tracé, fidèle au legacy).
  Widget flottant (partagé avec Message) accessible à tout utilisateur connecté ; liste de gestion
  en `/gestion/suggestions`.
- **`Publicite`** : CRUD gestionnaire complet en `/gestion/publicites` (upload de fichier inclus) ;
  widget `PubliciteSidebar` public affiché sur Appels de fonds et Entreprises-Marchés (emplacements
  legacy `incl-publicite.php` les plus représentatifs — la liste complète en touchait 8, non toutes
  reprises pour rester dans un temps raisonnable).
- **Accompagnement (4 questionnaires)** et **Benchmarking** : les modèles Django existaient déjà
  mais tables absentes du dump réel (vérifié directement : `benchmarking1/2/3`,
  `acompbusinesplan/acompprojetagricol/acomprestructcredit/acompcreditimmobil` n'existent pas dans
  `cp1019011_lafrangine.sql`, confirmant un usage nul en production). API + UI construites quand
  même par souci de complétude :
  - **Accompagnement** : API DRF pour les 4 modèles ; formulaire générique réutilisable
    (`AccompagnementForm.svelte`, ~50-80 champs texte par module) sous `/offres-financieres/accompagnement/{business-plan,projet-agricole,restructuration-credit,credit-immobilier}`. L'onglet "Accompagnement" du forum Conseil Financier (qui filtrait à tort `ConseilFinance` par
    `type_rubrique=3`) pointe maintenant vers ce vrai sous-menu à 4 entrées, fidèle à
    `$arraymenuchoix712` du legacy.
  - **Benchmarking** : API à 3 niveaux (`TypeOperationBenchmarking` → `OperationBenchmarking` →
    `TarifBenchmarking`). La page "Bench Marking" (statique jusque-là) affiche maintenant le vrai
    référentiel avec gestion inline pour les gestionnaires (ajout de type/opération/tarif par
    banque).
- **Espace Gestionnaire (back-office)**, `/gestion/*`, gated sur `type_compte===1` ou tout droit
  (`droit_gestion_membres`/`droit_confirmation_paiement`/`droit_gestion_fiches`) :
  - **Tableau de bord** : compteurs en attente (membres/paiements/suggestions).
  - **Membres** (`/gestion/membres`, nouvelle API `membres-gestion`) : validation de fiche
    (`statut_fiche` 1→2), suppression logique, attribution des 4 droits + point de caisse.
  - **Paiements** (`/gestion/paiements`, nouvelle API `Payement` — n'avait aucun serializer/vue
    avant cette session) : confirmation (`etatpay` 2→3), filtrage par état, total.
  - **Référentiels** (`/gestion/referentiels`) : CRUD générique (`ReferentielSimple.svelte`,
    réutilisé 8 fois) pour Villes/Quartiers/Secteurs/Domaines/Familles d'articles/Diplômes/
    Maladies/Banques/Produits/Produits prospective, + formulaire dédié pour "La frangine"
    (`Parametre`, PATCH ajouté — n'existait qu'en lecture avant).
  - **Messages, Suggestions, Publicités** : voir ci-dessus.
- **Décision actée — `adhesion`/`aide`/`client`** : confirmé par lecture directe du dump réel
  qu'aucune des 3 tables n'existe en production (pas juste 0 ligne — la table elle-même est
  absente). Combiné à l'avertissement déjà présent dans `docs/data-dictionary-membres.md §0`
  ("`adhesion` (indexahn) n'est touchée par AUCUNE requête SQL du périmètre legacy lu, la fonction
  associée est morte") : ces 3 tables sont des vestiges confirmés. Aucune action ultérieure requise ;
  le vrai workflow "adhésion" (souscription distributeur FLP) est déjà couvert par
  `SouscriptionOpportuniteAffaire`.
- **Tests automatisés** : suite ajoutée pour la logique la plus fragile découverte cette session —
  `backend/contenu/tests.py` (sémantique Message expediteur/destinataire, régression Dialogue
  auteur non-nullable, permissions Suggestion) et `backend/finance/tests.py` (gating de
  confirmation Payement par droit, validation Accompagnement). 13 tests, tous verts
  (`python manage.py test contenu finance`).

Reste ouvert, volontairement non traité (périmètre raisonnable) :
- UI de "validation de fiche" par module métier individuel (Immobilier, Article, AppelFond, etc.) —
  actuellement le gestionnaire modifie l'état via les APIs déjà exposées mais sans écran dédié par
  type de fiche dans `/gestion` ; seuls Membres et Paiements ont un écran de validation ciblé.
- Publicité sidebar non déployée sur tous les emplacements legacy (8 recensés, 2 repris).
- Pas de tests frontend (Vitest/Playwright).

## Comment reprendre le développement

```powershell
# Backend
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver

# Frontend (autre terminal)
cd frontend
npm run dev -- --port 5182
```

Superutilisateur admin existant : identifiant `admin` (mot de passe défini lors de la création,
voir historique de session ou en recréer un avec `python manage.py createsuperuser`).
