"""Back-office « Gestion » (legacy : menu gestionnaire `incl-menu1.php`, écrans `p*.php`).

Tout le préfixe `/gestion` est réservé aux gestionnaires (F-ADM-39, ADR-0007 T1) : la
dépendance `gestionnaire_requis` est posée sur chaque routeur. Les actions sensibles vérifient
en plus le droit nécessaire (Activation, Attribution).

Découpage :
- ce fichier : tableau de bord, compteurs de la barre latérale, file de modération transverse ;
- `gestion_membres.py` : membres, droits, code de pointage, réinitialisations de mot de passe ;
- `gestion_referentiels.py` : référentiels et paramètres du site ;
- `gestion_journaux.py` : journaux des visites et des connexions.
"""

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, gestionnaire_requis
from app.enums import Etat, EtatCourse, EtatPaiement, TypeMembre
from app.erreurs import erreur
from app.models import (
    Contact,
    Course,
    Membre,
    Message,
    Paiement,
    ReinitialisationMotDePasse,
    Suggestion,
    Visite,
    VisiteMembre,
)
from app.routers import gestion_journaux, gestion_membres, gestion_referentiels
from app.schemas import gestion as s
from app.services import gestion as svc
from app.services.gestion import PaginationGestion

router = APIRouter(prefix="/gestion", tags=["Gestion"], dependencies=[Depends(gestionnaire_requis)])


def _compteurs(db: Db) -> s.Compteurs:
    def n(modele, *conds) -> int:
        return db.scalar(select(func.count()).select_from(modele).where(*conds)) or 0

    return s.Compteurs(
        nouveaux_membres=n(Membre, Membre.etat == Etat.NON_TRAITE, Membre.id != svc.ID_COMPTE_SYSTEME),
        paiements_en_attente=n(Paiement, Paiement.etat == EtatPaiement.NON_CONFIRME),
        fiches_en_attente=sum(svc.compter_en_attente(db).values()),
        reinitialisations_en_attente=n(ReinitialisationMotDePasse, *svc.demandes_en_attente()),
        messages_non_lus=n(Message, Message.de_la_frangine.is_(False), Message.lu.is_(False)),
        contacts_a_traiter=n(Contact, Contact.etat == Etat.NON_TRAITE),
    )


@router.get("/compteurs", response_model=s.Compteurs)
def compteurs(db: Db):
    """Pastilles de la barre latérale (legacy : « New Membres: N » du pied de page, F-TRV-70)."""
    return _compteurs(db)


@router.get("/tableau-de-bord", response_model=s.TableauDeBord)
def tableau_de_bord(db: Db, moi: Gestionnaire):
    """Page d'accueil exploitable du gestionnaire (correctif F-TRV-06 : page vide dans le legacy)."""
    base = _compteurs(db)
    maintenant = datetime.now()
    aujourdhui = date.today()
    debut_30 = datetime.combine(aujourdhui - timedelta(days=29), time.min)
    debut_7 = datetime.combine(aujourdhui - timedelta(days=6), time.min)

    def n(modele, *conds) -> int:
        return db.scalar(select(func.count()).select_from(modele).where(*conds)) or 0

    # Série journalière des 30 derniers jours (visites anonymes et connexions de membres)
    jour_v = func.date(Visite.date_heure)
    jour_c = func.date(VisiteMembre.date_connexion)
    visites = {str(j): c for j, c in db.execute(
        select(jour_v, func.count()).where(Visite.date_heure >= debut_30).group_by(jour_v)).all()}
    connexions = {str(j): c for j, c in db.execute(
        select(jour_c, func.count()).where(VisiteMembre.date_connexion >= debut_30).group_by(jour_c)).all()}
    serie = []
    for i in range(29, -1, -1):
        j = aujourdhui - timedelta(days=i)
        serie.append(s.PointSerie(jour=j, visites=visites.get(j.isoformat(), 0), connexions=connexions.get(j.isoformat(), 0)))

    par_module = svc.compter_en_attente(db)
    inscrits = db.scalars(
        select(Membre).options(selectinload(Membre.ville))
        .where(Membre.id != svc.ID_COMPTE_SYSTEME, Membre.etat != Etat.SUPPRIME)
        .order_by(Membre.date_creation.desc(), Membre.id.desc()).limit(8)
    ).all()
    return s.TableauDeBord(
        **base.model_dump(),
        membres=n(Membre, Membre.etat != Etat.SUPPRIME, Membre.id != svc.ID_COMPTE_SYSTEME),
        membres_en_ligne=n(Membre, Membre.type_compte != TypeMembre.GESTIONNAIRE,
                           Membre.derniere_activite >= maintenant - svc.PRESENCE),
        montant_en_attente=int(db.scalar(select(func.coalesce(func.sum(Paiement.montant), 0))
                                         .where(Paiement.etat == EtatPaiement.NON_CONFIRME)) or 0),
        suggestions_a_lire=n(Suggestion, Suggestion.etat == Etat.NON_TRAITE),
        courses_en_attente=n(Course, Course.etat_course == EtatCourse.EN_ATTENTE, Course.etat != Etat.SUPPRIME),
        modules_en_attente=[s.CompteurModule(cle=m.cle, libelle=m.libelle, total=par_module[m.cle]) for m in svc.MODULES_MODERES],
        visites_7j=sum(p.visites for p in serie if p.jour >= debut_7.date()),
        visites_30j=sum(p.visites for p in serie),
        connexions_7j=sum(p.connexions for p in serie if p.jour >= debut_7.date()),
        connexions_30j=sum(p.connexions for p in serie),
        serie=serie,
        derniers_inscrits=[s.Inscrit.model_validate(m) for m in inscrits],
        droits={"attribution": moi.droit_attribution, "caisse": moi.droit_caisse, "activation": moi.droit_activation},
    )


@router.get("/moderation", response_model=s.FileModeration)
def moderation(db: Db, page: PaginationGestion = Depends(), module: str | None = None):
    """File transverse des fiches en attente (état 1) de tous les modules. La modération se fait
    ensuite sur la fiche elle-même (panneau de modération, droit Activation)."""
    par_module = svc.compter_en_attente(db)
    modules = [s.CompteurModule(cle=m.cle, libelle=m.libelle, total=par_module[m.cle]) for m in svc.MODULES_MODERES]
    if module and module not in svc.MODULES_PAR_CLE:
        raise erreur("Module inconnu.", module="Module inconnu.")

    if module:
        m = svc.MODULES_PAR_CLE[module]
        fiches = db.scalars(m.requete_en_attente().offset(page.offset).limit(page.taille)).all()
        elements = [svc.element_moderation(m, f) for f in fiches]
        total = par_module[module]
    else:
        # Volume faible (quelques dizaines de fiches) : fusion en mémoire, plus récentes d'abord
        elements = []
        for m in svc.MODULES_MODERES:
            if par_module[m.cle]:
                elements += [svc.element_moderation(m, f) for f in db.scalars(m.requete_en_attente()).all()]

        def cle_tri(e: dict) -> datetime:
            d = e["date"]
            if d is None:
                return datetime.min
            return d if isinstance(d, datetime) else datetime.combine(d, time.min)

        elements.sort(key=cle_tri, reverse=True)
        total = len(elements)
        elements = elements[page.offset: page.offset + page.taille]

    noms = svc.pseudonymes(db, {e["auteur_id"] for e in elements if e["auteur_id"]})
    items = [s.ElementModeration(**e, auteur_pseudonyme=noms.get(e["auteur_id"])) for e in elements]
    return s.FileModeration(items=items, total=total, page=page.page, taille=page.taille, modules=modules)


routers = [
    router,
    *gestion_membres.routers,
    *gestion_referentiels.routers,
    *gestion_journaux.routers,
]
