"""Likelemba — tontines rotatives (legacy : incl-choix4B.php, incl-likelemba.php,
incl-membrelikelemba.php, incl-payelikelemba.php). Inventaire : F-S4-27 à F-S4-44,
ADR-0007 S4b (cotisation rattachée à l'adhésion choisie, reçu unique `{code}P{n}`).

La cotisation passe par le paiement générique (type 5, `services/fonds.py`) : le frontend envoie
le membre vers `/paiement/5?objet=<id de l'adhésion>`."""

import calendar
import re
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, verifier_modification
from app.enums import Etat, Periodicite
from app.erreurs import erreur, interdit, introuvable
from app.models import CotisationLikelemba, GroupeLikelemba, MembreLikelemba, Message
from app.models.membres import Membre
from app.schemas import likelemba as s
from app.schemas.commun import Liste, Ok
from app.services import fonds  # noqa: F401 — déclare le traitement de paiement type 5
from app.services.fiches import changer_etat, obtenir, paginer, recherche, supprimer, visibilite
from app.services.references import (
    Prefixe,
    code_adhesion_likelemba,
    nouvelle_reference,
    numero_recu_likelemba,
)
from app.services.validation import MESSAGE_TELEPHONE, normaliser_telephone, telephone_valide

router = APIRouter(prefix="/likelemba", tags=["Likelemba"])

INTROUVABLE = "Ce likelemba n'existe pas ou n'est plus actif."
RESPONSABLE = "responsable_id"


def _ordre(code: str | None) -> int | None:
    """Rang d'entrée : préfixe numérique du code d'adhérent `{n}{code groupe}`."""
    m = re.match(r"(\d+)", code or "")
    return int(m.group(1)) if m else None


def _decaler(debut: date, periodicite: int, n: int) -> date:
    if periodicite == Periodicite.SEMAINE:
        return debut + timedelta(days=7 * n)
    if periodicite == Periodicite.QUINZAINE:
        return debut + timedelta(days=14 * n)
    mois = debut.month - 1 + n
    annee, mois = debut.year + mois // 12, mois % 12 + 1
    return date(annee, mois, min(debut.day, calendar.monthrange(annee, mois)[1]))


def _peut_gerer(membre: Membre | None, g: GroupeLikelemba) -> bool:
    """Responsable du groupe, ou gestionnaire avec droit Activation."""
    return membre is not None and (membre.id == g.responsable_id or membre.peut_moderer())


def _recu_valide(c: CotisationLikelemba, g: GroupeLikelemba) -> bool:
    """Un reçu legacy tronqué (« LKB…P », varchar(10)) ou vide doit être (ré)activé."""
    return re.fullmatch(re.escape(g.code) + r"P\d+", c.numero_recu or "") is not None


def _groupe(db: Db, id_: int, membre: Membre | None) -> GroupeLikelemba:
    return obtenir(db, GroupeLikelemba, id_, membre, colonne_auteur=RESPONSABLE, message=INTROUVABLE)


def _cotisation_out(c: CotisationLikelemba, g: GroupeLikelemba, membre: Membre | None) -> s.CotisationOut:
    o = s.CotisationOut.model_validate(c)
    a = c.adhesion
    o.adherent = a.membre.pseudonyme if a is not None and a.membre is not None else "—"
    o.code_adherent = a.code if a is not None else ""
    o.nom_caissier = c.caissier.pseudonyme if c.caissier is not None else ""
    gerer = _peut_gerer(membre, g)
    concerne = membre is not None and a is not None and a.membre_id == membre.id
    if not (gerer or concerne or (membre is not None and membre.est_gestionnaire)):
        o.observation = None  # la remarque de paiement peut contenir un numéro de transaction
    o.recu_valide = _recu_valide(c, g)
    o.peut_valider = gerer and c.etat != Etat.SUPPRIME and (not o.recu_valide or c.etat == Etat.NON_TRAITE)
    return o


def _cotisations(db: Db, g: GroupeLikelemba, adhesion_id: int | None = None) -> list[CotisationLikelemba]:
    req = (
        select(CotisationLikelemba)
        .options(
            selectinload(CotisationLikelemba.adhesion).selectinload(MembreLikelemba.membre),
            selectinload(CotisationLikelemba.caissier),
        )
        .where(CotisationLikelemba.groupe_id == g.id)
    )
    if adhesion_id:
        req = req.where(CotisationLikelemba.adhesion_id == adhesion_id)
    return list(db.scalars(req.order_by(CotisationLikelemba.date_paiement.desc(), CotisationLikelemba.id.desc())))


def _total(cotisations: list[CotisationLikelemba]) -> int:
    return sum(c.montant for c in cotisations if c.etat != Etat.SUPPRIME)


# --- Liste ---------------------------------------------------------------------------------------


@router.get("", response_model=Liste[s.GroupeResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    montant_min: Annotated[int | None, Query(ge=0)] = None,
    montant_max: Annotated[int | None, Query(ge=0)] = None,
    q: str | None = None,
    etat: int | None = None,
    miens: bool = False,
):
    """Groupes publiés (le responsable voit aussi les siens, le gestionnaire tout), filtre montant
    min/max — une seule borne suffit (correctif F-S4-27) —, tri par date de début."""
    req = select(GroupeLikelemba).options(selectinload(GroupeLikelemba.responsable))
    if (cond := visibilite(GroupeLikelemba, membre, RESPONSABLE)) is not None:
        req = req.where(cond)
    if membre is not None and membre.est_gestionnaire:
        req = req.where(GroupeLikelemba.etat == etat) if etat else req.where(GroupeLikelemba.etat != Etat.SUPPRIME)
    if miens and membre is not None:
        adherent = exists().where(
            MembreLikelemba.groupe_id == GroupeLikelemba.id, MembreLikelemba.membre_id == membre.id,
            MembreLikelemba.etat != Etat.SUPPRIME,
        )
        req = req.where(or_(GroupeLikelemba.responsable_id == membre.id, adherent))
    for cond in (
        GroupeLikelemba.montant_cotisation >= montant_min if montant_min else None,
        GroupeLikelemba.montant_cotisation <= montant_max if montant_max else None,
        recherche(q, GroupeLikelemba.code, GroupeLikelemba.observation),
    ):
        if cond is not None:
            req = req.where(cond)
    req = req.order_by(GroupeLikelemba.date_debut.is_(None), GroupeLikelemba.date_debut.asc(), GroupeLikelemba.id)
    items, total = paginer(db, req, page)
    ids = [g.id for g in items]
    comptes: dict[int, int] = dict(db.execute(
        select(MembreLikelemba.groupe_id, func.count(MembreLikelemba.id))
        .where(MembreLikelemba.groupe_id.in_(ids), MembreLikelemba.etat == Etat.AUTORISE)
        .group_by(MembreLikelemba.groupe_id)
    ).all()) if ids else {}
    mes: dict[int, int] = dict(db.execute(
        select(MembreLikelemba.groupe_id, MembreLikelemba.id)
        .where(MembreLikelemba.groupe_id.in_(ids), MembreLikelemba.membre_id == membre.id,
               MembreLikelemba.etat != Etat.SUPPRIME)
    ).all()) if ids and membre is not None else {}
    sortie = []
    for g in items:
        r = s.GroupeResume.model_validate(g)
        r.nombre_adherents = comptes.get(g.id, 0)
        r.mon_adhesion_id = mes.get(g.id)
        r.est_responsable = membre is not None and membre.id == g.responsable_id
        sortie.append(r)
    return Liste(items=sortie, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs")
def compteurs(db: Db) -> dict[str, int]:
    groupes = db.scalar(select(func.count()).select_from(GroupeLikelemba).where(GroupeLikelemba.etat == Etat.AUTORISE))
    adherents = db.scalar(
        select(func.count(MembreLikelemba.id)).join(GroupeLikelemba, MembreLikelemba.groupe_id == GroupeLikelemba.id)
        .where(GroupeLikelemba.etat == Etat.AUTORISE, MembreLikelemba.etat == Etat.AUTORISE)
    )
    return {"groupes": groupes or 0, "adherents": adherents or 0}


@router.get("/membres", response_model=list[s.MembreChoix])
def membres(db: Db, membre: MembreReq, q: str | None = None):
    """Membres proposés pour choisir un responsable ou inscrire un adhérent : gestionnaires et
    responsables de groupe seulement."""
    responsable = db.scalar(select(GroupeLikelemba.id).where(GroupeLikelemba.responsable_id == membre.id).limit(1))
    if not (membre.est_gestionnaire or responsable):
        raise interdit("Liste réservée aux gestionnaires et aux responsables de likelemba.")
    req = select(Membre).where(Membre.etat != Etat.SUPPRIME)
    if (cond := recherche(q, Membre.nom, Membre.pseudonyme, Membre.telephone)) is not None:
        req = req.where(cond)
    return db.scalars(req.order_by(Membre.nom).limit(1000)).all()


@router.get("/mes-adhesions", response_model=list[s.MesAdhesions])
def mes_adhesions(db: Db, membre: MembreReq):
    return db.scalars(
        select(MembreLikelemba).options(selectinload(MembreLikelemba.groupe))
        .where(MembreLikelemba.membre_id == membre.id, MembreLikelemba.etat != Etat.SUPPRIME)
        .order_by(MembreLikelemba.id.desc())
    ).all()


# --- Adhésions ------------------------------------------------------------------------------------


def _adhesion(db: Db, id_: int, membre: Membre) -> MembreLikelemba:
    """Fiche d'adhésion : l'adhérent, le responsable du groupe et les gestionnaires."""
    a = db.get(MembreLikelemba, id_)
    if a is None or (a.etat == Etat.SUPPRIME and not membre.est_gestionnaire):
        raise introuvable("Cette adhésion est introuvable.")
    if not (membre.id in (a.membre_id, a.groupe.responsable_id) or membre.est_gestionnaire):
        raise interdit("Cette fiche d'adhésion est réservée à l'adhérent, au responsable du groupe et à la frangine.")
    return a


def _detail_adhesion(db: Db, a: MembreLikelemba, membre: Membre) -> s.AdhesionDetail:
    g = a.groupe
    d = s.AdhesionDetail.model_validate(a)
    d.ordre = _ordre(a.code)
    cots = _cotisations(db, g, a.id)
    d.cotisations = [_cotisation_out(c, g, membre) for c in cots]
    d.total_cotisations = _total(cots)
    gerer = _peut_gerer(membre, g)
    d.peut_modifier = a.membre_id == membre.id or gerer
    d.peut_moderer = membre.peut_moderer()
    d.peut_cotiser = a.etat == Etat.AUTORISE and g.etat == Etat.AUTORISE
    return d


@router.get("/adhesions/{id_}", response_model=s.AdhesionDetail)
def detail_adhesion(id_: int, db: Db, membre: MembreReq):
    """Fiche d'adhésion + « les paiements antérieurs du membre » (F-S4-40)."""
    return _detail_adhesion(db, _adhesion(db, id_, membre), membre)


def _valider_adhesion(d: s.AdhesionEntree) -> None:
    champs: dict[str, str] = {}
    if d.caution_telephone and not telephone_valide(d.caution_telephone):
        champs["caution_telephone"] = MESSAGE_TELEPHONE
    for i, t in enumerate(d.temoins):
        if t.telephone and not telephone_valide(t.telephone):
            champs[f"temoin{i + 1}_telephone"] = MESSAGE_TELEPHONE
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)


def _appliquer_adhesion(a: MembreLikelemba, d: s.AdhesionEntree) -> None:
    a.observation = d.observation.strip()
    a.caution_nom = d.caution_nom.strip()
    a.caution_est_membre = s.CODE_MEMBRE if d.caution_est_membre else s.CODE_NON_MEMBRE
    a.caution_piece_identite = d.caution_piece_identite.strip()
    a.caution_adresse = d.caution_adresse.strip()
    a.caution_activite = d.caution_activite.strip()
    a.caution_telephone = normaliser_telephone(d.caution_telephone)
    a.temoins = [
        {"nom": t.nom.strip(), "telephone": normaliser_telephone(t.telephone), "emploi": t.emploi.strip(),
         "est_membre": s.CODE_MEMBRE if t.est_membre else s.CODE_NON_MEMBRE}
        for t in d.temoins[:3]
        if t.nom.strip() or t.telephone.strip() or t.emploi.strip()
    ]


@router.put("/adhesions/{id_}", response_model=Ok)
def modifier_adhesion(id_: int, donnees: s.AdhesionEntree, db: Db, membre: MembreReq):
    """L'adhérent met à jour caution et témoins ; le responsable / la frangine aussi la date d'entrée."""
    a = _adhesion(db, id_, membre)
    gerer = _peut_gerer(membre, a.groupe)
    if not (a.membre_id == membre.id or gerer):
        raise interdit("Seuls l'adhérent, le responsable du groupe et la frangine peuvent modifier cette adhésion.")
    _valider_adhesion(donnees)
    _appliquer_adhesion(a, donnees)
    if gerer and donnees.date_entree:
        a.date_entree = donnees.date_entree
    if gerer and not a.code:
        a.code = code_adhesion_likelemba(db, a.groupe)
    db.commit()
    return Ok(message="Modification effectuée.", id=a.id, reference=a.code)


@router.post("/adhesions/{id_}/etat", response_model=Ok)
def etat_adhesion(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """Confirmation (« Attente » → Autorisé), suspension ou retrait d'une adhésion (F-S4-39)."""
    a = _adhesion(db, id_, membre)
    changer_etat(a, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=a.id)


# --- Cotisations : validation / activation de reçu ------------------------------------------------


@router.post("/cotisations/{id_}/valider", response_model=Ok)
def valider_cotisation(id_: int, db: Db, membre: MembreReq):
    """« Activation ? » (F-S4-44) : génère le reçu s'il manque ou s'il est tronqué (données
    legacy) et marque la cotisation comme validée. Responsable du groupe ou gestionnaire habilité."""
    c = db.get(CotisationLikelemba, id_)
    if c is None:
        raise introuvable("Cette cotisation est introuvable.")
    g = c.groupe
    if not _peut_gerer(membre, g):
        raise interdit("Seuls le responsable du likelemba et la frangine peuvent valider un reçu.")
    if c.etat == Etat.SUPPRIME:
        raise erreur("Cette cotisation a été annulée (paiement rejeté) : elle ne peut pas être validée.")
    if not _recu_valide(c, g):
        c.numero_recu = numero_recu_likelemba(db, g)
    c.etat = Etat.AUTORISE
    db.commit()
    return Ok(message=f"Reçu {c.numero_recu} validé.", id=c.id, reference=c.numero_recu)


# --- Fiche groupe ---------------------------------------------------------------------------------


def _detail(db: Db, g: GroupeLikelemba, membre: Membre | None) -> s.GroupeDetail:
    d = s.GroupeDetail.model_validate(g)
    tous = membre is not None and membre.est_gestionnaire
    adhesions = [a for a in g.adhesions if tous or a.etat != Etat.SUPPRIME]
    adhesions.sort(key=lambda a: (_ordre(a.code) or 10**6, a.date_entree or date.max, a.id))
    d.adhesions = []
    for a in adhesions:
        r = s.AdhesionResume.model_validate(a)
        r.ordre = _ordre(a.code)
        d.adhesions.append(r)
    actives = [a for a in adhesions if a.etat == Etat.AUTORISE]
    d.nombre_adherents = len(actives)
    d.cagnotte = g.montant_cotisation * len(actives)
    aujourdhui = date.today()
    d.calendrier = []
    for i, a in enumerate(actives):
        jour = _decaler(g.date_debut, g.periodicite, i) if g.date_debut else None
        d.calendrier.append(s.Echeance(
            tour=i + 1, date=jour, adhesion_id=a.id, passee=jour is not None and jour < aujourdhui,
            beneficiaire=a.membre.pseudonyme if a.membre else f"Adhérent {a.code}",
        ))
    mienne = next((a for a in adhesions if membre is not None and a.membre_id == membre.id and a.etat != Etat.SUPPRIME), None)
    d.mon_adhesion_id = mienne.id if mienne else None
    d.est_responsable = membre is not None and membre.id == g.responsable_id
    d.peut_gerer = _peut_gerer(membre, g)
    d.peut_modifier = d.peut_gerer
    d.peut_moderer = membre is not None and membre.peut_moderer()
    d.peut_adherer = membre is not None and mienne is None and g.etat == Etat.AUTORISE
    # Historique des cotisations : adhérents, responsable et gestionnaires (données financières)
    if membre is not None and (mienne is not None or d.est_responsable or membre.est_gestionnaire):
        cots = _cotisations(db, g)
        d.cotisations = [_cotisation_out(c, g, membre) for c in cots]
        d.total_cotisations = _total(cots)
    return d


@router.get("/{id_}", response_model=s.GroupeDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    return _detail(db, _groupe(db, id_, membre), membre)


# --- Création / modification d'un groupe ----------------------------------------------------------


def _valider_groupe(db: Db, d: s.GroupeEntree, exclure_id: int | None = None) -> None:
    champs: dict[str, str] = {}
    r = db.get(Membre, d.responsable_id) if d.responsable_id else None
    if r is None or r.etat == Etat.SUPPRIME:
        champs["responsable_id"] = "Veuillez indiquer le responsable du likelemba."
    if d.montant_cotisation <= 0:
        champs["montant_cotisation"] = "Le montant de participation ne peut être 0."
    if d.periodicite not in {p.value for p in Periodicite}:
        champs["periodicite"] = "Veuillez indiquer la périodicité du likelemba."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Unicité (arbitrage F-S4-31) : même responsable, montant, périodicité et date de début.
    # Le legacy testait l'observation, ce qui empêchait deux groupes sans observation.
    doublon = select(GroupeLikelemba.id).where(
        GroupeLikelemba.responsable_id == d.responsable_id, GroupeLikelemba.montant_cotisation == d.montant_cotisation,
        GroupeLikelemba.periodicite == d.periodicite, GroupeLikelemba.date_debut == d.date_debut,
        GroupeLikelemba.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(GroupeLikelemba.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce likelemba est déjà enregistré.")


def _appliquer_groupe(g: GroupeLikelemba, d: s.GroupeEntree) -> None:
    g.responsable_id = d.responsable_id
    g.montant_cotisation = d.montant_cotisation
    g.periodicite = d.periodicite
    g.date_debut = d.date_debut
    g.observation = d.observation.strip()


def _prevenir_responsable(db: Db, g: GroupeLikelemba) -> None:
    db.add(Message(membre_id=g.responsable_id, de_la_frangine=True, texte=(
        f"Vous êtes désormais responsable du likelemba {g.code} (cotisation de "
        f"{fonds.montant_lisible(g.montant_cotisation)} FCFA, {Periodicite.libelle(g.periodicite).lower()}). "
        "Vous pouvez inscrire les membres et valider les reçus depuis la fiche du groupe."
    )))


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.GroupeEntree, db: Db, membre: MembreReq):
    """Création d'un groupe : gestionnaire avec droit Activation (F-S4-04, F-S4-30)."""
    if not membre.peut_moderer():
        raise interdit("La création d'un likelemba est réservée à la frangine (gestionnaire habilité).")
    _valider_groupe(db, donnees)
    g = GroupeLikelemba(etat=Etat.AUTORISE, compteur_entrees=0, compteur_paiements=0)
    _appliquer_groupe(g, donnees)
    g.code = nouvelle_reference(db, Prefixe.LIKELEMBA)
    db.add(g)
    db.flush()
    if g.responsable_id != membre.id:
        _prevenir_responsable(db, g)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=g.id, reference=g.code)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.GroupeEntree, db: Db, membre: MembreReq):
    """Le responsable ou un gestionnaire habilité (F-S4-32)."""
    g = _groupe(db, id_, membre)
    verifier_modification(membre, g.responsable_id)
    _valider_groupe(db, donnees, exclure_id=g.id)
    ancien = g.responsable_id
    _appliquer_groupe(g, donnees)
    if g.responsable_id != ancien and g.responsable_id != membre.id:
        _prevenir_responsable(db, g)
    db.commit()
    return Ok(message="Modification effectuée.", id=g.id, reference=g.code)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    g = _groupe(db, id_, membre)
    changer_etat(g, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=g.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    g = _groupe(db, id_, membre)
    supprimer(g, membre, colonne_auteur=RESPONSABLE)
    db.commit()
    return Ok(message="Likelemba supprimé.", id=g.id)


@router.post("/{id_}/adhesions", response_model=Ok, status_code=201)
def adherer(id_: int, donnees: s.AdhesionEntree, db: Db, membre: MembreReq):
    """Adhésion (F-S4-36 à F-S4-38) : le membre s'inscrit lui-même ; le responsable ou la frangine
    peuvent inscrire un autre membre. Code `{n}{code groupe}`, adhésion active immédiatement."""
    g = _groupe(db, id_, membre)
    gerer = _peut_gerer(membre, g)
    cible_id = donnees.membre_id or membre.id
    if cible_id != membre.id and not gerer:
        raise interdit("Seuls le responsable du groupe et la frangine peuvent inscrire un autre membre.")
    if g.etat != Etat.AUTORISE and not membre.peut_moderer():
        raise erreur("Ce likelemba n'accepte pas de nouveaux membres pour le moment.")
    cible = db.get(Membre, cible_id)
    if cible is None or cible.etat == Etat.SUPPRIME:
        raise erreur("Veuillez corriger les champs signalés.", membre_id="Veuillez indiquer le nouveau membre.")
    _valider_adhesion(donnees)
    doublon = db.scalar(select(MembreLikelemba.id).where(
        MembreLikelemba.groupe_id == g.id, MembreLikelemba.membre_id == cible_id, MembreLikelemba.etat != Etat.SUPPRIME,
    ).limit(1))
    if doublon:
        raise erreur("Ce membre est déjà enregistré dans ce likelemba.")
    a = MembreLikelemba(
        groupe_id=g.id, membre_id=cible_id, etat=Etat.AUTORISE,
        date_entree=(donnees.date_entree if gerer and donnees.date_entree else date.today()),
    )
    _appliquer_adhesion(a, donnees)
    a.code = code_adhesion_likelemba(db, g)
    db.add(a)
    db.flush()
    if g.responsable_id and g.responsable_id != membre.id:
        db.add(Message(membre_id=g.responsable_id, de_la_frangine=True, texte=(
            f"{cible.pseudonyme or 'Un membre'} a rejoint votre likelemba {g.code} (code adhérent {a.code})."
        )))
    if cible_id != membre.id:
        db.add(Message(membre_id=cible_id, de_la_frangine=True, texte=(
            f"Vous êtes inscrit·e au likelemba {g.code} (code adhérent {a.code}). Cotisation : "
            f"{fonds.montant_lisible(g.montant_cotisation)} FCFA, {Periodicite.libelle(g.periodicite).lower()}."
        )))
    db.commit()
    return Ok(message="Enregistrement effectué. Bienvenue dans le likelemba !", id=a.id, reference=a.code)


routers = [router]
