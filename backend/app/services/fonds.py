"""Logique métier du pilier « Financer & épargner », partie fonds (section 4 legacy) :
agrégats des appels de fonds, versements des apports, module d'épargne désactivable, et
traitements de paiement des types 5 (Likelemba), 7 (fond de soutien) et 8 (apport de fonds).

Importé par les routeurs `projets`, `likelemba` et `epargne` : l'import déclare les
`Traitement` auprès de `services/paiements` (ADR-0006).
"""

from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.enums import DonPlacement, Etat, EtatPaiement, ModePaiement, OuiNon, TypeObjetPaye
from app.erreurs import ErreurMetier, erreur, interdit, introuvable
from app.models import (
    AppelFond,
    CollecteFond,
    CotisationLikelemba,
    FondDeSoutien,
    MembreLikelemba,
    Paiement,
    Parametre,
    VersementCollecte,
)
from app.models.membres import Membre
from app.services import paiements
from app.services.references import numero_recu_likelemba

# --- Appels de fonds : agrégats et versements (ADR-0004, ADR-0007 S4a) ----------------------------

ANNULE = Etat.SUPPRIME  # état 3 d'un engagement = promesse annulée


def recalculer_appel(db: Session, appel: AppelFond) -> None:
    """Recalcule « promis » et « collecté » depuis les engagements (jamais d'incrément à la main).

    - promis = Σ montants promis des engagements actifs + Σ montants déjà versés des engagements
      annulés (une annulation ne retire que la part non versée : ADR-0004, trou fonctionnel) ;
    - collecté = Σ montants versés de tous les engagements.
    Invariant : promis ≥ collecté.
    """
    db.flush()
    promis, collecte = db.execute(
        select(
            func.coalesce(
                func.sum(case((CollecteFond.etat == ANNULE, CollecteFond.montant_verse), else_=CollecteFond.montant_promis)),
                0,
            ),
            func.coalesce(func.sum(CollecteFond.montant_verse), 0),
        ).where(CollecteFond.appel_fond_id == appel.id)
    ).one()
    appel.montant_promis = int(promis)
    appel.montant_collecte = int(collecte)


def paiements_en_attente(db: Session, collecte: CollecteFond) -> int:
    """Somme des versements déclarés par le créancier (paiement type 8) non encore confirmés."""
    return int(db.scalar(
        select(func.coalesce(func.sum(Paiement.montant), 0)).where(
            Paiement.type_objet == TypeObjetPaye.APPORT_FOND,
            Paiement.objet_id == collecte.id,
            Paiement.etat == EtatPaiement.NON_CONFIRME,
        )
    ) or 0)


def reste_a_verser(db: Session, collecte: CollecteFond, inclure_attente: bool = False) -> int:
    if collecte.etat == ANNULE:
        return 0
    reste = (collecte.montant_promis or 0) - (collecte.montant_verse or 0)
    if inclure_attente:
        reste -= paiements_en_attente(db, collecte)
    return max(0, reste)


def ajouter_versement(db: Session, collecte: CollecteFond, montant: int, jour: date | None = None) -> VersementCollecte:
    """Enregistre un versement (journal append-only), met à jour le cumul de l'engagement puis les
    agrégats de l'appel de fonds. Les contrôles (montant > 0, reste dû) sont faits par l'appelant."""
    if collecte.etat == ANNULE:
        raise erreur("Cet apport est annulé : aucun versement ne peut y être ajouté.")
    if collecte.etat == Etat.NON_TRAITE:
        collecte.etat = Etat.AUTORISE  # un premier versement vaut validation de la promesse
    v = VersementCollecte(collecte_id=collecte.id, date_versement=jour or date.today(), montant=montant,
                          etat=Etat.AUTORISE)
    db.add(v)
    db.flush()
    total, dernier = db.execute(
        select(func.coalesce(func.sum(VersementCollecte.montant), 0), func.max(VersementCollecte.date_versement))
        .where(VersementCollecte.collecte_id == collecte.id, VersementCollecte.etat == Etat.AUTORISE)
    ).one()
    collecte.montant_verse = int(total)
    collecte.date_dernier_versement = dernier
    recalculer_appel(db, collecte.appel_fond)
    return v


# --- Module d'épargne désactivable (ADR-0009) --------------------------------------------------------

MESSAGE_EPARGNE_DESACTIVEE = (
    "L'épargne solidaire (dons, placements et carte de pointage) est momentanément désactivée. "
    "Vos données sont conservées ; contactez la frangine pour toute question."
)


def epargne_active(db: Session) -> bool:
    p = db.get(Parametre, 1)
    return p is None or bool(p.module_epargne_actif)


def exiger_module_epargne(db: Session) -> None:
    if not epargne_active(db):
        raise ErreurMetier(MESSAGE_EPARGNE_DESACTIVEE, 403)


def minimum_placement(db: Session) -> int:
    p = db.get(Parametre, 1)
    return int(p.montant_minimum_placement or 0) if p else 0


def montant_lisible(v: int) -> str:
    """« 100 000 » (séparateur de milliers espace, comme le legacy)."""
    return f"{v:,}".replace(",", " ")


# --- Paiement type 5 : cotisation Likelemba (ADR-0007 S4b) ------------------------------------------


def _adhesion_payable(db: Session, membre: Membre, objet_id: int | None) -> MembreLikelemba:
    a = db.get(MembreLikelemba, objet_id) if objet_id else None
    if a is None or a.etat == Etat.SUPPRIME:
        raise introuvable("Choisissez l'adhésion Likelemba pour laquelle vous cotisez.")
    # L'adhérent, le responsable du groupe (qui collecte) ou un gestionnaire (F-S4-42)
    if not (membre.id in (a.membre_id, a.groupe.responsable_id) or membre.est_gestionnaire):
        raise interdit("Seul l'adhérent, le responsable du groupe ou un gestionnaire peut payer cette cotisation.")
    return a


def _verifier_cotisation(db: Session, membre: Membre, objet_id: int | None, montant: int) -> None:
    a = _adhesion_payable(db, membre, objet_id)
    if a.groupe.etat != Etat.AUTORISE:
        raise erreur("Ce likelemba n'est pas ouvert aux cotisations.")
    if a.etat != Etat.AUTORISE:
        raise erreur("Cette adhésion est en attente de confirmation : la cotisation n'est pas encore possible.")


def _enregistrer_cotisation(db: Session, p: Paiement) -> None:
    a = db.get(MembreLikelemba, p.objet_id)
    groupe = a.groupe
    db.add(CotisationLikelemba(
        groupe_id=groupe.id, adhesion_id=a.id, caissier_id=p.membre_id,
        numero_recu=numero_recu_likelemba(db, groupe), date_paiement=date.today(), montant=p.montant,
        mode_paiement=p.mode, code_transfert=p.remarque[:30] if p.mode == ModePaiement.CHARDEN_FARELL else "", observation=p.remarque,
        etat=Etat.NON_TRAITE, paiement_id=p.id,
    ))


def _cotisation_du_paiement(db: Session, p: Paiement) -> CotisationLikelemba | None:
    return db.scalar(select(CotisationLikelemba).where(CotisationLikelemba.paiement_id == p.id))


def _confirmer_cotisation(db: Session, p: Paiement) -> None:
    if (c := _cotisation_du_paiement(db, p)) is not None and c.etat == Etat.NON_TRAITE:
        c.etat = Etat.AUTORISE


def _rejeter_cotisation(db: Session, p: Paiement) -> None:
    # Le reçu reste consommé (numérotation continue) mais la cotisation est annulée
    if (c := _cotisation_du_paiement(db, p)) is not None:
        c.etat = Etat.SUPPRIME


paiements.declarer(TypeObjetPaye.LIKELEMBA, paiements.Traitement(
    libelle=lambda db, m, o: (
        lambda a: f"Cotisation Likelemba {a.groupe.code} — adhérent {a.code or '—'}"
        f" ({a.membre.pseudonyme if a.membre else 'membre'})"
    )(_adhesion_payable(db, m, o)),
    montant=lambda db, m, o: int(_adhesion_payable(db, m, o).groupe.montant_cotisation),
    retour=lambda db, m, o: (
        lambda a: f"/likelemba/{a.groupe_id}/cotiser?adhesion={a.id}"
    )(_adhesion_payable(db, m, o)),
    verifier=_verifier_cotisation,
    enregistrer=_enregistrer_cotisation,
    confirmer=_confirmer_cotisation,
    rejeter=_rejeter_cotisation,
))


# --- Paiement type 7 : don / placement (ADR-0007 S4c) -----------------------------------------------


def peut_voir_fond(membre: Membre, f: FondDeSoutien) -> bool:
    return membre.est_gestionnaire or membre.id in (f.membre_id, f.rapporteur_id, f.souscripteur_id)


def _fond_payable(db: Session, membre: Membre, objet_id: int | None) -> FondDeSoutien:
    exiger_module_epargne(db)
    f = db.get(FondDeSoutien, objet_id) if objet_id else None
    if f is None or f.etat == Etat.SUPPRIME:
        raise introuvable("Cette épargne est introuvable.")
    if not peut_voir_fond(membre, f):
        raise interdit("Seuls le souscripteur, le rapporteur ou un gestionnaire peuvent payer cette épargne.")
    return f


def _verifier_fond(db: Session, membre: Membre, objet_id: int | None, montant: int) -> None:
    f = _fond_payable(db, membre, objet_id)
    if f.etat != Etat.AUTORISE:
        raise erreur("Cette épargne n'est pas active : le paiement n'est pas possible.")
    if f.confirme == OuiNon.OUI:
        raise erreur("Cette épargne est déjà payée.")


def _enregistrer_fond(db: Session, p: Paiement) -> None:
    f = db.get(FondDeSoutien, p.objet_id)
    f.mode_paiement = p.mode
    f.confirme = OuiNon.OUI  # legacy : « confirmé » dès la déclaration du paiement


def _rejeter_fond(db: Session, p: Paiement) -> None:
    f = db.get(FondDeSoutien, p.objet_id)
    if f is not None:
        f.mode_paiement = 0
        f.confirme = OuiNon.NON


def _libelle_fond(db: Session, m: Membre, o: int | None) -> str:
    f = _fond_payable(db, m, o)
    quoi = "Don" if f.type_fond == DonPlacement.DON else f"Placement sur {f.duree_mois} mois"
    return f"{quoi} {f.reference} — au nom de {f.souscripteur_nom or 'vous-même'}"


paiements.declarer(TypeObjetPaye.FOND_SOUTIEN, paiements.Traitement(
    libelle=_libelle_fond,
    montant=lambda db, m, o: int(_fond_payable(db, m, o).montant),
    retour=lambda db, m, o: f"/epargne/dons-placements/{_fond_payable(db, m, o).id}",
    verifier=_verifier_fond,
    enregistrer=_enregistrer_fond,
    rejeter=_rejeter_fond,
))


# --- Paiement type 8 : versement sur un apport de fonds (ADR-0007 S4a) ------------------------------


def _collecte_payable(db: Session, membre: Membre, objet_id: int | None) -> CollecteFond:
    c = db.get(CollecteFond, objet_id) if objet_id else None
    if c is None:
        raise introuvable("Cet apport est introuvable.")
    if membre.id != c.membre_id:
        raise interdit("Seul le membre qui a promis cet apport peut déclarer un versement.")
    return c


def _verifier_versement(db: Session, membre: Membre, objet_id: int | None, montant: int) -> None:
    c = _collecte_payable(db, membre, objet_id)
    if c.etat == ANNULE:
        raise erreur("Cet apport est annulé : aucun versement ne peut être déclaré.")
    reste = reste_a_verser(db, c, inclure_attente=True)
    if reste <= 0:
        raise erreur("Votre apport est entièrement versé (ou déjà déclaré, en attente de confirmation).")
    if montant > reste:
        raise erreur("Le versement est supérieur au montant promis.",
                     montant=f"Il vous reste {montant_lisible(reste)} FCFA à verser sur cet apport.")


def _confirmer_versement(db: Session, p: Paiement) -> None:
    """La caisse confirme la réception : le versement est enregistré et compté comme collecté."""
    c = db.get(CollecteFond, p.objet_id)
    if c is None or c.etat == ANNULE:
        raise erreur("Cet apport est annulé : rejetez ce paiement.")
    if p.montant > reste_a_verser(db, c):
        raise erreur("Ce versement dépasse le reste à verser de l'apport : rejetez-le ou corrigez-le.")
    ajouter_versement(db, c, p.montant)


paiements.declarer(TypeObjetPaye.APPORT_FOND, paiements.Traitement(
    libelle=lambda db, m, o: (
        lambda c: f"Versement sur votre apport {c.reference} au projet « {c.appel_fond.nom_projet} »"
    )(_collecte_payable(db, m, o)),
    montant=lambda db, m, o: None,  # montant libre, plafonné au reste dû (vérifier)
    retour=lambda db, m, o: f"/projets/apports/{_collecte_payable(db, m, o).id}",
    verifier=_verifier_versement,
    confirmer=_confirmer_versement,
))
