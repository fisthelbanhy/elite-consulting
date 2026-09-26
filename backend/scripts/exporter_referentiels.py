"""Exporte les référentiels **non personnels** de la base locale vers `backend/fixtures/referentiels.json`.

Ce fichier est versionné : il permet à une session cloud (ou à un nouveau poste) d'avoir un site
utilisable sans le dump de production, qui contient des données personnelles et ne doit jamais
être publié (ADR-0012).

Sont exportés : paramètres du site, villes et quartiers, secteurs et domaines d'activité,
diplômes, familles d'articles, banques (sans les contacts nominatifs), catalogue produits et
fiches bien-être. Aucun membre, aucune annonce, aucun message.

Usage (depuis backend/) : .venv/Scripts/python scripts/exporter_referentiels.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Banque,
    Diplome,
    DomaineActivite,
    FamilleArticle,
    Maladie,
    MaladieProduit,
    Parametre,
    Produit,
    Quartier,
    SecteurActivite,
    Ville,
)

CIBLE = Path(__file__).resolve().parent.parent / "fixtures" / "referentiels.json"

# Colonnes exclues : contacts nominatifs des banques, compteurs de séquences et d'audience
EXCLUS = {
    "banque": {"membre_id", "nom_contact", "telephone_contact", "observation"},
    "parametre": {"compteur_membre", "compteur_reference"},
    "produit": {"nombre_visites", "date_derniere_visite", "photo"},
}


def lignes(db, modele, nom: str) -> list[dict]:
    exclus = EXCLUS.get(nom, set())
    out = []
    for obj in db.scalars(select(modele)):
        ligne = {}
        for colonne in modele.__table__.columns:
            if colonne.name in exclus:
                continue
            valeur = getattr(obj, colonne.name)
            ligne[colonne.name] = valeur.isoformat() if hasattr(valeur, "isoformat") else valeur
        out.append(ligne)
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    with SessionLocal() as db:
        donnees = {
            "parametre": lignes(db, Parametre, "parametre"),
            "ville": lignes(db, Ville, "ville"),
            "quartier": lignes(db, Quartier, "quartier"),
            "secteur_activite": lignes(db, SecteurActivite, "secteur_activite"),
            "domaine_activite": lignes(db, DomaineActivite, "domaine_activite"),
            "diplome": lignes(db, Diplome, "diplome"),
            "famille_article": lignes(db, FamilleArticle, "famille_article"),
            "banque": lignes(db, Banque, "banque"),
            "produit": lignes(db, Produit, "produit"),
            "maladie": lignes(db, Maladie, "maladie"),
            "maladie_produit": lignes(db, MaladieProduit, "maladie_produit"),
        }
    CIBLE.parent.mkdir(parents=True, exist_ok=True)
    CIBLE.write_text(json.dumps(donnees, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(len(v) for v in donnees.values())
    print(f"{total} lignes exportées vers {CIBLE}")
    for nom, v in donnees.items():
        print(f"  {nom:20s} {len(v)}")


if __name__ == "__main__":
    main()
