"""Schémas « Partenariat & troc » (legacy incl-choix5C.php, incl-partenariat.php)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur, Schema


class PartenariatResume(Schema):
    id: int
    reference: str
    actif: str  # ce que j'ai
    description: str
    recherche: str  # ce que je cherche
    objectif: str
    etat: int
    date_creation: datetime | None
    auteur: Auteur | None


class ContactMembre(Schema):
    """Coordonnées d'un membre intéressé : visibles de l'auteur de la fiche et des gestionnaires."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None


class InteretOut(Schema):
    id: int
    message: str
    date_creation: datetime
    membre: ContactMembre | None


class PartenariatDetail(PartenariatResume):
    peut_modifier: bool = False
    peut_moderer: bool = False
    mon_interet: bool = False
    # Intéressements reçus : auteur et gestionnaires seulement (ADR-0007 S2d)
    interets: list[InteretOut] | None = None
    nombre_interets: int = 0


class PartenariatEntree(BaseModel):
    actif: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=3000)
    recherche: str = Field(default="", max_length=3000)
    objectif: str = Field(default="", max_length=3000)


class Compteur(BaseModel):
    publies: int


class InteretEntree(BaseModel):
    message: str = Field(default="", max_length=2000)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
