"""Réussites entrepreneuriales (legacy incl-reussite.php, table `reussite`)."""

from datetime import datetime

from pydantic import BaseModel, Field


class AuteurReussite(BaseModel):
    """Identité publique : pseudonyme et photo (jamais le nom ni les coordonnées)."""

    id: int
    pseudonyme: str
    photo_url: str | None


class ReussiteResume(BaseModel):
    """Contrat utilisé par la page d'accueil : `id, projet, succes, conseil, auteur{pseudonyme,
    photo_url}, secteur` (libellé ou null)."""

    id: int
    reference: str
    projet: str
    succes: str
    conseil: str
    situation_avant: str
    secteur: str | None
    secteur_id: int | None
    auteur: AuteurReussite
    photo_url: str | None
    etat: int
    date_creation: datetime | None


class ReussiteDetail(ReussiteResume):
    vision: str
    fond_demarrage: int
    besoin_reel_demarrage: int
    strategie: str
    difficultes: str
    deploiement_efforts: str
    # Contexte du lecteur
    est_auteur: bool = False
    peut_modifier: bool = False
    peut_moderer: bool = False


def _texte():
    return Field(default="", max_length=5000)


class ReussiteEntree(BaseModel):
    secteur_id: int | None = None
    situation_avant: str = _texte()
    vision: str = _texte()
    projet: str = _texte()
    fond_demarrage: int = Field(default=0, ge=0, le=10_000_000_000)
    besoin_reel_demarrage: int = Field(default=0, ge=0, le=10_000_000_000)
    strategie: str = _texte()
    difficultes: str = _texte()
    deploiement_efforts: str = _texte()
    succes: str = _texte()
    conseil: str = _texte()


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Compteurs(BaseModel):
    publiees: int
    a_valider: int
