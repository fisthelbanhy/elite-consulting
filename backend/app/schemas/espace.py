"""Schémas de « Mon espace » (tableau de bord du membre connecté)."""

import re
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.commun import Schema


class ProfilResume(BaseModel):
    id: int
    pseudonyme: str
    nom: str
    categorie: int
    type_compte: int
    etat: int
    code_membre: str
    photo_url: str | None
    profil_complet: int
    champs_manquants: list[str]
    date_creation: datetime | None
    date_limite_master: date | None
    point_caisse_actif: bool
    solde_point_caisse: int
    date_dernier_pointage: datetime | None
    a_code_pointage: bool


class FicheCourte(BaseModel):
    id: int
    titre: str
    reference: str = ""
    statut: str = ""
    etat: int | None = None
    date: datetime | date | None = None
    lien: str


class ModuleEspace(BaseModel):
    cle: str
    libelle: str
    total: int
    lien_liste: str
    lien_nouveau: str | None = None
    fiches: list[FicheCourte]


class PaiementCourt(Schema):
    id: int
    type_objet: int
    objet_id: int | None
    date_paiement: datetime
    mode: int
    montant: int
    remarque: str
    etat: int


class TableauEspace(BaseModel):
    profil: ProfilResume
    modules: list[ModuleEspace]
    paiements: list[PaiementCourt]
    paiements_en_attente: int
    messages_non_lus: int


class IdentifiantEntree(BaseModel):
    identifiant: str = Field(max_length=50)
    mot_de_passe: str = Field(min_length=1, max_length=200)

    @field_validator("identifiant")
    @classmethod
    def _format(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.\-@]{4,50}", v):
            raise ValueError("L'identifiant doit contenir de 4 à 50 caractères (lettres, chiffres, . _ - @).")
        return v


class CodePointageEntree(BaseModel):
    mot_de_passe: str = Field(min_length=1, max_length=200)
    code: str
    confirmation: str

    @field_validator("code")
    @classmethod
    def _quatre_chiffres(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("Le code de pointage comporte exactement 4 chiffres.")
        return v

    @field_validator("confirmation")
    @classmethod
    def _confirmation(cls, v: str, info) -> str:
        if "code" in info.data and v.strip() != info.data["code"]:
            raise ValueError("La confirmation ne correspond pas au code.")
        return v.strip()
