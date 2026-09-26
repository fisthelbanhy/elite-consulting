from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.commun import Auteur, Schema


class BanqueCourte(Schema):
    id: int
    sigle: str
    nom: str


class Contexte(Schema):
    """Droits du lecteur sur une fiche de trésorerie."""

    peut_modifier: bool = False
    peut_moderer: bool = False
    peut_annuler: bool = False


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=4)


class Compteurs(BaseModel):
    placements: int
    operations: int
    credits: int
    contentieux: int


# --- Placement (S7-9) ----------------------------------------------------------------------------


class PlacementResume(Schema):
    id: int
    reference: str
    date_placement: datetime | None
    type_placement: int
    montant: int
    duree_mois: int
    taux: float
    etat: int
    membre: Auteur | None
    banques: list[BanqueCourte] = []


class PlacementDetail(PlacementResume, Contexte):
    secteur_activite: str
    observation: str
    banques_ids: list[int] = []


class PlacementEntree(BaseModel):
    type_placement: int | None = None
    montant: int | None = Field(default=None, ge=0)
    duree_mois: int | None = Field(default=None, ge=0)
    taux: float | None = Field(default=None, ge=0)
    banques: list[int] = []
    secteur_activite: str = Field(default="", max_length=120)
    observation: str = Field(default="", max_length=3000)


# --- Opération bancaire (S7-10, S7-11) -----------------------------------------------------------


class OperationLigne(BaseModel):
    date_operation: date | None = None
    montant: int | None = Field(default=None, ge=0)
    devise: int | None = None
    type_operation: int | None = None
    banque_emettrice_id: int | None = None
    banque_emettrice_nom: str = Field(default="", max_length=130)
    banque_emettrice_email: str = Field(default="", max_length=250)
    beneficiaire: str = Field(default="", max_length=120)
    banque_beneficiaire_id: int | None = None
    banque_beneficiaire_nom: str = Field(default="", max_length=130)
    banque_beneficiaire_adresse: str = Field(default="", max_length=250)


class OperationsEntree(BaseModel):
    """Saisie en grille (jusqu'à 15 ordres, comme le legacy) ; les lignes entièrement vides sont
    ignorées, les lignes incomplètes sont signalées (correctif F-S7-30)."""

    lignes: list[OperationLigne] = Field(default=[], max_length=15)


class OperationResume(Schema):
    id: int
    reference: str
    date_saisie: datetime | None
    date_operation: date | None
    montant: int
    devise: int
    type_operation: int
    beneficiaire: str
    etat: int
    membre: Auteur | None
    sens: str = "credit"
    # Noms résolus (saisie libre « banque non listée » ou référentiel)
    nom_banque_emettrice: str = ""
    nom_banque_beneficiaire: str = ""


class OperationLot(BaseModel):
    id: int
    date_operation: date | None
    montant: int
    devise: int
    type_operation: int
    beneficiaire: str


class OperationDetail(OperationResume, Contexte):
    banque_emettrice_id: int | None = None
    banque_emettrice_nom: str = ""
    banque_emettrice_email: str = ""
    banque_beneficiaire_id: int | None = None
    banque_beneficiaire_nom: str = ""
    banque_beneficiaire_adresse: str = ""
    email_destinataire: bool = False
    lot: list[OperationLot] = []


class SyntheseLigne(BaseModel):
    sens: str
    devise: int
    nombre: int
    total: int


class OperationsOk(BaseModel):
    message: str
    id: int | None = None
    reference: str | None = None
    ids: list[int] = []
    emails: int = 0


# --- Demande de crédit (S7-12) -------------------------------------------------------------------


class CreditResume(Schema):
    id: int
    reference: str
    date_demande: date | None
    montant: int
    objet: str
    duree_mois: int
    niveau_realisation: float
    garantie: str
    etat: int
    membre: Auteur | None


class CreditDetail(CreditResume, Contexte):
    delai_reponse_jours: int
    observation: str
    devis_global: str
    apport_propre: str


class CreditEntree(BaseModel):
    montant: int | None = Field(default=None, ge=0)
    objet: str = Field(default="", max_length=3000)
    duree_mois: int | None = Field(default=None, ge=0)
    niveau_realisation: float = Field(default=0, ge=0, le=100)
    garantie: str = Field(default="", max_length=3000)
    delai_reponse_jours: int = Field(default=0, ge=0, le=366)
    observation: str = Field(default="", max_length=3000)
    devis_global: str = Field(default="", max_length=3000)
    apport_propre: str = Field(default="", max_length=3000)


# --- Contentieux (S7-13) -------------------------------------------------------------------------

MONTANTS_CONTENTIEUX = (
    "dette_compromise", "revenus_journaliers", "revenus_hebdomadaires", "revenus_mensuels", "charges_fixes",
    "charges_variables", "entrees_activite_en_cours", "entrees_previsionnelles", "entrees_totales",
    "echeance_supportable",
)
TEXTES_CONTENTIEUX = ("activites_en_cours", "activite_previsionnelle", "echeance_actuelle", "elements_favorables")


class ContentieuxResume(Schema):
    id: int
    reference: str
    date_dossier: datetime | None
    dette_compromise: int
    revenus_mensuels: int
    charges_fixes: int
    charges_variables: int
    entrees_previsionnelles: int
    echeance_supportable: int
    etat: int
    membre: Auteur | None


class ContentieuxDetail(ContentieuxResume, Contexte):
    dette_compromise_detail: str
    revenus_journaliers: int
    revenus_journaliers_detail: str
    revenus_hebdomadaires: int
    revenus_hebdomadaires_detail: str
    revenus_mensuels_detail: str
    charges_fixes_detail: str
    charges_variables_detail: str
    activites_en_cours: str
    entrees_activite_en_cours: int
    entrees_activite_en_cours_detail: str
    activite_previsionnelle: str
    entrees_previsionnelles_detail: str
    entrees_totales: int
    entrees_totales_detail: str
    echeance_actuelle: str
    echeance_supportable_detail: str
    elements_favorables: str


class ContentieuxEntree(BaseModel):
    dette_compromise: int = Field(default=0, ge=0)
    dette_compromise_detail: str = Field(default="", max_length=3000)
    revenus_journaliers: int = Field(default=0, ge=0)
    revenus_journaliers_detail: str = Field(default="", max_length=3000)
    revenus_hebdomadaires: int = Field(default=0, ge=0)
    revenus_hebdomadaires_detail: str = Field(default="", max_length=3000)
    revenus_mensuels: int = Field(default=0, ge=0)
    revenus_mensuels_detail: str = Field(default="", max_length=3000)
    charges_fixes: int = Field(default=0, ge=0)
    charges_fixes_detail: str = Field(default="", max_length=3000)
    charges_variables: int = Field(default=0, ge=0)
    charges_variables_detail: str = Field(default="", max_length=3000)
    activites_en_cours: str = Field(default="", max_length=3000)
    entrees_activite_en_cours: int = Field(default=0, ge=0)
    entrees_activite_en_cours_detail: str = Field(default="", max_length=3000)
    activite_previsionnelle: str = Field(default="", max_length=3000)
    entrees_previsionnelles: int = Field(default=0, ge=0)
    entrees_previsionnelles_detail: str = Field(default="", max_length=3000)
    entrees_totales: int = Field(default=0, ge=0)
    entrees_totales_detail: str = Field(default="", max_length=3000)
    echeance_actuelle: str = Field(default="", max_length=3000)
    echeance_supportable: int = Field(default=0, ge=0)
    echeance_supportable_detail: str = Field(default="", max_length=3000)
    elements_favorables: str = Field(default="", max_length=3000)
