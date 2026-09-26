# ADR-0005 — Sécurité

- **Statut** : Accepté — 2026-09-22

## Décisions

1. **Mots de passe** hachés en Argon2id (`pwdlib`). Les 68 mots de passe legacy en clair sont
   hachés pendant la reprise : les membres existants se connectent avec le même mot de passe,
   qui n'est plus lisible par personne. Longueur minimale pour les nouveaux comptes : 8 caractères
   (le legacy n'imposait que « différent de l'identifiant », règle conservée en plus).
2. **Connexion** par identifiant **ou** téléphone **ou** e-mail + mot de passe. Limitation :
   5 échecs par identifiant et par IP sur 15 minutes → blocage temporaire.
3. **Mot de passe oublié** : le legacy vérifiait nom + pseudo + téléphone puis **affichait le mot
   de passe**. Remplacé par :
   - si le membre a un e-mail : lien de réinitialisation à usage unique (1 h) ;
   - sinon (cas fréquent) : la même vérification d'identité que le legacy crée une **demande de
     réinitialisation** visible par les gestionnaires, qui transmettent au membre un lien à usage
     unique (téléphone/WhatsApp) après l'avoir rappelé. Aucun mot de passe n'est jamais affiché.
4. **Anti-robot** : le « mot de contrôle » legacy (9 lettres à recopier) est remplacé par un champ
   piège invisible (*honeypot*) + un délai minimal de remplissage + la limitation de débit.
   Cloudflare Turnstile pourra être activé par configuration si du spam apparaît.
5. **Fichiers téléversés** : extensions et type MIME vérifiés (images jpg/png/webp, PDF, audio mp3,
   vidéo mp4), 4 Mo max par défaut (comme le legacy, configurable), images re-encodées et
   redimensionnées par Pillow (supprime les métadonnées EXIF, dont la géolocalisation),
   noms de fichiers générés côté serveur.
6. **Autorisations** vérifiées côté API pour chaque action, d'après le type de compte
   (Gestionnaire / Master / Membre) et les 4 droits legacy explicités en booléens :
   `droit_attribution` (donne et retire les droits), `droit_caisse` (confirme un paiement),
   `droit_activation` (crée, active, annule, supprime une fiche), `droit_point_caisse`.
7. **Code PIN de carte de pointage** : stocké haché (plus en clair), comparaison à temps constant.
8. **En-têtes** : CSP, `X-Content-Type-Options`, `Referrer-Policy` posés par SvelteKit ;
   cookies `httpOnly` + `secure` en production (ADR-0002).
9. **Données personnelles** : le dump de production et `site.txt` sont exclus du dépôt git
   (`.gitignore`) et ne doivent jamais être publiés.
