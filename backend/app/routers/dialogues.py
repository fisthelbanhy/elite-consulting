"""Dialogue contextuel « Écrire à la frangine » (legacy : incl-dialogue.php, table `dialogue`).
Inventaire : E-TRV-11, S7-14, F-TRV-56 à F-TRV-58, F-S7-37 à F-S7-40 ; ADR-0007 T9.

Un fil par rubrique (`type_dialogue` : 1 Placement, 2 Opération bancaire, 3 Demande de crédit,
4 Contentieux ; 0 accueil). Le membre voit ses messages et les réponses qui lui sont adressées ;
le gestionnaire voit les messages adressés à la frangine (`destinataire_id` NULL) et répond au bon
membre (correctif du « membre n° 1 ») ; un visiteur ne voit rien (correctif)."""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreReq, Page
from app.enums import Etat, RubriqueTresorerie
from app.erreurs import erreur
from app.models import Dialogue, Membre, Message
from app.schemas import dialogues as s
from app.schemas.commun import Auteur, Liste, Ok
from app.services.fiches import paginer, recherche

router = APIRouter(prefix="/dialogues", tags=["Dialogue"])

LIENS = {
    RubriqueTresorerie.PLACEMENT: "/tresorerie/placements",
    RubriqueTresorerie.OPERATION: "/tresorerie/operations",
    RubriqueTresorerie.CREDIT: "/tresorerie/credits",
    RubriqueTresorerie.CONTENTIEUX: "/tresorerie/contentieux",
}
TypeDialogue = Annotated[int, Query(ge=0, le=4)]


def _nom_rubrique(type_dialogue: int) -> str:
    return RubriqueTresorerie.libelle(type_dialogue) or "Accueil"


def _out(d: Dialogue, membre: Membre) -> s.DialogueOut:
    o = s.DialogueOut.model_validate(d)
    o.de_moi = d.auteur_id == membre.id
    o.de_la_frangine = bool(d.auteur and d.auteur.est_gestionnaire)
    o.a_la_frangine = d.destinataire_id is None
    return o


@router.get("", response_model=Liste[s.DialogueOut])
def lister(db: Db, membre: MembreReq, page: Page, type: TypeDialogue, q: str | None = None, membre_id: int | None = None):
    """Messages du fil, du plus ancien au plus récent ; la page 1 contient les plus récents."""
    req = (
        select(Dialogue)
        .options(selectinload(Dialogue.auteur), selectinload(Dialogue.destinataire))
        .where(Dialogue.type_dialogue == type, Dialogue.etat == Etat.AUTORISE)
    )
    if membre.est_gestionnaire:
        if membre_id:
            req = req.where(or_(Dialogue.auteur_id == membre_id, Dialogue.destinataire_id == membre_id))
    else:
        req = req.where(or_(Dialogue.auteur_id == membre.id, Dialogue.destinataire_id == membre.id))
    if (cond := recherche(q, Dialogue.texte)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Dialogue.date_message.desc(), Dialogue.id.desc()), page)
    return Liste(items=[_out(d, membre) for d in reversed(items)], total=total, page=page.page, taille=page.taille)


@router.get("/conversations", response_model=list[s.Conversation])
def conversations(db: Db, membre: Gestionnaire, type: TypeDialogue):
    """Un fil par membre (interlocuteur de la frangine), le plus récent d'abord ; « en attente »
    quand le dernier message vient du membre."""
    messages = db.scalars(
        select(Dialogue)
        .options(selectinload(Dialogue.auteur), selectinload(Dialogue.destinataire))
        .where(Dialogue.type_dialogue == type, Dialogue.etat == Etat.AUTORISE)
        .order_by(Dialogue.date_message, Dialogue.id)
    ).all()
    fils: dict[int, dict] = {}
    for d in messages:
        # Interlocuteur : l'auteur d'un message à la frangine, ou le destinataire d'une réponse
        interlocuteur = d.auteur if d.destinataire_id is None else d.destinataire
        if interlocuteur is None or (d.destinataire_id is None and interlocuteur.est_gestionnaire):
            continue
        fil = fils.setdefault(interlocuteur.id, {"membre": interlocuteur, "nombre": 0})
        fil["nombre"] += 1
        fil["dernier"] = d
    resultat = [
        s.Conversation(
            membre=Auteur.model_validate(f["membre"]), nombre=f["nombre"], dernier_message=f["dernier"].texte[:160],
            date_dernier=f["dernier"].date_message, en_attente=f["dernier"].destinataire_id is None,
        )
        for f in fils.values()
    ]
    return sorted(resultat, key=lambda c: (not c.en_attente, -(c.date_dernier or datetime.min).timestamp()))


@router.post("", response_model=Ok, status_code=201)
def ecrire(donnees: s.DialogueEntree, db: Db, membre: MembreReq):
    texte = donnees.texte.strip()
    destinataire: Membre | None = None
    if membre.est_gestionnaire:
        destinataire = db.get(Membre, donnees.destinataire_id) if donnees.destinataire_id else None
        if destinataire is None or destinataire.etat == Etat.SUPPRIME:
            raise erreur("Veuillez indiquer le destinataire du message.", destinataire_id="Veuillez indiquer le destinataire du message.")
    if len(texte) < 2:
        raise erreur("Votre message doit avoir 2 caractères minimum.", texte="Votre message doit avoir 2 caractères minimum.")
    # Protection contre le double envoi (même texte, même fil, moins de 2 minutes)
    recent = db.scalar(
        select(Dialogue.id).where(
            Dialogue.auteur_id == membre.id, Dialogue.type_dialogue == donnees.type_dialogue, Dialogue.texte == texte,
            Dialogue.date_message >= datetime.now() - timedelta(minutes=2),
        ).limit(1)
    )
    if recent:
        raise erreur("Ce message est déjà envoyé.", texte="Ce message est déjà envoyé.")
    d = Dialogue(
        auteur_id=membre.id, destinataire_id=destinataire.id if destinataire else None,
        type_dialogue=donnees.type_dialogue, texte=texte, date_message=datetime.now(), etat=Etat.AUTORISE,
    )
    db.add(d)
    if destinataire is not None and destinataire.id != membre.id:
        # Le membre est prévenu dans sa messagerie qu'un conseiller lui a répondu
        lien = LIENS.get(donnees.type_dialogue, "/")
        db.add(Message(
            membre_id=destinataire.id, auteur_id=None, de_la_frangine=True,
            texte=f"La frangine vous a répondu dans « {_nom_rubrique(donnees.type_dialogue)} ». "
                  f"Retrouvez la conversation sur {lien}#dialogue",
        ))
    db.commit()
    return Ok(message="Votre message est envoyé." if not destinataire else "Réponse envoyée.", id=d.id)


routers = [router]
