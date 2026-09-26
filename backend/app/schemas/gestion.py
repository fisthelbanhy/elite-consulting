"""Schémas du back-office : tableau de bord, membres, réinitialisations, journaux, modération,
paramètres du site. Les référentiels sont dans `gestion_referentiels.py`."""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.schemas.commun import Liste, Ok, Schema
from app.services import fichiers
from app.services.validation import verifier_telephone

# --- Commun ---------------------------------------------------------------------------------------


class MembreCourt(Schema):
    id: int
    pseudonyme: str
    nom: str


class VilleCourte(Schema):
    id: int
    nom: str


class EtatEntree(BaseModel):
    etat: int = Field(ge=1, le=3)


# --- Tableau de bord ----------------------------------------------------------------------------


class CompteurModule(BaseModel):
    cle: str
    libelle: str
    total: int


class PointSerie(BaseModel):
    jour: date
    visites: int
    connexions: int


class Inscrit(Schema):
    id: int
    nom: str
    pseudonyme: str
    categorie: int
    type_compte: int
    etat: int
    date_creation: datetime | None
    ville: VilleCourte | None
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class Compteurs(BaseModel):
    """Compteurs légers affichés dans la barre latérale de la gestion."""

    nouveaux_membres: int
    paiements_en_attente: int
    fiches_en_attente: int
    reinitialisations_en_attente: int
    messages_non_lus: int
    contacts_a_traiter: int


class TableauDeBord(Compteurs):
    membres: int
    membres_en_ligne: int
    montant_en_attente: int
    suggestions_a_lire: int
    courses_en_attente: int
    modules_en_attente: list[CompteurModule]
    visites_7j: int
    visites_30j: int
    connexions_7j: int
    connexions_30j: int
    serie: list[PointSerie]
    derniers_inscrits: list[Inscrit]
    droits: dict[str, bool]


# --- Membres --------------------------------------------------------------------------------------


class MembreLigne(Schema):
    id: int
    type_compte: int
    categorie: int
    code_membre: str
    nom: str
    pseudonyme: str
    telephone: str
    email: str | None
    ville: VilleCourte | None
    etat: int
    date_creation: datetime | None
    derniere_connexion: datetime | None
    droit_attribution: bool
    droit_caisse: bool
    droit_activation: bool
    point_caisse_actif: bool
    photo: str | None

    @computed_field
    @property
    def photo_url(self) -> str | None:
        return fichiers.url(self.photo)


class ListeMembres(Liste[MembreLigne]):
    pass


class DemandeResume(Schema):
    id: int
    canal: str
    date_creation: datetime


class MembreDetail(MembreLigne):
    sexe: int
    identifiant: str
    adresse: str
    observation: str
    ville_id: int | None
    numero_piece_identite: str
    employeur: str
    situation_matrimoniale: int | None
    nombre_enfants: int
    forme_juridique: int | None
    type_partenaire: int | None
    domaine_activite_id: int | None
    date_limite_master: date | None
    solde_point_caisse: int
    date_dernier_pointage: datetime | None
    derniere_activite: datetime | None
    # Calculés par le routeur (jamais le hash du mot de passe ni du code)
    domaine_libelle: str | None = None
    a_code_pointage: bool = False
    en_ligne: bool = False
    nombre_connexions: int = 0
    nombre_paiements: int = 0
    paiements_en_attente: int = 0
    demandes_reinitialisation: list[DemandeResume] = []
    # Contexte du gestionnaire qui consulte
    est_moi: bool = False
    peut_modifier: bool = False
    peut_attribuer: bool = False


class MembreEntree(BaseModel):
    """Création ou modification complète d'une fiche par un gestionnaire (F-ADM-09/10).
    Les droits et le mot de passe ont leurs propres actions."""

    type_compte: int = Field(ge=1, le=3)
    categorie: int = Field(ge=1, le=2)
    nom: str = Field(default="", max_length=120)
    pseudonyme: str = Field(default="", max_length=50)
    identifiant: str = Field(default="", max_length=50)
    telephone: str = ""
    email: EmailStr | None = None
    ville_id: int | None = None
    adresse: str = Field(default="", max_length=500)
    sexe: int | None = None
    situation_matrimoniale: int | None = None
    nombre_enfants: int = Field(default=0, ge=0, le=30)
    employeur: str = Field(default="", max_length=120)
    numero_piece_identite: str = Field(default="", max_length=50)
    forme_juridique: int | None = None
    type_partenaire: int | None = None
    domaine_activite_id: int | None = None
    observation: str = Field(default="", max_length=5000)
    etat: int = Field(default=2, ge=1, le=3)
    point_caisse_actif: bool = False
    date_limite_master: date | None = None
    # Création seulement : vide = un lien d'activation est généré pour que le membre choisisse
    # lui-même son mot de passe
    mot_de_passe: str = Field(default="", max_length=200)

    @field_validator("telephone")
    @classmethod
    def _tel(cls, v: str) -> str:
        return verifier_telephone(v)

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None


class DroitsEntree(BaseModel):
    droit_attribution: bool = False
    droit_caisse: bool = False
    droit_activation: bool = False


class LienReinitialisation(Ok):
    """Lien à usage unique à transmettre au membre (affiché une seule fois)."""

    chemin: str
    lien: str
    expire: datetime
    membre: MembreCourt
    telephone: str
    message_whatsapp: str


class MembreCree(Ok):
    activation: LienReinitialisation | None = None


class CodePointage(Ok):
    code: str


class OptionMembre(BaseModel):
    value: int
    label: str


# --- Réinitialisations de mot de passe ------------------------------------------------------------


class MembreContact(Schema):
    id: int
    nom: str
    pseudonyme: str
    telephone: str
    email: str | None
    categorie: int


class ReinitialisationLigne(Schema):
    id: int
    canal: str
    date_creation: datetime
    date_expiration: datetime | None
    date_utilisation: datetime | None
    membre: MembreContact
    traitee_par: str | None = None
    statut: str = ""


# --- Journaux ---------------------------------------------------------------------------------------


class VisiteLigne(Schema):
    id: int
    date_heure: datetime
    adresse_ip: str
    membre: MembreCourt | None = None


class ConnexionLigne(Schema):
    id: int
    date_connexion: datetime
    adresse_ip: str
    membre: MembreCourt | None = None


class PurgeEntree(BaseModel):
    """Purge des lignes cochées (`ids`) ou de toutes les lignes antérieures à `avant`."""

    ids: list[int] = Field(default_factory=list, max_length=500)
    avant: date | None = None


# --- Modération -------------------------------------------------------------------------------------


class ElementModeration(BaseModel):
    module: str
    module_libelle: str
    id: int
    reference: str
    titre: str
    auteur_id: int | None = None
    auteur_pseudonyme: str | None = None
    date: datetime | date | None
    lien: str


class FileModeration(Liste[ElementModeration]):
    modules: list[CompteurModule]


# --- Paramètres du site ---------------------------------------------------------------------------


class Parametres(Schema):
    nom_site: str
    adresse: str
    telephone_1: str
    telephone_2: str
    email: str
    whatsapp: str
    texte_aide: str
    montant_minimum_placement: int
    montant_minimum_course: int
    commission_course: int
    conditions_course: str
    description_section_1: str
    description_section_2: str
    description_section_3: str
    description_section_4: str
    description_section_5: str
    description_section_6: str
    description_section_7: str
    module_epargne_actif: bool
    module_sante_actif: bool


class ParametresEntree(BaseModel):
    nom_site: str = Field(default="", max_length=100)
    adresse: str = Field(default="", max_length=500)
    telephone_1: str = ""
    telephone_2: str = ""
    email: EmailStr | None = None
    whatsapp: str = ""
    texte_aide: str = Field(default="", max_length=20000)
    montant_minimum_placement: int = Field(default=0, ge=0)
    montant_minimum_course: int = Field(default=0, ge=0)
    commission_course: int = Field(default=0, ge=0)
    conditions_course: str = Field(default="", max_length=20000)
    description_section_1: str = Field(default="", max_length=2000)
    description_section_2: str = Field(default="", max_length=2000)
    description_section_3: str = Field(default="", max_length=2000)
    description_section_4: str = Field(default="", max_length=2000)
    description_section_5: str = Field(default="", max_length=2000)
    description_section_6: str = Field(default="", max_length=2000)
    description_section_7: str = Field(default="", max_length=2000)
    module_epargne_actif: bool = True
    module_sante_actif: bool = True

    @field_validator("telephone_1")
    @classmethod
    def _tel1(cls, v: str) -> str:
        try:
            return verifier_telephone(v)
        except ValueError:
            raise ValueError("Veuillez vérifier le numéro de téléphone 1 (9 chiffres commençant par 01, 04, 05, 06 ou 22).") from None

    @field_validator("telephone_2")
    @classmethod
    def _tel2(cls, v: str) -> str:
        try:
            return verifier_telephone(v)
        except ValueError:
            raise ValueError("Veuillez vérifier le numéro de téléphone 2 (9 chiffres commençant par 01, 04, 05, 06 ou 22).") from None

    @field_validator("whatsapp")
    @classmethod
    def _wa(cls, v: str) -> str:
        try:
            return verifier_telephone(v)
        except ValueError:
            raise ValueError("Veuillez vérifier le numéro WhatsApp (9 chiffres commençant par 01, 04, 05, 06 ou 22).") from None

    @field_validator("email", mode="before")
    @classmethod
    def _email_vide(cls, v):
        return v or None
