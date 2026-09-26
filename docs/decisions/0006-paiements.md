# ADR-0006 — Paiements : confirmation manuelle, prêt pour un agrégateur

- **Statut** : Accepté — 2026-09-22 (à compléter avec l'agrégateur retenu après l'étude de marché)

## Contexte

Le legacy enregistre un paiement déclaratif (`payement`) : le membre choisit Cash, Charden Farell
(code de transfert à 13 caractères) ou Mobile Money (numéro de transaction ≥ 9 caractères), le
paiement passe en « Payement non confirmé » (2), un gestionnaire ayant le droit « Caisse » le
confirme (3). Des effets de bord ont lieu **dès l'enregistrement** selon l'objet payé
(`typepnrpay`) : décrément de stock (produit/article), cotisation Likelemba, souscription
distributeur, fond de soutien, apport de fonds.

## Décision

1. Le **circuit déclaratif + confirmation manuelle est conservé** : c'est le seul qui fonctionne
   sans contrat avec un opérateur, et il correspond aux usages locaux (cash, transfert).
2. Le paiement est modélisé derrière une **interface de fournisseur** (`services/paiements.py`) :
   `declaratif` (Cash / Charden Farell / Mobile Money manuel) est implémenté ; un fournisseur
   agrégateur (Mobile Money MTN/Airtel via API) pourra être branché sans toucher aux modules
   métier : il confirmera automatiquement (état 3) via son webhook.
3. Les **effets de bord par type d'objet payé sont centralisés** dans un seul service (au lieu
   d'être dispersés dans `incl-enregpaye.php`) et restent déclenchés à l'enregistrement, comme
   dans le legacy — la confirmation ne fait que changer l'état.
4. Les codes de type d'objet payé legacy sont conservés (1 Produit, 2 Article, 4 Course,
   5 Likelemba, 6 Souscription, 7 Fond de soutien, 8 Apport de fonds).

## Conséquences

- Un gestionnaire garde la main sur la validation tant qu'aucun agrégateur n'est contractualisé.
- Le choix de l'agrégateur (et son intégration) fera l'objet d'un ADR dédié.
