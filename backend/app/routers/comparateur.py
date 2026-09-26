"""Comparateur de prix B2B (legacy : choix6.php?rere=2, incl-choix6B.php, incl-prospective.php,
pproduitptpv.php). Inventaire : S6-3, S6-4, F-S6-14 à F-S6-22.

ADR-0007 S6a : la fiche est rattachée à l'**entreprise** du membre (plus à l'id du membre),
seul le propriétaire (ou un gestionnaire habilité) modifie ses lignes, et la consultation est
réservée aux comptes entreprise (« Il faut avoir un compte entreprise pour y avoir accès. »)."""

from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreOpt, MembreReq, Page, exiger_droit, peut_modifier
from app.enums import Etat, OffreDemande
from app.erreurs import erreur, interdit, introuvable
from app.models import Entreprise, FicheProspective, LigneProspective, Parametre, ProduitProspective
from app.schemas import comparateur as s
from app.schemas.commun import Liste, Ok
from app.schemas.entreprises import EntrepriseOption
from app.services import emails
from app.services.entreprises import (
    MESSAGE_COMPTE_ENTREPRISE,
    entreprises_de,
    exiger_compte_entreprise,
    normaliser_nom_produit,
    produit_par_nom,
    resoudre_produit,
    verifier_nom_produit,
)
from app.services.fiches import paginer, recherche

router = APIRouter(prefix="/comparateur", tags=["Comparateur de prix"])


def _publiees(req):
    """Lignes visibles dans le comparateur : ligne, fiche, entreprise et produit publiés."""
    return req.where(
        LigneProspective.etat == Etat.AUTORISE,
        FicheProspective.etat == Etat.AUTORISE,
        Entreprise.etat == Etat.AUTORISE,
        ProduitProspective.etat == Etat.AUTORISE,
    )


def _jointures(req):
    return (
        req.join(FicheProspective, LigneProspective.fiche_id == FicheProspective.id)
        .join(Entreprise, FicheProspective.entreprise_id == Entreprise.id)
        .join(ProduitProspective, LigneProspective.produit_id == ProduitProspective.id)
    )


# --- Accès ----------------------------------------------------------------------------------------


@router.get("/acces", response_model=s.Acces)
def acces(db: Db, membre: MembreOpt):
    """Indique au frontend s'il peut afficher le comparateur, ou quel message et quelle action
    proposer (F-S6-14, F-S6-15)."""
    if membre is None:
        return s.Acces(acces=False, motif="visiteur", message=MESSAGE_COMPTE_ENTREPRISE)
    ents = [EntrepriseOption.model_validate(e) for e in entreprises_de(db, membre)]
    if membre.est_gestionnaire:
        return s.Acces(acces=True, gestionnaire=True, entreprises=ents)
    if not membre.est_morale:
        return s.Acces(acces=False, motif="personne_physique", message=MESSAGE_COMPTE_ENTREPRISE, entreprises=ents)
    if not ents:
        return s.Acces(acces=False, motif="sans_entreprise", message=MESSAGE_COMPTE_ENTREPRISE)
    return s.Acces(acces=True, entreprises=ents)


# --- Catalogue des produits (pproduitptpv.php) ------------------------------------------------------


@router.get("/produits", response_model=list[s.ProduitOut])
def produits(db: Db, membre: MembreReq, q: Annotated[str | None, Query(max_length=100)] = None, tous: bool = False):
    """Produits du comparateur avec le nombre d'offres et de demandes publiées. `tous` (gestionnaire) :
    produits retirés compris, pour l'écran de gestion du catalogue."""
    exiger_compte_entreprise(db, membre)
    req = select(ProduitProspective)
    if not (tous and membre.est_gestionnaire):
        req = req.where(ProduitProspective.etat == Etat.AUTORISE)
    if (cond := recherche(q, ProduitProspective.nom)) is not None:
        req = req.where(cond)
    items = db.scalars(req.order_by(ProduitProspective.nom)).all()
    comptes = db.execute(
        _publiees(_jointures(select(LigneProspective.produit_id, LigneProspective.offre_ou_demande, func.count())))
        .group_by(LigneProspective.produit_id, LigneProspective.offre_ou_demande)
    ).all()
    par_produit: dict[tuple[int, int], int] = {(p, t): n for p, t, n in comptes}
    return [
        s.ProduitOut(
            id=p.id, nom=p.nom, etat=p.etat,
            offres=par_produit.get((p.id, OffreDemande.OFFRE), 0),
            demandes=par_produit.get((p.id, OffreDemande.DEMANDE), 0),
        )
        for p in items
    ]


@router.post("/produits", response_model=Ok, status_code=201)
def creer_produit(donnees: s.ProduitEntree, db: Db, membre: Gestionnaire):
    exiger_droit(membre, "activation")
    nom = normaliser_nom_produit(donnees.nom)
    verifier_nom_produit(nom)
    if produit_par_nom(db, nom):
        raise erreur("Ce produit est déjà enregistré.", nom="Ce produit est déjà enregistré.")
    produit = ProduitProspective(nom=nom, etat=donnees.etat)
    db.add(produit)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=produit.id)


@router.put("/produits/{id_}", response_model=Ok)
def modifier_produit(id_: int, donnees: s.ProduitEntree, db: Db, membre: Gestionnaire):
    exiger_droit(membre, "activation")
    produit = db.get(ProduitProspective, id_)
    if produit is None:
        raise introuvable("Produit introuvable.")
    nom = normaliser_nom_produit(donnees.nom)
    verifier_nom_produit(nom)
    if produit_par_nom(db, nom, exclure_id=produit.id):
        raise erreur("Ce produit est déjà enregistré.", nom="Ce produit est déjà enregistré.")
    produit.nom = nom
    produit.etat = donnees.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=produit.id)


# --- Consultation (incl-choix6B.php) ----------------------------------------------------------------


@router.get("/lignes", response_model=Liste[s.LigneComparee])
def lignes(
    db: Db,
    membre: MembreOpt,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=2)] = None,
    produit_id: int | None = None,
    entreprise_id: int | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    tri: Literal["prix", "prix_desc", "recent"] = "prix",
):
    """Tableau comparatif (F-S6-16, corrigé : nom du produit affiché, lignes publiées seulement)."""
    exiger_compte_entreprise(db, membre)
    req = _publiees(_jointures(select(LigneProspective))).options(
        selectinload(LigneProspective.produit),
        selectinload(LigneProspective.fiche).selectinload(FicheProspective.entreprise).selectinload(Entreprise.ville),
    )
    if type:
        req = req.where(LigneProspective.offre_ou_demande == type)
    if produit_id:
        req = req.where(LigneProspective.produit_id == produit_id)
    if entreprise_id:
        req = req.where(FicheProspective.entreprise_id == entreprise_id)
    if (cond := recherche(q, ProduitProspective.nom, Entreprise.nom, LigneProspective.fournisseur_ou_client)) is not None:
        req = req.where(cond)
    ordre = {
        "prix": (LigneProspective.prix, ProduitProspective.nom),
        "prix_desc": (LigneProspective.prix.desc(), ProduitProspective.nom),
        "recent": (LigneProspective.id.desc(),),
    }[tri]
    items, total = paginer(db, req.order_by(*ordre, LigneProspective.id), page)
    sortie = [
        s.LigneComparee.model_validate({**s.LigneOut.model_validate(li).model_dump(), "entreprise": li.fiche.entreprise})
        for li in items
    ]
    return Liste(items=sortie, total=total, page=page.page, taille=page.taille)


# --- Fiche de l'entreprise du membre (incl-prospective.php) -----------------------------------------


def _entreprise_modifiable(db: Db, membre, entreprise_id: int | None) -> Entreprise:
    """Entreprise dont le membre gère la fiche : la sienne, ou n'importe laquelle pour un
    gestionnaire habilité. Sans précision, la première entreprise du membre."""
    exiger_compte_entreprise(db, membre)
    if entreprise_id is None:
        ents = entreprises_de(db, membre)
        if not ents:
            raise erreur("Déclarez d'abord votre entreprise dans l'annuaire.")
        return ents[0]
    entreprise = db.get(Entreprise, entreprise_id)
    if entreprise is None or entreprise.etat == Etat.SUPPRIME:
        raise introuvable("Cette entreprise n'existe pas ou n'est plus publiée.")
    if not peut_modifier(membre, entreprise.membre_id):
        raise interdit("Seule l'entreprise propriétaire de la fiche ou un gestionnaire habilité peut la modifier.")
    return entreprise


def _fiche(db: Db, entreprise: Entreprise) -> FicheProspective | None:
    return db.scalar(select(FicheProspective).where(FicheProspective.entreprise_id == entreprise.id))


@router.get("/ma-fiche", response_model=s.FicheDetail)
def ma_fiche(db: Db, membre: MembreReq, entreprise_id: int | None = None):
    """En-tête de l'entreprise + lignes d'offres et de demandes de **cette** fiche seulement
    (F-S6-18, F-S6-21 corrigé)."""
    entreprise = _entreprise_modifiable(db, membre, entreprise_id)
    fiche = _fiche(db, entreprise)
    offres: list[s.LigneOut] = []
    demandes: list[s.LigneOut] = []
    if fiche is not None:
        rangees = db.scalars(
            select(LigneProspective)
            .join(ProduitProspective, LigneProspective.produit_id == ProduitProspective.id)
            .where(LigneProspective.fiche_id == fiche.id)
            .options(selectinload(LigneProspective.produit))
            .order_by(ProduitProspective.nom, LigneProspective.id)
        ).all()
        for li in rangees:
            (offres if li.offre_ou_demande == OffreDemande.OFFRE else demandes).append(s.LigneOut.model_validate(li))
    proprietaire = entreprise.membre
    return s.FicheDetail(
        entreprise=s.EnTeteFiche.model_validate(entreprise),
        sigle=proprietaire.pseudonyme if proprietaire else "",
        fiche_id=fiche.id if fiche else None,
        offres=offres,
        demandes=demandes,
        entreprises=[EntrepriseOption.model_validate(e) for e in entreprises_de(db, membre)],
        peut_modifier=True,
    )


def _valider_ligne(db: Db, d: s.LigneEntree, fiche: FicheProspective | None, exclure_id: int | None = None):
    """Règles legacy (messages exacts) + anti-doublon produit/unité sur la même fiche."""
    champs: dict[str, str] = {}
    if not d.produit_id and not d.nouveau_produit.strip():
        champs["produit_id"] = "Veuillez indiquer le produit."
    if not d.unite_vente.strip():
        champs["unite_vente"] = "Veuillez indiquer l'unité de vente."
    if d.prix <= 0:
        champs["prix"] = "Veuillez indiquer le prix."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    produit = resoudre_produit(db, d.produit_id, d.nouveau_produit)
    if fiche is not None:
        doublon = select(LigneProspective.id).where(
            LigneProspective.fiche_id == fiche.id,
            LigneProspective.offre_ou_demande == d.offre_ou_demande,
            LigneProspective.produit_id == produit.id,
            func.lower(LigneProspective.unite_vente) == d.unite_vente.strip().lower(),
        )
        if exclure_id:
            doublon = doublon.where(LigneProspective.id != exclure_id)
        if db.scalar(doublon.limit(1)):
            quoi = "vos offres" if d.offre_ou_demande == OffreDemande.OFFRE else "vos demandes"
            raise erreur(f"Ce produit figure déjà dans {quoi} avec cette unité : modifiez la ligne existante.")
    return produit


def _appliquer_ligne(ligne: LigneProspective, d: s.LigneEntree, produit: ProduitProspective) -> None:
    ligne.offre_ou_demande = d.offre_ou_demande
    ligne.produit_id = produit.id
    ligne.unite_vente = d.unite_vente.strip()
    ligne.prix = d.prix
    ligne.quantite_mensuelle = d.quantite_mensuelle
    ligne.fournisseur_ou_client = d.fournisseur_ou_client.strip()


@router.post("/lignes", response_model=Ok, status_code=201)
def ajouter_ligne(donnees: s.LigneEntree, db: Db, membre: MembreReq):
    """Ajout d'une offre ou d'une demande (F-S6-20). L'en-tête de fiche est créé au premier ajout,
    rattaché à l'entreprise (corrigé : plus d'id membre dans `entreprise_id`)."""
    entreprise = _entreprise_modifiable(db, membre, donnees.entreprise_id)
    fiche = _fiche(db, entreprise)
    produit = _valider_ligne(db, donnees, fiche)
    if fiche is None:
        fiche = FicheProspective(membre_id=entreprise.membre_id or membre.id, entreprise_id=entreprise.id, etat=Etat.AUTORISE)
        db.add(fiche)
        db.flush()
    ligne = LigneProspective(fiche_id=fiche.id, etat=Etat.AUTORISE)
    _appliquer_ligne(ligne, donnees, produit)
    db.add(ligne)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=ligne.id)


def _ligne_modifiable(db: Db, membre, id_: int) -> LigneProspective:
    ligne = db.get(LigneProspective, id_)
    if ligne is None:
        raise introuvable("Cette ligne n'existe plus.")
    _entreprise_modifiable(db, membre, ligne.fiche.entreprise_id)
    return ligne


@router.put("/lignes/{id_}", response_model=Ok)
def modifier_ligne(id_: int, donnees: s.LigneEntree, db: Db, membre: MembreReq):
    ligne = _ligne_modifiable(db, membre, id_)
    produit = _valider_ligne(db, donnees, ligne.fiche, exclure_id=ligne.id)
    _appliquer_ligne(ligne, donnees, produit)
    db.commit()
    return Ok(message="Modification effectuée.", id=ligne.id)


@router.delete("/lignes/{id_}", response_model=Ok)
def supprimer_ligne(id_: int, db: Db, membre: MembreReq):
    """Suppression **physique** (comme le legacy), réservée au propriétaire ou au gestionnaire
    habilité (corrigé : le legacy permettait de supprimer les lignes des autres)."""
    ligne = _ligne_modifiable(db, membre, id_)
    db.delete(ligne)
    db.commit()
    return Ok(message="Le produit a été retiré de votre fiche.", id=id_)


# --- E-mail du gestionnaire à l'entreprise (F-S6-22) ----------------------------------------------


@router.post("/entreprises/{entreprise_id}/email", response_model=Ok)
def envoyer_email(entreprise_id: int, donnees: s.EmailEntree, db: Db, membre: Gestionnaire, taches: BackgroundTasks):
    entreprise = db.get(Entreprise, entreprise_id)
    if entreprise is None or entreprise.etat == Etat.SUPPRIME:
        raise introuvable("Cette entreprise n'existe pas ou n'est plus publiée.")
    texte = donnees.message.strip()
    if len(texte) < 10:
        raise erreur("Le message doit avoir 10 caractères minimum.", message="Le message doit avoir 10 caractères minimum.")
    destinataire = entreprise.email or (entreprise.membre.email if entreprise.membre else "") or ""
    if destinataire.find("@") < 1:
        raise erreur("Veuillez vérifier l'adresse mail de l'entreprise.")
    parametre = db.get(Parametre, 1)
    taches.add_task(
        emails.envoyer, destinataire, "Proposition des produits", texte, parametre.email if parametre else None
    )
    return Ok(message="Votre opération a bien été envoyée.", id=entreprise.id)


routers = [router]
