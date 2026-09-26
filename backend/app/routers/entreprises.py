"""Annuaire des entreprises (legacy : choix6.php?rere=1, incl-choix6A.php, incl-entreprise.php).
Inventaire : S6-1, S6-2, F-S6-02 à F-S6-13, F-S6-35. Structure identique au module de référence
Emplois (voir docs/CONVENTIONS.md et docs/modules/entreprises-marches.md)."""

from typing import Annotated, Literal

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import aliased, selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import CategorieMembre, Etat, FormeJuridique
from app.erreurs import erreur
from app.models import (
    DomaineActivite,
    Entreprise,
    FicheProspective,
    LigneProspective,
    ProduitProspective,
    SecteurActivite,
    Ville,
)
from app.schemas import entreprises as s
from app.schemas.commun import Auteur, Liste, Ok
from app.services import fichiers
from app.services.entreprises import entreprises_de
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

router = APIRouter(prefix="/entreprises", tags=["Entreprises"])

AUTEUR = "membre_id"  # l'auteur d'une fiche entreprise est `entreprise.membre_id` (legacy indexmbr)
INTROUVABLE = "Cette entreprise n'existe pas ou n'est plus publiée."


def _chargement():
    return (
        selectinload(Entreprise.domaine).selectinload(DomaineActivite.secteur),
        selectinload(Entreprise.ville),
    )


@router.get("", response_model=Liste[s.EntrepriseResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: Annotated[str | None, Query(max_length=100)] = None,
    secteur_id: int | None = None,
    domaine_id: int | None = None,
    ville_id: int | None = None,
    tri: Literal["secteur", "nom", "recent", "visites"] = "secteur",
    etat: int | None = None,
    miennes: bool = False,
):
    dom = aliased(DomaineActivite)
    sect = aliased(SecteurActivite)
    req = (
        select(Entreprise)
        .outerjoin(dom, Entreprise.domaine_id == dom.id)
        .outerjoin(sect, dom.secteur_id == sect.id)
        .options(*_chargement())
    )
    if (cond := visibilite(Entreprise, membre, AUTEUR)) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(Entreprise.etat == etat) if etat else req.where(Entreprise.etat != Etat.SUPPRIME)
    if miennes and membre:
        req = req.where(Entreprise.membre_id == membre.id)
    # Le secteur est celui du domaine (le legacy ne saisissait jamais `indexsat`)
    if secteur_id:
        req = req.where(dom.secteur_id == secteur_id)
    if domaine_id:
        req = req.where(Entreprise.domaine_id == domaine_id)
    if ville_id:
        req = req.where(Entreprise.ville_id == ville_id)
    # Recherche legacy (cht04) : description ; élargie au nom, au gérant et à la référence
    if (cond := recherche(q, Entreprise.nom, Entreprise.description, Entreprise.gerant, Entreprise.reference)) is not None:
        req = req.where(cond)
    ordre = {
        # Tri legacy : secteur puis nom (F-S6-04) ; les fiches sans domaine en dernier
        "secteur": (sect.libelle.is_(None), sect.libelle, Entreprise.nom),
        "nom": (Entreprise.nom,),
        "recent": (Entreprise.date_creation.desc(), Entreprise.id.desc()),
        "visites": (Entreprise.nombre_visites.desc(), Entreprise.nom),
    }[tri]
    items, total = paginer(db, req.order_by(*ordre, Entreprise.id), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/miennes", response_model=list[s.EntrepriseOption])
def miennes(db: Db, membre: MembreReq):
    """Entreprises du membre connecté (utilisé par d'autres modules pour choisir une entreprise)."""
    return entreprises_de(db, membre)


@router.get("/modele", response_model=s.EntrepriseModele)
def modele(membre: MembreReq):
    """Pré-remplissage du formulaire de création depuis le profil d'une personne morale (F-S6-06)."""
    if membre.categorie != CategorieMembre.MORALE:
        return s.EntrepriseModele()
    return s.EntrepriseModele(
        nom=membre.nom or "",
        domaine_id=membre.domaine_activite_id,
        forme_juridique=membre.forme_juridique if membre.forme_juridique in {f.value for f in FormeJuridique} else None,
        telephone=membre.telephone or "",
        email=membre.email or "",
        adresse=membre.adresse or "",
        ville_id=membre.ville_id,
        personne_morale=True,
    )


def _presence_comparateur(db: Db, entreprise_id: int) -> s.PresenceComparateur:
    rows = db.execute(
        select(LigneProspective.offre_ou_demande, func.count())
        .join(FicheProspective, LigneProspective.fiche_id == FicheProspective.id)
        .join(ProduitProspective, LigneProspective.produit_id == ProduitProspective.id)
        .where(
            FicheProspective.entreprise_id == entreprise_id,
            FicheProspective.etat == Etat.AUTORISE,
            LigneProspective.etat == Etat.AUTORISE,
            ProduitProspective.etat == Etat.AUTORISE,
        )
        .group_by(LigneProspective.offre_ou_demande)
    ).all()
    compte = dict(rows)
    return s.PresenceComparateur(offres=compte.get(1, 0), demandes=compte.get(2, 0))


def _detail(db: Db, fiche: Entreprise, membre) -> s.EntrepriseDetail:
    d = s.EntrepriseDetail.model_validate(fiche)
    d.auteur = Auteur.model_validate(fiche.membre) if fiche.membre else None
    d.comparateur = _presence_comparateur(db, fiche.id)
    d.peut_modifier = peut_modifier(membre, fiche.membre_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    return d


@router.get("/{id_}", response_model=s.EntrepriseDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    fiche = obtenir(db, Entreprise, id_, membre, AUTEUR, message=INTROUVABLE)
    compter_visite(fiche, membre, AUTEUR)  # F-S6-13 : tiers seulement (corrigé)
    db.commit()
    return _detail(db, fiche, membre)


def _nettoyer(texte: str) -> str:
    return " ".join((texte or "").split())


def _valider(db: Db, d: s.EntrepriseEntree, exclure_id: int | None = None) -> None:
    """Règles legacy d'incl-entreprise.php, appliquées côté serveur (F-S6-07, F-S6-08)."""
    champs: dict[str, str] = {}
    if not d.domaine_id or db.get(DomaineActivite, d.domaine_id) is None:
        champs["domaine_id"] = "Veuillez indiquer le domaine d'activité."
    # Règle réelle du legacy : plus de 3 caractères (message « plus de 2 » corrigé)
    if len(_nettoyer(d.nom)) < 4:
        champs["nom"] = "Le nom de l'entreprise doit avoir au moins 4 caractères."
    if d.forme_juridique not in {f.value for f in FormeJuridique}:
        champs["forme_juridique"] = "Veuillez indiquer la forme juridique de l'entreprise."
    if not d.ville_id or db.get(Ville, d.ville_id) is None:
        champs["ville_id"] = "Veuillez indiquer la ville où est située l'entreprise."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Unicité nom + domaine (le legacy testait secteur + nom, avec un secteur jamais saisi)
    doublon = select(Entreprise.id).where(
        func.lower(Entreprise.nom) == _nettoyer(d.nom).lower(),
        Entreprise.domaine_id == d.domaine_id,
        Entreprise.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(Entreprise.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette entreprise est déjà enregistrée.", nom="Une entreprise porte déjà ce nom dans ce domaine.")


def _appliquer(db: Db, fiche: Entreprise, d: s.EntrepriseEntree) -> None:
    domaine = db.get(DomaineActivite, d.domaine_id)
    fiche.domaine_id = d.domaine_id
    fiche.secteur_id = domaine.secteur_id if domaine else None  # secteur déduit du domaine (ADR-0007)
    fiche.nom = _nettoyer(d.nom)
    fiche.forme_juridique = d.forme_juridique or 0
    fiche.capital_social = d.capital_social
    fiche.description = d.description.strip()
    fiche.gerant = _nettoyer(d.gerant)
    fiche.telephone = d.telephone
    fiche.email = d.email or ""
    fiche.site_web = d.site_web
    fiche.adresse = _nettoyer(d.adresse)
    fiche.ville_id = d.ville_id


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.EntrepriseEntree, db: Db, membre: MembreReq):
    """Création par tout membre connecté, gestionnaire compris (F-S6-05) ; publiée immédiatement
    comme dans le legacy (état Autorisé), la modération peut la retirer."""
    _valider(db, donnees)
    fiche = Entreprise(membre_id=membre.id, etat=Etat.AUTORISE)
    _appliquer(db, fiche, donnees)
    fiche.reference = nouvelle_reference(db, Prefixe.ENTREPRISE)
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.EntrepriseEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Entreprise, id_, membre, AUTEUR, message=INTROUVABLE)
    verifier_modification(membre, fiche.membre_id)
    _valider(db, donnees, exclure_id=fiche.id)
    _appliquer(db, fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/logo", response_model=Ok)
async def logo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    """Logo ou photo de l'entreprise (F-S6-12 : type contrôlé, redimensionnement proportionnel)."""
    fiche = obtenir(db, Entreprise, id_, membre, AUTEUR, message=INTROUVABLE)
    verifier_modification(membre, fiche.membre_id)
    ancien = fiche.logo
    fiche.logo = await fichiers.enregistrer(fichier, "entreprises", {fichiers.IMAGE}, champ="logo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Logo enregistré.", id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Entreprise, id_, membre, AUTEUR, message=INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Entreprise, id_, membre, AUTEUR, message=INTROUVABLE)
    supprimer(fiche, membre, AUTEUR)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


routers = [router]
