from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Schema
from app.services import fichiers


class AuteurMessage(Schema):
    """Gestionnaire ayant écrit au nom de la frangine (visible des seuls gestionnaires)."""

    id: int
    pseudonyme: str


class MessageOut(Schema):
    id: int
    texte: str
    date_message: datetime
    de_la_frangine: bool
    # État de lecture *avant* l'ouverture du fil (permet de signaler les nouveaux messages)
    lu: bool
    auteur: AuteurMessage | None = None


class FilMembre(BaseModel):
    """Fil d'un membre, vu par lui-même."""

    messages: list[MessageOut]
    non_lus: int
    frangine_en_ligne: bool


class MembreFil(Schema):
    """Identité du membre titulaire d'un fil, vue par un gestionnaire."""

    id: int
    nom: str
    pseudonyme: str
    telephone: str
    email: str | None
    categorie: int
    photo: str | None = None
    derniere_activite: datetime | None = None
    en_ligne: bool = False

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class FilResume(BaseModel):
    membre: MembreFil
    total: int
    non_lus: int
    dernier_message: MessageOut | None = None


class FilGestion(BaseModel):
    membre: MembreFil
    messages: list[MessageOut]
    non_lus: int


class MessageEntree(BaseModel):
    texte: str = Field(default="", max_length=2000)
