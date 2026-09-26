from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, computed_field, field_validator

from app.enums import CategorieMembre, TypeMembre
from app.schemas.commun import Schema
from app.services import fichiers
from app.services.validation import verifier_telephone


class Connexion(BaseModel):
    identifiant: str = Field(min_length=1, max_length=120)
    mot_de_passe: str = Field(min_length=1, max_length=200)


class MembreMoi(Schema):
    """Profil complet du membre connecté (renvoyé uniquement à lui-même)."""

    id: int
    type_compte: int
    categorie: int
    code_membre: str
    nom: str
    pseudonyme: str
    sexe: int
    telephone: str
    email: str | None
    ville_id: int | None
    adresse: str
    identifiant: str
    etat: int
    droit_attribution: bool
    droit_caisse: bool
    droit_activation: bool
    numero_piece_identite: str
    employeur: str
    situation_matrimoniale: int | None
    nombre_enfants: int
    forme_juridique: int | None
    type_partenaire: int | None
    domaine_activite_id: int | None
    date_limite_master: date | None
    point_caisse_actif: bool
    solde_point_caisse: int
    date_dernier_pointage: datetime | None
    photo: str | None
    date_creation: datetime | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)

    @computed_field
    @property
    def est_gestionnaire(self) -> bool:
        return self.type_compte == TypeMembre.GESTIONNAIRE

    @computed_field
    @property
    def profil_complet(self) -> int:
        """Pourcentage de complétion du profil (incite à compléter l'inscription progressive)."""
        champs = [self.nom, self.pseudonyme, self.telephone, self.ville_id, self.email, self.adresse]
        if self.categorie == CategorieMembre.PHYSIQUE:
            champs += [self.sexe in (1, 2), self.situation_matrimoniale, self.photo]
        else:
            champs += [self.domaine_activite_id, self.photo]
        return round(100 * sum(1 for c in champs if c) / len(champs))


class Session(BaseModel):
    jeton: str
    expire: datetime
    membre: MembreMoi


class _ChampsProfil(BaseModel):
    nom: str = Field(min_length=3, max_length=120)
    pseudonyme: str = Field(default="", max_length=50)
    telephone: str
    email: EmailStr | None = None
    ville_id: int
    adresse: str = ""
    sexe: int | None = None
    situation_matrimoniale: int | None = None
    nombre_enfants: int = Field(default=0, ge=0, le=20)
    employeur: str = ""
    numero_piece_identite: str = ""
    forme_juridique: int | None = None
    type_partenaire: int | None = None
    domaine_activite_id: int | None = None

    @field_validator("telephone")
    @classmethod
    def _tel(cls, v: str) -> str:
        return verifier_telephone(v, obligatoire=True)

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None


class Inscription(_ChampsProfil):
    """Inscription minimale (ADR-0008) : identifiant et pseudonyme facultatifs, déduits
    du téléphone et du nom s'ils ne sont pas fournis."""

    categorie: int = Field(ge=1, le=2)
    identifiant: str = Field(default="", max_length=50, pattern=r"^([A-Za-z0-9_.\-@]{4,50})?$")
    mot_de_passe: str = Field(min_length=8, max_length=200)
    confirmation: str
    accepte_conditions: bool = False
    # Anti-robot (ADR-0005) : champ piège + délai de remplissage
    site_web: str = ""
    duree_saisie_ms: int = 0

    @field_validator("mot_de_passe")
    @classmethod
    def _different_identifiant(cls, v: str, info: ValidationInfo) -> str:
        interdits = {str(info.data.get("identifiant", "")).lower(), str(info.data.get("telephone", "")).lower()}
        if v.lower() in interdits - {""}:
            raise ValueError("Le mot de passe doit être différent de l'identifiant et du téléphone.")
        return v

    @field_validator("confirmation")
    @classmethod
    def _confirmation(cls, v: str, info: ValidationInfo) -> str:
        if "mot_de_passe" in info.data and v != info.data["mot_de_passe"]:
            raise ValueError("La confirmation ne correspond pas au mot de passe.")
        return v

    @field_validator("accepte_conditions")
    @classmethod
    def _conditions(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Veuillez accepter les conditions d'utilisation.")
        return v


class MiseAJourProfil(_ChampsProfil):
    pass


def _confirmer_nouveau(v: str, info: ValidationInfo) -> str:
    if "nouveau" in info.data and v != info.data["nouveau"]:
        raise ValueError("La confirmation ne correspond pas au nouveau mot de passe.")
    return v


class ChangementMotDePasse(BaseModel):
    actuel: str
    nouveau: str = Field(min_length=8, max_length=200)
    confirmation: str

    _c = field_validator("confirmation")(_confirmer_nouveau)


class MotDePasseOublie(BaseModel):
    """Vérification d'identité reprise du legacy : catégorie + nom + pseudo + téléphone."""

    categorie: int = Field(ge=1, le=2)
    nom: str = Field(min_length=1)
    pseudonyme: str = Field(min_length=1)
    telephone: str = Field(min_length=1)


class Reinitialisation(BaseModel):
    jeton: str = Field(min_length=10)
    nouveau: str = Field(min_length=8, max_length=200)
    confirmation: str

    _c = field_validator("confirmation")(_confirmer_nouveau)
