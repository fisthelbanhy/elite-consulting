"""Partenariat & troc : « J'ai… (actif), je cherche… » (legacy choix5.php?opaf=3,
incl-choix5C.php, incl-partenariat.php ; F-S5-46 à F-S5-53)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Etat, TypeInteret
from app.erreurs import erreur, interdit
from app.models import Partenariat
from app.schemas import partenariats as s
from app.schemas.commun import Liste, Ok
from app.services import interets
from app.services.fiches import changer_etat, obtenir, paginer, recherche, supprimer, visibilite
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/partenariats", tags=["Partenariat & troc"])

INTROUVABLE = "Cette recherche de partenariat n'existe pas ou n'est plus publiée."
ENREGISTREE = "Votre recherche de partenariat & troc a bien été enregistrée."


@router.get("", response_model=Liste[s.PartenariatResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: str | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    miennes: bool = False,
):
    """Liste publique des fiches publiées (F-S5-46) ; l'auteur voit aussi les siennes, le gestionnaire
    toutes. Recherche correctement parenthésée (F-S5-47) dans l'actif, la description, la recherche
    et l'objectif ; tri par date décroissante."""
    req = select(Partenariat).options(selectinload(Partenariat.auteur))
    if (cond := visibilite(Partenariat, membre)) is not None:
        req = req.where(cond)
    if membre is not None and membre.est_gestionnaire:
        req = req.where(Partenariat.etat == etat) if etat else req.where(Partenariat.etat != Etat.SUPPRIME)
    if miennes and membre is not None:
        req = req.where(Partenariat.auteur_id == membre.id)
    if (cond := recherche(q, Partenariat.actif, Partenariat.description, Partenariat.recherche,
                          Partenariat.objectif, Partenariat.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Partenariat.date_creation.desc(), Partenariat.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteur", response_model=s.Compteur)
def compteur(db: Db):
    """Nombre de fiches publiées (onglet « Partenariat & troc (n) », F-S5-01)."""
    n = db.scalar(select(func.count()).select_from(Partenariat).where(Partenariat.etat == Etat.AUTORISE)) or 0
    return s.Compteur(publies=n)


def _detail(db: Db, fiche: Partenariat, membre) -> s.PartenariatDetail:
    d = s.PartenariatDetail.model_validate(fiche)
    recus = interets.lister(db, "partenariat_id", fiche.id)
    d.nombre_interets = len(recus)
    proprietaire = membre is not None and (membre.id == fiche.auteur_id or membre.est_gestionnaire)
    if proprietaire:
        d.interets = [s.InteretOut.model_validate(i) for i in recus]
    d.peut_modifier = peut_modifier(membre, fiche.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    if membre is not None and not proprietaire:
        d.mon_interet = any(i.membre_id == membre.id for i in recus)
    return d


@router.get("/{id_}", response_model=s.PartenariatDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, Partenariat, id_, membre, message=INTROUVABLE)
    return _detail(db, fiche, membre)


def _valider(db: Db, d: s.PartenariatEntree, auteur_id: int, exclure_id: int | None = None) -> None:
    """Actif obligatoire (≥ 5 caractères ; le message legacy annonçait 3 à tort) et anti-doublon de
    l'actif pour un même auteur."""
    actif = d.actif.strip()
    if len(actif) < 5:
        raise erreur("Veuillez corriger les champs signalés.", actif="Veuillez saisir l'actif avec 5 caractères minimum.")
    doublon = select(Partenariat.id).where(
        func.lower(Partenariat.actif) == actif.lower(),
        Partenariat.auteur_id == auteur_id,
        Partenariat.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(Partenariat.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette recherche de partenariat & troc est déjà enregistrée.")


def _appliquer(fiche: Partenariat, d: s.PartenariatEntree) -> None:
    fiche.actif = d.actif.strip()
    fiche.description = d.description.strip()
    fiche.recherche = d.recherche.strip()
    fiche.objectif = d.objectif.strip()


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.PartenariatEntree, db: Db, membre: MembreReq):
    """Création par un membre (F-S5-48) : publication immédiate (état 2), référence `PTR…`."""
    if membre.est_gestionnaire:
        raise interdit("La publication d'une recherche de partenariat est réservée aux membres.")
    _valider(db, donnees, membre.id)
    fiche = Partenariat(auteur_id=membre.id, etat=Etat.AUTORISE, reference=nouvelle_reference(db, Prefixe.PARTENARIAT))
    _appliquer(fiche, donnees)
    db.add(fiche)
    db.commit()
    return Ok(message=ENREGISTREE, id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.PartenariatEntree, db: Db, membre: MembreReq):
    """Modification par l'auteur ou un gestionnaire habilité (F-S5-49)."""
    fiche = obtenir(db, Partenariat, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    _valider(db, donnees, fiche.auteur_id or membre.id, exclure_id=fiche.id)
    _appliquer(fiche, donnees)
    db.commit()
    return Ok(message=ENREGISTREE, id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Partenariat, id_, membre, message=INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Partenariat, id_, membre, message=INTROUVABLE)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


@router.post("/{id_}/interet", response_model=Ok, status_code=201)
def manifester(id_: int, donnees: s.InteretEntree, db: Db, membre: MembreReq):
    """Intéressement d'un membre non auteur (F-S5-51) : 5 caractères minimum, un seul par membre et
    par fiche (correctif : le legacy testait la mauvaise colonne), auteur prévenu par la messagerie."""
    fiche = obtenir(db, Partenariat, id_, membre, message=INTROUVABLE)
    if membre.est_gestionnaire:
        raise interdit("L'intéressement est réservé aux membres.")
    if fiche.etat != Etat.AUTORISE:
        raise erreur("Cette fiche n'est pas publiée : l'intéressement n'est pas possible.")
    if len(donnees.message.strip()) < 5:
        raise erreur("Veuillez corriger les champs signalés.", message="L'intéressement doit avoir 5 caractères minimum.")
    interets.deposer(
        db, membre, "partenariat_id", fiche.id, fiche.auteur_id, sous_type=TypeInteret.INTERESSEMENT,
        message=donnees.message, libelle_fiche=f"{fiche.reference} — {fiche.actif}", lien=f"/partenariats/{fiche.id}",
        message_obligatoire=True,
    )
    db.commit()
    return Ok(message="Votre intéressement est pris en compte.", id=fiche.id)


routers = [router]
