# ADR-0010 — Connexion par code (OTP) et agrégateur de paiement : préparés, activés plus tard

- **Statut** : Accepté — 2026-09-22

## Contexte

L'étude recommande une connexion sans mot de passe (code à 6 chiffres par WhatsApp, repli SMS)
et un paiement Mobile Money intégré via **pawaPay** (couverture MTN et Airtel au Congo confirmée
par sa documentation). Les deux supposent des **contrats** (fournisseur WhatsApp Business / SMS,
compte marchand pawaPay) qui n'existent pas encore.

## Décision

1. **Connexion** : mot de passe (les 68 comptes existants en ont un) avec identifiant, téléphone
   ou e-mail. Le parcours OTP sera ajouté derrière une interface `services/otp.py`
   (fournisseurs : `journal` en développement, puis WhatsApp Business API / SMS) dès qu'un
   fournisseur est contractualisé — sans changer les écrans d'inscription (le téléphone est déjà
   l'identifiant principal).
2. **Paiement** : circuit déclaratif + confirmation manuelle (ADR-0006) en production au départ ;
   le fournisseur `pawapay` sera branché derrière `services/paiements.py` (dépôt initié par l'API,
   confirmation par webhook → état « confirmé » automatique).

## Conséquences

- Le site est exploitable immédiatement, sans dépendance commerciale.
- Deux chantiers identifiés dans la feuille de route : OTP WhatsApp/SMS, intégration pawaPay.
