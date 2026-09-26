"""Trésorerie : placement, opération bancaire, demande de crédit, contentieux (legacy : choix7.php
cgb=2, incl-choix7B.php, incl-choix7B1.php, incl-placement.php, incl-operationbanque.php,
incl-dmdcredit.php, incl-contentcredit.php). Inventaire : S7-8 à S7-13, F-S7-22 à F-S7-36.

Réservé aux membres connectés. Un membre ne voit que ses fiches ; un gestionnaire les voit toutes.
Annulation (état 3) par le titulaire ou un gestionnaire habilité, y compris pour le contentieux
(correctif F-S7-24) ; changement d'état par un gestionnaire habilité (correctif F-S7-28)."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreReq, Page
from app.enums import Devise, Etat, TypeOperationBanque, TypePlacement
from app.erreurs import erreur, interdit, introuvable
from app.models import (
    Banque,
    ContentieuxCredit,
    DemandeCredit,
    Membre,
    Message,
    OperationBanque,
    Parametre,
    Placement,
)
from app.schemas import tresorerie as s
from app.schemas.commun import Liste, Ok
from app.services import emails
from app.services import tresorerie as t
from app.services.fiches import changer_etat, paginer, recherche
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/tresorerie", tags=["Trésorerie"])

LIBELLES_ETAT = {1: "en attente", 2: "enregistrée", 3: "annulée", 4: "traitée"}


@dataclass(frozen=True)
class Rubrique:
    chemin: str
    modele: type
    libelle: str  # « votre demande de crédit »
    lien: str


PLACEMENT = Rubrique("placements", Placement, "demande de placement", "/tresorerie/placements")
OPERATION = Rubrique("operations", OperationBanque, "opération bancaire", "/tresorerie/operations")
CREDIT = Rubrique("credits", DemandeCredit, "demande de crédit", "/tresorerie/credits")
CONTENTIEUX = Rubrique("contentieux", ContentieuxCredit, "dossier de contentieux", "/tresorerie/contentieux")


# --- Règles communes --------------------------------------------------------------------------


def _visibles(req, modele, membre: Membre, etat: int | None):
    if membre.est_gestionnaire:
        return req.where(modele.etat == etat) if etat else req.where(modele.etat != Etat.SUPPRIME)
    req = req.where(modele.membre_id == membre.id, modele.etat != Etat.SUPPRIME)
    return req.where(modele.etat == etat) if etat and etat != Etat.SUPPRIME else req


def _obtenir(db: Db, r: Rubrique, id_: int, membre: Membre):
    fiche = db.get(r.modele, id_)
    if fiche is not None and (membre.est_gestionnaire or (fiche.membre_id == membre.id and fiche.etat != Etat.SUPPRIME)):
        return fiche
    raise introuvable("Cette fiche n'existe pas ou ne vous est pas accessible.")


def _peut_modifier(fiche, membre: Membre) -> bool:
    return membre.peut_moderer() or (fiche.membre_id == membre.id and fiche.etat in (Etat.NON_TRAITE, Etat.AUTORISE))


def _verifier_modification(fiche, membre: Membre) -> None:
    if not _peut_modifier(fiche, membre):
        raise interdit("Seul le titulaire de la fiche (tant qu'elle n'est pas traitée) ou un gestionnaire habilité peut la modifier.")


def _contexte(d, fiche, membre: Membre):
    d.peut_modifier = _peut_modifier(fiche, membre)
    d.peut_moderer = membre.peut_moderer()
    d.peut_annuler = fiche.etat != Etat.SUPPRIME and (fiche.membre_id == membre.id or membre.peut_moderer())
    return d


def _routes_communes(r: Rubrique) -> None:
    """`POST /{id}/etat` (gestionnaire habilité, membre prévenu) et `DELETE /{id}` (annulation)."""

    @router.post(f"/{r.chemin}/{{id_}}/etat", response_model=Ok, name=f"etat_{r.chemin}")
    def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
        fiche = _obtenir(db, r, id_, membre)
        ancien = fiche.etat
        changer_etat(fiche, donnees.etat, membre)
        if fiche.membre_id and fiche.membre_id != membre.id and fiche.etat != ancien:
            db.add(Message(
                membre_id=fiche.membre_id, auteur_id=None, de_la_frangine=True,
                texte=f"Votre {r.libelle} {fiche.reference} est désormais « {LIBELLES_ETAT[fiche.etat]} ». "
                      f"Détails sur {r.lien}/{fiche.id}",
            ))
        db.commit()
        return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)

    @router.delete(f"/{r.chemin}/{{id_}}", response_model=Ok, name=f"annuler_{r.chemin}")
    def annuler(id_: int, db: Db, membre: MembreReq):
        fiche = _obtenir(db, r, id_, membre)
        if fiche.etat == Etat.SUPPRIME:
            raise erreur("Cette fiche est déjà annulée.")
        if not (fiche.membre_id == membre.id or membre.peut_moderer()):
            raise interdit("Seul le titulaire de la fiche ou un gestionnaire habilité peut l'annuler.")
        fiche.etat = Etat.SUPPRIME
        db.commit()
        return Ok(message="La fiche est annulée.", id=fiche.id, reference=fiche.reference)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db, membre: MembreReq):
    def n(modele) -> int:
        return db.scalar(_visibles(select(func.count()).select_from(modele), modele, membre, None)) or 0

    return s.Compteurs(placements=n(Placement), operations=n(OperationBanque), credits=n(DemandeCredit),
                       contentieux=n(ContentieuxCredit))


def _banques(db: Db) -> dict[int, Banque]:
    return {b.id: b for b in db.scalars(select(Banque))}


# --- Placement (S7-9) -------------------------------------------------------------------------


def _placement_resume(fiche: Placement, banques: dict[int, Banque], schema=s.PlacementResume):
    d = schema.model_validate(fiche)
    ids = t.ids_banques(fiche.banque)
    d.banques = [s.BanqueCourte.model_validate(banques[i]) for i in ids if i in banques]
    if isinstance(d, s.PlacementDetail):
        d.banques_ids = ids
    return d


@router.get("/placements", response_model=Liste[s.PlacementResume])
def lister_placements(
    db: Db, membre: MembreReq, page: Page, etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    q: str | None = None, type_placement: Annotated[int | None, Query(ge=1, le=2)] = None,
):
    req = _visibles(select(Placement).options(selectinload(Placement.membre)), Placement, membre, etat)
    if type_placement:
        req = req.where(Placement.type_placement == type_placement)
    if (cond := recherche(q, Placement.reference, Placement.observation, Placement.secteur_activite)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Placement.date_placement.desc(), Placement.id.desc()), page)
    banques = _banques(db)
    return Liste(items=[_placement_resume(i, banques) for i in items], total=total, page=page.page, taille=page.taille)


@router.get("/placements/{id_}", response_model=s.PlacementDetail)
def detail_placement(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, PLACEMENT, id_, membre)
    return _contexte(_placement_resume(fiche, _banques(db), s.PlacementDetail), fiche, membre)


def _valider_placement(db: Db, d: s.PlacementEntree, membre_id: int, exclure_id: int | None = None) -> list[int]:
    champs: dict[str, str] = {}
    if d.type_placement not in {p.value for p in TypePlacement}:
        champs["type_placement"] = "Indiquez le type de placement."
    if not d.montant:
        champs["montant"] = "Veuillez indiquer le montant à placer."
    if not d.duree_mois:
        champs["duree_mois"] = "Veuillez indiquer la durée du placement."
    elif d.duree_mois > 120:
        champs["duree_mois"] = "La durée du placement ne peut pas dépasser 120 mois."
    if not d.taux:
        champs["taux"] = "Veuillez indiquer le taux escompté."
    elif d.taux > 100:
        champs["taux"] = "Le taux doit être inférieur ou égal à 100 %."
    ids = [b.id for i in d.banques if (b := t.banque_valide(db, i))]
    if not ids:  # contrôle jamais déclenché dans le legacy (F-S7-25)
        champs["banques"] = "Veuillez indiquer la ou les banques."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Anti-doublon clarifié (F-S7-27) : même membre, même placement — plus sur la seule observation
    doublon = select(Placement.id).where(
        Placement.membre_id == membre_id, Placement.type_placement == d.type_placement,
        Placement.montant == d.montant, Placement.duree_mois == d.duree_mois, Placement.taux == d.taux,
        Placement.banque == t.serialiser_banques(ids), Placement.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(Placement.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Placement déjà effectué.")
    return ids


def _appliquer_placement(fiche: Placement, d: s.PlacementEntree, ids: list[int]) -> None:
    fiche.type_placement = d.type_placement or TypePlacement.DEPOT_A_TERME
    fiche.montant = d.montant or 0
    fiche.duree_mois = d.duree_mois or 0
    fiche.taux = float(d.taux or 0)
    fiche.banque = t.serialiser_banques(ids)
    # Le secteur d'activité n'a de sens que pour un investissement
    fiche.secteur_activite = d.secteur_activite.strip() if d.type_placement == TypePlacement.INVESTISSEMENT else ""
    fiche.observation = d.observation.strip()


@router.post("/placements", response_model=Ok, status_code=201)
def creer_placement(donnees: s.PlacementEntree, db: Db, membre: MembreReq):
    ids = _valider_placement(db, donnees, membre.id)
    fiche = Placement(membre_id=membre.id, etat=Etat.AUTORISE, date_placement=datetime.now(),
                      reference=nouvelle_reference(db, Prefixe.PLACEMENT))
    _appliquer_placement(fiche, donnees, ids)
    db.add(fiche)
    db.commit()
    return Ok(message="Le placement est enregistré.", id=fiche.id, reference=fiche.reference)


@router.put("/placements/{id_}", response_model=Ok)
def modifier_placement(id_: int, donnees: s.PlacementEntree, db: Db, membre: MembreReq):
    fiche = _obtenir(db, PLACEMENT, id_, membre)
    _verifier_modification(fiche, membre)
    ids = _valider_placement(db, donnees, fiche.membre_id or membre.id, exclure_id=fiche.id)
    _appliquer_placement(fiche, donnees, ids)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


_routes_communes(PLACEMENT)


# --- Opération bancaire (S7-10, S7-11) ----------------------------------------------------------


def _operation_resume(fiche: OperationBanque, schema=s.OperationResume):
    d = schema.model_validate(fiche)
    d.sens = t.sens(fiche.type_operation)
    d.nom_banque_emettrice = t.nom_banque(fiche.banque_emettrice, fiche.banque_emettrice_nom)
    d.nom_banque_beneficiaire = t.nom_banque(fiche.banque_beneficiaire, fiche.banque_beneficiaire_nom)
    return d


def _filtrer_operations(req, membre: Membre, etat, q, date_min, date_max, banque_id, type_operation,
                        montant_min, montant_max, reference, membre_id):
    req = _visibles(req, OperationBanque, membre, etat)
    # Filtres de la vue gestionnaire (S7-11), chacun utilisable seul (correctif) ; banque opérante
    if date_min:
        req = req.where(OperationBanque.date_operation >= date_min)
    if date_max:
        req = req.where(OperationBanque.date_operation <= date_max)
    if banque_id:
        req = req.where(or_(OperationBanque.banque_emettrice_id == banque_id, OperationBanque.banque_beneficiaire_id == banque_id))
    if type_operation:
        req = req.where(OperationBanque.type_operation == type_operation)
    if montant_min:
        req = req.where(OperationBanque.montant >= montant_min)
    if montant_max:
        req = req.where(OperationBanque.montant <= montant_max)
    if reference:
        req = req.where(OperationBanque.reference == reference)
    if membre_id and membre.est_gestionnaire:
        req = req.where(OperationBanque.membre_id == membre_id)
    cols = (OperationBanque.reference, OperationBanque.beneficiaire, OperationBanque.banque_emettrice_nom,
            OperationBanque.banque_beneficiaire_nom)
    if (cond := recherche(q, *cols)) is not None:
        req = req.where(cond)
    return req


FiltreDate = Annotated[date | None, Query()]
FiltreEntier = Annotated[int | None, Query(ge=0)]


@router.get("/operations", response_model=Liste[s.OperationResume])
def lister_operations(
    db: Db, membre: MembreReq, page: Page, etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    q: str | None = None, date_min: FiltreDate = None, date_max: FiltreDate = None, banque_id: int | None = None,
    type_operation: Annotated[int | None, Query(ge=1, le=6)] = None, montant_min: FiltreEntier = None,
    montant_max: FiltreEntier = None, reference: str | None = None, membre_id: int | None = None,
):
    req = select(OperationBanque).options(
        selectinload(OperationBanque.membre), selectinload(OperationBanque.banque_emettrice),
        selectinload(OperationBanque.banque_beneficiaire),
    )
    req = _filtrer_operations(req, membre, etat, q, date_min, date_max, banque_id, type_operation, montant_min,
                              montant_max, reference, membre_id)
    ordre = (OperationBanque.date_operation.desc(), OperationBanque.id.desc())
    items, total = paginer(db, req.order_by(*ordre), page)
    return Liste(items=[_operation_resume(i) for i in items], total=total, page=page.page, taille=page.taille)


@router.get("/operations/synthese", response_model=list[s.SyntheseLigne])
def synthese_operations(
    db: Db, membre: MembreReq, etat: Annotated[int | None, Query(ge=1, le=4)] = None, q: str | None = None,
    date_min: FiltreDate = None, date_max: FiltreDate = None, banque_id: int | None = None,
    type_operation: Annotated[int | None, Query(ge=1, le=6)] = None, montant_min: FiltreEntier = None,
    montant_max: FiltreEntier = None, membre_id: int | None = None,
):
    """Totaux « Débit / Crédit » par devise, sur les mêmes filtres que la liste."""
    req = select(OperationBanque.type_operation, OperationBanque.devise, func.count(), func.sum(OperationBanque.montant))
    req = _filtrer_operations(req, membre, etat, q, date_min, date_max, banque_id, type_operation, montant_min,
                              montant_max, None, membre_id)
    totaux: dict[tuple[str, int], list[int]] = {}
    for type_op, devise, n, total in db.execute(req.group_by(OperationBanque.type_operation, OperationBanque.devise)).all():
        cle = (t.sens(type_op), int(devise))
        acc = totaux.setdefault(cle, [0, 0])
        acc[0] += int(n)
        acc[1] += int(total or 0)
    return [s.SyntheseLigne(sens=k[0], devise=k[1], nombre=v[0], total=v[1]) for k, v in sorted(totaux.items())]


@router.get("/operations/{id_}", response_model=s.OperationDetail)
def detail_operation(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, OPERATION, id_, membre)
    d = _contexte(_operation_resume(fiche, s.OperationDetail), fiche, membre)
    d.email_destinataire = bool(t.destinataires(fiche))
    d.lot = [s.OperationLot.model_validate(o, from_attributes=True) for o in t.lot(db, fiche.reference, exclure_id=fiche.id)
             if membre.est_gestionnaire or o.membre_id == membre.id]
    return d


def _vide(ligne: s.OperationLigne) -> bool:
    return not any([
        ligne.date_operation, ligne.montant, ligne.devise, ligne.type_operation, ligne.banque_emettrice_id,
        ligne.banque_emettrice_nom.strip(), ligne.banque_emettrice_email.strip(), ligne.beneficiaire.strip(),
        ligne.banque_beneficiaire_id, ligne.banque_beneficiaire_nom.strip(), ligne.banque_beneficiaire_adresse.strip(),
    ])


def _normaliser_operation(db: Db, ligne: s.OperationLigne, prefixe: str = "", numero: int | None = None):
    """Valide un ordre de virement ; renvoie (valeurs, erreurs par champ)."""
    avant = f"Ligne {numero} : " if numero else ""
    champs: dict[str, str] = {}

    def err(champ: str, message: str) -> None:
        champs[f"{prefixe}{champ}"] = avant + message

    if not ligne.date_operation:
        err("date_operation", "Veuillez indiquer la date de l'opération.")
    if not ligne.montant:
        err("montant", "Veuillez indiquer le montant de la transaction.")
    if ligne.devise not in {x.value for x in Devise}:
        err("devise", "Veuillez indiquer la devise.")
    if ligne.type_operation not in {x.value for x in TypeOperationBanque}:
        err("type_operation", "Veuillez indiquer le type d'opération.")
    # Banque du référentiel, sinon « banque non listée » saisie librement (≥ 3 caractères)
    emettrice = t.banque_valide(db, ligne.banque_emettrice_id)
    nom_emettrice = "" if emettrice else ligne.banque_emettrice_nom.strip()
    if not emettrice and len(nom_emettrice) < 3:
        err("banque_emettrice_id", "Veuillez indiquer la banque émettrice.")
    if not t.adresses_valides(ligne.banque_emettrice_email):
        err("banque_emettrice_email", "L'adresse e-mail de la banque émettrice n'est pas valide.")
    beneficiaire = ligne.beneficiaire.strip()
    if len(beneficiaire) < 3:
        err("beneficiaire", "Veuillez indiquer le nom du bénéficiaire.")
    recevante = t.banque_valide(db, ligne.banque_beneficiaire_id)
    nom_recevante = "" if recevante else ligne.banque_beneficiaire_nom.strip()
    if not recevante and len(nom_recevante) < 3 and ligne.type_operation not in t.SANS_BANQUE_BENEFICIAIRE:
        err("banque_beneficiaire_id", "Veuillez indiquer la banque bénéficiaire.")
    valeurs = {
        "date_operation": ligne.date_operation, "montant": ligne.montant or 0, "devise": ligne.devise or Devise.FCFA,
        "type_operation": ligne.type_operation or 0,
        "banque_emettrice_id": emettrice.id if emettrice else None, "banque_emettrice_nom": nom_emettrice,
        "banque_emettrice_email": "; ".join(t.adresses(ligne.banque_emettrice_email)), "beneficiaire": beneficiaire,
        "banque_beneficiaire_id": recevante.id if recevante else None, "banque_beneficiaire_nom": nom_recevante,
        "banque_beneficiaire_adresse": ligne.banque_beneficiaire_adresse.strip(),
    }
    return valeurs, champs


def _cle_doublon(v: dict) -> tuple:
    return (v["date_operation"], v["montant"], v["banque_emettrice_id"], v["banque_emettrice_nom"].lower(),
            v["beneficiaire"].lower())


def _existe_operation(db: Db, membre_id: int, v: dict, exclure_id: int | None = None) -> bool:
    """Anti-doublon legacy : membre + date d'opération + montant + banque émettrice + bénéficiaire."""
    req = select(OperationBanque.id).where(
        OperationBanque.membre_id == membre_id, OperationBanque.date_operation == v["date_operation"],
        OperationBanque.montant == v["montant"], OperationBanque.beneficiaire == v["beneficiaire"],
        OperationBanque.etat != Etat.SUPPRIME,
    )
    if v["banque_emettrice_id"]:
        req = req.where(OperationBanque.banque_emettrice_id == v["banque_emettrice_id"])
    else:
        req = req.where(OperationBanque.banque_emettrice_nom == v["banque_emettrice_nom"])
    if exclure_id:
        req = req.where(OperationBanque.id != exclure_id)
    return db.scalar(req.limit(1)) is not None


def _programmer_emails(db: Db, taches: BackgroundTasks, operations: list[OperationBanque], membre: Membre | None) -> int:
    parametre = db.get(Parametre, 1)
    nom_site = getattr(parametre, "nom_site", "") or "La Frangine"
    groupes = t.regrouper_par_destinataire(operations)
    for adresse, ops in groupes.items():
        taches.add_task(emails.envoyer, adresse, t.SUJET_MAIL, t.corps_mail(ops, membre, nom_site),
                        membre.email if membre and membre.email else None)
    return len(groupes)


@router.post("/operations", response_model=s.OperationsOk, status_code=201)
def creer_operations(donnees: s.OperationsEntree, db: Db, membre: MembreReq, taches: BackgroundTasks):
    lignes = [(n, ligne) for n, ligne in enumerate(donnees.lignes, start=1) if not _vide(ligne)]
    if not lignes:
        raise erreur("Veuillez saisir au moins une opération.")
    champs: dict[str, str] = {}
    valeurs: list[dict] = []
    vues: set[tuple] = set()
    for n, ligne in lignes:
        v, e = _normaliser_operation(db, ligne, f"lignes.{n - 1}.", n)
        champs.update(e)
        if not e:
            cle = _cle_doublon(v)
            if cle in vues or _existe_operation(db, membre.id, v):
                champs[f"lignes.{n - 1}.montant"] = f"Ligne {n} : cette opération est déjà enregistrée."
            vues.add(cle)
        valeurs.append(v)
    if champs:
        # Le legacy ignorait silencieusement les lignes incomplètes : on les signale (F-S7-30)
        raise erreur("Veuillez corriger les opérations signalées.", **champs)
    # Une référence commune à toutes les opérations d'une même saisie (legacy, décision F-S7-31)
    reference = nouvelle_reference(db, Prefixe.OPERATION_BANQUE)
    operations = [OperationBanque(membre_id=membre.id, reference=reference, date_saisie=datetime.now(),
                                  etat=Etat.AUTORISE, **v) for v in valeurs]
    db.add_all(operations)
    db.commit()
    envois = _programmer_emails(db, taches, operations, membre)
    nb = len(operations)
    message = "Enregistrement effectué." if nb == 1 else f"Enregistrement effectué : {nb} opérations."
    if envois:
        message += " L'ordre a été transmis par e-mail à la banque émettrice."
    return s.OperationsOk(message=message, id=operations[0].id, reference=reference,
                          ids=[o.id for o in operations], emails=envois)


@router.put("/operations/{id_}", response_model=Ok)
def modifier_operation(id_: int, donnees: s.OperationLigne, db: Db, membre: MembreReq):
    fiche = _obtenir(db, OPERATION, id_, membre)
    _verifier_modification(fiche, membre)
    v, champs = _normaliser_operation(db, donnees)
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    if _existe_operation(db, fiche.membre_id or membre.id, v, exclure_id=fiche.id):
        raise erreur("Cette opération est déjà enregistrée.")
    # La date d'opération est enfin enregistrée en modification (correctif F-S7-33)
    for cle, valeur in v.items():
        setattr(fiche, cle, valeur)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/operations/{id_}/mail", response_model=Ok)
def renvoyer_mail(id_: int, db: Db, membre: MembreReq, taches: BackgroundTasks):
    """Bouton « Envoyer Mail » : réservé au titulaire et aux gestionnaires (le legacy l'ouvrait à tous)."""
    fiche = _obtenir(db, OPERATION, id_, membre)
    if not (fiche.membre_id == membre.id or membre.est_gestionnaire):
        raise interdit()
    if fiche.etat == Etat.SUPPRIME:
        raise erreur("Cette opération est annulée.")
    if not t.destinataires(fiche):
        raise erreur("Aucune adresse e-mail n'est renseignée pour la banque émettrice.",
                     banque_emettrice_email="Indiquez l'adresse e-mail de la banque émettrice puis enregistrez.")
    _programmer_emails(db, taches, [fiche], fiche.membre)
    return Ok(message="Mail envoyé.", id=fiche.id, reference=fiche.reference)


_routes_communes(OPERATION)


# --- Demande de crédit (S7-12) ------------------------------------------------------------------


@router.get("/credits", response_model=Liste[s.CreditResume])
def lister_credits(db: Db, membre: MembreReq, page: Page, etat: Annotated[int | None, Query(ge=1, le=4)] = None,
                   q: str | None = None):
    req = _visibles(select(DemandeCredit).options(selectinload(DemandeCredit.membre)), DemandeCredit, membre, etat)
    if (cond := recherche(q, DemandeCredit.reference, DemandeCredit.objet, DemandeCredit.garantie)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(DemandeCredit.date_demande.desc(), DemandeCredit.id.desc()), page)
    return Liste(items=[s.CreditResume.model_validate(i) for i in items], total=total, page=page.page, taille=page.taille)


@router.get("/credits/{id_}", response_model=s.CreditDetail)
def detail_credit(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, CREDIT, id_, membre)
    return _contexte(s.CreditDetail.model_validate(fiche), fiche, membre)


def _valider_credit(db: Db, d: s.CreditEntree, membre_id: int, exclure_id: int | None = None) -> None:
    champs: dict[str, str] = {}
    if not d.montant:
        champs["montant"] = "Indiquez le montant du crédit."
    if not d.objet.strip():
        champs["objet"] = "Veuillez indiquer l'objet."
    if not d.duree_mois:
        champs["duree_mois"] = "Veuillez indiquer la durée de remboursement."
    elif d.duree_mois > 120:
        champs["duree_mois"] = "La durée de remboursement ne peut pas dépasser 120 mois."
    if not d.garantie.strip():
        champs["garantie"] = "Veuillez indiquer la garantie."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Anti-doublon clarifié : même montant et même objet (le legacy comparait l'observation)
    doublon = select(DemandeCredit.id).where(
        DemandeCredit.membre_id == membre_id, DemandeCredit.montant == d.montant,
        DemandeCredit.objet == d.objet.strip(), DemandeCredit.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(DemandeCredit.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette demande de crédit est déjà effectuée.")


def _appliquer_credit(fiche: DemandeCredit, d: s.CreditEntree) -> None:
    fiche.montant = d.montant or 0
    fiche.objet = d.objet.strip()
    fiche.duree_mois = d.duree_mois or 0
    fiche.niveau_realisation = d.niveau_realisation
    fiche.garantie = d.garantie.strip()
    fiche.delai_reponse_jours = d.delai_reponse_jours
    fiche.observation = d.observation.strip()
    fiche.devis_global = d.devis_global.strip()
    fiche.apport_propre = d.apport_propre.strip()  # affiché avec sa propre valeur (correctif F-S7-35)


@router.post("/credits", response_model=Ok, status_code=201)
def creer_credit(donnees: s.CreditEntree, db: Db, membre: MembreReq):
    _valider_credit(db, donnees, membre.id)
    fiche = DemandeCredit(membre_id=membre.id, etat=Etat.AUTORISE, date_demande=date.today(),
                          reference=nouvelle_reference(db, Prefixe.DEMANDE_CREDIT))
    _appliquer_credit(fiche, donnees)
    db.add(fiche)
    db.commit()
    return Ok(message="Votre demande de crédit est enregistrée.", id=fiche.id, reference=fiche.reference)


@router.put("/credits/{id_}", response_model=Ok)
def modifier_credit(id_: int, donnees: s.CreditEntree, db: Db, membre: MembreReq):
    fiche = _obtenir(db, CREDIT, id_, membre)
    _verifier_modification(fiche, membre)
    _valider_credit(db, donnees, fiche.membre_id or membre.id, exclure_id=fiche.id)
    _appliquer_credit(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


_routes_communes(CREDIT)


# --- Contentieux (S7-13) -------------------------------------------------------------------------


@router.get("/contentieux", response_model=Liste[s.ContentieuxResume])
def lister_contentieux(db: Db, membre: MembreReq, page: Page, etat: Annotated[int | None, Query(ge=1, le=4)] = None,
                       q: str | None = None):
    req = _visibles(select(ContentieuxCredit).options(selectinload(ContentieuxCredit.membre)), ContentieuxCredit,
                    membre, etat)
    if (cond := recherche(q, ContentieuxCredit.reference, ContentieuxCredit.dette_compromise_detail,
                          ContentieuxCredit.activites_en_cours)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(ContentieuxCredit.date_dossier.desc(), ContentieuxCredit.id.desc()), page)
    return Liste(items=[s.ContentieuxResume.model_validate(i) for i in items], total=total, page=page.page,
                 taille=page.taille)


@router.get("/contentieux/{id_}", response_model=s.ContentieuxDetail)
def detail_contentieux(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, CONTENTIEUX, id_, membre)
    return _contexte(s.ContentieuxDetail.model_validate(fiche), fiche, membre)


def _valider_contentieux(db: Db, d: s.ContentieuxEntree, membre_id: int, exclure_id: int | None = None) -> None:
    champs: dict[str, str] = {}
    if d.dette_compromise <= 0:
        champs["dette_compromise"] = "Veuillez indiquer le montant de la dette compromise."
    if d.revenus_mensuels <= 0:
        champs["revenus_mensuels"] = "Veuillez indiquer le montant des revenus mensuels."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(ContentieuxCredit.id).where(
        ContentieuxCredit.membre_id == membre_id, ContentieuxCredit.dette_compromise == d.dette_compromise,
        ContentieuxCredit.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(ContentieuxCredit.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce contentieux de crédit est déjà enregistré.")


def _appliquer_contentieux(fiche: ContentieuxCredit, d: s.ContentieuxEntree) -> None:
    for champ, valeur in d.model_dump().items():
        setattr(fiche, champ, valeur.strip() if isinstance(valeur, str) else valeur)


@router.post("/contentieux", response_model=Ok, status_code=201)
def creer_contentieux(donnees: s.ContentieuxEntree, db: Db, membre: MembreReq):
    _valider_contentieux(db, donnees, membre.id)
    fiche = ContentieuxCredit(membre_id=membre.id, etat=Etat.AUTORISE, date_dossier=datetime.now(),
                              reference=nouvelle_reference(db, Prefixe.CONTENTIEUX))
    _appliquer_contentieux(fiche, donnees)
    db.add(fiche)
    db.commit()
    return Ok(message="Ce contentieux est enregistré.", id=fiche.id, reference=fiche.reference)


@router.put("/contentieux/{id_}", response_model=Ok)
def modifier_contentieux(id_: int, donnees: s.ContentieuxEntree, db: Db, membre: MembreReq):
    fiche = _obtenir(db, CONTENTIEUX, id_, membre)
    _verifier_modification(fiche, membre)  # plus de boutons ouverts à tout connecté (F-S7-36)
    _valider_contentieux(db, donnees, fiche.membre_id or membre.id, exclure_id=fiche.id)
    _appliquer_contentieux(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


_routes_communes(CONTENTIEUX)


routers = [router]
