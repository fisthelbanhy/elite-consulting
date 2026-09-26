# ADR-0004 — Règles métier conservées, bugs legacy corrigés

- **Statut** : Accepté — 2026-09-22 (complété au fil de l'inventaire fonctionnel)

## Principe

**Toute règle métier observable est conservée à l'identique ; tout défaut technique est corrigé.**
Critère : si un membre ou un gestionnaire peut s'appuyer sur le comportement (un montant, un
seuil, un code, un droit), c'est une règle ; si le comportement corrompt des données ou affiche
une information fausse, c'est un bug.

## Règles métier conservées telles quelles

| Règle | Source legacy |
|---|---|
| Retrait carte de pointage refusé s'il dépasse 97 % du solde (rétention 3 %), message legacy conservé | `incl-pointcaisse.php` |
| Code PIN à 4 chiffres obligatoire pour toute opération de carte de pointage | idem |
| Mouvement de carte répercuté sur le solde de l'opérateur (modèle « agent ») | idem |
| Anti-doublon : même jour + opération + membre + montant | idem |
| Totaux « promis »/« collecté » de l'appel de fonds calculés, jamais saisis (le circuit validation/versements n'existait qu'en code mort : voir ADR-0007 S4a) | `incl-apportfond.php` |
| Cohérence du plan de financement : besoin ≤ devis − apport, devis ≥ 10 001 | `incl-appelfond.php` |
| Formats de références et codes Likelemba (voir ADR-0003) | `incl-variable.php` |
| Validation des numéros de téléphone : 9 chiffres, préfixes 01/04/05/06/22 | `phone()` |
| Code Charden Farell : 13 caractères, lettres majuscules en positions 6 et 13 | `codecharden()` |
| Seuils de souscription distributeur : fond propre ≥ 56 000 FCFA, crédit 56 000–66 000 FCFA | `incl-adhesion.php` |
| Don ≥ 100 FCFA ; placement ≥ `parametre.montant_minimum_placement` ; durée 12–120 mois | `incl-fondsoutien.php` |
| Course : montant ≥ seuil paramétré, frais de service = commission paramétrée, dates non passées, livraison ≥ achat | `incl-course.php` |
| Stock insuffisant ⇒ paiement du panier bloqué | `incl-venteproduit.php` |
| Inscription publique toujours en type « Membre » (impossible de s'auto-déclarer gestionnaire) | `incl-membre.php` |
| Seul l'état « Supprimé » bloque la connexion d'un membre | `incl-connex.php` |
| Une seule fiche par membre : Business Plan, Découverte de soi, Réussite, Souscription distributeur | modules concernés |
| Code d'objet payé 4 = Course (index vide de `$arraytypepnr` mais utilisé par le paiement de course ; l'inventaire a montré que `panier.typepnr = 4` n'est en fait jamais écrit) | `incl-course-1.php` |

## Bugs legacy corrigés (ne pas réintroduire)

| Bug | Correction |
|---|---|
| Mots de passe stockés et **réaffichés en clair** (« mot de passe oublié ») | Hachage Argon2 + réinitialisation par lien (ADR-0005) |
| `appelfond` : mail et adresse du promoteur inversés à la création | Mapping correct ; données reprises auditées |
| `acompbusinesplan`/`acompprojetagricol` : zones 44 et 53 écrasées à la modification | Réponses stockées par numéro de zone (JSON), plus d'index croisé |
| `immobilier.surfaceimb` en `tinyint` (max 255) alors que l'UI accepte 0–2000 m² | Entier standard |
| `soungangai` zone 26 : la liste déroulante réaffichait la valeur de la zone 24 | Chaque champ affiche sa propre valeur |
| Message « famille de maladie » sur l'écran des familles d'articles ; « marché déjà enregistré » sur l'écran projets | Libellés corrigés |
| `souscriptoportuniteaffaire.referencesoa` jamais renseignée | Référence générée comme partout ailleurs |
| Dates en `varchar` | Vrais `DATETIME` |
| Vidéo publicitaire servie en `<object>` Windows Media | `<video>` HTML5 |
| Injection SQL possible partout (requêtes concaténées) | ORM paramétré |

## Trous fonctionnels tranchés

- **Annulation tardive d'une promesse d'apport** (état 2 → 3 après versements) : le legacy
  retirait tout le montant promis du total « promis » mais laissait les versements dans
  « collecté », si bien que « collecté » pouvait dépasser « promis ».
  **Décision** : on retire du total « promis » uniquement la part **non encore versée** ; les
  versements déjà reçus restent comptés comme collectés (l'argent a réellement été perçu).
  Ainsi « promis ≥ collecté » reste toujours vrai.
- **Boutons « Sauvegarder » / « Envoyer » du Business Plan** (même traitement en legacy) :
  « Sauvegarder » garde la fiche en brouillon (état 1 Non traité), « Envoyer » la soumet au
  conseiller (état 2) — la distinction que l'interface suggérait est enfin réelle.
