"""Import de tous les modèles (nécessaire pour Alembic et la résolution des relations)."""

from app.models.commerce import (
    Article,
    ArticleCourse,
    Course,
    Immobilier,
    LigneCourse,
    LignePanier,
    Paiement,
    Produit,
)
from app.models.contenu import (
    Conseil,
    Contact,
    Dialogue,
    Maladie,
    MaladieProduit,
    Message,
    Publicite,
    Soungangai,
    Suggestion,
)
from app.models.core import (
    Banque,
    Diplome,
    DomaineActivite,
    FamilleArticle,
    Parametre,
    Quartier,
    SecteurActivite,
    Ville,
    Visite,
)
from app.models.entreprises import (
    Entreprise,
    FicheProspective,
    LigneProspective,
    Marche,
    ProduitProspective,
    Projet,
    Reussite,
)
from app.models.finance import (
    BenchOperation,
    BenchTarif,
    BenchType,
    ConseilFinance,
    ContentieuxCredit,
    DemandeCredit,
    DossierAccompagnement,
    OperationBanque,
    Placement,
)
from app.models.fonds import (
    AppelFond,
    CollecteFond,
    CotisationLikelemba,
    FondDeSoutien,
    GroupeLikelemba,
    MembreLikelemba,
    PointCaisse,
    VersementCollecte,
)
from app.models.membres import (
    Membre,
    ReinitialisationMotDePasse,
    Session,
    TentativeConnexion,
    VisiteMembre,
)
from app.models.opportunite import (
    BusinessPlan,
    Partenariat,
    ProduitSouscription,
    ProspectSouscription,
    Souscription,
)
from app.models.rh import AnnonceEmploi, Interet

__all__ = [
    "AnnonceEmploi", "AppelFond", "Article", "ArticleCourse", "Banque", "BenchOperation", "BenchTarif",
    "BenchType", "BusinessPlan", "CollecteFond", "Conseil", "ConseilFinance", "Contact", "ContentieuxCredit",
    "CotisationLikelemba", "Course", "DemandeCredit", "Dialogue", "Diplome", "DomaineActivite",
    "DossierAccompagnement", "Entreprise", "FamilleArticle", "FicheProspective", "FondDeSoutien",
    "GroupeLikelemba", "Immobilier", "Interet", "LigneCourse", "LignePanier", "LigneProspective", "Maladie",
    "MaladieProduit", "Marche", "Membre", "MembreLikelemba", "Message", "OperationBanque", "Paiement",
    "Parametre", "Partenariat", "Placement", "PointCaisse", "Produit", "ProduitProspective",
    "ProduitSouscription", "Projet", "ProspectSouscription", "Publicite", "Quartier", "ReinitialisationMotDePasse",
    "Reussite", "SecteurActivite", "Session", "Soungangai", "Souscription", "Suggestion", "TentativeConnexion",
    "VersementCollecte", "Ville", "Visite", "VisiteMembre",
]
