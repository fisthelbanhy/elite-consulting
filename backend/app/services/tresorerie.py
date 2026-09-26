"""Règles partagées de la trésorerie (legacy incl-placement.php, incl-operationbanque.php…) :
banques d'un placement, résolution des noms de banque, e-mail « Programmation opérations
bancaires » envoyé à la banque émettrice."""

import re
from collections.abc import Iterable
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import Devise, Etat, TypeOperationBanque
from app.models import Banque, Membre, OperationBanque

# Présentation « Débit / Crédit » de la vue gestionnaire (S7-11, intitulés corrigés) :
# sorties du compte du membre à gauche, entrées à droite.
DEBITS = {TypeOperationBanque.TRANSFERT, TypeOperationBanque.VIREMENT_EMIS, TypeOperationBanque.RETRAIT}
# Types pour lesquels une banque bénéficiaire n'a pas de sens (dépôt / retrait d'espèces)
SANS_BANQUE_BENEFICIAIRE = {TypeOperationBanque.VERSEMENT, TypeOperationBanque.RETRAIT}

_EMAIL = re.compile(r"^[^@\s;,]+@[^@\s;,]+\.[^@\s;,]+$")


def sens(type_operation: int) -> str:
    return "debit" if type_operation in DEBITS else "credit"


# --- Banques d'un placement ---------------------------------------------------------------------
# Le legacy stockait une chaîne positionnelle « 0*0*9*0… » limitée aux banques d'id ≤ 20. On garde
# la colonne texte (aucune migration) mais on y range la liste des id séparés par « * » : les
# données reprises restent lisibles et le nombre de banques n'est plus limité (F-S7-26).


def ids_banques(valeur: str | None) -> list[int]:
    ids: list[int] = []
    for morceau in (valeur or "").split("*"):
        morceau = morceau.strip()
        if morceau.isdigit() and int(morceau) > 0 and int(morceau) not in ids:
            ids.append(int(morceau))
    return ids


def serialiser_banques(ids: Iterable[int]) -> str:
    return "*".join(str(i) for i in sorted(set(ids)))


def est_autres(banque: Banque | None) -> bool:
    """La banque « Autres » (id 1 en production) n'est qu'une valeur sentinelle « non listée »."""
    return banque is not None and banque.nom.strip().lower() in {"autres", "autre"}


def banque_valide(db: Session, banque_id: int | None) -> Banque | None:
    if not banque_id:
        return None
    b = db.get(Banque, banque_id)
    if b is None or b.etat != Etat.AUTORISE or est_autres(b):
        return None
    return b


def nom_banque(banque: Banque | None, nom_libre: str) -> str:
    """Nom affiché : le nom saisi librement (« banque non listée ») sinon celui du référentiel."""
    return (nom_libre or "").strip() or (banque.nom if banque else "")


def adresses(valeur: str | None) -> list[str]:
    """Le legacy acceptait « a@x.cg; b@y.com » : on découpe et on garde les adresses valides."""
    return [a.strip() for a in re.split(r"[;,\s]+", valeur or "") if a.strip()]


def adresses_valides(valeur: str | None) -> bool:
    return all(_EMAIL.match(a) for a in adresses(valeur))


def destinataires(op: OperationBanque) -> list[str]:
    """Adresse saisie pour la banque émettrice, sinon celle du référentiel."""
    saisies = [a for a in adresses(op.banque_emettrice_email) if _EMAIL.match(a)]
    if saisies:
        return saisies
    if op.banque_emettrice and op.banque_emettrice.email:
        return [a for a in adresses(op.banque_emettrice.email) if _EMAIL.match(a)]
    return []


def _montant(v: int) -> str:
    return f"{v:,}".replace(",", " ")


def _date(d: date | None) -> str:
    return d.strftime("%d-%m-%Y") if d else ""


def ligne_mail(op: OperationBanque, membre: Membre | None) -> str:
    """Contenu legacy (S7-10) : « SOCIETE : … / DATE : … / OPERATION : … / MONTANT : … /
    BANQUE EMETRICE : … / BANQUE BENEFICIAIRE : … », complété de la devise et du bénéficiaire."""
    beneficiaire = nom_banque(op.banque_beneficiaire, op.banque_beneficiaire_nom)
    if op.banque_beneficiaire_adresse:
        beneficiaire = f"{beneficiaire} ({op.banque_beneficiaire_adresse})" if beneficiaire else op.banque_beneficiaire_adresse
    return " / ".join([
        f"SOCIÉTÉ : {membre.nom if membre else ''}",
        f"DATE : {_date(op.date_operation)}",
        f"OPÉRATION : {TypeOperationBanque.libelle(op.type_operation)}",
        f"MONTANT : {_montant(op.montant)} {Devise.libelle(op.devise)}",
        f"BANQUE ÉMETTRICE : {nom_banque(op.banque_emettrice, op.banque_emettrice_nom)}",
        f"BÉNÉFICIAIRE : {op.beneficiaire}",
        f"BANQUE BÉNÉFICIAIRE : {beneficiaire}",
    ])


SUJET_MAIL = "Programmation opérations bancaires"


def corps_mail(operations: list[OperationBanque], membre: Membre | None, nom_site: str = "La Frangine") -> str:
    lignes = [
        "Bonjour,",
        "",
        f"Votre client vous transmet, par l'intermédiaire de {nom_site}, la programmation suivante "
        f"(référence {operations[0].reference}) :",
        "",
        *[f"- {ligne_mail(op, membre)}" for op in operations],
        "",
        "Merci de bien vouloir confirmer la bonne réception de cet ordre directement à votre client.",
        "",
        f"— {nom_site}",
    ]
    return "\n".join(lignes)


def regrouper_par_destinataire(operations: list[OperationBanque]) -> dict[str, list[OperationBanque]]:
    groupes: dict[str, list[OperationBanque]] = {}
    for op in operations:
        for a in destinataires(op):
            groupes.setdefault(a.lower(), []).append(op)
    return groupes


def lot(db: Session, reference: str, exclure_id: int | None = None) -> list[OperationBanque]:
    """Opérations saisies ensemble : le legacy leur donne une référence commune (décision F-S7-31)."""
    req = select(OperationBanque).where(OperationBanque.reference == reference, OperationBanque.etat != Etat.SUPPRIME)
    if exclure_id:
        req = req.where(OperationBanque.id != exclure_id)
    return list(db.scalars(req.order_by(OperationBanque.id)))
