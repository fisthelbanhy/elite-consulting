"""Schémas des appels de fonds (financement participatif) et des engagements d'apport."""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.schemas.commun import Auteur, Schema
from app.services import fichiers


class SecteurCourt(Schema):
    id: int
    libelle: str


class VilleCourte(Schema):
    id: int
    nom: str


class EntrepriseCourte(Schema):
    id: int
    nom: str


class ContactMembre(Schema):
    """Identité et coordonnées d'un membre : réservées au porteur du projet et aux gestionnaires."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None


class ProjetResume(Schema):
    id: int
    reference: str
    nom_projet: str
    objet_projet: str
    secteur: SecteurCourt | None
    ville: VilleCourte | None
    devis_projet: int
    apport_fond_propre: int
    besoin_financement: int
    niveau_realisation: int
    montant_promis: int
    montant_collecte: int
    appreciation: int
    etat: int
    date_creation: datetime | None
    nombre_visites: int
    photo: str | None
    # Promoteur : auteur et gestionnaires seulement (F-S4-07)
    nom_promoteur: str | None = None
    est_auteur: bool = False

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)

    @computed_field
    @property
    def reste_a_collecter(self) -> int:
        return max(0, self.besoin_financement - self.montant_collecte)


class ProjetCourt(Schema):
    id: int
    reference: str
    nom_projet: str
    besoin_financement: int
    montant_promis: int
    montant_collecte: int
    etat: int


class VersementOut(Schema):
    id: int
    date_versement: date
    montant: int
    etat: int


class ApportResume(Schema):
    id: int
    reference: str
    date_engagement: date | None
    type_apport: int
    montant_promis: int
    echeance_mois: int
    montant_verse: int
    date_dernier_versement: date | None
    remarque: str
    etat: int
    appel_fond: ProjetCourt
    # Renseigné pour le porteur du projet et les gestionnaires
    creancier: ContactMembre | None = None
    reste_a_verser: int = 0
    en_attente: int = 0  # versements déclarés (paiement type 8) non encore confirmés


class ApportDetail(ApportResume):
    observation_mediateur: str
    versements: list[VersementOut]
    peut_gerer: bool = False
    peut_declarer: bool = False
    est_creancier: bool = False


class ProjetDetail(ProjetResume):
    secteur_id: int | None
    ville_id: int | None
    entreprise_id: int | None
    entreprise: EntrepriseCourte | None
    auteur: Auteur | None
    description_activite: str
    description_projet: str
    observation_gestionnaire: str
    presentation_pdf: str | None
    date_derniere_visite: datetime | None
    # Bloc promoteur : auteur et gestionnaires seulement (F-S4-17)
    telephone_promoteur: str | None = None
    email_promoteur: str | None = None
    adresse_promoteur: str | None = None
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_evaluer: bool = False
    peut_apporter: bool = False
    nombre_apports: int = 0
    mes_apports: list[ApportResume] = []
    apports: list[ApportResume] | None = None

    @computed_field
    @property
    def presentation_url(self) -> str | None:
        return fichiers.url(self.presentation_pdf)


class ProjetEntree(BaseModel):
    entreprise_id: int | None = None
    secteur_id: int | None = None
    ville_id: int | None = None
    nom_projet: str = Field(default="", max_length=150)
    objet_projet: str = Field(default="", max_length=500)
    description_activite: str = Field(default="", max_length=10000)
    description_projet: str = Field(default="", max_length=10000)
    devis_projet: int = Field(default=0, ge=0)
    apport_fond_propre: int = Field(default=0, ge=0)
    besoin_financement: int = Field(default=0, ge=0)
    niveau_realisation: int = Field(default=0, ge=0, le=100)
    nom_promoteur: str = Field(default="", max_length=120)
    telephone_promoteur: str = Field(default="", max_length=30)
    email_promoteur: EmailStr | None = None
    adresse_promoteur: str = Field(default="", max_length=500)

    @field_validator("email_promoteur", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None


class EvaluationEntree(BaseModel):
    observation_gestionnaire: str = Field(default="", max_length=10000)
    appreciation: int = Field(default=0, ge=0, le=10)


class ApportEntree(BaseModel):
    type_apport: int | None = None
    montant_promis: int = Field(default=0, ge=0)
    echeance_mois: int = Field(default=0, ge=0, le=12)
    remarque: str = Field(default="", max_length=2000)


class VersementEntree(BaseModel):
    montant: int = Field(default=0, ge=0)
    date_versement: date | None = None
    observation_mediateur: str | None = Field(default=None, max_length=2000)


class ListeApports(BaseModel):
    items: list[ApportResume]
    total: int
    page: int = 1
    taille: int = 20
    total_promis: int = 0
    total_verse: int = 0


class Compteurs(BaseModel):
    projets: int
    besoin_total: int
    montant_promis: int
    montant_collecte: int


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
