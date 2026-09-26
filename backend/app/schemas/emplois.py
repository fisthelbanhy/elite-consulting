from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.schemas.commun import Auteur, Schema
from app.services import fichiers
from app.services.validation import verifier_telephone


class Domaine(Schema):
    id: int
    libelle: str


class AnnonceResume(Schema):
    id: int
    type_annonce: int
    reference: str
    domaine: Domaine | None
    poste_a_pourvoir: str
    diplomes: str
    competences: str
    sexe: int
    date_naissance: date | None
    etat: int
    date_creation: datetime | None
    nombre_visites: int
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class InteretOut(Schema):
    id: int
    sous_type: int
    message: str
    date_creation: datetime
    membre: "ContactMembre | None"


class ContactMembre(Schema):
    """Coordonnées d'un membre, visibles seulement de l'auteur de la fiche et des gestionnaires."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None


class AnnonceDetail(AnnonceResume):
    secteur_id: int | None
    domaine_id: int | None
    experience: str
    savoir_faire: str
    autres_informations: str
    date_derniere_visite: datetime | None
    auteur: Auteur | None
    cv: str | None
    # Renseignés seulement pour l'auteur et les gestionnaires (ADR-0007 S2c)
    nom: str | None = None
    prenom: str | None = None
    adresse: str | None = None
    telephone: str | None = None
    email: str | None = None
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False
    mon_interet: bool = False
    interets: list[InteretOut] | None = None

    @computed_field
    @property
    def cv_url(self) -> str | None:
        return fichiers.url(self.cv)


class AnnonceEntree(BaseModel):
    type_annonce: int = Field(ge=1, le=2)
    domaine_id: int | None = None
    nom: str = ""
    prenom: str = ""
    sexe: int | None = None
    date_naissance: date | None = None
    adresse: str = ""
    telephone: str = ""
    email: EmailStr | None = None
    poste_a_pourvoir: str = ""
    diplomes: str = ""
    competences: str = ""
    experience: str = ""
    autres_informations: str = ""

    @field_validator("telephone")
    @classmethod
    def _tel(cls, v: str) -> str:
        return verifier_telephone(v)

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None


class Compteurs(BaseModel):
    demandes: int
    offres: int


class InteretEntree(BaseModel):
    message: str = Field(default="", max_length=2000)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


InteretOut.model_rebuild()
