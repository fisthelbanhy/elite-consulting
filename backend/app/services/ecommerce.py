"""Services e-commerce (section 3 legacy) : panier des petites annonces, contrôle de stock et
paiement des articles et des courses.

Déclare au chargement les `Traitement` de paiement (ADR-0006) :
- type 2 « Article » : montant = total du panier articles non payé du membre ; à l'enregistrement,
  stock décrémenté et lignes marquées payées ; au rejet, stock restitué et lignes remises
  impayées (ADR-0007 S3a/S3b) ;
- type 4 « Course » : montant = achats + frais de service ; à l'enregistrement, course payée ;
  au rejet, course de nouveau à payer.
"""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.enums import Etat, EtatCourse, EtatPaiement, OffreDemande, OuiNon, TypeObjetPaye
from app.erreurs import erreur, interdit, introuvable
from app.models import Course, LignePanier, Message, Paiement
from app.models.membres import Membre
from app.services import paiements

MESSAGE_STOCK = (
    "Certaines quantités des articles du panier sont supérieures aux quantités en stock. "
    "Veuillez les retirer du panier ou choisir une quantité en rapport avec le stock."
)


def fcfa(montant: int) -> str:
    return f"{montant:,} FCFA".replace(",", " ")


def prevenir(db: Session, membre_id: int | None, texte: str) -> None:
    """Message privé de la frangine (messagerie du membre)."""
    if membre_id:
        db.add(Message(membre_id=membre_id, auteur_id=None, de_la_frangine=True, texte=texte))


# --- Panier des petites annonces ---------------------------------------------------------------


def lignes_panier(db: Session, membre_id: int | None = None) -> list[LignePanier]:
    """Lignes articles non payées d'un membre (ou de tous les membres si `membre_id` est None)."""
    req = (
        select(LignePanier)
        .options(selectinload(LignePanier.article))
        .where(LignePanier.type_objet == TypeObjetPaye.ARTICLE, LignePanier.paye.is_(False))
        .order_by(LignePanier.date_ajout, LignePanier.id)
    )
    if membre_id is not None:
        req = req.where(LignePanier.membre_id == membre_id)
    return list(db.scalars(req))


def total(lignes: list[LignePanier]) -> int:
    return sum(ligne.prix_unitaire * ligne.quantite for ligne in lignes)


def lignes_en_rupture(lignes: list[LignePanier]) -> set[int]:
    """Identifiants des lignes non servables : article retiré, plus en offre, ou quantité totale
    demandée (toutes lignes du même article cumulées) supérieure au stock."""
    demande: dict[int, int] = defaultdict(int)
    for ligne in lignes:
        if ligne.article_id:
            demande[ligne.article_id] += ligne.quantite
    rupture = set()
    for ligne in lignes:
        a = ligne.article
        if (
            a is None
            or a.etat != Etat.AUTORISE
            or a.offre_ou_recherche != OffreDemande.OFFRE
            or demande[a.id] > a.quantite
        ):
            rupture.add(ligne.id)
    return rupture


def _verifier_panier(db: Session, membre: Membre) -> list[LignePanier]:
    lignes = lignes_panier(db, membre.id)
    if not lignes:
        raise erreur("Votre panier est vide.")
    if lignes_en_rupture(lignes):
        raise erreur(MESSAGE_STOCK)  # ADR-0007 S3a : paiement bloqué, comme pour les produits
    return lignes


def _libelle_articles(db: Session, membre: Membre, _objet: int | None) -> str:
    lignes = _verifier_panier(db, membre)
    n = sum(ligne.quantite for ligne in lignes)
    return f"Panier des petites annonces : {n} article{'s' if n > 1 else ''}"


def _montant_articles(db: Session, membre: Membre, _objet: int | None) -> int:
    return total(lignes_panier(db, membre.id))


def _verifier_articles(db: Session, membre: Membre, _objet: int | None, _montant: int) -> None:
    _verifier_panier(db, membre)


def _enregistrer_articles(db: Session, p: Paiement) -> None:
    """Effet à la déclaration (legacy conservé, ADR-0007 S3b) : réservation du stock."""
    for ligne in lignes_panier(db, p.membre_id):
        if ligne.article is not None:
            ligne.article.quantite = max(0, ligne.article.quantite - ligne.quantite)
        ligne.paye = True
        ligne.date_paiement = date.today()
        ligne.paiement_id = p.id


def _rejeter_articles(db: Session, p: Paiement) -> None:
    """Paiement rejeté par la caisse : stock restitué, lignes de nouveau impayées."""
    lignes = db.scalars(
        select(LignePanier).options(selectinload(LignePanier.article)).where(
            LignePanier.paiement_id == p.id, LignePanier.type_objet == TypeObjetPaye.ARTICLE
        )
    )
    for ligne in lignes:
        if ligne.article is not None:
            ligne.article.quantite += ligne.quantite
        ligne.paye = False
        ligne.date_paiement = None
        ligne.paiement_id = None
    prevenir(db, p.membre_id, f"Votre paiement de {fcfa(p.montant)} pour le panier des petites annonces n'a pas pu "
                              "être validé par notre caisse. Les articles sont de nouveau dans votre panier : "
                              "/annonces/panier")


# --- Courses -----------------------------------------------------------------------------------


def paiement_en_cours(db: Session, course_id: int) -> Paiement | None:
    """Dernier paiement déclaré (non confirmé ou confirmé) d'une course."""
    return db.scalar(
        select(Paiement)
        .where(
            Paiement.type_objet == TypeObjetPaye.COURSE,
            Paiement.objet_id == course_id,
            Paiement.etat != EtatPaiement.NON_PAYE,
        )
        .order_by(Paiement.date_paiement.desc(), Paiement.id.desc())
        .limit(1)
    )


def _course_a_payer(db: Session, membre: Membre, objet_id: int | None) -> Course:
    course = db.get(Course, objet_id) if objet_id else None
    if course is None or course.etat == Etat.SUPPRIME:
        raise introuvable("Course introuvable.")
    if course.client_id != membre.id:
        raise interdit("Seul le client peut payer sa course.")
    if course.etat_course == EtatCourse.SUPPRIMEE:
        raise erreur("Cette course est annulée : elle ne peut pas être payée.")
    if course.paye == OuiNon.OUI or paiement_en_cours(db, course.id) is not None:
        raise erreur("Cette course est déjà payée.")
    return course


def _libelle_course(db: Session, membre: Membre, objet_id: int | None) -> str:
    c = _course_a_payer(db, membre, objet_id)
    return f"Course {c.reference} : achats {fcfa(c.montant_achats)} + frais de service {fcfa(c.frais_service)}"


def _montant_course(db: Session, membre: Membre, objet_id: int | None) -> int:
    c = _course_a_payer(db, membre, objet_id)
    return c.montant_achats + c.frais_service  # « Net à payer » (correctif : le legacy oubliait les frais)


def _retour_course(db: Session, membre: Membre, objet_id: int | None) -> str:
    return f"/courses/{objet_id}" if objet_id else "/courses"


def _verifier_course(db: Session, membre: Membre, objet_id: int | None, _montant: int) -> None:
    _course_a_payer(db, membre, objet_id)


def _enregistrer_course(db: Session, p: Paiement) -> None:
    course = db.get(Course, p.objet_id) if p.objet_id else None
    if course is None:
        return
    course.paye = OuiNon.OUI
    course.mode_paiement = p.mode
    prevenir(db, course.boutique_id, f"La course {course.reference} a été payée par le client "
                                     f"(paiement en cours de vérification) : /courses/{course.id}")


def _rejeter_course(db: Session, p: Paiement) -> None:
    course = db.get(Course, p.objet_id) if p.objet_id else None
    if course is None:
        return
    course.paye = OuiNon.NON
    course.mode_paiement = 0
    prevenir(db, course.client_id, f"Votre paiement de {fcfa(p.montant)} pour la course {course.reference} n'a pas pu "
                                   f"être validé par notre caisse. Vous pouvez le déclarer de nouveau : /courses/{course.id}")


paiements.declarer(TypeObjetPaye.ARTICLE, paiements.Traitement(
    libelle=_libelle_articles,
    montant=_montant_articles,
    retour=lambda db, m, o: "/annonces/panier",
    verifier=_verifier_articles,
    enregistrer=_enregistrer_articles,
    rejeter=_rejeter_articles,
))

paiements.declarer(TypeObjetPaye.COURSE, paiements.Traitement(
    libelle=_libelle_course,
    montant=_montant_course,
    retour=_retour_course,
    verifier=_verifier_course,
    enregistrer=_enregistrer_course,
    rejeter=_rejeter_course,
))

__all__ = ["MESSAGE_STOCK", "fcfa", "lignes_en_rupture", "lignes_panier", "paiement_en_cours", "prevenir", "total"]
