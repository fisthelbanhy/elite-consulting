import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="lf-tests-"))
os.environ["LF_DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.sqlite3').as_posix()}"
os.environ["LF_MEDIA_DIR"] = str(_tmp / "media")
os.environ["LF_ENVIRONNEMENT"] = "test"  # hachage Argon2 allégé (voir app/security.py)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models as m  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.enums import TypeMembre  # noqa: E402
from app.main import app  # noqa: E402
from app.security import hacher_mot_de_passe  # noqa: E402


@pytest.fixture(autouse=True)
def base_propre():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(m.Parametre(id=1, compteur_reference=100, montant_minimum_placement=100000,
                           montant_minimum_course=5000, commission_course=4000))
        db.add(m.Ville(id=2, nom="Brazzaville"))
        db.add(m.Ville(id=3, nom="Pointe-Noire"))
        db.add(m.Quartier(id=1, ville_id=2, nom="Bacongo"))
        db.add(m.SecteurActivite(id=1, libelle="Informatique"))
        db.add(m.DomaineActivite(id=1, secteur_id=1, libelle="Développement web"))
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def creer_membre(identifiant="awa2024", mdp="motdepasse1", type_compte=TypeMembre.MEMBRE, **kw) -> int:
    with SessionLocal() as db:
        membre = m.Membre(
            identifiant=identifiant, mot_de_passe_hash=hacher_mot_de_passe(mdp), nom=kw.pop("nom", "Awa Test"),
            pseudonyme=kw.pop("pseudonyme", identifiant), telephone=kw.pop("telephone", ""), ville_id=2,
            type_compte=type_compte, etat=kw.pop("etat", 2), **kw,
        )
        db.add(membre)
        db.commit()
        return membre.id


def entetes(client: TestClient, identifiant: str, mdp: str = "motdepasse1") -> dict:
    r = client.post("/api/auth/login", json={"identifiant": identifiant, "mot_de_passe": mdp})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['jeton']}"}
