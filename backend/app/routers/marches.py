"""Marchés (appels d'offres publics et privés) et projets (legacy : choix6.php?rere=3,
incl-choix6C1.php, incl-choix6C2.php, incl-marche.php, incl-projet.php).
Inventaire : S6-5 à S6-8, F-S6-01, F-S6-23 à F-S6-32, F-S6-35.

Les projets sont servis sous `/marches/projets` (onglet « Projets » de « Marchés et projets ») ;
ne pas confondre avec `/projets` (appels de fonds, section 4)."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, or_, select

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Confidentialite, Etat
from app.erreurs import erreur
from app.models import Marche, Projet
from app.schemas import marches as s
from app.schemas.commun import Liste, Ok
from app.schemas.entreprises import EtatEntree
from app.services import fichiers
from app.services.fiches import changer_etat, obtenir, paginer, recherche, supprimer, visibilite
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/marches", tags=["Marchés"])
router_projets = APIRouter(prefix="/marches/projets", tags=["Marchés"])

MARCHE_INTROUVABLE = "Ce marché n'existe pas ou n'est plus publié."
PROJET_INTROUVABLE = "Ce projet n'existe pas ou n'est plus publié."


def _texte(v: str) -> str:
    return (v or "").strip()


def _ouverts():
    """Marchés où l'on peut encore soumissionner : non clôturés, date limite non dépassée
    (ou non précisée)."""
    return (Marche.etat != Etat.CLOTURE) & or_(Marche.date_limite.is_(None), Marche.date_limite >= date.today())


# --- Marchés -------------------------------------------------------------------------------------


@router.get("", response_model=Liste[s.MarcheResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=2)] = None,
    ouverts: bool = False,
    montant_min: Annotated[int | None, Query(ge=0)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    tri: Literal["recent", "cloture", "montant"] = "recent",
    etat: int | None = None,
    miennes: bool = False,
):
    req = select(Marche)
    if (cond := visibilite(Marche, membre)) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(Marche.etat == etat) if etat else req.where(Marche.etat != Etat.SUPPRIME)
    if miennes and membre:
        req = req.where(Marche.auteur_id == membre.id)
    if type:
        req = req.where(Marche.type_marche == type)
    if ouverts:
        req = req.where(_ouverts())
    if montant_min:
        req = req.where(Marche.montant >= montant_min)
    # Recherche legacy (cht03) : libellé, description, dossier — correctement parenthésée (F-S6-24)
    if (cond := recherche(q, Marche.libelle, Marche.description, Marche.dossier_a_fournir, Marche.numero_appel_offre,
                          Marche.maitre_ouvrage, Marche.reference)) is not None:
        req = req.where(cond)
    ordre = {
        "recent": (Marche.date_creation.desc(), Marche.id.desc()),
        "cloture": (Marche.date_limite.is_(None), Marche.date_limite, Marche.id.desc()),
        "montant": (Marche.montant.desc(), Marche.id.desc()),
    }[tri]
    items, total = paginer(db, req.order_by(*ordre), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    """Compteurs publics des onglets (F-S6-01 : le legacy affichait le nombre de projets publiés)."""

    def n(modele, *conds) -> int:
        return db.scalar(select(func.count()).select_from(modele).where(modele.etat == Etat.AUTORISE, *conds)) or 0

    return s.Compteurs(marches=n(Marche), marches_ouverts=n(Marche, _ouverts()), projets=n(Projet))


def _detail_marche(fiche: Marche, membre) -> s.MarcheDetail:
    d = s.MarcheDetail.model_validate(fiche)
    d.peut_modifier = peut_modifier(membre, fiche.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    return d


@router.get("/{id_}", response_model=s.MarcheDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    return _detail_marche(fiche, membre)


def _valider_marche(db: Db, d: s.MarcheEntree, exclure_id: int | None = None) -> None:
    """Règles legacy d'incl-marche.php (messages exacts, orthographe corrigée)."""
    champs: dict[str, str] = {}
    if len(_texte(d.numero_appel_offre)) < 4:
        champs["numero_appel_offre"] = "Veuillez indiquer le numéro d'appel d'offres."
    if d.type_marche not in (Confidentialite.PRIVE, Confidentialite.PUBLIC):
        champs["type_marche"] = "Veuillez indiquer marché privé ou public."
    if len(_texte(d.libelle)) < 4:
        champs["libelle"] = "Veuillez indiquer le libellé du marché."
    if d.montant <= 0:
        champs["montant"] = "Veuillez indiquer le montant du marché."
    # Ajout : on ne publie pas un appel d'offres déjà clos (la modification reste possible)
    if exclure_id is None and d.date_limite and d.date_limite < date.today():
        champs["date_limite"] = "La date limite est déjà passée."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Unicité du numéro d'appel d'offres, en création **et** en modification (F-S6-26, corrigé)
    doublon = select(Marche.id).where(
        func.lower(Marche.numero_appel_offre) == _texte(d.numero_appel_offre).lower(),
        Marche.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(Marche.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce marché est déjà enregistré.", numero_appel_offre="Ce numéro d'appel d'offres est déjà publié.")


def _appliquer_marche(fiche: Marche, d: s.MarcheEntree) -> None:
    fiche.numero_appel_offre = _texte(d.numero_appel_offre)
    fiche.type_marche = d.type_marche or Confidentialite.PUBLIC
    fiche.libelle = _texte(d.libelle)
    fiche.description = _texte(d.description)
    fiche.montant = d.montant
    fiche.date_limite = d.date_limite
    fiche.dossier_a_fournir = _texte(d.dossier_a_fournir)
    fiche.lieu_depot = _texte(d.lieu_depot)
    fiche.email = d.email or ""
    fiche.maitre_ouvrage = _texte(d.maitre_ouvrage)
    fiche.publie_par = _texte(d.publie_par)
    fiche.beneficiaire = _texte(d.beneficiaire)


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.MarcheEntree, db: Db, membre: MembreReq):
    """Création par tout membre connecté (F-S6-25), publiée immédiatement (legacy : état 2)."""
    _valider_marche(db, donnees)
    fiche = Marche(auteur_id=membre.id, etat=Etat.AUTORISE)
    _appliquer_marche(fiche, donnees)
    fiche.reference = nouvelle_reference(db, Prefixe.MARCHE)
    db.add(fiche)
    db.commit()
    return Ok(message="Opération effectuée avec succès.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.MarcheEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    _valider_marche(db, donnees, exclure_id=fiche.id)
    _appliquer_marche(fiche, donnees)
    db.commit()
    return Ok(message="Opération effectuée avec succès.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/document", response_model=Ok)
async def document(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    """Dossier d'appel d'offres en PDF (facultatif, nouveau)."""
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    ancien = fiche.document
    fiche.document = await fichiers.enregistrer(fichier, "marches", {fichiers.PDF}, champ="document")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Document enregistré.", id=fiche.id)


@router.delete("/{id_}/document", response_model=Ok)
def retirer_document(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    ancien, fiche.document = fiche.document, None
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Document retiré.", id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat_marche(id_: int, donnees: EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Marche, id_, membre, message=MARCHE_INTROUVABLE)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


# --- Projets -------------------------------------------------------------------------------------


@router_projets.get("", response_model=Liste[s.ProjetResume])
def lister_projets(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: Annotated[str | None, Query(max_length=100)] = None,
    etat: int | None = None,
    miennes: bool = False,
):
    req = select(Projet)
    if (cond := visibilite(Projet, membre)) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(Projet.etat == etat) if etat else req.where(Projet.etat != Etat.SUPPRIME)
    if miennes and membre:
        req = req.where(Projet.auteur_id == membre.id)
    # Recherche legacy (cht01) : libellé, objet, description — parenthésée (F-S6-28)
    if (cond := recherche(q, Projet.libelle, Projet.objet, Projet.description, Projet.promoteur, Projet.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Projet.date_creation.desc(), Projet.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router_projets.get("/{id_}", response_model=s.ProjetDetail)
def detail_projet(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, Projet, id_, membre, message=PROJET_INTROUVABLE)
    d = s.ProjetDetail.model_validate(fiche)
    d.peut_modifier = peut_modifier(membre, fiche.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    return d


def _valider_projet(db: Db, d: s.ProjetEntree, exclure_id: int | None = None) -> None:
    """Règles legacy d'incl-projet.php (F-S6-29, F-S6-30)."""
    champs: dict[str, str] = {}
    for nom, message in (
        ("responsable", "Veuillez indiquer le responsable du projet."),
        ("promoteur", "Veuillez indiquer le promoteur du projet."),
        ("objet", "Veuillez indiquer l'objet du projet."),
        ("libelle", "Veuillez indiquer le libellé du projet."),
    ):
        if len(_texte(getattr(d, nom))) < 4:
            champs[nom] = message
    if d.duree_mois is None or not 0 <= d.duree_mois <= 120:
        champs["duree_mois"] = "Veuillez indiquer la durée du projet."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Unicité responsable + objet, message corrigé (le legacy affichait « Ce marché est déjà enregistré. »)
    doublon = select(Projet.id).where(
        func.lower(Projet.responsable) == _texte(d.responsable).lower(),
        func.lower(Projet.objet) == _texte(d.objet).lower(),
        Projet.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(Projet.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce projet est déjà enregistré.")


def _appliquer_projet(fiche: Projet, d: s.ProjetEntree) -> None:
    fiche.responsable = _texte(d.responsable)
    fiche.promoteur = _texte(d.promoteur)
    fiche.objet = _texte(d.objet)
    fiche.libelle = _texte(d.libelle)
    fiche.objectif = _texte(d.objectif)
    fiche.description = _texte(d.description)
    fiche.adresse = _texte(d.adresse)
    fiche.duree_mois = d.duree_mois or 0
    fiche.date_lancement = d.date_lancement
    fiche.conditions = _texte(d.conditions)


@router_projets.post("", response_model=Ok, status_code=201)
def creer_projet(donnees: s.ProjetEntree, db: Db, membre: MembreReq):
    _valider_projet(db, donnees)
    fiche = Projet(auteur_id=membre.id, etat=Etat.AUTORISE)
    _appliquer_projet(fiche, donnees)
    fiche.reference = nouvelle_reference(db, Prefixe.PROJET)
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router_projets.put("/{id_}", response_model=Ok)
def modifier_projet(id_: int, donnees: s.ProjetEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Projet, id_, membre, message=PROJET_INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    _valider_projet(db, donnees, exclure_id=fiche.id)
    _appliquer_projet(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router_projets.post("/{id_}/etat", response_model=Ok)
def etat_projet(id_: int, donnees: EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Projet, id_, membre, message=PROJET_INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router_projets.delete("/{id_}", response_model=Ok)
def effacer_projet(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Projet, id_, membre, message=PROJET_INTROUVABLE)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


# Les routes `/marches/projets…` doivent être déclarées avant `/marches/{id_}`
routers = [router_projets, router]
