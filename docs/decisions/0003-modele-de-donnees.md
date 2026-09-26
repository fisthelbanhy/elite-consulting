# ADR-0003 — Modèle de données et reprise des données legacy

- **Statut** : Accepté — 2026-09-22

## Contexte

Le dump `cp1019011_lafrangine.sql` (MariaDB 11.4, export du 03/09/2026) contient 65 tables aux
colonnes cryptiques (`nomprenmbr`, `zone07sga`…), **aucune clé étrangère déclarée**, des dates
stockées en `varchar` (`course1.datecrs1`, `contact.datectt`), des valeurs `0` à la place de `NULL`,
et des mots de passe en clair. Comptage réel des lignes (script `count_rows.py`) : 47 tables ont
des données ; `acomp*` (4), `benchmarking1/2/3`, `adhesion`, `aide`, `client`, `fonction`,
`membreoportuniteaffaire`, `produitoportuniteaffaire`, `souscriptoportuniteaffaire`,
`mouvcollectefond`, `reussite`, `suggestion`, `articlecourse` **existent mais sont vides**
(l'ancien document affirmait à tort que certaines n'existaient pas).

## Décisions

1. **Noms métier français lisibles** en `snake_case` pour tables et colonnes (ex. `membre.nom_ou_raison_sociale`),
   d'après les dictionnaires `docs/data-dictionary-*.md`. Le code se lit sans table de correspondance ;
   la correspondance legacy → nouveau vit uniquement dans le script de reprise.
2. **Clés primaires legacy conservées** (`indexmbr` → `membre.id`, etc.) : les références déjà
   communiquées aux membres et les liens restent cohérents, pas de table de correspondance.
3. **Vraies clés étrangères** déclarées partout ; les `0` legacy deviennent `NULL`.
   Les lignes dont la référence pointe vers un enregistrement inexistant dans le dump sont
   écartées et journalisées par le script de reprise (intégrité déjà rompue à la source).
4. **Pas de suppression physique** (comme le legacy) : l'état `Supprimé` (3) sert de corbeille.
   Exceptions reprises telles quelles : lignes de panier et lignes du comparateur de prix.
5. **Énumérations** : chaque `$arrayXXX` de `incl-variable.php` devient une `IntEnum` Python
   (valeurs numériques identiques au legacy) exposée au frontend avec ses libellés via
   `GET /api/referentiels/enums`.
6. **Références métier** (`DEI112117`, `ALF111217`…) : même algorithme que `fonctreference()` —
   `PRÉFIXE + mois(2) + compteur global + année(2)` — avec le compteur global conservé dans
   `parametre.compteur_reference` (repris de `numreferencepmt`). Codes Likelemba identiques
   (`LKB…`, `{n}LKB…`, `LKB…P{n}`). Incrément atomique en base.
7. **Questionnaires longs** :
   - les 4 dossiers d'accompagnement (`acompbusinesplan`, `acompprojetagricol`,
     `acomprestructcredit`, `acompcreditimmobil`, 40 à 80 zones texte chacun, 0 ligne en production)
     sont fusionnés en **une table `dossier_accompagnement`** (type 1-4 + réponses JSON indexées par
     numéro de zone). Les libellés des questions restent dans le code (fidèles à `$arrayaccomp*2`) ;
   - `souscription_opportunite` : formations (4) et filleuls (3) stockés en JSON (listes d'objets).
   - Les questionnaires à sens métier fort (`soungangai`, `businessplan`, `reussite`,
     `contentcredit`) gardent des colonnes typées nommées.
8. **Forums** (`conseil`, `conseilfinance`) : sujet et réponses restent dans la même table,
   mais la réponse pointe vers son sujet par `sujet_id` (au lieu du regroupement implicite par
   `referencecsl`).
9. **Tables vestigiales non reprises** : `aide`, `client`, `fonction` (vestiges d'un modèle
   hôtelier, 0 ligne, aucun code actif) et `adhesion` (0 ligne, aucune requête active — le vrai
   parcours d'adhésion est `souscriptoportuniteaffaire`). La colonne `membre.indexahn` est abandonnée.
10. **Fichiers** : le legacy déduisait le chemin du fichier de l'identifiant (`mbr{id}.jpg`,
    `cv{id}.pdf`, `pub{id}.mp4`…). La nouvelle base stocke explicitement le chemin
    (`photo`, `cv`, `fichier`) ; le script de reprise copie les fichiers existants de
    `lafrangine/V04/image/ig/` vers `backend/media/`.
11. **Dates** : `varchar` legacy (`YmdHis`) convertis en vrais `DATETIME` ; `0000-00-00` → `NULL`.
12. **Montants** en `BigInteger` (FCFA, pas de décimales) ; taux de placement en `Float`.
13. **Schéma versionné par Alembic** ; SQLite en dev, PostgreSQL en prod.

## Conséquences

- Le script `backend/scripts/reprise_legacy.py` est la seule pièce qui connaît les noms legacy ;
  il est ré-exécutable (base vidée puis rechargée) et produit un rapport de reprise.
- Les mots de passe sont hachés lors de la reprise (voir ADR-0005).
