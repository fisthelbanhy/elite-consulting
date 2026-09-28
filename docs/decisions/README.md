# Registre des décisions (ADR)

Chaque choix structurant de la refonte est consigné ici, au format ADR court
(*Architecture Decision Record*) : contexte → décision → conséquences.
Une décision n'est jamais supprimée : si elle change, on écrit un nouvel ADR qui la
remplace et on marque l'ancien « Remplacé par ADR-XXXX ».

| N° | Titre | Statut | Date |
|---|---|---|---|
| [0001](0001-stack-technique.md) | Stack technique : SvelteKit 2 / Svelte 5 + FastAPI | Accepté | 2026-09-22 |
| [0002](0002-architecture-bff-et-authentification.md) | Architecture BFF et authentification par session | Accepté | 2026-09-22 |
| [0003](0003-modele-de-donnees.md) | Modèle de données et reprise des données legacy | Accepté | 2026-09-22 |
| [0004](0004-regles-metier-et-bugs-legacy.md) | Règles métier conservées, bugs legacy corrigés | Accepté | 2026-09-22 |
| [0005](0005-securite.md) | Sécurité (mots de passe, anti-robot, fichiers, droits) | Accepté | 2026-09-22 |
| [0006](0006-paiements.md) | Paiements : confirmation manuelle, prêt pour un agrégateur | Accepté | 2026-09-22 |
| [0007](0007-arbitrages-inventaire-fonctionnel.md) | Arbitrages issus de l'inventaire fonctionnel (483 points) | Accepté | 2026-09-22 |
| [0008](0008-positionnement-architecture-information-design.md) | Positionnement, architecture de l'information, système de design | Accepté | 2026-09-22 |
| [0009](0009-fonctionnalites-a-risque-reglementaire.md) | Fonctionnalités à risque réglementaire : conservées, encadrées, désactivables | Accepté (à valider juridiquement) | 2026-09-22 |
| [0010](0010-connexion-par-code-et-agregateur-paiement.md) | Connexion par code (OTP) et agrégateur de paiement : préparés, activés plus tard | Accepté | 2026-09-22 |
| [0011](0011-decisions-des-modules-et-de-l-integration.md) | Décisions prises pendant la construction des modules et l'intégration | Accepté | 2026-09-22 |
| [0012](0012-depot-github-et-environnement-cloud.md) | Dépôt GitHub privé, données de démonstration, environnement cloud | Accepté | 2026-09-26 |
| [0013](0013-backend-express-et-processus-unique.md) | Backend Express.js / TypeScript, déployé en un seul processus Node | Accepté | 2026-09-28 |
