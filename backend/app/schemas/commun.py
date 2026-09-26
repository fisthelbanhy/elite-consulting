from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, computed_field

from app.services import fichiers

T = TypeVar("T")


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Liste(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int = 1
    taille: int = 20


class Ok(BaseModel):
    message: str
    id: int | None = None
    reference: str | None = None


class Option(BaseModel):
    value: int
    label: str


class Auteur(Schema):
    """Identité publique d'un membre : jamais son téléphone ni son e-mail."""

    id: int
    pseudonyme: str
    categorie: int
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class Horodate(Schema):
    date_creation: datetime | None = None
