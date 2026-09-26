"""Génération des références métier, au format exact du legacy (`fonctreference()`) :
PRÉFIXE + mois sur 2 chiffres + compteur global + année sur 2 chiffres.
Ex. : `DEI` + `11` + `21` + `17` → `DEI112117`."""

from datetime import datetime

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.core import Parametre
from app.models.fonds import GroupeLikelemba


class Prefixe:  # $arraycodereference
    MEMBRE = "MBR"
    SOUNGANGAI = "LSG"
    DEMANDE_EMPLOI = "DEI"
    OFFRE_EMPLOI = "OE1"
    IMMOBILIER = "IMB"
    ARTICLE = "ACL"
    COURSE = "CRS"
    PROJET = "PJT"
    LIKELEMBA = "LKB"
    FOND_SOUTIEN = "FDS"
    BUSINESS_PLAN = "BSP"
    PARTENARIAT = "PTR"
    ENTREPRISE = "ENT"
    MARCHE = "MCH"
    CONSEIL_FINANCE = "CFR"
    ACCOMP_BUSINESS_PLAN = "ABP"
    ACCOMP_PROJET_AGRICOLE = "APA"
    ACCOMP_RESTRUCTURATION = "ARC"
    ACCOMP_CREDIT_IMMOBILIER = "ACI"
    PLACEMENT = "PCM"
    OPERATION_BANQUE = "OPB"
    DEMANDE_CREDIT = "DDC"
    CONTENTIEUX = "CCT"
    APPEL_FOND = "ALF"
    APPORT_FOND = "ATF"
    REUSSITE = "RST"
    PUBLICITE = "PUB"
    CONSEIL = "CSL"
    POINT_CAISSE = "PCS"
    SOUSCRIPTION = "SOA"


def _incrementer(db: Session, colonne) -> int:
    valeur = db.execute(
        update(Parametre).where(Parametre.id == 1).values({colonne: colonne + 1}).returning(colonne)
    ).scalar_one()
    return int(valeur)


def nouvelle_reference(db: Session, prefixe: str, maintenant: datetime | None = None) -> str:
    n = _incrementer(db, Parametre.compteur_reference)
    d = maintenant or datetime.now()
    return f"{prefixe.upper()}{d:%m}{n}{d:%y}"


def nouveau_code_membre(db: Session) -> str:
    n = _incrementer(db, Parametre.compteur_membre)
    d = datetime.now()
    return f"MBR{d:%m}{n}{d:%y}"


def code_adhesion_likelemba(db: Session, groupe: GroupeLikelemba) -> str:
    """`{n}{code_groupe}` — n = rang d'entrée dans le groupe (fonctreference1(10, …))."""
    n = db.execute(
        update(GroupeLikelemba)
        .where(GroupeLikelemba.id == groupe.id)
        .values(compteur_entrees=GroupeLikelemba.compteur_entrees + 1)
        .returning(GroupeLikelemba.compteur_entrees)
    ).scalar_one()
    return f"{n}{groupe.code}"


def numero_recu_likelemba(db: Session, groupe: GroupeLikelemba) -> str:
    """`{code_groupe}P{n}` — n = numéro de paiement dans le groupe (fonctreference1(11, …))."""
    n = db.execute(
        update(GroupeLikelemba)
        .where(GroupeLikelemba.id == groupe.id)
        .values(compteur_paiements=GroupeLikelemba.compteur_paiements + 1)
        .returning(GroupeLikelemba.compteur_paiements)
    ).scalar_one()
    return f"{groupe.code}P{n}"
