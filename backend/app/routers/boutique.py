"""Boutique bien-être (pilier « Bien-être », ADR-0008) : catalogue Forever Living Products, panier
produits, fiches bien-être.

Legacy : incl-venteproduit.php (S5-2, F-S5-07 à F-S5-19) et incl-choix1C.php (S1 « Santé »,
F-S1-27 à F-S1-40), qui partageaient le même panier. Paiement : `services/boutique.py` (type 1)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreOpt, MembreReq, Page
from app.enums import Etat, EtatPaiement, GroupeProduit, TypeObjetPaye
from app.erreurs import erreur, interdit, introuvable
from app.models import LignePanier, Maladie, MaladieProduit, Membre, Paiement, Parametre, Produit
from app.schemas import boutique as s
from app.schemas.commun import Ok
from app.services import boutique as svc
from app.services.distributeur import est_distributeur
from app.services.fiches import compter_visite, paginer, recherche

router = APIRouter(prefix="/boutique", tags=["Boutique"])
panier = APIRouter(prefix="/panier", tags=["Boutique"])
bien_etre = APIRouter(prefix="/bien-etre", tags=["Boutique"])

GROUPES = [g.value for g in GroupeProduit]


def _cond_groupe(groupe: int):
    """`groupe = 0` : produits rangés hors des 20 groupes FLP (données legacy)."""
    return Produit.groupe.not_in(GROUPES) if groupe == 0 else Produit.groupe == groupe


def _avec_prix(produit: Produit, distributeur: bool, schema=s.ProduitResume):
    out = schema.model_validate(produit)
    out.prix = svc.prix_pour(produit, distributeur)
    return out


# --- Catalogue -----------------------------------------------------------------------------------


@router.get("/groupes", response_model=list[s.Groupe])
def groupes(db: Db):
    """Les 20 groupes FLP (F-S5-10) avec le nombre de produits proposés."""
    comptes = dict(db.execute(
        select(Produit.groupe, func.count()).where(Produit.etat == Etat.AUTORISE).group_by(Produit.groupe)
    ).all())
    out = [s.Groupe(groupe=g.value, libelle=g.label, nombre=int(comptes.get(g.value, 0))) for g in GroupeProduit]
    autres = sum(int(n) for g, n in comptes.items() if g not in GROUPES)
    if autres:
        out.append(s.Groupe(groupe=0, libelle="Autres produits Forever", nombre=autres))
    return out


@router.get("/produits", response_model=s.Catalogue)
def catalogue(
    db: Db,
    membre: MembreOpt,
    page: Page,
    q: str | None = None,
    groupe: Annotated[int | None, Query(ge=0, le=20)] = None,
    tri: Literal["", "prix", "prix_desc", "populaires", "nom"] = "",
):
    """Catalogue public (décision F-S5-07/F-S5-08 : consultable sans compte ni adhésion) ; seuls les
    produits actifs sont proposés. Recherche dans la référence, le nom et la description."""
    distributeur = est_distributeur(db, membre)
    colonne_prix = Produit.prix_distributeur if distributeur else Produit.prix_public
    req = select(Produit).where(Produit.etat == Etat.AUTORISE)
    if groupe is not None:
        req = req.where(_cond_groupe(groupe))
    if (cond := recherche(q, Produit.nom, Produit.reference, Produit.description)) is not None:
        req = req.where(cond)
    avec_prix = (colonne_prix > 0).desc()
    ordre = {
        "prix": (avec_prix, colonne_prix.asc(), Produit.nom),
        "prix_desc": (colonne_prix.desc(), Produit.nom),
        "populaires": (Produit.nombre_visites.desc(), Produit.nom),
        "nom": (Produit.nom,),
        # Par défaut : produits disponibles à la vente d'abord (prix connu, en stock)
        "": (avec_prix, (Produit.quantite_stock > 0).desc(), Produit.nom),
    }[tri]
    items, total = paginer(db, req.order_by(*ordre), page)
    return s.Catalogue(
        items=[_avec_prix(p, distributeur) for p in items], total=total, page=page.page, taille=page.taille,
        distributeur=distributeur,
    )


@router.get("/produits/populaires", response_model=list[s.ProduitResume])
def populaires(db: Db, membre: MembreOpt, limite: Annotated[int, Query(ge=1, le=20)] = 10):
    """« Les plus demandés » (F-S5-09), corrigé : vraiment triés par consultations."""
    distributeur = est_distributeur(db, membre)
    produits = db.scalars(
        select(Produit).where(Produit.etat == Etat.AUTORISE)
        .order_by(Produit.nombre_visites.desc(), Produit.nom).limit(limite)
    )
    return [_avec_prix(p, distributeur) for p in produits]


@router.get("/produits/{id_}", response_model=s.ProduitDetail)
def fiche_produit(id_: int, db: Db, membre: MembreOpt):
    """Fiche produit (F-S5-19, F-S1-30) : photo, description, 3 prix, stock ; chaque consultation
    par un visiteur ou un membre incrémente le compteur."""
    produit = db.get(Produit, id_)
    visible = produit is not None and (produit.etat == Etat.AUTORISE or (membre is not None and membre.est_gestionnaire))
    if not visible:
        raise introuvable("Ce produit n'existe pas ou n'est plus proposé.")
    compter_visite(produit, membre)
    db.commit()
    distributeur = est_distributeur(db, membre)
    d = _avec_prix(produit, distributeur, s.ProduitDetail)
    d.distributeur = distributeur
    return d


# --- Panier produits -------------------------------------------------------------------------------


def _panier(db: Db, membre) -> s.Panier:
    lignes = svc.lignes_non_payees(db, membre.id)
    bloquantes, message = svc.lignes_bloquantes(lignes)
    sorties = []
    for li in lignes:
        o = s.LignePanierOut.model_validate(li)
        o.bloquante = li.id in bloquantes
        sorties.append(o)
    montant = svc.total(lignes)
    return s.Panier(
        lignes=sorties, quantite_totale=sum(li.quantite for li in lignes), total=montant,
        payable=bool(lignes) and montant > 0 and not bloquantes, message=message,
        distributeur=est_distributeur(db, membre),
    )


@panier.get("", response_model=s.Panier)
def voir_panier(db: Db, membre: MembreReq):
    """Panier produits du membre (F-S5-14, F-S1-33) ; `payable` = faux si une quantité dépasse le
    stock (F-S5-16, message legacy dans `message`)."""
    return _panier(db, membre)


@panier.post("", response_model=Ok, status_code=201)
def ajouter(donnees: s.AjoutPanier, db: Db, membre: MembreReq):
    n = svc.ajouter(db, membre, donnees.lignes)
    db.commit()
    return Ok(message=f"{n} article{'s' if n > 1 else ''} ajouté{'s' if n > 1 else ''} à votre panier.")


def _ma_ligne(db: Db, membre, id_: int) -> LignePanier:
    ligne = db.get(LignePanier, id_)
    if ligne is None or ligne.type_objet != TypeObjetPaye.PRODUIT:
        raise introuvable("Cette ligne n'est plus dans votre panier.")
    # Correctif F-S5-15 : seul le propriétaire agit sur sa ligne (le legacy ne vérifiait rien)
    if ligne.membre_id != membre.id:
        raise interdit("Cette ligne appartient au panier d'un autre membre.")
    if ligne.paye:
        raise erreur("Cette ligne est déjà payée : elle ne peut plus être modifiée.")
    return ligne


@panier.put("/{id_}", response_model=Ok)
def changer_quantite(id_: int, donnees: s.QuantiteEntree, db: Db, membre: MembreReq):
    """Ajustement de la quantité (le prix figé à l'ajout est conservé)."""
    ligne = _ma_ligne(db, membre, id_)
    ligne.quantite = donnees.quantite
    db.commit()
    return Ok(message="Quantité modifiée.", id=ligne.id)


@panier.delete("/{id_}", response_model=Ok)
def retirer(id_: int, db: Db, membre: MembreReq):
    """Annulation d'une ligne : suppression physique, comme le legacy (ligne non payée seulement)."""
    ligne = _ma_ligne(db, membre, id_)
    db.delete(ligne)
    db.commit()
    return Ok(message="Produit retiré du panier.", id=id_)


@panier.get("/suivi", response_model=s.ListeSuivi)
def suivi(
    db: Db,
    membre: Gestionnaire,
    page: Page,
    etat_paiement: Annotated[int | None, Query(ge=1, le=3)] = None,
    membre_id: int | None = None,
    q: str | None = None,
):
    """Paniers produits de tous les membres avec leur état de paiement (F-S1-40 : N.P., P.N.C., P.C.),
    réservé aux gestionnaires. Lecture seule (le legacy laissait le gestionnaire supprimer les lignes)."""
    req = (
        select(LignePanier)
        .options(selectinload(LignePanier.produit))
        .outerjoin(Paiement, LignePanier.paiement_id == Paiement.id)
        .join(Membre, LignePanier.membre_id == Membre.id)
        .outerjoin(Produit, LignePanier.produit_id == Produit.id)
        .where(LignePanier.type_objet == TypeObjetPaye.PRODUIT)
    )
    if etat_paiement == EtatPaiement.NON_PAYE:
        req = req.where(or_(LignePanier.paye.is_(False), Paiement.etat == EtatPaiement.NON_PAYE))
    elif etat_paiement:
        req = req.where(LignePanier.paye.is_(True), Paiement.etat == etat_paiement)
    if membre_id:
        req = req.where(LignePanier.membre_id == membre_id)
    if (cond := recherche(q, Produit.nom, Membre.nom, Membre.pseudonyme)) is not None:
        req = req.where(cond)
    sous = req.subquery()
    somme = db.scalar(select(func.coalesce(func.sum(sous.c.prix_unitaire * sous.c.quantite), 0))) or 0
    items, total = paginer(db, req.order_by(LignePanier.date_ajout.desc(), LignePanier.id.desc()), page)
    membres = {m.id: m for m in db.scalars(select(Membre).where(Membre.id.in_({li.membre_id for li in items})))}
    etats = dict(db.execute(
        select(Paiement.id, Paiement.etat).where(Paiement.id.in_({li.paiement_id for li in items if li.paiement_id}))
    ).all())
    sorties = []
    for li in items:
        o = s.LigneSuivi.model_validate(li)
        o.membre = s.MembrePanier.model_validate(membres[li.membre_id]) if li.membre_id in membres else None
        o.etat_paiement = int(etats.get(li.paiement_id, EtatPaiement.NON_PAYE)) if li.paye else EtatPaiement.NON_PAYE
        sorties.append(o)
    return s.ListeSuivi(items=sorties, total=total, page=page.page, taille=page.taille, somme=int(somme))


# --- Fiches bien-être (legacy « Santé », désactivables : ADR-0009) -----------------------------------


def _module_actif(db: Db) -> None:
    p = db.get(Parametre, 1)
    if p is not None and not p.module_sante_actif:
        raise introuvable("Les fiches bien-être ne sont pas disponibles pour le moment.")


@bien_etre.get("", response_model=list[s.MaladieResume])
def fiches(db: Db):
    """Grille des fiches actives (F-S1-27, corrigé : les fiches non publiées ne sont plus montrées)."""
    _module_actif(db)
    nombres = dict(db.execute(
        select(MaladieProduit.maladie_id, func.count())
        .join(Produit, MaladieProduit.produit_id == Produit.id)
        .where(Produit.etat == Etat.AUTORISE)
        .group_by(MaladieProduit.maladie_id)
    ).all())
    sorties = []
    for m in db.scalars(select(Maladie).where(Maladie.etat == Etat.AUTORISE).order_by(Maladie.libelle)):
        o = s.MaladieResume.model_validate(m)
        o.nombre_produits = int(nombres.get(m.id, 0))
        sorties.append(o)
    return sorties


@bien_etre.get("/{id_}", response_model=s.MaladieDetail)
def fiche(id_: int, db: Db, membre: MembreOpt):
    """Fiche : libellé, description, produits conseillés actifs avec leur « conseil d'utilisation »
    (F-S1-28/29 ; liste unique `maladie_produit`, ADR-0007 S1b)."""
    _module_actif(db)
    maladie = db.scalar(
        select(Maladie).options(selectinload(Maladie.produits).selectinload(MaladieProduit.produit)).where(Maladie.id == id_)
    )
    if maladie is None or maladie.etat != Etat.AUTORISE:
        raise introuvable("Cette fiche n'existe pas ou n'est plus publiée.")
    distributeur = est_distributeur(db, membre)
    produits = [
        s.ProduitConseille(produit=_avec_prix(lien.produit, distributeur), conseil_utilisation=(lien.posologie or "").strip())
        for lien in maladie.produits
        if lien.produit is not None and lien.produit.etat == Etat.AUTORISE
    ]
    return s.MaladieDetail(
        id=maladie.id, libelle=maladie.libelle, description=maladie.description or "", produits=produits,
        distributeur=distributeur,
    )


routers = [router, panier, bien_etre]
