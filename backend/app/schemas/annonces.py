"""Schémas des petites annonces d'articles (legacy `article`, `panier` typepnr=2, écrans S3-B1 à B4)."""

from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Auteur, Schema
from app.schemas.immobilier import InteretOut
from app.services import fichiers

QUANTITE_MAX = 1_000_000


class FamilleOut(Schema):
    id: int
    libelle: str


class ArticleResume(Schema):
    id: int
    reference: str
    offre_ou_recherche: int
    famille: FamilleOut | None = None
    libelle: str
    prix: int
    quantite: int
    neuf_ou_occasion: int
    description: str
    etat: int
    date_creation: datetime | None = None
    nombre_visites: int
    date_derniere_visite: datetime | None = None
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class ArticleDetail(ArticleResume):
    famille_id: int | None = None
    auteur: Auteur | None = None
    # Contexte du lecteur
    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_manifester: bool = False  # recherche : intéressement
    peut_acheter: bool = False  # offre : ajout au panier
    mon_interet: bool = False
    quantite_panier: int = 0  # quantité déjà dans mon panier (non payée)
    interets: list[InteretOut] | None = None


class ArticleEntree(BaseModel):
    offre_ou_recherche: int = 0
    famille_id: int | None = None
    libelle: str = Field(default="", max_length=200)
    prix: int = Field(default=0, ge=0, le=1_000_000_000_000)
    quantite: int = Field(default=0, ge=0, le=QUANTITE_MAX)
    neuf_ou_occasion: int = 0
    description: str = Field(default="", max_length=5000)


class Compteurs(BaseModel):
    offres: int
    recherches: int
    total: int


class Encarts(BaseModel):
    nouveautes: list[ArticleResume]
    plus_visites: list[ArticleResume]


# --- Panier ------------------------------------------------------------------------------------


class QuantiteEntree(BaseModel):
    quantite: int = Field(default=0, ge=0, le=QUANTITE_MAX)


class ArticlePanier(Schema):
    id: int
    reference: str
    libelle: str
    prix: int
    quantite: int  # stock
    etat: int
    offre_ou_recherche: int
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class MembrePanier(Schema):
    id: int
    pseudonyme: str
    nom: str


class LignePanierOut(Schema):
    id: int
    article: ArticlePanier | None = None
    quantite: int
    prix_unitaire: int
    date_ajout: datetime
    membre: MembrePanier | None = None  # renseigné pour le gestionnaire (paniers de tous les membres)
    stock_insuffisant: bool = False

    @computed_field
    @property
    def montant(self) -> int:
        return self.prix_unitaire * self.quantite


class AchatOut(BaseModel):
    """Ligne déjà réglée (historique des achats du membre)."""

    id: int
    article_id: int | None
    libelle: str
    quantite: int
    prix_unitaire: int
    montant: int
    date_paiement: date | None
    etat_paiement: int | None


class Panier(BaseModel):
    lignes: list[LignePanierOut]
    total_quantite: int
    total_montant: int
    stock_suffisant: bool
    peut_payer: bool
    message: str | None = None
    achats: list[AchatOut] = []
