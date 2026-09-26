"""Espace membre : compteurs de l'en-tête, présence de la frangine, tableau de bord « Mon espace »
(profil, mes fiches par module, mes paiements), identifiant et code de pointage.
Inventaire : F-TRV-25 à F-TRV-30 (profil), E-TRV-05."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, or_, select

from app.deps import Db, MembreReq
from app.enums import CategorieMembre, Etat, EtatCourse, EtatPaiement, TypeMembre
from app.erreurs import erreur
from app.models import (
    AnnonceEmploi,
    AppelFond,
    Article,
    BusinessPlan,
    CollecteFond,
    Conseil,
    ConseilFinance,
    ContentieuxCredit,
    Course,
    DemandeCredit,
    DossierAccompagnement,
    Entreprise,
    FondDeSoutien,
    GroupeLikelemba,
    Immobilier,
    LignePanier,
    Marche,
    Membre,
    MembreLikelemba,
    Message,
    OperationBanque,
    Paiement,
    Partenariat,
    Placement,
    Reussite,
    Soungangai,
    Souscription,
)
from app.schemas import espace as s
from app.schemas.commun import Ok
from app.schemas.membres import MembreMoi
from app.security import hacher_mot_de_passe, verifier_mot_de_passe

router = APIRouter(prefix="/espace", tags=["Espace membre"])

PRESENCE = timedelta(minutes=5)


class Compteurs(BaseModel):
    panier: int
    messages_non_lus: int
    frangine_en_ligne: bool


@router.get("/compteurs", response_model=Compteurs)
def compteurs(membre: MembreReq, db: Db):
    panier = db.scalar(
        select(func.coalesce(func.sum(LignePanier.quantite), 0)).where(
            LignePanier.membre_id == membre.id, LignePanier.paye.is_(False)
        )
    )
    if membre.est_gestionnaire:
        # Messages de membres pas encore lus par la frangine
        non_lus = db.scalar(
            select(func.count()).select_from(Message).where(Message.de_la_frangine.is_(False), Message.lu.is_(False))
        )
    else:
        non_lus = db.scalar(
            select(func.count()).select_from(Message).where(
                Message.membre_id == membre.id, Message.de_la_frangine.is_(True), Message.lu.is_(False)
            )
        )
    en_ligne = db.scalar(
        select(func.count()).select_from(Membre).where(
            Membre.type_compte == TypeMembre.GESTIONNAIRE, Membre.derniere_activite >= datetime.now() - PRESENCE
        )
    )
    return Compteurs(panier=int(panier or 0), messages_non_lus=int(non_lus or 0), frangine_en_ligne=bool(en_ligne))


# --- Tableau de bord « Mon espace » ---------------------------------------------------------------


def _court(texte: str | None, n: int = 70) -> str:
    t = " ".join((texte or "").split())
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


@dataclass(frozen=True)
class Source:
    """Fiches d'un modèle appartenant au membre (`cond(membre_id)` : condition SQL)."""

    modele: Any
    cond: Callable[[int], Any]
    titre: Callable[[Any], str]
    lien: Callable[[Any], str]
    date: str | None = "date_creation"
    statut: Callable[[Any], str] | None = None


@dataclass(frozen=True)
class ModuleMembre:
    cle: str
    libelle: str
    lien_liste: str
    lien_nouveau: str | None
    sources: tuple[Source, ...]


def _auteur(modele, colonne: str = "auteur_id") -> Callable[[int], Any]:
    return lambda mid: getattr(modele, colonne) == mid


MODULES: list[ModuleMembre] = [
    ModuleMembre("emplois", "Emplois", "/emplois", "/emplois/publier", (
        Source(AnnonceEmploi, _auteur(AnnonceEmploi),
               lambda f: f.poste_a_pourvoir or _court(f.competences) or f.reference, lambda f: f"/emplois/{f.id}"),)),
    ModuleMembre("immobilier", "Immobilier", "/immobilier", "/immobilier/publier", (
        Source(Immobilier, _auteur(Immobilier), lambda f: _court(f.description) or f.reference, lambda f: f"/immobilier/{f.id}"),)),
    ModuleMembre("annonces", "Petites annonces", "/annonces", "/annonces/publier", (
        Source(Article, _auteur(Article), lambda f: f.libelle, lambda f: f"/annonces/{f.id}"),)),
    ModuleMembre("courses", "Courses & livraison", "/courses", None, (
        Source(Course, _auteur(Course, "client_id"), lambda f: f"Course {f.reference}" if f.reference else f"Course n° {f.id}",
               lambda f: f"/courses/{f.id}", statut=lambda f: EtatCourse.libelle(f.etat_course)),)),
    ModuleMembre("projets", "Mes appels de fonds", "/projets", "/projets/nouveau", (
        Source(AppelFond, _auteur(AppelFond), lambda f: f.nom_projet, lambda f: f"/projets/{f.id}"),)),
    ModuleMembre("engagements", "Mes engagements de soutien", "/projets", None, (
        Source(CollecteFond, _auteur(CollecteFond, "membre_id"),
               lambda f: f"{f.appel_fond.nom_projet if f.appel_fond else 'Projet'} — {f.montant_promis:,} FCFA".replace(",", " "),
               lambda f: f"/projets/{f.appel_fond_id}", date="date_engagement"),)),
    ModuleMembre("likelemba", "Likelemba", "/likelemba", None, (
        Source(GroupeLikelemba, _auteur(GroupeLikelemba, "responsable_id"),
               lambda f: f"Groupe {f.code} (responsable)", lambda f: f"/likelemba/{f.id}", date="date_debut"),
        Source(MembreLikelemba, _auteur(MembreLikelemba, "membre_id"),
               lambda f: f"Groupe {f.groupe.code if f.groupe else ''} — adhésion {f.code}".strip(),
               lambda f: f"/likelemba/{f.groupe_id}", date="date_entree"),
    )),
    ModuleMembre("epargne", "Épargne solidaire", "/epargne", None, (
        Source(FondDeSoutien, lambda mid: or_(FondDeSoutien.membre_id == mid, FondDeSoutien.souscripteur_id == mid),
               lambda f: f"{f.reference} — {f.montant:,} FCFA".replace(",", " "), lambda f: f"/epargne/dons-placements/{f.id}",
               date="date_souscription"),)),
    ModuleMembre("entreprises", "Mes entreprises", "/entreprises", "/entreprises/nouvelle", (
        Source(Entreprise, _auteur(Entreprise, "membre_id"), lambda f: f.nom, lambda f: f"/entreprises/{f.id}"),)),
    ModuleMembre("marches", "Marchés publiés", "/marches", "/marches/nouveau", (
        Source(Marche, _auteur(Marche), lambda f: _court(f.libelle) or f.numero_appel_offre or f.reference,
               lambda f: f"/marches/{f.id}"),)),
    ModuleMembre("partenariats", "Partenariats & troc", "/partenariats", "/partenariats/nouveau", (
        Source(Partenariat, _auteur(Partenariat), lambda f: _court(f.actif) or _court(f.recherche) or f.reference,
               lambda f: f"/partenariats/{f.id}"),)),
    ModuleMembre("questions", "Mes questions", "/questions", None, (
        Source(Conseil, lambda mid: (Conseil.auteur_id == mid) & Conseil.sujet_id.is_(None),
               lambda f: _court(f.objet) or _court(f.texte), lambda f: f"/questions/{f.id}"),
        Source(ConseilFinance, lambda mid: (ConseilFinance.auteur_id == mid) & ConseilFinance.sujet_id.is_(None),
               lambda f: _court(f.objet) or _court(f.texte), lambda f: f"/conseil-financier/{f.id}"),
    )),
    ModuleMembre("business-plan", "Business plan", "/business-plan", None, (
        Source(BusinessPlan, _auteur(BusinessPlan, "membre_id"), lambda f: _court(f.type_activite) or "Mon business plan",
               lambda f: "/business-plan", statut=lambda f: "Soumis" if f.etat == Etat.AUTORISE else "Brouillon"),)),
    ModuleMembre("decouverte", "Découverte de soi", "/decouverte-de-soi", None, (
        Source(Soungangai, _auteur(Soungangai, "membre_id"), lambda f: f"Ma fiche {f.reference}".strip(),
               lambda f: "/decouverte-de-soi"),)),
    ModuleMembre("distributeur", "Souscription distributeur", "/devenir-distributeur", None, (
        Source(Souscription, _auteur(Souscription, "membre_id"),
               lambda f: f"Souscription {f.reference} — étape {f.etape_courante}".strip(), lambda f: "/devenir-distributeur"),)),
    ModuleMembre("accompagnement", "Dossiers d'accompagnement", "/accompagnement", None, (
        Source(DossierAccompagnement, _auteur(DossierAccompagnement, "membre_id"),
               lambda f: _court(f.objet) or f.reference, lambda f: f"/accompagnement/{f.id}"),)),
    ModuleMembre("tresorerie", "Trésorerie & crédit", "/tresorerie", None, (
        Source(Placement, _auteur(Placement, "membre_id"), lambda f: f"Placement {f.reference}", lambda f: "/tresorerie",
               date="date_placement"),
        Source(OperationBanque, _auteur(OperationBanque, "membre_id"), lambda f: f"Opération bancaire {f.reference}",
               lambda f: "/tresorerie", date="date_saisie"),
        Source(DemandeCredit, _auteur(DemandeCredit, "membre_id"), lambda f: f"Demande de crédit {f.reference}",
               lambda f: "/tresorerie", date="date_demande"),
        Source(ContentieuxCredit, _auteur(ContentieuxCredit, "membre_id"), lambda f: f"Dossier de contentieux {f.reference}",
               lambda f: "/tresorerie", date="date_dossier"),
    )),
    ModuleMembre("reussite", "Mon témoignage de réussite", "/reussites", None, (
        Source(Reussite, _auteur(Reussite, "membre_id"), lambda f: _court(f.projet) or "Mon témoignage",
               lambda f: f"/reussites/{f.id}"),)),
]

_LIBELLES_ETAT = {Etat.NON_TRAITE: "En attente", Etat.AUTORISE: "Publié", Etat.CLOTURE: "Clôturé"}


def _cle_date(d) -> datetime:
    if d is None:
        return datetime.min
    return d if isinstance(d, datetime) else datetime.combine(d, datetime.min.time())


def _module(db: Db, m: ModuleMembre, membre_id: int, n: int = 3) -> s.ModuleEspace:
    total = 0
    fiches: list[s.FicheCourte] = []
    for src in m.sources:
        conds = [src.cond(membre_id), src.modele.etat != Etat.SUPPRIME]
        total += db.scalar(select(func.count()).select_from(src.modele).where(*conds)) or 0
        req = select(src.modele).where(*conds)
        if src.date:
            req = req.order_by(getattr(src.modele, src.date).desc())
        for f in db.scalars(req.order_by(src.modele.id.desc()).limit(n)).all():
            fiches.append(s.FicheCourte(
                id=f.id, titre=src.titre(f) or f"Fiche n° {f.id}", reference=getattr(f, "reference", "") or "",
                etat=f.etat, statut=src.statut(f) if src.statut else _LIBELLES_ETAT.get(f.etat, ""),
                date=getattr(f, src.date) if src.date else None, lien=src.lien(f),
            ))
    fiches.sort(key=lambda x: _cle_date(x.date), reverse=True)
    return s.ModuleEspace(cle=m.cle, libelle=m.libelle, total=total, lien_liste=m.lien_liste,
                          lien_nouveau=m.lien_nouveau, fiches=fiches[:n])


def _champs_manquants(membre: Membre) -> list[str]:
    """Libellés des champs qui manquent au calcul de complétion (`MembreMoi.profil_complet`)."""
    manquants = []
    if not membre.email:
        manquants.append("E-mail")
    if not membre.adresse:
        manquants.append("Adresse")
    if not membre.ville_id:
        manquants.append("Ville")
    if membre.categorie == CategorieMembre.PHYSIQUE:
        if membre.sexe not in (1, 2):
            manquants.append("Sexe")
        if not membre.situation_matrimoniale:
            manquants.append("Situation matrimoniale")
    elif not membre.domaine_activite_id:
        manquants.append("Domaine d'activité")
    if not membre.photo:
        manquants.append("Photo")
    return manquants


@router.get("/tableau", response_model=s.TableauEspace)
def tableau(membre: MembreReq, db: Db):
    """Tableau de bord du membre : complétion du profil, fiches par module (calculées directement
    sur les modèles), derniers paiements, messages non lus."""
    moi = MembreMoi.model_validate(membre)
    profil = s.ProfilResume(
        **moi.model_dump(include={"id", "pseudonyme", "nom", "categorie", "type_compte", "etat", "code_membre",
                                  "photo_url", "profil_complet", "date_creation", "date_limite_master",
                                  "point_caisse_actif", "solde_point_caisse", "date_dernier_pointage"}),
        champs_manquants=_champs_manquants(membre),
        a_code_pointage=bool(membre.code_pointage_hash),
    )
    modules = [x for x in (_module(db, m, membre.id) for m in MODULES) if x.total]
    paiements = db.scalars(
        select(Paiement).where(Paiement.membre_id == membre.id).order_by(Paiement.date_paiement.desc()).limit(5)
    ).all()
    en_attente = db.scalar(select(func.count()).select_from(Paiement).where(
        Paiement.membre_id == membre.id, Paiement.etat == EtatPaiement.NON_CONFIRME)) or 0
    non_lus = db.scalar(select(func.count()).select_from(Message).where(
        Message.membre_id == membre.id, Message.de_la_frangine.is_(True), Message.lu.is_(False))) or 0
    return s.TableauEspace(
        profil=profil, modules=modules, paiements=[s.PaiementCourt.model_validate(p) for p in paiements],
        paiements_en_attente=en_attente, messages_non_lus=non_lus,
    )


# --- Identifiant et code de pointage (F-TRV-26) -----------------------------------------------------------


@router.put("/identifiant", response_model=Ok)
def changer_identifiant(d: s.IdentifiantEntree, membre: MembreReq, db: Db):
    """Le membre change son identifiant de connexion (unicité contrôlée, correctif du legacy qui
    désactivait ce contrôle en modification)."""
    if not verifier_mot_de_passe(d.mot_de_passe, membre.mot_de_passe_hash):
        raise erreur("Mot de passe incorrect.", mot_de_passe="Mot de passe incorrect.")
    pris = db.scalar(select(Membre.id).where(
        func.lower(Membre.identifiant) == d.identifiant.lower(), Membre.id != membre.id).limit(1))
    if pris:
        raise erreur("Cet identifiant est déjà utilisé.", identifiant="Cet identifiant est déjà utilisé.")
    membre.identifiant = d.identifiant
    db.commit()
    return Ok(message="Modification effectuée.", id=membre.id)


@router.put("/code-pointage", response_model=Ok)
def changer_code_pointage(d: s.CodePointageEntree, membre: MembreReq, db: Db):
    """Le titulaire d'une carte de pointage choisit son code à 4 chiffres (stocké haché, ADR-0005 §7)."""
    if not membre.point_caisse_actif:
        raise erreur("Votre compte n'a pas de carte de pointage. Demandez-la à la frangine.")
    if not verifier_mot_de_passe(d.mot_de_passe, membre.mot_de_passe_hash):
        raise erreur("Mot de passe incorrect.", mot_de_passe="Mot de passe incorrect.")
    membre.code_pointage_hash = hacher_mot_de_passe(d.code)
    db.commit()
    return Ok(message="Votre code de pointage est modifié. Ne le communiquez à personne.", id=membre.id)


routers = [router]
