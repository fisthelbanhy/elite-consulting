"""Comportements communs à toutes les « fiches » du site (annonces, projets, entreprises…) :
pagination, recherche plein texte, compteur de consultations, modération, suppression logique."""

from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.deps import Pagination, exiger_droit
from app.enums import Etat
from app.erreurs import erreur, interdit, introuvable
from app.models.membres import Membre


def paginer(db: Session, requete: Select, page: Pagination) -> tuple[Sequence[Any], int]:
    total = db.scalar(select(func.count()).select_from(requete.order_by(None).subquery())) or 0
    items = db.scalars(requete.offset(page.offset).limit(page.taille)).all()
    return items, total


def recherche(q: str | None, *colonnes):
    """Condition « q apparaît dans une des colonnes » (insensible à la casse), ou None."""
    q = (q or "").strip()
    if not q:
        return None
    motif = f"%{q}%"
    return or_(*[c.ilike(motif) for c in colonnes])


def visibilite(modele, membre: Membre | None, colonne_auteur="auteur_id"):
    """Filtre de visibilité standard : le public voit les fiches publiées (état 2) ; l'auteur voit
    aussi les siennes (sauf supprimées) ; un gestionnaire voit tout."""
    if membre is not None and membre.est_gestionnaire:
        return None
    publie = modele.etat == Etat.AUTORISE
    if membre is None:
        return publie
    return or_(publie, (getattr(modele, colonne_auteur) == membre.id) & (modele.etat != Etat.SUPPRIME))


def obtenir(db: Session, modele, id_: int, membre: Membre | None, colonne_auteur="auteur_id", message="Fiche introuvable."):
    """Charge une fiche en respectant la visibilité (404 si non visible)."""
    fiche = db.get(modele, id_)
    if fiche is None:
        raise introuvable(message)
    if membre is not None and membre.est_gestionnaire:
        return fiche
    auteur = getattr(fiche, colonne_auteur, None)
    if fiche.etat == Etat.AUTORISE or (membre is not None and auteur == membre.id and fiche.etat != Etat.SUPPRIME):
        return fiche
    raise introuvable(message)


def compter_visite(fiche, membre: Membre | None, colonne_auteur="auteur_id") -> None:
    """Legacy : chaque consultation par un tiers (ni auteur ni gestionnaire) incrémente le compteur."""
    if membre is not None and (membre.est_gestionnaire or getattr(fiche, colonne_auteur, None) == membre.id):
        return
    fiche.nombre_visites = (fiche.nombre_visites or 0) + 1
    fiche.date_derniere_visite = datetime.now()


def changer_etat(fiche, etat: int, membre: Membre) -> None:
    """Modération : réservée au gestionnaire ayant le droit « Activation »."""
    exiger_droit(membre, "activation")
    if etat not in {e.value for e in Etat}:
        raise erreur("État inconnu.", etat="État inconnu.")
    fiche.etat = etat


def supprimer(fiche, membre: Membre, colonne_auteur="auteur_id") -> None:
    """Suppression logique (état 3) par l'auteur ou un gestionnaire habilité."""
    if not (getattr(fiche, colonne_auteur, None) == membre.id or membre.peut_moderer()):
        raise interdit("Seul l'auteur de la fiche ou un gestionnaire habilité peut la supprimer.")
    fiche.etat = Etat.SUPPRIME
