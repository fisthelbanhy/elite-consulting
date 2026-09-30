# Module « Communication et pages transverses »

Contact, suggestions, publicités, messagerie privée membre ↔ la frangine, aide et pages légales.
Legacy : `pcontact.php`, `psugest.php`, `incl-publicite.php`, `incl-affichpub.php`,
`ppublicite.php`, `incl-message.php`, `pmessage.php`, `incl-envoimail.php`.
Inventaire : E-TRV-07 à E-TRV-10, E-TRV-12, E-ADM-12 à E-ADM-14. Arbitrages : ADR-0007 T3, T7, T8, T10, T11.

## Fichiers

| Couche | Fichiers |
|---|---|
| API | `api/src/routes/{contact,suggestions,publicites,messages}.ts` |
| Schémas | Zod, dans chaque routeur |
| Services | `api/src/services/messages.ts` (présence, marquage lu, notification système), `api/src/services/publicites.ts` (fenêtre de diffusion, vrai type du fichier, texte nettoyé, vues) |
| Tests | `api/tests/{contact,suggestions,publicites,messages}.test.ts` (16 tests) |
| Pages | `/contact`, `/suggestion`, `/publicites`, `/publicites/[id]`, `/espace/messages`, `/aide`, `/mentions-legales`, `/confidentialite`, `/conditions` |
| Gestion | `/gestion/contacts`, `/gestion/contacts/[id]`, `/gestion/suggestions`, `/gestion/publicites`, `/gestion/publicites/nouvelle`, `/gestion/publicites/[id]`, `/gestion/messages`, `/gestion/messages/[membre]` |
| Composants | `lib/components/contact/{CarteContact,ACompleter}`, `lib/components/messages/{FilMessages,FormulaireMessage,Presence}`, `lib/components/publicites/{EncartPublicites,CartePublicite,MediaPublicite,DevenirAnnonceur,FormulairePublicite,FiltresPublicites,ListePublicitesGestion}` |
| Serveur | `lib/server/contact.ts` (`exigerGestionnaire`, `dureeSaisie`, filtres d'URL), `lib/server/publicites.ts` (`chargerEncart`, `enregistrerPublicite`), `lib/server/messages.ts` (`actionEnvoyer`) |
| Types | `lib/types/{contact,publicites,messages}.ts` |

## Endpoints (`/api`)

| Méthode et chemin | Accès | Rôle |
|---|---|---|
| `POST /contact` | tous | Envoi (visiteur : nom ≥ 5, e-mail, objet ≥ 5, texte ≥ 10, téléphone facultatif ; membre : nom et e-mail du profil). Champ piège `site_web` + `duree_saisie_ms` ≥ 3 s, anti-doublon objet + texte, 5 messages / 24 h par e-mail (10 par membre) |
| `GET /contact` | connecté | Gestionnaire : tous (`q`, `membre_id`, `etat`) ; autre connecté, Master compris : les siens |
| `GET /contact/compteurs`, `GET /contact/expediteurs` | gestionnaire | Nombre à traiter ; options du filtre « Membre » |
| `GET /contact/{id}` | gestionnaire ou expéditeur | Détail (`peut_repondre`) |
| `POST /contact/{id}/reponse` | gestionnaire | Enregistre la réponse, passe « Traité », prévient le membre dans sa messagerie, **puis** envoie l'e-mail (`BackgroundTasks`) |
| `POST /contact/{id}/etat` | gestionnaire | 1 à traiter, 2 traité, 3 supprimé |
| `POST /suggestions` | connecté | Module 0 à 8, texte ≥ 10, anonyme, anti-doublon module + texte |
| `GET /suggestions`, `GET /suggestions/compteurs`, `POST /suggestions/{id}/etat` | gestionnaire | Liste (`module`, `q`, `etat`), compteurs, suivi |
| `GET /publicites/diffusion?limite=&exclure=` | public | Au plus `limite` (10 par défaut, 50 max) publicités actives de la période, ordre aléatoire ; ne compte pas de vue |
| `GET /publicites/{id}` | public si en diffusion ; gestionnaire et demandeur toujours | Détail ; +1 vue et date de dernière vue pour un tiers (pas pour les robots d'indexation) |
| `GET /publicites` | connecté | Gestionnaire : toutes (`q`, `demandeur_id`, `entreprise_id`, `debut_du/au`, `fin_du/au`, `vues_min/max`, `etat`, `en_diffusion`) ; autre membre : celles dont il est demandeur |
| `GET /publicites/choix` | gestionnaire | Options demandeurs et entreprises |
| `POST /publicites`, `PUT /publicites/{id}` | gestionnaire | Création (référence `PUB…`, état 1, sauf droit Activation qui choisit l'état) et modification |
| `POST /publicites/{id}/fichier` | gestionnaire | Fichier conforme au format déclaré (image, MP3, MP4) via `services/fichiers.enregistrer` |
| `POST /publicites/{id}/etat`, `DELETE /publicites/{id}` | droit Activation | Mise en ligne, suppression logique |
| `GET /messages`, `POST /messages` | membre (pas gestionnaire) | Son fil (réponses reçues marquées lues à l'ouverture) et `frangine_en_ligne` ; envoi (texte obligatoire) |
| `GET /messages/fils?q=&tous=` | gestionnaire | Membres ayant un fil (non lus d'abord), nombre de non-lus, dernier message, présence ; `tous=true` ajoute les membres sans fil |
| `GET /messages/fils/{membre}`, `POST /messages/fils/{membre}` | gestionnaire | Ouvre le fil (messages du membre marqués lus) ; répond |

## Correspondance avec la checklist

| Points | Couverture |
|---|---|
| F-TRV-33, F-TRV-34 | `/aide` : texte `parametre.texte_aide` rendu par `routes/aide/texte-aide.ts` (tout est échappé, seules `strong b em i u ul ol li p br` sans attribut sont rétablies, sauts de ligne conservés). Accessible par « Comment ça marche ? » (en-tête) et « Aide » (pied de page) au lieu d'un dépliant |
| F-TRV-35 à F-TRV-42 | Contact : règles, préremplissage membre, doublon, listes, réponse enregistrée puis envoyée, états |
| F-TRV-43 à F-TRV-47 | `EncartPublicites` + `chargerEncart()`, `/publicites`, `/publicites/[id]`, `<audio>` et `<video>` HTML5, vues, visuel selon le vrai type de fichier |
| F-TRV-48 à F-TRV-55 | `/espace/messages`, `/gestion/messages[/membre]` : fil daté, bulles, Envoyer, Actualiser (et actualisation automatique toutes les 30 s), présence, marquage lu, erreur de message vide affichée, réponses de tous les gestionnaires |
| F-TRV-59 à F-TRV-63 | `/suggestion`, `/gestion/suggestions` |
| F-ADM-34 à F-ADM-38 | `/gestion/publicites` (filtres, vue tableau ou cartes), `/nouvelle`, `/[id]` |

## Écarts et décisions (à reporter dans un ADR)

1. **Contact : état initial « Non traité » (1)** au lieu de 2 dans le legacy : l'état sert de file d'attente (libellés « À traiter », « Traité », « Supprimé ») ; une réponse passe le message à « Traité ». Changement d'état ouvert à tout gestionnaire (suivi, pas modération).
2. **Contact : visiteurs sans compte** : `membre_id` NULL (le legacy utilisait le membre n° 1 « Aucun » ; les messages repris gardent ce rattachement).
3. **Contact : membre sans e-mail** : il peut en saisir un ou s'en passer ; la réponse est alors lue dans « Mes messages » (page Contact) et signalée dans sa messagerie.
4. **Contact : limitation de débit** par e-mail ou par membre sur 24 h (5 et 10), faute d'adresse IP stockée dans `contact` (aucune colonne ajoutée).
5. **E-mail de réponse en texte brut UTF-8**, pas en HTML (`services/emails.envoyer`) ; `Reply-To` = e-mail du site (`parametre.email`).
6. **Suggestions** : état initial 1 (« À lire ») au lieu de 2 ; liste la plus récente d'abord (le legacy triait par date croissante).
7. **Publicités** : l'entreprise reste obligatoire (comme le legacy) ; le demandeur peut être un gestionnaire ou un membre ; création et modification par tout gestionnaire, état et suppression avec le droit Activation. Le fichier doit correspondre au format déclaré ; l'affichage suit le type réel du fichier. Le texte legacy (HTML saisi à la main) est affiché sans balises (`texte_affiche`). Un membre demandeur voit ses publicités et leurs vues sur `/publicites`.
8. **Vues des publicités** : pas comptées pour les gestionnaires, le demandeur ni les robots ; le préchargement au survol est désactivé sur les liens vers une publicité.
9. **Pas de lecture automatique** audio ou vidéo (ADR-0008), contrairement au legacy.
10. **Messagerie** : l'identité du gestionnaire qui répond n'est visible que des gestionnaires ; le membre voit « Votre frangine ». Un gestionnaire peut écrire en premier à n'importe quel membre (`tous=true`).
11. **Taille des fichiers** : limite commune de 4 Mo (`LF_UPLOAD_MAX_OCTETS`), souvent trop faible pour une vidéo : à relever si des publicités vidéo sont vendues.
12. **Pages légales** : les informations inconnues sont marquées `[À compléter : …]` (composant `ACompleter`) : raison sociale, RCCM, NIU, capital et directeur de publication de Primera-C, hébergeur, autorité de protection des données, durées de conservation à valider, circulation des fonds Likelemba et épargne (ADR-0009), remboursements.

Aucune colonne ajoutée aux modèles `Contact`, `Suggestion`, `Publicite` et `Message`.

## Besoins sur des fichiers partagés

- En-tête (`layout/EnTete.svelte`, menu membre et tiroir mobile) : lien « Mes messages » vers `/espace/messages` avec le compteur `data.compteurs.messages_non_lus` et la pastille `frangine_en_ligne`.
- `routes/sitemap.xml` : ajouter `/publicites`, `/suggestion`, `/mentions-legales`, `/confidentialite` et `/conditions` aux pages fixes.
- `lib/server/redirections.ts` : `incl-affichpub.php?ipub=N` pourrait viser `/publicites/N` ; `psugest.php` → `/suggestion`.
- Accueil et pages Emplois (F-TRV-43) : afficher `EncartPublicites` à partir de `chargerEncart(event)`.
- Tableau de bord `/gestion` : les compteurs `GET /contact/compteurs` et `GET /suggestions/compteurs` sont disponibles.
