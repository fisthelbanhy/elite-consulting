# Conventions de développement — La Frangine (SvelteKit + FastAPI)

> À lire avant de toucher au code. Le module **Emplois** est l'implémentation de référence :
> backend `backend/app/routers/emplois.py` + `backend/app/schemas/emplois.py` + `backend/tests/test_emplois.py`,
> frontend `frontend/src/routes/emplois/**`, `frontend/src/lib/components/emplois/*`,
> `frontend/src/lib/server/emplois.ts`, `frontend/src/lib/types/emplois.ts`.
> En cas de doute, faites comme lui.

## 1. Architecture (rappel)

```
Navigateur ──▶ SvelteKit (SSR + form actions, cookie httpOnly) ──▶ FastAPI /api/* ──▶ SQLAlchemy ──▶ SQLite/PostgreSQL
```

- ADR à respecter : `docs/decisions/` (surtout 0004 règles/bugs, 0005 sécurité, 0006 paiements,
  0007 arbitrages, 0008 design/IA, 0009 modules à risque).
- Spécifications fonctionnelles : `docs/inventaire/01..03-*.md` (écrans, formulaires, messages
  exacts, checklist `F-…`) ; sens des colonnes : `docs/data-dictionary-*.md` ; code legacy :
  `lafrangine/V04/prog/` (seul `prog/` fait foi, `prog-1/` est une vieille copie) — **présent
  seulement sur le poste local** : il contient les identifiants de la base de production et n'est
  pas dans le dépôt (ADR-0012). Les inventaires en citent tout ce qui est nécessaire.
- Lancer : `npm run dev` à la racine (API + site, `scripts/dev.mjs`), ou séparément
  `npm run dev:api`
  et `npm --prefix frontend run dev`. Documentation API : http://127.0.0.1:8000/api/docs.

## 2. Backend (FastAPI)

### Fichiers d'un module
- `app/routers/<module>.py` : routes ; se termine par `routers = [router]` (déjà enregistré dans
  `app/routers/__init__.py`, **ne pas modifier ce registre**).
- `app/schemas/<module>.py` : schémas Pydantic (entrée `XxxEntree`, sortie `XxxResume` / `XxxDetail`).
- `app/services/<module>.py` si la logique métier dépasse quelques lignes (machines à états, calculs).
- `tests/test_<module>.py` : tests pytest (fixtures dans `tests/conftest.py` :
  `client`, `creer_membre(identifiant, type_compte=…, droit_activation=True, …)`, `entetes(client, identifiant)`).
- Modèles : `app/models/*.py` existent déjà pour les 62 tables. Vous pouvez **ajouter** une
  colonne au(x) modèle(s) de votre domaine (avec `Edit`, jamais en réécrivant le fichier) ;
  signalez-le dans votre compte rendu. Ne lancez pas `scripts/reprise_legacy.py` (il recrée la
  base partagée) : mettez à jour son mapping si vous ajoutez une colonne alimentée par le legacy.

### Règles
- **Droits vérifiés côté serveur, toujours** (le legacy n'en vérifiait aucun) :
  - `MembreOpt` (lecture publique), `MembreReq` (connecté), `Gestionnaire` ;
  - `verifier_modification(membre, auteur_id)` : l'auteur ou un gestionnaire avec droit Activation ;
  - `exiger_droit(membre, "activation" | "caisse" | "attribution")`.
- Helpers de `app/services/fiches.py` : `visibilite()` (public = état 2 ; auteur = les siennes ;
  gestionnaire = tout), `obtenir()` (404 si non visible), `paginer()`, `recherche(q, *colonnes)`,
  `compter_visite()` (tiers seulement), `changer_etat()` (droit Activation), `supprimer()` (état 3).
- Listes : `GET /<module>?q=&page=&taille=&…` → `Liste[XxxResume]` (`items,total,page,taille`).
  Détail : champs de contexte `peut_modifier`, `peut_moderer`, et données privées mises à `None`
  pour les non-propriétaires (voir `_detail` d'emplois — **ne pas oublier** : `model_validate`
  recopie tous les attributs homonymes).
- Écritures : `POST /<module>` (201, `Ok(message, id, reference)`), `PUT /<module>/{id}`,
  `POST /<module>/{id}/etat` (`{"etat": n}`), `DELETE /<module>/{id}` (suppression logique),
  fichiers `POST /<module>/{id}/photo` (multipart, champ `fichier`) via `services/fichiers.enregistrer()`.
- Références : `nouvelle_reference(db, Prefixe.XXX)` (format legacy). Codes Likelemba :
  `code_adhesion_likelemba`, `numero_recu_likelemba`.
- Erreurs : `raise erreur("Message global.", champ="Message du champ.")` (400),
  `introuvable()`, `interdit()`. Messages en **français**, repris du legacy quand il en avait
  (« Enregistrement effectué. », « Modification effectuée. », « Cette fiche est déjà enregistrée. »…),
  orthographe corrigée.
- Intérêts (« besoin / intéressement ») : `services/interets.deposer()` (1 par membre et par fiche,
  notification de l'auteur).
- Paiements : déclarer un `Traitement` pour votre `TypeObjetPaye` dans votre service
  (`services/paiements.declarer(...)`) avec `libelle`, `montant`, `retour`, `verifier`,
  `enregistrer`, `confirmer`, `rejeter`. Le frontend envoie simplement le membre vers
  `/paiement/{type}?objet={id}`. Effets à l'**enregistrement**, annulés au **rejet** (ADR-0006/0007).
- Messagerie système : pour prévenir un membre, créer un `Message(membre_id=…, de_la_frangine=True, texte=…)`.
- E-mails : `services/emails.envoyer(destinataire, sujet, texte)` via `BackgroundTasks`.
- Montants en entiers FCFA ; dates ISO ; énumérations = `app/enums.py` (valeurs legacy).
- Qualité : `npm test -- tests/test_<module>.py` doit passer ;
  `npm run lint  # ou : node scripts/py.mjs -m ruff check app/routers/<module>.py`.

## 3. Frontend (SvelteKit 2 / Svelte 5)

### Fichiers d'un module
- Pages : `src/routes/<url>/…` (URL françaises de l'ADR-0008 : `/likelemba`, `/projets`, `/marches`…).
- Types : `src/lib/types/<module>.ts` (ne pas modifier `src/lib/types.ts`, sauf ajout isolé signalé).
- Logique serveur partagée entre pages : `src/lib/server/<module>.ts`.
- Composants propres au module : `src/lib/components/<module>/*.svelte`.
- **Ne pas modifier** les composants existants de `src/lib/components/ui/` ni `layout/`,
  `hooks.server.ts`, `+layout.*`, `lib/server/api.ts`, `lib/format.ts`, `lib/forms.ts`,
  `lib/navigation.ts` : s'il manque quelque chose, créez un nouveau fichier et signalez-le.

### Chargement et actions
```ts
// +page.server.ts
export const load: PageServerLoad = async (event) => {
  const liste = await charger<Liste<X>>(event, '/module', { q, page, taille: 20 }); // erreurs → page d'erreur / connexion
  const bonus = await chargerOuDefaut(event, '/module/compteurs', { n: 0 });        // bloc secondaire tolérant
  return { liste, bonus };
};
export const actions: Actions = {
  ...actionsModeration((p) => `/module/${p.id}`, '/module'),   // ?/etat et ?/supprimer
  default: async (event) => {
    const fd = await event.request.formData();
    const valeurs = lireFormulaire(fd, { titre: 'texte', montant: 'entier', ville_id: 'entier?', date: 'date?' });
    const r = await soumettre<Ok>(event, '/module', { body: valeurs, valeurs });
    if (!r.ok) return r.echec;                 // réaffiche le formulaire avec erreurs + valeurs
    redirect(303, `/module/${r.data.id}?enregistre=1`);
  }
};
```
- Pages réservées aux membres : `exigerConnexion(event)` dans `load`.
- Fichiers : `fichierJoint(fd, 'photo')` puis `televerser(event, '/module/{id}/photo', 'fichier', f)`.
- Plusieurs formulaires sur une page : passer `cle: 'xxx'` à `soumettre` et `cle="xxx"` à
  `<Formulaire>` / `champ(form, nom, initiale, 'xxx')`.

### Composants disponibles (`$lib/components/ui/`)
`Bouton` (variantes `principal` = latérite, **un seul par écran** ; `fleuve`, `secondaire`,
`fantome`, `whatsapp`, `danger`, `clair`), `Formulaire` (amélioration progressive, récapitulatif
d'erreurs), `Saisie`, `Zone`, `Liste` (options ou `groupes`), `Choix` (tuiles radio), `Case`,
`Fichier`, `Alerte`, `EnTetePage` (fil d'Ariane, surtitre, actions, snippet `bas` pour les
`Onglets`), `Onglets`, `Pagination`, `EtatVide` (avec `messageWhatsApp` = lead), `Avatar`,
`Jauge`, `Badge`, `BadgeEtat`, `PanneauModeration`. Aide : `champ(form, nom, initiale)` renvoie
`{name, value, erreur}` à étaler dans un champ.

### Formatage (`$lib/format`)
`fcfa()`, `entier()`, `date()`, `dateCourte()`, `dateHeure()`, `relatif()`, `age()`,
`libelle(enums, 'NomEnum', v)` (énumérations chargées dans `data.enums`), `telephone()`,
`lienWhatsApp(numero, message)`, `lienPartageWhatsApp(texte)`, `lienTel()`, `tronquer()`,
`pourcentage()`, `jsonLd(objet)` (à utiliser avec `{@html}` — jamais de JSON-LD fait main).

### Design, contenu, accessibilité (ADR-0008)
- Palette : `fleuve` (marque), `laterite` (CTA principal uniquement), `foret` (succès, WhatsApp),
  `soleil` (mise en valeur), `creme`/`sable` (fonds), `encre`/`ardoise` (textes), `alerte`.
  Classes utilitaires : `.conteneur`, `.carte`, `.lien`, `.montant`, `.pagne`.
- Titres `font-display` (Bricolage Grotesque) ; corps 17 px ; cibles tactiles ≥ 48 px ;
  libellés explicites (jamais un placeholder seul) ; icônes Lucide importées une par une
  (`import X from '@lucide/svelte/icons/x'`) et toujours accompagnées d'un texte.
- Français simple, ton chaleureux (« votre frangine »), montants « 5 000 FCFA ».
- Chaque page : `<svelte:head>` avec `<title>… — {data.parametres.nom_site}</title>` et
  `<meta name="description">` pour les pages publiques ; `noindex` pour formulaires et espaces privés.
- États vides = invitation (publier, être prévenu·e sur WhatsApp), jamais une page morte.
- Données personnelles : ne jamais afficher téléphone/e-mail d'un membre sauf aux personnes
  autorisées ; afficher le `pseudonyme` comme identité publique.
- Qualité : `npx svelte-check --tsconfig ./tsconfig.json` (dans `frontend/`) sans erreur sur vos fichiers.

## 4. Travail en parallèle
- Chaque domaine possède ses fichiers ; ne modifiez pas ceux d'un autre domaine.
- N'utilisez pas le navigateur intégré (partagé) : vérifiez par pytest, `svelte-check`, et au
  besoin des requêtes HTTP (`curl`) sur les serveurs locaux s'ils tournent.
- Compte rendu final : fichiers créés/modifiés, points de checklist couverts (`F-…`), écarts
  assumés, colonnes ajoutées, et tout besoin sur un fichier partagé.
