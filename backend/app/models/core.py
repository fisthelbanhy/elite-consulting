"""Référentiels et paramètres globaux (legacy : parametre, ville, quartier, secteuractivite,
domaineactivite, diplome, familart, banque, visite)."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.enums import Etat


class Parametre(Base):
    """Singleton de configuration (legacy `parametre`, indexpmt=1)."""

    __tablename__ = "parametre"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom_site: Mapped[str] = mapped_column(String(100), default="La Frangine")
    adresse: Mapped[str] = mapped_column(Text, default="")
    telephone_1: Mapped[str] = mapped_column(String(20), default="")
    telephone_2: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    whatsapp: Mapped[str] = mapped_column(String(20), default="")
    texte_aide: Mapped[str] = mapped_column(Text, default="")
    montant_minimum_placement: Mapped[int] = mapped_column(BigInteger, default=0)
    montant_minimum_course: Mapped[int] = mapped_column(BigInteger, default=0)
    commission_course: Mapped[int] = mapped_column(BigInteger, default=0)
    conditions_course: Mapped[str] = mapped_column(Text, default="")
    # Textes de présentation des 7 sections (choix1pmt..choix7pmt)
    description_section_1: Mapped[str] = mapped_column(Text, default="")
    description_section_2: Mapped[str] = mapped_column(Text, default="")
    description_section_3: Mapped[str] = mapped_column(Text, default="")
    description_section_4: Mapped[str] = mapped_column(Text, default="")
    description_section_5: Mapped[str] = mapped_column(Text, default="")
    description_section_6: Mapped[str] = mapped_column(Text, default="")
    description_section_7: Mapped[str] = mapped_column(Text, default="")
    # Interrupteurs des modules à risque réglementaire (ADR-0009)
    module_epargne_actif: Mapped[bool] = mapped_column(default=True)
    module_sante_actif: Mapped[bool] = mapped_column(default=True)
    # Compteurs de séquences (formats de références identiques au legacy)
    compteur_membre: Mapped[int] = mapped_column(default=0)
    compteur_reference: Mapped[int] = mapped_column(default=0)


class Ville(Base):
    __tablename__ = "ville"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(80), unique=True)

    quartiers: Mapped[list["Quartier"]] = relationship(back_populates="ville", order_by="Quartier.nom")


class Quartier(Base):
    __tablename__ = "quartier"

    id: Mapped[int] = mapped_column(primary_key=True)
    ville_id: Mapped[int] = mapped_column(ForeignKey("ville.id"))
    nom: Mapped[str] = mapped_column(String(80))

    ville: Mapped[Ville] = relationship(back_populates="quartiers")


class SecteurActivite(Base):
    __tablename__ = "secteur_activite"

    id: Mapped[int] = mapped_column(primary_key=True)
    libelle: Mapped[str] = mapped_column(String(200))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    domaines: Mapped[list["DomaineActivite"]] = relationship(
        back_populates="secteur", order_by="DomaineActivite.libelle"
    )


class DomaineActivite(Base):
    __tablename__ = "domaine_activite"

    id: Mapped[int] = mapped_column(primary_key=True)
    secteur_id: Mapped[int | None] = mapped_column(ForeignKey("secteur_activite.id"))
    libelle: Mapped[str] = mapped_column(String(200))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    secteur: Mapped[SecteurActivite | None] = relationship(back_populates="domaines")


class Diplome(Base):
    __tablename__ = "diplome"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), default="")
    libelle: Mapped[str] = mapped_column(String(100), unique=True)


class FamilleArticle(Base):
    __tablename__ = "famille_article"

    id: Mapped[int] = mapped_column(primary_key=True)
    libelle: Mapped[str] = mapped_column(String(100), unique=True)


class Banque(Base):
    """Référentiel des banques partenaires (legacy `banque`)."""

    __tablename__ = "banque"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    sigle: Mapped[str] = mapped_column(String(30), default="")
    nom: Mapped[str] = mapped_column(String(120), default="")
    telephones: Mapped[str] = mapped_column(String(100), default="")
    adresse: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    site_web: Mapped[str] = mapped_column(String(200), default="")
    nom_contact: Mapped[str] = mapped_column(String(100), default="")
    telephone_contact: Mapped[str] = mapped_column(String(100), default="")
    observation: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)


class Visite(Base):
    """Journal des visites anonymes (1 ligne par IP et par tranche de 30 minutes)."""

    __tablename__ = "visite"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_heure: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    adresse_ip: Mapped[str] = mapped_column(String(64), default="", index=True)
