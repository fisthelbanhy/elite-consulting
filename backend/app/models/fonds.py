"""Appels de fonds, Likelemba, épargne solidaire, carte de pointage (legacy : appelfond,
collectefond, mouvcollectefond, likelemba1/2/3, fonddesoutien, pointcaisse)."""

from datetime import date, datetime

from sqlalchemy import JSON, BigInteger, Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Consultable, Horodatage
from app.enums import Etat, OuiNon
from app.models.core import SecteurActivite, Ville
from app.models.membres import Membre


class AppelFond(Horodatage, Consultable, Base):
    """Projet en recherche de financement participatif. `montant_promis` et
    `montant_collecte` sont des agrégats calculés par le service (jamais saisis)."""

    __tablename__ = "appel_fond"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    entreprise_id: Mapped[int | None] = mapped_column(ForeignKey("entreprise.id"))
    secteur_id: Mapped[int | None] = mapped_column(ForeignKey("secteur_activite.id"))
    ville_id: Mapped[int | None] = mapped_column(ForeignKey("ville.id"))
    nom_projet: Mapped[str] = mapped_column(String(150))
    objet_projet: Mapped[str] = mapped_column(Text, default="")
    description_activite: Mapped[str] = mapped_column(Text, default="")
    description_projet: Mapped[str] = mapped_column(Text, default="")
    devis_projet: Mapped[int] = mapped_column(BigInteger, default=0)
    apport_fond_propre: Mapped[int] = mapped_column(BigInteger, default=0)
    besoin_financement: Mapped[int] = mapped_column(BigInteger, default=0)
    niveau_realisation: Mapped[int] = mapped_column(SmallInteger, default=0)  # %
    nom_promoteur: Mapped[str] = mapped_column(String(120), default="")
    telephone_promoteur: Mapped[str] = mapped_column(String(20), default="")
    email_promoteur: Mapped[str] = mapped_column(String(120), default="")
    adresse_promoteur: Mapped[str] = mapped_column(Text, default="")
    observation_gestionnaire: Mapped[str] = mapped_column(Text, default="")
    appreciation: Mapped[int] = mapped_column(SmallInteger, default=0)  # note /10
    montant_promis: Mapped[int] = mapped_column(BigInteger, default=0)
    montant_collecte: Mapped[int] = mapped_column(BigInteger, default=0)
    presentation_pdf: Mapped[str | None] = mapped_column(String(255))
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    auteur: Mapped[Membre | None] = relationship()
    entreprise: Mapped["Entreprise | None"] = relationship()  # noqa: F821
    secteur: Mapped[SecteurActivite | None] = relationship()
    ville: Mapped[Ville | None] = relationship()
    engagements: Mapped[list["CollecteFond"]] = relationship(back_populates="appel_fond")


class CollecteFond(Base):
    """Engagement d'apport d'un membre sur un appel de fonds.
    État : 1 promesse, 2 validée (comptée dans « promis »), 3 annulée."""

    __tablename__ = "collecte_fond"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    appel_fond_id: Mapped[int] = mapped_column(ForeignKey("appel_fond.id"), index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_engagement: Mapped[date | None] = mapped_column(Date)
    type_apport: Mapped[int] = mapped_column(SmallInteger, default=1)  # TypeApportFond
    montant_promis: Mapped[int] = mapped_column(BigInteger, default=0)
    echeance_mois: Mapped[int] = mapped_column(SmallInteger, default=0)
    montant_verse: Mapped[int] = mapped_column(BigInteger, default=0)
    date_dernier_versement: Mapped[date | None] = mapped_column(Date)
    remarque: Mapped[str] = mapped_column(Text, default="")
    observation_mediateur: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    appel_fond: Mapped[AppelFond] = relationship(back_populates="engagements")
    membre: Mapped[Membre | None] = relationship()
    versements: Mapped[list["VersementCollecte"]] = relationship(
        back_populates="collecte", order_by="VersementCollecte.date_versement"
    )


class VersementCollecte(Base):
    """Journal des versements (legacy `mouvcollectefond`, append-only)."""

    __tablename__ = "versement_collecte"

    id: Mapped[int] = mapped_column(primary_key=True)
    collecte_id: Mapped[int] = mapped_column(ForeignKey("collecte_fond.id"), index=True)
    date_versement: Mapped[date] = mapped_column(Date, default=date.today)
    montant: Mapped[int] = mapped_column(BigInteger)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    collecte: Mapped[CollecteFond] = relationship(back_populates="versements")


class GroupeLikelemba(Base):
    """Tontine rotative (legacy `likelemba1`). Code `LKB` + mois + n + année."""

    __tablename__ = "groupe_likelemba"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), default="", index=True)
    responsable_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    montant_cotisation: Mapped[int] = mapped_column(BigInteger, default=0)
    periodicite: Mapped[int] = mapped_column(SmallInteger, default=1)  # Periodicite
    date_debut: Mapped[date | None] = mapped_column(Date)
    observation: Mapped[str] = mapped_column(Text, default="")
    compteur_entrees: Mapped[int] = mapped_column(default=0)  # génère `{n}{code}`
    compteur_paiements: Mapped[int] = mapped_column(default=0)  # génère `{code}P{n}`
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    responsable: Mapped[Membre | None] = relationship()
    adhesions: Mapped[list["MembreLikelemba"]] = relationship(back_populates="groupe")


class MembreLikelemba(Base):
    """Adhésion d'un membre à un groupe Likelemba, avec caution et 3 témoins."""

    __tablename__ = "membre_likelemba"

    id: Mapped[int] = mapped_column(primary_key=True)
    groupe_id: Mapped[int] = mapped_column(ForeignKey("groupe_likelemba.id"), index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    code: Mapped[str] = mapped_column(String(20), default="")
    date_entree: Mapped[date | None] = mapped_column(Date)
    observation: Mapped[str] = mapped_column(Text, default="")
    caution_nom: Mapped[str] = mapped_column(String(120), default="")
    caution_est_membre: Mapped[int] = mapped_column(SmallInteger, default=OuiNon.OUI)
    caution_piece_identite: Mapped[str] = mapped_column(String(50), default="")
    caution_adresse: Mapped[str] = mapped_column(Text, default="")
    caution_activite: Mapped[str] = mapped_column(Text, default="")
    caution_telephone: Mapped[str] = mapped_column(String(20), default="")
    # Témoins : liste de 3 objets {nom, telephone, emploi, est_membre}
    temoins: Mapped[list] = mapped_column(JSON, default=list)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    groupe: Mapped[GroupeLikelemba] = relationship(back_populates="adhesions")
    membre: Mapped[Membre | None] = relationship()


class CotisationLikelemba(Base):
    """Cotisation versée (legacy `likelemba3`), reçu `{code_groupe}P{n}`."""

    __tablename__ = "cotisation_likelemba"

    id: Mapped[int] = mapped_column(primary_key=True)
    groupe_id: Mapped[int] = mapped_column(ForeignKey("groupe_likelemba.id"), index=True)
    adhesion_id: Mapped[int | None] = mapped_column(ForeignKey("membre_likelemba.id"))
    caissier_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    numero_recu: Mapped[str] = mapped_column(String(30), default="")
    date_paiement: Mapped[date | None] = mapped_column(Date)
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    mode_paiement: Mapped[int] = mapped_column(SmallInteger, default=0)
    code_transfert: Mapped[str] = mapped_column(String(30), default="")
    observation: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)
    # Paiement (type 5) à l'origine de la cotisation : permet d'annuler la bonne cotisation si la
    # caisse rejette le paiement (ADR-0007 S3b/S4b). Vide pour les cotisations reprises du legacy.
    paiement_id: Mapped[int | None] = mapped_column(ForeignKey("paiement.id"))

    groupe: Mapped[GroupeLikelemba] = relationship()
    adhesion: Mapped[MembreLikelemba | None] = relationship()
    caissier: Mapped[Membre | None] = relationship()


class FondDeSoutien(Base):
    """Épargne solidaire : don ou placement, souscrit par un « rapporteur » au nom d'un
    « souscripteur » (qui peut être lui-même)."""

    __tablename__ = "fond_de_soutien"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_souscription: Mapped[date | None] = mapped_column(Date)
    type_fond: Mapped[int] = mapped_column(SmallInteger, default=1)  # DonPlacement
    rapporteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    rapporteur_nom: Mapped[str] = mapped_column(String(120), default="")
    souscripteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    souscripteur_nom: Mapped[str] = mapped_column(String(120), default="")
    motivation: Mapped[str] = mapped_column(Text, default="")
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    duree_mois: Mapped[int] = mapped_column(SmallInteger, default=0)
    mode_paiement: Mapped[int] = mapped_column(SmallInteger, default=0)
    confirme: Mapped[int] = mapped_column(SmallInteger, default=OuiNon.NON)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship(foreign_keys=[membre_id])
    rapporteur: Mapped[Membre | None] = relationship(foreign_keys=[rapporteur_id])
    souscripteur: Mapped[Membre | None] = relationship(foreign_keys=[souscripteur_id])


class PointCaisse(Base):
    """Journal append-only des mouvements de carte de pointage. Le solde courant vit dans
    `membre.solde_point_caisse` ; `solde_apres` est une copie figée."""

    __tablename__ = "point_caisse"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    date_heure: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    operateur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), index=True)
    type_operation: Mapped[int] = mapped_column(SmallInteger)  # VersementRetrait
    montant: Mapped[int] = mapped_column(BigInteger)
    motif: Mapped[str] = mapped_column(Text, default="")
    solde_apres: Mapped[int] = mapped_column(BigInteger, default=0)
    type_caisse: Mapped[int] = mapped_column(SmallInteger, default=1)  # TypeCaisse

    operateur: Mapped[Membre | None] = relationship(foreign_keys=[operateur_id])
    membre: Mapped[Membre] = relationship(foreign_keys=[membre_id])
