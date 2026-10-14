# ADR-0015 — Moteur de base : SQLite conservé, MySQL conditionné au stockage persistant

- **Statut** : Accepté — 2026-10-14
- **Complète** : [ADR-0013](0013-pile-technique-et-processus-unique.md) (SQLite, un seul processus)
  et [ADR-0014](0014-bascule-du-depot-vers-la-pile-express.md) (bascule du dépôt).

## Contexte

Le premier déploiement chez Hostinger a mené à la question : faut-il passer à MySQL ? L'assistance
de l'hébergeur le recommandait, au motif que MySQL est « mieux adapté aux accès simultanés » et
administrable depuis phpMyAdmin.

Cet argument ne décrit pas cette application. La base porte **68 membres et 11 548 lignes**, avec
une poignée d'utilisateurs simultanés et une écrasante majorité de lectures. SQLite y suffit
largement ; c'est le raisonnement de l'ADR-0013, et rien dans l'exploitation ne l'a démenti.

Le vrai problème est ailleurs, et il est de nature différente : **l'application a-t-elle un
emplacement de fichiers accessible en écriture qui survit aux redéploiements ?** Sans variables
d'environnement, la base et les médias atterrissent dans `api/data` et `api/media`, à l'intérieur
du répertoire de version — que chaque déploiement remplace.

## Coût réel d'une migration, mesuré

L'estimation initiale (« une journée ») était fausse : elle ne comptait que les tables. Le relevé
exact :

| Élément | Mesure |
|---|---|
| Tables à redéclarer (`sqliteTable` → `mysqlTable`) | 62, dans 10 fichiers |
| Fichiers important le dialecte SQLite | 20 |
| **Appels synchrones au pilote** (`.get()`, `.all()`, `.run()`) | **669, dans 54 fichiers** |

Le dernier point est décisif. `better-sqlite3` est **synchrone** ; aucun pilote MySQL pour Node ne
l'est. Chaque appel doit devenir asynchrone, et l'asynchronisme remonte en cascade dans toutes les
fonctions appelantes. S'y ajoute la suite de tests : les 211 tests tournent aujourd'hui sur une
base **en mémoire**, une par fichier, en 25 secondes ; avec MySQL il faut une vraie base par
fichier, créée et nettoyée. Comptez plusieurs jours, avec un risque de régression sur des règles
métier déjà validées.

**Et cela ne réglerait que la moitié du problème** : les photos des fiches et les téléversements
des membres vivent sur le disque, pas en base. Sans emplacement persistant, ils disparaissent à
chaque déploiement, MySQL ou non.

## Décision

1. **SQLite est conservé.** La migration n'est pas engagée sur la foi d'un argument de performance
   qui ne s'applique pas à cette charge.
2. **Le critère qui tranche est le stockage persistant**, pas le moteur. La question est posée à
   l'hébergeur dans ces termes : *« Mon application Node.js doit écrire des fichiers qui persistent
   entre les déploiements. Quel chemin absolu puis-je utiliser, hors du répertoire de version et de
   `public_html` ? »*
   - **Un chemin existe** → `LF_DATABASE_URL` et `LF_MEDIA_DIR` y pointent, rien à migrer.
   - **Aucun chemin** → SQLite est inutilisable là-bas. Deux issues : un hébergement avec un vrai
     disque (VPS), qui ne coûte aucune ligne de code et respecte l'ADR-0013 ; ou la migration vers
     MySQL, qui reste à faire pour les médias.
3. **Le terrain est préparé sans être engagé.** `docker-compose.yml` fournit un MySQL 8.4 local
   identique à celui d'un hébergeur, démarré par `docker compose up -d`. Le pilote `mysql2` n'est
   **pas** dans les dépendances : il partirait en production sans servir. Le jour où la migration
   est décidée, l'environnement est prêt.

## Conséquences

- Aucun changement de code, donc aucun risque introduit, tant que la question n'a pas de réponse.
- Le diagnostic `npm run verifier:production <url>` dit en une commande ce qui manque à un
  déploiement : base vide, médias absents, site qui n'atteint pas l'API, formulaires rejetés.
  Il a été éprouvé dans les deux sens — silencieux sur un déploiement sain, et nommant exactement
  les deux blocages du déploiement réel.
- Si la migration est un jour engagée, cet ADR est remplacé par celui qui la décide, et le relevé
  ci-dessus en donne le périmètre exact.

## Note sur l'argument de l'hébergeur

« Aucune base MySQL associée à ce compte » décrivait une absence normale, pas une panne :
l'application n'en a jamais demandé. Il est utile de le noter, parce que le même raisonnement
reviendra — un symptôme lu sans le contexte de l'application désigne rarement sa cause.
