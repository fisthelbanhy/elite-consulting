from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur, Schema


class SujetResume(Schema):
    id: int
    rubrique: int
    reference: str
    objet: str
    texte: str
    confidentialite: int
    nombre_reponses: int
    etat: int
    date_creation: datetime | None
    auteur: Auteur | None
    # Réponse d'un conseiller (gestionnaire) présente dans le fil
    repondu_par_conseiller: bool = False


class ReponseOut(Schema):
    id: int
    texte: str
    etat: int
    date_creation: datetime | None
    auteur: Auteur | None
    de_la_frangine: bool = False
    peut_modifier: bool = False


class SujetDetail(SujetResume):
    reponses: list[ReponseOut] = []
    # Contexte du lecteur
    est_auteur: bool = False
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_repondre: bool = False
    peut_cloturer: bool = False


class SujetEntree(BaseModel):
    rubrique: int = Field(ge=1, le=2)
    objet: str = Field(default="", max_length=120)
    texte: str = Field(default="", max_length=5000)
    # Conseil financier : privé par défaut (échange membre ↔ conseiller) ; Rumeurs : toujours public
    confidentialite: int | None = Field(default=None, ge=1, le=2)


class SujetModification(BaseModel):
    objet: str = Field(default="", max_length=120)
    texte: str = Field(default="", max_length=5000)
    confidentialite: int | None = Field(default=None, ge=1, le=2)


class ReponseEntree(BaseModel):
    texte: str = Field(default="", max_length=5000)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Compteurs(BaseModel):
    conseil: int
    rumeurs: int
    # Sujet encore ouvert du lecteur par rubrique (règle « un sujet ouvert à la fois », F-S7-03)
    sujet_ouvert_conseil: int | None = None
    sujet_ouvert_rumeurs: int | None = None
