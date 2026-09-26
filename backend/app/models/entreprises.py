"""Entreprises, comparateur de prix, marchés, projets, réussites (legacy : entreprise,
prospective1, prospective2, produitprospective, marche, projet, reussite)."""

from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Consultable, Horodatage
from app.enums import Etat
from app.models.core import DomaineActivite, SecteurActivite, Ville
from app.models.membres import Membre


class Entreprise(Horodatage, Consultable, Base):
    __tablename__ = "entreprise"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    secteur_id: Mapped[int | None] = mapped_column(ForeignKey("secteur_activite.id"))
    domaine_id: Mapped[int | None] = mapped_column(ForeignKey("domaine_activite.id"))
    nom: Mapped[str] = mapped_column(String(150))
    forme_juridique: Mapped[int] = mapped_column(SmallInteger, default=0)
    capital_social: Mapped[int] = mapped_column(BigInteger, default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    commentaire: Mapped[str] = mapped_column(Text, default="")
    gerant: Mapped[str] = mapped_column(String(120), default="")
    telephone: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    site_web: Mapped[str] = mapped_column(String(200), default="")
    adresse: Mapped[str] = mapped_column(Text, default="")
    ville_id: Mapped[int | None] = mapped_column(ForeignKey("ville.id"))
    logo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    membre: Mapped[Membre | None] = relationship()
    secteur: Mapped[SecteurActivite | None] = relationship()
    domaine: Mapped[DomaineActivite | None] = relationship()
    ville: Mapped[Ville | None] = relationship()


class ProduitProspective(Base):
    """Catalogue libre du comparateur de prix (créé à la volée)."""

    __tablename__ = "produit_prospective"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(200), unique=True)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)


class FicheProspective(Base):
    """Fiche comparateur de prix d'une entreprise (1 par entreprise)."""

    __tablename__ = "fiche_prospective"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    entreprise_id: Mapped[int] = mapped_column(ForeignKey("entreprise.id"), unique=True)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    entreprise: Mapped[Entreprise] = relationship()
    lignes: Mapped[list["LigneProspective"]] = relationship(
        back_populates="fiche", cascade="all, delete-orphan", order_by="LigneProspective.id"
    )


class LigneProspective(Base):
    """Offre (je vends) ou demande (j'achète) d'un produit, avec prix et volume mensuel.
    Suppression physique (comme le legacy)."""

    __tablename__ = "ligne_prospective"

    id: Mapped[int] = mapped_column(primary_key=True)
    fiche_id: Mapped[int] = mapped_column(ForeignKey("fiche_prospective.id", ondelete="CASCADE"))
    offre_ou_demande: Mapped[int] = mapped_column(SmallInteger)  # OffreDemande
    produit_id: Mapped[int] = mapped_column(ForeignKey("produit_prospective.id"), index=True)
    unite_vente: Mapped[str] = mapped_column(String(50), default="")
    prix: Mapped[int] = mapped_column(BigInteger, default=0)
    fournisseur_ou_client: Mapped[str] = mapped_column(Text, default="")
    quantite_mensuelle: Mapped[int] = mapped_column(default=0)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    fiche: Mapped[FicheProspective] = relationship(back_populates="lignes")
    produit: Mapped[ProduitProspective] = relationship()


class Marche(Horodatage, Base):
    """Appel d'offres public ou privé."""

    __tablename__ = "marche"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    numero_appel_offre: Mapped[str] = mapped_column(String(120), default="")
    type_marche: Mapped[int] = mapped_column(SmallInteger, default=2)  # Confidentialite (1 privé, 2 public)
    libelle: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    date_limite: Mapped[date | None] = mapped_column(Date)
    dossier_a_fournir: Mapped[str] = mapped_column(Text, default="")
    lieu_depot: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    maitre_ouvrage: Mapped[str] = mapped_column(Text, default="")
    publie_par: Mapped[str] = mapped_column(Text, default="")
    beneficiaire: Mapped[str] = mapped_column(Text, default="")
    document: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    auteur: Mapped[Membre | None] = relationship()


class Projet(Horodatage, Base):
    """Projet recherchant partenaires ou prestataires (onglet « Projets »)."""

    __tablename__ = "projet"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    responsable: Mapped[str] = mapped_column(Text, default="")
    promoteur: Mapped[str] = mapped_column(Text, default="")
    objet: Mapped[str] = mapped_column(Text, default="")
    libelle: Mapped[str] = mapped_column(Text, default="")
    objectif: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    adresse: Mapped[str] = mapped_column(Text, default="")
    duree_mois: Mapped[int] = mapped_column(SmallInteger, default=0)
    date_lancement: Mapped[date | None] = mapped_column(Date)
    conditions: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    auteur: Mapped[Membre | None] = relationship()


class Reussite(Horodatage, Base):
    """Témoignage de réussite entrepreneuriale (1 par membre, publié après validation)."""

    __tablename__ = "reussite"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="")
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), unique=True)
    secteur_id: Mapped[int | None] = mapped_column(ForeignKey("secteur_activite.id"))
    situation_avant: Mapped[str] = mapped_column(Text, default="")
    vision: Mapped[str] = mapped_column(Text, default="")
    projet: Mapped[str] = mapped_column(Text, default="")
    fond_demarrage: Mapped[int] = mapped_column(BigInteger, default=0)
    besoin_reel_demarrage: Mapped[int] = mapped_column(BigInteger, default=0)
    strategie: Mapped[str] = mapped_column(Text, default="")
    difficultes: Mapped[str] = mapped_column(Text, default="")
    deploiement_efforts: Mapped[str] = mapped_column(Text, default="")
    succes: Mapped[str] = mapped_column(Text, default="")
    conseil: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    membre: Mapped[Membre] = relationship()
    secteur: Mapped[SecteurActivite | None] = relationship()
