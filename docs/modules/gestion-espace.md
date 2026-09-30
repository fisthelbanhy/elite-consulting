# Module « Gestion » (back-office) et « Mon espace » (membre)

Back-office des gestionnaires et tableau de bord du membre connecté.
Legacy : `incl-menu1.php` (menu gestionnaire), `pparametre.php`, `pmembre.php` +
`incl-formulairemembre.php`, `pvilqtr.php`, `pdiplome.php`, `psatdat.php`, `pfamilart.php`,
`pmaladie.php`, `pproduit.php`, `pproduitptpv.php`, `pbanque.php`, `pvisite.php`, `ppayement.php`,
`incl-membre.php` (profil). Inventaire : `01-transverse-admin-s1-s2.md` §2 (E-ADM-01 à E-ADM-15),
E-TRV-05 ; `02-…` §4.5 (écran des paiements). ADR : 0005, 0006, 0007 (T1, T2, T4, T5), 0008, 0009.

## 1. Fichiers

| Couche | Fichiers |
|---|---|
| API | `api/src/routes/gestion.ts` (tableau de bord, compteurs, modération ; agrège les 3 suivants), `gestion-membres.ts`, `gestion-referentiels.ts`, `gestion-journaux.ts`, `espace.ts` |
| Schémas | Zod, dans chaque routeur |
| Service | `api/src/services/gestion.ts` : file de modération transverse (`MODULES_MODERES`), code de pointage, lien de réinitialisation, unicité, pagination 50 → 500 |
| Tests | `api/tests/gestion.test.ts` (11), `gestion-referentiels.test.ts` (6, dont journaux), `espace.test.ts` (4) |
| Pages gestion | `/gestion` (tableau de bord), `/gestion/membres`, `/gestion/membres/nouveau`, `/gestion/membres/[id]`, `/gestion/membres/[id]/modifier`, `/gestion/membres/export` (CSV), `/gestion/paiements`, `/gestion/moderation`, `/gestion/referentiels`, `/gestion/referentiels/[type]` (villes, quartiers, secteurs, domaines, diplomes, familles, produits-comparateur, banques), `/gestion/referentiels/produits[/id]`, `/gestion/referentiels/maladies[/id]`, `/gestion/parametres`, `/gestion/journaux`, `/gestion/reinitialisations` |
| Chrome | `routes/gestion/+layout.server.ts` (exige un gestionnaire) et `+layout.svelte` (barre latérale fixe, tiroir sur mobile) ; les pages Messages, Contacts, Suggestions, Publicités (module Communication) sont simplement reliées |
| Pages espace | `/espace` (tableau de bord), `/espace/profil`, `/espace/paiements` ; `routes/espace/+layout.server.ts` exige la connexion (la page `/espace/messages` appartient au module Communication) |
| Composants | `lib/components/gestion/` : `BarreLaterale`, `EnTeteGestion`, `CarteStat`, `GraphiqueVisites`, `TaillePage`, `LienUnique`, `FormulaireMembre`, `PanneauAcces`, `ConseilsProduits`, `referentiels.ts` (description des référentiels simples) ; `lib/components/espace/` : `OngletsEspace`, `CarteModule`, `FormulaireProfil` |
| Serveur / types | `lib/server/gestion.ts` (`exigerGestionnaire`, `filtres`, `taillePage`, `executer`, `supprimer`, `CHAMPS_MEMBRE`) ; `lib/types/gestion.ts`, `lib/types/espace.ts` |

## 2. Droits (ADR-0007 T1/T4, F-ADM-39)

Tout le préfixe `/api/gestion` porte la dépendance `gestionnaire_requis` (401 visiteur, 403 membre).
En plus :

| Action | Droit exigé |
|---|---|
| Consulter (listes, fiches, journaux, file de modération) | gestionnaire |
| Créer / modifier / valider / supprimer un membre, code de pointage, lien de réinitialisation, photo, purge des journaux | **Activation** |
| Attribuer ou retirer des droits ; nommer ou rétrograder un gestionnaire ; agir sur le compte d'un **autre gestionnaire** (fiche, état, mot de passe, photo) | **Attribution** |
| Confirmer / rejeter un paiement (`/api/paiements/{id}/confirmer|rejeter`, module Paiements) | **Caisse** |
| Référentiels et paramètres | gestionnaire |

Garde-fous : on ne change ni son propre type, ni son propre état, on ne se supprime pas, on ne se
retire pas le droit d'attribution ; un compte rétrogradé perd ses droits ; le compte système n° 1
(« Aucun », legacy) est masqué de toutes les listes sauf pour lui-même (F-ADM-08).

## 3. Endpoints (`/api`)

| Méthode et chemin | Rôle |
|---|---|
| `GET /gestion/compteurs` | Pastilles de la barre latérale : nouveaux membres (état 1), paiements à confirmer, fiches en attente, mots de passe oubliés, messages non lus, contacts à traiter |
| `GET /gestion/tableau-de-bord` | Compteurs + montant en attente, suggestions à lire, courses en attente, fiches en attente par module, visites et connexions 7/30 j, série journalière 30 j, 8 derniers inscrits, droits du gestionnaire |
| `GET /gestion/moderation?module=&page=&taille=` | Fiches à l'état 1 de 14 modules (emplois, immobilier, annonces, appels de fonds, Likelemba, entreprises, marchés, partenariats, publicités, réussites, questions, conseil financier, découverte de soi, souscriptions distributeur) avec lien vers la fiche |
| `GET /gestion/membres?q=&type_compte=&categorie=&ville_id=&etat=&tri=nom\|recents&page=&taille=` | Liste (supprimés exclus sauf `etat=3`) ; `q` cherche nom, pseudonyme, identifiant, e-mail, code, observation, téléphone (chiffres normalisés) |
| `GET /gestion/membres/options` | Options compactes (filtres) |
| `GET /gestion/membres/export?…` | CSV `;` UTF-8 BOM de la liste filtrée, cellules neutralisées contre l'injection de formules (F-ADM-40) |
| `GET /gestion/membres/{id}` | Fiche complète + domaine, en ligne, a un code de pointage, nb de connexions et paiements, demandes de réinitialisation en attente, `peut_modifier`, `peut_attribuer`, `est_moi` (jamais de hash) |
| `POST /gestion/membres` | Création (201) ; sans mot de passe → lien d'activation `activation` (24 h, usage unique) ; personne morale « Banque » → ligne du référentiel des banques (F-TRV-23) |
| `PUT /gestion/membres/{id}` | Modification complète, nom et personnalité compris ; ne touche jamais aux droits |
| `POST /gestion/membres/{id}/etat` · `DELETE /gestion/membres/{id}` | Validation (1 → 2 : message de bienvenue dans la messagerie), remise en attente, suppression logique (sessions fermées) |
| `PUT /gestion/membres/{id}/droits` | Attribution / Caisse / Activation (gestionnaires seulement) |
| `POST /gestion/membres/{id}/code-pointage` | Code à 4 chiffres (`secrets`), renvoyé une fois, stocké haché Argon2 dans `code_pointage_hash` |
| `POST /gestion/membres/{id}/reinitialisation` | Lien `/reinitialiser/{jeton}` (canal « gestionnaire », 24 h) + message WhatsApp prêt ; anciens liens invalidés, demandes en attente marquées prises en charge |
| `POST /gestion/membres/{id}/photo` | Photo (multipart `fichier`) |
| `GET /gestion/reinitialisations?statut=attente\|toutes` | Demandes « mot de passe oublié » sans e-mail, puis historique (statuts : en attente, prise en charge, classée, lien actif, utilisé, expiré) |
| `POST /gestion/reinitialisations/{id}/traiter` · `…/ignorer` | Créer le lien après rappel du membre ; classer sans suite |
| `GET /gestion/referentiels` | Sommaire (nombre d'éléments actifs) |
| `GET/POST /gestion/referentiels/{villes,quartiers,diplomes,secteurs,domaines,familles,produits,maladies,produits-comparateur,banques}` · `GET/PUT/DELETE …/{id}` | CRUD (voir §4) ; `POST …/produits/{id}/photo` |
| `GET /gestion/parametres` · `PUT /gestion/parametres` | Tous les champs de `parametre` (sauf compteurs), dont `whatsapp` et les interrupteurs ADR-0009 |
| `GET /gestion/journaux/visites?du=&au=&heure_debut=&heure_fin=&ip=` | Visites anonymes (F-ADM-30) |
| `GET /gestion/journaux/connexions?…&membre_id=` | Connexions des membres (F-ADM-31) |
| `POST /gestion/journaux/{visites\|connexions}/purger` | `{"ids": […]}` (lignes cochées) ou `{"avant": "AAAA-MM-JJ"}` ; suppression physique |
| `GET /espace/compteurs` | Inchangé (en-tête public) |
| `GET /espace/tableau` | Profil (complétion + champs manquants), fiches par module (total + 3 dernières, modules non vides), 5 derniers paiements, paiements en vérification, messages non lus |
| `PUT /espace/identifiant` | Changement d'identifiant (mot de passe exigé, unicité) |
| `PUT /espace/code-pointage` | Le titulaire d'une carte choisit son code (mot de passe exigé, 4 chiffres, confirmation) |

Le frontend utilise en plus `PUT /auth/profil`, `POST /auth/profil/photo`, `POST /auth/mot-de-passe`,
`GET /paiements/miens` et, pour la caisse, `GET /paiements` et `POST /paiements/{id}/confirmer|rejeter`.

## 4. Règles des référentiels (messages repris du legacy, orthographe corrigée)

| Référentiel | Règles | Suppression |
|---|---|---|
| Villes | nom ≥ 4 « Le nom doit avoir 4 caractères minimum. » ; doublon « Cette ville est déjà enregistrée. » | physique si aucune utilisation (quartiers, membres, entreprises, appels de fonds), sinon refus motivé |
| Quartiers | ville obligatoire « Chaque quartier doit être lié à une ville. » ; nom ≥ 4 ; unique par ville | physique si aucune annonce immobilière |
| Diplômes | code en majuscules ; libellé ≥ 5 ; « Ce diplôme est déjà enregistré. » | physique (aucune clé étrangère) |
| Secteurs / domaines | libellé ≥ 5 ; domaine rattaché **obligatoirement** à un secteur (correctif F-ADM-20) ; « Cette fiche est déjà enregistrée. » | logique (état 3) : disparaît des listes publiques |
| Familles d'articles | libellé ≥ 5 ; « Cette famille d'article est déjà enregistrée. » (correctif F-ADM-21) | physique si aucune annonce |
| Fiches bien-être | libellé ≥ 5 ; « Cette maladie est déjà enregistrée. » ; liste **ordonnée** de produits conseillés sans limite, un produit une fois, « conseil d'utilisation » | logique |
| Produits | groupe FLP (les groupes 0 et 100 de la reprise restent acceptés sur leurs produits), nom ≥ 3, 3 prix ≥ 0, stock ≥ 0, état, photo ; doublon groupe + nom « Ce produit est déjà enregistré. » (correctif F-ADM-26) ; filtres groupe, prix distributeur max., prix public max., stock max., texte | logique |
| Produits du comparateur | nom ≥ 4, unique | logique |
| Banques | sigle en majuscules, nom ≥ 3, doublon sigle + nom | logique |

Doublons comparés sans tenir compte de la casse, lettres accentuées comprises (
`lower()` de SQLite ignore « É »). Chaque écriture de référentiel ou de paramètre appelle
`invaliderReferentiels()` côté SvelteKit.

## 5. Correspondance avec la checklist

| Points | Couverture |
|---|---|
| F-TRV-06 | Tableau de bord `/gestion` |
| F-TRV-25 à F-TRV-30 | `/espace/profil` (le sien seulement ; identifiant, mot de passe, code de pointage ; type jamais modifiable ; solde et date de pointage en lecture ; « Modification effectuée. ») |
| F-TRV-70 | Pastille « nouveaux membres » de la barre latérale et tuile du tableau de bord |
| F-TRV-23, F-TRV-29 | Banque créée pour une personne morale « Banque » (création ou modification en gestion), sans écraser la banque n° 1 |
| F-ADM-01 à F-ADM-04 | `/gestion/parametres` |
| F-ADM-05 à F-ADM-15 | `/gestion/membres/**`, `/gestion/reinitialisations` |
| F-ADM-16 à F-ADM-29 | `/gestion/referentiels/**` |
| F-ADM-30 à F-ADM-33 | `/gestion/journaux` |
| F-ADM-39 | Garde serveur sur tout `/api/gestion` + layout SvelteKit |
| F-ADM-40 | Export CSV des membres (les publicités relèvent du module Communication) |
| F-TRV-66, F-TRV-67 | 50 lignes par page, choix 50 à 500, filtres dans l'URL |
| §4.5 inventaire 02 | `/gestion/paiements` : filtres état, opération, mode, membre, période (jour de fin inclus), montant max., remarque ; total ; confirmation et rejet confirmés |

## 6. Écarts et décisions (à reporter dans un ADR)

1. **Mot de passe à la création par un gestionnaire** : facultatif. Vide → lien d'activation à usage
   unique (24 h) à transmettre au membre ; le compte a un hash inutilisable tant que le lien n'est pas utilisé.
2. **Liens transmis par la frangine valables 24 h** (60 min pour le lien envoyé par e-mail) ; un
   nouveau lien invalide les précédents non utilisés.
3. **Droit Activation** exigé pour toute écriture sur un membre ; **droit Attribution** pour
   promouvoir/rétrograder un gestionnaire et pour agir sur le compte d'un autre gestionnaire
   (évite la prise de contrôle d'un compte privilégié) ; auto-protections (§2).
4. **Validation d'un membre** (1 → 2) : message de bienvenue automatique dans sa messagerie.
   Suppression logique d'un membre : ses sessions sont fermées.
5. **Suppression des référentiels** : logique pour ceux qui ont un état, physique seulement si
   inutilisés pour les autres (le legacy n'en proposait pas).
6. **Journaux** : purge physique (lignes cochées ou antérieures à une date), droit Activation ; les
   visites anonymes legacy rattachées au compte n° 1 sont affichées sans membre.
7. **Point caisse** (`point_caisse_actif`) traité comme une propriété de la fiche (droit Activation),
   pas comme un droit d'administration.
8. **Compteurs** alignés sur le module Communication : contacts et suggestions « à traiter / à
   lire » = état 1.
9. **Liens de la file de modération et de « Mes fiches »** : convention `/<module>/{id}` des URL de
   l'ADR-0008 ; exceptions : publicités → `/gestion/publicites/{id}`, souscriptions →
   `/devenir-distributeur/souscriptions/{id}`, épargne → `/epargne/fonds/{id}`, fiches uniques
   (business plan, découverte de soi, souscription) → page du module. Le business plan à l'état 1
   est un brouillon (ADR-0004) : il n'est pas dans la file.

## 7. Colonnes ajoutées

Aucune (les tables de `core.ts` et `membres.ts` couvraient tout : `code_pointage_hash`,
`ReinitialisationMotDePasse.traitee_par_id`, interrupteurs de `parametre`).
