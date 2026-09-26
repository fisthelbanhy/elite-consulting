"""Découverte de soi (legacy « Lisungui » : incl-choix1B.php, incl-sounga.php, table
`soungangai`) et diagnostic gratuit (nouveau, ADR-0008). Inventaire : E-S1-04, F-S1-17 à F-S1-26.

- Une seule fiche par membre, pour toujours (ADR-0004) ; une fiche clôturée se rouvre
  (ADR-0007 S1c) ; une fiche supprimée par un gestionnaire est réutilisée si le membre repart.
- La fiche n'est visible que du membre concerné et des gestionnaires (jamais publique).
- « Correspondance la frangine » : écrite par un gestionnaire, lecture seule pour le membre.
- Deux états : `etat` (technique, 3 = supprimée) et `etat_fiche` (« État fiche » du formulaire
  legacy, suivi par le gestionnaire habilité).
"""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreReq, Page, exiger_droit
from app.enums import Etat, OuiNon
from app.erreurs import erreur, interdit, introuvable
from app.models import Membre, Message, Soungangai
from app.schemas import decouverte as s
from app.schemas.commun import Liste, Ok
from app.services import decouverte as diag
from app.services.fiches import paginer, recherche
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/decouverte", tags=["Découverte de soi"])

INTROUVABLE = "Cette fiche de découverte de soi n'existe pas."


def _fiche(db: Db, id_: int, membre: Membre) -> Soungangai:
    fiche = db.get(Soungangai, id_)
    if fiche is None:
        raise introuvable(INTROUVABLE)
    if membre.est_gestionnaire:
        return fiche
    if fiche.membre_id != membre.id or fiche.etat == Etat.SUPPRIME:
        raise introuvable(INTROUVABLE)
    return fiche


def _fiche_du_membre(db: Db, membre: Membre) -> Soungangai | None:
    return db.scalar(select(Soungangai).where(Soungangai.membre_id == membre.id))


def _detail(fiche: Soungangai, membre: Membre) -> s.FicheDetail:
    d = s.FicheDetail.model_validate(fiche)
    proprietaire = fiche.membre_id == membre.id
    d.est_proprietaire = proprietaire
    d.peut_modifier = membre.peut_moderer() or (
        proprietaire and fiche.cloturee != OuiNon.OUI and fiche.etat != Etat.SUPPRIME
    )
    d.peut_moderer = membre.peut_moderer()
    d.peut_repondre = membre.est_gestionnaire
    return d


def _preparer(db: Db, membre: Membre, existante: Soungangai | None) -> Soungangai:
    """Nouvelle fiche (référence LSG…), ou reprise à blanc d'une fiche supprimée : la contrainte
    « une fiche par membre » est conservée."""
    fiche = existante
    if fiche is None:
        fiche = Soungangai(membre_id=membre.id, reference=nouvelle_reference(db, Prefixe.SOUNGANGAI))
        db.add(fiche)
    else:
        fiche.date_creation = datetime.now()
    for champ, info in s.ReponsesQuestionnaire.model_fields.items():
        setattr(fiche, champ, info.default)
    fiche.notes_conseillere = ""
    fiche.diagnostic = None
    fiche.date_diagnostic = None
    fiche.etat, fiche.etat_fiche, fiche.cloturee = Etat.NON_TRAITE, Etat.AUTORISE, OuiNon.NON
    return fiche


def _appliquer(fiche: Soungangai, d: s.FicheEntree) -> None:
    for champ in s.CHAMPS_QUESTIONNAIRE:
        v = getattr(d, champ)
        setattr(fiche, champ, v.strip() if isinstance(v, str) else v)


# --- Diagnostic gratuit (public jusqu'à l'enregistrement) ----------------------------------------


@router.get("/diagnostic/questions", response_model=list[s.QuestionDiagnostic])
def diagnostic_questions(db: Db):
    """Les 8 questions du diagnostic, avec leurs choix (une question par écran)."""
    return diag.questions(db)


@router.post("/diagnostic/restitution", response_model=s.Restitution)
def diagnostic_restitution(donnees: s.DiagnosticEntree, db: Db):
    """Restitution immédiate, sans compte et sans rien enregistrer."""
    return diag.restitution(db, diag.valider(db, donnees))


@router.post("/diagnostic", response_model=Ok, status_code=201)
def diagnostic_enregistrer(donnees: s.DiagnosticEntree, db: Db, membre: MembreReq):
    """Crée ou complète la fiche Découverte de soi du membre avec son diagnostic, et dépose un
    message « Nouveau diagnostic » dans son fil pour que la conseillère le rappelle."""
    codes = diag.valider(db, donnees)
    r = diag.restitution(db, codes)
    fiche = _fiche_du_membre(db, membre)
    # Double envoi (retour arrière, double clic) : pas de second message à la conseillère
    deja_envoye = (
        fiche is not None and fiche.etat != Etat.SUPPRIME and (fiche.diagnostic or {}).get("codes") == codes
        and fiche.date_diagnostic is not None and fiche.date_diagnostic > datetime.now() - timedelta(days=1)
    )
    if fiche is None or fiche.etat == Etat.SUPPRIME:
        fiche = _preparer(db, membre, fiche)
    fiche.cloturee = OuiNon.NON  # un nouveau diagnostic relance le suivi
    diag.appliquer(db, fiche, codes, r)
    if not deja_envoye:
        db.add(Message(membre_id=membre.id, auteur_id=membre.id, de_la_frangine=False, texte=diag.message_conseillere(r)))
    db.commit()
    return Ok(
        message="Votre diagnostic est enregistré : votre conseillère vous rappelle très vite.",
        id=fiche.id, reference=fiche.reference,
    )


# --- Fiche du membre --------------------------------------------------------------------------


@router.get("/moi", response_model=s.FicheDetail | None)
def ma_fiche(db: Db, membre: MembreReq):
    """La fiche du membre connecté (ouverte ou clôturée), ou `null` s'il n'en a pas (F-S1-18/19)."""
    fiche = _fiche_du_membre(db, membre)
    if fiche is None or fiche.etat == Etat.SUPPRIME:
        return None
    return _detail(fiche, membre)


@router.get("", response_model=Liste[s.FicheResume])
def lister(
    db: Db,
    membre: Gestionnaire,
    page: Page,
    q: str | None = None,
    cloturee: Annotated[int | None, Query(ge=1, le=2)] = None,
    diagnostic: bool | None = None,
):
    """Toutes les fiches, pour les gestionnaires : « N Lisungui » (F-S1-24)."""
    req = (
        select(Soungangai)
        .join(Membre, Soungangai.membre_id == Membre.id)
        .where(Soungangai.etat != Etat.SUPPRIME)
        .options(selectinload(Soungangai.membre))
    )
    if cloturee:
        req = req.where(Soungangai.cloturee == cloturee)
    if diagnostic is not None:
        req = req.where(Soungangai.date_diagnostic.is_not(None) if diagnostic else Soungangai.date_diagnostic.is_(None))
    if (cond := recherche(q, Soungangai.reference, Membre.nom, Membre.pseudonyme)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Soungangai.date_creation.desc(), Soungangai.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.FicheEntree, db: Db, membre: MembreReq):
    existante = _fiche_du_membre(db, membre)
    if existante is not None and existante.etat != Etat.SUPPRIME:
        raise erreur("Fiche de découverte de soi du membre déjà enregistrée.")
    fiche = _preparer(db, membre, existante)
    _appliquer(fiche, donnees)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router.get("/{id_}", response_model=s.FicheDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    return _detail(_fiche(db, id_, membre), membre)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.FicheEntree, db: Db, membre: MembreReq):
    """Le membre modifie sa fiche tant qu'elle est ouverte ; un gestionnaire habilité toujours."""
    fiche = _fiche(db, id_, membre)
    if not (fiche.membre_id == membre.id or membre.peut_moderer()):
        raise interdit("Seul le membre concerné ou un gestionnaire habilité peut modifier cette fiche.")
    if not membre.peut_moderer() and fiche.cloturee == OuiNon.OUI:
        raise erreur("Votre fiche est clôturée : rouvrez-la pour la modifier.")
    _appliquer(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}/correspondance", response_model=Ok)
def correspondance(id_: int, donnees: s.CorrespondanceEntree, db: Db, membre: Gestionnaire):
    """« Correspondance la frangine » (F-S1-22) ; le membre est prévenu par sa messagerie."""
    fiche = _fiche(db, id_, membre)
    texte = donnees.notes_conseillere.strip()
    if texte and texte != fiche.notes_conseillere:
        db.add(Message(
            membre_id=fiche.membre_id, auteur_id=membre.id, de_la_frangine=True,
            texte="Votre conseillère a écrit sur votre fiche « Découverte de soi ». "
                  "Retrouvez sa correspondance sur /decouverte-de-soi",
        ))
    fiche.notes_conseillere = texte
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.post("/{id_}/cloture", response_model=Ok)
def cloture(id_: int, donnees: s.ClotureEntree, db: Db, membre: MembreReq):
    """Clôture ou réouverture par le membre ou un gestionnaire habilité (F-S1-23, ADR-0007 S1c)."""
    fiche = _fiche(db, id_, membre)
    if not (fiche.membre_id == membre.id or membre.peut_moderer()):
        raise interdit("Seul le membre concerné ou un gestionnaire habilité peut clôturer cette fiche.")
    fiche.cloturee = OuiNon.OUI if donnees.cloturee else OuiNon.NON
    db.commit()
    message = "La fiche est clôturée." if donnees.cloturee else "La fiche est rouverte : elle peut être complétée."
    return Ok(message=message, id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """« État fiche » (suivi) : gestionnaire avec le droit Activation (F-S1-23)."""
    fiche = _fiche(db, id_, membre)
    exiger_droit(membre, "activation")
    fiche.etat_fiche = donnees.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    """Suppression logique par un gestionnaire habilité (F-S1-25)."""
    fiche = _fiche(db, id_, membre)
    exiger_droit(membre, "activation")
    fiche.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


routers = [router]
