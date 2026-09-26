"""Réussites entrepreneuriales (legacy incl-reussite.php et incl-choix6B-Reussite.php, table
`reussite`). Module mort dans le legacy, **conservé et mis en avant** (ADR-0007 S6b) : les
témoignages validés sont la preuve sociale de l'accueil et de la page « Se lancer ».

- Une seule fiche par membre (ADR-0004), référence RST… ;
- publiée seulement après validation d'un gestionnaire habilité (état 1 → 2) ; une
  modification par l'auteur d'une fiche publiée la renvoie en relecture ;
- la liste publique ne montre que les fiches publiées (même pour un gestionnaire, sauf filtre
  `etat` explicite) : l'accueil appelle `GET /reussites?taille=3`.
"""

from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Etat
from app.erreurs import erreur
from app.models import Membre, Message, Reussite, SecteurActivite
from app.schemas import reussites as s
from app.schemas.commun import Liste, Ok
from app.services import fichiers
from app.services.fiches import changer_etat, obtenir, paginer, recherche, supprimer
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/reussites", tags=["Réussites"])

AUTEUR = "membre_id"
INTROUVABLE = "Cette réussite n'existe pas ou n'est pas encore publiée."


def _resume_dict(r: Reussite) -> dict:
    m = r.membre
    return {
        "id": r.id, "reference": r.reference, "projet": r.projet, "succes": r.succes, "conseil": r.conseil,
        "situation_avant": r.situation_avant, "secteur": r.secteur.libelle if r.secteur else None,
        "secteur_id": r.secteur_id, "photo_url": fichiers.url(r.photo), "etat": r.etat,
        "date_creation": r.date_creation,
        # Portrait : la photo du témoignage, à défaut celle du profil
        "auteur": s.AuteurReussite(
            id=m.id, pseudonyme=m.pseudonyme or "Membre", photo_url=fichiers.url(r.photo) or fichiers.url(m.photo)
        ),
    }


def _detail(r: Reussite, membre: Membre | None) -> s.ReussiteDetail:
    return s.ReussiteDetail(
        **_resume_dict(r), vision=r.vision, fond_demarrage=r.fond_demarrage or 0,
        besoin_reel_demarrage=r.besoin_reel_demarrage or 0, strategie=r.strategie, difficultes=r.difficultes,
        deploiement_efforts=r.deploiement_efforts,
        est_auteur=membre is not None and membre.id == r.membre_id,
        peut_modifier=peut_modifier(membre, r.membre_id) and r.etat != Etat.SUPPRIME,
        peut_moderer=membre is not None and membre.peut_moderer(),
    )


def _ecrire_a_la_frangine(db: Db, membre: Membre, texte: str) -> None:
    db.add(Message(membre_id=membre.id, auteur_id=membre.id, de_la_frangine=False, texte=texte))


# --- Lecture ----------------------------------------------------------------------------------


@router.get("", response_model=Liste[s.ReussiteResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: str | None = None,
    secteur_id: int | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
):
    """Réussites publiées, les plus récentes d'abord ; recherche dans le projet ou le pseudonyme
    (legacy : projet ou nom), filtre par secteur. Filtre `etat` réservé aux gestionnaires."""
    req = (
        select(Reussite)
        .join(Membre, Reussite.membre_id == Membre.id)
        .options(selectinload(Reussite.membre), selectinload(Reussite.secteur))
    )
    if membre is not None and membre.est_gestionnaire and etat:
        req = req.where(Reussite.etat == etat)
    else:
        req = req.where(Reussite.etat == Etat.AUTORISE, Membre.etat != Etat.SUPPRIME)
    if secteur_id:
        req = req.where(Reussite.secteur_id == secteur_id)
    if (cond := recherche(q, Reussite.projet, Membre.pseudonyme)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Reussite.date_creation.desc(), Reussite.id.desc()), page)
    return Liste(
        items=[s.ReussiteResume(**_resume_dict(r)) for r in items], total=total, page=page.page, taille=page.taille
    )


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db, membre: MembreOpt):
    def n(e: int) -> int:
        return db.scalar(select(func.count()).select_from(Reussite).where(Reussite.etat == e)) or 0

    gestion = membre is not None and membre.est_gestionnaire
    return s.Compteurs(publiees=n(Etat.AUTORISE), a_valider=n(Etat.NON_TRAITE) if gestion else 0)


@router.get("/moi", response_model=s.ReussiteDetail | None)
def ma_fiche(db: Db, membre: MembreReq):
    r = db.scalar(select(Reussite).where(Reussite.membre_id == membre.id))
    if r is None or r.etat == Etat.SUPPRIME:
        return None
    return _detail(r, membre)


@router.get("/{id_}", response_model=s.ReussiteDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    return _detail(obtenir(db, Reussite, id_, membre, colonne_auteur=AUTEUR, message=INTROUVABLE), membre)


# --- Écriture ---------------------------------------------------------------------------------


def _valider(db: Db, d: s.ReussiteEntree) -> None:
    """Règles legacy (incl-reussite.php)."""
    champs: dict[str, str] = {}
    if not d.secteur_id or db.get(SecteurActivite, d.secteur_id) is None:
        champs["secteur_id"] = "Veuillez indiquer le secteur d'activité."
    if len(d.projet.strip()) < 10:
        champs["projet"] = "Veuillez décrire votre projet avec 10 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)


def _appliquer(r: Reussite, d: s.ReussiteEntree) -> None:
    for champ, v in d.model_dump().items():
        setattr(r, champ, v.strip() if isinstance(v, str) else v)


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.ReussiteEntree, db: Db, membre: MembreReq):
    existante = db.scalar(select(Reussite).where(Reussite.membre_id == membre.id))
    if existante is not None and existante.etat != Etat.SUPPRIME:
        raise erreur("Cette fiche de réussite du membre est déjà enregistrée.")
    _valider(db, donnees)
    if existante is None:
        r = Reussite(membre_id=membre.id, reference=nouvelle_reference(db, Prefixe.REUSSITE))
        db.add(r)
    else:  # une fiche supprimée est reprise : une seule fiche par membre
        r = existante
        r.photo = None
    r.etat = Etat.NON_TRAITE  # publiée après relecture
    _appliquer(r, donnees)
    db.flush()
    _ecrire_a_la_frangine(
        db, membre, f"J'ai partagé mon histoire de réussite ({r.reference}) : merci de la relire pour la publier. "
                    f"/reussites/{r.id}",
    )
    db.commit()
    return Ok(
        message="Merci ! Votre témoignage est enregistré : il sera publié après relecture par la frangine.",
        id=r.id, reference=r.reference,
    )


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.ReussiteEntree, db: Db, membre: MembreReq):
    r = obtenir(db, Reussite, id_, membre, colonne_auteur=AUTEUR, message=INTROUVABLE)
    verifier_modification(membre, r.membre_id)
    _valider(db, donnees)
    _appliquer(r, donnees)
    message = "Modification effectuée."
    if membre.id == r.membre_id and not membre.peut_moderer() and r.etat == Etat.AUTORISE:
        r.etat = Etat.NON_TRAITE
        message = "Modification effectuée. Votre témoignage sera de nouveau publié après relecture."
        _ecrire_a_la_frangine(db, membre, f"J'ai modifié mon histoire de réussite ({r.reference}) : /reussites/{r.id}")
    db.commit()
    return Ok(message=message, id=r.id, reference=r.reference)


@router.post("/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    r = obtenir(db, Reussite, id_, membre, colonne_auteur=AUTEUR, message=INTROUVABLE)
    verifier_modification(membre, r.membre_id)
    ancien = r.photo
    r.photo = await fichiers.enregistrer(fichier, "reussite", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=r.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """Validation (1 → 2) ou retrait par un gestionnaire habilité ; l'auteur est prévenu."""
    r = obtenir(db, Reussite, id_, membre, colonne_auteur=AUTEUR, message=INTROUVABLE)
    avant = r.etat
    changer_etat(r, donnees.etat, membre)
    if avant != Etat.AUTORISE and r.etat == Etat.AUTORISE:
        db.add(Message(
            membre_id=r.membre_id, auteur_id=membre.id, de_la_frangine=True,
            texte="Félicitations : votre histoire de réussite est publiée ! "
                  f"Partagez-la autour de vous : /reussites/{r.id}",
        ))
    db.commit()
    return Ok(message="Modification effectuée.", id=r.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    r = obtenir(db, Reussite, id_, membre, colonne_auteur=AUTEUR, message=INTROUVABLE)
    supprimer(r, membre, colonne_auteur=AUTEUR)
    db.commit()
    return Ok(message="Fiche supprimée.", id=r.id)


routers = [router]
