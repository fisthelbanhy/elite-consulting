"""Schémas de l'annuaire des entreprises (legacy : incl-choix6A.php, incl-entreprise.php).
Inventaire : S6-1, S6-2, F-S6-02 à F-S6-13."""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.schemas.commun import Auteur, Schema
from app.services import fichiers
from app.services.validation import verifier_telephone


class Libelle(Schema):
    id: int
    libelle: str


class VilleCourte(Schema):
    id: int
    nom: str


class DomaineEtSecteur(Schema):
    """Domaine d'activité et son secteur : le secteur d'une entreprise est toujours déduit de
    son domaine (ADR-0007, S6-2)."""

    id: int
    libelle: str
    secteur: Libelle | None = None


class EntrepriseResume(Schema):
    id: int
    reference: str
    nom: str
    forme_juridique: int
    description: str
    domaine: DomaineEtSecteur | None
    ville: VilleCourte | None
    etat: int
    date_creation: datetime | None
    nombre_visites: int
    logo: str | None

    @computed_field
    @property
    def logo_url(self) -> str | None:
        return fichiers.url(self.logo)


class PresenceComparateur(BaseModel):
    """Nombre de lignes publiées par l'entreprise dans le comparateur de prix."""

    offres: int = 0
    demandes: int = 0


class EntrepriseDetail(EntrepriseResume):
    domaine_id: int | None
    ville_id: int | None
    capital_social: int
    gerant: str
    # Coordonnées de l'entreprise : publiques, c'est le rôle d'un annuaire (≠ données d'un membre)
    telephone: str
    email: str
    site_web: str
    adresse: str
    date_derniere_visite: datetime | None
    auteur: Auteur | None = None
    comparateur: PresenceComparateur = Field(default_factory=PresenceComparateur)
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False


class EntrepriseOption(Schema):
    """Entreprise du membre connecté (choix d'une entreprise dans les autres modules)."""

    id: int
    reference: str
    nom: str
    forme_juridique: int
    etat: int
    logo: str | None

    @computed_field
    @property
    def logo_url(self) -> str | None:
        return fichiers.url(self.logo)


class EntrepriseEntree(BaseModel):
    domaine_id: int | None = None
    nom: str = Field(default="", max_length=150)
    forme_juridique: int | None = None
    capital_social: int = Field(default=0, ge=0)
    description: str = Field(default="", max_length=5000)
    gerant: str = Field(default="", max_length=120)
    telephone: str = ""
    email: EmailStr | None = None
    site_web: str = Field(default="", max_length=200)
    adresse: str = Field(default="", max_length=500)
    ville_id: int | None = None

    @field_validator("telephone")
    @classmethod
    def _tel(cls, v: str) -> str:
        return verifier_telephone(v)

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None

    @field_validator("site_web")
    @classmethod
    def _site(cls, v: str) -> str:
        """Adresse web normalisée en http(s) : jamais de `javascript:` dans un lien public."""
        v = (v or "").strip()
        if not v:
            return ""
        if not re.match(r"^https?://", v, re.IGNORECASE):
            v = f"https://{v}"
        if not re.fullmatch(r"https?://[^\s/$.?#][^\s]*\.[^\s]{2,}", v, re.IGNORECASE):
            raise ValueError("Adresse du site invalide (ex. www.monentreprise.cg).")
        return v


class EntrepriseModele(BaseModel):
    """Valeurs proposées à la création (pré-remplissage depuis le profil d'une personne morale,
    corrigé : le legacy lisait le domaine dans `sexembr` et la forme dans `situatmatrimmbr`)."""

    nom: str = ""
    domaine_id: int | None = None
    forme_juridique: int | None = None
    telephone: str = ""
    email: str = ""
    adresse: str = ""
    ville_id: int | None = None
    personne_morale: bool = False


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
