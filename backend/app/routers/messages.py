"""Messagerie privée membre ↔ « la frangine » (legacy : incl-message.php, pmessage.php).
Inventaire : E-TRV-10, E-ADM-13, F-TRV-48 à F-TRV-55 ; arbitrage ADR-0007 T10.

Modèle : un fil par membre (`message.membre_id`) ; `de_la_frangine` donne le sens. Toutes les
réponses des gestionnaires appartiennent au même fil, quel que soit le gestionnaire qui répond
(correctif F-TRV-55).
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreReq, Page
from app.enums import Etat, TypeMembre
from app.erreurs import erreur, interdit, introuvable
from app.models import Membre, Message
from app.schemas import messages as s
from app.schemas.commun import Liste, Ok
from app.services import messages as svc
from app.services.fiches import recherche

router = APIRouter(prefix="/messages", tags=["Messagerie"])

LIMITE_FIL = 200
MESSAGE_VIDE = "Votre message est vide. Écrivez quelques mots avant d'envoyer."


def _texte(donnees: s.MessageEntree) -> str:
    texte = donnees.texte.strip()
    if not texte:  # correctif F-TRV-54 : l'erreur est désormais affichée
        raise erreur(MESSAGE_VIDE, texte="Écrivez votre message.")
    return texte


def _fil(db: Db, membre_id: int, limite: int, avec_auteur: bool) -> list[s.MessageOut]:
    """Derniers messages du fil, du plus ancien au plus récent (état de lecture avant ouverture)."""
    req = (
        select(Message)
        .options(selectinload(Message.auteur))
        .where(Message.membre_id == membre_id)
        .order_by(Message.date_message.desc(), Message.id.desc())
        .limit(limite)
    )
    sortie = [s.MessageOut.model_validate(m) for m in reversed(db.scalars(req).all())]
    for m in sortie:
        # Côté membre, c'est « la frangine » qui répond : l'identité du gestionnaire reste interne.
        if not avec_auteur or not m.de_la_frangine:
            m.auteur = None
    return sortie


def _compter_non_lus(db: Db, membre_id: int, de_la_frangine: bool) -> int:
    return db.scalar(
        select(func.count()).select_from(Message).where(
            Message.membre_id == membre_id, Message.de_la_frangine.is_(de_la_frangine), Message.lu.is_(False)
        )
    ) or 0


# --- Côté membre (Master ou Membre) -------------------------------------------------------------


def _exiger_membre(membre) -> None:
    if membre.est_gestionnaire:
        raise interdit("Les gestionnaires répondent aux membres depuis la messagerie de gestion.")


@router.get("", response_model=s.FilMembre)
def mon_fil(db: Db, membre: MembreReq, limite: Annotated[int, Query(ge=1, le=500)] = LIMITE_FIL):
    """Fil du membre connecté ; les réponses reçues sont marquées lues à l'ouverture (F-TRV-50)."""
    _exiger_membre(membre)
    messages = _fil(db, membre.id, limite, avec_auteur=False)
    non_lus = _compter_non_lus(db, membre.id, de_la_frangine=True)
    if non_lus:
        svc.marquer_lus(db, membre.id, de_la_frangine=True)
        db.commit()
    return s.FilMembre(messages=messages, non_lus=non_lus, frangine_en_ligne=svc.frangine_en_ligne(db))


@router.post("", response_model=Ok, status_code=201)
def ecrire(donnees: s.MessageEntree, db: Db, membre: MembreReq):
    _exiger_membre(membre)
    message = Message(
        membre_id=membre.id, auteur_id=membre.id, de_la_frangine=False, texte=_texte(donnees), lu=False,
        date_message=datetime.now(),
    )
    db.add(message)
    db.commit()
    return Ok(message="Message envoyé. Votre frangine vous répond au plus vite.", id=message.id)


# --- Côté gestionnaires ---------------------------------------------------------------------------


@router.get("/fils", response_model=Liste[s.FilResume])
def fils(db: Db, membre: Gestionnaire, page: Page, q: str | None = None, tous: bool = False):
    """Membres ayant un fil (non lus d'abord, puis par dernier message). `tous=true` ajoute les
    membres sans fil, pour écrire le premier message (le legacy listait tous les membres)."""
    non_lus = func.sum(case((and_(Message.de_la_frangine.is_(False), Message.lu.is_(False)), 1), else_=0))
    stats = (
        select(
            Message.membre_id.label("membre_id"),
            func.count().label("total"),
            non_lus.label("non_lus"),
            func.max(Message.id).label("dernier_id"),
            func.max(Message.date_message).label("derniere_date"),
        )
        .group_by(Message.membre_id)
        .subquery()
    )
    req = select(Membre, stats.c.total, stats.c.non_lus, stats.c.dernier_id)
    if tous:
        req = req.outerjoin(stats, stats.c.membre_id == Membre.id).where(Membre.etat != Etat.SUPPRIME)
    else:
        req = req.join(stats, stats.c.membre_id == Membre.id)
    req = req.where(Membre.type_compte != TypeMembre.GESTIONNAIRE)
    if (cond := recherche(q, Membre.nom, Membre.pseudonyme, Membre.telephone, Membre.identifiant)) is not None:
        req = req.where(cond)

    total = db.scalar(select(func.count()).select_from(req.subquery())) or 0
    req = req.order_by(
        (func.coalesce(stats.c.non_lus, 0) > 0).desc(),
        stats.c.derniere_date.desc().nulls_last(),
        Membre.nom,
    )
    lignes = db.execute(req.offset(page.offset).limit(page.taille)).all()

    ids = [ligne.dernier_id for ligne in lignes if ligne.dernier_id]
    derniers = {m.id: m for m in db.scalars(select(Message).where(Message.id.in_(ids)))} if ids else {}
    maintenant = datetime.now()
    items = []
    for m, nb, nl, dernier_id in lignes:
        info = s.MembreFil.model_validate(m)
        info.en_ligne = svc.en_ligne(m, maintenant)
        dernier = derniers.get(dernier_id)
        sortie = s.MessageOut.model_validate(dernier) if dernier else None
        if sortie:
            sortie.auteur = None
        items.append(s.FilResume(membre=info, total=nb or 0, non_lus=int(nl or 0), dernier_message=sortie))
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


def _titulaire(db: Db, membre_id: int) -> Membre:
    titulaire = db.get(Membre, membre_id)
    if titulaire is None or titulaire.etat == Etat.SUPPRIME:
        raise introuvable("Ce membre n'existe pas ou son compte est supprimé.")
    if titulaire.est_gestionnaire:
        raise erreur("La messagerie relie un membre à la frangine : choisissez un membre, pas un gestionnaire.")
    return titulaire


@router.get("/fils/{membre_id}", response_model=s.FilGestion)
def fil_membre(
    membre_id: int, db: Db, membre: Gestionnaire, limite: Annotated[int, Query(ge=1, le=500)] = LIMITE_FIL
):
    """Ouvre la conversation d'un membre : ses messages sont marqués lus (F-TRV-53)."""
    titulaire = _titulaire(db, membre_id)
    messages = _fil(db, titulaire.id, limite, avec_auteur=True)
    non_lus = _compter_non_lus(db, titulaire.id, de_la_frangine=False)
    if non_lus:
        svc.marquer_lus(db, titulaire.id, de_la_frangine=False)
        db.commit()
    info = s.MembreFil.model_validate(titulaire)
    info.en_ligne = svc.en_ligne(titulaire)
    return s.FilGestion(membre=info, messages=messages, non_lus=non_lus)


@router.post("/fils/{membre_id}", response_model=Ok, status_code=201)
def repondre(membre_id: int, donnees: s.MessageEntree, db: Db, membre: Gestionnaire):
    """Réponse de la frangine ; les messages du membre sont marqués lus (comme le legacy)."""
    titulaire = _titulaire(db, membre_id)
    texte = _texte(donnees)
    message = Message(
        membre_id=titulaire.id, auteur_id=membre.id, de_la_frangine=True, texte=texte, lu=False,
        date_message=datetime.now(),
    )
    db.add(message)
    svc.marquer_lus(db, titulaire.id, de_la_frangine=False)
    db.commit()
    return Ok(message="Réponse envoyée.", id=message.id)


routers = [router]
