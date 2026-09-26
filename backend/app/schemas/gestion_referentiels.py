"""Schémas des référentiels administrés par les gestionnaires (E-ADM-03 à E-ADM-10)."""

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Schema
from app.services import fichiers


class Resume(BaseModel):
    cle: str
    libelle: str
    total: int


class Court(Schema):
    id: int
    nom: str


class LibelleCourt(Schema):
    id: int
    libelle: str


# --- Villes et quartiers (E-ADM-03) ----------------------------------------------------------------


class VilleOut(Schema):
    id: int
    nom: str
    nombre_quartiers: int = 0
    nombre_membres: int = 0


class VilleEntree(BaseModel):
    nom: str = Field(default="", max_length=80)


class QuartierOut(Schema):
    id: int
    nom: str
    ville_id: int
    ville: Court | None = None
    nombre_annonces: int = 0


class QuartierEntree(BaseModel):
    ville_id: int | None = None
    nom: str = Field(default="", max_length=80)


# --- Diplômes (E-ADM-04) ----------------------------------------------------------------------------


class DiplomeOut(Schema):
    id: int
    code: str
    libelle: str


class DiplomeEntree(BaseModel):
    code: str = Field(default="", max_length=20)
    libelle: str = Field(default="", max_length=100)


# --- Secteurs et domaines (E-ADM-05) ---------------------------------------------------------------


class SecteurOut(Schema):
    id: int
    libelle: str
    etat: int
    nombre_domaines: int = 0


class SecteurEntree(BaseModel):
    libelle: str = Field(default="", max_length=200)
    etat: int = Field(default=2, ge=1, le=3)


class DomaineOut(Schema):
    id: int
    libelle: str
    etat: int
    secteur_id: int | None
    secteur: LibelleCourt | None = None


class DomaineEntree(BaseModel):
    secteur_id: int | None = None
    libelle: str = Field(default="", max_length=200)
    etat: int = Field(default=2, ge=1, le=3)


# --- Familles d'articles (E-ADM-06) ------------------------------------------------------------------


class FamilleOut(Schema):
    id: int
    libelle: str
    nombre_articles: int = 0


class FamilleEntree(BaseModel):
    libelle: str = Field(default="", max_length=100)


# --- Produits (E-ADM-08) -------------------------------------------------------------------------------


class ProduitOut(Schema):
    id: int
    reference: str
    nom: str
    description: str
    groupe: int
    prix_distributeur: int
    prix_non_distributeur: int
    prix_public: int
    quantite_stock: int
    etat: int
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class ProduitEntree(BaseModel):
    # Groupe FLP (GroupeProduit) ; les groupes hors liste de la reprise (0, 100) restent acceptés
    # sur un produit qui les porte déjà
    groupe: int = Field(default=0, ge=0, le=999)
    reference: str = Field(default="", max_length=30)
    nom: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=10000)
    prix_distributeur: int = Field(default=0, ge=0)
    prix_non_distributeur: int = Field(default=0, ge=0)
    prix_public: int = Field(default=0, ge=0)
    quantite_stock: int = Field(default=0, ge=0)
    etat: int = Field(default=2, ge=1, le=3)


class ProduitCourt(Schema):
    id: int
    nom: str
    reference: str
    groupe: int
    etat: int


# --- Maladies (E-ADM-07) --------------------------------------------------------------------------------


class ConseilProduitOut(Schema):
    id: int
    produit_id: int
    produit: ProduitCourt | None = None
    posologie: str
    ordre: int


class MaladieOut(Schema):
    id: int
    libelle: str
    description: str
    etat: int
    nombre_produits: int = 0


class MaladieDetail(MaladieOut):
    produits: list[ConseilProduitOut] = []


class ConseilProduitEntree(BaseModel):
    produit_id: int
    # « Conseil d'utilisation » (ADR-0009 : le mot « posologie » n'est plus affiché)
    posologie: str = Field(default="", max_length=2000)


class MaladieEntree(BaseModel):
    libelle: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=10000)
    etat: int = Field(default=2, ge=1, le=3)
    produits: list[ConseilProduitEntree] = Field(default_factory=list, max_length=50)


# --- Produits du comparateur (E-ADM-09) -----------------------------------------------------------------


class ProduitComparateurOut(Schema):
    id: int
    nom: str
    etat: int
    nombre_lignes: int = 0


class ProduitComparateurEntree(BaseModel):
    nom: str = Field(default="", max_length=200)
    etat: int = Field(default=2, ge=1, le=3)


# --- Banques (E-ADM-10) ---------------------------------------------------------------------------------


class BanqueOut(Schema):
    id: int
    membre_id: int | None
    sigle: str
    nom: str
    telephones: str
    adresse: str
    email: str
    site_web: str
    nom_contact: str
    telephone_contact: str
    observation: str
    etat: int


class BanqueEntree(BaseModel):
    sigle: str = Field(default="", max_length=30)
    nom: str = Field(default="", max_length=120)
    telephones: str = Field(default="", max_length=100)
    adresse: str = Field(default="", max_length=500)
    email: str = Field(default="", max_length=120)
    site_web: str = Field(default="", max_length=200)
    nom_contact: str = Field(default="", max_length=100)
    telephone_contact: str = Field(default="", max_length=100)
    observation: str = Field(default="", max_length=5000)
    etat: int = Field(default=2, ge=1, le=3)
