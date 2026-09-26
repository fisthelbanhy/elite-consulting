"""Forum « Questions & conseils » (legacy « Informations utiles » : incl-choix1A.php,
incl-conseil.php, table `conseil`). Inventaire : E-S1-01 à E-S1-03, F-S1-01 à F-S1-16.

Un sujet est une ligne `conseil` sans `sujet_id` ; ses réponses (« commentaires » du legacy)
pointent vers lui par `sujet_id` et gardent sa référence.

Règle ADR-0007 S1a : un sujet **privé** (échange membre ↔ la frangine) n'est visible, texte
compris, que de son auteur et des gestionnaires. L'identité publique est le pseudonyme ; le nom
réel n'est montré qu'au gestionnaire, à l'auteur et au Master pour un sujet public (F-S1-05).
"""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Confidentialite, Etat, TypeMembre
from app.erreurs import erreur, introuvable
from app.models import Conseil, Membre, Message
from app.schemas import questions as s
from app.schemas.commun import Auteur, Liste, Ok
from app.services.fiches import changer_etat, paginer, recherche, supprimer
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/questions", tags=["Questions & conseils"])

# Un sujet clôturé reste lisible (le legacy listait les états 1, 2 et 4) mais n'accepte plus de réponse
LISIBLES = (Etat.AUTORISE, Etat.CLOTURE)
INTROUVABLE = "Ce sujet n'existe pas ou n'est plus publié."


# --- Visibilité -------------------------------------------------------------------------------


def _condition_visible(membre: Membre | None):
    """Filtre SQL des lignes (sujets ou réponses) lisibles par ce lecteur, ou None (tout)."""
    if membre is not None and membre.est_gestionnaire:
        return None
    public = and_(Conseil.etat.in_(LISIBLES), Conseil.confidentialite == Confidentialite.PUBLIC)
    if membre is None:
        return public
    return or_(public, and_(Conseil.auteur_id == membre.id, Conseil.etat != Etat.SUPPRIME))


def _est_visible(c: Conseil, membre: Membre | None) -> bool:
    if membre is not None and membre.est_gestionnaire:
        return True
    if c.etat in LISIBLES and c.confidentialite == Confidentialite.PUBLIC:
        return True
    return membre is not None and c.auteur_id == membre.id and c.etat != Etat.SUPPRIME


def _reponse_visible(r: Conseil, membre: Membre | None) -> bool:
    """Le sujet étant déjà lisible, une réponse l'est si elle est publiée (ou si c'est la sienne)."""
    if r.etat == Etat.SUPPRIME:
        return False
    if membre is not None and (membre.est_gestionnaire or r.auteur_id == membre.id):
        return True
    return r.etat in LISIBLES


def _sujet(db: Db, id_: int, membre: Membre | None) -> Conseil:
    sujet = db.get(Conseil, id_)
    if sujet is None or sujet.sujet_id is not None or not _est_visible(sujet, membre):
        raise introuvable(INTROUVABLE)
    return sujet


def _reponse(db: Db, id_: int, membre: Membre) -> Conseil:
    rep = db.get(Conseil, id_)
    if rep is None or rep.sujet_id is None or not _reponse_visible(rep, membre):
        raise introuvable("Cette réponse n'existe pas ou a été supprimée.")
    return rep


def _nom_visible(c: Conseil, membre: Membre | None) -> bool:
    if membre is None or c.auteur is None:
        return False
    return (
        membre.est_gestionnaire
        or membre.id == c.auteur_id
        or (membre.type_compte == TypeMembre.MASTER and c.confidentialite == Confidentialite.PUBLIC)
    )


# --- Sérialisation ----------------------------------------------------------------------------


def _extrait(texte: str, n: int = 280) -> str:
    t = " ".join((texte or "").split())
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def _resume(c: Conseil, membre: Membre | None) -> s.SujetResume:
    return s.SujetResume(
        id=c.id, reference=c.reference, objet=c.objet, extrait=_extrait(c.texte),
        confidentialite=c.confidentialite, etat=c.etat, nombre_reponses=c.nombre_reponses or 0,
        date_creation=c.date_creation, auteur=Auteur.model_validate(c.auteur) if c.auteur else None,
        auteur_nom=c.auteur.nom if _nom_visible(c, membre) else None,
    )


def _detail(sujet: Conseil, membre: Membre | None) -> s.SujetDetail:
    base = _resume(sujet, membre).model_dump()
    reponses = [
        s.ReponseOut(
            id=r.id, texte=r.texte, etat=r.etat, date_creation=r.date_creation,
            auteur=Auteur.model_validate(r.auteur) if r.auteur else None,
            auteur_nom=r.auteur.nom if _nom_visible(r, membre) else None,
            de_la_frangine=r.auteur is not None and r.auteur.est_gestionnaire,
            peut_modifier=peut_modifier(membre, r.auteur_id),
        )
        for r in sujet.reponses
        if _reponse_visible(r, membre)
    ]
    return s.SujetDetail(
        **base, texte=sujet.texte, reponses=reponses,
        peut_modifier=peut_modifier(membre, sujet.auteur_id),
        peut_moderer=membre is not None and membre.peut_moderer(),
        peut_repondre=membre is not None and sujet.etat == Etat.AUTORISE,
        est_auteur=membre is not None and membre.id == sujet.auteur_id,
    )


def _recompter(db: Db, sujet: Conseil) -> None:
    """`nombre_reponses` = réponses non supprimées (le legacy incrémentait sans jamais décompter)."""
    db.flush()
    sujet.nombre_reponses = db.scalar(
        select(func.count()).select_from(Conseil).where(Conseil.sujet_id == sujet.id, Conseil.etat != Etat.SUPPRIME)
    ) or 0


def _ecrire_a_la_frangine(db: Db, membre: Membre, texte: str) -> None:
    """Dépose un message dans le fil privé du membre pour que les gestionnaires le voient."""
    db.add(Message(membre_id=membre.id, auteur_id=membre.id, de_la_frangine=False, texte=texte))


# --- Lecture ----------------------------------------------------------------------------------


@router.get("", response_model=Liste[s.SujetResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: str | None = None,
    miens: bool = False,
    confidentialite: Annotated[int | None, Query(ge=1, le=2)] = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
):
    """Sujets du plus récent au plus ancien ; recherche dans l'objet ou le texte (F-S1-03/04)."""
    req = select(Conseil).where(Conseil.sujet_id.is_(None)).options(selectinload(Conseil.auteur))
    if (cond := _condition_visible(membre)) is not None:
        req = req.where(cond)
    if membre is not None and membre.est_gestionnaire:
        req = req.where(Conseil.etat == etat) if etat else req.where(Conseil.etat != Etat.SUPPRIME)
    if miens and membre is not None:
        req = req.where(Conseil.auteur_id == membre.id)
    if confidentialite:
        req = req.where(Conseil.confidentialite == confidentialite)
    if (cond := recherche(q, Conseil.objet, Conseil.texte, Conseil.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Conseil.date_creation.desc(), Conseil.id.desc()), page)
    return Liste(items=[_resume(c, membre) for c in items], total=total, page=page.page, taille=page.taille)


@router.get("/derniers", response_model=list[s.SujetResume])
def derniers(db: Db, membre: MembreOpt, n: Annotated[int, Query(ge=1, le=20)] = 10):
    """Colonne de droite du legacy : les 10 derniers sujets publiés (F-S1-07)."""
    req = select(Conseil).where(Conseil.sujet_id.is_(None), Conseil.etat == Etat.AUTORISE).options(
        selectinload(Conseil.auteur)
    )
    if (cond := _condition_visible(membre)) is not None:
        req = req.where(cond)
    lignes = db.scalars(req.order_by(Conseil.date_creation.desc(), Conseil.id.desc()).limit(n)).all()
    return [_resume(c, membre) for c in lignes]


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db, membre: MembreOpt):
    """Compteur de l'onglet : sujets actifs (publiés) seulement, réponses exclues (F-S1-02)."""
    req = select(func.count()).select_from(Conseil).where(Conseil.sujet_id.is_(None), Conseil.etat == Etat.AUTORISE)
    if (cond := _condition_visible(membre)) is not None:
        req = req.where(cond)
    return s.Compteurs(sujets=db.scalar(req) or 0)


@router.get("/{id_}", response_model=s.SujetDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    """Fil d'un sujet et ses réponses chronologiques (F-S1-08). Les visiteurs lisent les fils
    publics (le texte du sujet l'était déjà dans la liste legacy) ; répondre exige un compte."""
    return _detail(_sujet(db, id_, membre), membre)


# --- Sujets -----------------------------------------------------------------------------------


def _valider_sujet(db: Db, d: s.SujetEntree, membre: Membre, exclure_id: int | None = None) -> tuple[str, str]:
    """Règles legacy (incl-conseil.php), toutes signalées en même temps (F-S1-10, F-S1-12)."""
    objet, texte = " ".join(d.objet.split()), d.texte.strip()
    champs: dict[str, str] = {}
    if d.confidentialite not in (Confidentialite.PRIVE, Confidentialite.PUBLIC):
        champs["confidentialite"] = "Indiquez la confidentialité du conseil : privé ou public."
    if len(objet) < 5:
        champs["objet"] = "L'objet du conseil doit avoir 5 caractères minimum."
    if len(texte) < 20:
        champs["texte"] = "Le texte du conseil doit avoir 20 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Doublon : même objet qu'un de ses sujets ou qu'un sujet public existant
    doublon = select(Conseil.id).where(
        Conseil.sujet_id.is_(None),
        func.lower(Conseil.objet) == objet.lower(),
        Conseil.etat != Etat.SUPPRIME,
        or_(Conseil.auteur_id == membre.id, Conseil.confidentialite == Confidentialite.PUBLIC),
    )
    if exclure_id:
        doublon = doublon.where(Conseil.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur(
            "Cette fiche est déjà enregistrée.",
            objet="Un sujet porte déjà cet objet : consultez-le ou reformulez votre question.",
        )
    return objet, texte


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.SujetEntree, db: Db, membre: MembreReq):
    """Création d'un sujet, publié immédiatement (F-S1-10, F-S1-11)."""
    objet, texte = _valider_sujet(db, donnees, membre)
    sujet = Conseil(
        reference=nouvelle_reference(db, Prefixe.CONSEIL), sujet_id=None, objet=objet, texte=texte,
        auteur_id=membre.id, confidentialite=donnees.confidentialite, etat=Etat.AUTORISE, nombre_reponses=0,
    )
    db.add(sujet)
    db.flush()
    if sujet.confidentialite == Confidentialite.PRIVE:
        _ecrire_a_la_frangine(
            db, membre, f"Nouvelle question privée pour la frangine : « {objet} ». À lire sur /questions/{sujet.id}"
        )
    db.commit()
    return Ok(message="Enregistrement effectué.", id=sujet.id, reference=sujet.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.SujetEntree, db: Db, membre: MembreReq):
    """Objet, texte et confidentialité : l'auteur ou un gestionnaire habilité (F-S1-13)."""
    sujet = _sujet(db, id_, membre)
    verifier_modification(membre, sujet.auteur_id)
    sujet.objet, sujet.texte = _valider_sujet(db, donnees, membre, exclure_id=sujet.id)
    if sujet.confidentialite != donnees.confidentialite:
        sujet.confidentialite = donnees.confidentialite
        # Les réponses héritent de la confidentialité du sujet (F-S1-15)
        for r in sujet.reponses:
            r.confidentialite = donnees.confidentialite
    db.commit()
    return Ok(message="Modification effectuée.", id=sujet.id, reference=sujet.reference)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """Modération (gestionnaire + droit Activation) : F-S1-14."""
    sujet = _sujet(db, id_, membre)
    changer_etat(sujet, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=sujet.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    """Suppression logique (état 3) : auteur ou gestionnaire habilité (F-S1-09)."""
    sujet = _sujet(db, id_, membre)
    supprimer(sujet, membre)
    db.commit()
    return Ok(message="Sujet supprimé.", id=sujet.id)


# --- Réponses ---------------------------------------------------------------------------------


def _texte_reponse(texte: str) -> str:
    texte = texte.strip()
    if len(texte) < 2:
        raise erreur("Veuillez corriger les champs signalés.", texte="Le commentaire doit avoir 2 caractères minimum.")
    return texte


@router.post("/{id_}/reponses", response_model=Ok, status_code=201)
def repondre(id_: int, donnees: s.ReponseEntree, db: Db, membre: MembreReq):
    """Réponse à un sujet lisible : hérite de sa confidentialité, publiée immédiatement,
    incrémente le nombre de réponses (F-S1-15). L'auteur du sujet est prévenu."""
    sujet = _sujet(db, id_, membre)
    if sujet.etat == Etat.CLOTURE:
        raise erreur("Ce sujet est clôturé : il n'accepte plus de réponses.")
    if sujet.etat != Etat.AUTORISE:
        raise erreur("Ce sujet n'accepte pas de réponses pour le moment.")
    texte = _texte_reponse(donnees.texte)
    doublon = select(Conseil.id).where(
        Conseil.sujet_id == sujet.id, Conseil.auteur_id == membre.id, Conseil.texte == texte, Conseil.etat != Etat.SUPPRIME
    )
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce message est déjà enregistré.", texte="Vous avez déjà publié cette réponse.")
    reponse = Conseil(
        reference=sujet.reference, sujet_id=sujet.id, objet="", texte=texte, auteur_id=membre.id,
        confidentialite=sujet.confidentialite, etat=Etat.AUTORISE, nombre_reponses=0,
    )
    db.add(reponse)
    _recompter(db, sujet)
    lien = f"/questions/{sujet.id}"
    if sujet.auteur_id and sujet.auteur_id != membre.id:
        db.add(Message(
            membre_id=sujet.auteur_id, auteur_id=None, de_la_frangine=True,
            texte=f"Nouvelle réponse à votre question « {sujet.objet} ». Retrouvez-la sur {lien}",
        ))
    elif sujet.confidentialite == Confidentialite.PRIVE and not membre.est_gestionnaire:
        # L'auteur relance sa question privée : la frangine doit le voir
        _ecrire_a_la_frangine(db, membre, f"J'ai complété ma question privée « {sujet.objet} » : {lien}")
    db.commit()
    return Ok(message="Enregistrement effectué.", id=reponse.id, reference=sujet.reference)


@router.put("/reponses/{rid}", response_model=Ok)
def modifier_reponse(rid: int, donnees: s.ReponseEntree, db: Db, membre: MembreReq):
    """Correction d'une réponse sans contrainte d'objet ni de 20 caractères (F-S1-16)."""
    reponse = _reponse(db, rid, membre)
    verifier_modification(membre, reponse.auteur_id)
    reponse.texte = _texte_reponse(donnees.texte)
    db.commit()
    return Ok(message="Modification effectuée.", id=reponse.id)


@router.post("/reponses/{rid}/etat", response_model=Ok)
def etat_reponse(rid: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    reponse = _reponse(db, rid, membre)
    changer_etat(reponse, donnees.etat, membre)
    _recompter(db, db.get(Conseil, reponse.sujet_id))
    db.commit()
    return Ok(message="Modification effectuée.", id=reponse.id)


@router.delete("/reponses/{rid}", response_model=Ok)
def effacer_reponse(rid: int, db: Db, membre: MembreReq):
    reponse = _reponse(db, rid, membre)
    supprimer(reponse, membre)
    _recompter(db, db.get(Conseil, reponse.sujet_id))
    db.commit()
    return Ok(message="Réponse supprimée.", id=reponse.id)


routers = [router]
