from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Option, Schema
from app.services import fichiers
from app.services import publicites as svc


class EntreprisePub(Schema):
    id: int
    nom: str

    @computed_field
    @property
    def nom_affiche(self) -> str:
        return svc.texte_brut(self.nom)


class DemandeurPub(Schema):
    id: int
    nom: str
    pseudonyme: str


class _Media(Schema):
    fichier: str | None = None

    @computed_field
    @property
    def fichier_url(self) -> str | None:
        return fichiers.url(self.fichier)

    @computed_field
    @property
    def genre(self) -> str | None:
        """« image », « son » ou « video » d'après le fichier réellement enregistré."""
        return svc.genre_reel(self.fichier)


class PubliciteDiffusee(_Media):
    """Vue publique : ni demandeur, ni statistiques."""

    id: int
    texte: str
    lien: str
    entreprise: EntreprisePub | None = None

    @computed_field
    @property
    def texte_affiche(self) -> str:
        return svc.texte_brut(self.texte)

    @computed_field
    @property
    def annonceur(self) -> str | None:
        return self.entreprise.nom_affiche if self.entreprise else None


class PubliciteDetail(PubliciteDiffusee):
    reference: str
    date_debut: date | None
    date_fin: date | None
    type_fichier: int
    etat: int
    date_creation: datetime | None = None
    en_diffusion: bool = False
    # Réservés aux gestionnaires et au demandeur (mis à None sinon)
    nombre_vues: int | None = None
    date_derniere_vue: datetime | None = None
    demandeur: DemandeurPub | None = None
    # Contexte du lecteur
    peut_gerer: bool = False
    peut_moderer: bool = False


class PubliciteGestion(_Media):
    """Ligne de la liste de gestion (vue tableau ou cartes, F-ADM-38)."""

    id: int
    reference: str
    demandeur_id: int | None
    demandeur: DemandeurPub | None
    entreprise_id: int | None
    entreprise: EntreprisePub | None
    objet: str
    texte: str
    lien: str
    date_debut: date | None
    date_fin: date | None
    type_fichier: int
    nombre_vues: int
    date_derniere_vue: datetime | None
    etat: int
    date_creation: datetime | None
    en_diffusion: bool = False

    @computed_field
    @property
    def texte_affiche(self) -> str:
        return svc.texte_brut(self.texte)


class PubliciteEntree(BaseModel):
    demandeur_id: int | None = None
    entreprise_id: int | None = None
    texte: str = Field(default="", max_length=4000)
    lien: str = Field(default="", max_length=255)
    date_debut: date | None = None
    date_fin: date | None = None
    type_fichier: int | None = None
    # Pris en compte seulement pour un gestionnaire ayant le droit « Activation » (F-ADM-35)
    etat: int | None = Field(default=None, ge=1, le=3)


class EtatPublicite(BaseModel):
    etat: int = Field(ge=1, le=3)


class ChoixPublicite(BaseModel):
    membres: list[Option]
    entreprises: list[Option]
