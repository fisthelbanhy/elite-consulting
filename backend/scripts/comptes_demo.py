"""Développement uniquement : crée (si besoin) deux comptes de démonstration et affiche un jeton
de session pour chacun, à poser dans le cookie `lf_session` du navigateur. Évite de manipuler
les comptes réels issus de la reprise.

Usage (depuis backend/) : .venv/Scripts/python scripts/comptes_demo.py
"""

import secrets
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.enums import Etat, TypeMembre  # noqa: E402
from app.models import Membre, Session, Ville  # noqa: E402
from app.security import hacher_mot_de_passe, nouveau_jeton  # noqa: E402

COMPTES = [
    ("demo.gestion", "Démo Gestion", "Frangine démo", TypeMembre.GESTIONNAIRE, "069990001"),
    ("demo.membre", "Démo Membre", "Membre démo", TypeMembre.MEMBRE, "069990002"),
]


def main() -> None:
    if get_settings().environnement != "dev":
        sys.exit("Refusé : script réservé à l'environnement de développement.")
    sys.stdout.reconfigure(encoding="utf-8")
    with SessionLocal() as db:
        ville = db.scalar(select(Ville.id).order_by(Ville.id).limit(1))
        for identifiant, nom, pseudo, type_compte, tel in COMPTES:
            m = db.scalar(select(Membre).where(Membre.identifiant == identifiant))
            if m is None:
                m = Membre(identifiant=identifiant, nom=nom, pseudonyme=pseudo, telephone=tel, ville_id=ville,
                           type_compte=type_compte, etat=Etat.AUTORISE, categorie=1,
                           mot_de_passe_hash=hacher_mot_de_passe(secrets.token_urlsafe(24)))
                if type_compte == TypeMembre.GESTIONNAIRE:
                    m.droit_attribution = m.droit_caisse = m.droit_activation = True
                db.add(m)
                db.flush()
            jeton, h = nouveau_jeton()
            db.add(Session(membre_id=m.id, jeton_hash=h, date_expiration=datetime.now() + timedelta(days=1),
                           agent="comptes_demo"))
            print(f"{identifiant:14s} (id {m.id}) lf_session={jeton}")
        db.commit()


if __name__ == "__main__":
    main()
