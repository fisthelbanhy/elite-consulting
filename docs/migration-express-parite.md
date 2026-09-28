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

- [x] `GET /api/projets` — Lister
- [x] `POST /api/projets` — Creer
- [x] `GET /api/projets/apports` — Lister Apports
- [x] `GET /api/projets/apports/{id_}` — Detail Apport
- [x] `POST /api/projets/apports/{id_}/annuler` — Annuler Apport
- [x] `POST /api/projets/apports/{id_}/valider` — Valider Apport
- [x] `POST /api/projets/apports/{id_}/versements` — Enregistrer Versement
- [x] `GET /api/projets/compteurs` — Compteurs
- [x] `GET /api/projets/mes-entreprises` — Mes Entreprises
- [x] `DELETE /api/projets/{id_}` — Effacer
- [x] `GET /api/projets/{id_}` — Detail
- [x] `PUT /api/projets/{id_}` — Modifier
- [x] `GET /api/projets/{id_}/apports` — Apports Du Projet
- [x] `POST /api/projets/{id_}/apports` — Apporter
- [x] `POST /api/projets/{id_}/etat` — Etat
- [x] `POST /api/projets/{id_}/evaluation` — Evaluer
- [x] `POST /api/projets/{id_}/photo` — Photo
- [x] `POST /api/projets/{id_}/presentation` — Presentation

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

- [x] `GET /api/bien-etre` — Fiches
- [x] `GET /api/bien-etre/{id_}` — Fiche
- [x] `GET /api/boutique/groupes` — Groupes
- [x] `GET /api/boutique/produits` — Catalogue
- [x] `GET /api/boutique/produits/populaires` — Populaires
- [x] `GET /api/boutique/produits/{id_}` — Fiche Produit
- [x] `GET /api/panier` — Voir Panier
- [x] `POST /api/panier` — Ajouter
- [x] `GET /api/panier/suivi` — Suivi
- [x] `DELETE /api/panier/{id_}` — Retirer
- [x] `PUT /api/panier/{id_}` — Changer Quantite

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

- [x] `GET /api/courses` — Lister
- [x] `POST /api/courses` — Creer
- [x] `GET /api/courses/boutiques` — Boutiques
- [x] `GET /api/courses/catalogue` — Catalogue
- [x] `POST /api/courses/catalogue` — Creer Article
- [x] `DELETE /api/courses/catalogue/{id_}` — Supprimer Article
- [x] `GET /api/courses/catalogue/{id_}` — Article Catalogue
- [x] `PUT /api/courses/catalogue/{id_}` — Modifier Article
- [x] `POST /api/courses/catalogue/{id_}/etat` — Etat Article
- [x] `POST /api/courses/catalogue/{id_}/photo` — Photo Article
- [x] `POST /api/courses/verifier` — Verifier
- [x] `DELETE /api/courses/{id_}` — Effacer
- [x] `GET /api/courses/{id_}` — Detail
- [x] `PUT /api/courses/{id_}` — Modifier
- [x] `POST /api/courses/{id_}/etat` — Etat
- [x] `POST /api/courses/{id_}/etat-course` — Etat Course

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

- [x] `GET /api/gestion/compteurs` — Compteurs
- [x] `GET /api/gestion/moderation` — Moderation
- [x] `GET /api/gestion/tableau-de-bord` — Tableau De Bord

## Gestion — journaux (3)

- [x] `GET /api/gestion/journaux/connexions` — Connexions
- [x] `GET /api/gestion/journaux/visites` — Visites
- [x] `POST /api/gestion/journaux/{journal}/purger` — Purger

## Gestion — membres (15)

- [x] `GET /api/gestion/membres` — Lister
- [x] `POST /api/gestion/membres` — Creer
- [x] `GET /api/gestion/membres/export` — Exporter
- [x] `GET /api/gestion/membres/options` — Options
- [x] `DELETE /api/gestion/membres/{id_}` — Supprimer
- [x] `GET /api/gestion/membres/{id_}` — Detail
- [x] `PUT /api/gestion/membres/{id_}` — Modifier
- [x] `POST /api/gestion/membres/{id_}/code-pointage` — Code Pointage
- [x] `PUT /api/gestion/membres/{id_}/droits` — Droits
- [x] `POST /api/gestion/membres/{id_}/etat` — Etat
- [x] `POST /api/gestion/membres/{id_}/photo` — Photo
- [x] `POST /api/gestion/membres/{id_}/reinitialisation` — Reinitialisation
- [x] `GET /api/gestion/reinitialisations` — Reinitialisations
- [x] `POST /api/gestion/reinitialisations/{id_}/ignorer` — Ignorer
- [x] `POST /api/gestion/reinitialisations/{id_}/traiter` — Traiter

## Gestion — référentiels (54)

- [x] `GET /api/gestion/parametres` — Parametres
- [x] `PUT /api/gestion/parametres` — Modifier Parametres
- [x] `GET /api/gestion/referentiels` — Sommaire
- [x] `GET /api/gestion/referentiels/banques` — Banques
- [x] `POST /api/gestion/referentiels/banques` — Creer Banque
- [x] `DELETE /api/gestion/referentiels/banques/{id_}` — Supprimer Banque
- [x] `GET /api/gestion/referentiels/banques/{id_}` — Banque
- [x] `PUT /api/gestion/referentiels/banques/{id_}` — Modifier Banque
- [x] `GET /api/gestion/referentiels/diplomes` — Diplomes
- [x] `POST /api/gestion/referentiels/diplomes` — Creer Diplome
- [x] `DELETE /api/gestion/referentiels/diplomes/{id_}` — Supprimer Diplome
- [x] `GET /api/gestion/referentiels/diplomes/{id_}` — Diplome
- [x] `PUT /api/gestion/referentiels/diplomes/{id_}` — Modifier Diplome
- [x] `GET /api/gestion/referentiels/domaines` — Domaines
- [x] `POST /api/gestion/referentiels/domaines` — Creer Domaine
- [x] `DELETE /api/gestion/referentiels/domaines/{id_}` — Supprimer Domaine
- [x] `GET /api/gestion/referentiels/domaines/{id_}` — Domaine
- [x] `PUT /api/gestion/referentiels/domaines/{id_}` — Modifier Domaine
- [x] `GET /api/gestion/referentiels/familles` — Familles
- [x] `POST /api/gestion/referentiels/familles` — Creer Famille
- [x] `DELETE /api/gestion/referentiels/familles/{id_}` — Supprimer Famille
- [x] `GET /api/gestion/referentiels/familles/{id_}` — Famille
- [x] `PUT /api/gestion/referentiels/familles/{id_}` — Modifier Famille
- [x] `GET /api/gestion/referentiels/maladies` — Maladies
- [x] `POST /api/gestion/referentiels/maladies` — Creer Maladie
- [x] `DELETE /api/gestion/referentiels/maladies/{id_}` — Supprimer Maladie
- [x] `GET /api/gestion/referentiels/maladies/{id_}` — Maladie
- [x] `PUT /api/gestion/referentiels/maladies/{id_}` — Modifier Maladie
- [x] `GET /api/gestion/referentiels/produits` — Produits
- [x] `POST /api/gestion/referentiels/produits` — Creer Produit
- [x] `GET /api/gestion/referentiels/produits-comparateur` — Produits Comparateur
- [x] `POST /api/gestion/referentiels/produits-comparateur` — Creer Produit Comparateur
- [x] `DELETE /api/gestion/referentiels/produits-comparateur/{id_}` — Supprimer Produit Comparateur
- [x] `GET /api/gestion/referentiels/produits-comparateur/{id_}` — Produit Comparateur
- [x] `PUT /api/gestion/referentiels/produits-comparateur/{id_}` — Modifier Produit Comparateur
- [x] `DELETE /api/gestion/referentiels/produits/{id_}` — Supprimer Produit
- [x] `GET /api/gestion/referentiels/produits/{id_}` — Produit
- [x] `PUT /api/gestion/referentiels/produits/{id_}` — Modifier Produit
- [x] `POST /api/gestion/referentiels/produits/{id_}/photo` — Photo Produit
- [x] `GET /api/gestion/referentiels/quartiers` — Quartiers
- [x] `POST /api/gestion/referentiels/quartiers` — Creer Quartier
- [x] `DELETE /api/gestion/referentiels/quartiers/{id_}` — Supprimer Quartier
- [x] `GET /api/gestion/referentiels/quartiers/{id_}` — Quartier
- [x] `PUT /api/gestion/referentiels/quartiers/{id_}` — Modifier Quartier
- [x] `GET /api/gestion/referentiels/secteurs` — Secteurs
- [x] `POST /api/gestion/referentiels/secteurs` — Creer Secteur
- [x] `DELETE /api/gestion/referentiels/secteurs/{id_}` — Supprimer Secteur
- [x] `GET /api/gestion/referentiels/secteurs/{id_}` — Secteur
- [x] `PUT /api/gestion/referentiels/secteurs/{id_}` — Modifier Secteur
- [x] `GET /api/gestion/referentiels/villes` — Villes
- [x] `POST /api/gestion/referentiels/villes` — Creer Ville
- [x] `DELETE /api/gestion/referentiels/villes/{id_}` — Supprimer Ville
- [x] `GET /api/gestion/referentiels/villes/{id_}` — Ville
- [x] `PUT /api/gestion/referentiels/villes/{id_}` — Modifier Ville

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

- [x] `GET /api/likelemba` — Lister
- [x] `POST /api/likelemba` — Creer
- [x] `GET /api/likelemba/adhesions/{id_}` — Detail Adhesion
- [x] `PUT /api/likelemba/adhesions/{id_}` — Modifier Adhesion
- [x] `POST /api/likelemba/adhesions/{id_}/etat` — Etat Adhesion
- [x] `GET /api/likelemba/compteurs` — Compteurs
- [x] `POST /api/likelemba/cotisations/{id_}/valider` — Valider Cotisation
- [x] `GET /api/likelemba/membres` — Membres
- [x] `GET /api/likelemba/mes-adhesions` — Mes Adhesions
- [x] `DELETE /api/likelemba/{id_}` — Effacer
- [x] `GET /api/likelemba/{id_}` — Detail
- [x] `PUT /api/likelemba/{id_}` — Modifier
- [x] `POST /api/likelemba/{id_}/adhesions` — Adherer
- [x] `POST /api/likelemba/{id_}/etat` — Etat

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

- [x] `GET /api/tarifs-bancaires` — Comparatif
- [x] `PUT /api/tarifs-bancaires/banques/{banque_id}` — Enregistrer Grille
- [x] `POST /api/tarifs-bancaires/initialiser` — Initialiser
- [x] `POST /api/tarifs-bancaires/operations` — Creer Operation
- [x] `DELETE /api/tarifs-bancaires/operations/{id_}` — Supprimer Operation
- [x] `PUT /api/tarifs-bancaires/operations/{id_}` — Modifier Operation
- [x] `POST /api/tarifs-bancaires/tarifs` — Creer Tarif
- [x] `DELETE /api/tarifs-bancaires/tarifs/{id_}` — Supprimer Tarif
- [x] `PUT /api/tarifs-bancaires/tarifs/{id_}` — Modifier Tarif
- [x] `POST /api/tarifs-bancaires/types` — Creer Type
- [x] `DELETE /api/tarifs-bancaires/types/{id_}` — Supprimer Type
- [x] `PUT /api/tarifs-bancaires/types/{id_}` — Modifier Type

## Trésorerie (27)

- [x] `GET /api/tresorerie/compteurs` — Compteurs
- [x] `GET /api/tresorerie/contentieux` — Lister Contentieux
- [x] `POST /api/tresorerie/contentieux` — Creer Contentieux
- [x] `DELETE /api/tresorerie/contentieux/{id_}` — Annuler Contentieux
- [x] `GET /api/tresorerie/contentieux/{id_}` — Detail Contentieux
- [x] `PUT /api/tresorerie/contentieux/{id_}` — Modifier Contentieux
- [x] `POST /api/tresorerie/contentieux/{id_}/etat` — Etat Contentieux
- [x] `GET /api/tresorerie/credits` — Lister Credits
- [x] `POST /api/tresorerie/credits` — Creer Credit
- [x] `DELETE /api/tresorerie/credits/{id_}` — Annuler Credits
- [x] `GET /api/tresorerie/credits/{id_}` — Detail Credit
- [x] `PUT /api/tresorerie/credits/{id_}` — Modifier Credit
- [x] `POST /api/tresorerie/credits/{id_}/etat` — Etat Credits
- [x] `GET /api/tresorerie/operations` — Lister Operations
- [x] `POST /api/tresorerie/operations` — Creer Operations
- [x] `GET /api/tresorerie/operations/synthese` — Synthese Operations
- [x] `DELETE /api/tresorerie/operations/{id_}` — Annuler Operations
- [x] `GET /api/tresorerie/operations/{id_}` — Detail Operation
- [x] `PUT /api/tresorerie/operations/{id_}` — Modifier Operation
- [x] `POST /api/tresorerie/operations/{id_}/etat` — Etat Operations
- [x] `POST /api/tresorerie/operations/{id_}/mail` — Renvoyer Mail
- [x] `GET /api/tresorerie/placements` — Lister Placements
- [x] `POST /api/tresorerie/placements` — Creer Placement
- [x] `DELETE /api/tresorerie/placements/{id_}` — Annuler Placements
- [x] `GET /api/tresorerie/placements/{id_}` — Detail Placement
- [x] `PUT /api/tresorerie/placements/{id_}` — Modifier Placement
- [x] `POST /api/tresorerie/placements/{id_}/etat` — Etat Placements

## Épargne solidaire (10)

- [x] `GET /api/epargne/fonds` — Lister Fonds
- [x] `POST /api/epargne/fonds` — Souscrire
- [x] `GET /api/epargne/fonds/{id_}` — Detail Fond
- [x] `PUT /api/epargne/fonds/{id_}` — Modifier Fond
- [x] `POST /api/epargne/fonds/{id_}/etat` — Etat Fond
- [x] `GET /api/epargne/pointages` — Lister Pointages
- [x] `POST /api/epargne/pointages` — Pointer
- [x] `GET /api/epargne/pointages/titulaires` — Titulaires
- [x] `GET /api/epargne/pointages/titulaires/{id_}` — Titulaire
- [x] `GET /api/epargne/statut` — Statut
