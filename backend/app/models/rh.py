"""Ressources humaines et expressions d'intérêt (legacy : humaine, besoin)."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Consultable, Horodatage
from app.enums import Etat, Sexe, TypeInteret
from app.models.core import DomaineActivite, SecteurActivite
from app.models.membres import Membre


class AnnonceEmploi(Horodatage, Consultable, Base):
    """Demande d'emploi (type 1, réf. DEI…) ou offre d'emploi (type 2, réf. OE1…)."""

    __tablename__ = "annonce_emploi"

    id: Mapped[int] = mapped_column(primary_key=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    type_annonce: Mapped[int] = mapped_column(SmallInteger, index=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    secteur_id: Mapped[int | None] = mapped_column(ForeignKey("secteur_activite.id"))
    domaine_id: Mapped[int | None] = mapped_column(ForeignKey("domaine_activite.id"))
    nom: Mapped[str] = mapped_column(String(80), default="")
    prenom: Mapped[str] = mapped_column(String(80), default="")
    sexe: Mapped[int] = mapped_column(SmallInteger, default=Sexe.INDEFINI)
    date_naissance: Mapped[date | None] = mapped_column(Date)
    adresse: Mapped[str] = mapped_column(Text, default="")
    telephone: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    diplomes: Mapped[str] = mapped_column(Text, default="")
    savoir_faire: Mapped[str] = mapped_column(Text, default="")
    experience: Mapped[str] = mapped_column(Text, default="")
    experience_2: Mapped[str] = mapped_column(Text, default="")
    competences: Mapped[str] = mapped_column(Text, default="")
    poste_a_pourvoir: Mapped[str] = mapped_column(Text, default="")
    autres_informations: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str | None] = mapped_column(String(255))
    cv: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    auteur: Mapped[Membre | None] = relationship()
    secteur: Mapped[SecteurActivite | None] = relationship()
    domaine: Mapped[DomaineActivite | None] = relationship()


class Interet(Base):
    """Expression de besoin ou d'intérêt déposée par un membre sous une fiche
    (annonce d'emploi, bien immobilier, article, partenariat). Une seule cible par ligne.
    `type_objet` reprend `besoin.typebsn` du legacy."""

    __tablename__ = "interet"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_objet: Mapped[int] = mapped_column(SmallInteger)
    sous_type: Mapped[int] = mapped_column(SmallInteger, default=TypeInteret.INTERESSEMENT)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    annonce_emploi_id: Mapped[int | None] = mapped_column(ForeignKey("annonce_emploi.id"), index=True)
    immobilier_id: Mapped[int | None] = mapped_column(ForeignKey("immobilier.id"), index=True)
    article_id: Mapped[int | None] = mapped_column(ForeignKey("article.id"), index=True)
    partenariat_id: Mapped[int | None] = mapped_column(ForeignKey("partenariat.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()
