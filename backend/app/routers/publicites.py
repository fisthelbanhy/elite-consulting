"""Publicités : diffusion publique et gestion (legacy : incl-publicite.php, incl-affichpub.php,
ppublicite.php). Inventaire : E-TRV-09, E-ADM-14, F-TRV-43 à F-TRV-47, F-ADM-34 à F-ADM-38."""

import re
from datetime import date
from typing import Annotated

from fastapi import APIRouter, File, Header, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreOpt, MembreReq, Page, exiger_droit
from app.enums import Etat, TypeFichierPub
from app.erreurs import ErreurMetier, erreur, introuvable
from app.models import Entreprise, Membre, Publicite
from app.schemas import publicites as s
from app.schemas.commun import Liste, Ok, Option
from app.services import fichiers
from app.services import publicites as svc
from app.services.fiches import changer_etat, paginer, recherche
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/publicites", tags=["Publicités"])

LIEN_VALIDE = re.compile(r"^(https?://[^\s<>\"']+\.[^\s<>\"']+|/[^\s<>\"']*)$", re.I)


# --- Diffusion publique ----------------------------------------------------------------------------


@router.get("/diffusion", response_model=list[s.PubliciteDiffusee])
def diffusion(db: Db, limite: Annotated[int, Query(ge=1, le=50)] = 10, exclure: int | None = None):
    """Encart publicitaire : au plus 10 publicités actives de la période, ordre aléatoire (F-TRV-04).
    La page « annonceurs » demande davantage (`limite` ≤ 50). Ne compte pas de vue."""
    return db.scalars(svc.requete_diffusion(limite, exclure)).all()


# --- Gestion (gestionnaires ; un membre demandeur voit ses propres publicités) ---------------------


@router.get("", response_model=Liste[s.PubliciteGestion])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    q: str | None = None,
    demandeur_id: int | None = None,
    entreprise_id: int | None = None,
    debut_du: date | None = None,
    debut_au: date | None = None,
    fin_du: date | None = None,
    fin_au: date | None = None,
    vues_min: int | None = None,
    vues_max: int | None = None,
    etat: int | None = None,
    en_diffusion: bool = False,
):
    """Filtres de F-ADM-37 (les filtres de date, cassés dans le legacy, fonctionnent)."""
    req = select(Publicite).options(selectinload(Publicite.demandeur), selectinload(Publicite.entreprise))
    if membre.est_gestionnaire:
        if demandeur_id:
            req = req.where(Publicite.demandeur_id == demandeur_id)
        req = req.where(Publicite.etat == etat) if etat else req.where(Publicite.etat != Etat.SUPPRIME)
    else:
        req = req.where(Publicite.demandeur_id == membre.id, Publicite.etat != Etat.SUPPRIME)
    if entreprise_id:
        req = req.where(Publicite.entreprise_id == entreprise_id)
    for colonne, borne, operateur in (
        (Publicite.date_debut, debut_du, "ge"), (Publicite.date_debut, debut_au, "le"),
        (Publicite.date_fin, fin_du, "ge"), (Publicite.date_fin, fin_au, "le"),
        (Publicite.nombre_vues, vues_min, "ge"), (Publicite.nombre_vues, vues_max, "le"),
    ):
        if borne is not None:
            req = req.where(colonne >= borne if operateur == "ge" else colonne <= borne)
    if en_diffusion:
        jour = date.today()
        req = req.where(Publicite.etat == Etat.AUTORISE, Publicite.date_debut <= jour, Publicite.date_fin >= jour)
    if (cond := recherche(q, Publicite.texte, Publicite.reference, Publicite.objet)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Publicite.date_creation.desc(), Publicite.id.desc()), page)
    sortie = []
    for p in items:
        g = s.PubliciteGestion.model_validate(p)
        g.en_diffusion = svc.en_diffusion(p)
        sortie.append(g)
    return Liste(items=sortie, total=total, page=page.page, taille=page.taille)


@router.get("/choix", response_model=s.ChoixPublicite)
def choix(db: Db, membre: Gestionnaire):
    """Listes du formulaire de gestion : demandeurs (gestionnaires et membres) et entreprises."""
    membres = db.execute(
        select(Membre.id, Membre.nom, Membre.pseudonyme).where(Membre.etat != Etat.SUPPRIME).order_by(Membre.nom)
    )
    entreprises = db.execute(select(Entreprise.id, Entreprise.nom).where(Entreprise.etat != Etat.SUPPRIME).order_by(Entreprise.nom))
    return s.ChoixPublicite(
        membres=[Option(value=i, label=f"{n} ({p})" if p and p != n else n) for i, n, p in membres],
        entreprises=[Option(value=i, label=svc.texte_brut(n)) for i, n in entreprises],
    )


# --- Détail ----------------------------------------------------------------------------------------


@router.get("/{id_}", response_model=s.PubliciteDetail)
def detail(id_: int, db: Db, membre: MembreOpt, user_agent: Annotated[str | None, Header()] = None):
    """Publicité en grand. Le public ne voit que les publicités en diffusion ; chaque affichage par
    un tiers incrémente le nombre de vues et la date de dernière vue (F-TRV-46)."""
    pub = db.get(Publicite, id_)
    if pub is None:
        raise introuvable("Cette publicité n'existe pas.")
    gestion = membre is not None and membre.est_gestionnaire
    demandeur = membre is not None and membre.id == pub.demandeur_id
    diffusee = svc.en_diffusion(pub)
    tiers = not (gestion or demandeur)
    if tiers and not diffusee:
        raise introuvable("Cette publicité n'est plus diffusée.")
    if tiers and not svc.est_robot(user_agent):
        svc.compter_vue(pub)
        db.commit()
    d = s.PubliciteDetail.model_validate(pub)
    d.en_diffusion = diffusee
    if tiers:
        d.nombre_vues = d.date_derniere_vue = d.demandeur = None
    d.peut_gerer = gestion
    d.peut_moderer = membre is not None and membre.peut_moderer()
    return d


# --- Écritures (gestionnaires) -----------------------------------------------------------------------


def _valider(db: Db, d: s.PubliciteEntree, exclure_id: int | None = None) -> None:
    """Règles de ppublicite.php, plus le contrôle de l'ordre des dates (correctif F-ADM-36)."""
    champs: dict[str, str] = {}
    if not d.demandeur_id or db.get(Membre, d.demandeur_id) is None:
        champs["demandeur_id"] = "Veuillez indiquer le demandeur (gestionnaire ou membre)."
    if not d.entreprise_id or db.get(Entreprise, d.entreprise_id) is None:
        champs["entreprise_id"] = "Veuillez indiquer l'entreprise."
    if len(d.texte.strip()) < 6:
        champs["texte"] = "Le texte doit contenir au moins 6 caractères."
    if d.date_debut is None:
        champs["date_debut"] = "Veuillez indiquer la date de début de diffusion."
    if d.date_fin is None:
        champs["date_fin"] = "Veuillez indiquer la date de fin de diffusion."
    elif d.date_debut is not None and d.date_fin < d.date_debut:
        champs["date_fin"] = "La date de fin ne peut pas précéder la date de début."
    if d.type_fichier not in {t.value for t in TypeFichierPub}:
        champs["type_fichier"] = "Veuillez indiquer le format du fichier de la publicité."
    lien = d.lien.strip()
    if lien and not LIEN_VALIDE.match(lien):
        champs["lien"] = "Le lien doit commencer par https:// (ex. https://www.monentreprise.cg)."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(Publicite.id).where(Publicite.texte == d.texte.strip(), Publicite.etat != Etat.SUPPRIME)
    if exclure_id:
        doublon = doublon.where(Publicite.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cette publicité est déjà enregistrée.", texte="Une autre publicité a exactement ce texte.")


def _appliquer(pub: Publicite, d: s.PubliciteEntree) -> None:
    pub.demandeur_id = d.demandeur_id
    pub.entreprise_id = d.entreprise_id
    pub.texte = d.texte.strip()
    pub.lien = d.lien.strip()
    pub.date_debut = d.date_debut
    pub.date_fin = d.date_fin
    pub.type_fichier = int(d.type_fichier or 0)


def _obtenir(db: Db, id_: int) -> Publicite:
    pub = db.get(Publicite, id_)
    if pub is None:
        raise introuvable("Cette publicité n'existe pas.")
    return pub


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.PubliciteEntree, db: Db, membre: Gestionnaire):
    """F-ADM-34/35 : référence PUB…, état initial « Non traité » sauf si le créateur a le droit
    Activation et choisit un autre état."""
    _valider(db, donnees)
    pub = Publicite(etat=Etat.NON_TRAITE)
    _appliquer(pub, donnees)
    if membre.peut_moderer() and donnees.etat:
        pub.etat = donnees.etat
    pub.reference = nouvelle_reference(db, Prefixe.PUBLICITE)
    db.add(pub)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=pub.id, reference=pub.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.PubliciteEntree, db: Db, membre: Gestionnaire):
    pub = _obtenir(db, id_)
    _valider(db, donnees, exclure_id=pub.id)
    _appliquer(pub, donnees)
    if membre.peut_moderer() and donnees.etat:
        pub.etat = donnees.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=pub.id, reference=pub.reference)


@router.post("/{id_}/fichier", response_model=Ok)
async def fichier(id_: int, db: Db, membre: Gestionnaire, fichier: UploadFile = File(...)):
    """Le fichier doit correspondre au type déclaré (image, son MP3 ou vidéo MP4)."""
    pub = _obtenir(db, id_)
    attendu = svc.GENRE_ATTENDU.get(pub.type_fichier)
    if attendu is None:
        raise erreur("Veuillez d'abord indiquer le format de la publicité.", fichier="Format de la publicité non indiqué.")
    try:
        chemin = await fichiers.enregistrer(fichier, "publicites", {attendu}, champ="fichier")
    except ErreurMetier as exc:
        if exc.message == "Type de fichier non accepté.":
            libelle = TypeFichierPub(pub.type_fichier).label
            raise erreur(
                f"Le fichier ne correspond pas au format choisi ({libelle}).",
                fichier=f"Joignez {svc.FORMATS[attendu]}.",
            ) from exc
        raise
    ancien = pub.fichier
    pub.fichier = chemin
    db.commit()
    if ancien != chemin:
        fichiers.supprimer(ancien)
    return Ok(message="Fichier enregistré.", id=pub.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatPublicite, db: Db, membre: MembreReq):
    pub = _obtenir(db, id_)
    changer_etat(pub, donnees.etat, membre)  # gestionnaire + droit Activation
    db.commit()
    return Ok(message="Modification effectuée.", id=pub.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    """Suppression logique (état 3), réservée au droit Activation. Le fichier est conservé."""
    pub = _obtenir(db, id_)
    exiger_droit(membre, "activation")
    pub.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Publicité supprimée.", id=pub.id)


routers = [router]
