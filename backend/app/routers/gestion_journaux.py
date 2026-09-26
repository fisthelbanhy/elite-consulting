"""Journaux des visites anonymes et des connexions de membres (legacy `pvisite.php`).
Inventaire : E-ADM-11, F-ADM-30 à F-ADM-33.

Correctifs : filtre par période fonctionnel (erreur fatale `datefr3()` dans le legacy), plage
horaire qui peut passer minuit, purge confirmée et réservée au droit Activation (suppression
physique, comme le legacy : ce sont des journaux techniques).
"""

import re
from datetime import date, datetime, time
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import and_, delete, extract, or_, select

from app.deps import Db, Gestionnaire, exiger_droit, gestionnaire_requis
from app.erreurs import erreur
from app.models import Membre, Visite, VisiteMembre
from app.schemas import gestion as s
from app.schemas.commun import Liste, Ok
from app.services import gestion as svc
from app.services.fiches import paginer
from app.services.gestion import PaginationGestion

router = APIRouter(prefix="/gestion/journaux", tags=["Gestion — journaux"], dependencies=[Depends(gestionnaire_requis)])

HEURE = re.compile(r"^([01]?\d|2[0-3])[:hH]?([0-5]\d)?$")


def _minutes(valeur: str | None, champ: str) -> int | None:
    """« 08:30 », « 8h30 », « 8 » → minutes depuis minuit."""
    v = (valeur or "").strip()
    if not v:
        return None
    m = HEURE.match(v)
    if not m:
        raise erreur("Heure invalide.", **{champ: "Heure attendue au format HH:MM (ex. 08:30)."})
    return int(m.group(1)) * 60 + int(m.group(2) or 0)


def _filtres(colonne, du: date | None, au: date | None, heure_debut: str | None, heure_fin: str | None) -> list:
    conds = []
    if du and au and du > au:
        raise erreur("Période invalide.", au="La date de fin doit suivre la date de début.")
    if du:
        conds.append(colonne >= datetime.combine(du, time.min))
    if au:
        conds.append(colonne <= datetime.combine(au, time.max))  # jour de fin inclus
    debut, fin = _minutes(heure_debut, "heure_debut"), _minutes(heure_fin, "heure_fin")
    if debut is not None or fin is not None:
        minute_du_jour = extract("hour", colonne) * 60 + extract("minute", colonne)
        debut = 0 if debut is None else debut
        fin = 24 * 60 - 1 if fin is None else fin
        if debut <= fin:
            conds.append(and_(minute_du_jour >= debut, minute_du_jour <= fin))
        else:  # plage qui passe minuit (ex. 22:00 → 06:00)
            conds.append(or_(minute_du_jour >= debut, minute_du_jour <= fin))
    return conds


def _membre_affiche(membre_id: int | None) -> bool:
    # Le legacy rattachait toutes les visites anonymes au compte système n° 1
    return bool(membre_id) and membre_id != svc.ID_COMPTE_SYSTEME


@router.get("/visites", response_model=Liste[s.VisiteLigne])
def visites(
    db: Db, page: PaginationGestion = Depends(), du: date | None = None, au: date | None = None,
    heure_debut: str | None = None, heure_fin: str | None = None, ip: str | None = None,
):
    """F-ADM-30 : visites anonymes (une ligne par IP et par tranche de 30 minutes)."""
    req = select(Visite)
    for cond in _filtres(Visite.date_heure, du, au, heure_debut, heure_fin):
        req = req.where(cond)
    if ip and ip.strip():
        req = req.where(Visite.adresse_ip.contains(ip.strip()))
    items, total = paginer(db, req.order_by(Visite.date_heure.desc(), Visite.id.desc()), page)
    ids = {v.membre_id for v in items if _membre_affiche(v.membre_id)}
    membres = {m.id: m for m in db.scalars(select(Membre).where(Membre.id.in_(ids))).all()} if ids else {}
    lignes = []
    for v in items:
        ligne = s.VisiteLigne(id=v.id, date_heure=v.date_heure, adresse_ip=v.adresse_ip)
        if v.membre_id in membres:
            ligne.membre = s.MembreCourt.model_validate(membres[v.membre_id])
        lignes.append(ligne)
    return Liste(items=lignes, total=total, page=page.page, taille=page.taille)


@router.get("/connexions", response_model=Liste[s.ConnexionLigne])
def connexions(
    db: Db, moi: Gestionnaire, page: PaginationGestion = Depends(), du: date | None = None, au: date | None = None,
    heure_debut: str | None = None, heure_fin: str | None = None, ip: str | None = None, membre_id: int | None = None,
):
    """F-ADM-31 : connexions des membres (membre, date, IP), aussi affichées sur la fiche membre."""
    req = select(VisiteMembre)
    for cond in _filtres(VisiteMembre.date_connexion, du, au, heure_debut, heure_fin):
        req = req.where(cond)
    if ip and ip.strip():
        req = req.where(VisiteMembre.adresse_ip.contains(ip.strip()))
    if membre_id:
        req = req.where(VisiteMembre.membre_id == membre_id)
    if moi.id != svc.ID_COMPTE_SYSTEME:
        req = req.where(VisiteMembre.membre_id != svc.ID_COMPTE_SYSTEME)
    items, total = paginer(db, req.order_by(VisiteMembre.date_connexion.desc(), VisiteMembre.id.desc()), page)
    ids = {c.membre_id for c in items}
    membres = {m.id: m for m in db.scalars(select(Membre).where(Membre.id.in_(ids))).all()} if ids else {}
    lignes = []
    for c in items:
        ligne = s.ConnexionLigne(id=c.id, date_connexion=c.date_connexion, adresse_ip=c.adresse_ip)
        if c.membre_id in membres:
            ligne.membre = s.MembreCourt.model_validate(membres[c.membre_id])
        lignes.append(ligne)
    return Liste(items=lignes, total=total, page=page.page, taille=page.taille)


@router.post("/{journal}/purger", response_model=Ok)
def purger(journal: Literal["visites", "connexions"], d: s.PurgeEntree, db: Db, moi: Gestionnaire):
    """F-ADM-33 : purge des lignes cochées, ou de tout l'historique antérieur à une date
    (confirmation demandée par l'interface)."""
    exiger_droit(moi, "activation")
    modele, colonne = (Visite, Visite.date_heure) if journal == "visites" else (VisiteMembre, VisiteMembre.date_connexion)
    if d.ids:
        cond = modele.id.in_(d.ids)
    elif d.avant:
        cond = colonne < datetime.combine(d.avant, time.min)
    else:
        raise erreur("Sélectionnez au moins une ligne, ou indiquez une date.")
    n = db.execute(delete(modele).where(cond)).rowcount or 0
    db.commit()
    return Ok(message=f"{n} ligne{'s' if n > 1 else ''} supprimée{'s' if n > 1 else ''}.")


routers = [router]
