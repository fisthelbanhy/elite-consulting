"""Expressions d'intérêt / de besoin déposées sous une fiche (legacy `besoin`), communes à
l'emploi, l'immobilier, les articles et les partenariats (ADR-0007 S2d)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.erreurs import erreur
from app.models.contenu import Message
from app.models.membres import Membre
from app.models.rh import Interet

# `besoin.typebsn` legacy
TYPE_EMPLOI = 2
TYPE_ANNONCE = 3  # immobilier et articles
TYPE_PARTENARIAT = 6

CIBLES = {
    "annonce_emploi_id": TYPE_EMPLOI,
    "immobilier_id": TYPE_ANNONCE,
    "article_id": TYPE_ANNONCE,
    "partenariat_id": TYPE_PARTENARIAT,
}


def deposer(
    db: Session,
    membre: Membre,
    cible: str,
    cible_id: int,
    auteur_fiche_id: int | None,
    sous_type: int,
    message: str,
    libelle_fiche: str,
    lien: str,
    message_obligatoire: bool = False,
) -> Interet:
    """Une seule contribution par membre et par fiche ; jamais sur sa propre fiche.
    L'auteur de la fiche est prévenu par la messagerie privée."""
    if auteur_fiche_id == membre.id:
        raise erreur("Vous ne pouvez pas vous manifester sur votre propre fiche.")
    message = message.strip()
    if message_obligatoire and len(message) < 5:
        raise erreur("Message trop court.", message="Présentez votre besoin en quelques mots (5 caractères minimum).")
    colonne = getattr(Interet, cible)
    deja = db.scalar(select(Interet.id).where(colonne == cible_id, Interet.membre_id == membre.id).limit(1))
    if deja:
        raise erreur("Opération déjà effectuée.", message="Vous vous êtes déjà manifesté·e sur cette fiche.")
    interet = Interet(type_objet=CIBLES[cible], sous_type=sous_type, membre_id=membre.id, message=message, **{cible: cible_id})
    db.add(interet)
    if auteur_fiche_id:
        db.add(Message(
            membre_id=auteur_fiche_id,
            auteur_id=None,
            de_la_frangine=True,
            texte=f"Bonne nouvelle : {membre.pseudonyme} s'intéresse à votre fiche « {libelle_fiche} ». "
                  f"Retrouvez son message sur {lien}",
        ))
    return interet


def lister(db: Session, cible: str, cible_id: int) -> list[Interet]:
    colonne = getattr(Interet, cible)
    return list(db.scalars(select(Interet).where(colonne == cible_id).order_by(Interet.date_creation.desc())))
