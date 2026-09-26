# ADR-0008 — Positionnement, architecture de l'information et système de design

- **Statut** : Accepté — 2026-09-22
- **Source** : [../analyse-marche-concurrence.md](../analyse-marche-concurrence.md) (§3, §4, §7)

## Contexte

Le legacy juxtaposait 7 sections de même poids, sans promesse claire ni appel à l'action :
68 membres en 10 ans. L'étude de marché recommande un positionnement unique, une navigation en
3 piliers et un parcours « valeur d'abord, compte ensuite, humain toujours ». La demande du
porteur impose de **ne perdre aucune fonctionnalité** : on réorganise, on ne supprime pas.

## Décisions

### 1. Positionnement

> **La Frangine — la grande sœur de ceux qui se lancent.**
> Un conseil humain, une Likelemba sans prise de tête et les bonnes opportunités au bon moment.

Cible cœur : micro-entrepreneur·es et commerçant·es (Brazzaville, Pointe-Noire), jeunes porteurs
de projet ; cible de monétisation : TPE/PME (offre Master/Pro).

### 2. Navigation : 3 piliers + boutique, toutes les sections legacy conservées

| Pilier | Pages (URL courtes, en français, bonnes pour le SEO) | Section legacy |
|---|---|---|
| **Se lancer** | `/diagnostic` (nouveau, public) · `/decouverte-de-soi` · `/business-plan` · `/accompagnement/*` · `/questions` (forum « Informations utiles ») · `/reussites` | S1-A, S1-B, S5-B, S7-A (accompagnement), S6 (réussites) |
| **Financer & épargner** | `/likelemba` · `/projets` (appels de fonds) · `/epargne` (don-placement, carte de pointage) · `/conseil-financier` · `/tresorerie/*` · `/tarifs-bancaires` | S4-A/B/C, S7-A/B/C |
| **Opportunités** | `/marches` (+ projets) · `/emplois` · `/immobilier` · `/annonces` · `/courses` · `/entreprises` · `/comparateur-prix` · `/partenariats` | S2, S3-A/B/C, S5-C, S6-A/B/C |
| **Boutique bien-être** | `/boutique` · `/bien-etre` (fiches) · `/devenir-distributeur` · `/panier` | S1-C, S5-A |
| Transverse | `/espace` (membre) · `/gestion` (back-office) · `/contact` · `/aide` · `/publicites` · pages légales | pied de page, `p*.php` |

Les anciennes URL (`/V04/prog/choixN.php?…`) sont redirigées (301) vers leur équivalent.

### 3. Conversion

- **CTA principal unique** : « Faire mon diagnostic gratuit » (3 min, sans compte). Le compte est
  proposé à la fin, pour « recevoir mon plan d'action » : le diagnostic alimente la fiche
  « Découverte de soi » et crée un message pour la conseillère.
- **CTA secondaire permanent** : « Écrire à une conseillère sur WhatsApp » (lien `wa.me` contextuel
  pré-rempli, numéro = `parametre.whatsapp`).
- **Inscription minimale** : personnalité, nom, téléphone, ville, mot de passe (+ identifiant
  facultatif, dérivé du téléphone). Pseudonyme, sexe, situation, pièce d'identité… sont demandés
  plus tard, dans le profil, quand ils deviennent utiles (barre de complétion). Voir ADR-0010
  pour la connexion par code (OTP). Le pseudonyme public est déduit du nom (« Grace M. », sigle
  pour une entreprise) et l'identifiant du téléphone s'ils ne sont pas saisis. La double saisie
  du mot de passe legacy est remplacée par un seul champ avec bouton « Afficher » (même objectif :
  éviter les fautes de frappe, un champ de moins).
- **Preuve sociale honnête** : uniquement des chiffres réels (`/api/referentiels/stats`) ; tant
  qu'ils sont faibles, on montre des histoires (Réussites) plutôt que des compteurs.
- **États vides transformés en leads** (« Soyez prévenu·e sur WhatsApp »).
- Pas de carrousel, pas de pop-up à l'arrivée, pas de vidéo en lecture automatique.

### 4. Système de design « Chaleur urbaine de Brazzaville »

| Token | Valeur | Usage |
|---|---|---|
| `fleuve` | `#1F3D63` | Couleur de marque (héritée du legacy), titres, navigation |
| `laterite` | `#C2410C` | **Bouton d'action principal uniquement**, prix |
| `foret` | `#1E7A5A` | Succès, badges « vérifié », WhatsApp |
| `soleil` | `#F2B632` | Mise en valeur, jamais du texte sur blanc |
| `creme` | `#FBF6EE` | Fond de page |
| `encre` | `#1B1F24` | Texte |
| `ardoise` | `#5B6470` | Texte secondaire |
| `alerte` | `#B42318` | Erreurs |

- Titres : **Bricolage Grotesque** auto-hébergée (`@fontsource-variable`), texte courant en pile
  système (0 Ko).
- Corps 17 px, cibles tactiles ≥ 48 px, contrastes WCAG 2.2 AA, montants en « 5 000 FCFA »
  (chiffres tabulaires).
- Motif récurrent : le **cercle** (Likelemba, communauté).
- Icônes Lucide en SVG inline, toujours accompagnées d'un libellé.
- Mobile : barre de navigation inférieure (Accueil · Se lancer · Financer · Opportunités · Moi).
- Budget de performance : accueil ≤ 500 Ko transférés, JS initial ≤ 100 Ko.

## Conséquences

- Aucune section legacy n'est retirée ; certaines changent de nom et de place (tableau §2).
- Les photos de stock du legacy (`slide_*.jpg`) ne sont pas réutilisées sur l'accueil : un
  shooting de vraies personnes est recommandé ; en attendant, illustrations SVG et motifs.
