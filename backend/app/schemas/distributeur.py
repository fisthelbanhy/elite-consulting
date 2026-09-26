"""Schémas du parcours « Devenir distributeur » (legacy incl-adhesion.php)."""

import datetime as dt
from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Ok, Schema
from app.services import fichiers


class ProspectEntree(BaseModel):
    # Limites élargies par rapport au legacy (30 / 9 / 30 / 120 caractères) : voir la doc du module
    nom_prenom: str = Field(default="", max_length=60)
    telephone: str = Field(default="", max_length=20)
    email: str = Field(default="", max_length=120)
    commentaire: str = Field(default="", max_length=120)


class FormationEntree(BaseModel):
    prestation: int = Field(ge=1, le=4)  # Prestation : POA, Journée de succès, Formation animateur, Formation manager
    date: dt.date | None = None
    lieu: str = Field(default="", max_length=80)
    heure: str = Field(default="", max_length=30)  # correctif F-S5-27 : plus de troncature à 8 caractères


class FilleulEntree(BaseModel):
    nom: str = Field(default="", max_length=60)
    email: str = Field(default="", max_length=120)
    adresse: str = Field(default="", max_length=120)
    montant: int = Field(default=0, ge=0, le=100_000_000)  # correctif F-S5-30 : plus de limite à 127
    date_presentation: date | None = None


class LigneKitEntree(BaseModel):
    produit_id: int
    quantite: int = Field(default=0, ge=0, le=999)


class EtapeEntree(BaseModel):
    """Données d'une étape de l'assistant ; seuls les champs de l'étape `etape` sont pris en compte.
    `avancer` : l'utilisateur passe à l'étape suivante (sinon simple sauvegarde / retour)."""

    etape: int = Field(ge=1, le=9)
    avancer: bool = True
    # Étapes 1 à 3
    objectifs: str = Field(default="", max_length=4000)
    mon_histoire: str = Field(default="", max_length=4000)
    disponibilite_hebdo: int = Field(default=0, ge=0, le=3)
    # Étape 4
    prospects: list[ProspectEntree] = Field(default_factory=list, max_length=25)
    date_limite_complement: date | None = None
    # Étape 5
    formations: list[FormationEntree] = Field(default_factory=list, max_length=4)
    # Étape 7
    nombre_rdv: int = Field(default=0, ge=0, le=999)
    # Étape 8
    filleuls: list[FilleulEntree] = Field(default_factory=list, max_length=3)
    # Étape 9 : « Sauvegarder » (envoyer = False) ou « Envoyer »
    mode_souscription: int = Field(default=0, ge=0, le=2)
    produits: list[LigneKitEntree] = Field(default_factory=list, max_length=500)
    envoyer: bool = False


class EtapeOk(Ok):
    etape_courante: int
    a_payer: bool = False
    montant: int = 0


class ProspectOut(Schema):
    id: int
    nom_prenom: str
    telephone: str
    email: str
    commentaire: str


class ProduitKit(Schema):
    id: int
    reference: str
    nom: str
    groupe: int
    prix_distributeur: int
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class LigneKitOut(BaseModel):
    produit_id: int
    nom: str
    prix_unitaire: int
    quantite: int

    @computed_field
    @property
    def montant(self) -> int:
        return self.prix_unitaire * self.quantite


class MembreSouscripteur(Schema):
    """Identité et coordonnées du souscripteur : lui-même et les gestionnaires uniquement."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str
    email: str | None


class SouscriptionResume(Schema):
    id: int
    reference: str
    date_creation: datetime | None
    mode_souscription: int
    montant: int
    etape_courante: int
    etat: int
    membre: MembreSouscripteur | None = None
    # EtatPaiement du dernier paiement déclaré (None = aucun)
    etat_paiement: int | None = None

    @computed_field
    @property
    def envoyee(self) -> bool:
        return self.etape_courante >= 10


class SouscriptionDetail(SouscriptionResume):
    objectifs: str
    mon_histoire: str
    disponibilite_hebdo: int
    formations: list[dict]
    nombre_rdv: int
    filleuls: list[dict]
    date_limite_complement: date | None
    prospects: list[ProspectOut] = []
    kit: list[LigneKitOut] = []
    peut_moderer: bool = False


class Statut(BaseModel):
    """Statut du lecteur pour les appels à l'action de la page de présentation."""

    connecte: bool
    gestionnaire: bool = False
    distributeur: bool = False
    souscription: SouscriptionResume | None = None


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)
