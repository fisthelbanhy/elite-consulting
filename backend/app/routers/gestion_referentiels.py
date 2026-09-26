"""Référentiels et paramètres du site administrés par les gestionnaires (legacy : `pparametre`,
`pvilqtr`, `pdiplome`, `psatdat`, `pfamilart`, `pmaladie`, `pproduit`, `pproduitptpv`, `pbanque`).
Inventaire : E-ADM-01 à E-ADM-10, F-ADM-01 à F-ADM-04, F-ADM-16 à F-ADM-29.

Suppression (le legacy n'en proposait aucune) :
- référentiel avec état (secteurs, domaines, maladies, produits, produits du comparateur,
  banques) : suppression **logique** (état 3), réversible depuis la fiche ;
- référentiel sans état (villes, quartiers, diplômes, familles d'articles) : suppression
  physique seulement s'il n'est utilisé nulle part, sinon refus motivé.
"""

from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, gestionnaire_requis
from app.enums import Etat, GroupeProduit
from app.erreurs import erreur, introuvable
from app.models import (
    AppelFond,
    Article,
    Banque,
    Diplome,
    DomaineActivite,
    Entreprise,
    FamilleArticle,
    Immobilier,
    LigneProspective,
    Maladie,
    MaladieProduit,
    Membre,
    Parametre,
    Produit,
    ProduitProspective,
    Quartier,
    SecteurActivite,
    Ville,
)
from app.schemas import gestion as sg
from app.schemas import gestion_referentiels as s
from app.schemas.commun import Liste, Ok
from app.services import fichiers
from app.services.fiches import paginer, recherche
from app.services.gestion import PaginationGestion

router = APIRouter(prefix="/gestion", tags=["Gestion — référentiels"], dependencies=[Depends(gestionnaire_requis)])


# --- Outils communs ----------------------------------------------------------------------------------


def _charger(db: Db, modele, id_: int, message: str = "Élément introuvable."):
    obj = db.get(modele, id_)
    if obj is None:
        raise introuvable(message)
    return obj


def _doublon(db: Db, modele, colonne, valeur: str, *conds, exclure_id: int | None = None) -> bool:
    """Doublon insensible à la casse, accents compris (« Électroménager » = « électroménager ») :
    comparaison faite en Python, car `lower()` de SQLite ignore les lettres accentuées. Les
    référentiels comptent au plus quelques centaines de lignes."""
    cible = " ".join(valeur.split()).casefold()
    q = select(modele.id, colonne).where(*conds)
    if exclure_id:
        q = q.where(modele.id != exclure_id)
    return any(" ".join((v or "").split()).casefold() == cible for _, v in db.execute(q).all())


def _compter(db: Db, modele, *conds) -> int:
    return db.scalar(select(func.count()).select_from(modele).where(*conds)) or 0


def _usages(db: Db, *usages: tuple[str, Any, Any]) -> list[str]:
    """Libellés « 3 membres », « 1 entreprise »… des utilisations non nulles."""
    out = []
    for libelle, modele, cond in usages:
        n = _compter(db, modele, cond)
        if n:
            out.append(f"{n} {libelle}")
    return out


def _supprimer_sans_etat(db: Db, obj, quoi: str, usages: list[str]) -> Ok:
    if usages:
        raise erreur(f"Suppression impossible : {quoi} est utilisé(e) par {', '.join(usages)}.")
    db.delete(obj)
    db.commit()
    return Ok(message="Suppression effectuée.", id=obj.id)


def _supprimer_avec_etat(db: Db, obj) -> Ok:
    obj.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Fiche supprimée (état « Supprimé ») : elle n'est plus proposée. "
                      "Vous pouvez la réactiver en modifiant son état.", id=obj.id)


def _liste(items, total: int, page: PaginationGestion) -> Liste:
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


def _min(valeur: str, n: int) -> bool:
    return len(valeur.strip()) >= n


@router.get("/referentiels", response_model=list[s.Resume])
def sommaire(db: Db):
    """Page d'accueil des référentiels : nombre d'éléments actifs de chacun."""
    supprime = Etat.SUPPRIME
    return [
        s.Resume(cle="villes", libelle="Villes", total=_compter(db, Ville)),
        s.Resume(cle="quartiers", libelle="Quartiers", total=_compter(db, Quartier)),
        s.Resume(cle="secteurs", libelle="Secteurs d'activité", total=_compter(db, SecteurActivite, SecteurActivite.etat != supprime)),
        s.Resume(cle="domaines", libelle="Domaines d'activité", total=_compter(db, DomaineActivite, DomaineActivite.etat != supprime)),
        s.Resume(cle="diplomes", libelle="Diplômes", total=_compter(db, Diplome)),
        s.Resume(cle="familles", libelle="Familles d'articles", total=_compter(db, FamilleArticle)),
        s.Resume(cle="maladies", libelle="Fiches bien-être", total=_compter(db, Maladie, Maladie.etat != supprime)),
        s.Resume(cle="produits", libelle="Produits", total=_compter(db, Produit, Produit.etat != supprime)),
        s.Resume(cle="produits-comparateur", libelle="Produits du comparateur",
                 total=_compter(db, ProduitProspective, ProduitProspective.etat != supprime)),
        s.Resume(cle="banques", libelle="Banques", total=_compter(db, Banque, Banque.etat != supprime)),
    ]


# --- Villes (F-ADM-16) --------------------------------------------------------------------------------


def _ville_out(db: Db, v: Ville) -> s.VilleOut:
    o = s.VilleOut.model_validate(v)
    o.nombre_quartiers = _compter(db, Quartier, Quartier.ville_id == v.id)
    o.nombre_membres = _compter(db, Membre, Membre.ville_id == v.id, Membre.etat != Etat.SUPPRIME)
    return o


@router.get("/referentiels/villes", response_model=Liste[s.VilleOut])
def villes(db: Db, page: PaginationGestion = Depends(), q: str | None = None):
    req = select(Ville)
    if (c := recherche(q, Ville.nom)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(Ville.nom), page)
    return _liste([_ville_out(db, v) for v in items], total, page)


@router.get("/referentiels/villes/{id_}", response_model=s.VilleOut)
def ville(id_: int, db: Db):
    return _ville_out(db, _charger(db, Ville, id_, "Ville introuvable."))


def _valider_ville(db: Db, d: s.VilleEntree, exclure_id: int | None = None) -> None:
    if not _min(d.nom, 4):
        raise erreur("Veuillez corriger les champs signalés.", nom="Le nom doit avoir 4 caractères minimum.")
    if _doublon(db, Ville, Ville.nom, d.nom, exclure_id=exclure_id):
        raise erreur("Cette ville est déjà enregistrée.", nom="Cette ville est déjà enregistrée.")


@router.post("/referentiels/villes", response_model=Ok, status_code=201)
def creer_ville(d: s.VilleEntree, db: Db):
    _valider_ville(db, d)
    v = Ville(nom=d.nom.strip())
    db.add(v)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=v.id)


@router.put("/referentiels/villes/{id_}", response_model=Ok)
def modifier_ville(id_: int, d: s.VilleEntree, db: Db):
    v = _charger(db, Ville, id_, "Ville introuvable.")
    _valider_ville(db, d, exclure_id=v.id)
    v.nom = d.nom.strip()
    db.commit()
    return Ok(message="Modification effectuée.", id=v.id)


@router.delete("/referentiels/villes/{id_}", response_model=Ok)
def supprimer_ville(id_: int, db: Db):
    v = _charger(db, Ville, id_, "Ville introuvable.")
    return _supprimer_sans_etat(db, v, "cette ville", _usages(
        db, ("quartier(s)", Quartier, Quartier.ville_id == v.id), ("membre(s)", Membre, Membre.ville_id == v.id),
        ("entreprise(s)", Entreprise, Entreprise.ville_id == v.id), ("appel(s) de fonds", AppelFond, AppelFond.ville_id == v.id),
    ))


# --- Quartiers (F-ADM-17) -----------------------------------------------------------------------------


def _quartier_out(db: Db, x: Quartier) -> s.QuartierOut:
    o = s.QuartierOut.model_validate(x)
    o.nombre_annonces = _compter(db, Immobilier, Immobilier.quartier_id == x.id)
    return o


@router.get("/referentiels/quartiers", response_model=Liste[s.QuartierOut])
def quartiers(db: Db, page: PaginationGestion = Depends(), q: str | None = None, ville_id: int | None = None):
    req = select(Quartier).join(Ville).options(selectinload(Quartier.ville))
    if ville_id:
        req = req.where(Quartier.ville_id == ville_id)
    if (c := recherche(q, Quartier.nom)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(Ville.nom, Quartier.nom), page)
    return _liste([_quartier_out(db, x) for x in items], total, page)


@router.get("/referentiels/quartiers/{id_}", response_model=s.QuartierOut)
def quartier(id_: int, db: Db):
    return _quartier_out(db, _charger(db, Quartier, id_, "Quartier introuvable."))


def _valider_quartier(db: Db, d: s.QuartierEntree, exclure_id: int | None = None) -> None:
    champs = {}
    if not d.ville_id or db.get(Ville, d.ville_id) is None:
        champs["ville_id"] = "Chaque quartier doit être lié à une ville."
    if not _min(d.nom, 4):
        champs["nom"] = "Le nom doit avoir 4 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    if _doublon(db, Quartier, Quartier.nom, d.nom, Quartier.ville_id == d.ville_id, exclure_id=exclure_id):
        raise erreur("Ce quartier est déjà enregistré pour cette ville.", nom="Ce quartier est déjà enregistré pour cette ville.")


@router.post("/referentiels/quartiers", response_model=Ok, status_code=201)
def creer_quartier(d: s.QuartierEntree, db: Db):
    _valider_quartier(db, d)
    x = Quartier(ville_id=d.ville_id, nom=d.nom.strip())
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/quartiers/{id_}", response_model=Ok)
def modifier_quartier(id_: int, d: s.QuartierEntree, db: Db):
    x = _charger(db, Quartier, id_, "Quartier introuvable.")
    _valider_quartier(db, d, exclure_id=x.id)
    x.ville_id, x.nom = d.ville_id, d.nom.strip()
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/quartiers/{id_}", response_model=Ok)
def supprimer_quartier(id_: int, db: Db):
    x = _charger(db, Quartier, id_, "Quartier introuvable.")
    return _supprimer_sans_etat(db, x, "ce quartier", _usages(
        db, ("annonce(s) immobilière(s)", Immobilier, Immobilier.quartier_id == x.id)))


# --- Diplômes (F-ADM-18) -------------------------------------------------------------------------------


@router.get("/referentiels/diplomes", response_model=Liste[s.DiplomeOut])
def diplomes(db: Db, page: PaginationGestion = Depends(), q: str | None = None):
    req = select(Diplome)
    if (c := recherche(q, Diplome.libelle, Diplome.code)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(Diplome.libelle), page)
    return _liste(items, total, page)


@router.get("/referentiels/diplomes/{id_}", response_model=s.DiplomeOut)
def diplome(id_: int, db: Db):
    return _charger(db, Diplome, id_, "Diplôme introuvable.")


def _valider_diplome(db: Db, d: s.DiplomeEntree, exclure_id: int | None = None) -> None:
    if not _min(d.libelle, 5):
        raise erreur("Veuillez corriger les champs signalés.", libelle="Le libellé doit avoir 5 caractères minimum.")
    if _doublon(db, Diplome, Diplome.libelle, d.libelle, exclure_id=exclure_id):
        raise erreur("Ce diplôme est déjà enregistré.", libelle="Ce diplôme est déjà enregistré.")


@router.post("/referentiels/diplomes", response_model=Ok, status_code=201)
def creer_diplome(d: s.DiplomeEntree, db: Db):
    _valider_diplome(db, d)
    x = Diplome(code=d.code.strip().upper(), libelle=d.libelle.strip())  # code en majuscules (legacy)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/diplomes/{id_}", response_model=Ok)
def modifier_diplome(id_: int, d: s.DiplomeEntree, db: Db):
    x = _charger(db, Diplome, id_, "Diplôme introuvable.")
    _valider_diplome(db, d, exclure_id=x.id)
    x.code, x.libelle = d.code.strip().upper(), d.libelle.strip()
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/diplomes/{id_}", response_model=Ok)
def supprimer_diplome(id_: int, db: Db):
    # Les fiches RH saisissent les diplômes en texte libre : aucune dépendance en base
    return _supprimer_sans_etat(db, _charger(db, Diplome, id_, "Diplôme introuvable."), "ce diplôme", [])


# --- Secteurs d'activité (F-ADM-19) -------------------------------------------------------------------------


def _secteur_out(db: Db, x: SecteurActivite) -> s.SecteurOut:
    o = s.SecteurOut.model_validate(x)
    o.nombre_domaines = _compter(db, DomaineActivite, DomaineActivite.secteur_id == x.id, DomaineActivite.etat != Etat.SUPPRIME)
    return o


@router.get("/referentiels/secteurs", response_model=Liste[s.SecteurOut])
def secteurs(db: Db, page: PaginationGestion = Depends(), q: str | None = None, etat: int | None = None):
    req = select(SecteurActivite)
    if etat:
        req = req.where(SecteurActivite.etat == etat)
    if (c := recherche(q, SecteurActivite.libelle)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(SecteurActivite.libelle), page)
    return _liste([_secteur_out(db, x) for x in items], total, page)


@router.get("/referentiels/secteurs/{id_}", response_model=s.SecteurOut)
def secteur(id_: int, db: Db):
    return _secteur_out(db, _charger(db, SecteurActivite, id_, "Secteur introuvable."))


def _valider_secteur(db: Db, d: s.SecteurEntree, exclure_id: int | None = None) -> None:
    if not _min(d.libelle, 5):
        raise erreur("Veuillez corriger les champs signalés.", libelle="Le libellé doit avoir 5 caractères minimum.")
    if _doublon(db, SecteurActivite, SecteurActivite.libelle, d.libelle, exclure_id=exclure_id):
        raise erreur("Cette fiche est déjà enregistrée.", libelle="Ce secteur est déjà enregistré.")


@router.post("/referentiels/secteurs", response_model=Ok, status_code=201)
def creer_secteur(d: s.SecteurEntree, db: Db):
    _valider_secteur(db, d)
    x = SecteurActivite(libelle=d.libelle.strip(), etat=d.etat)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/secteurs/{id_}", response_model=Ok)
def modifier_secteur(id_: int, d: s.SecteurEntree, db: Db):
    x = _charger(db, SecteurActivite, id_, "Secteur introuvable.")
    _valider_secteur(db, d, exclure_id=x.id)
    x.libelle, x.etat = d.libelle.strip(), d.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/secteurs/{id_}", response_model=Ok)
def supprimer_secteur(id_: int, db: Db):
    return _supprimer_avec_etat(db, _charger(db, SecteurActivite, id_, "Secteur introuvable."))


# --- Domaines d'activité (F-ADM-20) ---------------------------------------------------------------------------


@router.get("/referentiels/domaines", response_model=Liste[s.DomaineOut])
def domaines(db: Db, page: PaginationGestion = Depends(), q: str | None = None, secteur_id: int | None = None,
             etat: int | None = None):
    req = select(DomaineActivite).outerjoin(SecteurActivite).options(selectinload(DomaineActivite.secteur))
    if secteur_id:
        req = req.where(DomaineActivite.secteur_id == secteur_id)
    if etat:
        req = req.where(DomaineActivite.etat == etat)
    if (c := recherche(q, DomaineActivite.libelle)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(SecteurActivite.libelle, DomaineActivite.libelle), page)
    return _liste(items, total, page)


@router.get("/referentiels/domaines/{id_}", response_model=s.DomaineOut)
def domaine(id_: int, db: Db):
    return _charger(db, DomaineActivite, id_, "Domaine introuvable.")


def _valider_domaine(db: Db, d: s.DomaineEntree, exclure_id: int | None = None) -> None:
    champs = {}
    # Correctif F-ADM-20 : plus de secteur n° 1 choisi par défaut
    if not d.secteur_id or db.get(SecteurActivite, d.secteur_id) is None:
        champs["secteur_id"] = "Tout domaine d'activité est lié à un secteur. Veuillez indiquer le secteur."
    if not _min(d.libelle, 5):
        champs["libelle"] = "Le libellé doit avoir 5 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    if _doublon(db, DomaineActivite, DomaineActivite.libelle, d.libelle, DomaineActivite.secteur_id == d.secteur_id, exclure_id=exclure_id):
        raise erreur("Cette fiche est déjà enregistrée.", libelle="Ce domaine existe déjà dans ce secteur.")


@router.post("/referentiels/domaines", response_model=Ok, status_code=201)
def creer_domaine(d: s.DomaineEntree, db: Db):
    _valider_domaine(db, d)
    x = DomaineActivite(secteur_id=d.secteur_id, libelle=d.libelle.strip(), etat=d.etat)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/domaines/{id_}", response_model=Ok)
def modifier_domaine(id_: int, d: s.DomaineEntree, db: Db):
    x = _charger(db, DomaineActivite, id_, "Domaine introuvable.")
    _valider_domaine(db, d, exclure_id=x.id)
    x.secteur_id, x.libelle, x.etat = d.secteur_id, d.libelle.strip(), d.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/domaines/{id_}", response_model=Ok)
def supprimer_domaine(id_: int, db: Db):
    return _supprimer_avec_etat(db, _charger(db, DomaineActivite, id_, "Domaine introuvable."))


# --- Familles d'articles (F-ADM-21) ---------------------------------------------------------------------------


def _famille_out(db: Db, x: FamilleArticle) -> s.FamilleOut:
    o = s.FamilleOut.model_validate(x)
    o.nombre_articles = _compter(db, Article, Article.famille_id == x.id)
    return o


@router.get("/referentiels/familles", response_model=Liste[s.FamilleOut])
def familles(db: Db, page: PaginationGestion = Depends(), q: str | None = None):
    req = select(FamilleArticle)
    if (c := recherche(q, FamilleArticle.libelle)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(FamilleArticle.libelle), page)
    return _liste([_famille_out(db, x) for x in items], total, page)


@router.get("/referentiels/familles/{id_}", response_model=s.FamilleOut)
def famille(id_: int, db: Db):
    return _famille_out(db, _charger(db, FamilleArticle, id_, "Famille introuvable."))


def _valider_famille(db: Db, d: s.FamilleEntree, exclure_id: int | None = None) -> None:
    if not _min(d.libelle, 5):
        raise erreur("Veuillez corriger les champs signalés.", libelle="Le libellé doit avoir 5 caractères minimum.")
    if _doublon(db, FamilleArticle, FamilleArticle.libelle, d.libelle, exclure_id=exclure_id):
        # Correctif F-ADM-21 : le legacy parlait de « famille de maladie »
        raise erreur("Cette famille d'article est déjà enregistrée.", libelle="Cette famille d'article est déjà enregistrée.")


@router.post("/referentiels/familles", response_model=Ok, status_code=201)
def creer_famille(d: s.FamilleEntree, db: Db):
    _valider_famille(db, d)
    x = FamilleArticle(libelle=d.libelle.strip())
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/familles/{id_}", response_model=Ok)
def modifier_famille(id_: int, d: s.FamilleEntree, db: Db):
    x = _charger(db, FamilleArticle, id_, "Famille introuvable.")
    _valider_famille(db, d, exclure_id=x.id)
    x.libelle = d.libelle.strip()
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/familles/{id_}", response_model=Ok)
def supprimer_famille(id_: int, db: Db):
    x = _charger(db, FamilleArticle, id_, "Famille introuvable.")
    return _supprimer_sans_etat(db, x, "cette famille", _usages(db, ("annonce(s)", Article, Article.famille_id == x.id)))


# --- Produits (F-ADM-25 à F-ADM-27) -------------------------------------------------------------------------


@router.get("/referentiels/produits", response_model=Liste[s.ProduitOut])
def produits(
    db: Db, page: PaginationGestion = Depends(), q: str | None = None, groupe: int | None = None,
    etat: int | None = None, prix_distributeur_max: int | None = None, prix_public_max: int | None = None,
    quantite_max: int | None = None,
):
    req = select(Produit)
    for cond in (
        Produit.groupe == groupe if groupe is not None else None,
        Produit.etat == etat if etat else None,
        Produit.prix_distributeur <= prix_distributeur_max if prix_distributeur_max is not None else None,
        Produit.prix_public <= prix_public_max if prix_public_max is not None else None,
        Produit.quantite_stock <= quantite_max if quantite_max is not None else None,
        recherche(q, Produit.nom, Produit.description, Produit.reference),
    ):
        if cond is not None:
            req = req.where(cond)
    items, total = paginer(db, req.order_by(Produit.nom), page)
    return _liste(items, total, page)


@router.get("/referentiels/produits/{id_}", response_model=s.ProduitOut)
def produit(id_: int, db: Db):
    return _charger(db, Produit, id_, "Produit introuvable.")


def _valider_produit(db: Db, d: s.ProduitEntree, actuel: Produit | None = None) -> None:
    champs = {}
    groupes = {g.value for g in GroupeProduit}
    if d.groupe not in groupes and not (actuel and actuel.groupe == d.groupe):
        champs["groupe"] = "Veuillez choisir le groupe du produit."
    if not _min(d.nom, 3):
        champs["nom"] = "Le nom du produit doit avoir 3 caractères minimum."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    # Correctif F-ADM-26 : l'anti-doublon legacy (colonne inexistante) ne fonctionnait pas
    if _doublon(db, Produit, Produit.nom, d.nom, Produit.groupe == d.groupe, exclure_id=actuel.id if actuel else None):
        raise erreur("Ce produit est déjà enregistré.", nom="Un produit de ce groupe porte déjà ce nom.")


def _appliquer_produit(x: Produit, d: s.ProduitEntree) -> None:
    x.groupe, x.reference, x.nom, x.description = d.groupe, d.reference.strip(), d.nom.strip(), d.description.strip()
    x.prix_distributeur, x.prix_non_distributeur, x.prix_public = d.prix_distributeur, d.prix_non_distributeur, d.prix_public
    x.quantite_stock, x.etat = d.quantite_stock, d.etat


@router.post("/referentiels/produits", response_model=Ok, status_code=201)
def creer_produit(d: s.ProduitEntree, db: Db):
    _valider_produit(db, d)
    x = Produit(nom="")
    _appliquer_produit(x, d)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id, reference=x.reference or None)


@router.put("/referentiels/produits/{id_}", response_model=Ok)
def modifier_produit(id_: int, d: s.ProduitEntree, db: Db):
    x = _charger(db, Produit, id_, "Produit introuvable.")
    _valider_produit(db, d, actuel=x)
    _appliquer_produit(x, d)
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.post("/referentiels/produits/{id_}/photo", response_model=Ok)
async def photo_produit(id_: int, db: Db, fichier: UploadFile = File(...)):
    x = _charger(db, Produit, id_, "Produit introuvable.")
    ancien = x.photo
    x.photo = await fichiers.enregistrer(fichier, "produits", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=x.id)


@router.delete("/referentiels/produits/{id_}", response_model=Ok)
def supprimer_produit(id_: int, db: Db):
    return _supprimer_avec_etat(db, _charger(db, Produit, id_, "Produit introuvable."))


# --- Maladies / fiches bien-être (F-ADM-22 à F-ADM-24) --------------------------------------------------------


def _maladie_out(db: Db, x: Maladie) -> s.MaladieOut:
    o = s.MaladieOut.model_validate(x)
    o.nombre_produits = _compter(db, MaladieProduit, MaladieProduit.maladie_id == x.id)
    return o


@router.get("/referentiels/maladies", response_model=Liste[s.MaladieOut])
def maladies(db: Db, page: PaginationGestion = Depends(), q: str | None = None, etat: int | None = None):
    req = select(Maladie)
    if etat:
        req = req.where(Maladie.etat == etat)
    if (c := recherche(q, Maladie.libelle, Maladie.description)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(Maladie.libelle), page)
    return _liste([_maladie_out(db, x) for x in items], total, page)


@router.get("/referentiels/maladies/{id_}", response_model=s.MaladieDetail)
def maladie(id_: int, db: Db):
    x = db.scalar(select(Maladie).where(Maladie.id == id_)
                  .options(selectinload(Maladie.produits).selectinload(MaladieProduit.produit)))
    if x is None:
        raise introuvable("Fiche introuvable.")
    o = s.MaladieDetail.model_validate(x)
    o.nombre_produits = len(o.produits)
    return o


def _valider_maladie(db: Db, d: s.MaladieEntree, exclure_id: int | None = None) -> None:
    champs = {}
    if not _min(d.libelle, 5):
        champs["libelle"] = "Le libellé doit avoir 5 caractères minimum."
    vus: set[int] = set()
    for i, p in enumerate(d.produits):
        if p.produit_id in vus:
            champs[f"produits.{i}.produit_id"] = "Ce produit figure déjà dans la liste."
        elif db.get(Produit, p.produit_id) is None:
            champs[f"produits.{i}.produit_id"] = "Produit inconnu."
        vus.add(p.produit_id)
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    if _doublon(db, Maladie, Maladie.libelle, d.libelle, exclure_id=exclure_id):
        raise erreur("Cette maladie est déjà enregistrée.", libelle="Cette maladie est déjà enregistrée.")


def _appliquer_maladie(x: Maladie, d: s.MaladieEntree) -> None:
    """Une seule liste ordonnée, sans limite à 5 : exactement ce que voit la page publique
    (ADR-0007 S1b, F-ADM-23/24)."""
    x.libelle, x.description, x.etat = d.libelle.strip(), d.description.strip(), d.etat
    x.produits = [MaladieProduit(produit_id=p.produit_id, posologie=p.posologie.strip(), ordre=i + 1)
                  for i, p in enumerate(d.produits)]


@router.post("/referentiels/maladies", response_model=Ok, status_code=201)
def creer_maladie(d: s.MaladieEntree, db: Db):
    _valider_maladie(db, d)
    x = Maladie(libelle="")
    _appliquer_maladie(x, d)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/maladies/{id_}", response_model=Ok)
def modifier_maladie(id_: int, d: s.MaladieEntree, db: Db):
    x = db.scalar(select(Maladie).where(Maladie.id == id_).options(selectinload(Maladie.produits)))
    if x is None:
        raise introuvable("Fiche introuvable.")
    _valider_maladie(db, d, exclure_id=x.id)
    x.produits.clear()
    db.flush()  # les anciennes lignes sont supprimées avant l'insertion de la nouvelle liste
    _appliquer_maladie(x, d)
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/maladies/{id_}", response_model=Ok)
def supprimer_maladie(id_: int, db: Db):
    return _supprimer_avec_etat(db, _charger(db, Maladie, id_, "Fiche introuvable."))


# --- Produits du comparateur de prix (F-ADM-28) --------------------------------------------------------------


def _pc_out(db: Db, x: ProduitProspective) -> s.ProduitComparateurOut:
    o = s.ProduitComparateurOut.model_validate(x)
    o.nombre_lignes = _compter(db, LigneProspective, LigneProspective.produit_id == x.id)
    return o


@router.get("/referentiels/produits-comparateur", response_model=Liste[s.ProduitComparateurOut])
def produits_comparateur(db: Db, page: PaginationGestion = Depends(), q: str | None = None, etat: int | None = None):
    req = select(ProduitProspective)
    if etat:
        req = req.where(ProduitProspective.etat == etat)
    if (c := recherche(q, ProduitProspective.nom)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(ProduitProspective.nom), page)
    return _liste([_pc_out(db, x) for x in items], total, page)


@router.get("/referentiels/produits-comparateur/{id_}", response_model=s.ProduitComparateurOut)
def produit_comparateur(id_: int, db: Db):
    return _pc_out(db, _charger(db, ProduitProspective, id_, "Produit introuvable."))


def _valider_pc(db: Db, d: s.ProduitComparateurEntree, exclure_id: int | None = None) -> None:
    if not _min(d.nom, 4):
        raise erreur("Veuillez corriger les champs signalés.", nom="Le nom du produit doit avoir 4 caractères minimum.")
    if _doublon(db, ProduitProspective, ProduitProspective.nom, d.nom, exclure_id=exclure_id):
        raise erreur("Ce produit est déjà enregistré.", nom="Ce produit est déjà enregistré.")


@router.post("/referentiels/produits-comparateur", response_model=Ok, status_code=201)
def creer_produit_comparateur(d: s.ProduitComparateurEntree, db: Db):
    _valider_pc(db, d)
    x = ProduitProspective(nom=d.nom.strip(), etat=d.etat)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/produits-comparateur/{id_}", response_model=Ok)
def modifier_produit_comparateur(id_: int, d: s.ProduitComparateurEntree, db: Db):
    x = _charger(db, ProduitProspective, id_, "Produit introuvable.")
    _valider_pc(db, d, exclure_id=x.id)
    x.nom, x.etat = d.nom.strip(), d.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/produits-comparateur/{id_}", response_model=Ok)
def supprimer_produit_comparateur(id_: int, db: Db):
    return _supprimer_avec_etat(db, _charger(db, ProduitProspective, id_, "Produit introuvable."))


# --- Banques (F-ADM-29) ------------------------------------------------------------------------------------------


@router.get("/referentiels/banques", response_model=Liste[s.BanqueOut])
def banques(db: Db, page: PaginationGestion = Depends(), q: str | None = None, etat: int | None = None):
    req = select(Banque)
    if etat:
        req = req.where(Banque.etat == etat)
    if (c := recherche(q, Banque.nom, Banque.sigle, Banque.nom_contact, Banque.observation)) is not None:
        req = req.where(c)
    items, total = paginer(db, req.order_by(Banque.nom), page)
    return _liste(items, total, page)


@router.get("/referentiels/banques/{id_}", response_model=s.BanqueOut)
def banque(id_: int, db: Db):
    return _charger(db, Banque, id_, "Banque introuvable.")


def _valider_banque(db: Db, d: s.BanqueEntree, exclure_id: int | None = None) -> None:
    if not _min(d.nom, 3):
        raise erreur("Veuillez corriger les champs signalés.", nom="Veuillez saisir le nom de la banque avec 3 caractères minimum.")
    sigle = d.sigle.strip().casefold()
    memes_noms = select(Banque.id, Banque.sigle, Banque.nom).where(Banque.id != (exclure_id or 0))
    if any((sg_ or "").strip().casefold() == sigle and (n or "").strip().casefold() == d.nom.strip().casefold()
           for _, sg_, n in db.execute(memes_noms).all()):
        raise erreur("Cette banque est déjà enregistrée.", nom="Cette banque est déjà enregistrée.")


def _appliquer_banque(x: Banque, d: s.BanqueEntree) -> None:
    x.sigle = d.sigle.strip().upper()
    x.nom, x.telephones, x.adresse, x.email = d.nom.strip(), d.telephones.strip(), d.adresse.strip(), d.email.strip()
    x.site_web, x.nom_contact, x.telephone_contact = d.site_web.strip(), d.nom_contact.strip(), d.telephone_contact.strip()
    x.observation, x.etat = d.observation.strip(), d.etat


@router.post("/referentiels/banques", response_model=Ok, status_code=201)
def creer_banque(d: s.BanqueEntree, db: Db):
    _valider_banque(db, d)
    x = Banque()
    _appliquer_banque(x, d)
    db.add(x)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=x.id)


@router.put("/referentiels/banques/{id_}", response_model=Ok)
def modifier_banque(id_: int, d: s.BanqueEntree, db: Db):
    x = _charger(db, Banque, id_, "Banque introuvable.")
    _valider_banque(db, d, exclure_id=x.id)
    _appliquer_banque(x, d)
    db.commit()
    return Ok(message="Modification effectuée.", id=x.id)


@router.delete("/referentiels/banques/{id_}", response_model=Ok)
def supprimer_banque(id_: int, db: Db):
    # Les tarifs bancaires et opérations gardent leur banque : suppression logique uniquement
    return _supprimer_avec_etat(db, _charger(db, Banque, id_, "Banque introuvable."))


# --- Paramètres du site (F-ADM-01 à F-ADM-04) -----------------------------------------------------------------


@router.get("/parametres", response_model=sg.Parametres)
def parametres(db: Db):
    return db.get(Parametre, 1) or Parametre(id=1)


@router.put("/parametres", response_model=Ok)
def modifier_parametres(d: sg.ParametresEntree, db: Db):
    """Tous les champs de `parametre`, nom du site compris (correctif F-ADM-02) ; téléphones
    validés avec un message par champ (correctif F-ADM-04). Les interrupteurs de modules
    (ADR-0009) masquent la navigation sans perte de données."""
    if not _min(d.nom_site, 2):
        raise erreur("Veuillez corriger les champs signalés.", nom_site="Veuillez indiquer le nom du site.")
    p = db.get(Parametre, 1)
    if p is None:
        p = Parametre(id=1)
        db.add(p)
    for champ, valeur in d.model_dump().items():
        if isinstance(valeur, str):
            valeur = valeur.strip()
        setattr(p, champ, valeur if valeur is not None else "")
    db.commit()
    return Ok(message="Modification effectuée.")


routers = [router]
