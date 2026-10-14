# Mise en production (Hostinger)

L'application Express sert son API et le site SvelteKit dans **un seul processus** (ADR-0013).

> **La question à régler d'abord.** Posez-la à l'assistance avant tout le reste :
> *« Mon application Node.js doit écrire des fichiers qui persistent entre les déploiements. Quel
> chemin absolu puis-je utiliser, hors du répertoire de version et de `public_html` ? »*
>
> - **Un chemin existe** → suivez ce guide tel quel.
> - **Aucun chemin** → ni la base ni les photos ne survivront à une mise à jour. Changez
>   d'hébergement (un VPS suffit, aucun code à modifier) ou engagez la migration vers MySQL —
>   qui, elle, ne réglera pas les photos. Voir [ADR-0015](decisions/0015-moteur-de-base-et-stockage-persistant.md).

## 1. Fabriquer l'archive

```bash
npm run build     # api/dist et frontend/build
npm run paquet    # elite-consulting-hostinger.zip
```

`npm run paquet` assemble l'arborescence complète — sources, code compilé, migrations,
documentation, `api/.env.example` — **sans** `node_modules` (les binaires natifs de Windows ne
tourneraient pas chez l'hébergeur) et sans rien de ce qui ne doit pas sortir du poste : dump
legacy, `site.txt`, code PHP de l'ancien site, fichiers `.env` réels, binaires Windows.

Les données de production sont placées dans un dossier **`donnees-production/`** distinct, et non
dans `api/data` qu'un redéploiement écraserait. Le script refuse de travailler si un journal WAL
non vide traîne à côté de la base : arrêtez le serveur local d'abord.

`npm run paquet -- sans-donnees` produit la même archive sans les données — c'est la seule version
qui puisse circuler, l'autre contenant les données personnelles des membres.

## 2. Paramètres de déploiement

- Node.js 24.x · Répertoire root `./` · Entrée `server.mjs`
- Installation : `npm install` — **jamais `npm ci` à la racine**
- Compilation : `npm run build`
- Conserver l'arborescence entière, y compris `api/dist`, `frontend/build` et `api/migrations`

Le `postinstall` installe l'API avec `npm install` sans verrou — `better-sqlite3` est épinglé en
12.10, qui récupère un binaire précompilé et prend en charge Node 24 (la 13 déclenche `node-gyp`,
impossible sans Python sur cet environnement) — puis le site depuis son verrou. Garder les scripts
npm activés. Ne jamais téléverser de `node_modules` Windows.

## 3. Variables d'environnement

Sans elles, l'application tourne sur ses valeurs de développement : base et photos dans le
répertoire de version (effacées à chaque mise à jour) et formulaires rejetés. **Cinq sont
indispensables.**

| Variable | Valeur |
|---|---|
| `LF_SITE_URL` | l'adresse publique HTTPS réelle, **sans barre finale** |
| `LF_ENVIRONNEMENT` | `prod` |
| `LF_COOKIE_SECRET` | 32 octets aléatoires, **stables** entre déploiements |
| `LF_DATABASE_URL` | `sqlite:////chemin-persistant/data/lafrangine.sqlite3` |
| `LF_MEDIA_DIR` | `/chemin-persistant/media` |

Générer le secret :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

**`LF_DATABASE_URL` prend quatre barres obliques** : trois pour `sqlite:///`, plus celle du chemin
absolu Linux. Une de moins et le chemin devient relatif.

Ne définissez **ni** `BACKEND_URL`, **ni** `ORIGIN`, **ni** `LF_PORT` : l'application calcule les
deux premiers et l'hébergeur fournit `PORT`. Supprimez toute ancienne valeur.

Compléter `LF_SMTP_*` pour l'envoi réel des e-mails (sinon ils sont seulement journalisés).

Avec `LF_ENVIRONNEMENT=prod`, l'application **refuse de démarrer** si `LF_SITE_URL` est absente :
c'est voulu. Sans elle, SvelteKit rejetterait tous les envois de formulaire en 403, connexion
comprise, sans qu'aucune trace n'explique pourquoi. Un démarrage qui échoue vaut mieux qu'un site
qui semble marcher.

## 4. Installer les données — avant le premier démarrage

L'archive porte `donnees-production/` : la base complète (68 membres, 11 548 lignes), les 49
fichiers médias repris de l'ancien site, le rapport de reprise et une notice détaillée
([LISEZ-MOI-donnees-production.md](LISEZ-MOI-donnees-production.md)).

Application **arrêtée**, en adaptant les chemins à vos variables :

```bash
mkdir -p /chemin-persistant/data /chemin-persistant/media
cp donnees-production/lafrangine.sqlite3 /chemin-persistant/data/
cp -r donnees-production/media/. /chemin-persistant/media/
```

Le compte qui exécute Node doit pouvoir **écrire** dans ces deux emplacements : SQLite crée un
journal à côté du fichier, et les membres téléversent des photos.

Si l'application a déjà démarré, elle a créé une base **vide** à cet emplacement : arrêtez-la,
remplacez le fichier (en supprimant les `-wal` et `-shm` qui traînent), redémarrez.

> Cette copie est une opération de **premier démarrage**, pas une routine. La refaire à chaque
> déploiement écraserait les inscriptions, messages et photos arrivés entre-temps.

## 5. Vérifier

```bash
npm run verifier:production -- https://votre-domaine
```

Le diagnostic interroge le site déployé et nomme ce qui manque : application injoignable, domaine
servant l'hébergement statique, base vide, site qui n'atteint pas son API, photos absentes,
formulaires rejetés. Il distingue les points bloquants de ceux à surveiller, et sort en erreur
s'il reste un bloquant.

Lisez aussi le **journal de démarrage**. Il porte une ligne décisive :

```
  Site → API : aller-retour local vérifié (http://127.0.0.1:12345/api/sante).
```

Si elle signale un échec, le site ne pourra afficher aucune donnée ni accepter aucun formulaire,
alors que l'API interrogée de l'extérieur répondra parfaitement — le symptôme ne désigne pas sa
cause, d'où ce contrôle.

Enfin, à la main : l'accueil, la connexion d'un membre, un formulaire, l'affichage d'une photo.

## 6. Sauvegardes

Le fichier `.sqlite3` **et** le dossier des médias sont les deux seules choses qui ne se
reconstruisent pas : tout le reste repart de l'archive. Sauvegardez-les régulièrement, et toujours
avant une mise à jour qui applique des migrations (elles sont appliquées au démarrage).

Ne lancez jamais `npm run setup` ni `donnees:demo` en production.

## 7. Si la migration vers MySQL devient nécessaire

Un MySQL 8.4 local, identique à celui d'un hébergeur, est prêt :

```bash
docker compose up -d
```

Le pilote `mysql2` n'est volontairement pas dans les dépendances. Le périmètre exact du chantier —
62 tables, 669 appels synchrones à convertir, suite de tests à revoir — est relevé dans
l'[ADR-0015](decisions/0015-moteur-de-base-et-stockage-persistant.md).
