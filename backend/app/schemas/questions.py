"""Forum « Questions & conseils » (legacy « Informations utiles », table `conseil`)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur


class SujetResume(BaseModel):
    id: int
    reference: str
    objet: str
    extrait: str
    confidentialite: int
    etat: int
    nombre_reponses: int
    date_creation: datetime | None
    auteur: Auteur | None
    # Nom réel : gestionnaire, auteur, et Master pour un sujet public (F-S1-05)
    auteur_nom: str | None = None


class ReponseOut(BaseModel):
    id: int
    texte: str
    etat: int
    date_creation: datetime | None
    auteur: Auteur | None
    auteur_nom: str | None = None
    # Réponse d'une conseillère (gestionnaire) : badge « La frangine »
    de_la_frangine: bool = False
    peut_modifier: bool = False


class SujetDetail(SujetResume):
    texte: str
    reponses: list[ReponseOut]
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_repondre: bool = False
    est_auteur: bool = False


class SujetEntree(BaseModel):
    confidentialite: int | None = None
    objet: str = Field(default="", max_length=120)
    texte: str = Field(default="", max_length=20000)


class ReponseEntree(BaseModel):
    texte: str = Field(default="", max_length=5000)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Compteurs(BaseModel):
    sujets: int
