"""Ressources humaines : demandes et offres d'emploi (legacy : choix2.php, incl-choix2.php,
incl-humaine.php, module besoin). Inventaire : F-S2-01 à F-S2-33. Module de référence : les
autres modules suivent la même structure (voir docs/CONVENTIONS.md)."""

from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, verifier_modification
from app.enums import Etat, Sexe, TypeAnnonceRH, TypeInteret
from app.erreurs import erreur
from app.models import AnnonceEmploi, DomaineActivite
from app.schemas import emplois as s
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

router = APIRouter(prefix="/emplois", tags=["Emplois"])


@router.get("", response_model=Liste[s.AnnonceResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=2)] = None,
    q: str | None = None,
    domaine_id: int | None = None,
    secteur_id: int | None = None,
    etat: int | None = None,
    miennes: bool = False,
):
    req = select(AnnonceEmploi).options(selectinload(AnnonceEmploi.domaine))
    if (cond := visibilite(AnnonceEmploi, membre)) is not None:
        req = req.where(cond)
    if type:
        req = req.where(AnnonceEmploi.type_annonce == type)
    if domaine_id:
        req = req.where(AnnonceEmploi.domaine_id == domaine_id)
    if secteur_id:
        req = req.join(DomaineActivite, AnnonceEmploi.domaine_id == DomaineActivite.id).where(DomaineActivite.secteur_id == secteur_id)
    if membre and membre.est_gestionnaire:
        req = req.where(AnnonceEmploi.etat == etat) if etat else req.where(AnnonceEmploi.etat != Etat.SUPPRIME)
    if miennes and membre:
        req = req.where(AnnonceEmploi.auteur_id == membre.id)
    # Recherche legacy (cht01) : poste, diplômes, expérience, compétences
    if (cond := recherche(q, AnnonceEmploi.poste_a_pourvoir, AnnonceEmploi.diplomes, AnnonceEmploi.experience,
                          AnnonceEmploi.competences, AnnonceEmploi.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(AnnonceEmploi.date_creation.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    def n(t: int) -> int:
        return db.scalar(
            select(func.count()).select_from(AnnonceEmploi).where(
                AnnonceEmploi.type_annonce == t, AnnonceEmploi.etat == Etat.AUTORISE
            )
        ) or 0

    return s.Compteurs(demandes=n(TypeAnnonceRH.DEMANDE), offres=n(TypeAnnonceRH.OFFRE))


def _detail(db: Db, fiche: AnnonceEmploi, membre) -> s.AnnonceDetail:
    d = s.AnnonceDetail.model_validate(fiche)
    proprietaire = membre is not None and (membre.id == fiche.auteur_id or membre.est_gestionnaire)
    if proprietaire:
        d.interets = [s.InteretOut.model_validate(i) for i in interets.lister(db, "annonce_emploi_id", fiche.id)]
    else:
        # Identité et coordonnées du candidat : auteur et gestionnaires seulement (ADR-0007 S2c)
        d.nom = d.prenom = d.adresse = d.telephone = d.email = None
    d.peut_modifier = membre is not None and (membre.id == fiche.auteur_id or membre.peut_moderer())
    d.peut_moderer = membre is not None and membre.peut_moderer()
    if membre is not None and not proprietaire:
        d.mon_interet = any(i.membre_id == membre.id for i in interets.lister(db, "annonce_emploi_id", fiche.id))
    return d


@router.get("/{id_}", response_model=s.AnnonceDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, AnnonceEmploi, id_, membre, message="Cette annonce n'existe pas ou n'est plus publiée.")
    compter_visite(fiche, membre)
    db.commit()
    return _detail(db, fiche, membre)


def _valider(db: Db, donnees: s.AnnonceEntree, membre, exclure_id: int | None = None) -> None:
    """Règles legacy (incl-humaine.php), appliquées réellement (correctif F-S2-14)."""
    champs: dict[str, str] = {}
    if not donnees.domaine_id or db.get(DomaineActivite, donnees.domaine_id) is None:
        champs["domaine_id"] = "Veuillez choisir le domaine d'activité."
    if donnees.type_annonce == TypeAnnonceRH.DEMANDE:
        if len(donnees.nom.strip()) <= 3:
            champs["nom"] = "Le nom doit contenir plus de 3 caractères."
        # Le sexe n'est exigé que pour une demande (ADR-0007 S2b)
        if donnees.sexe not in (Sexe.FEMININ, Sexe.MASCULIN):
            champs["sexe"] = "Veuillez indiquer le sexe."
        if not donnees.telephone:
            champs["telephone"] = "Le numéro de téléphone est obligatoire pour une demande d'emploi."
    else:
        if len(donnees.poste_a_pourvoir.strip()) < 3:
            champs["poste_a_pourvoir"] = "Veuillez indiquer le poste à pourvoir."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Anti-doublon legacy : même type, même membre, même poste, mêmes informations
    doublon = select(AnnonceEmploi.id).where(
        AnnonceEmploi.type_annonce == donnees.type_annonce,
        AnnonceEmploi.auteur_id == membre.id,
        AnnonceEmploi.poste_a_pourvoir == donnees.poste_a_pourvoir.strip(),
        AnnonceEmploi.autres_informations == donnees.autres_informations.strip(),
        AnnonceEmploi.competences == donnees.competences.strip(),
        AnnonceEmploi.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(AnnonceEmploi.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette fiche est déjà créée.")


def _appliquer(fiche: AnnonceEmploi, d: s.AnnonceEntree) -> None:
    fiche.type_annonce = d.type_annonce
    fiche.domaine_id = d.domaine_id
    fiche.secteur_id = None
    fiche.nom = d.nom.strip().upper()  # F-S2-18
    fiche.prenom = d.prenom.strip().title()
    fiche.sexe = d.sexe if d.sexe in (Sexe.FEMININ, Sexe.MASCULIN) else Sexe.INDEFINI
    fiche.date_naissance = d.date_naissance
    fiche.adresse = d.adresse.strip()
    fiche.telephone = d.telephone
    fiche.email = d.email or ""
    fiche.poste_a_pourvoir = d.poste_a_pourvoir.strip()
    fiche.diplomes = d.diplomes.strip()
    fiche.competences = d.competences.strip()
    fiche.experience = d.experience.strip()
    fiche.autres_informations = d.autres_informations.strip()


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.AnnonceEntree, db: Db, membre: MembreReq):
    _valider(db, donnees, membre)
    fiche = AnnonceEmploi(auteur_id=membre.id, etat=Etat.AUTORISE)  # publiée immédiatement (legacy)
    _appliquer(fiche, donnees)
    fiche.reference = nouvelle_reference(
        db, Prefixe.DEMANDE_EMPLOI if donnees.type_annonce == TypeAnnonceRH.DEMANDE else Prefixe.OFFRE_EMPLOI
    )
    domaine = db.get(DomaineActivite, donnees.domaine_id)
    fiche.secteur_id = domaine.secteur_id if domaine else None
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.AnnonceEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    verifier_modification(membre, fiche.auteur_id)
    _valider(db, donnees, membre, exclure_id=fiche.id)
    _appliquer(fiche, donnees)
    domaine = db.get(DomaineActivite, donnees.domaine_id)
    fiche.secteur_id = domaine.secteur_id if domaine else None
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    verifier_modification(membre, fiche.auteur_id)
    ancien = fiche.photo
    fiche.photo = await fichiers.enregistrer(fichier, "emploi", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=fiche.id)


@router.post("/{id_}/cv", response_model=Ok)
async def cv(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    verifier_modification(membre, fiche.auteur_id)
    ancien = fiche.cv
    fiche.cv = await fichiers.enregistrer(fichier, "emploi", {fichiers.PDF}, champ="cv")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="CV enregistré.", id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


@router.post("/{id_}/interet", response_model=Ok, status_code=201)
def manifester(id_: int, donnees: s.InteretEntree, db: Db, membre: MembreReq):
    """Sur une demande : « Présentation de besoin » (message obligatoire) ; sur une offre :
    « Intéressement » (message facultatif). F-S2-27 à F-S2-33."""
    fiche = obtenir(db, AnnonceEmploi, id_, membre)
    demande = fiche.type_annonce == TypeAnnonceRH.DEMANDE
    interets.deposer(
        db, membre, "annonce_emploi_id", fiche.id, fiche.auteur_id,
        sous_type=TypeInteret.BESOIN if demande else TypeInteret.INTERESSEMENT,
        message=donnees.message, libelle_fiche=fiche.reference, lien=f"/emplois/{fiche.id}",
        message_obligatoire=demande,
    )
    db.commit()
    quoi = "Présentation de besoin" if demande else "Intéressement"
    return Ok(message=f"Votre {quoi} est pris en compte.", id=fiche.id)


routers = [router]
