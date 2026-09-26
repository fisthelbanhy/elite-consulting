"""Schémas des courses & livraison (legacy `course1`/`course2`, écrans S3-C1 à C3) et du
catalogue des boutiques partenaires (`articlecourse`, écrans S3-D1/D2)."""

from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Auteur, Schema
from app.schemas.immobilier import ContactMembre
from app.services import fichiers

LIGNES_MAX = 25  # grille legacy de 25 articles


class LigneCourseEntree(BaseModel):
    """Saisie libre (nom, prix plafond, quantité) ou article du catalogue de la boutique choisie
    (`article_catalogue_id` : nom et prix repris du catalogue, seule la quantité compte)."""

    article_catalogue_id: int | None = None
    nom_article: str = Field(default="", max_length=200)
    prix_plafond: int = Field(default=0, ge=0, le=1_000_000_000)
    quantite: int = Field(default=0, ge=0, le=100_000)
    observation: str = Field(default="", max_length=250)


class CourseEntree(BaseModel):
    boutique_id: int | None = None
    lieu_achat: str = Field(default="", max_length=500)
    date_achat: date | None = None
    date_livraison: datetime | None = None
    lieu_livraison: str = Field(default="", max_length=500)
    observation: str = Field(default="", max_length=2000)
    lignes: list[LigneCourseEntree] = Field(default_factory=list)


class LigneCourseOut(Schema):
    id: int | None = None
    article_catalogue_id: int | None = None
    nom_article: str
    prix_plafond: int
    quantite: int
    observation: str = ""

    @computed_field
    @property
    def montant(self) -> int:
        return self.prix_plafond * self.quantite


class Recapitulatif(BaseModel):
    """Résultat de la « Vérification » (1er temps de la validation, F-S3-58/59/61)."""

    montant_achats: int
    frais_service: int
    net_a_payer: int
    montant_minimum: int
    nombre_articles: int
    lignes: list[LigneCourseOut]
    lieu_achat: str


class CourseResume(Schema):
    id: int
    reference: str
    client: Auteur | None = None
    boutique: Auteur | None = None
    date_creation: datetime | None = None
    date_achat: date | None = None
    date_livraison: datetime | None = None
    lieu_achat: str
    montant_achats: int
    frais_service: int
    mode_paiement: int
    paye: int
    etat_course: int
    etat: int
    lignes: list[LigneCourseOut] = []

    @computed_field
    @property
    def net_a_payer(self) -> int:
        return self.montant_achats + self.frais_service


class PaiementCourse(Schema):
    id: int
    date_paiement: datetime
    mode: int
    montant: int
    etat: int


class CourseDetail(CourseResume):
    boutique_id: int | None = None
    lieu_livraison: str
    observation: str
    # Coordonnées du client : boutique concernée et gestionnaires seulement
    contact_client: ContactMembre | None = None
    paiement: PaiementCourse | None = None
    # Contexte du lecteur
    est_client: bool = False
    peut_modifier: bool = False
    peut_annuler: bool = False
    peut_gerer: bool = False  # changer l'état de la course (boutique concernée, gestionnaire)
    peut_moderer: bool = False  # état de la fiche (gestionnaire + droit Activation)
    peut_payer: bool = False
    etats_possibles: list[int] = []


class EtatCourseEntree(BaseModel):
    etat_course: int = Field(ge=1, le=4)


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Boutique(Schema):
    id: int
    pseudonyme: str
    nom: str
    adresse: str = ""
    nombre_articles: int = 0
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


# --- Catalogue boutique --------------------------------------------------------------------------


class ArticleCatalogue(Schema):
    id: int
    boutique_id: int | None = None
    boutique: Auteur | None = None
    code: str
    nom: str
    marque: str
    prix: int
    disponible: int
    description: str
    etat: int
    photo: str | None = None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class ArticleCatalogueDetail(ArticleCatalogue):
    peut_modifier: bool = False
    peut_moderer: bool = False


class ArticleCatalogueEntree(BaseModel):
    boutique_id: int | None = None  # imposé pour une boutique ; choisi par un gestionnaire
    code: str = Field(default="", max_length=15)
    nom: str = Field(default="", max_length=200)
    marque: str = Field(default="", max_length=30)
    prix: int = Field(default=0, ge=0, le=1_000_000_000)
    disponible: int = Field(default=1, ge=1, le=2)
    description: str = Field(default="", max_length=2000)
