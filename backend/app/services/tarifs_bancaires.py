"""Référentiel « Bench marking » (tarifs bancaires) : initialisation à partir de
`$arraybenchmarking` (9 types) et `$arraybenchmarking2` (25 opérations) de `incl-variable.php`.

Le legacy déclarait ces deux tableaux sans jamais les utiliser ni les relier (S7-15, F-S7-43).
Décision : ils servent de proposition d'initialisation, déclenchée par un gestionnaire quand le
référentiel est vide ; chaque opération est rattachée au type le plus proche (libellés corrigés).
Les types « Escompte d'effets » et « Encaissement d'effets » n'ont pas d'opération legacy : le
gestionnaire les complète."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import Etat
from app.models import BenchOperation, BenchType

TYPES = [
    "Opérations sur espèces",  # 1
    "Virements",  # 2
    "Chèques",  # 3
    "Escompte d'effets",  # 4
    "Encaissement d'effets",  # 5
    "Opérations internationales",  # 6
    "Principales conditions d'arrêtés et de tenue de compte",  # 7
    "Placements",  # 8
    "Services divers",  # 9
]

# (libellé de l'opération, rang du type dans TYPES, à partir de 1) — ordre de $arraybenchmarking2
OPERATIONS = [
    ("Espèces", 1),
    ("Change manuel", 1),
    ("Virement entre agences de la même banque", 2),
    ("Virement entre les banques de la zone CEMAC", 2),
    ("Transfert vers l'étranger", 6),
    ("Virement reçu de l'étranger", 6),
    ("Crédit documentaire import", 6),
    ("Crédit documentaire export", 6),
    ("Remise documentaire import", 6),
    ("Remise documentaire export", 6),
    ("Remise de chèque sur l'étranger", 3),
    ("Découvert en compte", 7),
    ("Les prêts", 7),
    ("Clôture de compte", 7),
    ("Dépôt à terme", 8),
    ("Compte épargne", 8),
    ("Cautions et avals", 9),
    ("Délivrance d'attestations", 9),
    ("Mise à disposition / somme à disposition", 9),
    ("Recharges", 9),
    ("Autres", 9),
    ("Courrier / boîtes aux lettres", 9),
    ("Monétique", 9),
    ("Envoi d'extrait de compte à l'étranger", 9),
    ("Destruction des moyens de paiement", 9),
]


def referentiel_vide(db: Session) -> bool:
    return db.scalar(select(BenchType.id).where(BenchType.etat != Etat.SUPPRIME).limit(1)) is None


def initialiser(db: Session) -> tuple[int, int]:
    types = [BenchType(libelle=libelle, etat=Etat.AUTORISE) for libelle in TYPES]
    db.add_all(types)
    db.flush()
    operations = [BenchOperation(type_id=types[rang - 1].id, libelle=libelle, etat=Etat.AUTORISE) for libelle, rang in OPERATIONS]
    db.add_all(operations)
    return len(types), len(operations)
