"""Dépendances FastAPI : base de données, membre courant, contrôles de droits."""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.enums import Etat
from app.erreurs import ErreurMetier, interdit
from app.models.membres import Membre, Session
from app.security import hash_jeton

Db = Annotated[DBSession, Depends(get_db)]


def _membre_depuis_jeton(db: DBSession, authorization: str | None) -> Membre | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    jeton = authorization[7:].strip()
    if not jeton:
        return None
    session = db.scalar(select(Session).where(Session.jeton_hash == hash_jeton(jeton)))
    if session is None or session.date_expiration < datetime.now():
        return None
    membre = session.membre
    if membre.etat == Etat.SUPPRIME:
        return None
    # Présence en ligne (ADR-0007 T3), écrite au plus une fois par minute
    maintenant = datetime.now()
    if membre.derniere_activite is None or membre.derniere_activite < maintenant - timedelta(minutes=1):
        membre.derniere_activite = maintenant
        db.commit()
    return membre


def membre_optionnel(db: Db, authorization: Annotated[str | None, Header()] = None) -> Membre | None:
    return _membre_depuis_jeton(db, authorization)


def membre_requis(db: Db, authorization: Annotated[str | None, Header()] = None) -> Membre:
    membre = _membre_depuis_jeton(db, authorization)
    if membre is None:
        raise ErreurMetier("Veuillez vous connecter pour accéder à cette fonctionnalité.", 401)
    return membre


MembreOpt = Annotated[Membre | None, Depends(membre_optionnel)]
MembreReq = Annotated[Membre, Depends(membre_requis)]


def gestionnaire_requis(membre: MembreReq) -> Membre:
    if not membre.est_gestionnaire:
        raise interdit("Espace réservé aux gestionnaires.")
    return membre


Gestionnaire = Annotated[Membre, Depends(gestionnaire_requis)]


def exiger_droit(membre: Membre, droit: str) -> None:
    """droit ∈ {"attribution", "caisse", "activation"}."""
    if not (membre.est_gestionnaire and getattr(membre, f"droit_{droit}", False)):
        libelles = {
            "attribution": "d'attribution des droits",
            "caisse": "de caisse (confirmation des paiements)",
            "activation": "d'activation des fiches",
        }
        raise interdit(f"Cette action nécessite le droit {libelles.get(droit, droit)}.")


def peut_modifier(membre: Membre | None, auteur_id: int | None) -> bool:
    """Règle legacy répétée partout : l'auteur de la fiche, ou un gestionnaire ayant le droit
    « Activation »."""
    if membre is None:
        return False
    return membre.id == auteur_id or membre.peut_moderer()


def verifier_modification(membre: Membre, auteur_id: int | None) -> None:
    if not peut_modifier(membre, auteur_id):
        raise interdit("Seul l'auteur de la fiche ou un gestionnaire habilité peut la modifier.")


class Pagination:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        taille: Annotated[int, Query(ge=1, le=100)] = 20,
    ):
        self.page = page
        self.taille = taille

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.taille


Page = Annotated[Pagination, Depends()]
