from pydantic import BaseModel, Field

from app.schemas.commun import Schema


class BanqueCourte(Schema):
    id: int
    sigle: str
    nom: str


class TarifOut(BaseModel):
    id: int
    banque_id: int
    tarif: str


class OperationOut(BaseModel):
    id: int
    libelle: str
    type_id: int
    tarifs: list[TarifOut] = []


class TypeOut(BaseModel):
    id: int
    libelle: str
    operations: list[OperationOut] = []


class Comparatif(BaseModel):
    """Tableau comparatif : lignes = opérations groupées par type, colonnes = banques."""

    banques: list[BanqueCourte]
    types: list[TypeOut]
    nombre_tarifs: int
    referentiel_vide: bool
    # Contexte du lecteur
    peut_gerer_referentiel: bool = False  # gestionnaire habilité
    banques_gerees: list[int] = []  # banques dont le lecteur peut saisir les tarifs


class LibelleEntree(BaseModel):
    libelle: str = Field(default="", max_length=120)


class OperationEntree(BaseModel):
    type_id: int | None = None
    libelle: str = Field(default="", max_length=120)


class TarifEntree(BaseModel):
    operation_id: int | None = None
    banque_id: int | None = None
    tarif: str = Field(default="", max_length=100)


class TarifModification(BaseModel):
    tarif: str = Field(default="", max_length=100)


class GrilleEntree(BaseModel):
    """Saisie de tous les tarifs d'une banque en une fois : {operation_id: tarif} ;
    un tarif vide retire le tarif existant."""

    tarifs: dict[int, str] = {}
