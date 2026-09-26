from datetime import datetime

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, Field, computed_field, field_validator

from app.schemas.commun import Schema
from app.services.validation import verifier_telephone

MESSAGE_EMAIL = "Adresse e-mail invalide (ex. prenom.nom@gmail.com)."


def verifier_email(v: str | None) -> str:
    """E-mail facultatif ici (l'obligation dépend de l'expéditeur) ; format contrôlé s'il est fourni."""
    v = (v or "").strip()
    if not v:
        return ""
    try:
        return validate_email(v, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise ValueError(MESSAGE_EMAIL) from exc


class ContactEntree(BaseModel):
    nom: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=120)
    telephone: str = ""
    objet: str = Field(default="", max_length=200)
    texte: str = Field(default="", max_length=5000)
    # Anti-robot (ADR-0005) : champ piège invisible + délai minimal de remplissage
    site_web: str = ""
    duree_saisie_ms: int = 0

    @field_validator("telephone")
    @classmethod
    def _tel(cls, v: str) -> str:
        return verifier_telephone(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return verifier_email(v)


class ExpediteurMembre(Schema):
    id: int
    pseudonyme: str
    type_compte: int


class ContactOut(Schema):
    id: int
    membre_id: int | None
    membre: ExpediteurMembre | None = None
    nom: str
    email: str
    telephone: str
    objet: str
    texte: str
    date_envoi: datetime
    reponse: str
    date_reponse: datetime | None
    etat: int

    @computed_field
    @property
    def repondu(self) -> bool:
        return bool(self.reponse.strip())


class ContactDetail(ContactOut):
    peut_repondre: bool = False


class ReponseEntree(BaseModel):
    reponse: str = Field(default="", max_length=5000)


class EtatContact(BaseModel):
    """1 = à traiter, 2 = traité, 3 = supprimé (liste legacy : Non traité, Autorisé, Supprimé)."""

    etat: int = Field(ge=1, le=3)


class CompteursContact(BaseModel):
    a_traiter: int
