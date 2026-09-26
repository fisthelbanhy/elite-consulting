from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur, Schema

# --- Configuration des questionnaires (GET /accompagnement/questionnaires) ----------------------


class QuestionOut(BaseModel):
    zone: int
    libelle: str
    aide: str = ""


class GroupeOut(BaseModel):
    titre: str | None
    questions: list[QuestionOut]


class SectionOut(BaseModel):
    numero: int
    titre: str
    groupes: list[GroupeOut]


class QuestionnaireOut(BaseModel):
    type: int
    slug: str
    libelle: str
    prefixe: str
    accroche: str
    description: str
    pour_qui: str
    nombre_questions: int
    sections: list[SectionOut]


# --- Dossiers ---------------------------------------------------------------------------------


class ContactMembre(Schema):
    """Coordonnées du membre : visibles des seuls gestionnaires (le conseiller le rappelle)."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None


class DossierResume(Schema):
    id: int
    type_dossier: int
    reference: str
    objet: str
    date_creation: datetime | None
    etat: int
    membre: Auteur | None
    nombre_questions: int = 0
    nombre_repondues: int = 0


class DossierDetail(DossierResume):
    reponses: dict[str, str] = {}
    contact: ContactMembre | None = None
    peut_modifier: bool = False
    peut_moderer: bool = False


class DossierEntree(BaseModel):
    type_dossier: int = Field(ge=1, le=4)
    objet: str = Field(default="", max_length=250)
    reponses: dict[str, str] = {}
    # « Sauvegarder » (brouillon, état 1) ou « Envoyer » au conseiller (état 2) — ADR-0004 / S5d
    envoyer: bool = False


class DossierModification(BaseModel):
    objet: str = Field(default="", max_length=250)
    reponses: dict[str, str] = {}
    envoyer: bool = False


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Compteurs(BaseModel):
    """Nombre de dossiers visibles par type (clé = type_dossier)."""

    par_type: dict[int, int]
    total: int
