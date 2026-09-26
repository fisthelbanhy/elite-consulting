"""Boîte à idées (legacy : psugest.php). Inventaire : E-TRV-12, E-ADM-12, F-TRV-59 à F-TRV-63 ;
arbitrage ADR-0007 T8 : dépôt réservé aux connectés, anonyme en base, module « Accueil » (0)
autorisé, doublon (module + texte) refusé, liste et état réservés aux gestionnaires."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.deps import Db, Gestionnaire, MembreReq, Page
from app.enums import Etat, Module
from app.erreurs import erreur, introuvable
from app.models import Suggestion
from app.schemas import suggestions as s
from app.schemas.commun import Liste, Ok
from app.services.fiches import paginer, recherche

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


@router.post("", response_model=Ok, status_code=201)
def deposer(donnees: s.SuggestionEntree, db: Db, membre: MembreReq):
    champs: dict[str, str] = {}
    # Correctif F-TRV-60 : « Accueil » (0) est un module valide
    if donnees.module is None or donnees.module not in {m.value for m in Module}:
        champs["module"] = "Veuillez indiquer le module concerné."
    texte = donnees.texte.strip()
    if len(texte) < 10:
        champs["texte"] = "Votre suggestion doit contenir au moins 10 caractères."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Correctif F-TRV-61 : l'anti-doublon compare bien le module et le texte
    doublon = select(Suggestion.id).where(Suggestion.module == donnees.module, Suggestion.texte == texte)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette suggestion est déjà enregistrée.")
    # Anonyme : aucune trace de l'auteur n'est conservée
    suggestion = Suggestion(module=donnees.module, texte=texte, date=datetime.now(), etat=Etat.NON_TRAITE)
    db.add(suggestion)
    db.commit()
    return Ok(message="Enregistrement effectué. Merci pour votre idée : l'équipe la lira avec attention.")


@router.get("", response_model=Liste[s.SuggestionOut])
def lister(
    db: Db,
    membre: Gestionnaire,
    page: Page,
    module: Annotated[int | None, Query(ge=0, le=8)] = None,
    q: str | None = None,
    etat: int | None = None,
):
    """Liste de gestion (F-TRV-62, F-TRV-63) : plus récentes d'abord."""
    req = select(Suggestion)
    if module is not None:
        req = req.where(Suggestion.module == module)
    req = req.where(Suggestion.etat == etat) if etat else req.where(Suggestion.etat != Etat.SUPPRIME)
    if (cond := recherche(q, Suggestion.texte)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Suggestion.date.desc(), Suggestion.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.CompteursSuggestions)
def compteurs(db: Db, membre: Gestionnaire):
    def n(*conds) -> int:
        return db.scalar(select(func.count()).select_from(Suggestion).where(*conds)) or 0

    return s.CompteursSuggestions(a_lire=n(Suggestion.etat == Etat.NON_TRAITE), total=n(Suggestion.etat != Etat.SUPPRIME))


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatSuggestion, db: Db, membre: Gestionnaire):
    suggestion = db.get(Suggestion, id_)
    if suggestion is None:
        raise introuvable("Cette suggestion n'existe pas.")
    suggestion.etat = donnees.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=suggestion.id)


routers = [router]
