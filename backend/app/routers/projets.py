"""Appels de fonds — financement participatif (legacy : incl-choix4A.php, incl-appelfond.php,
incl-apportfond.php ; suivi des apports d'après la spécification morte incl-paportfond.php).
Inventaire : F-S4-05 à F-S4-26, ADR-0004 (totaux calculés, annulation tardive), ADR-0007 S4a,
ADR-0009 (avertissement : engagements entre membres, sans garantie de La Frangine)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import case, func, select
from sqlalchemy.orm import selectinload

from app.deps import (
    Db,
    Gestionnaire,
    MembreOpt,
    MembreReq,
    Page,
    exiger_droit,
    peut_modifier,
    verifier_modification,
)
from app.enums import Etat, TypeApportFond
from app.erreurs import erreur, interdit, introuvable
from app.models import AppelFond, CollecteFond, Entreprise, Message, SecteurActivite, VersementCollecte, Ville
from app.models.membres import Membre
from app.schemas import projets as s
from app.schemas.commun import Liste, Ok
from app.services import fichiers, fonds
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
from app.services.validation import normaliser_telephone, telephone_valide

router = APIRouter(prefix="/projets", tags=["Appels de fonds"])

INTROUVABLE = "Ce projet n'existe pas ou n'est plus publié."
MINIMUM = 10_001  # devis et besoin : « > 10 000 » (incl-appelfond.php)


def _voit_prive(membre: Membre | None, p: AppelFond) -> bool:
    """Promoteur, coordonnées et liste des apports : porteur du projet et gestionnaires."""
    return membre is not None and (membre.id == p.auteur_id or membre.est_gestionnaire)


def _resume(p: AppelFond, membre: Membre | None) -> s.ProjetResume:
    r = s.ProjetResume.model_validate(p)
    if not _voit_prive(membre, p):
        r.nom_promoteur = None
    r.est_auteur = membre is not None and membre.id == p.auteur_id
    return r


def _completer_apport(db: Db, r: s.ApportResume, c: CollecteFond, montrer_creancier: bool) -> s.ApportResume:
    if montrer_creancier and c.membre is not None:
        r.creancier = s.ContactMembre.model_validate(c.membre)
    r.reste_a_verser = fonds.reste_a_verser(db, c)
    r.en_attente = fonds.paiements_en_attente(db, c) if c.etat != fonds.ANNULE else 0
    return r


def _apport(db: Db, c: CollecteFond, montrer_creancier: bool) -> s.ApportResume:
    return _completer_apport(db, s.ApportResume.model_validate(c), c, montrer_creancier)


# --- Liste et compteurs ---------------------------------------------------------------------------


@router.get("", response_model=Liste[s.ProjetResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: str | None = None,
    secteur_id: int | None = None,
    devis_min: Annotated[int | None, Query(ge=0)] = None,
    besoin_min: Annotated[int | None, Query(ge=0)] = None,
    realisation_min: Annotated[int | None, Query(ge=0, le=100)] = None,
    etat: int | None = None,
    miens: bool = False,
):
    """Liste publique (F-S4-05/06) : le public voit les projets publiés, le porteur aussi les
    siens, le gestionnaire tout (filtre d'état)."""
    req = select(AppelFond).options(selectinload(AppelFond.secteur), selectinload(AppelFond.ville))
    if (cond := visibilite(AppelFond, membre)) is not None:
        req = req.where(cond)
    if membre is not None and membre.est_gestionnaire:
        req = req.where(AppelFond.etat == etat) if etat else req.where(AppelFond.etat != Etat.SUPPRIME)
    if miens and membre is not None:
        req = req.where(AppelFond.auteur_id == membre.id)
    for cond in (
        AppelFond.secteur_id == secteur_id if secteur_id else None,
        AppelFond.devis_projet >= devis_min if devis_min else None,
        AppelFond.besoin_financement >= besoin_min if besoin_min else None,
        AppelFond.niveau_realisation >= realisation_min if realisation_min else None,
        # Correctif : le OR de la recherche est parenthésé (legacy : conditions cassées)
        recherche(q, AppelFond.nom_projet, AppelFond.objet_projet, AppelFond.description_projet, AppelFond.reference),
    ):
        if cond is not None:
            req = req.where(cond)
    items, total = paginer(db, req.order_by(AppelFond.date_creation.desc(), AppelFond.id.desc()), page)
    return Liste(items=[_resume(p, membre) for p in items], total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    n, besoin, promis, collecte = db.execute(
        select(
            func.count(AppelFond.id),
            func.coalesce(func.sum(AppelFond.besoin_financement), 0),
            func.coalesce(func.sum(AppelFond.montant_promis), 0),
            func.coalesce(func.sum(AppelFond.montant_collecte), 0),
        ).where(AppelFond.etat == Etat.AUTORISE)
    ).one()
    return s.Compteurs(projets=n, besoin_total=int(besoin), montant_promis=int(promis), montant_collecte=int(collecte))


@router.get("/mes-entreprises", response_model=list[s.EntrepriseCourte])
def mes_entreprises(db: Db, membre: MembreReq):
    """Entreprises proposées dans le formulaire (facultatif) : celles du membre connecté."""
    return db.scalars(
        select(Entreprise).where(Entreprise.membre_id == membre.id, Entreprise.etat != Etat.SUPPRIME).order_by(Entreprise.nom)
    ).all()


# --- Engagements d'apport (CollecteFond) ----------------------------------------------------------


@router.get("/apports", response_model=s.ListeApports)
def lister_apports(
    db: Db,
    membre: MembreReq,
    page: Page,
    appel_fond_id: int | None = None,
    membre_id: int | None = None,
    etat: int | None = None,
    q: str | None = None,
):
    """« Mes apports » pour un membre ; tous les apports (filtres membre, projet, état, texte) pour
    un gestionnaire (F-S4-25, spécification incl-paportfond.php)."""
    req = select(CollecteFond).options(selectinload(CollecteFond.appel_fond), selectinload(CollecteFond.membre))
    if membre.est_gestionnaire:
        if membre_id:
            req = req.where(CollecteFond.membre_id == membre_id)
    else:
        req = req.where(CollecteFond.membre_id == membre.id)
    for cond in (
        CollecteFond.appel_fond_id == appel_fond_id if appel_fond_id else None,
        CollecteFond.etat == etat if etat else None,
        recherche(q, CollecteFond.remarque, CollecteFond.reference),
    ):
        if cond is not None:
            req = req.where(cond)
    promis, verse = _sommes(db, req)
    items, total = paginer(db, req.order_by(CollecteFond.date_engagement.desc(), CollecteFond.id.desc()), page)
    return s.ListeApports(
        items=[_apport(db, c, membre.est_gestionnaire) for c in items], total=total, page=page.page, taille=page.taille,
        total_promis=promis, total_verse=verse,
    )


def _sommes(db: Db, req) -> tuple[int, int]:
    """Totaux de la liste, avec la même règle que les agrégats d'un projet (ADR-0004)."""
    sous = req.order_by(None).subquery()
    promis, verse = db.execute(
        select(
            func.coalesce(func.sum(case((sous.c.etat == fonds.ANNULE, sous.c.montant_verse), else_=sous.c.montant_promis)), 0),
            func.coalesce(func.sum(sous.c.montant_verse), 0),
        )
    ).one()
    return int(promis), int(verse)


def _collecte(db: Db, id_: int) -> CollecteFond:
    c = db.get(CollecteFond, id_)
    if c is None:
        raise introuvable("Cet apport est introuvable.")
    return c


@router.get("/apports/{id_}", response_model=s.ApportDetail)
def detail_apport(id_: int, db: Db, membre: MembreReq):
    """Fiche d'un apport : créancier, porteur du projet et gestionnaires."""
    c = _collecte(db, id_)
    porteur = c.appel_fond.auteur_id == membre.id
    creancier = c.membre_id == membre.id
    if not (creancier or porteur or membre.est_gestionnaire):
        raise interdit("Cet apport ne vous concerne pas.")
    d = s.ApportDetail.model_validate(c)
    _completer_apport(db, d, c, porteur or membre.est_gestionnaire)
    d.est_creancier = creancier
    d.peut_gerer = membre.peut_moderer()
    d.peut_declarer = creancier and c.etat != fonds.ANNULE and fonds.reste_a_verser(db, c, inclure_attente=True) > 0
    return d


@router.post("/apports/{id_}/valider", response_model=Ok)
def valider_apport(id_: int, db: Db, membre: MembreReq):
    """Accusé de validation par la frangine (1 → 2). La promesse est déjà comptée dans « promis »
    depuis sa création (ADR-0007 S4a) : aucun double comptage."""
    exiger_droit(membre, "activation")
    c = _collecte(db, id_)
    if c.etat != Etat.NON_TRAITE:
        raise erreur("Seule une promesse en attente peut être validée.")
    c.etat = Etat.AUTORISE
    fonds.recalculer_appel(db, c.appel_fond)
    db.commit()
    return Ok(message="Promesse d'apport validée.", id=c.id, reference=c.reference)


@router.post("/apports/{id_}/annuler", response_model=Ok)
def annuler_apport(id_: int, db: Db, membre: MembreReq):
    """Annulation (→ 3) : seule la part non versée est retirée du « promis » (ADR-0004)."""
    exiger_droit(membre, "activation")
    c = _collecte(db, id_)
    if c.etat == fonds.ANNULE:
        raise erreur("Cet apport est déjà annulé.")
    c.etat = fonds.ANNULE
    fonds.recalculer_appel(db, c.appel_fond)
    if c.membre_id:
        db.add(Message(membre_id=c.membre_id, de_la_frangine=True, texte=(
            f"Votre promesse d'apport {c.reference} au projet « {c.appel_fond.nom_projet} » a été annulée par "
            f"la frangine. Les versements déjà reçus ({fonds.montant_lisible(c.montant_verse)} FCFA) restent comptés."
        )))
    db.commit()
    return Ok(message="Apport annulé : la part non versée a été retirée du montant promis.", id=c.id)


@router.post("/apports/{id_}/versements", response_model=Ok, status_code=201)
def enregistrer_versement(id_: int, donnees: s.VersementEntree, db: Db, membre: MembreReq):
    """Saisie d'un versement reçu par la frangine (gestionnaire, droit Activation)."""
    exiger_droit(membre, "activation")
    c = _collecte(db, id_)
    if c.etat == fonds.ANNULE:
        raise erreur("Cet apport est annulé : aucun versement ne peut y être ajouté.")
    if donnees.montant <= 0:
        raise erreur("Veuillez corriger les champs signalés.", montant="Veuillez indiquer le montant du versement.")
    reste = fonds.reste_a_verser(db, c)
    if donnees.montant > reste:
        raise erreur("Le versement est supérieur au montant promis.",
                     montant=f"Reste à verser : {fonds.montant_lisible(reste)} FCFA.")
    jour = donnees.date_versement or date.today()
    if jour > date.today():
        raise erreur("Veuillez corriger les champs signalés.", date_versement="La date du versement ne peut être future.")
    doublon = db.scalar(select(VersementCollecte.id).where(
        VersementCollecte.collecte_id == c.id, VersementCollecte.date_versement == jour,
        VersementCollecte.montant == donnees.montant, VersementCollecte.etat == Etat.AUTORISE,
    ).limit(1))
    if doublon:
        raise erreur("Ce versement est déjà enregistré.")
    if donnees.observation_mediateur is not None:
        c.observation_mediateur = donnees.observation_mediateur.strip()
    v = fonds.ajouter_versement(db, c, donnees.montant, jour)
    if c.membre_id:
        db.add(Message(membre_id=c.membre_id, de_la_frangine=True, texte=(
            f"Nous avons bien reçu votre versement de {fonds.montant_lisible(donnees.montant)} FCFA pour l'apport "
            f"{c.reference} (projet « {c.appel_fond.nom_projet} »). Merci ! Reste à verser : "
            f"{fonds.montant_lisible(fonds.reste_a_verser(db, c))} FCFA."
        )))
    db.commit()
    return Ok(message="Versement enregistré.", id=v.id, reference=c.reference)


# --- Fiche projet --------------------------------------------------------------------------------


def _detail(db: Db, p: AppelFond, membre: Membre | None) -> s.ProjetDetail:
    d = s.ProjetDetail.model_validate(p)
    prive = _voit_prive(membre, p)
    if not prive:
        d.nom_promoteur = d.telephone_promoteur = d.email_promoteur = d.adresse_promoteur = None
    est_auteur = membre is not None and membre.id == p.auteur_id
    d.est_auteur = est_auteur
    d.peut_modifier = peut_modifier(membre, p.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    d.peut_evaluer = membre is not None and membre.est_gestionnaire
    d.peut_apporter = membre is not None and not est_auteur and p.etat == Etat.AUTORISE
    engagements = sorted(p.engagements, key=lambda c: (c.date_engagement or date.min, c.id), reverse=True)
    d.nombre_apports = sum(1 for c in engagements if c.etat != fonds.ANNULE)
    if membre is not None:
        d.mes_apports = [_apport(db, c, False) for c in engagements if c.membre_id == membre.id]
    if prive:
        d.apports = [_apport(db, c, True) for c in engagements]
    return d


@router.get("/{id_}", response_model=s.ProjetDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    compter_visite(p, membre)  # F-S4-20 : incrémenté à chaque consultation d'un tiers
    db.commit()
    return _detail(db, p, membre)


@router.get("/{id_}/apports", response_model=list[s.ApportResume])
def apports_du_projet(id_: int, db: Db, membre: MembreReq):
    """Apports reçus par un projet : porteur et gestionnaires."""
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    if not _voit_prive(membre, p):
        raise interdit("La liste des apports est réservée au porteur du projet et à la frangine.")
    return [_apport(db, c, True) for c in sorted(p.engagements, key=lambda c: c.id, reverse=True)]


# --- Création / modification ---------------------------------------------------------------------


def _valider(db: Db, d: s.ProjetEntree, auteur_id: int, exclure_id: int | None = None) -> str:
    """Règles legacy d'incl-appelfond.php, **toutes bloquantes** (correctif F-S4-11 : le contrôle du
    téléphone n'efface plus les autres erreurs). Retourne le téléphone normalisé."""
    champs: dict[str, str] = {}
    nom = d.nom_projet.strip()
    if len(nom) < 11:
        champs["nom_projet"] = "Le nom du projet doit avoir plus de 10 caractères."
    if len(d.objet_projet.strip()) < 11:
        champs["objet_projet"] = "Veuillez indiquer l'objet du projet avec 11 caractères minimum."
    if not d.secteur_id or db.get(SecteurActivite, d.secteur_id) is None:
        champs["secteur_id"] = "Veuillez indiquer le secteur d'activité du projet."
    if len(d.description_activite.strip()) < 31:
        champs["description_activite"] = "Veuillez décrire l'activité avec plus de 30 caractères."
    if len(d.description_projet.strip()) < 31:
        champs["description_projet"] = "Veuillez décrire le projet avec plus de 30 caractères."
    if d.devis_projet < MINIMUM:
        champs["devis_projet"] = "Veuillez mentionner le montant du projet (plus de 10 000 FCFA)."
    if d.besoin_financement < MINIMUM:
        champs["besoin_financement"] = "Veuillez mentionner le montant du besoin (plus de 10 000 FCFA)."
    if "devis_projet" not in champs and "besoin_financement" not in champs:
        if d.devis_projet < d.apport_fond_propre or d.devis_projet < d.besoin_financement:
            champs["devis_projet"] = "Le montant du projet ne peut être inférieur à l'apport ou au besoin de fonds."
        elif d.besoin_financement > d.devis_projet - d.apport_fond_propre:
            champs["besoin_financement"] = (
                "Le montant du besoin de fonds ne peut être supérieur à la différence entre le montant du projet "
                "et l'apport de fonds."
            )
    if len(d.nom_promoteur.strip()) < 6:
        champs["nom_promoteur"] = "Le nom du promoteur du projet doit avoir plus de 5 caractères."
    tel = normaliser_telephone(d.telephone_promoteur)
    if not telephone_valide(tel):
        champs["telephone_promoteur"] = "Veuillez vérifier le numéro de téléphone du promoteur du projet."
    if not d.ville_id or db.get(Ville, d.ville_id) is None:
        champs["ville_id"] = "Veuillez indiquer la ville du projet."
    if d.entreprise_id:
        e = db.get(Entreprise, d.entreprise_id)
        if e is None or e.etat == Etat.SUPPRIME or e.membre_id != auteur_id:
            champs["entreprise_id"] = "Choisissez une entreprise enregistrée à votre nom."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(AppelFond.id).where(func.lower(AppelFond.nom_projet) == nom.lower(), AppelFond.etat != Etat.SUPPRIME)
    if exclure_id:
        doublon = doublon.where(AppelFond.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Ce projet est déjà enregistré.", nom_projet="Un projet porte déjà ce nom.")
    return tel


def _appliquer(p: AppelFond, d: s.ProjetEntree, tel: str) -> None:
    p.entreprise_id = d.entreprise_id or None
    p.secteur_id = d.secteur_id
    p.ville_id = d.ville_id
    p.nom_projet = d.nom_projet.strip()
    p.objet_projet = d.objet_projet.strip()
    p.description_activite = d.description_activite.strip()
    p.description_projet = d.description_projet.strip()
    p.devis_projet = d.devis_projet
    p.apport_fond_propre = d.apport_fond_propre
    p.besoin_financement = d.besoin_financement
    p.niveau_realisation = d.niveau_realisation
    p.nom_promoteur = d.nom_promoteur.strip()
    p.telephone_promoteur = tel
    # Correctif : e-mail et adresse dans les bons champs (legacy : inversés à la création)
    p.email_promoteur = d.email_promoteur or ""
    p.adresse_promoteur = d.adresse_promoteur.strip()


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.ProjetEntree, db: Db, membre: MembreReq):
    tel = _valider(db, donnees, membre.id)
    p = AppelFond(auteur_id=membre.id, etat=Etat.AUTORISE, montant_promis=0, montant_collecte=0)  # publié (legacy)
    _appliquer(p, donnees, tel)
    p.reference = nouvelle_reference(db, Prefixe.APPEL_FOND)
    db.add(p)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=p.id, reference=p.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.ProjetEntree, db: Db, membre: MembreReq):
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, p.auteur_id)
    tel = _valider(db, donnees, p.auteur_id or membre.id, exclure_id=p.id)
    _appliquer(p, donnees, tel)
    db.commit()
    return Ok(message="Modification effectuée.", id=p.id, reference=p.reference)


@router.post("/{id_}/evaluation", response_model=Ok)
def evaluer(id_: int, donnees: s.EvaluationEntree, db: Db, membre: Gestionnaire):
    """Observations et appréciation /10 de la frangine (F-S4-19) : visibles de tous, en lecture seule."""
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    p.observation_gestionnaire = donnees.observation_gestionnaire.strip()
    p.appreciation = donnees.appreciation
    db.commit()
    return Ok(message="Modification effectuée.", id=p.id)


@router.post("/{id_}/presentation", response_model=Ok)
async def presentation(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    """Dossier de présentation en PDF (F-S4-16)."""
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, p.auteur_id)
    ancien = p.presentation_pdf
    p.presentation_pdf = await fichiers.enregistrer(fichier, "financement", {fichiers.PDF}, champ="presentation")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Dossier de présentation enregistré.", id=p.id)


@router.post("/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, p.auteur_id)
    ancien = p.photo
    p.photo = await fichiers.enregistrer(fichier, "financement", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=p.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    changer_etat(p, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=p.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    supprimer(p, membre)
    db.commit()
    return Ok(message="Projet supprimé.", id=p.id)


# --- Promesse d'apport (« Intéressement ») -------------------------------------------------------


@router.post("/{id_}/apports", response_model=Ok, status_code=201)
def apporter(id_: int, donnees: s.ApportEntree, db: Db, membre: MembreReq):
    """Promesse d'apport (F-S4-21 à F-S4-24) : comptée immédiatement dans « promis » (ADR-0007 S4a)."""
    p = obtenir(db, AppelFond, id_, membre, message=INTROUVABLE)
    if p.auteur_id == membre.id:
        raise erreur("Vous ne pouvez pas promettre un apport à votre propre projet.")
    if p.etat != Etat.AUTORISE:
        raise erreur("Ce projet n'est pas ouvert aux apports pour le moment.")
    champs: dict[str, str] = {}
    if donnees.type_apport not in {t.value for t in TypeApportFond}:
        champs["type_apport"] = "Veuillez indiquer le type de l'apport de fonds."
    if donnees.montant_promis <= 0:
        champs["montant_promis"] = "Veuillez indiquer le montant de l'apport."
    elif donnees.montant_promis > p.besoin_financement:
        champs["montant_promis"] = "Le montant de l'apport ne peut être supérieur au besoin de fonds."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    aujourdhui = date.today()
    doublon = db.scalar(select(CollecteFond.id).where(
        CollecteFond.appel_fond_id == p.id, CollecteFond.membre_id == membre.id,
        CollecteFond.date_engagement == aujourdhui, CollecteFond.montant_promis == donnees.montant_promis,
        CollecteFond.etat != fonds.ANNULE,
    ).limit(1))
    if doublon:
        raise erreur("Cette fiche est déjà enregistrée.")
    c = CollecteFond(
        reference=nouvelle_reference(db, Prefixe.APPORT_FOND), appel_fond_id=p.id, membre_id=membre.id,
        date_engagement=aujourdhui, type_apport=donnees.type_apport, montant_promis=donnees.montant_promis,
        echeance_mois=donnees.echeance_mois, remarque=donnees.remarque.strip(), etat=Etat.NON_TRAITE,
        montant_verse=0,
    )
    db.add(c)
    p.engagements.append(c)
    fonds.recalculer_appel(db, p)
    if p.auteur_id:
        db.add(Message(membre_id=p.auteur_id, de_la_frangine=True, texte=(
            f"Bonne nouvelle : {membre.pseudonyme or 'un membre'} promet un apport de "
            f"{fonds.montant_lisible(c.montant_promis)} FCFA ({TypeApportFond.libelle(c.type_apport)}) à votre projet "
            f"« {p.nom_projet} » (référence {c.reference}). Retrouvez-le dans la fiche de votre projet."
        )))
    db.commit()
    return Ok(message="Votre promesse d'apport est enregistrée. Merci pour votre soutien !", id=c.id, reference=c.reference)


routers = [router]
