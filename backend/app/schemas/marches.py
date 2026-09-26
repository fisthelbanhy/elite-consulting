"""Schémas des marchés (appels d'offres) et des projets (legacy : incl-choix6C1.php,
incl-choix6C2.php, incl-marche.php, incl-projet.php). Inventaire : S6-5 à S6-8, F-S6-23 à F-S6-32."""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.enums import Etat
from app.schemas.commun import Auteur, Schema
from app.services import fichiers

# --- Marchés -------------------------------------------------------------------------------------


class MarcheResume(Schema):
    id: int
    reference: str
    numero_appel_offre: str
    type_marche: int
    libelle: str
    montant: int
    date_limite: date | None
    maitre_ouvrage: str
    etat: int
    date_creation: datetime | None

    @computed_field
    @property
    def jours_restants(self) -> int | None:
        """Jours avant la date limite (négatif : dépassée ; None : non précisée)."""
        return (self.date_limite - date.today()).days if self.date_limite else None

    @computed_field
    @property
    def ouvert(self) -> bool:
        """Encore possible de soumissionner : pas clôturé et date limite non dépassée."""
        if self.etat == Etat.CLOTURE:
            return False
        return self.date_limite is None or self.date_limite >= date.today()


class MarcheDetail(MarcheResume):
    description: str
    dossier_a_fournir: str
    lieu_depot: str
    email: str
    publie_par: str
    beneficiaire: str
    document: str | None
    auteur: Auteur | None
    peut_modifier: bool = False
    peut_moderer: bool = False

    @computed_field
    @property
    def document_url(self) -> str | None:
        return fichiers.url(self.document)


class MarcheEntree(BaseModel):
    numero_appel_offre: str = Field(default="", max_length=120)
    type_marche: int | None = None
    libelle: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=10000)
    montant: int = Field(default=0, ge=0)
    date_limite: date | None = None
    dossier_a_fournir: str = Field(default="", max_length=5000)
    lieu_depot: str = Field(default="", max_length=500)
    email: EmailStr | None = None
    maitre_ouvrage: str = Field(default="", max_length=500)
    publie_par: str = Field(default="", max_length=500)
    beneficiaire: str = Field(default="", max_length=500)

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None


class Compteurs(BaseModel):
    marches: int
    marches_ouverts: int
    projets: int


# --- Projets -------------------------------------------------------------------------------------


class ProjetResume(Schema):
    id: int
    reference: str
    responsable: str
    promoteur: str
    objet: str
    libelle: str
    duree_mois: int
    date_lancement: date | None
    etat: int
    date_creation: datetime | None


class ProjetDetail(ProjetResume):
    objectif: str
    description: str
    adresse: str
    conditions: str
    auteur: Auteur | None
    peut_modifier: bool = False
    peut_moderer: bool = False


class ProjetEntree(BaseModel):
    # Le legacy limitait ces champs à 20 caractères à l'écran (colonnes `text`) : limite levée
    # à 150 (F-S6-32, voir docs/modules/entreprises-marches.md)
    responsable: str = Field(default="", max_length=150)
    promoteur: str = Field(default="", max_length=150)
    objet: str = Field(default="", max_length=150)
    libelle: str = Field(default="", max_length=150)
    objectif: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=10000)
    adresse: str = Field(default="", max_length=300)
    duree_mois: int | None = None
    date_lancement: date | None = None
    conditions: str = Field(default="", max_length=5000)
