"""Découverte de soi (legacy « Lisungui », table `soungangai`) et diagnostic gratuit."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Schema
from app.services import fichiers


def _texte():
    return Field(default="", max_length=5000)


def _oui_non():
    """0 = non renseigné, 1 = Oui, 2 = Non (valeurs legacy)."""
    return Field(default=0, ge=0, le=2)


class ReponsesQuestionnaire(BaseModel):
    """Les 26 questions du legacy (incl-sounga.php) + la « Correspondance membre »."""

    activite_actuelle: str = _texte()  # 1
    savoir_faire: str = _texte()  # 2
    activite_quotidienne: str = _texte()  # 3
    secret_a_partager: str = _texte()  # 4
    origine_idee: str = _texte()  # 5
    idee_vue_chez_autrui: int = _oui_non()  # 6
    participation_idee_tierce: str = _texte()  # 7
    est_sociable: int = _oui_non()  # 8
    interet_pour_autrui: int = _oui_non()  # 9
    a_deja_fait_commerce: int = _oui_non()  # 10
    se_fait_des_amis: int = _oui_non()  # 11
    garde_ses_relations: int = _oui_non()  # 12
    percu_comme_ouvert: int = _oui_non()  # 13
    perception_par_autrui: str = _texte()  # 14
    est_meneur: int = _oui_non()  # 15 (1 = plutôt meneur, 2 = plutôt suiveur)
    prefere_entourage: int = _oui_non()  # 16 (1 = entouré de ses amis, 2 = seul)
    a_des_amis_proches: int = _oui_non()  # 17
    entourage_valorise_activite: int = _oui_non()  # 18
    entourage_proche: str = _texte()  # 19
    personnes_consideration: str = _texte()  # 20
    motivation: str = _texte()  # 21
    pourcentage_implication: int = Field(default=0, ge=0, le=100)  # 22
    moyens_disponibles: str = _texte()  # 23
    soutien_conjoint: int = _oui_non()  # 24
    origine_soutien: str = _texte()  # 25
    confronte_aux_faits: int = _oui_non()  # 26
    notes_membre: str = _texte()  # 27 « Correspondance membre »


CHAMPS_QUESTIONNAIRE = tuple(ReponsesQuestionnaire.model_fields)


class FicheEntree(ReponsesQuestionnaire):
    pass


class MembreFiche(Schema):
    """Le membre concerné (fiche visible seulement de lui et des gestionnaires)."""

    id: int
    nom: str
    pseudonyme: str
    sexe: int
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class FicheResume(Schema):
    id: int
    reference: str
    date_creation: datetime | None
    etat: int
    etat_fiche: int
    cloturee: int
    pourcentage_implication: int
    date_diagnostic: datetime | None
    membre: MembreFiche


class FicheDetail(FicheResume, ReponsesQuestionnaire):
    notes_conseillere: str
    diagnostic: dict[str, Any] | None
    # Contexte du lecteur
    est_proprietaire: bool = False
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_repondre: bool = False  # « Correspondance la frangine » : gestionnaires


class CorrespondanceEntree(BaseModel):
    notes_conseillere: str = Field(default="", max_length=5000)


class ClotureEntree(BaseModel):
    cloturee: bool


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=2)


# --- Diagnostic gratuit -------------------------------------------------------------------------


class OptionDiagnostic(BaseModel):
    code: str
    libelle: str
    description: str | None = None


class QuestionDiagnostic(BaseModel):
    cle: str
    question: str
    aide: str | None = None
    options: list[OptionDiagnostic]


class DiagnosticEntree(BaseModel):
    """Codes des réponses (voir `GET /decouverte/diagnostic/questions`)."""

    activite: str = ""
    savoir_faire: str = ""
    stade: str = ""
    besoin: str = ""
    disponibilite: str = ""
    moyens: str = ""
    soutien: str = ""
    ville: str = ""


class Profil(BaseModel):
    titre: str
    texte: str


class Etape(BaseModel):
    titre: str
    texte: str
    href: str


class QuestionReponse(BaseModel):
    question: str
    reponse: str


class Restitution(BaseModel):
    profil: Profil
    forces: list[str]
    attentions: list[str]
    etapes: list[Etape]
    reponses: list[QuestionReponse]
    resume: str
