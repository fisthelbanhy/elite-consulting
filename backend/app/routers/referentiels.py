"""Référentiels publics, paramètres du site, statistiques d'accueil, journal des visites."""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt
from app.enums import ENUMS, NIVEAUX_DIPLOME, Etat
from app.models import (
    AnnonceEmploi,
    AppelFond,
    Article,
    Banque,
    Diplome,
    Entreprise,
    FamilleArticle,
    GroupeLikelemba,
    Immobilier,
    Membre,
    Parametre,
    Partenariat,
    Produit,
    Reussite,
    SecteurActivite,
    Ville,
    Visite,
)
from app.schemas.commun import Ok, Schema

router = APIRouter(prefix="/referentiels", tags=["Référentiels"])


class QuartierOut(Schema):
    id: int
    nom: str


class VilleOut(Schema):
    id: int
    nom: str
    quartiers: list[QuartierOut]


class DomaineOut(Schema):
    id: int
    libelle: str


class SecteurOut(Schema):
    id: int
    libelle: str
    domaines: list[DomaineOut]


class LibelleOut(Schema):
    id: int
    libelle: str


class BanqueOut(Schema):
    id: int
    sigle: str
    nom: str
    telephones: str
    adresse: str
    email: str
    site_web: str


class ParametresPublics(Schema):
    nom_site: str
    adresse: str
    telephone_1: str
    telephone_2: str
    email: str
    whatsapp: str
    texte_aide: str
    montant_minimum_placement: int
    montant_minimum_course: int
    commission_course: int
    conditions_course: str
    description_section_1: str
    description_section_2: str
    description_section_3: str
    description_section_4: str
    description_section_5: str
    description_section_6: str
    description_section_7: str
    module_epargne_actif: bool
    module_sante_actif: bool


@router.get("/enums")
def enumerations() -> dict[str, list[dict]]:
    data = {nom: cls.options() for nom, cls in ENUMS.items()}
    data["NiveauDiplome"] = [{"value": i, "label": lib} for i, lib in enumerate(NIVEAUX_DIPLOME)]
    return data


@router.get("/villes", response_model=list[VilleOut])
def villes(db: Db):
    return db.scalars(select(Ville).options(selectinload(Ville.quartiers)).order_by(Ville.nom)).all()


@router.get("/secteurs", response_model=list[SecteurOut])
def secteurs(db: Db):
    rows = db.scalars(
        select(SecteurActivite)
        .where(SecteurActivite.etat != Etat.SUPPRIME)
        .options(selectinload(SecteurActivite.domaines))
        .order_by(SecteurActivite.libelle)
    ).all()
    for sa in rows:
        sa.domaines = [d for d in sa.domaines if d.etat != Etat.SUPPRIME]  # type: ignore[misc]
    return rows


@router.get("/diplomes", response_model=list[LibelleOut])
def diplomes(db: Db):
    return db.scalars(select(Diplome).order_by(Diplome.libelle)).all()


@router.get("/familles-articles", response_model=list[LibelleOut])
def familles_articles(db: Db):
    return db.scalars(select(FamilleArticle).order_by(FamilleArticle.libelle)).all()


@router.get("/banques", response_model=list[BanqueOut])
def banques(db: Db):
    return db.scalars(select(Banque).where(Banque.etat == Etat.AUTORISE).order_by(Banque.nom)).all()


@router.get("/parametres", response_model=ParametresPublics)
def parametres(db: Db):
    return db.get(Parametre, 1) or Parametre(id=1)


class StatsAccueil(BaseModel):
    membres: int
    offres_emploi: int
    demandes_emploi: int
    annonces_immobilier: int
    annonces_articles: int
    projets_financement: int
    montant_promis: int
    montant_collecte: int
    groupes_likelemba: int
    entreprises: int
    partenariats: int
    produits: int
    reussites: int
    annee_creation: int = 2016


@router.get("/stats", response_model=StatsAccueil)
def stats(db: Db):
    """Chiffres de preuve sociale affichés sur l'accueil et compteurs des onglets."""

    def compter(modele, *conds) -> int:
        return db.scalar(select(func.count()).select_from(modele).where(*conds)) or 0

    publie = Etat.AUTORISE
    fonds = db.execute(
        select(func.coalesce(func.sum(AppelFond.montant_promis), 0), func.coalesce(func.sum(AppelFond.montant_collecte), 0))
        .where(AppelFond.etat == publie)
    ).one()
    return StatsAccueil(
        membres=compter(Membre, Membre.etat != Etat.SUPPRIME),
        offres_emploi=compter(AnnonceEmploi, AnnonceEmploi.type_annonce == 2, AnnonceEmploi.etat == publie),
        demandes_emploi=compter(AnnonceEmploi, AnnonceEmploi.type_annonce == 1, AnnonceEmploi.etat == publie),
        annonces_immobilier=compter(Immobilier, Immobilier.etat == publie),
        annonces_articles=compter(Article, Article.etat == publie),
        projets_financement=compter(AppelFond, AppelFond.etat == publie),
        montant_promis=int(fonds[0]),
        montant_collecte=int(fonds[1]),
        groupes_likelemba=compter(GroupeLikelemba, GroupeLikelemba.etat == publie),
        entreprises=compter(Entreprise, Entreprise.etat == publie),
        partenariats=compter(Partenariat, Partenariat.etat == publie),
        produits=compter(Produit, Produit.etat == publie),
        reussites=compter(Reussite, Reussite.etat == publie),
    )


class ALaUne(BaseModel):
    type: str
    titre: str
    detail: str
    href: str
    date: datetime | None


@router.get("/a-la-une", response_model=list[ALaUne])
def a_la_une(db: Db, limite: int = 6):
    """« Opportunités du moment » de l'accueil : dernières fiches publiées, toutes sections."""
    from app.enums import TypeAnnonceRH
    from app.models import Marche

    publie = Etat.AUTORISE
    items: list[ALaUne] = []
    for m in db.scalars(select(Marche).where(Marche.etat == publie).order_by(Marche.date_creation.desc()).limit(limite)):
        items.append(ALaUne(type="Marché", titre=m.libelle or m.numero_appel_offre, detail=m.maitre_ouvrage or m.publie_par,
                            href=f"/marches/{m.id}", date=m.date_creation))
    for a in db.scalars(select(AnnonceEmploi).where(AnnonceEmploi.etat == publie)
                        .order_by(AnnonceEmploi.date_creation.desc()).limit(limite)):
        offre = a.type_annonce == TypeAnnonceRH.OFFRE
        items.append(ALaUne(type="Offre d'emploi" if offre else "Profil disponible",
                            titre=(a.poste_a_pourvoir if offre else a.competences) or a.reference,
                            detail=a.domaine.libelle if a.domaine else "", href=f"/emplois/{a.id}", date=a.date_creation))
    for p in db.scalars(select(AppelFond).where(AppelFond.etat == publie).order_by(AppelFond.date_creation.desc()).limit(limite)):
        items.append(ALaUne(type="Projet à soutenir", titre=p.nom_projet, detail=p.objet_projet[:120], href=f"/projets/{p.id}",
                            date=p.date_creation))
    for i in db.scalars(select(Immobilier).where(Immobilier.etat == publie).order_by(Immobilier.date_creation.desc()).limit(limite)):
        items.append(ALaUne(type="Immobilier", titre=i.description[:80] or i.reference, detail=i.localisation,
                            href=f"/immobilier/{i.id}", date=i.date_creation))
    for ar in db.scalars(select(Article).where(Article.etat == publie).order_by(Article.date_creation.desc()).limit(limite)):
        items.append(ALaUne(type="Annonce", titre=ar.libelle, detail=ar.description[:80], href=f"/annonces/{ar.id}",
                            date=ar.date_creation))
    items.sort(key=lambda x: x.date or datetime.min, reverse=True)
    return items[:limite]


visites = APIRouter(prefix="/visites", tags=["Référentiels"])


@visites.post("", response_model=Ok)
def journaliser_visite(
    request: Request, db: Db, membre: MembreOpt, x_client_ip: Annotated[str | None, Header()] = None
):
    """Legacy `choix0.php` : une ligne par adresse IP et par tranche de 30 minutes."""
    ip = (x_client_ip or (request.client.host if request.client else ""))[:64]
    derniere = db.scalar(select(func.max(Visite.date_heure)).where(Visite.adresse_ip == ip))
    if derniere is None or derniere < datetime.now() - timedelta(minutes=30):
        db.add(Visite(adresse_ip=ip, membre_id=membre.id if membre else None))
        db.commit()
    return Ok(message="ok")
