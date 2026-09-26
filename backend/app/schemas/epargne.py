"""Schémas de l'épargne solidaire : dons / placements (fond de soutien) et carte de pointage."""

from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Auteur, Liste, Schema
from app.services import fichiers


class Statut(BaseModel):
    actif: bool
    message: str
    don_minimum: int
    placement_minimum: int
    duree_min: int
    duree_max: int


class FondResume(Schema):
    id: int
    reference: str
    date_souscription: date | None
    type_fond: int
    montant: int
    duree_mois: int
    mode_paiement: int
    confirme: int
    etat: int
    rapporteur_nom: str
    souscripteur_nom: str
    motivation: str


class FondDetail(FondResume):
    membre: Auteur | None
    rapporteur: Auteur | None
    souscripteur: Auteur | None
    # Contexte du lecteur
    peut_payer: bool = False
    peut_modifier: bool = False
    peut_moderer: bool = False
    etat_paiement: int | None = None  # dernier paiement type 7 : 2 en attente, 3 confirmé
    date_paiement: datetime | None = None


class FondEntree(BaseModel):
    type_fond: int | None = None
    # Souscripteur : vide = soi-même ; sinon un membre (pseudonyme, identifiant ou téléphone)
    # ou le nom d'une personne non inscrite (legacy « Souscripteur non listé »)
    souscripteur_membre: str = Field(default="", max_length=120)
    souscripteur_nom: str = Field(default="", max_length=120)
    motivation: str = Field(default="", max_length=2000)
    montant: int = Field(default=0, ge=0)
    duree_mois: int = Field(default=0, ge=0, le=240)


class FondModification(BaseModel):
    motivation: str = Field(default="", max_length=2000)
    montant: int = Field(default=0, ge=0)
    duree_mois: int = Field(default=0, ge=0, le=240)


class MembreCourt(Schema):
    id: int
    nom: str
    pseudonyme: str


class PointageOut(Schema):
    id: int
    reference: str
    date_heure: datetime
    operateur: MembreCourt | None
    membre: MembreCourt
    type_operation: int
    montant: int
    motif: str
    solde_apres: int | None
    type_caisse: int


class ListePointages(Liste[PointageOut]):
    total_versements: int = 0
    total_retraits: int = 0
    net: int = 0
    rentabilite: int = 0  # 3 % des versements (F-S4-59)
    encaisse: int | None = None
    libelle_encaisse: str = ""
    afficher_solde: bool = False
    est_operateur: bool = False
    est_gestionnaire: bool = False
    mon_solde: int = 0
    date_dernier_pointage: datetime | None = None


class Titulaire(Schema):
    id: int
    nom: str
    pseudonyme: str
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class TitulaireDetail(Titulaire):
    solde_point_caisse: int
    date_dernier_pointage: datetime | None
    point_caisse_actif: bool
    a_un_code: bool = False


class PointageEntree(BaseModel):
    type_operation: int | None = None
    membre_id: int | None = None
    montant: int = Field(default=0, ge=0)
    motif: str = Field(default="", max_length=500)
    code_pin: str = Field(default="", max_length=12)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
