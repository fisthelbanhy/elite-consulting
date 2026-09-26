"""Back-office « Gestion » : file de modération transverse, compteurs du tableau de bord, outils
sur les comptes membres (code de pointage, lien de réinitialisation, contrôles de droits).

Legacy : `incl-menu1.php` (menu gestionnaire), `pmembre.php`, pied de page « New Membres: N ».
Inventaire : F-TRV-06, F-TRV-70, F-ADM-05 à F-ADM-15.
"""

import secrets
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Annotated, Any

from fastapi import Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import Pagination, exiger_droit
from app.enums import Etat, TypeMembre
from app.erreurs import erreur, interdit, introuvable
from app.models import (
    AnnonceEmploi,
    AppelFond,
    Article,
    Conseil,
    ConseilFinance,
    Entreprise,
    GroupeLikelemba,
    Immobilier,
    Marche,
    Membre,
    Partenariat,
    Publicite,
    ReinitialisationMotDePasse,
    Reussite,
    Soungangai,
    Souscription,
)
from app.models import (
    Session as SessionMembre,
)
from app.security import hacher_mot_de_passe, nouveau_jeton

settings = get_settings()

# Compte technique du legacy (« Aucun » / concepteur du site) : masqué des listes (F-ADM-08)
ID_COMPTE_SYSTEME = 1

# Un lien transmis par la frangine (WhatsApp, téléphone) doit laisser le temps au membre de l'ouvrir
DUREE_LIEN_GESTIONNAIRE = timedelta(hours=24)

# Présence en ligne (ADR-0007 T3)
PRESENCE = timedelta(minutes=5)


class PaginationGestion(Pagination):
    """Pagination du back-office : 50 lignes par défaut, jusqu'à 500 (F-TRV-66, ADR-0007 T2)."""

    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        taille: Annotated[int, Query(ge=1, le=500)] = 50,
    ):
        super().__init__(page, taille)


def tronquer(texte: str | None, n: int = 90) -> str:
    t = " ".join((texte or "").split())
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


# --- File de modération transverse ------------------------------------------------------------


@dataclass(frozen=True)
class ModuleModere:
    """Un type de fiche soumis à la modération (état 1 « Non traité » = en attente)."""

    cle: str
    libelle: str
    modele: Any
    titre: Callable[[Any], str]
    lien: Callable[[Any], str]
    colonne_auteur: str | None = "auteur_id"
    colonne_date: str | None = "date_creation"
    conditions: tuple = field(default_factory=tuple)

    def requete_en_attente(self):
        req = select(self.modele).where(self.modele.etat == Etat.NON_TRAITE, *self.conditions)
        if self.colonne_date:
            req = req.order_by(getattr(self.modele, self.colonne_date).desc())
        return req.order_by(self.modele.id.desc())


# Les liens pointent vers la fiche publique, où le panneau de modération existant s'affiche
# pour un gestionnaire habilité (droit Activation).
MODULES_MODERES: list[ModuleModere] = [
    ModuleModere("emplois", "Emplois", AnnonceEmploi,
                 lambda f: f.poste_a_pourvoir or tronquer(f.competences) or f.reference,
                 lambda f: f"/emplois/{f.id}"),
    ModuleModere("immobilier", "Immobilier", Immobilier,
                 lambda f: tronquer(f.description) or f.localisation or f.reference,
                 lambda f: f"/immobilier/{f.id}"),
    ModuleModere("annonces", "Petites annonces", Article,
                 lambda f: f.libelle or f.reference, lambda f: f"/annonces/{f.id}"),
    ModuleModere("projets", "Appels de fonds", AppelFond,
                 lambda f: f.nom_projet or f.reference, lambda f: f"/projets/{f.id}"),
    ModuleModere("likelemba", "Likelemba", GroupeLikelemba,
                 lambda f: f"Groupe {f.code}" if f.code else f"Groupe n° {f.id}", lambda f: f"/likelemba/{f.id}",
                 colonne_auteur="responsable_id", colonne_date=None),
    ModuleModere("entreprises", "Entreprises", Entreprise,
                 lambda f: f.nom or f.reference, lambda f: f"/entreprises/{f.id}", colonne_auteur="membre_id"),
    ModuleModere("marches", "Marchés", Marche,
                 lambda f: tronquer(f.libelle) or f.numero_appel_offre or f.reference, lambda f: f"/marches/{f.id}"),
    ModuleModere("partenariats", "Partenariats", Partenariat,
                 lambda f: tronquer(f.actif) or tronquer(f.recherche) or f.reference, lambda f: f"/partenariats/{f.id}"),
    ModuleModere("publicites", "Publicités", Publicite,
                 lambda f: tronquer(f.objet) or tronquer(f.texte) or f.reference, lambda f: f"/gestion/publicites/{f.id}",
                 colonne_auteur="demandeur_id"),
    ModuleModere("reussites", "Réussites", Reussite,
                 lambda f: tronquer(f.projet) or tronquer(f.vision) or f.reference, lambda f: f"/reussites/{f.id}",
                 colonne_auteur="membre_id"),
    ModuleModere("questions", "Questions & conseils", Conseil,
                 lambda f: tronquer(f.objet) or tronquer(f.texte) or f.reference, lambda f: f"/questions/{f.id}",
                 conditions=(Conseil.sujet_id.is_(None),)),
    ModuleModere("conseil-financier", "Conseil financier", ConseilFinance,
                 lambda f: tronquer(f.objet) or tronquer(f.texte) or f.reference, lambda f: f"/conseil-financier/{f.id}",
                 conditions=(ConseilFinance.sujet_id.is_(None),)),
    ModuleModere("decouverte", "Découverte de soi", Soungangai,
                 lambda f: f"Fiche {f.reference}" if f.reference else f"Fiche n° {f.id}",
                 lambda f: f"/decouverte-de-soi/fiches/{f.id}", colonne_auteur="membre_id"),
    ModuleModere("distributeur", "Souscriptions distributeur", Souscription,
                 lambda f: f"Souscription {f.reference}" if f.reference else f"Souscription n° {f.id}",
                 lambda f: f"/devenir-distributeur/suivi/{f.id}", colonne_auteur="membre_id"),
]
MODULES_PAR_CLE = {m.cle: m for m in MODULES_MODERES}


def compter_en_attente(db: Session) -> dict[str, int]:
    return {
        m.cle: db.scalar(select(func.count()).select_from(m.modele).where(m.modele.etat == Etat.NON_TRAITE, *m.conditions)) or 0
        for m in MODULES_MODERES
    }


def pseudonymes(db: Session, ids: set[int]) -> dict[int, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return dict(db.execute(select(Membre.id, Membre.pseudonyme).where(Membre.id.in_(ids))).all())


def element_moderation(module: ModuleModere, fiche: Any) -> dict:
    return {
        "module": module.cle,
        "module_libelle": module.libelle,
        "id": fiche.id,
        "reference": getattr(fiche, "reference", None) or getattr(fiche, "code", None) or "",
        "titre": module.titre(fiche) or f"Fiche n° {fiche.id}",
        "auteur_id": getattr(fiche, module.colonne_auteur) if module.colonne_auteur else None,
        "date": getattr(fiche, module.colonne_date) if module.colonne_date else None,
        "lien": module.lien(fiche),
    }


# --- Comptes membres ----------------------------------------------------------------------------


def charger_membre(db: Session, id_: int, moi: Membre) -> Membre:
    """Le compte n° 1 (agence Primera-C, gestionnaire) est masqué des LISTES (F-ADM-08), mais sa
    fiche reste consultable : des fiches y renvoient comme auteur. Agir sur ce compte reste
    soumis à `exiger_attribution_si_gestionnaire`."""
    membre = db.get(Membre, id_)
    if membre is None:
        raise introuvable("Ce membre n'existe pas.")
    return membre


def exiger_attribution_si_gestionnaire(moi: Membre, cible: Membre) -> None:
    """Agir sur le compte d'un autre gestionnaire (mot de passe, état, suppression) donne accès
    au back-office : réservé à un gestionnaire ayant le droit d'attribution."""
    if cible.est_gestionnaire and cible.id != moi.id:
        exiger_droit(moi, "attribution")


def interdire_sur_soi(moi: Membre, cible: Membre, action: str) -> None:
    if moi.id == cible.id:
        raise interdit(f"Vous ne pouvez pas {action} votre propre compte depuis la gestion.")


def generer_code_pointage() -> str:
    """Code à 4 chiffres exactement, tiré par un générateur cryptographique (correctif F-ADM-13 :
    le legacy tirait un nombre entre 4 et 9999)."""
    return f"{secrets.randbelow(10000):04d}"


def attribuer_code_pointage(membre: Membre) -> str:
    code = generer_code_pointage()
    membre.code_pointage_hash = hacher_mot_de_passe(code)
    return code


def demandes_en_attente(membre_id: int | None = None):
    """Demandes « mot de passe oublié » sans e-mail, pas encore prises en charge (ADR-0005 §3)."""
    cond = [
        ReinitialisationMotDePasse.canal == "gestionnaire",
        ReinitialisationMotDePasse.jeton_hash.is_(None),
        ReinitialisationMotDePasse.traitee_par_id.is_(None),
    ]
    if membre_id is not None:
        cond.append(ReinitialisationMotDePasse.membre_id == membre_id)
    return cond


def creer_lien_reinitialisation(db: Session, membre: Membre, gestionnaire: Membre) -> tuple[str, datetime]:
    """Crée un lien à usage unique `/reinitialiser/{jeton}` que la frangine transmet au membre.
    Le mot de passe n'est jamais vu par personne. Les anciens liens non utilisés sont invalidés
    et les demandes en attente du membre sont marquées comme prises en charge."""
    maintenant = datetime.now()
    anciens = db.scalars(select(ReinitialisationMotDePasse).where(
        ReinitialisationMotDePasse.membre_id == membre.id,
        ReinitialisationMotDePasse.jeton_hash.is_not(None),
        ReinitialisationMotDePasse.date_utilisation.is_(None),
    )).all()
    for r in anciens:
        if r.date_expiration is None or r.date_expiration > maintenant:
            r.date_expiration = maintenant
    for demande in db.scalars(select(ReinitialisationMotDePasse).where(*demandes_en_attente(membre.id))).all():
        demande.traitee_par_id = gestionnaire.id
    jeton, jeton_hash = nouveau_jeton()
    expire = maintenant + DUREE_LIEN_GESTIONNAIRE
    db.add(ReinitialisationMotDePasse(
        membre_id=membre.id, jeton_hash=jeton_hash, canal="gestionnaire",
        date_expiration=expire, traitee_par_id=gestionnaire.id,
    ))
    return jeton, expire


def fermer_sessions(db: Session, membre_id: int) -> None:
    db.execute(delete(SessionMembre).where(SessionMembre.membre_id == membre_id))


def verifier_unicite(db: Session, *, identifiant: str, pseudonyme: str, telephone: str, email: str | None,
                     exclure_id: int | None = None) -> None:
    """Identifiant, pseudonyme, téléphone et e-mail uniques parmi les comptes non supprimés
    (ADR-0007 T6). Téléphone et e-mail vides ne sont pas comparés."""

    def existe(cond) -> bool:
        q = select(Membre.id).where(cond, Membre.etat != Etat.SUPPRIME)
        if exclure_id:
            q = q.where(Membre.id != exclure_id)
        return db.scalar(q.limit(1)) is not None

    champs: dict[str, str] = {}
    if existe(func.lower(Membre.identifiant) == identifiant.lower()):
        champs["identifiant"] = "Cet identifiant est déjà utilisé."
    if existe(func.lower(Membre.pseudonyme) == pseudonyme.lower()):
        champs["pseudonyme"] = "Ce pseudonyme (ou sigle) est déjà utilisé."
    if telephone and existe(Membre.telephone == telephone):
        champs["telephone"] = "Un autre compte utilise déjà ce numéro."
    if email and existe(func.lower(Membre.email) == email.lower()):
        champs["email"] = "Un autre compte utilise déjà cet e-mail."
    if champs:
        raise erreur("Ce membre semble déjà inscrit.", **champs)


def est_en_ligne(membre: Membre) -> bool:
    return bool(membre.derniere_activite and membre.derniere_activite >= datetime.now() - PRESENCE)


def libelle_type(type_compte: int) -> str:
    return TypeMembre.libelle(type_compte)
