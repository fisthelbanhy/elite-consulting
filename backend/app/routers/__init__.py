"""Registre des routeurs. Chaque module de domaine expose une liste `routers`.

Chaque fichier appartient à un seul domaine (voir docs/CONVENTIONS.md) ; ce registre les
importe tous, il n'a normalement pas besoin d'être modifié.
"""

from app.routers import (
    accompagnement,
    annonces,
    auth,
    boutique,
    business_plan,
    comparateur,
    conseil_financier,
    contact,
    courses,
    decouverte,
    dialogues,
    distributeur,
    emplois,
    entreprises,
    epargne,
    espace,
    gestion,
    immobilier,
    likelemba,
    marches,
    messages,
    paiements,
    partenariats,
    projets,
    publicites,
    questions,
    referentiels,
    reussites,
    suggestions,
    tarifs_bancaires,
    tresorerie,
)

MODULES: list[list] = [
    [auth.router],
    [referentiels.router, referentiels.visites],
    espace.routers,
    paiements.routers,
    # Se lancer
    decouverte.routers,
    questions.routers,
    reussites.routers,
    business_plan.routers,
    accompagnement.routers,
    # Financer & épargner
    likelemba.routers,
    projets.routers,
    epargne.routers,
    conseil_financier.routers,
    tresorerie.routers,
    tarifs_bancaires.routers,
    # Opportunités
    marches.routers,
    emplois.routers,
    immobilier.routers,
    annonces.routers,
    courses.routers,
    entreprises.routers,
    comparateur.routers,
    partenariats.routers,
    # Bien-être
    boutique.routers,
    distributeur.routers,
    # Transverse
    contact.routers,
    suggestions.routers,
    publicites.routers,
    messages.routers,
    dialogues.routers,
    gestion.routers,
]
