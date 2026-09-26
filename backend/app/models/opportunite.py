"""Opportunité d'affaire : souscription distributeur, business plan, partenariat & troc
(legacy : souscriptoportuniteaffaire, membreoportuniteaffaire, produitoportuniteaffaire,
businessplan, partenariat)."""

from datetime import date

from sqlalchemy import JSON, BigInteger, Date, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Horodatage
from app.enums import Etat
from app.models.commerce import Produit
from app.models.membres import Membre


class Souscription(Horodatage, Base):
    """Parcours d'adhésion distributeur (1 par membre)."""

    __tablename__ = "souscription"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="")
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), unique=True)
    objectifs: Mapped[str] = mapped_column(Text, default="")  # étape 1
    mon_histoire: Mapped[str] = mapped_column(Text, default="")  # étape 2
    disponibilite_hebdo: Mapped[int] = mapped_column(SmallInteger, default=0)  # étape 3
    # Formations : [{prestation: 1..4, date, lieu, heure}]
    formations: Mapped[list] = mapped_column(JSON, default=list)
    nombre_rdv: Mapped[int] = mapped_column(SmallInteger, default=0)  # rendez-vous individuels
    # Filleuls / intéressés : [{nom, email, adresse, montant, date_presentation}]
    filleuls: Mapped[list] = mapped_column(JSON, default=list)
    mode_souscription: Mapped[int] = mapped_column(SmallInteger, default=0)  # ModeSouscription
    montant: Mapped[int] = mapped_column(BigInteger, default=0)  # Σ kit produit
    date_limite_complement: Mapped[date | None] = mapped_column(Date)
    etape_courante: Mapped[int] = mapped_column(SmallInteger, default=1)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    membre: Mapped[Membre] = relationship()
    prospects: Mapped[list["ProspectSouscription"]] = relationship(
        back_populates="souscription", cascade="all, delete-orphan", order_by="ProspectSouscription.id"
    )
    produits: Mapped[list["ProduitSouscription"]] = relationship(
        back_populates="souscription", cascade="all, delete-orphan"
    )


class ProspectSouscription(Base):
    """Liste de noms (jusqu'à 25 prospects) du futur distributeur."""

    __tablename__ = "prospect_souscription"

    id: Mapped[int] = mapped_column(primary_key=True)
    souscription_id: Mapped[int] = mapped_column(ForeignKey("souscription.id", ondelete="CASCADE"))
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    nom_prenom: Mapped[str] = mapped_column(String(120), default="")
    telephone: Mapped[str] = mapped_column(String(30), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    commentaire: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    souscription: Mapped[Souscription] = relationship(back_populates="prospects")


class ProduitSouscription(Base):
    """Kit produit choisi à la souscription (prix figé)."""

    __tablename__ = "produit_souscription"

    id: Mapped[int] = mapped_column(primary_key=True)
    souscription_id: Mapped[int] = mapped_column(ForeignKey("souscription.id", ondelete="CASCADE"))
    produit_id: Mapped[int] = mapped_column(ForeignKey("produit.id"))
    prix_unitaire: Mapped[int] = mapped_column(BigInteger, default=0)
    quantite: Mapped[int] = mapped_column(default=1)

    souscription: Mapped[Souscription] = relationship(back_populates="produits")
    produit: Mapped[Produit] = relationship()


class BusinessPlan(Horodatage, Base):
    """Auto-diagnostic « Business Plan » (1 par membre)."""

    __tablename__ = "business_plan"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="")
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), unique=True)
    type_activite: Mapped[str] = mapped_column(Text, default="")  # zone02
    description_projet: Mapped[str] = mapped_column(Text, default="")  # zone03
    moyens_actuels: Mapped[str] = mapped_column(Text, default="")  # zone04
    ressources_disponibles: Mapped[str] = mapped_column(Text, default="")  # zone05
    possessions: Mapped[str] = mapped_column(Text, default="")  # zone06
    organisation_actuelle: Mapped[str] = mapped_column(Text, default="")  # zone07
    organisation_souhaitee: Mapped[str] = mapped_column(Text, default="")  # zone08
    detail_besoin: Mapped[str] = mapped_column(Text, default="")  # zone09
    apport_actuel: Mapped[str] = mapped_column(Text, default="")  # zone10
    ambition: Mapped[str] = mapped_column(Text, default="")  # zone11
    strategie_resultats: Mapped[str] = mapped_column(Text, default="")  # zone12
    valeur_ajoutee: Mapped[str] = mapped_column(Text, default="")  # zone13
    prevision_ca_benefice: Mapped[str] = mapped_column(Text, default="")  # zone14
    processus_activite: Mapped[str] = mapped_column(Text, default="")  # zone15
    estimation_charges: Mapped[str] = mapped_column(Text, default="")  # zone16
    composantes_ca: Mapped[str] = mapped_column(Text, default="")  # zone17
    repartition_ca: Mapped[str] = mapped_column(Text, default="")  # zone18
    elements_environnementaux: Mapped[str] = mapped_column(Text, default="")  # zone19
    strategie_attaque: Mapped[str] = mapped_column(Text, default="")  # zone20
    devis_chiffre_besoin: Mapped[str] = mapped_column(Text, default="")  # zone21
    apport_prevu: Mapped[str] = mapped_column(Text, default="")  # zone22
    niveau_realisation: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone23 (%)
    difficultes_realisation: Mapped[str] = mapped_column(Text, default="")  # zone24
    planning_execution: Mapped[str] = mapped_column(Text, default="")  # zone25
    difficultes_futures: Mapped[str] = mapped_column(Text, default="")  # zone26
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)  # zone29

    membre: Mapped[Membre] = relationship()


class Partenariat(Horodatage, Base):
    """Proposition de partenariat ou de troc : ce que j'ai (actif) / ce que je cherche."""

    __tablename__ = "partenariat"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    actif: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    recherche: Mapped[str] = mapped_column(Text, default="")
    objectif: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    auteur: Mapped[Membre | None] = relationship()
