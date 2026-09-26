"""Courses & livraison : commande de courses en saisie libre, avec choix optionnel dans le
catalogue d'une boutique partenaire (ADR-0007 S3c), et catalogue « Vos articles » des boutiques.
Legacy : choix3.php imbart=3, incl-choix3C.php, incl-course-1.php (actif), incl-course.php (mort),
particlecourse.php. Inventaire : F-S3-47 à F-S3-75. Paiement (type 4) : services/ecommerce.py."""

from datetime import date, datetime, time
from typing import Annotated, Literal

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.deps import Db, MembreOpt, MembreReq, Page, exiger_droit, peut_modifier, verifier_modification
from app.enums import BanqueBoutique, CategorieMembre, Etat, EtatCourse, OuiNon
from app.erreurs import erreur, interdit, introuvable
from app.models import ArticleCourse, Course, LigneCourse, Membre, Parametre
from app.schemas import courses as s
from app.schemas.commun import Liste, Ok
from app.schemas.immobilier import ContactMembre
from app.services import ecommerce, fichiers
from app.services.fiches import changer_etat, obtenir, paginer, recherche, visibilite
from app.services.references import Prefixe, nouvelle_reference

router = APIRouter(prefix="/courses", tags=["Courses & livraison"])

# Créneau de livraison legacy : 10 h à 18 h (sélecteur d'heure), minutes 0 à 59
HEURE_MIN, HEURE_MAX = 10, 18


def est_boutique(m: Membre | None) -> bool:
    """Boutique partenaire : personne morale de type « Boutique » (legacy banqboutqmbr=2)."""
    return (
        m is not None
        and m.categorie == CategorieMembre.MORALE
        and m.type_partenaire == BanqueBoutique.BOUTIQUE
        and m.etat != Etat.SUPPRIME
    )


def _parametre(db: Db) -> Parametre:
    return db.get(Parametre, 1) or Parametre(montant_minimum_course=0, commission_course=0)


# --- Boutiques partenaires -----------------------------------------------------------------------


@router.get("/boutiques", response_model=list[s.Boutique])
def boutiques(db: Db):
    """Boutiques partenaires proposées dans le formulaire de course, avec leur nombre d'articles
    disponibles au catalogue."""
    membres = db.scalars(
        select(Membre).where(
            Membre.categorie == CategorieMembre.MORALE,
            Membre.type_partenaire == BanqueBoutique.BOUTIQUE,
            Membre.etat != Etat.SUPPRIME,
        ).order_by(Membre.pseudonyme, Membre.nom)
    ).all()
    compte = dict(db.execute(
        select(ArticleCourse.boutique_id, func.count())
        .where(ArticleCourse.etat == Etat.AUTORISE, ArticleCourse.disponible == OuiNon.OUI)
        .group_by(ArticleCourse.boutique_id)
    ).all())
    return [
        s.Boutique(id=m.id, pseudonyme=m.pseudonyme or m.nom, nom=m.nom, adresse=m.adresse,
                   nombre_articles=compte.get(m.id, 0), photo=m.photo)
        for m in membres
    ]


# --- Catalogue « Vos articles » (particlecourse.php) ---------------------------------------------


@router.get("/catalogue", response_model=Liste[s.ArticleCatalogue])
def catalogue(
    db: Db,
    membre: MembreOpt,
    page: Page,
    boutique_id: int | None = None,
    disponible: Annotated[int | None, Query(ge=1, le=2)] = None,
    prix_min: Annotated[int | None, Query(ge=0)] = None,
    prix_max: Annotated[int | None, Query(ge=0)] = None,
    q: str | None = None,
    miens: bool = False,
    etat: int | None = None,
):
    """Public : articles publiés (pour composer une course). Boutique : aussi les siens non
    publiés ; `miens=true` pour sa liste de gestion. Gestionnaire : tout (F-S3-70). Chaque borne de
    prix s'applique seule et les filtres « disponibilité » et « mot » fonctionnent (correctifs)."""
    req = select(ArticleCourse).options(selectinload(ArticleCourse.boutique))
    if (cond := visibilite(ArticleCourse, membre, colonne_auteur="boutique_id")) is not None:
        req = req.where(cond)
    if membre and membre.est_gestionnaire:
        req = req.where(ArticleCourse.etat == etat) if etat else req.where(ArticleCourse.etat != Etat.SUPPRIME)
    if miens and membre:
        req = req.where(ArticleCourse.boutique_id == membre.id)
    for cond in (
        ArticleCourse.boutique_id == boutique_id if boutique_id else None,
        ArticleCourse.disponible == disponible if disponible else None,
        ArticleCourse.prix >= prix_min if prix_min else None,
        ArticleCourse.prix <= prix_max if prix_max else None,
        recherche(q, ArticleCourse.code, ArticleCourse.nom, ArticleCourse.description, ArticleCourse.marque),
    ):
        if cond is not None:
            req = req.where(cond)
    items, total = paginer(db, req.order_by(ArticleCourse.nom, ArticleCourse.id), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


def _article_catalogue(db: Db, id_: int, membre) -> ArticleCourse:
    return obtenir(db, ArticleCourse, id_, membre, colonne_auteur="boutique_id",
                   message="Cet article n'existe pas ou n'est plus proposé.")


@router.get("/catalogue/{id_}", response_model=s.ArticleCatalogueDetail)
def article_catalogue(id_: int, db: Db, membre: MembreOpt):
    fiche = _article_catalogue(db, id_, membre)
    d = s.ArticleCatalogueDetail.model_validate(fiche)
    d.peut_modifier = peut_modifier(membre, fiche.boutique_id)
    d.peut_moderer = membre is not None and membre.peut_moderer()
    return d


def _valider_article(db: Db, d: s.ArticleCatalogueEntree, boutique_id: int | None, exclure_id: int | None = None) -> None:
    """Règles legacy (particlecourse.php), messages harmonisés (F-S3-72/73)."""
    champs: dict[str, str] = {}
    if not boutique_id or not est_boutique(db.get(Membre, boutique_id)):
        champs["boutique_id"] = "Veuillez indiquer la boutique."
    if len(d.nom.strip()) < 3:
        champs["nom"] = "Le nom de l'article doit avoir 3 caractères minimum."
    if d.prix < 1:
        champs["prix"] = "Veuillez indiquer le prix de vente."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    doublon = select(ArticleCourse.id).where(
        ArticleCourse.boutique_id == boutique_id, ArticleCourse.nom == d.nom.strip(),
        ArticleCourse.description == d.description.strip(), ArticleCourse.etat != Etat.SUPPRIME,
    )
    if exclure_id:
        doublon = doublon.where(ArticleCourse.id != exclure_id)
    if db.scalar(doublon.limit(1)):
        raise erreur("Cet article est déjà enregistré.", nom="Votre catalogue contient déjà cet article.")


def _appliquer_article(fiche: ArticleCourse, d: s.ArticleCatalogueEntree) -> None:
    fiche.code = d.code.strip()
    fiche.nom = d.nom.strip()
    fiche.marque = d.marque.strip()
    fiche.prix = d.prix
    fiche.disponible = d.disponible
    fiche.description = d.description.strip()


@router.post("/catalogue", response_model=Ok, status_code=201)
def creer_article(donnees: s.ArticleCatalogueEntree, db: Db, membre: MembreReq):
    """Une boutique ajoute un article à son catalogue ; un gestionnaire habilité peut le faire
    pour une boutique (le legacy l'en empêchait)."""
    if est_boutique(membre):
        boutique_id = membre.id
    elif membre.peut_moderer():
        boutique_id = donnees.boutique_id
    else:
        raise interdit("Le catalogue est réservé aux boutiques partenaires.")
    _valider_article(db, donnees, boutique_id)
    fiche = ArticleCourse(boutique_id=boutique_id, etat=Etat.AUTORISE)
    _appliquer_article(fiche, donnees)
    db.add(fiche)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=fiche.id)


@router.put("/catalogue/{id_}", response_model=Ok)
def modifier_article(id_: int, donnees: s.ArticleCatalogueEntree, db: Db, membre: MembreReq):
    fiche = _article_catalogue(db, id_, membre)
    verifier_modification(membre, fiche.boutique_id)
    _valider_article(db, donnees, fiche.boutique_id, exclure_id=fiche.id)
    _appliquer_article(fiche, donnees)
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.post("/catalogue/{id_}/photo", response_model=Ok)
async def photo_article(id_: int, db: Db, membre: MembreReq, fichier: UploadFile = File(...)):
    fiche = _article_catalogue(db, id_, membre)
    verifier_modification(membre, fiche.boutique_id)
    ancien = fiche.photo
    fiche.photo = await fichiers.enregistrer(fichier, "courses", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=fiche.id)


@router.post("/catalogue/{id_}/etat", response_model=Ok)
def etat_article(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    fiche = _article_catalogue(db, id_, membre)
    changer_etat(fiche, donnees.etat, membre)  # F-S3-74 : gestionnaire + droit Activation
    db.commit()
    return Ok(message="Modification effectuée.", id=fiche.id)


@router.delete("/catalogue/{id_}", response_model=Ok)
def supprimer_article(id_: int, db: Db, membre: MembreReq):
    fiche = _article_catalogue(db, id_, membre)
    verifier_modification(membre, fiche.boutique_id)
    fiche.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Article retiré du catalogue.", id=fiche.id)


# --- Courses : validation ----------------------------------------------------------------------


def _preparer(db: Db, d: s.CourseEntree) -> tuple[list[dict], int, Membre | None, str]:
    """Règles legacy (incl-course-1.php), appliquées côté serveur et corrigées (F-S3-53 à 58) :
    la date du jour est acceptée, l'heure est contrôlée, une ligne incomplète est bloquante,
    le montant ne compte que les lignes réellement enregistrées."""
    champs: dict[str, str] = {}
    boutique = None
    if d.boutique_id:
        boutique = db.get(Membre, d.boutique_id)
        if not est_boutique(boutique):
            champs["boutique_id"] = "Veuillez choisir une boutique partenaire de la liste."
            boutique = None

    lieu_achat = d.lieu_achat.strip()
    if not lieu_achat and boutique is not None:
        lieu_achat = " — ".join(x for x in (boutique.nom.strip(), boutique.adresse.strip()) if x)
    if len(lieu_achat) < 10:
        champs["lieu_achat"] = "Veuillez indiquer le lieu des achats avec 10 caractères minimum."

    aujourd_hui = date.today()
    if d.date_achat is None:
        champs["date_achat"] = "Veuillez indiquer la date des achats."
    elif d.date_achat < aujourd_hui:
        champs["date_achat"] = "La date des courses ne peut être antérieure à la date du jour."
    if d.date_livraison is None:
        champs["date_livraison"] = "Veuillez indiquer la date de livraison ainsi que l'heure."
    else:
        livraison = d.date_livraison.replace(tzinfo=None, second=0, microsecond=0)
        if livraison.date() < aujourd_hui:
            champs["date_livraison"] = "La date de livraison ne peut être antérieure à la date du jour."
        elif not HEURE_MIN <= livraison.hour <= HEURE_MAX:
            champs["date_livraison"] = "Les livraisons se font entre 10 h 00 et 18 h 59."
        elif d.date_achat and livraison.date() < d.date_achat:
            champs["date_livraison"] = "La date de livraison ne peut être antérieure à la date des courses."
        elif livraison < datetime.now():
            champs["date_livraison"] = "Cette heure de livraison est déjà passée : choisissez un créneau à venir."
    if len(d.lieu_livraison.strip()) < 10:
        champs["lieu_livraison"] = "Veuillez indiquer le numéro de téléphone et le lieu de livraison."

    lignes: list[dict] = []
    montant = 0
    if len(d.lignes) > s.LIGNES_MAX:
        champs["lignes"] = f"{s.LIGNES_MAX} articles au maximum par course."
    for i, ligne in enumerate(d.lignes[: s.LIGNES_MAX], start=1):
        cle = f"ligne_{i}"
        if ligne.article_catalogue_id:
            if ligne.quantite < 1:
                continue  # article du catalogue non choisi
            art = db.get(ArticleCourse, ligne.article_catalogue_id)
            if art is None or art.etat != Etat.AUTORISE or boutique is None or art.boutique_id != boutique.id:
                champs[cle] = f"Ligne {i} : cet article n'est pas proposé par la boutique choisie."
                continue
            if art.disponible != OuiNon.OUI:
                champs[cle] = f"Ligne {i} : « {art.nom} » n'est plus disponible."
                continue
            nom, prix = art.nom, art.prix
        else:
            nom, prix = ligne.nom_article.strip(), ligne.prix_plafond
            if not nom and prix == 0 and ligne.quantite == 0:
                continue  # ligne vide
            if len(nom) < 3 or prix < 1 or ligne.quantite < 1:
                champs[cle] = (f"Ligne {i} incomplète : indiquez l'article (3 caractères minimum), "
                               "le prix maxi et la quantité.")
                continue
        lignes.append({
            "article_catalogue_id": ligne.article_catalogue_id or None, "nom_article": nom,
            "prix_plafond": prix, "quantite": ligne.quantite, "observation": ligne.observation.strip(),
        })
        montant += prix * ligne.quantite

    minimum = _parametre(db).montant_minimum_course
    if "lignes" not in champs and not any(k.startswith("ligne_") for k in champs):
        if montant == 0:
            champs["lignes"] = "Veuillez indiquer le montant des achats."
        elif montant < minimum:
            champs["lignes"] = f"Le montant des courses ne doit pas être inférieur à {ecommerce.fcfa(minimum)}."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    return lignes, montant, boutique, lieu_achat


def _appliquer(c: Course, d: s.CourseEntree, lignes: list[dict], montant: int, boutique: Membre | None, lieu_achat: str):
    c.boutique_id = boutique.id if boutique else None
    c.lieu_achat = lieu_achat
    c.date_achat = d.date_achat
    c.date_livraison = d.date_livraison.replace(tzinfo=None, second=0, microsecond=0) if d.date_livraison else None
    c.lieu_livraison = d.lieu_livraison.strip()
    c.observation = d.observation.strip()
    c.montant_achats = montant
    # F-S3-63 : les lignes sont réellement remplacées en modification
    c.lignes = [LigneCourse(etat=Etat.AUTORISE, **ligne) for ligne in lignes]


# --- Courses : routes (déclarées après /boutiques, /catalogue, /verifier) -------------------------


@router.get("", response_model=Liste[s.CourseResume])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    etat_course: Annotated[int | None, Query(ge=1, le=4)] = None,
    commande_min: date | None = None,
    commande_max: date | None = None,
    achat_min: date | None = None,
    achat_max: date | None = None,
    livraison_min: date | None = None,
    livraison_max: date | None = None,
    q: str | None = None,
    boutique_id: int | None = None,
    role: Literal["client", "boutique"] | None = None,
    etat: int | None = None,
):
    """Un membre voit ses courses (et une boutique celles qui lui sont adressées), le gestionnaire
    toutes (F-S3-47). Chaque borne de date s'applique seule, jour inclus ; « Livrée » est
    filtrable (correctifs F-S3-48). Tri : les plus récentes d'abord."""
    req = select(Course).options(
        selectinload(Course.lignes), selectinload(Course.client), selectinload(Course.boutique)
    )
    if membre.est_gestionnaire:
        req = req.where(Course.etat == etat) if etat else req.where(Course.etat != Etat.SUPPRIME)
        if boutique_id:
            req = req.where(Course.boutique_id == boutique_id)
    else:
        req = req.where(Course.etat != Etat.SUPPRIME)
        if role == "client":
            req = req.where(Course.client_id == membre.id)
        elif role == "boutique":
            req = req.where(Course.boutique_id == membre.id)
        else:
            req = req.where(or_(Course.client_id == membre.id, Course.boutique_id == membre.id))
    for cond in (
        Course.etat_course == etat_course if etat_course else None,
        Course.date_creation >= datetime.combine(commande_min, time.min) if commande_min else None,
        Course.date_creation <= datetime.combine(commande_max, time.max) if commande_max else None,
        Course.date_achat >= achat_min if achat_min else None,
        Course.date_achat <= achat_max if achat_max else None,
        Course.date_livraison >= datetime.combine(livraison_min, time.min) if livraison_min else None,
        Course.date_livraison <= datetime.combine(livraison_max, time.max) if livraison_max else None,
        recherche(q, Course.reference, Course.lieu_achat, Course.lieu_livraison),
    ):
        if cond is not None:
            req = req.where(cond)
    items, total = paginer(db, req.order_by(Course.date_creation.desc(), Course.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


def _obtenir(db: Db, id_: int, membre: Membre) -> Course:
    c = db.get(Course, id_)
    if c is None:
        raise introuvable("Cette course n'existe pas.")
    if membre.est_gestionnaire:
        return c
    if c.etat == Etat.SUPPRIME or membre.id not in (c.client_id, c.boutique_id):
        raise introuvable("Cette course n'existe pas ou ne vous concerne pas.")
    return c


@router.post("/verifier", response_model=s.Recapitulatif)
def verifier(donnees: s.CourseEntree, db: Db, membre: MembreReq, course_id: int | None = None):
    """1er temps de la validation (« Vérification ») : contrôle et calcule montant, frais et net
    à payer, sans rien enregistrer (F-S3-58/59/61)."""
    frais = _parametre(db).commission_course
    if course_id:
        c = _obtenir(db, course_id, membre)
        verifier_modification(membre, c.client_id)
        frais = c.frais_service  # frais figés à la création
    lignes, montant, _boutique, lieu_achat = _preparer(db, donnees)
    return s.Recapitulatif(
        montant_achats=montant, frais_service=frais, net_a_payer=montant + frais,
        montant_minimum=_parametre(db).montant_minimum_course,
        nombre_articles=sum(ligne["quantite"] for ligne in lignes),
        lignes=[s.LigneCourseOut(**ligne) for ligne in lignes], lieu_achat=lieu_achat,
    )


@router.post("", response_model=Ok, status_code=201)
def creer(donnees: s.CourseEntree, db: Db, membre: MembreReq):
    lignes, montant, boutique, lieu_achat = _preparer(db, donnees)
    # Anti-doublon (legacy : même instant + même lieu) : commande identique encore en attente
    doublon = db.scalar(select(Course.id).where(
        Course.client_id == membre.id, Course.lieu_achat == lieu_achat, Course.date_achat == donnees.date_achat,
        Course.montant_achats == montant, Course.etat_course == EtatCourse.EN_ATTENTE, Course.etat != Etat.SUPPRIME,
        Course.lieu_livraison == donnees.lieu_livraison.strip(),
    ).limit(1))
    if doublon:
        raise erreur("Cette course est déjà faite.")
    c = Course(
        client_id=membre.id, etat=Etat.AUTORISE, etat_course=EtatCourse.EN_ATTENTE, paye=OuiNon.NON,
        mode_paiement=0, frais_service=_parametre(db).commission_course,  # frais figés (F-S3-59)
    )
    _appliquer(c, donnees, lignes, montant, boutique, lieu_achat)
    c.reference = nouvelle_reference(db, Prefixe.COURSE)
    db.add(c)
    db.flush()
    if boutique is not None:
        livraison = c.date_livraison.strftime("%d/%m/%Y à %H h %M") if c.date_livraison else ""
        ecommerce.prevenir(db, boutique.id, f"Nouvelle commande de courses {c.reference} pour votre boutique : "
                                            f"{ecommerce.fcfa(montant)} d'achats, livraison le {livraison}. "
                                            f"Détails : /courses/{c.id}")
    db.commit()
    return Ok(message="Votre course est bien enregistrée.", id=c.id, reference=c.reference)


def _detail(db: Db, c: Course, membre: Membre) -> s.CourseDetail:
    d = s.CourseDetail.model_validate(c)
    est_client = membre.id == c.client_id
    moderateur = membre.peut_moderer()
    boutique = c.boutique_id is not None and membre.id == c.boutique_id
    en_attente = c.etat_course == EtatCourse.EN_ATTENTE
    payee = c.paye == OuiNon.OUI
    p = ecommerce.paiement_en_cours(db, c.id)
    d.paiement = s.PaiementCourse.model_validate(p) if p else None
    d.est_client = est_client
    d.peut_modifier = (est_client or moderateur) and en_attente and not payee and c.etat != Etat.SUPPRIME
    d.peut_annuler = est_client and en_attente and not payee
    d.peut_gerer = (moderateur or boutique) and c.etat != Etat.SUPPRIME
    d.peut_moderer = moderateur
    d.peut_payer = (est_client and not payee and p is None and c.etat_course != EtatCourse.SUPPRIMEE
                    and c.etat != Etat.SUPPRIME)
    if d.peut_gerer:
        d.etats_possibles = [e.value for e in EtatCourse]
    elif d.peut_annuler:
        d.etats_possibles = [EtatCourse.SUPPRIMEE.value]
    if (boutique or membre.est_gestionnaire) and c.client is not None:
        d.contact_client = ContactMembre.model_validate(c.client)
    return d


@router.get("/{id_}", response_model=s.CourseDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    return _detail(db, _obtenir(db, id_, membre), membre)


@router.put("/{id_}", response_model=Ok)
def modifier(id_: int, donnees: s.CourseEntree, db: Db, membre: MembreReq):
    c = _obtenir(db, id_, membre)
    verifier_modification(membre, c.client_id)
    if c.etat_course != EtatCourse.EN_ATTENTE:  # F-S3-65
        raise erreur("Cette course n'est plus en attente : elle ne peut plus être modifiée.")
    if c.paye == OuiNon.OUI:
        raise erreur("Cette course est déjà payée : elle ne peut plus être modifiée.")
    lignes, montant, boutique, lieu_achat = _preparer(db, donnees)
    _appliquer(c, donnees, lignes, montant, boutique, lieu_achat)
    db.commit()
    return Ok(message="Modification effectuée.", id=c.id, reference=c.reference)


@router.post("/{id_}/etat-course", response_model=Ok)
def etat_course(id_: int, donnees: s.EtatCourseEntree, db: Db, membre: MembreReq):
    """Machine à états (F-S3-64) : le client peut seulement annuler une course en attente et non
    payée ; la boutique concernée et le gestionnaire habilité choisissent librement."""
    c = _obtenir(db, id_, membre)
    nouvel = EtatCourse(donnees.etat_course)
    gerant = membre.peut_moderer() or (c.boutique_id is not None and c.boutique_id == membre.id)
    if not gerant:
        if membre.id != c.client_id:
            raise interdit("Seuls la boutique concernée et la frangine gèrent l'état d'une course.")
        if c.etat_course != EtatCourse.EN_ATTENTE or nouvel != EtatCourse.SUPPRIMEE:
            raise interdit("Vous pouvez seulement annuler une course encore en attente.")
        if c.paye == OuiNon.OUI:
            raise erreur("Cette course est déjà payée : contactez la frangine pour l'annuler.")
    ancien = c.etat_course
    c.etat_course = nouvel
    if ancien != nouvel:
        if gerant and membre.id != c.client_id:
            ecommerce.prevenir(db, c.client_id, f"Votre course {c.reference} est maintenant « {nouvel.label} ». "
                                                f"Suivi : /courses/{c.id}")
        elif c.boutique_id and nouvel == EtatCourse.SUPPRIMEE:
            ecommerce.prevenir(db, c.boutique_id, f"Le client a annulé la course {c.reference}.")
    db.commit()
    message = "Votre course est annulée." if nouvel == EtatCourse.SUPPRIMEE and not gerant else "Modification effectuée."
    return Ok(message=message, id=c.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    c = _obtenir(db, id_, membre)
    changer_etat(c, donnees.etat, membre)  # état de la fiche : gestionnaire + droit Activation
    db.commit()
    return Ok(message="Modification effectuée.", id=c.id)


@router.delete("/{id_}", response_model=Ok)
def effacer(id_: int, db: Db, membre: MembreReq):
    """Suppression logique réservée au gestionnaire habilité (le client, lui, annule sa course)."""
    c = _obtenir(db, id_, membre)
    exiger_droit(membre, "activation")
    c.etat = Etat.SUPPRIME
    db.commit()
    return Ok(message="Fiche supprimée.", id=c.id)


routers = [router]
