"""Schémas du Business plan « auto-diagnostic » (legacy incl-businessplan.php, table businessplan)."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Schema
from app.services import fichiers

# Les 25 zones du legacy (zone02 à zone26), dans l'ordre du formulaire, avec leur libellé exact
# (orthographe corrigée). `niveau_realisation` (zone23) est un pourcentage 0-100.
LIBELLES: dict[str, str] = {
    "type_activite": "Quel est le type d'activité ?",
    "description_projet": "Description du projet",
    "moyens_actuels": "Les moyens actuels pour le projet",
    "ressources_disponibles": "Vos ressources disponibles",
    "possessions": "Qu'est-ce que vous possédez ?",
    "organisation_actuelle": "Quelle est l'organisation actuelle ?",
    "organisation_souhaitee": "Quelle est l'organisation souhaitée ?",
    "detail_besoin": "Le détail de votre besoin",
    "apport_actuel": "Quel est votre apport ?",
    "ambition": "Quelle est votre ambition ?",
    "strategie_resultats": "Comment comptez-vous atteindre vos résultats ?",
    "valeur_ajoutee": "Quelle est votre valeur ajoutée ?",
    "prevision_ca_benefice": "Combien comptez-vous brasser une fois le projet lancé, en ventes et en bénéfice ?",
    "processus_activite": "Quel est le processus de cette activité ?",
    "estimation_charges": "À combien quantifiez-vous l'ensemble des charges ?",
    "composantes_ca": "Quelles sont les composantes de votre chiffre d'affaires ?",
    "repartition_ca": "Quelle est la répartition de votre chiffre d'affaires ?",
    "elements_environnementaux": "Quels sont les éléments environnementaux qui vous confortent dans votre projet ?",
    "strategie_attaque": "Quelle sera votre stratégie d'attaque ?",
    "devis_chiffre_besoin": "Quel est le devis chiffré de votre besoin ?",
    "apport_prevu": "Quel sera votre apport ?",
    "niveau_realisation": "Quel est le niveau de réalisation de votre projet ?",
    "difficultes_realisation": "Quelles sont les difficultés dans la réalisation de votre projet ?",
    "planning_execution": "Quel est votre planning d'exécution du projet ?",
    "difficultes_futures": "Quelles sont les difficultés à venir auxquelles vous pourriez être confronté·e ?",
}
CHAMPS_TEXTE = [c for c in LIBELLES if c != "niveau_realisation"]

Texte = Annotated[str, Field(max_length=5000)]


class BusinessPlanEntree(BaseModel):
    """« Sauvegarder » (`envoyer = False`) = brouillon ; « Envoyer » = soumis au conseiller
    (ADR-0004, ADR-0007 S5d)."""

    type_activite: str = Field(default="", max_length=120)
    description_projet: Texte = ""
    moyens_actuels: Texte = ""
    ressources_disponibles: Texte = ""
    possessions: Texte = ""
    organisation_actuelle: Texte = ""
    organisation_souhaitee: Texte = ""
    detail_besoin: Texte = ""
    apport_actuel: Texte = ""
    ambition: Texte = ""
    strategie_resultats: Texte = ""
    valeur_ajoutee: Texte = ""
    prevision_ca_benefice: Texte = ""
    processus_activite: Texte = ""
    estimation_charges: Texte = ""
    composantes_ca: Texte = ""
    repartition_ca: Texte = ""
    elements_environnementaux: Texte = ""
    strategie_attaque: Texte = ""
    devis_chiffre_besoin: Texte = ""
    apport_prevu: Texte = ""
    niveau_realisation: int = Field(default=0, ge=0, le=100)
    difficultes_realisation: Texte = ""
    planning_execution: Texte = ""
    difficultes_futures: Texte = ""
    envoyer: bool = False


class MembreBP(Schema):
    """Porteur du business plan : visible de lui-même et des gestionnaires seulement."""

    id: int
    pseudonyme: str
    nom: str
    sexe: int
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class BusinessPlanResume(Schema):
    id: int
    reference: str
    date_creation: datetime | None
    type_activite: str
    description_projet: str
    niveau_realisation: int
    etat: int
    membre: MembreBP | None


class BusinessPlanDetail(BusinessPlanResume):
    moyens_actuels: str
    ressources_disponibles: str
    possessions: str
    organisation_actuelle: str
    organisation_souhaitee: str
    detail_besoin: str
    apport_actuel: str
    ambition: str
    strategie_resultats: str
    valeur_ajoutee: str
    prevision_ca_benefice: str
    processus_activite: str
    estimation_charges: str
    composantes_ca: str
    repartition_ca: str
    elements_environnementaux: str
    strategie_attaque: str
    devis_chiffre_besoin: str
    apport_prevu: str
    difficultes_realisation: str
    planning_execution: str
    difficultes_futures: str
    peut_modifier: bool = False
    peut_moderer: bool = False


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
