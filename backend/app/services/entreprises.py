"""Règles partagées de la section « Entreprises - Marchés » : entreprises d'un membre, accès
« compte entreprise » au comparateur de prix (ADR-0007 S6a), catalogue libre des produits."""

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import Etat
from app.erreurs import ErreurMetier, erreur, interdit
from app.models import Entreprise, Membre, ProduitProspective

MESSAGE_COMPTE_ENTREPRISE = "Il faut avoir un compte entreprise pour y avoir accès."
LONGUEUR_MIN_PRODUIT = 3


def entreprises_de(db: Session, membre: Membre) -> list[Entreprise]:
    """Entreprises créées par le membre (hors fiches supprimées), par nom."""
    return list(
        db.scalars(
            select(Entreprise)
            .where(Entreprise.membre_id == membre.id, Entreprise.etat != Etat.SUPPRIME)
            .order_by(Entreprise.nom)
        ).all()
    )


def est_compte_entreprise(db: Session, membre: Membre | None) -> bool:
    """Compte entreprise = gestionnaire, ou membre personne morale ayant au moins une entreprise
    dans l'annuaire."""
    if membre is None:
        return False
    if membre.est_gestionnaire:
        return True
    if not membre.est_morale:
        return False
    return bool(
        db.scalar(
            select(func.count())
            .select_from(Entreprise)
            .where(Entreprise.membre_id == membre.id, Entreprise.etat != Etat.SUPPRIME)
        )
    )


def exiger_compte_entreprise(db: Session, membre: Membre | None) -> Membre:
    if membre is None:
        raise ErreurMetier(MESSAGE_COMPTE_ENTREPRISE, 401)
    if not est_compte_entreprise(db, membre):
        raise interdit(MESSAGE_COMPTE_ENTREPRISE)
    return membre


def normaliser_nom_produit(nom: str | None) -> str:
    """Espaces superflus retirés, première lettre en majuscule (« ciment  50 kg » → « Ciment 50 kg »)."""
    n = re.sub(r"\s+", " ", nom or "").strip()
    return n[:1].upper() + n[1:]


def produit_par_nom(db: Session, nom: str, exclure_id: int | None = None) -> ProduitProspective | None:
    req = select(ProduitProspective).where(func.lower(ProduitProspective.nom) == nom.lower())
    if exclure_id:
        req = req.where(ProduitProspective.id != exclure_id)
    return db.scalar(req.limit(1))


def verifier_nom_produit(nom: str, champ: str = "nom") -> None:
    if len(nom) < LONGUEUR_MIN_PRODUIT:
        msg = f"Le nom du produit doit avoir au moins {LONGUEUR_MIN_PRODUIT} caractères."
        raise erreur(msg, **{champ: msg})


def resoudre_produit(db: Session, produit_id: int | None, nouveau: str) -> ProduitProspective:
    """Produit choisi dans la liste ou tapé : s'il existe déjà (même nom), il est réutilisé,
    sinon il est créé à la volée, publié (legacy incl-prospective.php). La liste l'emporte si
    les deux sont renseignés (comme le legacy)."""
    if produit_id:
        produit = db.get(ProduitProspective, produit_id)
        if produit is None or produit.etat != Etat.AUTORISE:
            raise erreur("Veuillez indiquer le produit.", produit_id="Ce produit n'est plus disponible.")
        return produit
    nom = normaliser_nom_produit(nouveau)
    if not nom:
        raise erreur("Veuillez indiquer le produit.", produit_id="Choisissez un produit ou tapez son nom.")
    verifier_nom_produit(nom, "nouveau_produit")
    existant = produit_par_nom(db, nom)
    if existant is not None:
        if existant.etat != Etat.AUTORISE:
            raise erreur("Ce produit n'est pas disponible.", nouveau_produit="Ce produit a été retiré du comparateur.")
        return existant
    produit = ProduitProspective(nom=nom, etat=Etat.AUTORISE)
    db.add(produit)
    db.flush()
    return produit
