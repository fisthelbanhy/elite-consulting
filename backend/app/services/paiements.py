"""Service central des paiements (ADR-0006, legacy incl-formulairepaye.php / incl-enregpaye.php /
ppayement.php).

Chaque module métier déclare, pour son type d'objet payé (`TypeObjetPaye`), un `Traitement` :
montant attendu, vérifications, et effets à l'enregistrement / à la confirmation / au rejet.
Comme dans le legacy, les effets métier ont lieu **à l'enregistrement** (paiement « non
confirmé ») ; la caisse confirme ensuite. Nouveauté (ADR-0007 S3b) : un paiement peut être
**rejeté** (retour à « Non payé ») et le module annule alors ses effets.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import EtatPaiement, ModePaiement, TypeObjetPaye
from app.erreurs import erreur, introuvable
from app.models.commerce import Paiement
from app.models.membres import Membre


@dataclass
class Traitement:
    libelle: Callable[[Session, Membre, int | None], str]
    # Montant dû (None = montant libre saisi par le payeur)
    montant: Callable[[Session, Membre, int | None], int | None] = lambda db, m, o: None
    # Lien de retour après paiement (page de l'objet payé)
    retour: Callable[[Session, Membre, int | None], str] = lambda db, m, o: "/espace/paiements"
    verifier: Callable[[Session, Membre, int | None, int], None] = lambda db, m, o, montant: None
    enregistrer: Callable[[Session, Paiement], None] = lambda db, p: None
    confirmer: Callable[[Session, Paiement], None] = lambda db, p: None
    rejeter: Callable[[Session, Paiement], None] = lambda db, p: None
    extras: dict = field(default_factory=dict)


TRAITEMENTS: dict[int, Traitement] = {}


def declarer(type_objet: TypeObjetPaye, traitement: Traitement) -> None:
    """Appelé par chaque module au chargement (ex. `paiements.declarer(TypeObjetPaye.COURSE, …)`)."""
    TRAITEMENTS[int(type_objet)] = traitement


def traitement(type_objet: int) -> Traitement:
    t = TRAITEMENTS.get(int(type_objet))
    if t is None:
        raise introuvable("Ce type de paiement n'est pas disponible.")
    return t


CONSIGNES = {
    ModePaiement.CASH: "Vous pouvez saisir une remarque ou observation (lieu, personne remise…).",
    ModePaiement.CHARDEN_FARELL: "Indiquez le nom, le téléphone et l'agence de l'expéditeur, ainsi que le code Charden Farell.",
    ModePaiement.MOBILE_MONEY: "Envoyez le montant sur l'un de nos numéros, puis indiquez votre numéro et la référence de la transaction.",
}


def verifier_remarque(mode: int, remarque: str) -> None:
    """Règles legacy (incl-formulairepaye.php)."""
    r = remarque.strip()
    if mode == ModePaiement.CHARDEN_FARELL and len(r) < 12:
        raise erreur("Code Charden Farell incomplet.",
                     remarque="Veuillez indiquer au moins 12 caractères pour le code de Charden Farell.")
    if mode == ModePaiement.MOBILE_MONEY and len(r) < 9:
        raise erreur("Numéro Mobile Money incomplet.",
                     remarque="Veuillez indiquer au moins 9 caractères pour le numéro de téléphone ou de transaction.")


def enregistrer(db: Session, membre: Membre, type_objet: int, objet_id: int | None, mode: int, montant: int | None,
                remarque: str) -> Paiement:
    t = traitement(type_objet)
    if mode not in {m.value for m in ModePaiement}:
        raise erreur("Mode de paiement inconnu.", mode="Choisissez un mode de paiement.")
    du = t.montant(db, membre, objet_id)
    montant_final = du if du is not None else int(montant or 0)
    if montant_final <= 0:
        raise erreur("Le montant ne peut être zéro.", montant="Le montant ne peut être zéro.")
    verifier_remarque(mode, remarque)
    t.verifier(db, membre, objet_id, montant_final)
    # Anti-doublon legacy : même payeur, même montant, même remarque (si la remarque est renseignée)
    if remarque.strip():
        doublon = db.scalar(select(Paiement.id).where(
            Paiement.membre_id == membre.id, Paiement.montant == montant_final,
            Paiement.remarque == remarque.strip(), Paiement.etat != EtatPaiement.NON_PAYE,
        ).limit(1))
        if doublon:
            raise erreur("Ce paiement est déjà enregistré.")
    p = Paiement(membre_id=membre.id, type_objet=type_objet, objet_id=objet_id, mode=mode, montant=montant_final,
                 remarque=remarque.strip(), etat=EtatPaiement.NON_CONFIRME)
    db.add(p)
    db.flush()
    t.enregistrer(db, p)
    return p


def confirmer(db: Session, paiement: Paiement, gestionnaire: Membre) -> None:
    if paiement.etat != EtatPaiement.NON_CONFIRME:
        raise erreur("Seul un paiement en attente peut être confirmé.")
    paiement.etat = EtatPaiement.CONFIRME
    paiement.confirme_par_id = gestionnaire.id
    paiement.date_confirmation = datetime.now()
    traitement(paiement.type_objet).confirmer(db, paiement)


def rejeter(db: Session, paiement: Paiement, gestionnaire: Membre) -> None:
    if paiement.etat != EtatPaiement.NON_CONFIRME:
        raise erreur("Seul un paiement en attente peut être rejeté.")
    paiement.etat = EtatPaiement.NON_PAYE
    paiement.confirme_par_id = gestionnaire.id
    paiement.date_confirmation = datetime.now()
    traitement(paiement.type_objet).rejeter(db, paiement)
