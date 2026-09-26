"""Devenir distributeur Forever Living Products : assistant d'adhésion en 10 étapes + paiement du kit
(legacy choix5.php?opaf=1&ppa=3, incl-adhesion.php ; F-S5-20 à F-S5-39) et suivi des
souscriptions par les gestionnaires (écran absent du legacy : `incl-choix5A3.php` manquant).
Règles et paiement (type 6) : `services/distributeur.py`."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreOpt, MembreReq, Page
from app.enums import Etat, ModeSouscription
from app.erreurs import introuvable
from app.models import Membre, Message, Souscription
from app.schemas import distributeur as s
from app.schemas.commun import Liste, Ok
from app.services import distributeur as svc
from app.services.fiches import changer_etat, paginer, recherche

router = APIRouter(prefix="/distributeur", tags=["Devenir distributeur"])


def _resume(db: Db, souscription: Souscription, schema=s.SouscriptionResume):
    o = schema.model_validate(souscription)
    o.etat_paiement = svc.etat_paiement(db, souscription)
    return o


def _detail(db: Db, souscription: Souscription, membre) -> s.SouscriptionDetail:
    d = _resume(db, souscription, s.SouscriptionDetail)
    d.formations = list(souscription.formations or [])
    d.filleuls = list(souscription.filleuls or [])
    d.kit = [
        s.LigneKitOut(produit_id=p.produit_id, nom=p.produit.nom if p.produit else "", prix_unitaire=p.prix_unitaire,
                      quantite=p.quantite)
        for p in souscription.produits
    ]
    d.peut_moderer = membre.peut_moderer()
    return d


@router.get("/statut", response_model=s.Statut)
def statut(db: Db, membre: MembreOpt):
    """Où en est le lecteur (visiteur, membre, adhésion en cours, distributeur) ?"""
    if membre is None:
        return s.Statut(connecte=False)
    souscription = svc.souscription_de(db, membre.id)
    return s.Statut(
        connecte=True, gestionnaire=membre.est_gestionnaire, distributeur=svc.est_distributeur(db, membre),
        souscription=_resume(db, souscription) if souscription else None,
    )


@router.get("/kit", response_model=list[s.ProduitKit])
def kit(db: Db, membre: MembreReq):
    """Produits proposés pour le kit de démarrage : **tous** les produits actifs ayant un prix
    distributeur (ADR-0007 S5b), triés par nom comme le legacy."""
    return svc.produits_du_kit(db)


@router.get("/souscription", response_model=s.SouscriptionDetail | None)
def ma_souscription(db: Db, membre: MembreReq):
    """Souscription du membre connecté (pré-remplissage de l'assistant, F-S5-22), ou `null`."""
    souscription = svc.souscription_de(db, membre.id)
    return _detail(db, souscription, membre) if souscription else None


@router.put("/souscription", response_model=s.EtapeOk)
def enregistrer_etape(donnees: s.EtapeEntree, db: Db, membre: MembreReq):
    """Sauvegarde d'une étape (création de la souscription à la première sauvegarde, référence
    `SOA…`). Étape 9 : « Sauvegarder » sans contrôle, « Envoyer » avec les contrôles de montant
    (F-S5-33). Après envoi en fonds propres, `a_payer` indique d'aller au paiement (type 6)."""
    souscription, message = svc.enregistrer_etape(db, membre, donnees)
    db.commit()
    a_payer = (
        donnees.etape == svc.DERNIERE_ETAPE and donnees.envoyer
        and souscription.mode_souscription == ModeSouscription.FOND_PROPRE and souscription.etat not in svc.ETATS_DISTRIBUTEUR
    )
    return s.EtapeOk(
        message=message, id=souscription.id, reference=souscription.reference,
        etape_courante=souscription.etape_courante, a_payer=a_payer, montant=souscription.montant,
    )


# --- Suivi des souscriptions (gestionnaires) -------------------------------------------------------


@router.get("/souscriptions", response_model=Liste[s.SouscriptionResume])
def lister(
    db: Db,
    membre: Gestionnaire,
    page: Page,
    q: str | None = None,
    etat: Annotated[int | None, Query(ge=1, le=4)] = None,
    mode: Annotated[int | None, Query(ge=1, le=2)] = None,
    envoyees: bool = False,
):
    """Écran de suivi (F-S5-21, ADR-0007 S5c) : toutes les souscriptions, filtrables par état, mode
    (les demandes à crédit envoyées sont à traiter par la frangine) et recherche (référence, membre)."""
    req = (
        select(Souscription)
        .options(selectinload(Souscription.membre))
        .join(Membre, Souscription.membre_id == Membre.id)
    )
    req = req.where(Souscription.etat == etat) if etat else req.where(Souscription.etat != Etat.SUPPRIME)
    if mode:
        req = req.where(Souscription.mode_souscription == mode)
    if envoyees:
        req = req.where(Souscription.etape_courante >= svc.ETAPE_ENVOYEE)
    if (cond := recherche(q, Souscription.reference, Membre.nom, Membre.pseudonyme, Membre.telephone)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Souscription.date_creation.desc(), Souscription.id.desc()), page)
    return Liste(items=[_resume(db, x) for x in items], total=total, page=page.page, taille=page.taille)


@router.get("/souscriptions/{id_}", response_model=s.SouscriptionDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    """Fiche complète : le souscripteur lui-même ou un gestionnaire."""
    souscription = db.get(Souscription, id_)
    if souscription is None or not (membre.est_gestionnaire or souscription.membre_id == membre.id):
        raise introuvable("Souscription introuvable.")
    return _detail(db, souscription, membre)


@router.post("/souscriptions/{id_}/etat", response_model=Ok)
def changer(id_: int, donnees: s.EtatEntree, db: Db, membre: Gestionnaire):
    """Traitement par un gestionnaire ayant le droit « Activation » : valider (2) une souscription à
    crédit fait du membre un distributeur ; le membre est prévenu par la messagerie."""
    souscription = db.get(Souscription, id_)
    if souscription is None:
        raise introuvable("Souscription introuvable.")
    avant = souscription.etat
    changer_etat(souscription, donnees.etat, membre)
    if donnees.etat == Etat.AUTORISE and avant != Etat.AUTORISE:
        db.add(Message(
            membre_id=souscription.membre_id, auteur_id=membre.id, de_la_frangine=True,
            texte=f"Bonne nouvelle : votre souscription distributeur {souscription.reference} est validée. "
                  "Vous bénéficiez désormais du prix distributeur sur la boutique.",
        ))
    db.commit()
    return Ok(message="Modification effectuée.", id=souscription.id)


routers = [router]
