"""Crée une base de développement utilisable **sans le dump de production** (ADR-0012).

Charge les référentiels versionnés (`fixtures/referentiels.json`), puis crée des comptes et
quelques fiches de démonstration dans chaque module. Destiné aux sessions cloud et aux nouveaux
postes ; pour travailler sur les vraies données, utiliser `reprise_legacy.py`.

Usage (depuis la racine) : npm run donnees:demo
        ou (depuis backend/) : .venv/Scripts/python scripts/donnees_demo.py
"""

import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import insert  # noqa: E402

import app.models as m  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.enums import (  # noqa: E402
    CategorieMembre,
    Confidentialite,
    Etat,
    NeufOccasion,
    OffreDemande,
    Periodicite,
    Sexe,
    SituationBien,
    TypeAnnonceRH,
    TypeApportFond,
    TypeBien,
    TypeMembre,
    TypeTransaction,
)
from app.security import hacher_mot_de_passe  # noqa: E402
from app.services.references import Prefixe, nouvelle_reference  # noqa: E402

MOT_DE_PASSE = "demo1234"
FIXTURES = Path(__file__).resolve().parent.parent.parent / "api" / "fixtures" / "referentiels.json"
AUJ = date.today()

TABLES = [
    ("parametre", m.Parametre), ("ville", m.Ville), ("quartier", m.Quartier),
    ("secteur_activite", m.SecteurActivite), ("domaine_activite", m.DomaineActivite),
    ("diplome", m.Diplome), ("famille_article", m.FamilleArticle), ("banque", m.Banque),
    ("produit", m.Produit), ("maladie", m.Maladie), ("maladie_produit", m.MaladieProduit),
]


def charger_referentiels(db) -> None:
    donnees = json.loads(FIXTURES.read_text(encoding="utf-8"))
    for nom, modele in TABLES:
        lignes = donnees.get(nom) or []
        for ligne in lignes:
            for colonne in modele.__table__.columns:
                v = ligne.get(colonne.name)
                if isinstance(v, str) and colonne.type.python_type in (date, datetime):
                    ligne[colonne.name] = datetime.fromisoformat(v) if colonne.type.python_type is datetime else date.fromisoformat(v)
        if lignes:
            db.execute(insert(modele), lignes)
    db.flush()


def membre(db, identifiant, nom, pseudonyme, **kw) -> m.Membre:
    obj = m.Membre(
        identifiant=identifiant, nom=nom, pseudonyme=pseudonyme,
        mot_de_passe_hash=hacher_mot_de_passe(MOT_DE_PASSE), etat=Etat.AUTORISE,
        categorie=kw.pop("categorie", CategorieMembre.PHYSIQUE), ville_id=kw.pop("ville_id", 2),
        sexe=kw.pop("sexe", Sexe.INDEFINI), **kw,
    )
    db.add(obj)
    db.flush()
    obj.code_membre = nouvelle_reference(db, Prefixe.MEMBRE)
    return obj


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if get_settings().environnement not in ("dev", "test"):
        sys.exit("Refusé : script réservé au développement (LF_ENVIRONNEMENT=dev).")

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    charger_referentiels(db)

    # --- Comptes -------------------------------------------------------------------------------
    frangine = membre(db, "demo.gestion", "Frangine démo", "La frangine", type_compte=TypeMembre.GESTIONNAIRE,
                      telephone="065697797", email="contact@exemple.cg", droit_attribution=True,
                      droit_caisse=True, droit_activation=True, point_caisse_actif=True,
                      code_pointage_hash=hacher_mot_de_passe("1234"), derniere_activite=datetime.now())
    grace = membre(db, "demo.membre", "Mabiala - Grace", "Grace M.", telephone="061112233",
                   email="grace@exemple.cg", sexe=Sexe.FEMININ, situation_matrimoniale=3, nombre_enfants=2)
    junior = membre(db, "demo.candidat", "Okemba - Junior", "Junior O.", telephone="065554433",
                    sexe=Sexe.MASCULIN, ville_id=3)
    societe = membre(db, "demo.entreprise", "AGRI CONGO", "AGC", categorie=CategorieMembre.MORALE,
                     telephone="066778899", email="contact@agricongo.cg", forme_juridique=2, domaine_activite_id=1)
    boutique = membre(db, "demo.boutique", "SUPER MARCHE TOTAL", "SMT", categorie=CategorieMembre.MORALE,
                      telephone="064443322", type_partenaire=2)

    # --- Entreprise, marchés, projets -----------------------------------------------------------
    entreprise = m.Entreprise(
        reference=nouvelle_reference(db, Prefixe.ENTREPRISE), membre_id=societe.id, nom="AGRI CONGO",
        secteur_id=4, domaine_id=35, forme_juridique=2, capital_social=5_000_000, ville_id=2,
        description="Production et transformation de manioc et de maïs dans le Pool.",
        gerant="Okemba Junior", telephone="066778899", email="contact@agricongo.cg",
        adresse="Route de Kinkala, Brazzaville", etat=Etat.AUTORISE)
    db.add(entreprise)
    db.flush()

    db.add(m.Marche(
        reference=nouvelle_reference(db, Prefixe.MARCHE), auteur_id=frangine.id, numero_appel_offre="AO-2026-014",
        type_marche=Confidentialite.PUBLIC, libelle="Fourniture de matériel informatique",
        description="Appel d'offres pour la fourniture de 40 ordinateurs portables et accessoires.",
        montant=45_000_000, date_limite=AUJ + timedelta(days=21), lieu_depot="Direction des marchés, Brazzaville",
        maitre_ouvrage="Ministère des PME", publie_par="La Frangine", dossier_a_fournir="RCCM, NIU, attestation fiscale",
        etat=Etat.AUTORISE))
    db.add(m.Projet(
        reference=nouvelle_reference(db, Prefixe.PROJET), auteur_id=societe.id, responsable="AGRI CONGO",
        promoteur="Okemba Junior", objet="Unité de transformation de manioc",
        libelle="Chikwangue industrielle", objectif="Produire 2 tonnes de pâte de manioc par jour",
        description="Installation d'une unité semi-industrielle à Kinkala avec 12 emplois créés.",
        duree_mois=18, date_lancement=AUJ + timedelta(days=60), conditions="Partenaires techniques et financiers",
        etat=Etat.AUTORISE))

    # --- Emplois ---------------------------------------------------------------------------------
    db.add(m.AnnonceEmploi(
        reference=nouvelle_reference(db, Prefixe.DEMANDE_EMPLOI), auteur_id=junior.id,
        type_annonce=TypeAnnonceRH.DEMANDE, domaine_id=1, secteur_id=1, nom="OKEMBA", prenom="Junior",
        sexe=Sexe.MASCULIN, date_naissance=date(1998, 4, 12), telephone="065554433",
        diplomes="Licence en gestion", competences="Comptabilité, tableur, gestion de stock",
        experience="2 ans en tenue de caisse dans une quincaillerie.", etat=Etat.AUTORISE))
    db.add(m.AnnonceEmploi(
        reference=nouvelle_reference(db, Prefixe.OFFRE_EMPLOI), auteur_id=societe.id,
        type_annonce=TypeAnnonceRH.OFFRE, domaine_id=1, secteur_id=1, poste_a_pourvoir="Chef d'équipe production",
        competences="Encadrement d'équipe, hygiène alimentaire", diplomes="BAC minimum",
        experience="3 ans en agroalimentaire", autres_informations="Poste basé à Kinkala, logement possible.",
        etat=Etat.AUTORISE))

    # --- Annonces --------------------------------------------------------------------------------
    db.add(m.Immobilier(
        reference=nouvelle_reference(db, Prefixe.IMMOBILIER), auteur_id=grace.id,
        offre_ou_recherche=OffreDemande.OFFRE, type_transaction=TypeTransaction.LOCATION,
        type_bien=TypeBien.APPARTEMENT, quartier_id=1, localisation="Bacongo, près du marché Total",
        surface_m2=75, nombre_pieces=3, nombre_chambres=2, situation=SituationBien.DISPONIBLE, prix=150_000,
        description="Appartement de 3 pièces, eau et électricité, cour fermée. Libre immédiatement.",
        etat=Etat.AUTORISE))
    db.add(m.Immobilier(
        reference=nouvelle_reference(db, Prefixe.IMMOBILIER), auteur_id=junior.id,
        offre_ou_recherche=OffreDemande.DEMANDE, type_transaction=TypeTransaction.LOCATION,
        type_bien=TypeBien.MAISON, quartier_id=1, localisation="Pointe-Noire, centre-ville", prix=100_000,
        description="Recherche maison 2 chambres à Pointe-Noire pour une famille, budget 100 000 FCFA.",
        etat=Etat.AUTORISE))
    db.add(m.Article(
        reference=nouvelle_reference(db, Prefixe.ARTICLE), auteur_id=grace.id, famille_id=1,
        offre_ou_recherche=OffreDemande.OFFRE, libelle="Sac à main en cuir", prix=25_000, quantite=4,
        neuf_ou_occasion=NeufOccasion.NEUF,
        description="Sacs à main en cuir véritable, plusieurs couleurs disponibles.", etat=Etat.AUTORISE))
    db.add(m.Partenariat(
        reference=nouvelle_reference(db, Prefixe.PARTENARIAT), auteur_id=societe.id,
        actif="120 hectares de terres cultivables à Kinkala",
        description="Terrain viabilisé, accès route, point d'eau.",
        recherche="Partenaire avec tracteur et apport de 50 000 000 FCFA",
        objectif="Transformer les 120 ha de manioc en pâte, partage des bénéfices 60/40.", etat=Etat.AUTORISE))
    for code, nom, prix in [("RIZ25", "Riz parfumé 25 kg", 22_000), ("HUI5", "Huile végétale 5 L", 7_500),
                            ("SUC1", "Sucre en poudre 1 kg", 1_200)]:
        db.add(m.ArticleCourse(boutique_id=boutique.id, code=code, nom=nom, prix=prix,
                               description="Article disponible en rayon.", etat=Etat.AUTORISE))

    # --- Financer --------------------------------------------------------------------------------
    appel = m.AppelFond(
        reference=nouvelle_reference(db, Prefixe.APPEL_FOND), auteur_id=societe.id, entreprise_id=entreprise.id,
        secteur_id=4, ville_id=2, nom_projet="Unité de pâte de manioc à Kinkala",
        objet_projet="Transformation industrielle des tubercules de manioc",
        description_activite="AGRI CONGO cultive 120 hectares de manioc et vend aujourd'hui la récolte brute.",
        description_projet="Installer une unité de transformation pour vendre de la pâte conditionnée.",
        devis_projet=221_580_000, apport_fond_propre=22_180_000, besoin_financement=50_000_000,
        niveau_realisation=50, nom_promoteur="Okemba Junior", telephone_promoteur="066778899",
        email_promoteur="contact@agricongo.cg", adresse_promoteur="Kinkala", etat=Etat.AUTORISE)
    db.add(appel)
    db.flush()
    db.add(m.CollecteFond(
        reference=nouvelle_reference(db, Prefixe.APPORT_FOND), appel_fond_id=appel.id, membre_id=grace.id,
        date_engagement=AUJ - timedelta(days=7), type_apport=TypeApportFond.CREDIT, montant_promis=2_680_000,
        echeance_mois=12, remarque="Je peux avancer la somme sur 12 mois.", etat=Etat.AUTORISE))
    appel.montant_promis = 2_680_000

    groupe = m.GroupeLikelemba(
        code=nouvelle_reference(db, Prefixe.LIKELEMBA), responsable_id=frangine.id, montant_cotisation=5_000,
        periodicite=Periodicite.SEMAINE, date_debut=AUJ - timedelta(days=30),
        observation="Likelemba des commerçantes du marché Total. Paiement par Mobile Money.",
        etat=Etat.AUTORISE)
    db.add(groupe)
    db.flush()
    adhesion = m.MembreLikelemba(
        groupe_id=groupe.id, membre_id=grace.id, code=f"1{groupe.code}", date_entree=AUJ - timedelta(days=30),
        caution_nom="Mabiala Antoine", caution_telephone="066112233", caution_activite="Transporteur",
        temoins=[{"nom": "Nsona Claire", "telephone": "065998877", "emploi": "Couturière", "est_membre": 2}],
        etat=Etat.AUTORISE)
    db.add(adhesion)
    groupe.compteur_entrees = 1
    db.flush()
    db.add(m.CotisationLikelemba(
        groupe_id=groupe.id, adhesion_id=adhesion.id, caissier_id=frangine.id, numero_recu=f"{groupe.code}P1",
        date_paiement=AUJ - timedelta(days=7), montant=5_000, etat=Etat.AUTORISE))
    groupe.compteur_paiements = 1

    # --- Se lancer et contenus --------------------------------------------------------------------
    sujet = m.Conseil(
        reference=nouvelle_reference(db, Prefixe.CONSEIL), objet="Comment créer son entreprise au Congo en 2026 ?",
        texte="Bonjour, je vends des pagnes depuis 5 ans et je voudrais me formaliser. "
              "Par où commencer, et combien cela coûte-t-il réellement ?",
        auteur_id=grace.id, confidentialite=Confidentialite.PUBLIC, nombre_reponses=1, etat=Etat.AUTORISE)
    db.add(sujet)
    db.flush()
    db.add(m.Conseil(reference=sujet.reference, sujet_id=sujet.id, auteur_id=frangine.id,
                     texte="Bonjour Grace ! Depuis décembre 2025, la création se fait en ligne à l'ACPCE. "
                           "Préparez une pièce d'identité et un justificatif d'adresse : on le fait ensemble.",
                     confidentialite=Confidentialite.PUBLIC, etat=Etat.AUTORISE))
    db.add(m.Reussite(
        reference=nouvelle_reference(db, Prefixe.REUSSITE), membre_id=grace.id, secteur_id=15,
        situation_avant="Je vendais des pagnes au marché sans stock régulier.",
        vision="Ouvrir une boutique et employer deux personnes.",
        projet="Boutique de pagnes et cosmétiques à Bacongo",
        fond_demarrage=150_000, besoin_reel_demarrage=500_000,
        strategie="J'ai rejoint une likelemba pour constituer mon stock, puis j'ai loué un local.",
        difficultes="Trouver un local abordable et gérer les crédits clients.",
        deploiement_efforts="Vente sur les réseaux sociaux et livraison à domicile.",
        succes="J'ai ouvert ma boutique en 2025 et j'emploie aujourd'hui deux personnes.",
        conseil="Commencez petit, notez chaque franc, et entourez-vous.", etat=Etat.AUTORISE))
    db.add(m.BusinessPlan(
        reference=nouvelle_reference(db, Prefixe.BUSINESS_PLAN), membre_id=grace.id,
        type_activite="Commerce de pagnes et cosmétiques",
        description_projet="Développer la boutique de Bacongo et ouvrir un point de vente à Poto-Poto.",
        moyens_actuels="Un local loué, un stock de 400 000 FCFA, une vendeuse.",
        ambition="Deux points de vente et une clientèle fidèle de 300 personnes.",
        niveau_realisation=40, etat=Etat.NON_TRAITE))
    db.add(m.Message(membre_id=grace.id, auteur_id=frangine.id, de_la_frangine=True,
                     texte="Bonjour Grace, j'ai bien reçu votre diagnostic. Je vous appelle demain matin "
                           "pour préparer votre dossier de financement."))
    db.add(m.Contact(nom="Visiteur démo", email="visiteur@exemple.cg", telephone="060001122",
                     objet="Demande d'information", texte="Bonjour, comment rejoindre une likelemba ?",
                     etat=Etat.NON_TRAITE))
    db.add(m.Suggestion(module=4, texte="Ce serait bien de recevoir un rappel WhatsApp la veille de la cotisation."))

    db.commit()

    # Schéma créé depuis les modèles : on le déclare à jour pour Alembic
    from alembic import command
    from alembic.config import Config

    command.stamp(Config(str(Path(__file__).resolve().parent.parent / "alembic.ini")), "head", purge=True)
    db.close()

    print("Base de démonstration prête.")
    print(f"  Mot de passe commun : {MOT_DE_PASSE}   (code de pointage : 1234)")
    for identifiant, role in [("demo.gestion", "gestionnaire (tous droits)"), ("demo.membre", "membre"),
                              ("demo.candidat", "membre (candidat)"), ("demo.entreprise", "entreprise"),
                              ("demo.boutique", "boutique partenaire")]:
        print(f"  {identifiant:16s} {role}")


if __name__ == "__main__":
    main()
