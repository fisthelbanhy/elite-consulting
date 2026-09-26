"""Paiements : préparation, déclaration par le membre, historique, confirmation / rejet par la
caisse (legacy ppayement.php, droit « Caisse »). Voir services/paiements.py."""

from datetime import date, datetime, time
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreReq, Page, exiger_droit
from app.erreurs import introuvable
from app.models import Paiement
from app.schemas.commun import Liste, Ok, Schema
from app.services import paiements as svc
from app.services.fiches import paginer, recherche

router = APIRouter(prefix="/paiements", tags=["Paiements"])


class Preparation(BaseModel):
    type_objet: int
    objet_id: int | None
    libelle: str
    montant: int | None
    retour: str
    consignes: dict[int, str]
    numeros: list[str]


class Declaration(BaseModel):
    type_objet: int
    objet_id: int | None = None
    mode: int = Field(ge=1, le=3)
    montant: int | None = None
    remarque: str = Field(default="", max_length=500)


class PayeurOut(Schema):
    id: int
    pseudonyme: str
    nom: str


class PaiementOut(Schema):
    id: int
    type_objet: int
    objet_id: int | None
    date_paiement: datetime
    mode: int
    montant: int
    remarque: str
    etat: int
    date_confirmation: datetime | None
    membre: PayeurOut | None


class ListePaiements(Liste[PaiementOut]):
    somme: int = 0


@router.get("/preparer", response_model=Preparation)
def preparer(db: Db, membre: MembreReq, type_objet: int, objet_id: int | None = None):
    from app.models import Parametre

    t = svc.traitement(type_objet)
    p = db.get(Parametre, 1)
    return Preparation(
        type_objet=type_objet, objet_id=objet_id, libelle=t.libelle(db, membre, objet_id),
        montant=t.montant(db, membre, objet_id), retour=t.retour(db, membre, objet_id),
        consignes={int(k): v for k, v in svc.CONSIGNES.items()},
        numeros=[n for n in ((p.telephone_1, p.telephone_2) if p else ()) if n],
    )


@router.post("", response_model=Ok, status_code=201)
def declarer(donnees: Declaration, db: Db, membre: MembreReq):
    p = svc.enregistrer(db, membre, donnees.type_objet, donnees.objet_id, donnees.mode, donnees.montant, donnees.remarque)
    db.commit()
    return Ok(message="Paiement enregistré. Il sera confirmé par notre caisse après vérification.", id=p.id)


@router.get("/miens", response_model=Liste[PaiementOut])
def mes_paiements(db: Db, membre: MembreReq, page: Page):
    req = select(Paiement).options(selectinload(Paiement.membre)).where(Paiement.membre_id == membre.id)
    items, total = paginer(db, req.order_by(Paiement.date_paiement.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("", response_model=ListePaiements)
def lister(
    db: Db, membre: MembreReq, page: Page,
    etat: int | None = None, mode: int | None = None, type_objet: int | None = None,
    membre_id: int | None = None, q: str | None = None,
    du: date | None = None, au: date | None = None,
    montant_max: Annotated[int | None, Query(ge=0)] = None,
):
    """Liste de la caisse (legacy ppayement.php) : réservée aux gestionnaires ayant le droit « Caisse »."""
    exiger_droit(membre, "caisse")
    req = select(Paiement).options(selectinload(Paiement.membre))
    for cond in (
        Paiement.etat == etat if etat else None,
        Paiement.mode == mode if mode else None,
        Paiement.type_objet == type_objet if type_objet else None,
        Paiement.membre_id == membre_id if membre_id else None,
        Paiement.montant <= montant_max if montant_max is not None else None,
        Paiement.date_paiement >= datetime.combine(du, time.min) if du else None,
        Paiement.date_paiement <= datetime.combine(au, time.max) if au else None,  # correctif : jour inclus
        recherche(q, Paiement.remarque),
    ):
        if cond is not None:
            req = req.where(cond)
    filtres = req.subquery()
    somme = db.scalar(select(func.coalesce(func.sum(filtres.c.montant), 0))) or 0
    items, total = paginer(db, req.order_by(Paiement.date_paiement.desc()), page)
    return ListePaiements(items=items, total=total, page=page.page, taille=page.taille, somme=int(somme))


def _paiement(db: Db, id_: int) -> Paiement:
    p = db.get(Paiement, id_)
    if p is None:
        raise introuvable("Paiement introuvable.")
    return p


@router.post("/{id_}/confirmer", response_model=Ok)
def confirmer(id_: int, db: Db, membre: MembreReq):
    exiger_droit(membre, "caisse")
    svc.confirmer(db, _paiement(db, id_), membre)
    db.commit()
    return Ok(message="Paiement confirmé.", id=id_)


@router.post("/{id_}/rejeter", response_model=Ok)
def rejeter(id_: int, db: Db, membre: MembreReq):
    exiger_droit(membre, "caisse")
    svc.rejeter(db, _paiement(db, id_), membre)
    db.commit()
    return Ok(message="Paiement rejeté : les effets de la commande ont été annulés.", id=id_)


routers = [router]
