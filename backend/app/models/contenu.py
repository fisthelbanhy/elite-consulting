"""Contenus communautaires et communication (legacy : conseil, soungangai, maladie, dialogue,
message, contact, suggestion, publicite)."""

from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Horodatage
from app.enums import Confidentialite, Etat, Module
from app.models.membres import Membre


class Conseil(Horodatage, Base):
    """Forum « Informations utiles » : un sujet (sujet_id NULL) et ses réponses."""

    __tablename__ = "conseil"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    sujet_id: Mapped[int | None] = mapped_column(ForeignKey("conseil.id"), index=True)
    objet: Mapped[str] = mapped_column(Text, default="")
    texte: Mapped[str] = mapped_column(Text, default="")
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    confidentialite: Mapped[int] = mapped_column(SmallInteger, default=Confidentialite.PUBLIC)
    nombre_reponses: Mapped[int] = mapped_column(default=0)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    auteur: Mapped[Membre | None] = relationship()
    reponses: Mapped[list["Conseil"]] = relationship(order_by="Conseil.date_creation")


class Soungangai(Horodatage, Base):
    """Questionnaire « Découverte de soi » (1 par membre). Les booléens Oui/Non du legacy
    (1=Oui, 2=Non, 0=non renseigné) sont conservés en SmallInteger."""

    __tablename__ = "soungangai"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), unique=True)
    reference: Mapped[str] = mapped_column(String(20), default="")
    activite_actuelle: Mapped[str] = mapped_column(Text, default="")  # zone01
    savoir_faire: Mapped[str] = mapped_column(Text, default="")  # zone02
    activite_quotidienne: Mapped[str] = mapped_column(Text, default="")  # zone03
    secret_a_partager: Mapped[str] = mapped_column(Text, default="")  # zone04
    origine_idee: Mapped[str] = mapped_column(Text, default="")  # zone05
    idee_vue_chez_autrui: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone06
    participation_idee_tierce: Mapped[str] = mapped_column(Text, default="")  # zone07
    est_sociable: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone08
    interet_pour_autrui: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone09
    a_deja_fait_commerce: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone10
    se_fait_des_amis: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone11
    garde_ses_relations: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone12
    percu_comme_ouvert: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone13
    perception_par_autrui: Mapped[str] = mapped_column(Text, default="")  # zone14
    est_meneur: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone15
    prefere_entourage: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone16
    a_des_amis_proches: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone17
    entourage_valorise_activite: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone18
    entourage_proche: Mapped[str] = mapped_column(Text, default="")  # zone19
    personnes_consideration: Mapped[str] = mapped_column(Text, default="")  # zone20
    motivation: Mapped[str] = mapped_column(Text, default="")  # zone21
    pourcentage_implication: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone22
    moyens_disponibles: Mapped[str] = mapped_column(Text, default="")  # zone23
    soutien_conjoint: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone24
    origine_soutien: Mapped[str] = mapped_column(Text, default="")  # zone25
    confronte_aux_faits: Mapped[int] = mapped_column(SmallInteger, default=0)  # zone26
    notes_membre: Mapped[str] = mapped_column(Text, default="")  # zone27
    notes_conseillere: Mapped[str] = mapped_column(Text, default="")  # zone28 (gestionnaire seul)
    etat_fiche: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)  # zone29
    cloturee: Mapped[int] = mapped_column(SmallInteger, default=2)  # zone30 (OuiNon)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)
    # Diagnostic gratuit (nouveau, ADR-0008) : réponses, profil et étapes recommandées
    diagnostic: Mapped[dict | None] = mapped_column(JSON)
    date_diagnostic: Mapped[datetime | None] = mapped_column(DateTime)

    membre: Mapped[Membre] = relationship()


class Maladie(Base):
    """Fiche santé & bien-être : maladie + jusqu'à 5 produits conseillés avec posologie."""

    __tablename__ = "maladie"

    id: Mapped[int] = mapped_column(primary_key=True)
    libelle: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    produits: Mapped[list["MaladieProduit"]] = relationship(
        back_populates="maladie", order_by="MaladieProduit.ordre", cascade="all, delete-orphan"
    )


class MaladieProduit(Base):
    __tablename__ = "maladie_produit"

    id: Mapped[int] = mapped_column(primary_key=True)
    maladie_id: Mapped[int] = mapped_column(ForeignKey("maladie.id", ondelete="CASCADE"))
    produit_id: Mapped[int] = mapped_column(ForeignKey("produit.id"))
    posologie: Mapped[str] = mapped_column(Text, default="")
    ordre: Mapped[int] = mapped_column(SmallInteger, default=1)

    maladie: Mapped[Maladie] = relationship(back_populates="produits")
    produit: Mapped["Produit"] = relationship()  # noqa: F821


class Dialogue(Base):
    """Échanges contextuels par rubrique (accueil, sous-onglets de trésorerie…).
    `destinataire_id` NULL = adressé à la frangine (pool des gestionnaires)."""

    __tablename__ = "dialogue"

    id: Mapped[int] = mapped_column(primary_key=True)
    auteur_id: Mapped[int] = mapped_column(ForeignKey("membre.id"))
    destinataire_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    type_dialogue: Mapped[int] = mapped_column(SmallInteger, default=0, index=True)
    texte: Mapped[str] = mapped_column(Text)
    date_message: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    auteur: Mapped[Membre] = relationship(foreign_keys=[auteur_id])
    destinataire: Mapped[Membre | None] = relationship(foreign_keys=[destinataire_id])


class Message(Base):
    """Messagerie privée membre ↔ la frangine. Le fil appartient au membre `membre_id` ;
    `de_la_frangine` indique le sens du message."""

    __tablename__ = "message"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    de_la_frangine: Mapped[bool] = mapped_column(default=False)
    texte: Mapped[str] = mapped_column(Text)
    date_message: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    lu: Mapped[bool] = mapped_column(default=False)

    membre: Mapped[Membre] = relationship(foreign_keys=[membre_id])
    auteur: Mapped[Membre | None] = relationship(foreign_keys=[auteur_id])


class Contact(Base):
    """Formulaire de contact (visiteurs et membres) + réponse du gestionnaire par e-mail."""

    __tablename__ = "contact"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    nom: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    telephone: Mapped[str] = mapped_column(String(20), default="")
    objet: Mapped[str] = mapped_column(Text, default="")
    texte: Mapped[str] = mapped_column(Text, default="")
    date_envoi: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    reponse: Mapped[str] = mapped_column(Text, default="")
    date_reponse: Mapped[datetime | None] = mapped_column(DateTime)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()


class Suggestion(Base):
    """Boîte à idées (anonyme, comme le legacy)."""

    __tablename__ = "suggestion"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    module: Mapped[int] = mapped_column(SmallInteger, default=Module.TOUS)
    texte: Mapped[str] = mapped_column(Text)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)


class Publicite(Horodatage, Base):
    """Encart publicitaire (image, son ou vidéo) diffusé aléatoirement entre deux dates."""

    __tablename__ = "publicite"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="")
    demandeur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    entreprise_id: Mapped[int | None] = mapped_column(ForeignKey("entreprise.id"))
    objet: Mapped[str] = mapped_column(Text, default="")
    texte: Mapped[str] = mapped_column(Text, default="")
    lien: Mapped[str] = mapped_column(String(255), default="")
    date_debut: Mapped[date | None] = mapped_column(Date)
    date_fin: Mapped[date | None] = mapped_column(Date)
    type_fichier: Mapped[int] = mapped_column(SmallInteger, default=0)
    fichier: Mapped[str | None] = mapped_column(String(255))
    nombre_vues: Mapped[int] = mapped_column(default=0)
    date_derniere_vue: Mapped[datetime | None] = mapped_column(DateTime)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    demandeur: Mapped[Membre | None] = relationship()
    entreprise: Mapped["Entreprise | None"] = relationship()  # noqa: F821
