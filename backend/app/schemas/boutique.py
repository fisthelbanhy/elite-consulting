"""Schémas de la boutique bien-être : catalogue Forever Living Products, panier produits,
fiches bien-être (legacy incl-venteproduit.php, incl-choix1C.php)."""

from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Liste, Schema
from app.services import fichiers


class ProduitResume(Schema):
    id: int
    reference: str
    nom: str
    description: str
    groupe: int
    prix_distributeur: int
    prix_public: int
    quantite_stock: int
    nombre_visites: int
    photo: str | None
    # Prix payé par le lecteur (ADR-0007 S5a) : distributeur → prix distributeur, sinon prix public
    prix: int = 0

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class ProduitDetail(ProduitResume):
    prix_non_distributeur: int
    date_derniere_visite: datetime | None
    distributeur: bool = False


class Catalogue(Liste[ProduitResume]):
    """Page du catalogue + statut du lecteur (pour afficher « votre prix »)."""

    distributeur: bool = False


class Groupe(BaseModel):
    """Groupe FLP (`GroupeProduit`) ; `groupe = 0` regroupe les produits hors nomenclature."""

    groupe: int
    libelle: str
    nombre: int


# --- Panier -------------------------------------------------------------------------------------


class LigneAjout(BaseModel):
    produit_id: int
    quantite: int = Field(ge=0, le=999)


class AjoutPanier(BaseModel):
    """Ajout multiple en une action (legacy : sélecteurs de quantité + bouton « Panier »)."""

    lignes: list[LigneAjout] = Field(min_length=1, max_length=200)


class QuantiteEntree(BaseModel):
    quantite: int = Field(ge=1, le=999)


class ProduitPanier(Schema):
    id: int
    reference: str
    nom: str
    quantite_stock: int
    etat: int
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class LignePanierOut(Schema):
    id: int
    produit: ProduitPanier | None
    quantite: int
    prix_unitaire: int
    date_ajout: datetime
    # Quantité demandée (toutes lignes du produit) supérieure au stock, ou produit retiré
    bloquante: bool = False

    @computed_field
    @property
    def montant(self) -> int:
        return self.prix_unitaire * self.quantite


class Panier(BaseModel):
    lignes: list[LignePanierOut]
    quantite_totale: int
    total: int
    payable: bool
    message: str | None = None
    distributeur: bool = False


class MembrePanier(Schema):
    """Coordonnées d'un acheteur : réservées aux gestionnaires."""

    id: int
    pseudonyme: str
    nom: str
    telephone: str


class LigneSuivi(LignePanierOut):
    membre_id: int
    membre: MembrePanier | None = None
    paye: bool
    date_paiement: date | None
    paiement_id: int | None
    # EtatPaiement : 1 Non payé, 2 Paiement non confirmé, 3 Paiement confirmé
    etat_paiement: int = 1


class ListeSuivi(Liste[LigneSuivi]):
    somme: int = 0


# --- Fiches bien-être ----------------------------------------------------------------------------


class MaladieResume(Schema):
    id: int
    libelle: str
    description: str
    nombre_produits: int = 0


class ProduitConseille(BaseModel):
    produit: ProduitResume
    # Legacy « posologie » : renommé « conseil d'utilisation » (ADR-0009)
    conseil_utilisation: str


class MaladieDetail(BaseModel):
    id: int
    libelle: str
    description: str
    produits: list[ProduitConseille]
    distributeur: bool = False
