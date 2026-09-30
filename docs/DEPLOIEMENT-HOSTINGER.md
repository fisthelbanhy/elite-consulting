# Déploiement Hostinger

L’application Express sert son API et le frontend SvelteKit dans un seul processus.

## Fabriquer l’archive à téléverser

```bash
npm run build     # api/dist et frontend/build
npm run paquet    # elite-consulting-hostinger.zip
```

`npm run paquet` (script `scripts/paquet.mjs`) assemble l’arborescence complète — sources, code
compilé, migrations, documentation, `api/.env.example` — **sans** `node_modules` (les binaires
natifs de Windows ne tourneraient pas chez l’hébergeur) et sans rien de ce qui ne doit pas sortir
du poste : dump legacy, `site.txt`, code PHP de l’ancien site, fichiers `.env` réels.

Les données de production sont placées dans un dossier **`donnees-production/`** distinct (base
SQLite, `media/`, rapport de reprise et marche à suivre), et non dans `api/data` qu’un
redéploiement écraserait. Le script refuse de travailler si un journal WAL traîne à côté de la
base : il faut arrêter le serveur local d’abord, sinon l’archive emporterait une base incomplète.

`npm run paquet -- sans-donnees` produit la même archive sans les données — c’est la seule
version qui puisse circuler, l’autre contenant les données personnelles des membres.

## Paramètres de déploiement

- Node.js 24.x
- Racine : dossier contenant package.json, server.mjs, api/ et frontend/
- Installation : `npm install` ; ne pas utiliser `npm ci` à la racine
- Compilation : `npm run build`
- Démarrage : `npm start`, point d’entrée `server.mjs`
- Conserver l’arborescence entière côté serveur, y compris `api/dist`, `frontend/build` et `api/migrations`.

Le script `postinstall` installe l’API avec npm install, sans s’appuyer sur son ancien package-lock, et le frontend depuis son verrou. Le projet épingle maintenant `better-sqlite3` en version 12.10, qui lance d’abord l’installation d’un binaire précompilé et prend en charge Node 24. La version 13 déclenchait directement `node-gyp`, impossible à exécuter sur l’environnement Hostinger fourni sans Python. La première compilation est donc corrigée à partir des journaux fournis. Garder les scripts npm activés ; l’installation de la bibliothèque native doit récupérer le binaire Linux. Ne pas téléverser les `node_modules` Windows.

## Variables à saisir dans Hostinger

Reporter les valeurs de `api/.env.example`, en remplaçant les exemples. Définir `LF_SITE_URL` à l’origine HTTPS réelle (sans chemin ni barre finale), `LF_ENVIRONNEMENT=prod`, `LF_SERVIR_SITE=1` et un `LF_COOKIE_SECRET` aléatoire de 32 octets, stable entre les redéploiements. Laisser Hostinger définir `PORT` et laisser l’application calculer `BACKEND_URL`. Supprimer dans Hostinger toute ancienne valeur `ORIGIN` ou `BACKEND_URL`. Configurer les paramètres SMTP pour l’envoi d’e-mails.

## Persistance SQLite et médias

L’application utilise SQLite, pas MySQL. Faire confirmer par Hostinger un emplacement persistant hors du répertoire de version et de `public_html`, accessible en écriture par Node. Y placer le fichier désigné par `LF_DATABASE_URL` et le dossier `LF_MEDIA_DIR`. Les chemins de `api/.env.example` sont des exemples, pas des chemins garantis par Hostinger. Si le forfait n’offre aucun stockage persistant adapté, utiliser un VPS ou porter l’application vers une base et un stockage externes. Les migrations de schéma sont appliquées au démarrage ; sauvegarder la base et les médias avant les migrations. Ne pas exécuter `npm run setup` ou `donnees:demo` en production.

**Les données sont fournies dans l’archive**, dans `donnees-production/` : base complète (68 membres, 11 548 lignes) et 49 fichiers médias repris de l’ancien site. Les copier à l’emplacement persistant **avant le premier `npm start`** — la marche à suivre détaillée est dans `donnees-production/LISEZ-MOI.md` (également versionnée : [LISEZ-MOI-donnees-production.md](LISEZ-MOI-donnees-production.md)). Si l’application démarre avant, elle crée une base vide à l’emplacement configuré : arrêter le processus, remplacer le fichier, redémarrer.

## Vérifications après publication

Tester `/api/sante`, l’accueil, la connexion, un formulaire, l’envoi d’e-mail et le téléversement. Après un redéploiement, vérifier que les données et médias sont toujours présents.

La compilation de l’API et le démarrage local de l’API ont réussi. La compilation Vite du frontend n’a pas pu être vérifiée dans cet environnement Windows (`spawn EPERM`). Le déploiement lui-même et le binaire Linux Hostinger restent à confirmer.
