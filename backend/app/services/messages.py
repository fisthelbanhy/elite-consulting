"""Messagerie privée membre ↔ « la frangine » : présence en ligne et notifications système.

Présence (ADR-0007 T3) : un membre est « en ligne » s'il a fait une requête authentifiée il y a
moins de 5 minutes (`membre.derniere_activite`, mise à jour par `app.deps`). « La frangine » est
en ligne dès qu'un gestionnaire l'est.
"""

from datetime import datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.enums import TypeMembre
from app.models import Membre, Message

PRESENCE = timedelta(minutes=5)


def en_ligne(membre: Membre | None, maintenant: datetime | None = None) -> bool:
    if membre is None or membre.derniere_activite is None:
        return False
    return membre.derniere_activite >= (maintenant or datetime.now()) - PRESENCE


def frangine_en_ligne(db: Session) -> bool:
    n = db.scalar(
        select(func.count()).select_from(Membre).where(
            Membre.type_compte == TypeMembre.GESTIONNAIRE, Membre.derniere_activite >= datetime.now() - PRESENCE
        )
    )
    return bool(n)


def marquer_lus(db: Session, membre_id: int, de_la_frangine: bool) -> int:
    """Marque lus les messages non lus d'un fil, dans un sens donné. Renvoie le nombre modifié.

    - ouverture par le membre : `de_la_frangine=True` (les réponses qu'il a reçues) ;
    - ouverture ou réponse par un gestionnaire : `de_la_frangine=False` (les messages du membre).
    """
    res = db.execute(
        update(Message)
        .where(Message.membre_id == membre_id, Message.de_la_frangine.is_(de_la_frangine), Message.lu.is_(False))
        .values(lu=True)
        .execution_options(synchronize_session=False)
    )
    return res.rowcount or 0


def notifier(db: Session, membre_id: int, texte: str, auteur_id: int | None = None) -> Message:
    """Message système de la frangine vers un membre (visible dans « Mes messages »)."""
    message = Message(membre_id=membre_id, auteur_id=auteur_id, de_la_frangine=True, texte=texte, lu=False)
    db.add(message)
    return message
