"""Boutique bien-être : prix selon le statut, panier produits et paiement (type 1).

Legacy : incl-venteproduit.php (S5, prix distributeur) et incl-choix1C.php (santé, prix public),
qui partageaient le même panier (`panier.typepnr = 1`). Décisions :
- ADR-0007 S5a : **un seul panier** ; un distributeur (souscription validée) paie le prix
  distributeur, les autres le prix public ; le prix est figé à l'ajout ;
- ADR-0004 : paiement bloqué si une quantité dépasse le stock (message legacy) ;
- ADR-0007 S3b : stock décrémenté et lignes marquées payées à la **déclaration** du paiement ;
  restitution si la caisse **rejette** le paiement.
Les lignes d'articles (type 2) appartiennent au module Petites annonces."""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.enums import Etat, TypeObjetPaye
from app.erreurs import erreur
from app.models import LignePanier, Paiement, Produit
from app.models.membres import Membre
from app.services import paiements
from app.services.distributeur import est_distributeur

MESSAGE_STOCK = (
    "Certaines quantités des produits dans le panier sont supérieures aux quantités en stock. "
    "Veuillez les supprimer dans le panier et prendre une nouvelle quantité en rapport avec le stock."
)
MESSAGE_RETIRE = "Un produit de votre panier n'est plus proposé : retirez-le pour pouvoir payer."
QUANTITE_MAX = 999


def prix_pour(produit: Produit, distributeur: bool) -> int:
    """Prix unique de panier (ADR-0007 S5a). Sans prix distributeur renseigné, un distributeur
    paie le prix public ; un prix nul signifie « prix non communiqué »."""
    if distributeur and (produit.prix_distributeur or 0) > 0:
        return int(produit.prix_distributeur)
    return int(produit.prix_public or 0)


def lignes_non_payees(db: Session, membre_id: int) -> list[LignePanier]:
    return list(db.scalars(
        select(LignePanier)
        .options(selectinload(LignePanier.produit))
        .where(
            LignePanier.membre_id == membre_id,
            LignePanier.type_objet == TypeObjetPaye.PRODUIT,
            LignePanier.paye.is_(False),
            LignePanier.etat == Etat.AUTORISE,
        )
        .order_by(LignePanier.date_ajout, LignePanier.id)
    ))


def lignes_bloquantes(lignes: list[LignePanier]) -> tuple[set[int], str | None]:
    """Lignes empêchant le paiement : produit retiré du catalogue, ou quantité demandée (cumulée sur
    toutes les lignes du même produit) supérieure au stock."""
    demandes: dict[int, int] = defaultdict(int)
    for li in lignes:
        if li.produit_id:
            demandes[li.produit_id] += li.quantite
    bloquantes: set[int] = set()
    message = None
    for li in lignes:
        p = li.produit
        if p is None or p.etat != Etat.AUTORISE:
            bloquantes.add(li.id)
            message = message or MESSAGE_RETIRE
        elif demandes[p.id] > (p.quantite_stock or 0):
            bloquantes.add(li.id)
            message = MESSAGE_STOCK
    return bloquantes, message


def total(lignes: list[LignePanier]) -> int:
    return sum(li.prix_unitaire * li.quantite for li in lignes)


def ajouter(db: Session, membre: Membre, lignes) -> int:
    """Ajout multiple (F-S5-13, F-S1-31). Aucun contrôle de stock à l'ajout (règle legacy : le
    contrôle a lieu au paiement). Une ligne existante du même produit au même prix est complétée
    au lieu d'en créer une nouvelle. Retourne le nombre d'articles ajoutés."""
    demandes = [li for li in lignes if li.quantite > 0]
    if not demandes:
        raise erreur("Choisissez au moins une quantité.", lignes="Choisissez au moins une quantité.")
    distributeur = est_distributeur(db, membre)
    existantes = {(li.produit_id, li.prix_unitaire): li for li in lignes_non_payees(db, membre.id)}
    ajoutes = 0
    for demande in demandes:
        produit = db.get(Produit, demande.produit_id)
        if produit is None or produit.etat != Etat.AUTORISE:
            raise erreur("Ce produit n'est plus disponible.")
        prix = prix_pour(produit, distributeur)
        if prix <= 0:
            raise erreur(f"« {produit.nom} » n'a pas encore de prix en ligne : demandez-le à votre frangine sur WhatsApp.")
        ligne = existantes.get((produit.id, prix))
        if ligne is not None:
            ligne.quantite = min(QUANTITE_MAX, ligne.quantite + demande.quantite)
        else:
            ligne = LignePanier(
                type_objet=TypeObjetPaye.PRODUIT, membre_id=membre.id, produit_id=produit.id,
                quantite=demande.quantite, prix_unitaire=prix, etat=Etat.AUTORISE,
            )
            db.add(ligne)
            existantes[(produit.id, prix)] = ligne
        ajoutes += demande.quantite
    return ajoutes


# --- Paiement du panier produits (type 1) ------------------------------------------------------------


def _libelle(db: Session, membre: Membre, objet_id: int | None) -> str:
    n = sum(li.quantite for li in lignes_non_payees(db, membre.id))
    return f"Commande de produits Forever — {n} article{'s' if n > 1 else ''}"


def _montant(db: Session, membre: Membre, objet_id: int | None) -> int:
    return total(lignes_non_payees(db, membre.id))


def _verifier(db: Session, membre: Membre, objet_id: int | None, montant: int) -> None:
    lignes = lignes_non_payees(db, membre.id)
    if not lignes:
        raise erreur("Votre panier est vide.")
    bloquantes, message = lignes_bloquantes(lignes)
    if bloquantes:
        raise erreur(message or MESSAGE_STOCK)


def _enregistrer(db: Session, p: Paiement) -> None:
    """Effets immédiats (legacy incl-enregpaye.php, typepnr=1) : stock décrémenté, lignes payées."""
    for li in lignes_non_payees(db, p.membre_id):
        if li.produit is not None:
            li.produit.quantite_stock = (li.produit.quantite_stock or 0) - li.quantite
        li.paye = True
        li.date_paiement = date.today()
        li.paiement_id = p.id


def _rejeter(db: Session, p: Paiement) -> None:
    """Paiement rejeté par la caisse (ADR-0007 S3b) : stock restitué, lignes de nouveau à payer."""
    lignes = db.scalars(
        select(LignePanier).options(selectinload(LignePanier.produit)).where(
            LignePanier.paiement_id == p.id, LignePanier.type_objet == TypeObjetPaye.PRODUIT
        )
    )
    for li in lignes:
        if li.produit is not None:
            li.produit.quantite_stock = (li.produit.quantite_stock or 0) + li.quantite
        li.paye = False
        li.date_paiement = None
        li.paiement_id = None


paiements.declarer(
    TypeObjetPaye.PRODUIT,
    paiements.Traitement(
        libelle=_libelle,
        montant=_montant,
        retour=lambda db, m, o: "/panier",
        verifier=_verifier,
        enregistrer=_enregistrer,
        rejeter=_rejeter,
    ),
)
