"""Schémas de l'immobilier (legacy `immobilier`, écrans S3-A1 à S3-A3) et éléments communs
aux petites annonces (intérêts reçus, états)."""

from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Auteur, Schema
from app.services import fichiers

# Plafond de surface : le legacy proposait 0–2000 m² (stockés en tinyint, tronqués à 127) ;
# relevé pour les terrains, en entier standard (ADR-0004).
SURFACE_MAX = 100_000


class VilleOut(Schema):
    id: int
    nom: str


class QuartierOut(Schema):
    id: int
    nom: str
    ville: VilleOut | None = None


class ContactMembre(Schema):
    """Coordonnées d'un membre, visibles seulement de l'auteur de la fiche et des gestionnaires."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None = None


class InteretOut(Schema):
    id: int
    sous_type: int
    message: str
    date_creation: datetime
    membre: ContactMembre | None = None


class BienResume(Schema):
    id: int
    reference: str
    offre_ou_recherche: int
    type_transaction: int
    type_bien: int
    quartier: QuartierOut | None = None
    surface_m2: int
    nombre_pieces: int
    nombre_chambres: int
    situation: int
    prix: int
    description: str
    etat: int
    date_creation: datetime | None = None
    nombre_visites: int
    date_derniere_visite: datetime | None = None
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class BienDetail(BienResume):
    quartier_id: int | None = None
    auteur: Auteur | None = None
    # Adresse précise : auteur et gestionnaires seulement (le legacy ne l'affichait pas au public)
    localisation: str | None = None
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_manifester: bool = False
    mon_interet: bool = False
    interets: list[InteretOut] | None = None


class BienEntree(BaseModel):
    offre_ou_recherche: int = 0
    type_transaction: int = 0
    type_bien: int = 0
    quartier_id: int | None = None
    localisation: str = Field(default="", max_length=250)
    surface_m2: int = Field(default=0, ge=0)
    nombre_pieces: int = Field(default=0, ge=0, le=100)
    nombre_chambres: int = Field(default=0, ge=0, le=100)
    situation: int = 0
    prix: int = Field(default=0, ge=0, le=1_000_000_000_000)
    description: str = Field(default="", max_length=5000)


class Compteurs(BaseModel):
    offres: int
    recherches: int
    total: int


class Encarts(BaseModel):
    """Colonnes « Nouveautés » et « Les plus visités » (5 fiches publiées chacune)."""

    nouveautes: list[BienResume]
    plus_visites: list[BienResume]


class InteretEntree(BaseModel):
    message: str = Field(default="", max_length=2000)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
