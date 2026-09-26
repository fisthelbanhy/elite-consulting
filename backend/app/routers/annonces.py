"""Petites annonces d'articles neufs ou d'occasion, offres et recherches, avec panier et paiement
(legacy : choix3.php imbart=2, incl-choix3B.php, incl-article.php, table `panier` typepnr=2).
Inventaire : F-S3-03, F-S3-29 à F-S3-46, F-PAY-08. Paiement : services/ecommerce.py."""

from typing import Annotated, Literal

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, peut_modifier, verifier_modification
from app.enums import Etat, NeufOccasion, OffreDemande, TypeInteret, TypeObjetPaye
from app.erreurs import erreur, interdit, introuvable
from app.models import Article, FamilleArticle, LignePanier, Membre, Paiement
from app.schemas import annonces as s
from app.schemas.commun import Liste, Ok
from app.schemas.immobilier import EtatEntree, InteretEntree, InteretOut
from app.services import ecommerce, fichiers, interets
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

router = APIRouter(prefix="/annonces", tags=["Petites annonces"])

INTROUVABLE = "Cette annonce n'existe pas ou n'est plus publiée."


def _requete():
    return select(Article).options(selectinload(Article.famille))


@router.get("", response_model=Liste[s.ArticleResume])
def lister(
    db: Db,
    membre: MembreOpt,
    page: Page,
    type: Annotated[int | None, Query(ge=1, le=2, description="1 Offre, 2 Recherche")] = None,
    famille_id: int | None = None,
    neuf_ou_occasion: Annotated[int | None, Query(ge=1, le=2)] = None,
    prix_min: Annotated[int | None, Query(ge=0)] = None,
    prix_max: Annotated[int | None, Query(ge=0)] = None,
    q: str | None = None,
    etat: int | None = None,
    miennes: bool = False,
    tri: Literal["famille", "recent", "prix", "prix_desc"] = "famille",
):
    """Filtres legacy : famille, neuf/occasion, prix minimum, mot (libellé OU description,
    correctement parenthésé — F-S3-30) ; + prix maximum. Tri legacy : famille puis prix."""
    req = _requete()
    if (cond := visibilite(Article, membre)) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(Article.etat == etat) if etat else req.where(Article.etat != Etat.SUPPRIME)
    if miennes and membre:
        req = req.where(Article.auteur_id == membre.id)
    for cond in (
        Article.offre_ou_recherche == type if type else None,
        Article.famille_id == famille_id if famille_id else None,
        Article.neuf_ou_occasion == neuf_ou_occasion if neuf_ou_occasion else None,
        Article.prix >= prix_min if prix_min else None,
        Article.prix <= prix_max if prix_max else None,
        recherche(q, Article.libelle, Article.description, Article.reference),
    ):
        if cond is not None:
            req = req.where(cond)
    if tri == "famille":
        req = req.outerjoin(FamilleArticle, Article.famille_id == FamilleArticle.id).order_by(
            FamilleArticle.libelle, Article.prix, Article.id.desc()
        )
    else:
        req = req.order_by(*{
            "recent": (Article.date_creation.desc(), Article.id.desc()),
            "prix": ((Article.prix == 0), Article.prix, Article.id.desc()),
            "prix_desc": (Article.prix.desc(), Article.id.desc()),
        }[tri])
    items, total = paginer(db, req, page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    """Compteur de l'onglet « Autres articles » (F-S3-03) : articles publiés."""
    lignes = dict(db.execute(
        select(Article.offre_ou_recherche, func.count()).where(Article.etat == Etat.AUTORISE).group_by(Article.offre_ou_recherche)
    ).all())
    offres, recherches = lignes.get(OffreDemande.OFFRE, 0), lignes.get(OffreDemande.DEMANDE, 0)
    return s.Compteurs(offres=offres, recherches=recherches, total=offres + recherches)


@router.get("/encarts", response_model=s.Encarts)
def encarts(db: Db):
    """« Nouveautés » (tri par vraie date d'inscription, correctif F-S3-39) et « Les plus visités »."""
    publies = _requete().where(Article.etat == Etat.AUTORISE)
    return s.Encarts(
        nouveautes=db.scalars(publies.order_by(Article.date_creation.desc(), Article.id.desc()).limit(5)).all(),
        plus_visites=db.scalars(publies.order_by(Article.nombre_visites.desc(), Article.id.desc()).limit(5)).all(),
    )


# --- Panier (déclaré avant /{id_}) ---------------------------------------------------------------


def _panier(db: Db, membre: Membre) -> s.Panier:
    """Panier du membre ; le gestionnaire voit les lignes non payées de tous les membres, sans
    pouvoir payer (F-S3-42 à 45)."""
    gestion = membre.est_gestionnaire
    lignes = ecommerce.lignes_panier(db, None if gestion else membre.id)
    rupture = ecommerce.lignes_en_rupture(lignes)
    membres = {}
    if gestion and lignes:
        ids = {ligne.membre_id for ligne in lignes}
        membres = {m.id: m for m in db.scalars(select(Membre).where(Membre.id.in_(ids)))}
    sorties = []
    for ligne in lignes:
        o = s.LignePanierOut.model_validate(ligne)
        o.stock_insuffisant = ligne.id in rupture
        if gestion and (m := membres.get(ligne.membre_id)):
            o.membre = s.MembrePanier.model_validate(m)
        sorties.append(o)
    stock_ok = not rupture
    montant = ecommerce.total(lignes)
    achats: list[s.AchatOut] = []
    if not gestion:
        payees = list(db.scalars(
            select(LignePanier).options(selectinload(LignePanier.article)).where(
                LignePanier.type_objet == TypeObjetPaye.ARTICLE, LignePanier.membre_id == membre.id,
                LignePanier.paye.is_(True),
            ).order_by(LignePanier.date_paiement.desc(), LignePanier.id.desc()).limit(20)
        ))
        ids_paiement = {ligne.paiement_id for ligne in payees if ligne.paiement_id}
        etats = dict(db.execute(select(Paiement.id, Paiement.etat).where(Paiement.id.in_(ids_paiement))).all()) if ids_paiement else {}
        achats = [
            s.AchatOut(
                id=ligne.id, article_id=ligne.article_id, libelle=ligne.article.libelle if ligne.article else "Article retiré",
                quantite=ligne.quantite, prix_unitaire=ligne.prix_unitaire, montant=ligne.quantite * ligne.prix_unitaire,
                date_paiement=ligne.date_paiement, etat_paiement=etats.get(ligne.paiement_id),
            )
            for ligne in payees
        ]
    return s.Panier(
        lignes=sorties,
        total_quantite=sum(ligne.quantite for ligne in lignes),
        total_montant=montant,
        stock_suffisant=stock_ok,
        peut_payer=not gestion and bool(lignes) and stock_ok and montant > 0,
        message=None if stock_ok else ecommerce.MESSAGE_STOCK,
        achats=achats,
    )


@router.get("/panier", response_model=s.Panier)
def panier(db: Db, membre: MembreReq):
    return _panier(db, membre)


def _ligne(db: Db, ligne_id: int, membre: Membre) -> LignePanier:
    ligne = db.get(LignePanier, ligne_id)
    if ligne is None or ligne.type_objet != TypeObjetPaye.ARTICLE:
        raise introuvable("Cette ligne n'est plus dans le panier.")
    # F-S3-43 : un membre ne touche qu'à ses propres lignes (le legacy ne contrôlait rien)
    if ligne.membre_id != membre.id and not membre.peut_moderer():
        raise interdit("Cette ligne appartient au panier d'un autre membre.")
    if ligne.paye:
        raise erreur("Cette ligne est déjà payée : elle ne peut plus être modifiée.")
    return ligne


@router.put("/panier/{ligne_id}", response_model=Ok)
def changer_quantite(ligne_id: int, donnees: s.QuantiteEntree, db: Db, membre: MembreReq):
    ligne = _ligne(db, ligne_id, membre)
    if donnees.quantite < 1:
        raise erreur("Veuillez choisir une quantité.", quantite="1 au minimum (ou retirez l'article du panier).")
    ligne.quantite = donnees.quantite
    db.commit()
    return Ok(message="Quantité modifiée.", id=ligne.id)


@router.delete("/panier/{ligne_id}", response_model=Ok)
def retirer(ligne_id: int, db: Db, membre: MembreReq):
    ligne = _ligne(db, ligne_id, membre)
    db.delete(ligne)  # suppression physique, comme le legacy
    db.commit()
    return Ok(message="Article retiré du panier.", id=ligne_id)


# --- Fiches ------------------------------------------------------------------------------------


def _detail(db: Db, fiche: Article, membre) -> s.ArticleDetail:
    d = s.ArticleDetail.model_validate(fiche)
    proprietaire = membre is not None and (membre.id == fiche.auteur_id or membre.est_gestionnaire)
    offre = fiche.offre_ou_recherche == OffreDemande.OFFRE
    recus = interets.lister(db, "article_id", fiche.id)
    if proprietaire:
        d.interets = [InteretOut.model_validate(i) for i in recus]
    d.peut_modifier = peut_modifier(membre, fiche.auteur_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    tiers = membre is None or (not membre.est_gestionnaire and membre.id != fiche.auteur_id)
    publie = fiche.etat == Etat.AUTORISE
    d.peut_manifester = tiers and publie and not offre
    d.peut_acheter = tiers and publie and offre
    if membre is not None and not proprietaire:
        d.mon_interet = any(i.membre_id == membre.id for i in recus)
        d.quantite_panier = int(db.scalar(
            select(func.coalesce(func.sum(LignePanier.quantite), 0)).where(
                LignePanier.type_objet == TypeObjetPaye.ARTICLE, LignePanier.article_id == fiche.id,
                LignePanier.membre_id == membre.id, LignePanier.paye.is_(False),
            )
        ) or 0)
    return d


@router.get("/{id_}", response_model=s.ArticleDetail)
def detail(id_: int, db: Db, membre: MembreOpt):
    # F-S3-33 : un article non publié n'est plus consultable par un tiers (le legacy l'affichait)
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    compter_visite(fiche, membre)  # F-S3-32
    db.commit()
    return _detail(db, fiche, membre)


def _valider(db: Db, d: s.ArticleEntree, exclure_id: int | None = None) -> None:
    """Règles legacy (incl-article.php), unicité enfin opérante (F-S3-37/38)."""
    champs: dict[str, str] = {}
    if d.offre_ou_recherche not in (OffreDemande.OFFRE, OffreDemande.DEMANDE):
        champs["offre_ou_recherche"] = "Veuillez indiquer s'il s'agit d'une offre ou d'une recherche."
    if not d.famille_id or db.get(FamilleArticle, d.famille_id) is None:
        champs["famille_id"] = "Veuillez indiquer la famille de l'article."
    if len(d.libelle.strip()) < 5:
        champs["libelle"] = "Le libellé de l'article doit avoir 5 caractères minimum."
    if d.neuf_ou_occasion not in (NeufOccasion.NEUF, NeufOccasion.OCCASION):
        champs["neuf_ou_occasion"] = "Veuillez indiquer si l'article est neuf ou d'occasion."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(Article.id).where(
        Article.libelle == d.libelle.strip(), Article.description == d.description.strip(), Article.etat != Etat.SUPPRIME
    )
    if exclure_id:
        doublon = doublon.where(Article.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cet article est déjà enregistré.", libelle="Un article avec le même libellé et la même description existe déjà.")


def _appliquer(fiche: Article, d: s.ArticleEntree) -> None:
    fiche.offre_ou_recherche = d.offre_ou_recherche
    fiche.famille_id = d.famille_id
    fiche.libelle = d.libelle.strip()
    fiche.prix = d.prix
    fiche.quantite = d.quantite  # entier standard : plus de plafond à 127 (F-S3-40)
    fiche.neuf_ou_occasion = d.neuf_ou_occasion
    fiche.description = d.description.strip()


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.ArticleEntree, db: Db, membre: MembreReq):
    _valider(db, donnees)
    fiche = Article(auteur_id=membre.id, etat=Etat.AUTORISE)  # publié immédiatement (legacy, F-S3-39)
    _appliquer(fiche, donnees)
    fiche.reference = nouvelle_reference(db, Prefixe.ARTICLE)
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id, reference=fiche.reference)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.ArticleEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    _valider(db, donnees, exclure_id=fiche.id)
    _appliquer(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id, reference=fiche.reference)


@router.post("/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    verifier_modification(membre, fiche.auteur_id)
    ancien = fiche.photo
    fiche.photo = await fichiers.enregistrer(fichier, "articles", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=fiche.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: EtatEntree, db: Db, membre: MembreReq):
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    changer_etat(fiche, donnees.etat, membre)  # F-S3-41
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    supprimer(fiche, membre)
    db.commit()
    return Ok(message="Fiche supprimée.", id=fiche.id)


@router.post("/{id_}/panier", response_model=Ok, status_code=201)
def ajouter_au_panier(id_: int, donnees: s.QuantiteEntree, db: Db, membre: MembreReq):
    """Offre seulement : ajout au panier au prix courant figé (F-S3-34). Quantité ≤ stock
    restant (lignes non payées déjà dans le panier comprises)."""
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    if membre.est_gestionnaire:
        raise interdit("Les gestionnaires n'achètent pas depuis les petites annonces.")
    if fiche.auteur_id == membre.id:
        raise erreur("Vous ne pouvez pas acheter votre propre article.")
    if fiche.offre_ou_recherche != OffreDemande.OFFRE or fiche.etat != Etat.AUTORISE:
        raise erreur("Cet article n'est pas proposé à la vente.")
    if donnees.quantite < 1:
        raise erreur("Veuillez choisir une quantité.", quantite="Choisissez au moins 1 article.")
    lignes = [ligne for ligne in ecommerce.lignes_panier(db, membre.id) if ligne.article_id == fiche.id]
    deja = sum(ligne.quantite for ligne in lignes)
    reste = fiche.quantite - deja
    if donnees.quantite > reste:
        detail_stock = f"Il reste {max(reste, 0)} article{'s' if reste > 1 else ''} disponible{'s' if reste > 1 else ''}"
        if deja:
            detail_stock += f" (vous en avez déjà {deja} dans votre panier)"
        raise erreur("Stock insuffisant.", quantite=f"{detail_stock}.")
    # Même article au même prix : on cumule la quantité plutôt que d'empiler les lignes
    ligne = next((ligne for ligne in lignes if ligne.prix_unitaire == fiche.prix), None)
    if ligne is not None:
        ligne.quantite += donnees.quantite
    else:
        ligne = LignePanier(
            type_objet=TypeObjetPaye.ARTICLE, membre_id=membre.id, article_id=fiche.id,
            quantite=donnees.quantite, prix_unitaire=fiche.prix, paye=False, etat=Etat.AUTORISE,
        )
        db.add(ligne)
    db.commit()
    return Ok(message="Article ajouté à votre panier.", id=ligne.id)


@router.post("/{id_}/interet", response_model=Ok, status_code=201)
def manifester(id_: int, donnees: InteretEntree, db: Db, membre: MembreReq):
    """Recherche seulement : « Intéressement » (5 caractères minimum), un seul par membre et
    par article (F-S3-35)."""
    fiche = obtenir(db, Article, id_, membre, message=INTROUVABLE)
    if membre.est_gestionnaire:
        raise interdit("Les gestionnaires ne déposent pas d'intéressement.")
    if fiche.offre_ou_recherche == OffreDemande.OFFRE:
        raise erreur("Cet article est proposé à la vente : ajoutez-le à votre panier.")
    if len(donnees.message.strip()) < 5:
        raise erreur("Intéressement doit avoir 5 caractères minimum.", message="Intéressement : 5 caractères minimum.")
    interets.deposer(
        db, membre, "article_id", fiche.id, fiche.auteur_id, sous_type=TypeInteret.INTERESSEMENT,
        message=donnees.message, libelle_fiche=f"{fiche.reference} — {fiche.libelle}", lien=f"/annonces/{fiche.id}",
        message_obligatoire=True,
    )
    db.commit()
    return Ok(message="Votre intéressement est pris en compte.", id=fiche.id)


routers = [router]
