"""Tarifs bancaires — « Bench marking » (legacy : incl-choix7C.php, incl-benchmarking.php,
pbenchmarking-2.php ; tables benchmarking1/2/3). Inventaire : S7-15 à S7-17, F-S7-41 à F-S7-43,
ADR-0007 S7b.

Référentiel à 3 niveaux : type d'opération → opération → tarif par banque (texte libre).
Consultation par les membres connectés sous forme de tableau comparatif par banque ; gestion du
référentiel par les gestionnaires habilités ; saisie des tarifs par ces gestionnaires ou par le
membre « banque » rattaché à la banque (`banque.membre_id`). Un seul tarif actif par banque et par
opération (la règle legacy banque + opération + tarif est donc toujours respectée)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.deps import Db, MembreReq, exiger_droit
from app.enums import Etat
from app.erreurs import erreur, interdit, introuvable
from app.models import Banque, BenchOperation, BenchTarif, BenchType, Membre
from app.schemas import tarifs_bancaires as s
from app.schemas.commun import Ok
from app.services import tarifs_bancaires as service
from app.services.tresorerie import est_autres

router = APIRouter(prefix="/tarifs-bancaires", tags=["Tarifs bancaires"])

ACTIF = Etat.AUTORISE


def _banques(db: Db) -> list[Banque]:
    return [b for b in db.scalars(select(Banque).where(Banque.etat == ACTIF).order_by(Banque.nom)) if not est_autres(b)]


def _banques_gerees(db: Db, membre: Membre) -> list[int]:
    if membre.peut_moderer():
        return [b.id for b in _banques(db)]
    return list(db.scalars(select(Banque.id).where(Banque.membre_id == membre.id, Banque.etat == ACTIF)))


def _verifier_saisie(db: Db, membre: Membre, banque_id: int) -> Banque:
    banque = db.get(Banque, banque_id)
    if banque is None or banque.etat != ACTIF or est_autres(banque):
        raise erreur("Veuillez indiquer la banque concernée.", banque_id="Veuillez indiquer la banque concernée.")
    if not (membre.peut_moderer() or banque.membre_id == membre.id):
        raise interdit("Seuls un gestionnaire habilité ou la banque elle-même peuvent saisir ses tarifs.")
    return banque


@router.get("", response_model=s.Comparatif)
def comparatif(
    db: Db, membre: MembreReq,
    banque_id: Annotated[list[int] | None, Query()] = None,
    type_id: int | None = None,
):
    """Consultation par banque (filtre `banque_id`, répétable) et/ou par type d'opération (F-S7-41)."""
    banques = _banques(db)
    if banque_id:
        banques = [b for b in banques if b.id in banque_id]
    ids_banques = {b.id for b in banques}
    req_types = select(BenchType).where(BenchType.etat == ACTIF).order_by(BenchType.id)
    if type_id:
        req_types = req_types.where(BenchType.id == type_id)
    types = db.scalars(req_types).all()
    operations = db.scalars(
        select(BenchOperation).where(BenchOperation.etat == ACTIF, BenchOperation.type_id.in_([x.id for x in types]))
        .order_by(BenchOperation.id)
    ).all()
    tarifs = db.scalars(
        select(BenchTarif).where(BenchTarif.etat == ACTIF, BenchTarif.operation_id.in_([o.id for o in operations]))
        .order_by(BenchTarif.id)
    ).all()
    par_operation: dict[int, list[s.TarifOut]] = {}
    for tarif in tarifs:
        if tarif.banque_id in ids_banques:
            par_operation.setdefault(tarif.operation_id, []).append(
                s.TarifOut(id=tarif.id, banque_id=tarif.banque_id, tarif=tarif.tarif)
            )
    sortie = []
    for ty in types:
        ops = [s.OperationOut(id=o.id, libelle=o.libelle, type_id=o.type_id, tarifs=par_operation.get(o.id, []))
               for o in operations if o.type_id == ty.id]
        sortie.append(s.TypeOut(id=ty.id, libelle=ty.libelle, operations=ops))
    return s.Comparatif(
        banques=[s.BanqueCourte.model_validate(b) for b in banques], types=sortie,
        nombre_tarifs=sum(len(v) for v in par_operation.values()), referentiel_vide=service.referentiel_vide(db),
        peut_gerer_referentiel=membre.peut_moderer(), banques_gerees=_banques_gerees(db, membre),
    )


@router.post("/initialiser", response_model=Ok, status_code=201)
def initialiser(db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    if not service.referentiel_vide(db):
        raise erreur("Le référentiel contient déjà des types d'opérations.")
    n_types, n_ops = service.initialiser(db)
    db.commit()
    return Ok(message=f"Référentiel initialisé : {n_types} types et {n_ops} opérations.")


# --- Niveau 1 : types d'opérations ----------------------------------------------------------------


def _valider_type(db: Db, libelle: str, exclure_id: int | None = None) -> None:
    if len(libelle) < 4:
        raise erreur("Le type de l'opération doit avoir 4 caractères minimum.",
                     libelle="Le type de l'opération doit avoir 4 caractères minimum.")
    req = select(BenchType.id).where(func.lower(BenchType.libelle) == libelle.lower(), BenchType.etat != Etat.SUPPRIME)
    if exclure_id:
        req = req.where(BenchType.id != exclure_id)
    if db.scalar(req.limit(1)):
        raise erreur("Ce type d'opération est déjà enregistré.", libelle="Ce type d'opération est déjà enregistré.")


@router.post("/types", response_model=Ok, status_code=201)
def creer_type(donnees: s.LibelleEntree, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    libelle = donnees.libelle.strip()
    _valider_type(db, libelle)
    ty = BenchType(libelle=libelle, etat=ACTIF)
    db.add(ty)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=ty.id)


def _type(db: Db, id_: int) -> BenchType:
    ty = db.get(BenchType, id_)
    if ty is None or ty.etat == Etat.SUPPRIME:
        raise introuvable("Ce type d'opération n'existe pas.")
    return ty


@router.put("/types/{id_}", response_model=Ok)
def modifier_type(id_: int, donnees: s.LibelleEntree, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    ty = _type(db, id_)
    libelle = donnees.libelle.strip()
    _valider_type(db, libelle, exclure_id=ty.id)
    ty.libelle = libelle
    db.commit()
    return Ok(message="Modification effectuée.", id=ty.id)


@router.delete("/types/{id_}", response_model=Ok)
def supprimer_type(id_: int, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    ty = _type(db, id_)
    ty.etat = Etat.SUPPRIME
    for op in ty.operations:
        op.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Type d'opération supprimé.", id=ty.id)


# --- Niveau 2 : opérations ---------------------------------------------------------------------------


def _valider_operation(db: Db, d: s.OperationEntree, exclure_id: int | None = None) -> str:
    libelle = d.libelle.strip()
    champs: dict[str, str] = {}
    if not d.type_id or (ty := db.get(BenchType, d.type_id)) is None or ty.etat == Etat.SUPPRIME:
        champs["type_id"] = "Chaque opération doit être liée à un type."
    if len(libelle) < 4:
        champs["libelle"] = "L'opération doit avoir 4 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    req = select(BenchOperation.id).where(
        BenchOperation.type_id == d.type_id, func.lower(BenchOperation.libelle) == libelle.lower(),
        BenchOperation.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        req = req.where(BenchOperation.id != exclure_id)
    if db.scalar(req.limit(1)):
        raise erreur("Opération déjà enregistrée.", libelle="Opération déjà enregistrée.")
    return libelle


@router.post("/operations", response_model=Ok, status_code=201)
def creer_operation(donnees: s.OperationEntree, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    libelle = _valider_operation(db, donnees)
    op = BenchOperation(type_id=donnees.type_id, libelle=libelle, etat=ACTIF)
    db.add(op)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=op.id)


def _operation(db: Db, id_: int) -> BenchOperation:
    op = db.get(BenchOperation, id_)
    if op is None or op.etat == Etat.SUPPRIME:
        raise introuvable("Cette opération n'existe pas.")
    return op


@router.put("/operations/{id_}", response_model=Ok)
def modifier_operation(id_: int, donnees: s.OperationEntree, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    op = _operation(db, id_)
    libelle = _valider_operation(db, donnees, exclure_id=op.id)
    op.type_id, op.libelle = donnees.type_id, libelle  # type: ignore[assignment]
    db.commit()
    return Ok(message="Modification effectuée.", id=op.id)


@router.delete("/operations/{id_}", response_model=Ok)
def supprimer_operation(id_: int, db: Db, membre: MembreReq):
    exiger_droit(membre, "activation")
    op = _operation(db, id_)
    op.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Opération supprimée.", id=op.id)


# --- Niveau 3 : tarifs par banque ---------------------------------------------------------------------


def _tarif_actif(db: Db, operation_id: int, banque_id: int) -> BenchTarif | None:
    return db.scalar(select(BenchTarif).where(
        BenchTarif.operation_id == operation_id, BenchTarif.banque_id == banque_id, BenchTarif.etat == ACTIF,
    ).limit(1))


@router.post("/tarifs", response_model=Ok, status_code=201)
def creer_tarif(donnees: s.TarifEntree, db: Db, membre: MembreReq):
    if not donnees.banque_id:
        raise erreur("Veuillez indiquer la banque concernée.", banque_id="Veuillez indiquer la banque concernée.")
    banque = _verifier_saisie(db, membre, donnees.banque_id)
    champs: dict[str, str] = {}
    if not donnees.operation_id or (op := db.get(BenchOperation, donnees.operation_id)) is None or op.etat != ACTIF:
        champs["operation_id"] = "Veuillez indiquer l'opération."
    tarif = donnees.tarif.strip()
    if not tarif:
        champs["tarif"] = "Le tarif doit avoir 1 caractère minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    if _tarif_actif(db, donnees.operation_id, banque.id):  # type: ignore[arg-type]
        raise erreur("Un tarif est déjà enregistré pour cette banque et cette opération : modifiez-le.")
    t = BenchTarif(operation_id=donnees.operation_id, banque_id=banque.id, tarif=tarif, etat=ACTIF)
    db.add(t)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=t.id)


def _tarif(db: Db, id_: int, membre: Membre) -> BenchTarif:
    t = db.get(BenchTarif, id_)
    if t is None or t.etat == Etat.SUPPRIME:
        raise introuvable("Ce tarif n'existe pas.")
    _verifier_saisie(db, membre, t.banque_id)
    return t


@router.put("/tarifs/{id_}", response_model=Ok)
def modifier_tarif(id_: int, donnees: s.TarifModification, db: Db, membre: MembreReq):
    """Modification effective (le legacy visait une colonne inexistante, F-S7-42)."""
    t = _tarif(db, id_, membre)
    tarif = donnees.tarif.strip()
    if not tarif:
        raise erreur("Le tarif doit avoir 1 caractère minimum.", tarif="Le tarif doit avoir 1 caractère minimum.")
    t.tarif = tarif
    db.commit()
    return Ok(message="Modification effectuée.", id=t.id)


@router.delete("/tarifs/{id_}", response_model=Ok)
def supprimer_tarif(id_: int, db: Db, membre: MembreReq):
    t = _tarif(db, id_, membre)
    t.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Tarif retiré.", id=t.id)


@router.put("/banques/{banque_id}", response_model=Ok)
def enregistrer_grille(banque_id: int, donnees: s.GrilleEntree, db: Db, membre: MembreReq):
    """Saisie de tous les tarifs d'une banque (une ligne par opération)."""
    banque = _verifier_saisie(db, membre, banque_id)
    operations = {o.id for o in db.scalars(select(BenchOperation).where(BenchOperation.etat == ACTIF))}
    changes = 0
    for operation_id, valeur in donnees.tarifs.items():
        if operation_id not in operations:
            continue
        tarif = (valeur or "").strip()[:100]
        existant = _tarif_actif(db, operation_id, banque.id)
        if existant and not tarif:
            existant.etat = Etat.SUPPRIME
            changes += 1
        elif existant and existant.tarif != tarif:
            existant.tarif = tarif
            changes += 1
        elif not existant and tarif:
            db.add(BenchTarif(operation_id=operation_id, banque_id=banque.id, tarif=tarif, etat=ACTIF))
            changes += 1
    db.commit()
    return Ok(message=f"Tarifs de {banque.nom} enregistrés ({changes} modification{'s' if changes > 1 else ''}).",
              id=banque.id)


routers = [router]
