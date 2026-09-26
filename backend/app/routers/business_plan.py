"""Business plan « auto-diagnostic » (legacy choix5.php?opaf=2, incl-choix5B.php,
incl-businessplan.php ; F-S5-40 à F-S5-45).

Un seul business plan par membre. « Sauvegarder » = brouillon (état 1), « Envoyer » = soumis au
conseiller (état 2) : la distinction que le legacy suggérait est réelle (ADR-0004, ADR-0007 S5d).
Liste invisible des visiteurs : un membre voit le sien, un gestionnaire les voit tous."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Etat
from app.erreurs import erreur, interdit, introuvable
from app.models import BusinessPlan, Message
from app.schemas import business_plan as s
from app.schemas.commun import Liste, Ok
from app.services.fiches import changer_etat, paginer, recherche
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/business-plan", tags=["Business plan"])

INTROUVABLE = "Ce business plan n'existe pas ou ne vous est pas accessible."


def _detail(fiche: BusinessPlan, membre) -> s.BusinessPlanDetail:
    d = s.BusinessPlanDetail.model_validate(fiche)
    d.peut_modifier = peut_modifier(membre, fiche.membre_id)
    d.peut_moderer = membre.peut_moderer()
    return d


def _obtenir(db: Db, id_: int, membre) -> BusinessPlan:
    """Le porteur (sauf fiche supprimée) ou un gestionnaire ; 404 sinon (correctif F-S5-53)."""
    fiche = db.get(BusinessPlan, id_)
    if fiche is None:
        raise introuvable(INTROUVABLE)
    if membre.est_gestionnaire or (fiche.membre_id == membre.id and fiche.etat != Etat.SUPPRIME):
        return fiche
    raise introuvable(INTROUVABLE)


def _valider(d: s.BusinessPlanEntree) -> None:
    """Règles legacy (messages exacts, orthographe corrigée)."""
    champs: dict[str, str] = {}
    if len(d.type_activite.strip()) < 5:
        champs["type_activite"] = "Veuillez indiquer le type d'activité avec 5 caractères minimum."
    if len(d.description_projet.strip()) < 10:
        champs["description_projet"] = "Veuillez décrire votre projet avec 10 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)


def _appliquer(fiche: BusinessPlan, d: s.BusinessPlanEntree) -> None:
    for champ in s.CHAMPS_TEXTE:
        setattr(fiche, champ, getattr(d, champ).strip())
    fiche.niveau_realisation = d.niveau_realisation


def _soumettre(db: Db, fiche: BusinessPlan, membre) -> None:
    """« Envoyer » : la fiche passe à l'état 2 et la frangine est prévenue dans la messagerie du
    porteur (une seule fois, au premier envoi)."""
    if fiche.etat == Etat.AUTORISE:
        return
    fiche.etat = Etat.AUTORISE
    if membre.id == fiche.membre_id:
        db.add(Message(
            membre_id=fiche.membre_id, auteur_id=membre.id, de_la_frangine=False,
            texte=f"[Message automatique] Je viens d'envoyer mon business plan {fiche.reference} "
                  f"(« {fiche.type_activite} ») : merci de le relire.",
        ))


@router.get("", response_model=Liste[s.BusinessPlanResume])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    q: str | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
):
    """F-S5-40 : un membre voit son business plan, un gestionnaire les voit tous (supprimés exclus
    sauf filtre `etat=3`). Recherche dans la description du projet (legacy), le type d'activité et la
    référence ; tri par date décroissante."""
    req = select(BusinessPlan).options(selectinload(BusinessPlan.membre))
    if membre.est_gestionnaire:
        req = req.where(BusinessPlan.etat == etat) if etat else req.where(BusinessPlan.etat != Etat.SUPPRIME)
    else:
        req = req.where(BusinessPlan.membre_id == membre.id, BusinessPlan.etat != Etat.SUPPRIME)
    if (cond := recherche(q, BusinessPlan.description_projet, BusinessPlan.type_activite, BusinessPlan.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(BusinessPlan.date_creation.desc(), BusinessPlan.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/mien", response_model=s.BusinessPlanDetail | None)
def le_mien(db: Db, membre: MembreReq):
    """Business plan du membre connecté (pour pré-remplir le formulaire), ou `null`."""
    fiche = db.scalar(select(BusinessPlan).where(BusinessPlan.membre_id == membre.id))
    if fiche is None or fiche.etat == Etat.SUPPRIME:
        return None
    return _detail(fiche, membre)


@router.get("/{id_}", response_model=s.BusinessPlanDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    return _detail(_obtenir(db, id_, membre), membre)


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.BusinessPlanEntree, db: Db, membre: MembreReq):
    """Création réservée aux membres (F-S5-41), une seule fiche par membre."""
    if membre.est_gestionnaire:
        raise interdit("La création d'un business plan est réservée aux membres.")
    _valider(donnees)
    fiche = db.scalar(select(BusinessPlan).where(BusinessPlan.membre_id == membre.id))
    if fiche is not None and fiche.etat != Etat.SUPPRIME:
        raise erreur("La fiche de business plan du membre est déjà enregistrée.")
    if fiche is None:
        fiche = BusinessPlan(membre_id=membre.id, reference=nouvelle_reference(db, Prefixe.BUSINESS_PLAN))
        db.add(fiche)
    # Une fiche supprimée par la modération est réutilisée (contrainte « 1 par membre »)
    fiche.etat = Etat.NON_TRAITE
    _appliquer(fiche, donnees)
    if donnees.envoyer:
        _soumettre(db, fiche, membre)
    db.commit()
    message = "Votre business plan est envoyé à votre frangine." if donnees.envoyer else "Enregistrement effectué."
    return Ok(message=message, id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.BusinessPlanEntree, db: Db, membre: MembreReq):
    """Modification par le porteur ou un gestionnaire habilité. « Sauvegarder » ne retire pas une
    fiche déjà envoyée ; « Envoyer » soumet un brouillon."""
    fiche = _obtenir(db, id_, membre)
    verifier_modification(membre, fiche.membre_id)
    _valider(donnees)
    _appliquer(fiche, donnees)
    if donnees.envoyer:
        _soumettre(db, fiche, membre)
    db.commit()
    message = "Votre business plan est envoyé à votre frangine." if donnees.envoyer else "Modification effectuée."
    return Ok(message=message, id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """État de la fiche : gestionnaire avec le droit « Activation » (F-S5-43)."""
    fiche = _obtenir(db, id_, membre)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


routers = [router]
