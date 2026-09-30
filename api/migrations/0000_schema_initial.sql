CREATE TABLE `article` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`famille_id` integer,
	`offre_ou_recherche` integer DEFAULT 1 NOT NULL,
	`libelle` text NOT NULL,
	`prix` integer DEFAULT 0 NOT NULL,
	`quantite` integer DEFAULT 0 NOT NULL,
	`neuf_ou_occasion` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photo` text,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`famille_id`) REFERENCES `famille_article`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_article_reference` ON `article` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_article_offre_ou_recherche` ON `article` (`offre_ou_recherche`);--> statement-breakpoint
CREATE TABLE `article_course` (
	`id` integer PRIMARY KEY NOT NULL,
	`boutique_id` integer,
	`code` text DEFAULT '' NOT NULL,
	`nom` text NOT NULL,
	`marque` text DEFAULT '' NOT NULL,
	`prix` integer DEFAULT 0 NOT NULL,
	`disponible` integer DEFAULT 1 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photo` text,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`boutique_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_article_course_boutique_id` ON `article_course` (`boutique_id`);--> statement-breakpoint
CREATE TABLE `course` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`client_id` integer,
	`boutique_id` integer,
	`lieu_achat` text DEFAULT '' NOT NULL,
	`date_achat` DATE,
	`date_livraison` DATETIME,
	`lieu_livraison` text DEFAULT '' NOT NULL,
	`montant_achats` integer DEFAULT 0 NOT NULL,
	`frais_service` integer DEFAULT 0 NOT NULL,
	`mode_paiement` integer DEFAULT 0 NOT NULL,
	`paye` integer DEFAULT 2 NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat_course` integer DEFAULT 1 NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`boutique_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_course_reference` ON `course` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_course_client_id` ON `course` (`client_id`);--> statement-breakpoint
CREATE TABLE `immobilier` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`offre_ou_recherche` integer DEFAULT 1 NOT NULL,
	`type_transaction` integer DEFAULT 0 NOT NULL,
	`type_bien` integer DEFAULT 0 NOT NULL,
	`quartier_id` integer,
	`localisation` text DEFAULT '' NOT NULL,
	`surface_m2` integer DEFAULT 0 NOT NULL,
	`nombre_pieces` integer DEFAULT 0 NOT NULL,
	`nombre_chambres` integer DEFAULT 0 NOT NULL,
	`situation` integer DEFAULT 1 NOT NULL,
	`prix` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photo` text,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quartier_id`) REFERENCES `quartier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_immobilier_reference` ON `immobilier` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_immobilier_offre_ou_recherche` ON `immobilier` (`offre_ou_recherche`);--> statement-breakpoint
CREATE TABLE `ligne_course` (
	`id` integer PRIMARY KEY NOT NULL,
	`course_id` integer NOT NULL,
	`article_catalogue_id` integer,
	`nom_article` text DEFAULT '' NOT NULL,
	`prix_plafond` integer DEFAULT 0 NOT NULL,
	`quantite` integer DEFAULT 1 NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_catalogue_id`) REFERENCES `article_course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ligne_panier` (
	`id` integer PRIMARY KEY NOT NULL,
	`type_objet` integer NOT NULL,
	`membre_id` integer NOT NULL,
	`produit_id` integer,
	`article_id` integer,
	`quantite` integer DEFAULT 1 NOT NULL,
	`prix_unitaire` integer DEFAULT 0 NOT NULL,
	`date_ajout` DATETIME NOT NULL,
	`paye` integer DEFAULT false NOT NULL,
	`date_paiement` DATE,
	`paiement_id` integer,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`produit_id`) REFERENCES `produit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paiement_id`) REFERENCES `paiement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_ligne_panier_membre_id` ON `ligne_panier` (`membre_id`);--> statement-breakpoint
CREATE TABLE `paiement` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer,
	`type_objet` integer NOT NULL,
	`objet_id` integer,
	`date_paiement` DATETIME NOT NULL,
	`mode` integer NOT NULL,
	`montant` integer NOT NULL,
	`remarque` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	`confirme_par_id` integer,
	`date_confirmation` DATETIME,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confirme_par_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_paiement_membre_id` ON `paiement` (`membre_id`);--> statement-breakpoint
CREATE INDEX `ix_paiement_etat` ON `paiement` (`etat`);--> statement-breakpoint
CREATE TABLE `produit` (
	`id` integer PRIMARY KEY NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`reference` text DEFAULT '' NOT NULL,
	`nom` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`groupe` integer DEFAULT 0 NOT NULL,
	`prix_distributeur` integer DEFAULT 0 NOT NULL,
	`prix_non_distributeur` integer DEFAULT 0 NOT NULL,
	`prix_public` integer DEFAULT 0 NOT NULL,
	`quantite_stock` integer DEFAULT 0 NOT NULL,
	`photo` text,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_produit_groupe` ON `produit` (`groupe`);--> statement-breakpoint
CREATE TABLE `conseil` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`sujet_id` integer,
	`objet` text DEFAULT '' NOT NULL,
	`texte` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`confidentialite` integer DEFAULT 2 NOT NULL,
	`nombre_reponses` integer DEFAULT 0 NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`sujet_id`) REFERENCES `conseil`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_conseil_reference` ON `conseil` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_conseil_sujet_id` ON `conseil` (`sujet_id`);--> statement-breakpoint
CREATE TABLE `contact` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer,
	`nom` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`telephone` text DEFAULT '' NOT NULL,
	`objet` text DEFAULT '' NOT NULL,
	`texte` text DEFAULT '' NOT NULL,
	`date_envoi` DATETIME NOT NULL,
	`reponse` text DEFAULT '' NOT NULL,
	`date_reponse` DATETIME,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dialogue` (
	`id` integer PRIMARY KEY NOT NULL,
	`auteur_id` integer NOT NULL,
	`destinataire_id` integer,
	`type_dialogue` integer DEFAULT 0 NOT NULL,
	`texte` text NOT NULL,
	`date_message` DATETIME NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destinataire_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_dialogue_type_dialogue` ON `dialogue` (`type_dialogue`);--> statement-breakpoint
CREATE TABLE `maladie` (
	`id` integer PRIMARY KEY NOT NULL,
	`libelle` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maladie_libelle_unique` ON `maladie` (`libelle`);--> statement-breakpoint
CREATE TABLE `maladie_produit` (
	`id` integer PRIMARY KEY NOT NULL,
	`maladie_id` integer NOT NULL,
	`produit_id` integer NOT NULL,
	`posologie` text DEFAULT '' NOT NULL,
	`ordre` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`maladie_id`) REFERENCES `maladie`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produit_id`) REFERENCES `produit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer NOT NULL,
	`auteur_id` integer,
	`de_la_frangine` integer DEFAULT false NOT NULL,
	`texte` text NOT NULL,
	`date_message` DATETIME NOT NULL,
	`lu` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_message_membre_id` ON `message` (`membre_id`);--> statement-breakpoint
CREATE TABLE `publicite` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`demandeur_id` integer,
	`entreprise_id` integer,
	`objet` text DEFAULT '' NOT NULL,
	`texte` text DEFAULT '' NOT NULL,
	`lien` text DEFAULT '' NOT NULL,
	`date_debut` DATE,
	`date_fin` DATE,
	`type_fichier` integer DEFAULT 0 NOT NULL,
	`fichier` text,
	`nombre_vues` integer DEFAULT 0 NOT NULL,
	`date_derniere_vue` DATETIME,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`demandeur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `soungangai` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`membre_id` integer NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`activite_actuelle` text DEFAULT '' NOT NULL,
	`savoir_faire` text DEFAULT '' NOT NULL,
	`activite_quotidienne` text DEFAULT '' NOT NULL,
	`secret_a_partager` text DEFAULT '' NOT NULL,
	`origine_idee` text DEFAULT '' NOT NULL,
	`idee_vue_chez_autrui` integer DEFAULT 0 NOT NULL,
	`participation_idee_tierce` text DEFAULT '' NOT NULL,
	`est_sociable` integer DEFAULT 0 NOT NULL,
	`interet_pour_autrui` integer DEFAULT 0 NOT NULL,
	`a_deja_fait_commerce` integer DEFAULT 0 NOT NULL,
	`se_fait_des_amis` integer DEFAULT 0 NOT NULL,
	`garde_ses_relations` integer DEFAULT 0 NOT NULL,
	`percu_comme_ouvert` integer DEFAULT 0 NOT NULL,
	`perception_par_autrui` text DEFAULT '' NOT NULL,
	`est_meneur` integer DEFAULT 0 NOT NULL,
	`prefere_entourage` integer DEFAULT 0 NOT NULL,
	`a_des_amis_proches` integer DEFAULT 0 NOT NULL,
	`entourage_valorise_activite` integer DEFAULT 0 NOT NULL,
	`entourage_proche` text DEFAULT '' NOT NULL,
	`personnes_consideration` text DEFAULT '' NOT NULL,
	`motivation` text DEFAULT '' NOT NULL,
	`pourcentage_implication` integer DEFAULT 0 NOT NULL,
	`moyens_disponibles` text DEFAULT '' NOT NULL,
	`soutien_conjoint` integer DEFAULT 0 NOT NULL,
	`origine_soutien` text DEFAULT '' NOT NULL,
	`confronte_aux_faits` integer DEFAULT 0 NOT NULL,
	`notes_membre` text DEFAULT '' NOT NULL,
	`notes_conseillere` text DEFAULT '' NOT NULL,
	`etat_fiche` integer DEFAULT 2 NOT NULL,
	`cloturee` integer DEFAULT 2 NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	`diagnostic` JSON,
	`date_diagnostic` DATETIME,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `soungangai_membre_id_unique` ON `soungangai` (`membre_id`);--> statement-breakpoint
CREATE TABLE `suggestion` (
	`id` integer PRIMARY KEY NOT NULL,
	`date` DATETIME NOT NULL,
	`module` integer DEFAULT 8 NOT NULL,
	`texte` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `banque` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer,
	`sigle` text DEFAULT '' NOT NULL,
	`nom` text DEFAULT '' NOT NULL,
	`telephones` text DEFAULT '' NOT NULL,
	`adresse` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`site_web` text DEFAULT '' NOT NULL,
	`nom_contact` text DEFAULT '' NOT NULL,
	`telephone_contact` text DEFAULT '' NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `diplome` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`libelle` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diplome_libelle_unique` ON `diplome` (`libelle`);--> statement-breakpoint
CREATE TABLE `domaine_activite` (
	`id` integer PRIMARY KEY NOT NULL,
	`secteur_id` integer,
	`libelle` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`secteur_id`) REFERENCES `secteur_activite`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `famille_article` (
	`id` integer PRIMARY KEY NOT NULL,
	`libelle` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `famille_article_libelle_unique` ON `famille_article` (`libelle`);--> statement-breakpoint
CREATE TABLE `parametre` (
	`id` integer PRIMARY KEY NOT NULL,
	`nom_site` text DEFAULT 'La Frangine' NOT NULL,
	`adresse` text DEFAULT '' NOT NULL,
	`telephone_1` text DEFAULT '' NOT NULL,
	`telephone_2` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`texte_aide` text DEFAULT '' NOT NULL,
	`montant_minimum_placement` integer DEFAULT 0 NOT NULL,
	`montant_minimum_course` integer DEFAULT 0 NOT NULL,
	`commission_course` integer DEFAULT 0 NOT NULL,
	`conditions_course` text DEFAULT '' NOT NULL,
	`description_section_1` text DEFAULT '' NOT NULL,
	`description_section_2` text DEFAULT '' NOT NULL,
	`description_section_3` text DEFAULT '' NOT NULL,
	`description_section_4` text DEFAULT '' NOT NULL,
	`description_section_5` text DEFAULT '' NOT NULL,
	`description_section_6` text DEFAULT '' NOT NULL,
	`description_section_7` text DEFAULT '' NOT NULL,
	`module_epargne_actif` integer DEFAULT true NOT NULL,
	`module_sante_actif` integer DEFAULT true NOT NULL,
	`compteur_membre` integer DEFAULT 0 NOT NULL,
	`compteur_reference` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quartier` (
	`id` integer PRIMARY KEY NOT NULL,
	`ville_id` integer NOT NULL,
	`nom` text NOT NULL,
	FOREIGN KEY (`ville_id`) REFERENCES `ville`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `secteur_activite` (
	`id` integer PRIMARY KEY NOT NULL,
	`libelle` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ville` (
	`id` integer PRIMARY KEY NOT NULL,
	`nom` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ville_nom_unique` ON `ville` (`nom`);--> statement-breakpoint
CREATE TABLE `visite` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer,
	`date_heure` DATETIME NOT NULL,
	`adresse_ip` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_visite_date_heure` ON `visite` (`date_heure`);--> statement-breakpoint
CREATE INDEX `ix_visite_adresse_ip` ON `visite` (`adresse_ip`);--> statement-breakpoint
CREATE TABLE `entreprise` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`secteur_id` integer,
	`domaine_id` integer,
	`nom` text NOT NULL,
	`forme_juridique` integer DEFAULT 0 NOT NULL,
	`capital_social` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`commentaire` text DEFAULT '' NOT NULL,
	`gerant` text DEFAULT '' NOT NULL,
	`telephone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`site_web` text DEFAULT '' NOT NULL,
	`adresse` text DEFAULT '' NOT NULL,
	`ville_id` integer,
	`logo` text,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secteur_id`) REFERENCES `secteur_activite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domaine_id`) REFERENCES `domaine_activite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ville_id`) REFERENCES `ville`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_entreprise_reference` ON `entreprise` (`reference`);--> statement-breakpoint
CREATE TABLE `fiche_prospective` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer,
	`entreprise_id` integer NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiche_prospective_entreprise_id_unique` ON `fiche_prospective` (`entreprise_id`);--> statement-breakpoint
CREATE TABLE `ligne_prospective` (
	`id` integer PRIMARY KEY NOT NULL,
	`fiche_id` integer NOT NULL,
	`offre_ou_demande` integer NOT NULL,
	`produit_id` integer NOT NULL,
	`unite_vente` text DEFAULT '' NOT NULL,
	`prix` integer DEFAULT 0 NOT NULL,
	`fournisseur_ou_client` text DEFAULT '' NOT NULL,
	`quantite_mensuelle` integer DEFAULT 0 NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`fiche_id`) REFERENCES `fiche_prospective`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produit_id`) REFERENCES `produit_prospective`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_ligne_prospective_produit_id` ON `ligne_prospective` (`produit_id`);--> statement-breakpoint
CREATE TABLE `marche` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`numero_appel_offre` text DEFAULT '' NOT NULL,
	`type_marche` integer DEFAULT 2 NOT NULL,
	`libelle` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`montant` integer DEFAULT 0 NOT NULL,
	`date_limite` DATE,
	`dossier_a_fournir` text DEFAULT '' NOT NULL,
	`lieu_depot` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`maitre_ouvrage` text DEFAULT '' NOT NULL,
	`publie_par` text DEFAULT '' NOT NULL,
	`beneficiaire` text DEFAULT '' NOT NULL,
	`document` text,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_marche_reference` ON `marche` (`reference`);--> statement-breakpoint
CREATE TABLE `produit_prospective` (
	`id` integer PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `produit_prospective_nom_unique` ON `produit_prospective` (`nom`);--> statement-breakpoint
CREATE TABLE `projet` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`responsable` text DEFAULT '' NOT NULL,
	`promoteur` text DEFAULT '' NOT NULL,
	`objet` text DEFAULT '' NOT NULL,
	`libelle` text DEFAULT '' NOT NULL,
	`objectif` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`adresse` text DEFAULT '' NOT NULL,
	`duree_mois` integer DEFAULT 0 NOT NULL,
	`date_lancement` DATE,
	`conditions` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_projet_reference` ON `projet` (`reference`);--> statement-breakpoint
CREATE TABLE `reussite` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer NOT NULL,
	`secteur_id` integer,
	`situation_avant` text DEFAULT '' NOT NULL,
	`vision` text DEFAULT '' NOT NULL,
	`projet` text DEFAULT '' NOT NULL,
	`fond_demarrage` integer DEFAULT 0 NOT NULL,
	`besoin_reel_demarrage` integer DEFAULT 0 NOT NULL,
	`strategie` text DEFAULT '' NOT NULL,
	`difficultes` text DEFAULT '' NOT NULL,
	`deploiement_efforts` text DEFAULT '' NOT NULL,
	`succes` text DEFAULT '' NOT NULL,
	`conseil` text DEFAULT '' NOT NULL,
	`photo` text,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secteur_id`) REFERENCES `secteur_activite`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reussite_membre_id_unique` ON `reussite` (`membre_id`);--> statement-breakpoint
CREATE TABLE `bench_operation` (
	`id` integer PRIMARY KEY NOT NULL,
	`type_id` integer NOT NULL,
	`libelle` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `bench_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bench_tarif` (
	`id` integer PRIMARY KEY NOT NULL,
	`operation_id` integer NOT NULL,
	`banque_id` integer NOT NULL,
	`tarif` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bench_operation`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`banque_id`) REFERENCES `banque`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bench_type` (
	`id` integer PRIMARY KEY NOT NULL,
	`libelle` text NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conseil_finance` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`rubrique` integer DEFAULT 1 NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`sujet_id` integer,
	`objet` text DEFAULT '' NOT NULL,
	`texte` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`auteur_sujet_id` integer,
	`confidentialite` integer DEFAULT 2 NOT NULL,
	`nombre_reponses` integer DEFAULT 0 NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`sujet_id`) REFERENCES `conseil_finance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_sujet_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_conseil_finance_rubrique` ON `conseil_finance` (`rubrique`);--> statement-breakpoint
CREATE INDEX `ix_conseil_finance_reference` ON `conseil_finance` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_conseil_finance_sujet_id` ON `conseil_finance` (`sujet_id`);--> statement-breakpoint
CREATE TABLE `contentieux_credit` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`date_dossier` DATETIME NOT NULL,
	`dette_compromise` integer DEFAULT 0 NOT NULL,
	`dette_compromise_detail` text DEFAULT '' NOT NULL,
	`revenus_journaliers` integer DEFAULT 0 NOT NULL,
	`revenus_journaliers_detail` text DEFAULT '' NOT NULL,
	`revenus_hebdomadaires` integer DEFAULT 0 NOT NULL,
	`revenus_hebdomadaires_detail` text DEFAULT '' NOT NULL,
	`revenus_mensuels` integer DEFAULT 0 NOT NULL,
	`revenus_mensuels_detail` text DEFAULT '' NOT NULL,
	`charges_fixes` integer DEFAULT 0 NOT NULL,
	`charges_fixes_detail` text DEFAULT '' NOT NULL,
	`charges_variables` integer DEFAULT 0 NOT NULL,
	`charges_variables_detail` text DEFAULT '' NOT NULL,
	`activites_en_cours` text DEFAULT '' NOT NULL,
	`entrees_activite_en_cours` integer DEFAULT 0 NOT NULL,
	`entrees_activite_en_cours_detail` text DEFAULT '' NOT NULL,
	`activite_previsionnelle` text DEFAULT '' NOT NULL,
	`entrees_previsionnelles` integer DEFAULT 0 NOT NULL,
	`entrees_previsionnelles_detail` text DEFAULT '' NOT NULL,
	`entrees_totales` integer DEFAULT 0 NOT NULL,
	`entrees_totales_detail` text DEFAULT '' NOT NULL,
	`echeance_actuelle` text DEFAULT '' NOT NULL,
	`echeance_supportable` integer DEFAULT 0 NOT NULL,
	`echeance_supportable_detail` text DEFAULT '' NOT NULL,
	`elements_favorables` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_contentieux_credit_reference` ON `contentieux_credit` (`reference`);--> statement-breakpoint
CREATE TABLE `demande_credit` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`date_demande` DATE NOT NULL,
	`montant` integer DEFAULT 0 NOT NULL,
	`objet` text DEFAULT '' NOT NULL,
	`duree_mois` integer DEFAULT 0 NOT NULL,
	`niveau_realisation` real DEFAULT 0 NOT NULL,
	`garantie` text DEFAULT '' NOT NULL,
	`delai_reponse_jours` integer DEFAULT 0 NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`devis_global` text DEFAULT '' NOT NULL,
	`apport_propre` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_demande_credit_reference` ON `demande_credit` (`reference`);--> statement-breakpoint
CREATE TABLE `dossier_accompagnement` (
	`id` integer PRIMARY KEY NOT NULL,
	`type_dossier` integer NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`date_creation` DATETIME NOT NULL,
	`objet` text DEFAULT '' NOT NULL,
	`reponses` JSON NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_dossier_accompagnement_type_dossier` ON `dossier_accompagnement` (`type_dossier`);--> statement-breakpoint
CREATE INDEX `ix_dossier_accompagnement_reference` ON `dossier_accompagnement` (`reference`);--> statement-breakpoint
CREATE TABLE `operation_banque` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`date_saisie` DATETIME NOT NULL,
	`date_operation` DATE,
	`montant` integer DEFAULT 0 NOT NULL,
	`devise` integer DEFAULT 1 NOT NULL,
	`type_operation` integer DEFAULT 0 NOT NULL,
	`banque_emettrice_id` integer,
	`banque_emettrice_nom` text DEFAULT '' NOT NULL,
	`banque_emettrice_email` text DEFAULT '' NOT NULL,
	`beneficiaire` text DEFAULT '' NOT NULL,
	`banque_beneficiaire_id` integer,
	`banque_beneficiaire_nom` text DEFAULT '' NOT NULL,
	`banque_beneficiaire_adresse` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`banque_emettrice_id`) REFERENCES `banque`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`banque_beneficiaire_id`) REFERENCES `banque`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_operation_banque_reference` ON `operation_banque` (`reference`);--> statement-breakpoint
CREATE TABLE `placement` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`type_placement` integer DEFAULT 1 NOT NULL,
	`date_placement` DATETIME NOT NULL,
	`montant` integer DEFAULT 0 NOT NULL,
	`duree_mois` integer DEFAULT 0 NOT NULL,
	`taux` real DEFAULT 0 NOT NULL,
	`banque` text DEFAULT '' NOT NULL,
	`secteur_activite` text DEFAULT '' NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_placement_reference` ON `placement` (`reference`);--> statement-breakpoint
CREATE TABLE `appel_fond` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`entreprise_id` integer,
	`secteur_id` integer,
	`ville_id` integer,
	`nom_projet` text NOT NULL,
	`objet_projet` text DEFAULT '' NOT NULL,
	`description_activite` text DEFAULT '' NOT NULL,
	`description_projet` text DEFAULT '' NOT NULL,
	`devis_projet` integer DEFAULT 0 NOT NULL,
	`apport_fond_propre` integer DEFAULT 0 NOT NULL,
	`besoin_financement` integer DEFAULT 0 NOT NULL,
	`niveau_realisation` integer DEFAULT 0 NOT NULL,
	`nom_promoteur` text DEFAULT '' NOT NULL,
	`telephone_promoteur` text DEFAULT '' NOT NULL,
	`email_promoteur` text DEFAULT '' NOT NULL,
	`adresse_promoteur` text DEFAULT '' NOT NULL,
	`observation_gestionnaire` text DEFAULT '' NOT NULL,
	`appreciation` integer DEFAULT 0 NOT NULL,
	`montant_promis` integer DEFAULT 0 NOT NULL,
	`montant_collecte` integer DEFAULT 0 NOT NULL,
	`presentation_pdf` text,
	`photo` text,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secteur_id`) REFERENCES `secteur_activite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ville_id`) REFERENCES `ville`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_appel_fond_reference` ON `appel_fond` (`reference`);--> statement-breakpoint
CREATE TABLE `collecte_fond` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`appel_fond_id` integer NOT NULL,
	`membre_id` integer,
	`date_engagement` DATE,
	`type_apport` integer DEFAULT 1 NOT NULL,
	`montant_promis` integer DEFAULT 0 NOT NULL,
	`echeance_mois` integer DEFAULT 0 NOT NULL,
	`montant_verse` integer DEFAULT 0 NOT NULL,
	`date_dernier_versement` DATE,
	`remarque` text DEFAULT '' NOT NULL,
	`observation_mediateur` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`appel_fond_id`) REFERENCES `appel_fond`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_collecte_fond_reference` ON `collecte_fond` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_collecte_fond_appel_fond_id` ON `collecte_fond` (`appel_fond_id`);--> statement-breakpoint
CREATE TABLE `cotisation_likelemba` (
	`id` integer PRIMARY KEY NOT NULL,
	`groupe_id` integer NOT NULL,
	`adhesion_id` integer,
	`caissier_id` integer,
	`numero_recu` text DEFAULT '' NOT NULL,
	`date_paiement` DATE,
	`montant` integer DEFAULT 0 NOT NULL,
	`mode_paiement` integer DEFAULT 0 NOT NULL,
	`code_transfert` text DEFAULT '' NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	`paiement_id` integer,
	FOREIGN KEY (`groupe_id`) REFERENCES `groupe_likelemba`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adhesion_id`) REFERENCES `membre_likelemba`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`caissier_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paiement_id`) REFERENCES `paiement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_cotisation_likelemba_groupe_id` ON `cotisation_likelemba` (`groupe_id`);--> statement-breakpoint
CREATE TABLE `fond_de_soutien` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer,
	`date_souscription` DATE,
	`type_fond` integer DEFAULT 1 NOT NULL,
	`rapporteur_id` integer,
	`rapporteur_nom` text DEFAULT '' NOT NULL,
	`souscripteur_id` integer,
	`souscripteur_nom` text DEFAULT '' NOT NULL,
	`motivation` text DEFAULT '' NOT NULL,
	`montant` integer DEFAULT 0 NOT NULL,
	`duree_mois` integer DEFAULT 0 NOT NULL,
	`mode_paiement` integer DEFAULT 0 NOT NULL,
	`confirme` integer DEFAULT 2 NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rapporteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`souscripteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_fond_de_soutien_reference` ON `fond_de_soutien` (`reference`);--> statement-breakpoint
CREATE TABLE `groupe_likelemba` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`responsable_id` integer,
	`montant_cotisation` integer DEFAULT 0 NOT NULL,
	`periodicite` integer DEFAULT 1 NOT NULL,
	`date_debut` DATE,
	`observation` text DEFAULT '' NOT NULL,
	`compteur_entrees` integer DEFAULT 0 NOT NULL,
	`compteur_paiements` integer DEFAULT 0 NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`responsable_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_groupe_likelemba_code` ON `groupe_likelemba` (`code`);--> statement-breakpoint
CREATE TABLE `membre_likelemba` (
	`id` integer PRIMARY KEY NOT NULL,
	`groupe_id` integer NOT NULL,
	`membre_id` integer,
	`code` text DEFAULT '' NOT NULL,
	`date_entree` DATE,
	`observation` text DEFAULT '' NOT NULL,
	`caution_nom` text DEFAULT '' NOT NULL,
	`caution_est_membre` integer DEFAULT 1 NOT NULL,
	`caution_piece_identite` text DEFAULT '' NOT NULL,
	`caution_adresse` text DEFAULT '' NOT NULL,
	`caution_activite` text DEFAULT '' NOT NULL,
	`caution_telephone` text DEFAULT '' NOT NULL,
	`temoins` JSON NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`groupe_id`) REFERENCES `groupe_likelemba`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_membre_likelemba_groupe_id` ON `membre_likelemba` (`groupe_id`);--> statement-breakpoint
CREATE TABLE `point_caisse` (
	`id` integer PRIMARY KEY NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`date_heure` DATETIME NOT NULL,
	`operateur_id` integer,
	`membre_id` integer NOT NULL,
	`type_operation` integer NOT NULL,
	`montant` integer NOT NULL,
	`motif` text DEFAULT '' NOT NULL,
	`solde_apres` integer DEFAULT 0 NOT NULL,
	`type_caisse` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`operateur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_point_caisse_reference` ON `point_caisse` (`reference`);--> statement-breakpoint
CREATE INDEX `ix_point_caisse_date_heure` ON `point_caisse` (`date_heure`);--> statement-breakpoint
CREATE INDEX `ix_point_caisse_membre_id` ON `point_caisse` (`membre_id`);--> statement-breakpoint
CREATE TABLE `versement_collecte` (
	`id` integer PRIMARY KEY NOT NULL,
	`collecte_id` integer NOT NULL,
	`date_versement` DATE NOT NULL,
	`montant` integer NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`collecte_id`) REFERENCES `collecte_fond`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_versement_collecte_collecte_id` ON `versement_collecte` (`collecte_id`);--> statement-breakpoint
CREATE TABLE `membre` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`type_compte` integer DEFAULT 3 NOT NULL,
	`categorie` integer DEFAULT 1 NOT NULL,
	`code_membre` text DEFAULT '' NOT NULL,
	`nom` text NOT NULL,
	`pseudonyme` text DEFAULT '' NOT NULL,
	`sexe` integer DEFAULT 3 NOT NULL,
	`telephone` text DEFAULT '' NOT NULL,
	`email` text,
	`ville_id` integer,
	`adresse` text DEFAULT '' NOT NULL,
	`identifiant` text NOT NULL,
	`mot_de_passe_hash` text NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	`droit_attribution` integer DEFAULT false NOT NULL,
	`droit_caisse` integer DEFAULT false NOT NULL,
	`droit_activation` integer DEFAULT false NOT NULL,
	`numero_piece_identite` text DEFAULT '' NOT NULL,
	`employeur` text DEFAULT '' NOT NULL,
	`situation_matrimoniale` integer,
	`nombre_enfants` integer DEFAULT 0 NOT NULL,
	`forme_juridique` integer,
	`type_partenaire` integer,
	`domaine_activite_id` integer,
	`date_limite_master` DATE,
	`point_caisse_actif` integer DEFAULT false NOT NULL,
	`solde_point_caisse` integer DEFAULT 0 NOT NULL,
	`date_dernier_pointage` DATETIME,
	`code_pointage_hash` text,
	`photo` text,
	`derniere_connexion` DATETIME,
	`derniere_activite` DATETIME,
	FOREIGN KEY (`ville_id`) REFERENCES `ville`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domaine_activite_id`) REFERENCES `domaine_activite`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membre_identifiant_unique` ON `membre` (`identifiant`);--> statement-breakpoint
CREATE INDEX `ix_membre_telephone` ON `membre` (`telephone`);--> statement-breakpoint
CREATE INDEX `ix_membre_email` ON `membre` (`email`);--> statement-breakpoint
CREATE TABLE `reinitialisation_mot_de_passe` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer NOT NULL,
	`jeton_hash` text,
	`canal` text NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`date_expiration` DATETIME,
	`date_utilisation` DATETIME,
	`traitee_par_id` integer,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`traitee_par_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reinitialisation_mot_de_passe_jeton_hash_unique` ON `reinitialisation_mot_de_passe` (`jeton_hash`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer NOT NULL,
	`jeton_hash` text NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`date_expiration` DATETIME NOT NULL,
	`adresse_ip` text DEFAULT '' NOT NULL,
	`agent` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_jeton_hash_unique` ON `session` (`jeton_hash`);--> statement-breakpoint
CREATE INDEX `ix_session_membre_id` ON `session` (`membre_id`);--> statement-breakpoint
CREATE TABLE `tentative_connexion` (
	`id` integer PRIMARY KEY NOT NULL,
	`cle` text NOT NULL,
	`date_heure` DATETIME NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_tentative_connexion_cle` ON `tentative_connexion` (`cle`);--> statement-breakpoint
CREATE INDEX `ix_tentative_connexion_date_heure` ON `tentative_connexion` (`date_heure`);--> statement-breakpoint
CREATE TABLE `visite_membre` (
	`id` integer PRIMARY KEY NOT NULL,
	`membre_id` integer NOT NULL,
	`date_connexion` DATETIME NOT NULL,
	`adresse_ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_visite_membre_membre_id` ON `visite_membre` (`membre_id`);--> statement-breakpoint
CREATE TABLE `business_plan` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer NOT NULL,
	`type_activite` text DEFAULT '' NOT NULL,
	`description_projet` text DEFAULT '' NOT NULL,
	`moyens_actuels` text DEFAULT '' NOT NULL,
	`ressources_disponibles` text DEFAULT '' NOT NULL,
	`possessions` text DEFAULT '' NOT NULL,
	`organisation_actuelle` text DEFAULT '' NOT NULL,
	`organisation_souhaitee` text DEFAULT '' NOT NULL,
	`detail_besoin` text DEFAULT '' NOT NULL,
	`apport_actuel` text DEFAULT '' NOT NULL,
	`ambition` text DEFAULT '' NOT NULL,
	`strategie_resultats` text DEFAULT '' NOT NULL,
	`valeur_ajoutee` text DEFAULT '' NOT NULL,
	`prevision_ca_benefice` text DEFAULT '' NOT NULL,
	`processus_activite` text DEFAULT '' NOT NULL,
	`estimation_charges` text DEFAULT '' NOT NULL,
	`composantes_ca` text DEFAULT '' NOT NULL,
	`repartition_ca` text DEFAULT '' NOT NULL,
	`elements_environnementaux` text DEFAULT '' NOT NULL,
	`strategie_attaque` text DEFAULT '' NOT NULL,
	`devis_chiffre_besoin` text DEFAULT '' NOT NULL,
	`apport_prevu` text DEFAULT '' NOT NULL,
	`niveau_realisation` integer DEFAULT 0 NOT NULL,
	`difficultes_realisation` text DEFAULT '' NOT NULL,
	`planning_execution` text DEFAULT '' NOT NULL,
	`difficultes_futures` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_plan_membre_id_unique` ON `business_plan` (`membre_id`);--> statement-breakpoint
CREATE TABLE `partenariat` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`auteur_id` integer,
	`actif` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`recherche` text DEFAULT '' NOT NULL,
	`objectif` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_partenariat_reference` ON `partenariat` (`reference`);--> statement-breakpoint
CREATE TABLE `produit_souscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`souscription_id` integer NOT NULL,
	`produit_id` integer NOT NULL,
	`prix_unitaire` integer DEFAULT 0 NOT NULL,
	`quantite` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`souscription_id`) REFERENCES `souscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produit_id`) REFERENCES `produit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospect_souscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`souscription_id` integer NOT NULL,
	`membre_id` integer,
	`nom_prenom` text DEFAULT '' NOT NULL,
	`telephone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`commentaire` text DEFAULT '' NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`souscription_id`) REFERENCES `souscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `souscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`membre_id` integer NOT NULL,
	`objectifs` text DEFAULT '' NOT NULL,
	`mon_histoire` text DEFAULT '' NOT NULL,
	`disponibilite_hebdo` integer DEFAULT 0 NOT NULL,
	`formations` JSON NOT NULL,
	`nombre_rdv` integer DEFAULT 0 NOT NULL,
	`filleuls` JSON NOT NULL,
	`mode_souscription` integer DEFAULT 0 NOT NULL,
	`montant` integer DEFAULT 0 NOT NULL,
	`date_limite_complement` DATE,
	`etape_courante` integer DEFAULT 1 NOT NULL,
	`etat` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `souscription_membre_id_unique` ON `souscription` (`membre_id`);--> statement-breakpoint
CREATE TABLE `annonce_emploi` (
	`id` integer PRIMARY KEY NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`nombre_visites` integer DEFAULT 0 NOT NULL,
	`date_derniere_visite` DATETIME,
	`auteur_id` integer,
	`type_annonce` integer NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`secteur_id` integer,
	`domaine_id` integer,
	`nom` text DEFAULT '' NOT NULL,
	`prenom` text DEFAULT '' NOT NULL,
	`sexe` integer DEFAULT 3 NOT NULL,
	`date_naissance` DATE,
	`adresse` text DEFAULT '' NOT NULL,
	`telephone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`diplomes` text DEFAULT '' NOT NULL,
	`savoir_faire` text DEFAULT '' NOT NULL,
	`experience` text DEFAULT '' NOT NULL,
	`experience_2` text DEFAULT '' NOT NULL,
	`competences` text DEFAULT '' NOT NULL,
	`poste_a_pourvoir` text DEFAULT '' NOT NULL,
	`autres_informations` text DEFAULT '' NOT NULL,
	`photo` text,
	`cv` text,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secteur_id`) REFERENCES `secteur_activite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domaine_id`) REFERENCES `domaine_activite`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_annonce_emploi_type_annonce` ON `annonce_emploi` (`type_annonce`);--> statement-breakpoint
CREATE INDEX `ix_annonce_emploi_reference` ON `annonce_emploi` (`reference`);--> statement-breakpoint
CREATE TABLE `interet` (
	`id` integer PRIMARY KEY NOT NULL,
	`type_objet` integer NOT NULL,
	`sous_type` integer DEFAULT 2 NOT NULL,
	`membre_id` integer,
	`annonce_emploi_id` integer,
	`immobilier_id` integer,
	`article_id` integer,
	`partenariat_id` integer,
	`message` text DEFAULT '' NOT NULL,
	`date_creation` DATETIME NOT NULL,
	`etat` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`membre_id`) REFERENCES `membre`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`annonce_emploi_id`) REFERENCES `annonce_emploi`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`immobilier_id`) REFERENCES `immobilier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`partenariat_id`) REFERENCES `partenariat`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_interet_annonce_emploi_id` ON `interet` (`annonce_emploi_id`);--> statement-breakpoint
CREATE INDEX `ix_interet_immobilier_id` ON `interet` (`immobilier_id`);--> statement-breakpoint
CREATE INDEX `ix_interet_article_id` ON `interet` (`article_id`);--> statement-breakpoint
CREATE INDEX `ix_interet_partenariat_id` ON `interet` (`partenariat_id`);