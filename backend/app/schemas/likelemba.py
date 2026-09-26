"""Schémas Likelemba : groupes (tontines), adhésions avec caution et témoins, cotisations."""

from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.schemas.commun import Auteur, Schema

# Codes legacy des cases « Membre Frangine ? » (incl-membrelikelemba.php) : case cochée = 2
# (membre de La Frangine), sinon 1. Les données reprises gardent ce codage ; l'API expose un booléen.
CODE_MEMBRE = 2
CODE_NON_MEMBRE = 1


def depuis_code_membre(v):
    """Convertit le code legacy (1/2) en booléen ; laisse passer un booléen tel quel."""
    if isinstance(v, bool) or v is None:
        return bool(v)
    if isinstance(v, int):
        return v == CODE_MEMBRE
    return v


class GroupeResume(Schema):
    id: int
    code: str
    responsable: Auteur | None
    montant_cotisation: int
    periodicite: int
    date_debut: date | None
    observation: str
    compteur_entrees: int
    etat: int
    # Calculés par le routeur
    nombre_adherents: int = 0
    est_responsable: bool = False
    mon_adhesion_id: int | None = None


class GroupeCourt(Schema):
    id: int
    code: str
    montant_cotisation: int
    periodicite: int
    responsable_id: int | None
    etat: int


class AdhesionResume(Schema):
    id: int
    code: str
    membre: Auteur | None
    date_entree: date | None
    etat: int
    ordre: int | None = None  # rang d'entrée, extrait du code `{n}{code groupe}`


class Echeance(BaseModel):
    """Tour du calendrier indicatif : à chaque échéance, un adhérent (dans l'ordre d'entrée)
    reçoit la cagnotte (cotisation × nombre d'adhérents actifs)."""

    tour: int
    date: date | None
    beneficiaire: str
    adhesion_id: int
    passee: bool = False


class CotisationOut(Schema):
    id: int
    numero_recu: str
    date_paiement: date | None
    montant: int
    mode_paiement: int
    etat: int
    adhesion_id: int | None
    # Remplis par le routeur
    adherent: str = ""
    code_adherent: str = ""
    nom_caissier: str = ""
    observation: str | None = None  # remarque de paiement : l'adhérent concerné, le responsable, la frangine
    recu_valide: bool = True
    peut_valider: bool = False


class GroupeDetail(GroupeResume):
    adhesions: list[AdhesionResume] = []
    calendrier: list[Echeance] = []
    cagnotte: int = 0
    # Historique : adhérents, responsable et gestionnaires seulement
    cotisations: list[CotisationOut] | None = None
    total_cotisations: int | None = None
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_gerer: bool = False  # inscrire un membre, valider des reçus (responsable ou gestionnaire)
    peut_adherer: bool = False


class Temoin(BaseModel):
    nom: str = Field(default="", max_length=120)
    telephone: str = Field(default="", max_length=30)
    emploi: str = Field(default="", max_length=120)
    est_membre: bool = False

    @field_validator("est_membre", mode="before")
    @classmethod
    def _code_legacy(cls, v):
        return depuis_code_membre(v)


class AdhesionDetail(AdhesionResume):
    groupe: GroupeCourt
    observation: str
    caution_nom: str
    caution_est_membre: bool = False
    caution_piece_identite: str
    caution_adresse: str
    caution_activite: str
    caution_telephone: str
    temoins: list[Temoin] = []
    cotisations: list[CotisationOut] = []
    total_cotisations: int = 0
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_cotiser: bool = False

    @field_validator("caution_est_membre", mode="before")
    @classmethod
    def _code_legacy(cls, v):
        return depuis_code_membre(v)


class GroupeEntree(BaseModel):
    responsable_id: int | None = None
    montant_cotisation: int = Field(default=0, ge=0)
    periodicite: int | None = None
    date_debut: date | None = None
    observation: str = Field(default="", max_length=5000)


class AdhesionEntree(BaseModel):
    membre_id: int | None = None  # vide = le membre connecté s'inscrit lui-même
    date_entree: date | None = None
    observation: str = Field(default="", max_length=5000)
    caution_nom: str = Field(default="", max_length=120)
    caution_est_membre: bool = False
    caution_piece_identite: str = Field(default="", max_length=50)
    caution_adresse: str = Field(default="", max_length=500)
    caution_activite: str = Field(default="", max_length=500)
    caution_telephone: str = Field(default="", max_length=30)
    temoins: list[Temoin] = Field(default_factory=list, max_length=3)


class MembreChoix(Schema):
    id: int
    pseudonyme: str
    nom: str


class MesAdhesions(Schema):
    id: int
    code: str
    etat: int
    date_entree: date | None
    groupe: GroupeCourt


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
