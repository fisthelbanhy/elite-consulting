"""Offres financières : conseil financier, trésorerie, accompagnement, benchmarking
(legacy : conseilfinance, placement, operatbanq, demandecredit, contentcredit, acomp* ×4,
benchmarking1/2/3)."""

from datetime import date, datetime

from sqlalchemy import JSON, BigInteger, Date, DateTime, Float, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Horodatage
from app.enums import Confidentialite, Etat
from app.models.core import Banque
from app.models.membres import Membre


class ConseilFinance(Horodatage, Base):
    """Forum des offres financières (3 rubriques : conseil, rumeurs économiques, accompagnement)."""

    __tablename__ = "conseil_finance"

    id: Mapped[int] = mapped_column(primary_key=True)
    rubrique: Mapped[int] = mapped_column(SmallInteger, default=1, index=True)  # RubriqueConseilFinance
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    sujet_id: Mapped[int | None] = mapped_column(ForeignKey("conseil_finance.id"), index=True)
    objet: Mapped[str] = mapped_column(Text, default="")
    texte: Mapped[str] = mapped_column(Text, default="")
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    auteur_sujet_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    confidentialite: Mapped[int] = mapped_column(SmallInteger, default=Confidentialite.PUBLIC)
    nombre_reponses: Mapped[int] = mapped_column(default=0)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    auteur: Mapped[Membre | None] = relationship(foreign_keys=[auteur_id])
    reponses: Mapped[list["ConseilFinance"]] = relationship(order_by="ConseilFinance.date_creation")


class Placement(Base):
    """Demande de placement (dépôt à terme / investissement)."""

    __tablename__ = "placement"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    type_placement: Mapped[int] = mapped_column(SmallInteger, default=1)  # TypePlacement
    date_placement: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    duree_mois: Mapped[int] = mapped_column(SmallInteger, default=0)
    taux: Mapped[float] = mapped_column(Float, default=0)
    banque: Mapped[str] = mapped_column(String(120), default="")
    secteur_activite: Mapped[str] = mapped_column(Text, default="")
    observation: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()


class OperationBanque(Base):
    """Ordre de virement transmis à la banque par e-mail, avec suivi d'état."""

    __tablename__ = "operation_banque"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_saisie: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    date_operation: Mapped[date | None] = mapped_column(Date)
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    devise: Mapped[int] = mapped_column(SmallInteger, default=1)  # Devise
    type_operation: Mapped[int] = mapped_column(SmallInteger, default=0)  # TypeOperationBanque
    banque_emettrice_id: Mapped[int | None] = mapped_column(ForeignKey("banque.id"))
    banque_emettrice_nom: Mapped[str] = mapped_column(Text, default="")
    banque_emettrice_email: Mapped[str] = mapped_column(Text, default="")
    beneficiaire: Mapped[str] = mapped_column(Text, default="")
    banque_beneficiaire_id: Mapped[int | None] = mapped_column(ForeignKey("banque.id"))
    banque_beneficiaire_nom: Mapped[str] = mapped_column(Text, default="")
    banque_beneficiaire_adresse: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()
    banque_emettrice: Mapped[Banque | None] = relationship(foreign_keys=[banque_emettrice_id])
    banque_beneficiaire: Mapped[Banque | None] = relationship(foreign_keys=[banque_beneficiaire_id])


class DemandeCredit(Base):
    __tablename__ = "demande_credit"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_demande: Mapped[date] = mapped_column(Date, default=date.today)
    montant: Mapped[int] = mapped_column(BigInteger, default=0)
    objet: Mapped[str] = mapped_column(Text, default="")
    duree_mois: Mapped[int] = mapped_column(SmallInteger, default=0)
    niveau_realisation: Mapped[float] = mapped_column(Float, default=0)
    garantie: Mapped[str] = mapped_column(Text, default="")
    delai_reponse_jours: Mapped[int] = mapped_column(default=0)
    observation: Mapped[str] = mapped_column(Text, default="")  # + choix des banques
    devis_global: Mapped[str] = mapped_column(Text, default="")
    apport_propre: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()


class ContentieuxCredit(Base):
    """Dossier de contentieux / restructuration de dette (legacy `contentcredit`) :
    chaque montant est accompagné de son détail."""

    __tablename__ = "contentieux_credit"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_dossier: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    dette_compromise: Mapped[int] = mapped_column(BigInteger, default=0)  # zone04
    dette_compromise_detail: Mapped[str] = mapped_column(Text, default="")
    revenus_journaliers: Mapped[int] = mapped_column(BigInteger, default=0)  # zone05
    revenus_journaliers_detail: Mapped[str] = mapped_column(Text, default="")
    revenus_hebdomadaires: Mapped[int] = mapped_column(BigInteger, default=0)  # zone06
    revenus_hebdomadaires_detail: Mapped[str] = mapped_column(Text, default="")
    revenus_mensuels: Mapped[int] = mapped_column(BigInteger, default=0)  # zone07
    revenus_mensuels_detail: Mapped[str] = mapped_column(Text, default="")
    charges_fixes: Mapped[int] = mapped_column(BigInteger, default=0)  # zone08
    charges_fixes_detail: Mapped[str] = mapped_column(Text, default="")
    charges_variables: Mapped[int] = mapped_column(BigInteger, default=0)  # zone09
    charges_variables_detail: Mapped[str] = mapped_column(Text, default="")
    activites_en_cours: Mapped[str] = mapped_column(Text, default="")  # zone10
    entrees_activite_en_cours: Mapped[int] = mapped_column(BigInteger, default=0)  # zone11
    entrees_activite_en_cours_detail: Mapped[str] = mapped_column(Text, default="")
    activite_previsionnelle: Mapped[str] = mapped_column(Text, default="")  # zone12
    entrees_previsionnelles: Mapped[int] = mapped_column(BigInteger, default=0)  # zone13
    entrees_previsionnelles_detail: Mapped[str] = mapped_column(Text, default="")
    entrees_totales: Mapped[int] = mapped_column(BigInteger, default=0)  # zone14
    entrees_totales_detail: Mapped[str] = mapped_column(Text, default="")
    echeance_actuelle: Mapped[str] = mapped_column(Text, default="")  # zone15
    echeance_supportable: Mapped[int] = mapped_column(BigInteger, default=0)  # zone16
    echeance_supportable_detail: Mapped[str] = mapped_column(Text, default="")
    elements_favorables: Mapped[str] = mapped_column(Text, default="")  # zone17
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()


class DossierAccompagnement(Base):
    """Les 4 questionnaires d'accompagnement (business plan bancable, projet agricole,
    restructuration de crédit, crédit immobilier) — réponses indexées par n° de zone legacy."""

    __tablename__ = "dossier_accompagnement"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_dossier: Mapped[int] = mapped_column(SmallInteger, index=True)  # TypeAccompagnement
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    objet: Mapped[str] = mapped_column(Text, default="")  # zone03
    reponses: Mapped[dict] = mapped_column(JSON, default=dict)  # {"4": "...", "5": "..."}
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    membre: Mapped[Membre | None] = relationship()


class BenchType(Base):
    """Benchmarking bancaire niveau 1 : type d'opération (ex. « Virements »)."""

    __tablename__ = "bench_type"

    id: Mapped[int] = mapped_column(primary_key=True)
    libelle: Mapped[str] = mapped_column(Text)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    operations: Mapped[list["BenchOperation"]] = relationship(back_populates="type", order_by="BenchOperation.id")


class BenchOperation(Base):
    """Niveau 2 : opération détaillée (ex. « Virement entre les banques zone CEMAC »)."""

    __tablename__ = "bench_operation"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_id: Mapped[int] = mapped_column(ForeignKey("bench_type.id"))
    libelle: Mapped[str] = mapped_column(Text)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    type: Mapped[BenchType] = relationship(back_populates="operations")
    tarifs: Mapped[list["BenchTarif"]] = relationship(back_populates="operation")


class BenchTarif(Base):
    """Niveau 3 : tarif pratiqué par une banque pour une opération (texte libre)."""

    __tablename__ = "bench_tarif"

    id: Mapped[int] = mapped_column(primary_key=True)
    operation_id: Mapped[int] = mapped_column(ForeignKey("bench_operation.id"))
    banque_id: Mapped[int] = mapped_column(ForeignKey("banque.id"))
    tarif: Mapped[str] = mapped_column(String(100), default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    operation: Mapped[BenchOperation] = relationship(back_populates="tarifs")
    banque: Mapped[Banque] = relationship()
