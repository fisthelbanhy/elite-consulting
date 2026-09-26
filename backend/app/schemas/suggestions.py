from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Schema


class SuggestionEntree(BaseModel):
    module: int | None = None  # enums.Module : 0 (Accueil) à 8 (Tous les modules)
    texte: str = Field(default="", max_length=3000)


class SuggestionOut(Schema):
    """Aucune information sur l'auteur : les suggestions sont anonymes (comme le legacy)."""

    id: int
    date: datetime
    module: int
    texte: str
    etat: int


class EtatSuggestion(BaseModel):
    """1 = à lire, 2 = prise en compte, 3 = supprimée (liste legacy : Non traité, Autorisé, Supprimé)."""

    etat: int = Field(ge=1, le=3)


class CompteursSuggestions(BaseModel):
    a_lire: int
    total: int
