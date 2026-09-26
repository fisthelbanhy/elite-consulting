"""Membres, sessions, journal de connexion (legacy : membre, visitembr)."""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Horodatage
from app.enums import CategorieMembre, Etat, Sexe, TypeMembre
from app.models.core import DomaineActivite, Ville


class Membre(Horodatage, Base):
    __tablename__ = "membre"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_compte: Mapped[int] = mapped_column(SmallInteger, default=TypeMembre.MEMBRE)
    categorie: Mapped[int] = mapped_column(SmallInteger, default=CategorieMembre.PHYSIQUE)
    code_membre: Mapped[str] = mapped_column(String(20), default="")
    nom: Mapped[str] = mapped_column(String(120))  # « Nom - Prénom » ou raison sociale
    pseudonyme: Mapped[str] = mapped_column(String(50), default="")  # pseudo (physique) / sigle (morale)
    sexe: Mapped[int] = mapped_column(SmallInteger, default=Sexe.INDEFINI)
    telephone: Mapped[str] = mapped_column(String(20), default="", index=True)
    email: Mapped[str | None] = mapped_column(String(120), index=True)
    ville_id: Mapped[int | None] = mapped_column(ForeignKey("ville.id"))
    adresse: Mapped[str] = mapped_column(Text, default="")
    identifiant: Mapped[str] = mapped_column(String(50), unique=True)
    mot_de_passe_hash: Mapped[str] = mapped_column(String(255))
    observation: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    # Droits (legacy `droitmbr`, 3 caractères « Droit / Caisse / Activation » ; le 4ᵉ droit
    # « Point caisse » est la colonne `pointcaissembr` → `point_caisse_actif`)
    droit_attribution: Mapped[bool] = mapped_column(default=False)
    droit_caisse: Mapped[bool] = mapped_column(default=False)
    droit_activation: Mapped[bool] = mapped_column(default=False)

    # Personne physique
    numero_piece_identite: Mapped[str] = mapped_column(String(50), default="")
    employeur: Mapped[str] = mapped_column(String(120), default="")
    situation_matrimoniale: Mapped[int | None] = mapped_column(SmallInteger)
    nombre_enfants: Mapped[int] = mapped_column(SmallInteger, default=0)

    # Personne morale (le legacy rangeait la forme juridique dans `situatmatrimmbr`)
    forme_juridique: Mapped[int | None] = mapped_column(SmallInteger)  # FormeJuridique
    type_partenaire: Mapped[int | None] = mapped_column(SmallInteger)  # BanqueBoutique
    domaine_activite_id: Mapped[int | None] = mapped_column(ForeignKey("domaine_activite.id"))

    # Statut Master (redevance mensuelle)
    date_limite_master: Mapped[date | None] = mapped_column(Date)

    # Carte de pointage (épargne solidaire)
    point_caisse_actif: Mapped[bool] = mapped_column(default=False)
    solde_point_caisse: Mapped[int] = mapped_column(BigInteger, default=0)
    date_dernier_pointage: Mapped[datetime | None] = mapped_column(DateTime)
    code_pointage_hash: Mapped[str | None] = mapped_column(String(255))

    photo: Mapped[str | None] = mapped_column(String(255))
    derniere_connexion: Mapped[datetime | None] = mapped_column(DateTime)
    # Présence en ligne (legacy `connexmsgmbr`/`connexmsgpmt`) : actif il y a moins de 5 minutes
    derniere_activite: Mapped[datetime | None] = mapped_column(DateTime)

    ville: Mapped[Ville | None] = relationship()
    domaine_activite: Mapped[DomaineActivite | None] = relationship()

    @property
    def est_gestionnaire(self) -> bool:
        return self.type_compte == TypeMembre.GESTIONNAIRE

    @property
    def est_morale(self) -> bool:
        return self.categorie == CategorieMembre.MORALE

    def peut_moderer(self) -> bool:
        """Gestionnaire + droit « Activation » : crée, active, annule ou supprime une fiche."""
        return self.est_gestionnaire and self.droit_activation


class Session(Base):
    """Session de connexion : seul le SHA-256 du jeton est stocké (ADR-0002)."""

    __tablename__ = "session"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id", ondelete="CASCADE"), index=True)
    jeton_hash: Mapped[str] = mapped_column(String(64), unique=True)
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    date_expiration: Mapped[datetime] = mapped_column(DateTime)
    adresse_ip: Mapped[str] = mapped_column(String(64), default="")
    agent: Mapped[str] = mapped_column(String(255), default="")

    membre: Mapped[Membre] = relationship()


class TentativeConnexion(Base):
    """Échecs de connexion, pour la limitation de débit (ADR-0005)."""

    __tablename__ = "tentative_connexion"

    id: Mapped[int] = mapped_column(primary_key=True)
    cle: Mapped[str] = mapped_column(String(120), index=True)  # « id:<identifiant> » ou « ip:<ip> »
    date_heure: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)


class ReinitialisationMotDePasse(Base):
    """Demande de réinitialisation : par e-mail, ou transmise par un gestionnaire (ADR-0005)."""

    __tablename__ = "reinitialisation_mot_de_passe"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id", ondelete="CASCADE"))
    jeton_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    canal: Mapped[str] = mapped_column(String(20))  # "email" | "gestionnaire"
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    date_expiration: Mapped[datetime | None] = mapped_column(DateTime)
    date_utilisation: Mapped[datetime | None] = mapped_column(DateTime)
    traitee_par_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))

    membre: Mapped[Membre] = relationship(foreign_keys=[membre_id])


class VisiteMembre(Base):
    """Journal des connexions membres (legacy `visitembr`)."""

    __tablename__ = "visite_membre"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id", ondelete="CASCADE"), index=True)
    date_connexion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    adresse_ip: Mapped[str] = mapped_column(String(64), default="")
