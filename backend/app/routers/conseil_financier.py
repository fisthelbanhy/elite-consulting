"""Forum « Conseil financier » (legacy : choix7.php cgb=1, incl-choix7A.php, incl-conseilfinance.php).
Inventaire : S7-1, F-S7-03 à F-S7-11. Rubriques : 1 Conseil financier (privé par défaut : échange
membre ↔ conseiller), 2 Rumeurs économiques (public, affiché « Actus & décryptages »). La rubrique
« Accompagnement » renvoie vers le module accompagnement.

Un sujet a `sujet_id` NULL ; ses réponses pointent vers lui (même référence, même rubrique, même
confidentialité — correctif F-S7-10). Réservé aux membres connectés (F-S7-02)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreReq, Page, verifier_modification
from app.enums import Confidentialite, Etat, RubriqueConseilFinance, TypeMembre
from app.erreurs import erreur, interdit, introuvable
from app.models import ConseilFinance, Membre, Message
from app.schemas import conseil_financier as s
from app.schemas.commun import Liste, Ok
from app.services.fiches import changer_etat, paginer, recherche
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/conseil-financier", tags=["Conseil financier"])

OUVERTS = (Etat.NON_TRAITE, Etat.AUTORISE)
LISIBLES = (Etat.AUTORISE, Etat.CLOTURE)
NOMS = {RubriqueConseilFinance.CONSEIL: "Conseil financier", RubriqueConseilFinance.RUMEURS: "Actus & décryptages"}


def _condition_visibilite(membre: Membre):
    """Gestionnaire : tout sauf supprimé. Membre : ses sujets (hors supprimés) et les sujets
    publics publiés ou clôturés. Un sujet privé n'est visible que de son auteur et des
    gestionnaires (décision F-S7-07, cf. ADR-0007 S1a)."""
    if membre.est_gestionnaire:
        return ConseilFinance.etat != Etat.SUPPRIME
    return or_(
        and_(ConseilFinance.auteur_id == membre.id, ConseilFinance.etat != Etat.SUPPRIME),
        and_(ConseilFinance.confidentialite == Confidentialite.PUBLIC, ConseilFinance.etat.in_(LISIBLES)),
    )


def _peut_voir(sujet: ConseilFinance, membre: Membre) -> bool:
    if membre.est_gestionnaire:
        return True
    if sujet.auteur_id == membre.id:
        return sujet.etat != Etat.SUPPRIME
    return sujet.confidentialite == Confidentialite.PUBLIC and sujet.etat in LISIBLES


def _sujet(db: Db, id_: int, membre: Membre) -> ConseilFinance:
    sujet = db.get(ConseilFinance, id_)
    if sujet is None or sujet.sujet_id is not None or not _peut_voir(sujet, membre):
        raise introuvable("Ce sujet n'existe pas ou ne vous est pas accessible.")
    return sujet


@router.get("", response_model=Liste[s.SujetResume])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    rubrique: Annotated[int | None, Query(ge=1, le=2)] = None,
    q: str | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    miens: bool = False,
):
    req = (
        select(ConseilFinance)
        .options(selectinload(ConseilFinance.auteur))
        .where(ConseilFinance.sujet_id.is_(None), _condition_visibilite(membre))
    )
    if rubrique:
        req = req.where(ConseilFinance.rubrique == rubrique)
    if etat and membre.est_gestionnaire:
        req = req.where(ConseilFinance.etat == etat)
    if miens:
        req = req.where(ConseilFinance.auteur_id == membre.id)
    if (cond := recherche(q, ConseilFinance.objet, ConseilFinance.texte, ConseilFinance.reference)) is not None:
        req = req.where(cond)
    # Tri legacy : chronologique pour le conseil financier, antéchronologique pour les rumeurs (F-S7-06)
    ordre = ConseilFinance.date_creation.asc() if rubrique == RubriqueConseilFinance.CONSEIL else ConseilFinance.date_creation.desc()
    items, total = paginer(db, req.order_by(ordre, ConseilFinance.id), page)
    repondus = _sujets_repondus_par_conseiller(db, [i.id for i in items])
    resumes = []
    for i in items:
        r = s.SujetResume.model_validate(i)
        r.repondu_par_conseiller = i.id in repondus
        resumes.append(r)
    return Liste(items=resumes, total=total, page=page.page, taille=page.taille)


def _sujets_repondus_par_conseiller(db: Db, ids: list[int]) -> set[int]:
    if not ids:
        return set()
    rows = db.execute(
        select(ConseilFinance.sujet_id)
        .join(Membre, Membre.id == ConseilFinance.auteur_id)
        .where(ConseilFinance.sujet_id.in_(ids), ConseilFinance.etat != Etat.SUPPRIME,
               Membre.type_compte == TypeMembre.GESTIONNAIRE)
        .distinct()
    ).scalars().all()
    return set(rows)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db, membre: MembreReq):
    def n(rubrique: int) -> int:
        return db.scalar(
            select(func.count()).select_from(ConseilFinance).where(
                ConseilFinance.sujet_id.is_(None), ConseilFinance.rubrique == rubrique, _condition_visibilite(membre)
            )
        ) or 0

    def ouvert(rubrique: int) -> int | None:
        return db.scalar(
            select(ConseilFinance.id).where(
                ConseilFinance.sujet_id.is_(None), ConseilFinance.rubrique == rubrique,
                ConseilFinance.auteur_id == membre.id, ConseilFinance.etat.in_(OUVERTS),
            ).limit(1)
        )

    return s.Compteurs(
        conseil=n(RubriqueConseilFinance.CONSEIL), rumeurs=n(RubriqueConseilFinance.RUMEURS),
        sujet_ouvert_conseil=ouvert(RubriqueConseilFinance.CONSEIL),
        sujet_ouvert_rumeurs=ouvert(RubriqueConseilFinance.RUMEURS),
    )


def _detail(db: Db, sujet: ConseilFinance, membre: Membre) -> s.SujetDetail:
    d = s.SujetDetail.model_validate(sujet)
    reponses = db.scalars(
        select(ConseilFinance)
        .options(selectinload(ConseilFinance.auteur))
        .where(ConseilFinance.sujet_id == sujet.id, ConseilFinance.etat != Etat.SUPPRIME)
        .order_by(ConseilFinance.date_creation, ConseilFinance.id)
    ).all()
    d.reponses = []
    for r in reponses:
        out = s.ReponseOut.model_validate(r)
        out.de_la_frangine = bool(r.auteur and r.auteur.est_gestionnaire)
        out.peut_modifier = r.auteur_id == membre.id or membre.peut_moderer()
        d.reponses.append(out)
    d.repondu_par_conseiller = any(r.de_la_frangine for r in d.reponses)
    d.est_auteur = sujet.auteur_id == membre.id
    d.peut_modifier = d.est_auteur or membre.peut_moderer()
    d.peut_moderer = membre.peut_moderer()
    # Un sujet clôturé est fermé aux réponses (correctif F-S7-11)
    d.peut_repondre = sujet.etat in OUVERTS
    d.peut_cloturer = sujet.etat in OUVERTS and (d.est_auteur or membre.est_gestionnaire)
    return d


@router.get("/{id_}", response_model=s.SujetDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    return _detail(db, _sujet(db, id_, membre), membre)


def _valider_sujet(db: Db, rubrique: int, objet: str, texte: str, exclure_id: int | None = None) -> None:
    champs: dict[str, str] = {}
    if len(objet) < 2:
        champs["objet"] = "L'objet du conseil doit avoir 2 caractères minimum."
    if len(texte) < 2:
        champs["texte"] = "Le texte doit avoir 2 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(ConseilFinance.id).where(
        ConseilFinance.sujet_id.is_(None), ConseilFinance.rubrique == rubrique,
        func.lower(ConseilFinance.objet) == objet.lower(), ConseilFinance.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(ConseilFinance.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        # Le legacy refusait sans aucun message (F-S7-05)
        raise erreur("Un sujet portant le même objet existe déjà.", objet="Un sujet portant le même objet existe déjà : choisissez un objet plus précis.")


def _confidentialite(rubrique: int, demandee: int | None) -> int:
    if rubrique == RubriqueConseilFinance.RUMEURS:
        return Confidentialite.PUBLIC
    return demandee or Confidentialite.PRIVE


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.SujetEntree, db: Db, membre: MembreReq):
    objet, texte = donnees.objet.strip(), donnees.texte.strip()
    # Un membre ne garde qu'un sujet ouvert par rubrique (F-S7-03) ; le gestionnaire n'est pas limité
    if not membre.est_gestionnaire:
        ouvert = db.scalar(
            select(ConseilFinance.id).where(
                ConseilFinance.sujet_id.is_(None), ConseilFinance.rubrique == donnees.rubrique,
                ConseilFinance.auteur_id == membre.id, ConseilFinance.etat.in_(OUVERTS),
            ).limit(1)
        )
        if ouvert:
            raise erreur("Pour entamer un nouveau sujet, il faut clôturer le précédent.")
    _valider_sujet(db, donnees.rubrique, objet, texte)
    sujet = ConseilFinance(
        rubrique=donnees.rubrique, objet=objet, texte=texte, auteur_id=membre.id,
        confidentialite=_confidentialite(donnees.rubrique, donnees.confidentialite),
        etat=Etat.AUTORISE, reference=nouvelle_reference(db, Prefixe.CONSEIL_FINANCE),
    )
    db.add(sujet)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=sujet.id, reference=sujet.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.SujetModification, db: Db, membre: MembreReq):
    """Sujet : son auteur (y compris un simple membre — correctif F-S7-08) ou un gestionnaire
    habilité. Réponse : son auteur ou un gestionnaire habilité (seul le texte compte)."""
    fiche = db.get(ConseilFinance, id_)
    if fiche is None:
        raise introuvable("Ce message n'existe pas.")
    sujet = fiche if fiche.sujet_id is None else db.get(ConseilFinance, fiche.sujet_id)
    if sujet is None or not _peut_voir(sujet, membre) or fiche.etat == Etat.SUPPRIME:
        raise introuvable("Ce message n'existe pas ou ne vous est pas accessible.")
    verifier_modification(membre, fiche.auteur_id)
    texte = donnees.texte.strip()
    if fiche.sujet_id is not None:
        if len(texte) < 2:
            raise erreur("La réponse doit avoir 2 caractères minimum.", texte="La réponse doit avoir 2 caractères minimum.")
        fiche.texte = texte
    else:
        objet = donnees.objet.strip()
        _valider_sujet(db, fiche.rubrique, objet, texte, exclure_id=fiche.id)
        fiche.objet, fiche.texte = objet, texte
        if donnees.confidentialite:
            nouvelle = _confidentialite(fiche.rubrique, donnees.confidentialite)
            fiche.confidentialite = nouvelle
            # Les réponses héritent de la confidentialité du sujet
            for r in db.scalars(select(ConseilFinance).where(ConseilFinance.sujet_id == fiche.id)):
                r.confidentialite = nouvelle
    db.commit()
    return Ok(message="Modification effectuée.", id=sujet.id, reference=fiche.reference)


@router.post("/{id_}/reponses", response_model=Ok, status_code=201)
def repondre(id_: int, donnees: s.ReponseEntree, db: Db, membre: MembreReq):
    sujet = _sujet(db, id_, membre)
    if sujet.etat not in OUVERTS:
        raise erreur("Ce sujet est clôturé : il n'accepte plus de réponse.")
    texte = donnees.texte.strip()
    if len(texte) < 2:
        raise erreur("La réponse doit avoir 2 caractères minimum.", texte="La réponse doit avoir 2 caractères minimum.")
    deja = db.scalar(
        select(ConseilFinance.id).where(
            ConseilFinance.sujet_id == sujet.id, ConseilFinance.texte == texte, ConseilFinance.etat != Etat.SUPPRIME
        ).limit(1)
    )
    if deja:
        raise erreur("Ce message est déjà envoyé.", texte="Ce message est déjà envoyé.")
    reponse = ConseilFinance(
        rubrique=sujet.rubrique, reference=sujet.reference, sujet_id=sujet.id, objet="", texte=texte,
        auteur_id=membre.id, auteur_sujet_id=sujet.auteur_id,
        confidentialite=sujet.confidentialite,  # héritée (le legacy y mettait le n° de rubrique)
        etat=Etat.AUTORISE,
    )
    db.add(reponse)
    sujet.nombre_reponses = (sujet.nombre_reponses or 0) + 1
    # L'auteur est prévenu quand un conseiller lui répond (« Un conseiller vous répond »)
    if membre.est_gestionnaire and sujet.auteur_id and sujet.auteur_id != membre.id:
        db.add(Message(
            membre_id=sujet.auteur_id, auteur_id=None, de_la_frangine=True,
            texte=f"Un conseiller a répondu à votre sujet « {sujet.objet} » ({NOMS.get(sujet.rubrique, 'Conseil financier')}). "
                  f"Retrouvez sa réponse sur /conseil-financier/{sujet.id}",
        ))
    db.commit()
    return Ok(message="Votre réponse est enregistrée.", id=reponse.id, reference=sujet.reference)


@router.post("/{id_}/cloture", response_model=Ok)
def cloturer(id_: int, db: Db, membre: MembreReq):
    """« Clôture sujet » : réservée à l'auteur et aux gestionnaires (correctif F-S7-11), dans les
    deux rubriques (sinon un membre ne pourrait jamais rouvrir de sujet en « Rumeurs »)."""
    sujet = _sujet(db, id_, membre)
    if not (sujet.auteur_id == membre.id or membre.est_gestionnaire):
        raise interdit("Seul l'auteur du sujet ou un gestionnaire peut le clôturer.")
    if sujet.etat not in OUVERTS:
        raise erreur("Ce sujet est déjà clôturé.")
    sujet.etat = Etat.CLOTURE
    db.commit()
    return Ok(message="Le sujet est clôturé.", id=sujet.id, reference=sujet.reference)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = db.get(ConseilFinance, id_)
    if fiche is None:
        raise introuvable("Ce message n'existe pas.")
    ancien = fiche.etat
    changer_etat(fiche, donnees.etat, membre)
    if fiche.sujet_id is not None:
        _ajuster_compteur(db, fiche, ancien)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


def _ajuster_compteur(db: Db, reponse: ConseilFinance, ancien: int) -> None:
    sujet = db.get(ConseilFinance, reponse.sujet_id)
    if sujet is None:
        return
    if ancien != Etat.SUPPRIME and reponse.etat == Etat.SUPPRIME:
        sujet.nombre_reponses = max(0, (sujet.nombre_reponses or 0) - 1)
    elif ancien == Etat.SUPPRIME and reponse.etat != Etat.SUPPRIME:
        sujet.nombre_reponses = (sujet.nombre_reponses or 0) + 1


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = db.get(ConseilFinance, id_)
    if fiche is None or fiche.etat == Etat.SUPPRIME:
        raise introuvable("Ce message n'existe pas.")
    if not (fiche.auteur_id == membre.id or membre.peut_moderer()):
        raise interdit("Seul l'auteur ou un gestionnaire habilité peut supprimer ce message.")
    ancien = fiche.etat
    fiche.etat = Etat.SUPPRIME
    if fiche.sujet_id is not None:
        _ajuster_compteur(db, fiche, ancien)
    db.commit()
    return Ok(message="Message supprimé." if fiche.sujet_id else "Sujet supprimé.", id=fiche.sujet_id or fiche.id)


routers = [router]
