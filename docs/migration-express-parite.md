# Contrat de l API a porter (reference de parite)

Releve automatique de l OpenAPI du backend FastAPI avant migration vers Express.
**381 operations sur 259 chemins, 35 groupes.**

## Accompagnement (9)

- [ ] `GET /api/accompagnement` — Lister
- [ ] `POST /api/accompagnement` — Creer
- [ ] `GET /api/accompagnement/compteurs` — Compteurs
- [ ] `GET /api/accompagnement/questionnaires` — Questionnaires
- [ ] `GET /api/accompagnement/questionnaires/{slug}` — Questionnaire
- [ ] `DELETE /api/accompagnement/{id_}` — Effacer
- [ ] `GET /api/accompagnement/{id_}` — Detail
- [ ] `PUT /api/accompagnement/{id_}` — Modifier
- [ ] `POST /api/accompagnement/{id_}/etat` — Etat

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

- [ ] `GET /api/business-plan` — Lister
- [ ] `POST /api/business-plan` — Creer
- [ ] `GET /api/business-plan/mien` — Le Mien
- [ ] `GET /api/business-plan/{id_}` — Detail
- [ ] `PUT /api/business-plan/{id_}` — Modifier
- [ ] `POST /api/business-plan/{id_}/etat` — Etat

## Comparateur de prix (10)

- [ ] `GET /api/comparateur/acces` — Acces
- [ ] `POST /api/comparateur/entreprises/{entreprise_id}/email` — Envoyer Email
- [ ] `GET /api/comparateur/lignes` — Lignes
- [ ] `POST /api/comparateur/lignes` — Ajouter Ligne
- [ ] `DELETE /api/comparateur/lignes/{id_}` — Supprimer Ligne
- [ ] `PUT /api/comparateur/lignes/{id_}` — Modifier Ligne
- [ ] `GET /api/comparateur/ma-fiche` — Ma Fiche
- [ ] `GET /api/comparateur/produits` — Produits
- [ ] `POST /api/comparateur/produits` — Creer Produit
- [ ] `PUT /api/comparateur/produits/{id_}` — Modifier Produit

## Conseil financier (9)

- [ ] `GET /api/conseil-financier` — Lister
- [ ] `POST /api/conseil-financier` — Creer
- [ ] `GET /api/conseil-financier/compteurs` — Compteurs
- [ ] `DELETE /api/conseil-financier/{id_}` — Effacer
- [ ] `GET /api/conseil-financier/{id_}` — Detail
- [ ] `PUT /api/conseil-financier/{id_}` — Modifier
- [ ] `POST /api/conseil-financier/{id_}/cloture` — Cloturer
- [ ] `POST /api/conseil-financier/{id_}/etat` — Etat
- [ ] `POST /api/conseil-financier/{id_}/reponses` — Repondre

## Contact (7)

- [ ] `GET /api/contact` — Lister
- [ ] `POST /api/contact` — Envoyer
- [ ] `GET /api/contact/compteurs` — Compteurs
- [ ] `GET /api/contact/expediteurs` — Expediteurs
- [ ] `GET /api/contact/{id_}` — Detail
- [ ] `POST /api/contact/{id_}/etat` — Etat
- [ ] `POST /api/contact/{id_}/reponse` — Repondre

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

- [ ] `GET /api/distributeur/kit` — Kit
- [ ] `GET /api/distributeur/souscription` — Ma Souscription
- [ ] `PUT /api/distributeur/souscription` — Enregistrer Etape
- [ ] `GET /api/distributeur/souscriptions` — Lister
- [ ] `GET /api/distributeur/souscriptions/{id_}` — Detail
- [ ] `POST /api/distributeur/souscriptions/{id_}/etat` — Changer
- [ ] `GET /api/distributeur/statut` — Statut

## Dialogue (3)

- [ ] `GET /api/dialogues` — Lister
- [ ] `POST /api/dialogues` — Ecrire
- [ ] `GET /api/dialogues/conversations` — Conversations

## Découverte de soi (12)

- [ ] `GET /api/decouverte` — Lister
- [ ] `POST /api/decouverte` — Creer
- [ ] `POST /api/decouverte/diagnostic` — Diagnostic Enregistrer
- [ ] `GET /api/decouverte/diagnostic/questions` — Diagnostic Questions
- [ ] `POST /api/decouverte/diagnostic/restitution` — Diagnostic Restitution
- [ ] `GET /api/decouverte/moi` — Ma Fiche
- [ ] `DELETE /api/decouverte/{id_}` — Effacer
- [ ] `GET /api/decouverte/{id_}` — Detail
- [ ] `PUT /api/decouverte/{id_}` — Modifier
- [ ] `POST /api/decouverte/{id_}/cloture` — Cloture
- [ ] `PUT /api/decouverte/{id_}/correspondance` — Correspondance
- [ ] `POST /api/decouverte/{id_}/etat` — Etat

## Emplois (10)

- [ ] `GET /api/emplois` — Lister
- [ ] `POST /api/emplois` — Creer
- [ ] `GET /api/emplois/compteurs` — Compteurs
- [ ] `DELETE /api/emplois/{id_}` — Effacer
- [ ] `GET /api/emplois/{id_}` — Detail
- [ ] `PUT /api/emplois/{id_}` — Modifier
- [ ] `POST /api/emplois/{id_}/cv` — Cv
- [ ] `POST /api/emplois/{id_}/etat` — Etat
- [ ] `POST /api/emplois/{id_}/interet` — Manifester
- [ ] `POST /api/emplois/{id_}/photo` — Photo

## Entreprises (9)

- [ ] `GET /api/entreprises` — Lister
- [ ] `POST /api/entreprises` — Creer
- [ ] `GET /api/entreprises/miennes` — Miennes
- [ ] `GET /api/entreprises/modele` — Modele
- [ ] `DELETE /api/entreprises/{id_}` — Effacer
- [ ] `GET /api/entreprises/{id_}` — Detail
- [ ] `PUT /api/entreprises/{id_}` — Modifier
- [ ] `POST /api/entreprises/{id_}/etat` — Etat
- [ ] `POST /api/entreprises/{id_}/logo` — Logo

## Espace membre (4)

- [ ] `PUT /api/espace/code-pointage` — Changer Code Pointage
- [ ] `GET /api/espace/compteurs` — Compteurs
- [ ] `PUT /api/espace/identifiant` — Changer Identifiant
- [ ] `GET /api/espace/tableau` — Tableau

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

- [ ] `GET /api/immobilier` — Lister
- [ ] `POST /api/immobilier` — Creer
- [ ] `GET /api/immobilier/compteurs` — Compteurs
- [ ] `GET /api/immobilier/encarts` — Encarts
- [ ] `DELETE /api/immobilier/{id_}` — Effacer
- [ ] `GET /api/immobilier/{id_}` — Detail
- [ ] `PUT /api/immobilier/{id_}` — Modifier
- [ ] `POST /api/immobilier/{id_}/etat` — Etat
- [ ] `POST /api/immobilier/{id_}/interet` — Manifester
- [ ] `POST /api/immobilier/{id_}/photo` — Photo

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

- [ ] `GET /api/marches` — Lister
- [ ] `POST /api/marches` — Creer
- [ ] `GET /api/marches/compteurs` — Compteurs
- [ ] `GET /api/marches/projets` — Lister Projets
- [ ] `POST /api/marches/projets` — Creer Projet
- [ ] `DELETE /api/marches/projets/{id_}` — Effacer Projet
- [ ] `GET /api/marches/projets/{id_}` — Detail Projet
- [ ] `PUT /api/marches/projets/{id_}` — Modifier Projet
- [ ] `POST /api/marches/projets/{id_}/etat` — Etat Projet
- [ ] `DELETE /api/marches/{id_}` — Effacer
- [ ] `GET /api/marches/{id_}` — Detail
- [ ] `PUT /api/marches/{id_}` — Modifier
- [ ] `DELETE /api/marches/{id_}/document` — Retirer Document
- [ ] `POST /api/marches/{id_}/document` — Document
- [ ] `POST /api/marches/{id_}/etat` — Etat Marche

## Messagerie (5)

- [ ] `GET /api/messages` — Mon Fil
- [ ] `POST /api/messages` — Ecrire
- [ ] `GET /api/messages/fils` — Fils
- [ ] `GET /api/messages/fils/{membre_id}` — Fil Membre
- [ ] `POST /api/messages/fils/{membre_id}` — Repondre

## Paiements (6)

- [ ] `GET /api/paiements` — Lister
- [ ] `POST /api/paiements` — Declarer
- [ ] `GET /api/paiements/miens` — Mes Paiements
- [ ] `GET /api/paiements/preparer` — Preparer
- [ ] `POST /api/paiements/{id_}/confirmer` — Confirmer
- [ ] `POST /api/paiements/{id_}/rejeter` — Rejeter

## Partenariat & troc (8)

- [ ] `GET /api/partenariats` — Lister
- [ ] `POST /api/partenariats` — Creer
- [ ] `GET /api/partenariats/compteur` — Compteur
- [ ] `DELETE /api/partenariats/{id_}` — Effacer
- [ ] `GET /api/partenariats/{id_}` — Detail
- [ ] `PUT /api/partenariats/{id_}` — Modifier
- [ ] `POST /api/partenariats/{id_}/etat` — Etat
- [ ] `POST /api/partenariats/{id_}/interet` — Manifester

## Petites annonces (14)

- [ ] `GET /api/annonces` — Lister
- [ ] `POST /api/annonces` — Creer
- [ ] `GET /api/annonces/compteurs` — Compteurs
- [ ] `GET /api/annonces/encarts` — Encarts
- [ ] `GET /api/annonces/panier` — Panier
- [ ] `DELETE /api/annonces/panier/{ligne_id}` — Retirer
- [ ] `PUT /api/annonces/panier/{ligne_id}` — Changer Quantite
- [ ] `DELETE /api/annonces/{id_}` — Effacer
- [ ] `GET /api/annonces/{id_}` — Detail
- [ ] `PUT /api/annonces/{id_}` — Modifier
- [ ] `POST /api/annonces/{id_}/etat` — Etat
- [ ] `POST /api/annonces/{id_}/interet` — Manifester
- [ ] `POST /api/annonces/{id_}/panier` — Ajouter Au Panier
- [ ] `POST /api/annonces/{id_}/photo` — Photo

## Publicités (9)

- [ ] `GET /api/publicites` — Lister
- [ ] `POST /api/publicites` — Creer
- [ ] `GET /api/publicites/choix` — Choix
- [ ] `GET /api/publicites/diffusion` — Diffusion
- [ ] `DELETE /api/publicites/{id_}` — Effacer
- [ ] `GET /api/publicites/{id_}` — Detail
- [ ] `PUT /api/publicites/{id_}` — Modifier
- [ ] `POST /api/publicites/{id_}/etat` — Etat
- [ ] `POST /api/publicites/{id_}/fichier` — Fichier

## Questions & conseils (12)

- [ ] `GET /api/questions` — Lister
- [ ] `POST /api/questions` — Creer
- [ ] `GET /api/questions/compteurs` — Compteurs
- [ ] `GET /api/questions/derniers` — Derniers
- [ ] `DELETE /api/questions/reponses/{rid}` — Effacer Reponse
- [ ] `PUT /api/questions/reponses/{rid}` — Modifier Reponse
- [ ] `POST /api/questions/reponses/{rid}/etat` — Etat Reponse
- [ ] `DELETE /api/questions/{id_}` — Effacer
- [ ] `GET /api/questions/{id_}` — Detail
- [ ] `PUT /api/questions/{id_}` — Modifier
- [ ] `POST /api/questions/{id_}/etat` — Etat
- [ ] `POST /api/questions/{id_}/reponses` — Repondre

## Référentiels (10)

- [ ] `GET /api/referentiels/a-la-une` — A La Une
- [ ] `GET /api/referentiels/banques` — Banques
- [ ] `GET /api/referentiels/diplomes` — Diplomes
- [ ] `GET /api/referentiels/enums` — Enumerations
- [ ] `GET /api/referentiels/familles-articles` — Familles Articles
- [ ] `GET /api/referentiels/parametres` — Parametres
- [ ] `GET /api/referentiels/secteurs` — Secteurs
- [ ] `GET /api/referentiels/stats` — Stats
- [ ] `GET /api/referentiels/villes` — Villes
- [ ] `POST /api/visites` — Journaliser Visite

## Réussites (9)

- [ ] `GET /api/reussites` — Lister
- [ ] `POST /api/reussites` — Creer
- [ ] `GET /api/reussites/compteurs` — Compteurs
- [ ] `GET /api/reussites/moi` — Ma Fiche
- [ ] `DELETE /api/reussites/{id_}` — Effacer
- [ ] `GET /api/reussites/{id_}` — Detail
- [ ] `PUT /api/reussites/{id_}` — Modifier
- [ ] `POST /api/reussites/{id_}/etat` — Etat
- [ ] `POST /api/reussites/{id_}/photo` — Photo

## Suggestions (4)

- [ ] `GET /api/suggestions` — Lister
- [ ] `POST /api/suggestions` — Deposer
- [ ] `GET /api/suggestions/compteurs` — Compteurs
- [ ] `POST /api/suggestions/{id_}/etat` — Etat

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
