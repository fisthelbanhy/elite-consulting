"""Accompagnement : 4 questionnaires de préparation de dossier bancable (legacy : choix7.php
cgb=1&recf=3, incl-choix7A3.php, incl-acomp*.php). Inventaire : S7-2 à S7-7, F-S7-12 à F-S7-21.

Correctifs (ADR-0007 S7a) : toutes les réponses sont enregistrées (dont la question 48 de la
restructuration) et rechargées ; la modification fonctionne ; « Sauvegarder » garde un brouillon
(état 1) et « Envoyer » transmet au conseiller (état 2), comme pour le Business plan (ADR-0004).
États : 1 brouillon, 2 envoyé, 3 supprimé, 4 traité (clôturé par le conseiller)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreReq, Page, verifier_modification
from app.enums import Etat
from app.erreurs import erreur, introuvable
from app.models import DossierAccompagnement, Membre, Message
from app.schemas import accompagnement as s
from app.schemas.commun import Liste, Ok
from app.services import questionnaires_accompagnement as qa
from app.services.fiches import changer_etat, paginer, recherche, supprimer
from app.services.references import nouvelle_reference

router = APIRouter(prefix="/accompagnement", tags=["Accompagnement"])

NOTIFICATIONS = {
    Etat.NON_TRAITE: "Votre dossier {ref} ({libelle}) est repassé en brouillon : complétez-le puis envoyez-le à votre conseiller.",
    Etat.AUTORISE: "Votre dossier {ref} ({libelle}) est bien pris en charge par votre conseiller. Il revient vers vous rapidement.",
    Etat.CLOTURE: "Votre conseiller a traité votre dossier {ref} ({libelle}). Il vous recontacte pour la suite.",
    Etat.SUPPRIME: "Votre dossier {ref} ({libelle}) a été retiré par la frangine. Écrivez-nous si c'est une erreur.",
}


def _questionnaire_out(q: qa.Questionnaire) -> s.QuestionnaireOut:
    return s.QuestionnaireOut(
        type=q.type, slug=q.slug, libelle=q.libelle, prefixe=q.prefixe, accroche=q.accroche,
        description=q.description, pour_qui=q.pour_qui, nombre_questions=q.nombre_questions,
        sections=[
            s.SectionOut(numero=sec.numero, titre=sec.titre, groupes=[
                s.GroupeOut(titre=g.titre, questions=[s.QuestionOut(zone=x.zone, libelle=x.libelle, aide=x.aide) for x in g.questions])
                for g in sec.groupes
            ])
            for sec in q.sections
        ],
    )


@router.get("/questionnaires", response_model=list[s.QuestionnaireOut])
def questionnaires():
    """Libellés exacts et découpage des 4 questionnaires (public : sert aussi la page de présentation)."""
    return [_questionnaire_out(q) for q in qa.QUESTIONNAIRES.values()]


@router.get("/questionnaires/{slug}", response_model=s.QuestionnaireOut)
def questionnaire(slug: str):
    q = qa.PAR_SLUG.get(slug)
    if q is None:
        raise introuvable("Ce type d'accompagnement n'existe pas.")
    return _questionnaire_out(q)


def _visibles(req, membre: Membre):
    """Membre : ses dossiers (hors supprimés) ; gestionnaire : tous (F-S7-12)."""
    if membre.est_gestionnaire:
        return req
    return req.where(DossierAccompagnement.membre_id == membre.id, DossierAccompagnement.etat != Etat.SUPPRIME)


def _resume(fiche: DossierAccompagnement, schema=s.DossierResume):
    d = schema.model_validate(fiche)
    q = qa.questionnaire(fiche.type_dossier)
    if q:
        d.nombre_questions = q.nombre_questions
        d.nombre_repondues = qa.nombre_repondues(q, fiche.reponses)
    return d


@router.get("", response_model=Liste[s.DossierResume])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=4)] = None,
    q: str | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    membre_id: int | None = None,
):
    req = _visibles(select(DossierAccompagnement).options(selectinload(DossierAccompagnement.membre)), membre)
    if type:
        req = req.where(DossierAccompagnement.type_dossier == type)
    if etat:
        req = req.where(DossierAccompagnement.etat == etat)
    elif membre.est_gestionnaire:
        req = req.where(DossierAccompagnement.etat != Etat.SUPPRIME)
    if membre_id and membre.est_gestionnaire:
        req = req.where(DossierAccompagnement.membre_id == membre_id)
    # Recherche legacy (cht01) sur l'objet, élargie à la référence
    if (cond := recherche(q, DossierAccompagnement.objet, DossierAccompagnement.reference)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(DossierAccompagnement.date_creation.desc(), DossierAccompagnement.id.desc()), page)
    return Liste(items=[_resume(i) for i in items], total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db, membre: MembreReq):
    req = _visibles(
        select(DossierAccompagnement.type_dossier, func.count()).group_by(DossierAccompagnement.type_dossier), membre
    )
    if membre.est_gestionnaire:
        req = req.where(DossierAccompagnement.etat != Etat.SUPPRIME)
    par_type = {t: 0 for t in qa.QUESTIONNAIRES}
    for t, n in db.execute(req).all():
        par_type[int(t)] = int(n)
    return s.Compteurs(par_type=par_type, total=sum(par_type.values()))


def _obtenir(db: Db, id_: int, membre: Membre) -> DossierAccompagnement:
    fiche = db.get(DossierAccompagnement, id_)
    if fiche is None:
        raise introuvable("Ce dossier n'existe pas.")
    if membre.est_gestionnaire or (fiche.membre_id == membre.id and fiche.etat != Etat.SUPPRIME):
        return fiche
    # Plus de consultation par URL du dossier d'un autre membre (correctif S7-3)
    raise introuvable("Ce dossier n'existe pas ou ne vous est pas accessible.")


@router.get("/{id_}", response_model=s.DossierDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, id_, membre)
    d = _resume(fiche, s.DossierDetail)
    q = qa.questionnaire(fiche.type_dossier)
    # Toutes les réponses enregistrées sont rechargées (correctif S7a : le legacy les effaçait à l'affichage)
    d.reponses = qa.nettoyer_reponses(q, fiche.reponses or {}) if q else dict(fiche.reponses or {})
    if membre.est_gestionnaire and fiche.membre:
        d.contact = s.ContactMembre.model_validate(fiche.membre)
    d.peut_modifier = _peut_modifier(fiche, membre)
    d.peut_moderer = membre.peut_moderer()
    return d


def _peut_modifier(fiche: DossierAccompagnement, membre: Membre) -> bool:
    if membre.peut_moderer():
        return True
    return fiche.membre_id == membre.id and fiche.etat in (Etat.NON_TRAITE, Etat.AUTORISE)


def _valider(db: Db, q: qa.Questionnaire, objet: str, membre_id: int, exclure_id: int | None = None) -> None:
    if len(objet) < qa.OBJET_MIN:
        raise erreur(qa.MESSAGE_OBJET, objet=qa.MESSAGE_OBJET)
    # Unicité membre + objet par type de dossier (messages legacy, F-S7-18)
    doublon = select(DossierAccompagnement.id).where(
        DossierAccompagnement.type_dossier == q.type, DossierAccompagnement.membre_id == membre_id,
        DossierAccompagnement.objet == objet, DossierAccompagnement.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(DossierAccompagnement.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur(q.message_doublon, objet="Vous avez déjà un dossier avec cet objet : ouvrez-le pour le compléter.")


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.DossierEntree, db: Db, membre: MembreReq):
    q = qa.questionnaire(donnees.type_dossier)
    if q is None:
        raise erreur("Type d'accompagnement inconnu.", type_dossier="Type d'accompagnement inconnu.")
    objet = donnees.objet.strip()
    _valider(db, q, objet, membre.id)
    fiche = DossierAccompagnement(
        type_dossier=q.type, membre_id=membre.id, objet=objet,
        reponses=qa.nettoyer_reponses(q, donnees.reponses),
        etat=Etat.AUTORISE if donnees.envoyer else Etat.NON_TRAITE,
        reference=nouvelle_reference(db, q.prefixe),
    )
    db.add(fiche)
    db.commit()
    return Ok(message=q.message_envoi if donnees.envoyer else q.message_sauvegarde, id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.DossierModification, db: Db, membre: MembreReq):
    fiche = _obtenir(db, id_, membre)
    verifier_modification(membre, fiche.membre_id)
    if not _peut_modifier(fiche, membre):
        raise erreur("Ce dossier est clôturé : écrivez à votre conseiller pour le rouvrir.")
    q = qa.questionnaire(fiche.type_dossier)
    if q is None:
        raise erreur("Type d'accompagnement inconnu.")
    objet = donnees.objet.strip()
    _valider(db, q, objet, fiche.membre_id or membre.id, exclure_id=fiche.id)
    fiche.objet = objet
    fiche.reponses = qa.nettoyer_reponses(q, donnees.reponses)  # nouvel objet : SQLAlchemy détecte le changement
    if donnees.envoyer and fiche.etat == Etat.NON_TRAITE:
        fiche.etat = Etat.AUTORISE
    db.commit()
    return Ok(message=q.message_envoi if donnees.envoyer else "Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    """Validation par le conseiller (gestionnaire avec droit « Activation ») ; le membre est prévenu."""
    fiche = _obtenir(db, id_, membre)
    ancien = fiche.etat
    changer_etat(fiche, donnees.etat, membre)
    q = qa.questionnaire(fiche.type_dossier)
    if fiche.membre_id and fiche.etat != ancien and fiche.membre_id != membre.id:
        db.add(Message(
            membre_id=fiche.membre_id, auteur_id=None, de_la_frangine=True,
            texte=NOTIFICATIONS[Etat(fiche.etat)].format(ref=fiche.reference, libelle=q.libelle if q else "accompagnement"),
        ))
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = _obtenir(db, id_, membre)
    supprimer(fiche, membre, colonne_auteur="membre_id")
    db.commit()
    return Ok(message="Dossier supprimé.", id=fiche.id)


routers = [router]
