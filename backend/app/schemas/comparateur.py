"""Schémas du comparateur de prix B2B (legacy : incl-choix6B.php, incl-prospective.php,
pproduitptpv.php). Inventaire : S6-3, S6-4, F-S6-14 à F-S6-22 ; ADR-0007 S6a."""

from pydantic import BaseModel, Field, computed_field

from app.schemas.commun import Schema
from app.schemas.entreprises import EntrepriseOption, VilleCourte
from app.services import fichiers


class Acces(BaseModel):
    """Droit de consulter le comparateur. `motif` ∈ visiteur, personne_physique, sans_entreprise."""

    acces: bool
    motif: str | None = None
    message: str | None = None
    gestionnaire: bool = False
    entreprises: list[EntrepriseOption] = []


class ProduitOut(Schema):
    id: int
    nom: str
    etat: int
    offres: int = 0
    demandes: int = 0


class ProduitEntree(BaseModel):
    nom: str = Field(default="", max_length=200)
    etat: int = Field(default=2, ge=1, le=3)


class EntrepriseContact(Schema):
    """Entreprise d'une ligne du comparateur : ses coordonnées d'annuaire servent au bouton
    « Contacter » (e-mail / WhatsApp)."""

    id: int
    nom: str
    forme_juridique: int
    telephone: str
    email: str
    ville: VilleCourte | None
    logo: str | None

    @computed_field
    @property
    def logo_url(self) -> str | None:
        return fichiers.url(self.logo)


class ProduitCourt(Schema):
    id: int
    nom: str


class LigneOut(Schema):
    id: int
    offre_ou_demande: int
    produit: ProduitCourt
    unite_vente: str
    prix: int
    quantite_mensuelle: int
    fournisseur_ou_client: str


class LigneComparee(LigneOut):
    entreprise: EntrepriseContact


class EnTeteFiche(Schema):
    """En-tête de la fiche prospective : l'entreprise (et non plus le membre, ADR-0007 S6a)."""

    id: int
    reference: str
    nom: str
    forme_juridique: int
    adresse: str
    telephone: str
    email: str
    site_web: str
    ville: VilleCourte | None
    logo: str | None

    @computed_field
    @property
    def logo_url(self) -> str | None:
        return fichiers.url(self.logo)


class FicheDetail(BaseModel):
    entreprise: EnTeteFiche
    sigle: str = ""
    fiche_id: int | None = None
    offres: list[LigneOut] = []
    demandes: list[LigneOut] = []
    entreprises: list[EntrepriseOption] = []
    peut_modifier: bool = False


class LigneEntree(BaseModel):
    entreprise_id: int
    offre_ou_demande: int = Field(ge=1, le=2)
    produit_id: int | None = None
    nouveau_produit: str = Field(default="", max_length=200)
    unite_vente: str = Field(default="", max_length=50)
    prix: int = Field(default=0, ge=0)
    quantite_mensuelle: int = Field(default=0, ge=0)
    fournisseur_ou_client: str = Field(default="", max_length=200)


class EmailEntree(BaseModel):
    message: str = Field(default="", max_length=5000)
