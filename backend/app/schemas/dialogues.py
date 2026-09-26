from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur, Schema


class DialogueOut(Schema):
    id: int
    type_dialogue: int
    texte: str
    date_message: datetime | None
    auteur: Auteur | None
    destinataire: Auteur | None
    # Contexte du lecteur
    de_moi: bool = False
    de_la_frangine: bool = False  # écrit par un gestionnaire
    a_la_frangine: bool = False  # adressé à la frangine (destinataire NULL)


class DialogueEntree(BaseModel):
    # 1..4 = sous-rubriques de trésorerie (ADR-0007 T9) ; 0 = accueil
    type_dialogue: int = Field(ge=0, le=4)
    texte: str = Field(default="", max_length=2000)
    # Obligatoire pour une réponse de gestionnaire ; ignoré pour un membre (message à la frangine)
    destinataire_id: int | None = None


class Conversation(BaseModel):
    """Vue gestionnaire : un fil par membre pour une rubrique."""

    membre: Auteur
    nombre: int
    dernier_message: str
    date_dernier: datetime | None
    en_attente: bool  # le dernier message vient du membre : une réponse est attendue
