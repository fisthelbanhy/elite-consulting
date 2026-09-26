# Module « Entreprises et marchés » (pilier Opportunités, ex-section 6 hors Réussites)

> Legacy : `choix6.php` (`rere=1/2/3`, `mept=1/2`), `incl-choix6A.php`, `incl-choix6B.php`,
> `incl-choix6C1.php`, `incl-choix6C2.php`, `incl-entreprise.php`, `incl-prospective.php`,
> `incl-marche.php`, `incl-projet.php`, `pproduitptpv.php`. Spécification :
> `docs/inventaire/03-…md` §3 (S6-0 à S6-9) et checklist F-S6-01 à F-S6-35. ADR : 0004, 0007 (S6a), 0008.
> Les Réussites (S6b) appartiennent à un autre module.

## 1. Fichiers

| Couche | Fichiers |
|---|---|
| API | `backend/app/routers/{entreprises,comparateur,marches}.py`, `app/schemas/{entreprises,comparateur,marches}.py`, `app/services/entreprises.py` |
| Tests | `backend/tests/test_entreprises.py` (8), `test_comparateur.py` (7), `test_marches.py` (7) |
| Pages | `src/routes/opportunites`, `src/routes/entreprises/**`, `src/routes/comparateur-prix/**`, `src/routes/marches/**` |
| Composants | `src/lib/components/{entreprises,comparateur,marches}/*` |
| Serveur / types | `src/lib/server/{entreprises,comparateur,marches}.ts`, `src/lib/types/{entreprises,comparateur,marches}.ts` |

Modèles utilisés sans modification : `Entreprise`, `ProduitProspective`, `FicheProspective`,
`LigneProspective`, `Marche`, `Projet` (`app/models/entreprises.py`). **Aucune colonne ajoutée.**

## 2. Pages

| URL | Rôle | Accès |
|---|---|---|
| `/opportunites` | Page pilier : rubriques de `PILIERS` (id `opportunites`) avec descriptions et compteurs, appels d'offres ouverts (ou derniers), entreprises récentes, liens emplois / annonces / immobilier, CTA WhatsApp | public |
| `/entreprises` | Annuaire : recherche, secteur, domaine (du secteur), ville, tri ; titres SEO « Entreprises à Pointe-Noire »… | public |
| `/entreprises/[id]` | Fiche : logo, forme juridique, capital, gérance, activité, coordonnées **publiques**, WhatsApp / appel / e-mail / site, présence dans le comparateur, « Réclamer cette fiche », modération ; JSON-LD `LocalBusiness` + `BreadcrumbList` | public (fiche publiée) |
| `/entreprises/nouvelle` | Création, pré-remplie depuis le profil d'une personne morale, logo | connecté |
| `/entreprises/[id]/modifier` | Modification | auteur ou gestionnaire habilité |
| `/comparateur-prix` | Tableau comparatif trié par prix (cartes sur mobile), filtres produit / offre-demande / mots / tri, « Contacter » (WhatsApp, e-mail), e-mail du gestionnaire à une entreprise (`?entreprise_id=`) ; sinon message « Il faut avoir un compte entreprise pour y avoir accès. » + action adaptée | compte entreprise |
| `/comparateur-prix/ma-fiche` | Fiche de prix de **son** entreprise (`?entreprise=` si plusieurs) : en-tête, ajout / modification (`?modifier=`) / retrait des offres et demandes | compte entreprise propriétaire, ou gestionnaire habilité |
| `/comparateur-prix/produits` | Catalogue des produits (legacy `pproduitptpv.php`) | gestionnaire (écriture : droit Activation) |
| `/marches` | Onglets « Marchés et appels d'offres » / « Projets » (`?onglet=projets`) avec compteurs ; filtres type, ouverts, montant minimum, mots, tri ; date limite mise en avant ; CTA « Recevoir les nouveaux marchés sur WhatsApp » | public |
| `/marches/[id]` | Fiche marché : échéance, montant, dossier, lieu et e-mail de dépôt, PDF, « Me faire accompagner » ; JSON-LD `Demand` + `BreadcrumbList` | public |
| `/marches/nouveau`, `/marches/[id]/modifier` | Formulaire marché (+ PDF) | connecté / auteur ou gestionnaire habilité |
| `/marches/projets` | Redirection 301 vers `/marches?onglet=projets` (conserve la requête, dont `supprime=1`) | — |
| `/marches/projets/[id]` | Fiche projet ; JSON-LD `Project` + `BreadcrumbList` | public |
| `/marches/projets/nouveau`, `/marches/projets/[id]/modifier` | Formulaire projet | connecté / auteur ou gestionnaire habilité |

## 3. Endpoints (`/api`)

| Méthode et chemin | Accès | Réponse |
|---|---|---|
| `GET /entreprises?q&secteur_id&domaine_id&ville_id&tri=secteur\|nom\|recent\|visites&etat&miennes&page&taille` | public | `Liste[EntrepriseResume]` |
| `GET /entreprises/miennes` | connecté | `list[EntrepriseOption]` — **pour les autres modules** (choisir une entreprise) |
| `GET /entreprises/modele` | connecté | valeurs de pré-remplissage (personne morale) |
| `GET /entreprises/{id}` | public | `EntrepriseDetail` (compte une visite de tiers) |
| `POST /entreprises`, `PUT /entreprises/{id}` | connecté / auteur ou G+Activation | `Ok` (réf. `ENT…`) |
| `POST /entreprises/{id}/logo` (multipart `fichier`) | auteur ou G+Activation | `Ok` |
| `POST /entreprises/{id}/etat`, `DELETE /entreprises/{id}` | G+Activation / auteur ou G+Activation | `Ok` |
| `GET /comparateur/acces` | public | `{acces, motif, message, gestionnaire, entreprises}` |
| `GET /comparateur/produits?q&tous` | compte entreprise | produits + nombre d'offres / demandes publiées |
| `POST /comparateur/produits`, `PUT /comparateur/produits/{id}` | G+Activation | `Ok` |
| `GET /comparateur/lignes?type&produit_id&entreprise_id&q&tri=prix\|prix_desc\|recent` | compte entreprise | `Liste[LigneComparee]` |
| `GET /comparateur/ma-fiche?entreprise_id` | propriétaire ou G+Activation | `FicheDetail` |
| `POST /comparateur/lignes`, `PUT /comparateur/lignes/{id}`, `DELETE /comparateur/lignes/{id}` | propriétaire ou G+Activation | `Ok` (suppression physique) |
| `POST /comparateur/entreprises/{id}/email` | gestionnaire | `Ok` (« Proposition des produits ») |
| `GET /marches?type&ouverts&montant_min&q&tri=recent\|cloture\|montant&etat&miennes` | public | `Liste[MarcheResume]` (+ `jours_restants`, `ouvert`) |
| `GET /marches/compteurs` | public | `{marches, marches_ouverts, projets}` |
| `GET /marches/{id}`, `POST /marches`, `PUT /marches/{id}` | public / connecté / auteur ou G+Activation | réf. `MCH…` |
| `POST /marches/{id}/document`, `DELETE /marches/{id}/document` | auteur ou G+Activation | PDF |
| `POST /marches/{id}/etat`, `DELETE /marches/{id}` | G+Activation / auteur ou G+Activation | `Ok` |
| `GET /marches/projets?q`, `GET /marches/projets/{id}`, `POST`, `PUT`, `/etat`, `DELETE` | idem | réf. `PJT…` |

`/marches/projets` est déclaré **avant** `/marches/{id}` (`routers = [router_projets, router]`).
Ne pas confondre avec `/projets` (appels de fonds, section 4).

## 4. Règles métier

- **Entreprise** : domaine obligatoire (« Veuillez indiquer le domaine d'activité. »), secteur
  **déduit du domaine** et enregistré ; nom ≥ 4 caractères (« Le nom de l'entreprise doit avoir au
  moins 4 caractères. ») ; forme juridique 1–9 (« Veuillez indiquer la forme juridique de
  l'entreprise. ») ; ville (« Veuillez indiquer la ville où est située l'entreprise. ») ;
  téléphone au format congolais ; e-mail valide ; site normalisé en `https://` (jamais
  `javascript:`) ; unicité **nom + domaine** insensible à la casse, hors fiches supprimées
  (« Cette entreprise est déjà enregistrée. ») ; publiée immédiatement (état 2, comme le legacy).
- **Comparateur** : compte entreprise = gestionnaire, ou membre personne morale ayant au moins
  une entreprise non supprimée. Fiche rattachée à l'entreprise (1 par entreprise, créée au premier
  ajout). Ligne : produit choisi ou tapé (« Veuillez indiquer le produit. »), réutilisé s'il existe
  (même nom, casse ignorée) sinon créé publié ; unité (« Veuillez indiquer l'unité de vente. ») ;
  prix > 0 (« Veuillez indiquer le prix. ») ; pas deux lignes identiques fiche + type + produit +
  unité. Consultation : lignes, fiche, entreprise et produit publiés seulement. E-mail du
  gestionnaire : message ≥ 10 caractères, adresse de l'entreprise (à défaut celle du membre)
  contrôlée, sujet « Proposition des produits », message « Votre opération a bien été envoyée. ».
- **Marché** : numéro ≥ 4 (« Veuillez indiquer le numéro d'appel d'offres. »), type
  (« Veuillez indiquer marché privé ou public. »), libellé ≥ 4, montant > 0, numéro unique (casse
  ignorée) en création **et** modification (« Ce marché est déjà enregistré. »), message
  « Opération effectuée avec succès. ». « Ouvert » = non clôturé (état 4) et date limite non
  dépassée ou non précisée.
- **Projet** : responsable, promoteur, objet, libellé ≥ 4 (messages legacy), durée 0–120 mois,
  unicité responsable + objet (« Ce projet est déjà enregistré. »).

## 5. Correspondance checklist

| Point | Statut |
|---|---|
| F-S6-01 | Onglets annuaire / comparateur / marchés et projets (`OngletsSection`, compteur des projets publiés) ; sous-onglets Marchés / Projets |
| F-S6-02 à F-S6-13 | Couverts (voir écarts E1, E2 pour la visibilité) |
| F-S6-14, F-S6-15 | Message exact ; la personne morale accède à sa fiche par « Gérer ma fiche de prix » (voir E8) |
| F-S6-16 à F-S6-22 | Couverts (accès : E7) ; F-S6-17 : reprise déjà faite par `reprise_legacy.py` |
| F-S6-23 à F-S6-31 | Couverts |
| F-S6-32 | Tranché : limite de 20 caractères levée à 150 (colonnes `text`) |
| F-S6-33 | **Non couvert** : pas de composant « Publicités » disponible (autre module) — à insérer quand il existera |
| F-S6-34 | Hors périmètre (Réussites, ADR-0007 S6b) |
| F-S6-35 | Couvert : tous les droits vérifiés côté API, testés |
| F-TR-01/02 | Pagination réelle, filtres dans l'URL (20 par page ; 50 au comparateur) |

## 6. Écarts et décisions (à reporter dans un ADR)

| # | Sujet | Legacy | Décision |
|---|---|---|---|
| E1 | Annuaire pour les visiteurs | Liste sans lien ni référence | Fiche publique consultable et indexée (valeur SEO de l'annuaire, analyse de marché §2.5) |
| E2 | Fiches non publiées | Tout connecté voyait tous les états | Visibilité standard : public = publiées, auteur = les siennes, gestionnaire = tout |
| E3 | Unicité entreprise | Secteur (jamais saisi) + nom | Nom + domaine, casse ignorée, hors supprimées ; secteur déduit du domaine |
| E4 | Pré-remplissage | Domaine ← sexe, forme ← situation | Domaine et forme juridique lus dans les colonnes dédiées (`membre.domaine_activite_id`, `membre.forme_juridique`) |
| E5 | Téléphone / site de l'entreprise | Aucun contrôle | Format congolais ; site en http(s) |
| E6 | Modification des fiches S6 | Tout gestionnaire | Auteur ou gestionnaire avec droit Activation (règle commune `verifier_modification`) |
| E7 | Consultation du comparateur | Tout connecté non « morale » (visiteurs refusés) | Comptes entreprise seulement (ADR-0007 S6a), consultation et saisie |
| E8 | Personne morale sur le comparateur | Formulaire direct, pas de liste | Liste comparative + bouton « Gérer ma fiche de prix » |
| E9 | Nom d'un produit | ≥ 4 (gestion) / ≥ 6 (saisie à la volée) | ≥ 3 partout (« Riz », « Gaz »), première lettre en majuscule, doublons de casse refusés |
| E10 | Unité de vente | Libre (liste `UniteMesure` inutilisée) | Libre, avec suggestions tirées de `UniteMesure` |
| E11 | Lignes du comparateur | Pas de modification, pas d'anti-doublon | Modification ajoutée ; doublon fiche + type + produit + unité refusé ; suppression physique conservée |
| E12 | Date limite d'un marché | Aucun contrôle | Refusée si passée, à la création seulement |
| E13 | Dossier d'appel d'offres | — | PDF facultatif (`marche.document`) |
| E14 | Marché ou projet clôturé / non publié | Visible des connectés | Visibilité standard ; « ouvert » calculé |
| E15 | Unicité projet | Création seulement, message « marché » | Création et modification, casse ignorée, « Ce projet est déjà enregistré. » |
| E16 | Pagination | 50 (cassée) | 20 côté public (ADR-0007 T2), 50 au comparateur |
| E17 | Logo / PDF refusé à la création | — | La fiche est enregistrée ; redirection vers la fiche avec un avertissement (pas de doublon au renvoi) |

## 7. Besoins sur des fichiers partagés (non modifiés)

- `frontend/src/lib/server/redirections.ts` : `choix6.php?rere=3&mept=2` → `/marches?onglet=projets` ;
  `ient={id}` → `/entreprises/{id}`, `imch={id}` → `/marches/{id}`, `ipjt={id}` → `/marches/projets/{id}`.
- `frontend/src/routes/sitemap.xml/+server.ts` : ajouter `['/marches/projets', '/marches/projets']`.
- `backend/scripts/reprise_legacy.py` : décoder les entités HTML et les `\'` des textes repris
  (ex. « CECILIA &amp; SARICKA ») et remplir `entreprise.secteur_id` depuis le domaine.
- Module Publicités : un composant d'encart réutilisable pour F-S6-33.
- Suggestion : `ville_id` / `secteur_id` sur `marche` pour des alertes par secteur et ville et des
  pages « Appels d'offres à Brazzaville » (non ajoutés).
