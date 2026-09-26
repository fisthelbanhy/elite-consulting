"""Immobilier : offres et recherches de biens (legacy : choix3.php imbart=1, incl-choix3A.php,
incl-immobilier.php, table `besoin`). Inventaire : F-S3-02, F-S3-06 à F-S3-28."""

from typing import Annotated, Literal

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Etat, OffreDemande, SituationBien, TypeBien, TypeInteret, TypeTransaction
from app.erreurs import erreur, interdit
from app.models import Immobilier, Quartier
from app.schemas import immobilier as s
from app.schemas.commun import Liste, Ok
from app.services import fichiers, interets
from app.services.fiches import (
    changer_etat,
    compter_visite,
    obtenir,
    paginer,
    recherche,
    supprimer,
    visibilite,
)
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/immobilier", tags=["Immobilier"])

INTROUVABLE = "Ce bien n'existe pas ou n'est plus publié."
TYPES_BIEN = {t.value for t in TypeBien if t != TypeBien.INDIFFERENT}


def _requete():
    return select(Immobilier).options(selectinload(Immobilier.quartier).selectinload(Quartier.ville))


@router.get("", response_model=Liste[s.BienResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=2, description="1 Offre, 2 Recherche")] = None,
    transaction: Annotated[int | None, Query(ge=1, le=2)] = None,
    type_bien: Annotated[int | None, Query(ge=1, le=9)] = None,
    ville_id: int | None = None,
    quartier_id: int | None = None,
    chambres: Annotated[int | None, Query(ge=0, le=100)] = None,
    pieces_min: Annotated[int | None, Query(ge=0, le=100)] = None,
    surface_min: Annotated[int | None, Query(ge=0)] = None,
    surface_max: Annotated[int | None, Query(ge=0)] = None,
    prix_min: Annotated[int | None, Query(ge=0)] = None,
    prix_max: Annotated[int | None, Query(ge=0)] = None,
    q: str | None = None,
    etat: int | None = None,
    miens: bool = False,
    tri: Literal["prix", "prix_desc", "recent", "visites"] = "prix",
):
    """Filtres legacy (Besoin, Type de bien, Chambres, Prix minimum, Quartier) + ceux restés en
    code commenté (ville, pièces, surface, prix maximum) et une recherche texte. Tous combinés en ET."""
    req = _requete()
    if (cond := visibilite(Immobilier, membre)) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(Immobilier.etat == etat) if etat else req.where(Immobilier.etat != Etat.SUPPRIME)
    if miens and membre:
        req = req.where(Immobilier.auteur_id == membre.id)
    if ville_id:
        req = req.join(Quartier, Immobilier.quartier_id == Quartier.id).where(Quartier.ville_id == ville_id)
    for cond in (
        Immobilier.offre_ou_recherche == type if type else None,
        Immobilier.type_transaction == transaction if transaction else None,
        Immobilier.type_bien == type_bien if type_bien else None,
        Immobilier.quartier_id == quartier_id if quartier_id else None,
        Immobilier.nombre_chambres == chambres if chambres else None,  # égalité stricte (legacy)
        Immobilier.nombre_pieces >= pieces_min if pieces_min else None,
        Immobilier.surface_m2 >= surface_min if surface_min else None,
        Immobilier.surface_m2 <= surface_max if surface_max else None,
        Immobilier.prix >= prix_min if prix_min else None,
        Immobilier.prix <= prix_max if prix_max else None,
        # Correctif legacy : le OU est parenthésé (or_) et ne casse plus les autres critères
        recherche(q, Immobilier.description, Immobilier.reference, Immobilier.localisation),
    ):
        if cond is not None:
            req = req.where(cond)
    ordre = {
        # Legacy : prix croissant ; les biens « prix à débattre » (0) en fin de liste
        "prix": ((Immobilier.prix == 0), Immobilier.prix, Immobilier.id.desc()),
        "prix_desc": (Immobilier.prix.desc(), Immobilier.id.desc()),
        "recent": (Immobilier.date_creation.desc(), Immobilier.id.desc()),
        "visites": (Immobilier.nombre_visites.desc(), Immobilier.id.desc()),
    }[tri]
    items, total = paginer(db, req.order_by(*ordre), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    """Compteurs des onglets (F-S3-02) : biens publiés, offres et recherches."""
    lignes = dict(db.execute(
        select(Immobilier.offre_ou_recherche, func.count())
        .where(Immobilier.etat == Etat.AUTORISE)
        .group_by(Immobilier.offre_ou_recherche)
    ).all())
    offres, recherches = lignes.get(OffreDemande.OFFRE, 0), lignes.get(OffreDemande.DEMANDE, 0)
    return s.Compteurs(offres=offres, recherches=recherches, total=offres + recherches)


@router.get("/encarts", response_model=s.Encarts)
def encarts(db: Db):
    """Encarts « Nouveautés » et « Les plus visités » (F-S3-06/07) : 5 biens publiés chacun."""
    publies = _requete().where(Immobilier.etat == Etat.AUTORISE)
    return s.Encarts(
        nouveautes=db.scalars(publies.order_by(Immobilier.date_creation.desc(), Immobilier.id.desc()).limit(5)).all(),
        plus_visites=db.scalars(publies.order_by(Immobilier.nombre_visites.desc(), Immobilier.id.desc()).limit(5)).all(),
    )


def _detail(db: Db, fiche: Immobilier, membre) -> s.BienDetail:
    d = s.BienDetail.model_validate(fiche)
    proprietaire = membre is not None and (membre.id == fiche.auteur_id or membre.est_gestionnaire)
    recus = interets.lister(db, "immobilier_id", fiche.id)
    if proprietaire:
        # Contributions reçues : auteur et gestionnaires seulement (ADR-0007 S2d, F-S3-20/27)
        d.interets = [s.InteretOut.model_validate(i) for i in recus]
    else:
        d.localisation = None
    d.peut_modifier = peut_modifier(membre, fiche.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    # Visiteur : invité à se connecter ; gestionnaire et auteur : pas de formulaire (F-S3-16)
    d.peut_manifester = membre is None or (not membre.est_gestionnaire and membre.id != fiche.auteur_id)
    if membre is not None and not proprietaire:
        d.mon_interet = any(i.membre_id == membre.id for i in recus)
    return d


@router.get("/{id_}", response_model=s.BienDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    compter_visite(fiche, membre)  # F-S3-15 : tiers seulement, sans plafond
    db.commit()
    return _detail(db, fiche, membre)


def _valider(db: Db, d: s.BienEntree, exclure_id: int | None = None) -> None:
    """Règles legacy (incl-immobilier.php), messages repris avec l'orthographe corrigée (F-S3-21 à 23)."""
    champs: dict[str, str] = {}
    if d.offre_ou_recherche not in (OffreDemande.OFFRE, OffreDemande.DEMANDE):
        champs["offre_ou_recherche"] = "Veuillez indiquer s'il s'agit d'une offre ou d'une recherche."
    if d.type_transaction not in (TypeTransaction.LOCATION, TypeTransaction.VENTE):
        champs["type_transaction"] = "Veuillez indiquer la transaction."
    if d.type_bien not in TYPES_BIEN:
        champs["type_bien"] = "Veuillez indiquer le type de l'immobilier."
    if d.quartier_id and db.get(Quartier, d.quartier_id) is None:
        champs["quartier_id"] = "Veuillez choisir un quartier de la liste."
    if d.surface_m2 < 1:
        champs["surface_m2"] = "Veuillez indiquer la surface."
    elif d.surface_m2 > s.SURFACE_MAX:
        champs["surface_m2"] = f"La surface ne peut dépasser {s.SURFACE_MAX:,} m².".replace(",", " ")
    if d.situation not in (SituationBien.DISPONIBLE, SituationBien.OCCUPE):
        champs["situation"] = "Veuillez indiquer la situation du bien."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Unicité legacy sur la description (fiches non supprimées)
    description = d.description.strip()
    if description:
        doublon = select(Immobilier.id).where(Immobilier.description == description, Immobilier.etat != Etat.SUPPRIME)
        if exclure_id:
            doublon = doublon.where(Immobilier.id != exclure_id)
        if db.scalar(doublon.limit(1)):
            raise erreur("Cette fiche existe déjà.", description="Un bien avec exactement la même description est déjà publié.")


def _appliquer(fiche: Immobilier, d: s.BienEntree) -> None:
    fiche.offre_ou_recherche = d.offre_ou_recherche
    fiche.type_transaction = d.type_transaction
    fiche.type_bien = d.type_bien
    fiche.quartier_id = d.quartier_id or None
    fiche.localisation = d.localisation.strip()
    fiche.surface_m2 = d.surface_m2
    fiche.nombre_pieces = d.nombre_pieces
    fiche.nombre_chambres = d.nombre_chambres
    fiche.situation = d.situation
    fiche.prix = d.prix
    fiche.description = d.description.strip()


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.BienEntree, db: Db, membre: MembreReq):
    _valider(db, donnees)
    fiche = Immobilier(auteur_id=membre.id, etat=Etat.AUTORISE)  # publié immédiatement (legacy, F-S3-24)
    _appliquer(fiche, donnees)
    fiche.reference = nouvelle_reference(db, Prefixe.IMMOBILIER)
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.BienEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)  # F-S3-28
    _valider(db, donnees, exclure_id=fiche.id)
    _appliquer(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    ancien = fiche.photo
    fiche.photo = await fichiers.enregistrer(fichier, "immobilier", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)  # F-S3-26 : gestionnaire + droit Activation
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


@router.post("/{id_}/interet", response_model=Ok, status_code=201)
def manifester(id_: int, donnees: s.InteretEntree, db: Db, membre: MembreReq):
    """Sur une offre : « Présentation de besoin » ; sur une recherche : « Intéressement ».
    Message obligatoire (5 caractères minimum), un seul par membre et par bien (F-S3-16 à 19)."""
    fiche = obtenir(db, Immobilier, id_, membre, message=INTROUVABLE)
    if membre.est_gestionnaire:
        raise interdit("Les gestionnaires ne déposent ni besoin ni intéressement.")
    offre = fiche.offre_ou_recherche == OffreDemande.OFFRE
    quoi = "Présentation de besoin" if offre else "Intéressement"
    if len(donnees.message.strip()) < 5:
        raise erreur(f"{quoi} doit avoir 5 caractères minimum.", message=f"{quoi} : 5 caractères minimum.")
    interets.deposer(
        db, membre, "immobilier_id", fiche.id, fiche.auteur_id,
        sous_type=TypeInteret.BESOIN if offre else TypeInteret.INTERESSEMENT,
        message=donnees.message, libelle_fiche=fiche.reference, lien=f"/immobilier/{fiche.id}",
        message_obligatoire=True,
    )
    db.commit()
    confirmation = "Votre présentation de besoin est prise en compte." if offre else "Votre intéressement est pris en compte."
    return Ok(message=confirmation, id=fiche.id)


routers = [router]
