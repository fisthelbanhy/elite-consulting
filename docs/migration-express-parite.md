# Contrat de l API a porter (reference de parite)

Releve automatique de l OpenAPI du backend FastAPI avant migration vers Express.
**381 operations sur 259 chemins, 35 groupes.**

## Accompagnement (9)

- [x] `GET /api/accompagnement` — Lister
- [x] `POST /api/accompagnement` — Creer
- [x] `GET /api/accompagnement/compteurs` — Compteurs
- [x] `GET /api/accompagnement/questionnaires` — Questionnaires
- [x] `GET /api/accompagnement/questionnaires/{slug}` — Questionnaire
- [x] `DELETE /api/accompagnement/{id_}` — Effacer
- [x] `GET /api/accompagnement/{id_}` — Detail
- [x] `PUT /api/accompagnement/{id_}` — Modifier
- [x] `POST /api/accompagnement/{id_}/etat` — Etat

## Appels de fonds (18)

- [ ] `GET /api/projets` — Lister
- [ ] `POST /api/projets` — Creer
- [ ] `GET /api/projets/apports` — Lister Apports
- [ ] `GET /api/projets/apports/{id_}` — Detail Apport
- [ ] `POST /api/projets/apports/{id_}/annuler` — Annuler Apport
- [ ] `POST /api/projets/apports/{id_}/valider` — Valider Apport
- [ ] `POST /api/projets/apports/{id_}/versements` — Enregistrer Versement
- [ ] `GET /api/projets/compteurs` — Compteurs
- [ ] `GET /api/projets/mes-entreprises` — Mes Entreprises
- [ ] `DELETE /api/projets/{id_}` — Effacer
- [ ] `GET /api/projets/{id_}` — Detail
- [ ] `PUT /api/projets/{id_}` — Modifier
- [ ] `GET /api/projets/{id_}/apports` — Apports Du Projet
- [ ] `POST /api/projets/{id_}/apports` — Apporter
- [ ] `POST /api/projets/{id_}/etat` — Etat
- [ ] `POST /api/projets/{id_}/evaluation` — Evaluer
- [ ] `POST /api/projets/{id_}/photo` — Photo
- [ ] `POST /api/projets/{id_}/presentation` — Presentation

## Authentification (9)

- [x] `POST /api/auth/inscription` — Inscription
- [x] `POST /api/auth/login` — Connexion
- [x] `POST /api/auth/logout` — Deconnexion
- [x] `GET /api/auth/me` — Moi
- [x] `POST /api/auth/mot-de-passe` — Changer Mot De Passe
- [x] `POST /api/auth/mot-de-passe-oublie` — Mot De Passe Oublie
- [x] `PUT /api/auth/profil` — Maj Profil
- [x] `POST /api/auth/profil/photo` — Maj Photo
- [x] `POST /api/auth/reinitialiser` — Reinitialiser

## Boutique (11)

- [ ] `GET /api/bien-etre` — Fiches
- [ ] `GET /api/bien-etre/{id_}` — Fiche
- [ ] `GET /api/boutique/groupes` — Groupes
- [ ] `GET /api/boutique/produits` — Catalogue
- [ ] `GET /api/boutique/produits/populaires` — Populaires
- [ ] `GET /api/boutique/produits/{id_}` — Fiche Produit
- [ ] `GET /api/panier` — Voir Panier
- [ ] `POST /api/panier` — Ajouter
- [ ] `GET /api/panier/suivi` — Suivi
- [ ] `DELETE /api/panier/{id_}` — Retirer
- [ ] `PUT /api/panier/{id_}` — Changer Quantite

## Business plan (6)

- [x] `GET /api/business-plan` — Lister
- [x] `POST /api/business-plan` — Creer
- [x] `GET /api/business-plan/mien` — Le Mien
- [x] `GET /api/business-plan/{id_}` — Detail
- [x] `PUT /api/business-plan/{id_}` — Modifier
- [x] `POST /api/business-plan/{id_}/etat` — Etat

## Comparateur de prix (10)

- [x] `GET /api/comparateur/acces` — Acces
- [x] `POST /api/comparateur/entreprises/{entreprise_id}/email` — Envoyer Email
- [x] `GET /api/comparateur/lignes` — Lignes
- [x] `POST /api/comparateur/lignes` — Ajouter Ligne
- [x] `DELETE /api/comparateur/lignes/{id_}` — Supprimer Ligne
- [x] `PUT /api/comparateur/lignes/{id_}` — Modifier Ligne
- [x] `GET /api/comparateur/ma-fiche` — Ma Fiche
- [x] `GET /api/comparateur/produits` — Produits
- [x] `POST /api/comparateur/produits` — Creer Produit
- [x] `PUT /api/comparateur/produits/{id_}` — Modifier Produit

## Conseil financier (9)

- [x] `GET /api/conseil-financier` — Lister
- [x] `POST /api/conseil-financier` — Creer
- [x] `GET /api/conseil-financier/compteurs` — Compteurs
- [x] `DELETE /api/conseil-financier/{id_}` — Effacer
- [x] `GET /api/conseil-financier/{id_}` — Detail
- [x] `PUT /api/conseil-financier/{id_}` — Modifier
- [x] `POST /api/conseil-financier/{id_}/cloture` — Cloturer
- [x] `POST /api/conseil-financier/{id_}/etat` — Etat
- [x] `POST /api/conseil-financier/{id_}/reponses` — Repondre

## Contact (7)

- [x] `GET /api/contact` — Lister
- [x] `POST /api/contact` — Envoyer
- [x] `GET /api/contact/compteurs` — Compteurs
- [x] `GET /api/contact/expediteurs` — Expediteurs
- [x] `GET /api/contact/{id_}` — Detail
- [x] `POST /api/contact/{id_}/etat` — Etat
- [x] `POST /api/contact/{id_}/reponse` — Repondre

## Courses & livraison (16)

- [ ] `GET /api/courses` — Lister
- [ ] `POST /api/courses` — Creer
- [ ] `GET /api/courses/boutiques` — Boutiques
- [ ] `GET /api/courses/catalogue` — Catalogue
- [ ] `POST /api/courses/catalogue` — Creer Article
- [ ] `DELETE /api/courses/catalogue/{id_}` — Supprimer Article
- [ ] `GET /api/courses/catalogue/{id_}` — Article Catalogue
- [ ] `PUT /api/courses/catalogue/{id_}` — Modifier Article
- [ ] `POST /api/courses/catalogue/{id_}/etat` — Etat Article
- [ ] `POST /api/courses/catalogue/{id_}/photo` — Photo Article
- [ ] `POST /api/courses/verifier` — Verifier
- [ ] `DELETE /api/courses/{id_}` — Effacer
- [ ] `GET /api/courses/{id_}` — Detail
- [ ] `PUT /api/courses/{id_}` — Modifier
- [ ] `POST /api/courses/{id_}/etat` — Etat
- [ ] `POST /api/courses/{id_}/etat-course` — Etat Course

## Devenir distributeur (7)

- [x] `GET /api/distributeur/kit` — Kit
- [x] `GET /api/distributeur/souscription` — Ma Souscription
- [x] `PUT /api/distributeur/souscription` — Enregistrer Etape
- [x] `GET /api/distributeur/souscriptions` — Lister
- [x] `GET /api/distributeur/souscriptions/{id_}` — Detail
- [x] `POST /api/distributeur/souscriptions/{id_}/etat` — Changer
- [x] `GET /api/distributeur/statut` — Statut

## Dialogue (3)

- [x] `GET /api/dialogues` — Lister
- [x] `POST /api/dialogues` — Ecrire
- [x] `GET /api/dialogues/conversations` — Conversations

## Découverte de soi (12)

- [x] `GET /api/decouverte` — Lister
- [x] `POST /api/decouverte` — Creer
- [x] `POST /api/decouverte/diagnostic` — Diagnostic Enregistrer
- [x] `GET /api/decouverte/diagnostic/questions` — Diagnostic Questions
- [x] `POST /api/decouverte/diagnostic/restitution` — Diagnostic Restitution
- [x] `GET /api/decouverte/moi` — Ma Fiche
- [x] `DELETE /api/decouverte/{id_}` — Effacer
- [x] `GET /api/decouverte/{id_}` — Detail
- [x] `PUT /api/decouverte/{id_}` — Modifier
- [x] `POST /api/decouverte/{id_}/cloture` — Cloture
- [x] `PUT /api/decouverte/{id_}/correspondance` — Correspondance
- [x] `POST /api/decouverte/{id_}/etat` — Etat

## Emplois (10)

- [x] `GET /api/emplois` — Lister
- [x] `POST /api/emplois` — Creer
- [x] `GET /api/emplois/compteurs` — Compteurs
- [x] `DELETE /api/emplois/{id_}` — Effacer
- [x] `GET /api/emplois/{id_}` — Detail
- [x] `PUT /api/emplois/{id_}` — Modifier
- [x] `POST /api/emplois/{id_}/cv` — Cv
- [x] `POST /api/emplois/{id_}/etat` — Etat
- [x] `POST /api/emplois/{id_}/interet` — Manifester
- [x] `POST /api/emplois/{id_}/photo` — Photo

## Entreprises (9)

- [x] `GET /api/entreprises` — Lister
- [x] `POST /api/entreprises` — Creer
- [x] `GET /api/entreprises/miennes` — Miennes
- [x] `GET /api/entreprises/modele` — Modele
- [x] `DELETE /api/entreprises/{id_}` — Effacer
- [x] `GET /api/entreprises/{id_}` — Detail
- [x] `PUT /api/entreprises/{id_}` — Modifier
- [x] `POST /api/entreprises/{id_}/etat` — Etat
- [x] `POST /api/entreprises/{id_}/logo` — Logo

## Espace membre (4)

- [x] `PUT /api/espace/code-pointage` — Changer Code Pointage
- [x] `GET /api/espace/compteurs` — Compteurs
- [x] `PUT /api/espace/identifiant` — Changer Identifiant
- [x] `GET /api/espace/tableau` — Tableau

## Gestion (3)

- [ ] `GET /api/gestion/compteurs` — Compteurs
- [ ] `GET /api/gestion/moderation` — Moderation
- [ ] `GET /api/gestion/tableau-de-bord` — Tableau De Bord

## Gestion — journaux (3)

- [ ] `GET /api/gestion/journaux/connexions` — Connexions
- [ ] `GET /api/gestion/journaux/visites` — Visites
- [ ] `POST /api/gestion/journaux/{journal}/purger` — Purger

## Gestion — membres (15)

- [ ] `GET /api/gestion/membres` — Lister
- [ ] `POST /api/gestion/membres` — Creer
- [ ] `GET /api/gestion/membres/export` — Exporter
- [ ] `GET /api/gestion/membres/options` — Options
- [ ] `DELETE /api/gestion/membres/{id_}` — Supprimer
- [ ] `GET /api/gestion/membres/{id_}` — Detail
- [ ] `PUT /api/gestion/membres/{id_}` — Modifier
- [ ] `POST /api/gestion/membres/{id_}/code-pointage` — Code Pointage
- [ ] `PUT /api/gestion/membres/{id_}/droits` — Droits
- [ ] `POST /api/gestion/membres/{id_}/etat` — Etat
- [ ] `POST /api/gestion/membres/{id_}/photo` — Photo
- [ ] `POST /api/gestion/membres/{id_}/reinitialisation` — Reinitialisation
- [ ] `GET /api/gestion/reinitialisations` — Reinitialisations
- [ ] `POST /api/gestion/reinitialisations/{id_}/ignorer` — Ignorer
- [ ] `POST /api/gestion/reinitialisations/{id_}/traiter` — Traiter

## Gestion — référentiels (54)

- [ ] `GET /api/gestion/parametres` — Parametres
- [ ] `PUT /api/gestion/parametres` — Modifier Parametres
- [ ] `GET /api/gestion/referentiels` — Sommaire
- [ ] `GET /api/gestion/referentiels/banques` — Banques
- [ ] `POST /api/gestion/referentiels/banques` — Creer Banque
- [ ] `DELETE /api/gestion/referentiels/banques/{id_}` — Supprimer Banque
- [ ] `GET /api/gestion/referentiels/banques/{id_}` — Banque
- [ ] `PUT /api/gestion/referentiels/banques/{id_}` — Modifier Banque
- [ ] `GET /api/gestion/referentiels/diplomes` — Diplomes
- [ ] `POST /api/gestion/referentiels/diplomes` — Creer Diplome
- [ ] `DELETE /api/gestion/referentiels/diplomes/{id_}` — Supprimer Diplome
- [ ] `GET /api/gestion/referentiels/diplomes/{id_}` — Diplome
- [ ] `PUT /api/gestion/referentiels/diplomes/{id_}` — Modifier Diplome
- [ ] `GET /api/gestion/referentiels/domaines` — Domaines
- [ ] `POST /api/gestion/referentiels/domaines` — Creer Domaine
- [ ] `DELETE /api/gestion/referentiels/domaines/{id_}` — Supprimer Domaine
- [ ] `GET /api/gestion/referentiels/domaines/{id_}` — Domaine
- [ ] `PUT /api/gestion/referentiels/domaines/{id_}` — Modifier Domaine
- [ ] `GET /api/gestion/referentiels/familles` — Familles
- [ ] `POST /api/gestion/referentiels/familles` — Creer Famille
- [ ] `DELETE /api/gestion/referentiels/familles/{id_}` — Supprimer Famille
- [ ] `GET /api/gestion/referentiels/familles/{id_}` — Famille
- [ ] `PUT /api/gestion/referentiels/familles/{id_}` — Modifier Famille
- [ ] `GET /api/gestion/referentiels/maladies` — Maladies
- [ ] `POST /api/gestion/referentiels/maladies` — Creer Maladie
- [ ] `DELETE /api/gestion/referentiels/maladies/{id_}` — Supprimer Maladie
- [ ] `GET /api/gestion/referentiels/maladies/{id_}` — Maladie
- [ ] `PUT /api/gestion/referentiels/maladies/{id_}` — Modifier Maladie
- [ ] `GET /api/gestion/referentiels/produits` — Produits
- [ ] `POST /api/gestion/referentiels/produits` — Creer Produit
- [ ] `GET /api/gestion/referentiels/produits-comparateur` — Produits Comparateur
- [ ] `POST /api/gestion/referentiels/produits-comparateur` — Creer Produit Comparateur
- [ ] `DELETE /api/gestion/referentiels/produits-comparateur/{id_}` — Supprimer Produit Comparateur
- [ ] `GET /api/gestion/referentiels/produits-comparateur/{id_}` — Produit Comparateur
- [ ] `PUT /api/gestion/referentiels/produits-comparateur/{id_}` — Modifier Produit Comparateur
- [ ] `DELETE /api/gestion/referentiels/produits/{id_}` — Supprimer Produit
- [ ] `GET /api/gestion/referentiels/produits/{id_}` — Produit
- [ ] `PUT /api/gestion/referentiels/produits/{id_}` — Modifier Produit
- [ ] `POST /api/gestion/referentiels/produits/{id_}/photo` — Photo Produit
- [ ] `GET /api/gestion/referentiels/quartiers` — Quartiers
- [ ] `POST /api/gestion/referentiels/quartiers` — Creer Quartier
- [ ] `DELETE /api/gestion/referentiels/quartiers/{id_}` — Supprimer Quartier
- [ ] `GET /api/gestion/referentiels/quartiers/{id_}` — Quartier
- [ ] `PUT /api/gestion/referentiels/quartiers/{id_}` — Modifier Quartier
- [ ] `GET /api/gestion/referentiels/secteurs` — Secteurs
- [ ] `POST /api/gestion/referentiels/secteurs` — Creer Secteur
- [ ] `DELETE /api/gestion/referentiels/secteurs/{id_}` — Supprimer Secteur
- [ ] `GET /api/gestion/referentiels/secteurs/{id_}` — Secteur
- [ ] `PUT /api/gestion/referentiels/secteurs/{id_}` — Modifier Secteur
- [ ] `GET /api/gestion/referentiels/villes` — Villes
- [ ] `POST /api/gestion/referentiels/villes` — Creer Ville
- [ ] `DELETE /api/gestion/referentiels/villes/{id_}` — Supprimer Ville
- [ ] `GET /api/gestion/referentiels/villes/{id_}` — Ville
- [ ] `PUT /api/gestion/referentiels/villes/{id_}` — Modifier Ville

## Immobilier (10)

- [x] `GET /api/immobilier` — Lister
- [x] `POST /api/immobilier` — Creer
- [x] `GET /api/immobilier/compteurs` — Compteurs
- [x] `GET /api/immobilier/encarts` — Encarts
- [x] `DELETE /api/immobilier/{id_}` — Effacer
- [x] `GET /api/immobilier/{id_}` — Detail
- [x] `PUT /api/immobilier/{id_}` — Modifier
- [x] `POST /api/immobilier/{id_}/etat` — Etat
- [x] `POST /api/immobilier/{id_}/interet` — Manifester
- [x] `POST /api/immobilier/{id_}/photo` — Photo

## Likelemba (14)

- [ ] `GET /api/likelemba` — Lister
- [ ] `POST /api/likelemba` — Creer
- [ ] `GET /api/likelemba/adhesions/{id_}` — Detail Adhesion
- [ ] `PUT /api/likelemba/adhesions/{id_}` — Modifier Adhesion
- [ ] `POST /api/likelemba/adhesions/{id_}/etat` — Etat Adhesion
- [ ] `GET /api/likelemba/compteurs` — Compteurs
- [ ] `POST /api/likelemba/cotisations/{id_}/valider` — Valider Cotisation
- [ ] `GET /api/likelemba/membres` — Membres
- [ ] `GET /api/likelemba/mes-adhesions` — Mes Adhesions
- [ ] `DELETE /api/likelemba/{id_}` — Effacer
- [ ] `GET /api/likelemba/{id_}` — Detail
- [ ] `PUT /api/likelemba/{id_}` — Modifier
- [ ] `POST /api/likelemba/{id_}/adhesions` — Adherer
- [ ] `POST /api/likelemba/{id_}/etat` — Etat

## Marchés (15)

- [x] `GET /api/marches` — Lister
- [x] `POST /api/marches` — Creer
- [x] `GET /api/marches/compteurs` — Compteurs
- [x] `GET /api/marches/projets` — Lister Projets
- [x] `POST /api/marches/projets` — Creer Projet
- [x] `DELETE /api/marches/projets/{id_}` — Effacer Projet
- [x] `GET /api/marches/projets/{id_}` — Detail Projet
- [x] `PUT /api/marches/projets/{id_}` — Modifier Projet
- [x] `POST /api/marches/projets/{id_}/etat` — Etat Projet
- [x] `DELETE /api/marches/{id_}` — Effacer
- [x] `GET /api/marches/{id_}` — Detail
- [x] `PUT /api/marches/{id_}` — Modifier
- [x] `DELETE /api/marches/{id_}/document` — Retirer Document
- [x] `POST /api/marches/{id_}/document` — Document
- [x] `POST /api/marches/{id_}/etat` — Etat Marche

## Messagerie (5)

- [x] `GET /api/messages` — Mon Fil
- [x] `POST /api/messages` — Ecrire
- [x] `GET /api/messages/fils` — Fils
- [x] `GET /api/messages/fils/{membre_id}` — Fil Membre
- [x] `POST /api/messages/fils/{membre_id}` — Repondre

## Paiements (6)

- [x] `GET /api/paiements` — Lister
- [x] `POST /api/paiements` — Declarer
- [x] `GET /api/paiements/miens` — Mes Paiements
- [x] `GET /api/paiements/preparer` — Preparer
- [x] `POST /api/paiements/{id_}/confirmer` — Confirmer
- [x] `POST /api/paiements/{id_}/rejeter` — Rejeter

## Partenariat & troc (8)

- [x] `GET /api/partenariats` — Lister
- [x] `POST /api/partenariats` — Creer
- [x] `GET /api/partenariats/compteur` — Compteur
- [x] `DELETE /api/partenariats/{id_}` — Effacer
- [x] `GET /api/partenariats/{id_}` — Detail
- [x] `PUT /api/partenariats/{id_}` — Modifier
- [x] `POST /api/partenariats/{id_}/etat` — Etat
- [x] `POST /api/partenariats/{id_}/interet` — Manifester

## Petites annonces (14)

- [x] `GET /api/annonces` — Lister
- [x] `POST /api/annonces` — Creer
- [x] `GET /api/annonces/compteurs` — Compteurs
- [x] `GET /api/annonces/encarts` — Encarts
- [x] `GET /api/annonces/panier` — Panier
- [x] `DELETE /api/annonces/panier/{ligne_id}` — Retirer
- [x] `PUT /api/annonces/panier/{ligne_id}` — Changer Quantite
- [x] `DELETE /api/annonces/{id_}` — Effacer
- [x] `GET /api/annonces/{id_}` — Detail
- [x] `PUT /api/annonces/{id_}` — Modifier
- [x] `POST /api/annonces/{id_}/etat` — Etat
- [x] `POST /api/annonces/{id_}/interet` — Manifester
- [x] `POST /api/annonces/{id_}/panier` — Ajouter Au Panier
- [x] `POST /api/annonces/{id_}/photo` — Photo

## Publicités (9)

- [x] `GET /api/publicites` — Lister
- [x] `POST /api/publicites` — Creer
- [x] `GET /api/publicites/choix` — Choix
- [x] `GET /api/publicites/diffusion` — Diffusion
- [x] `DELETE /api/publicites/{id_}` — Effacer
- [x] `GET /api/publicites/{id_}` — Detail
- [x] `PUT /api/publicites/{id_}` — Modifier
- [x] `POST /api/publicites/{id_}/etat` — Etat
- [x] `POST /api/publicites/{id_}/fichier` — Fichier

## Questions & conseils (12)

- [x] `GET /api/questions` — Lister
- [x] `POST /api/questions` — Creer
- [x] `GET /api/questions/compteurs` — Compteurs
- [x] `GET /api/questions/derniers` — Derniers
- [x] `DELETE /api/questions/reponses/{rid}` — Effacer Reponse
- [x] `PUT /api/questions/reponses/{rid}` — Modifier Reponse
- [x] `POST /api/questions/reponses/{rid}/etat` — Etat Reponse
- [x] `DELETE /api/questions/{id_}` — Effacer
- [x] `GET /api/questions/{id_}` — Detail
- [x] `PUT /api/questions/{id_}` — Modifier
- [x] `POST /api/questions/{id_}/etat` — Etat
- [x] `POST /api/questions/{id_}/reponses` — Repondre

## Référentiels (10)

- [x] `GET /api/referentiels/a-la-une` — A La Une
- [x] `GET /api/referentiels/banques` — Banques
- [x] `GET /api/referentiels/diplomes` — Diplomes
- [x] `GET /api/referentiels/enums` — Enumerations
- [x] `GET /api/referentiels/familles-articles` — Familles Articles
- [x] `GET /api/referentiels/parametres` — Parametres
- [x] `GET /api/referentiels/secteurs` — Secteurs
- [x] `GET /api/referentiels/stats` — Stats
- [x] `GET /api/referentiels/villes` — Villes
- [x] `POST /api/visites` — Journaliser Visite

## Réussites (9)

- [x] `GET /api/reussites` — Lister
- [x] `POST /api/reussites` — Creer
- [x] `GET /api/reussites/compteurs` — Compteurs
- [x] `GET /api/reussites/moi` — Ma Fiche
- [x] `DELETE /api/reussites/{id_}` — Effacer
- [x] `GET /api/reussites/{id_}` — Detail
- [x] `PUT /api/reussites/{id_}` — Modifier
- [x] `POST /api/reussites/{id_}/etat` — Etat
- [x] `POST /api/reussites/{id_}/photo` — Photo

## Suggestions (4)

- [x] `GET /api/suggestions` — Lister
- [x] `POST /api/suggestions` — Deposer
- [x] `GET /api/suggestions/compteurs` — Compteurs
- [x] `POST /api/suggestions/{id_}/etat` — Etat

## Système (1)

- [x] `GET /api/sante` — Sante

## Tarifs bancaires (12)

- [ ] `GET /api/tarifs-bancaires` — Comparatif
- [ ] `PUT /api/tarifs-bancaires/banques/{banque_id}` — Enregistrer Grille
- [ ] `POST /api/tarifs-bancaires/initialiser` — Initialiser
- [ ] `POST /api/tarifs-bancaires/operations` — Creer Operation
- [ ] `DELETE /api/tarifs-bancaires/operations/{id_}` — Supprimer Operation
- [ ] `PUT /api/tarifs-bancaires/operations/{id_}` — Modifier Operation
- [ ] `POST /api/tarifs-bancaires/tarifs` — Creer Tarif
- [ ] `DELETE /api/tarifs-bancaires/tarifs/{id_}` — Supprimer Tarif
- [ ] `PUT /api/tarifs-bancaires/tarifs/{id_}` — Modifier Tarif
- [ ] `POST /api/tarifs-bancaires/types` — Creer Type
- [ ] `DELETE /api/tarifs-bancaires/types/{id_}` — Supprimer Type
- [ ] `PUT /api/tarifs-bancaires/types/{id_}` — Modifier Type

## Trésorerie (27)

- [ ] `GET /api/tresorerie/compteurs` — Compteurs
- [ ] `GET /api/tresorerie/contentieux` — Lister Contentieux
- [ ] `POST /api/tresorerie/contentieux` — Creer Contentieux
- [ ] `DELETE /api/tresorerie/contentieux/{id_}` — Annuler Contentieux
- [ ] `GET /api/tresorerie/contentieux/{id_}` — Detail Contentieux
- [ ] `PUT /api/tresorerie/contentieux/{id_}` — Modifier Contentieux
- [ ] `POST /api/tresorerie/contentieux/{id_}/etat` — Etat Contentieux
- [ ] `GET /api/tresorerie/credits` — Lister Credits
- [ ] `POST /api/tresorerie/credits` — Creer Credit
- [ ] `DELETE /api/tresorerie/credits/{id_}` — Annuler Credits
- [ ] `GET /api/tresorerie/credits/{id_}` — Detail Credit
- [ ] `PUT /api/tresorerie/credits/{id_}` — Modifier Credit
- [ ] `POST /api/tresorerie/credits/{id_}/etat` — Etat Credits
- [ ] `GET /api/tresorerie/operations` — Lister Operations
- [ ] `POST /api/tresorerie/operations` — Creer Operations
- [ ] `GET /api/tresorerie/operations/synthese` — Synthese Operations
- [ ] `DELETE /api/tresorerie/operations/{id_}` — Annuler Operations
- [ ] `GET /api/tresorerie/operations/{id_}` — Detail Operation
- [ ] `PUT /api/tresorerie/operations/{id_}` — Modifier Operation
- [ ] `POST /api/tresorerie/operations/{id_}/etat` — Etat Operations
- [ ] `POST /api/tresorerie/operations/{id_}/mail` — Renvoyer Mail
- [ ] `GET /api/tresorerie/placements` — Lister Placements
- [ ] `POST /api/tresorerie/placements` — Creer Placement
- [ ] `DELETE /api/tresorerie/placements/{id_}` — Annuler Placements
- [ ] `GET /api/tresorerie/placements/{id_}` — Detail Placement
- [ ] `PUT /api/tresorerie/placements/{id_}` — Modifier Placement
- [ ] `POST /api/tresorerie/placements/{id_}/etat` — Etat Placements

## Épargne solidaire (10)

- [ ] `GET /api/epargne/fonds` — Lister Fonds
- [ ] `POST /api/epargne/fonds` — Souscrire
- [ ] `GET /api/epargne/fonds/{id_}` — Detail Fond
- [ ] `PUT /api/epargne/fonds/{id_}` — Modifier Fond
- [ ] `POST /api/epargne/fonds/{id_}/etat` — Etat Fond
- [ ] `GET /api/epargne/pointages` — Lister Pointages
- [ ] `POST /api/epargne/pointages` — Pointer
- [ ] `GET /api/epargne/pointages/titulaires` — Titulaires
- [ ] `GET /api/epargne/pointages/titulaires/{id_}` — Titulaire
- [ ] `GET /api/epargne/statut` — Statut
