# Données de production — à installer hors du dossier de version

Ce dossier contient les **vraies données** du site, reprises du dump legacy le 30/09/2026 :

| Élément | Contenu |
|---|---|
| `lafrangine.sqlite3` | La base complète : 68 membres, 130 produits, Likelemba, appels de fonds, marchés, messages… (11 548 lignes) |
| `media/` | 49 fichiers repris de l'ancien site : photos de membres, de produits, publicités |
| `rapport-reprise.md` | Ce que la reprise a chargé, écarté et corrigé — à lire une fois |

> ⚠️ **Données personnelles.** La base contient les noms, téléphones, e-mails et adresses des
> membres. Ce dossier ne doit jamais être publié, versionné, ni transmis en dehors de
> l'hébergement. Les mots de passe, eux, sont hachés (Argon2) : ils ne sont plus lisibles, et
> chaque membre garde celui qu'il utilisait sur l'ancien site.

## Où les placer

**Pas dans le dossier de l'application.** Un redéploiement remplace ce dossier : la base et les
photos seraient perdues. Elles vont à l'emplacement persistant confirmé par l'hébergeur, celui que
désignent `LF_DATABASE_URL` et `LF_MEDIA_DIR` (voir `api/.env.example` et
`docs/DEPLOIEMENT-HOSTINGER.md`).

Par exemple, si vous avez défini :

```
LF_DATABASE_URL=sqlite:////home/VOTRE-COMPTE/lafrangine/data/lafrangine.sqlite3
LF_MEDIA_DIR=/home/VOTRE-COMPTE/lafrangine/media
```

alors, sur le serveur :

```bash
mkdir -p /home/VOTRE-COMPTE/lafrangine/data
cp lafrangine.sqlite3 /home/VOTRE-COMPTE/lafrangine/data/
cp -r media/. /home/VOTRE-COMPTE/lafrangine/media/
```

Le compte qui fait tourner Node doit pouvoir **écrire** dans ces deux emplacements : SQLite crée
un journal à côté du fichier de base, et les membres téléversent des photos dans `media/`.

## Ordre des opérations

1. Téléverser l'archive, saisir les variables d'environnement, `npm install` puis `npm run build`.
2. **Copier ces données** à leur emplacement persistant (ci-dessus).
3. `npm start`. Les migrations en attente sont appliquées au démarrage.
4. Vérifier `/api/sante`, l'accueil, la connexion d'un membre, l'affichage d'une photo de produit.

Si vous démarrez avant l'étape 2, l'application crée une base **vide** à l'emplacement configuré.
Il suffit alors d'arrêter le processus, de remplacer le fichier par celui-ci, et de redémarrer.

## Sauvegardes

Ces deux éléments sont tout ce qui ne se régénère pas. Le reste (code, dépendances, compilation)
se reconstruit depuis l'archive. Sauvegardez donc régulièrement le fichier `.sqlite3` **et** le
dossier `media/`, et toujours avant une mise à jour qui applique des migrations.
