from conftest import creer_membre, entetes

from app.db import SessionLocal
from app.enums import TypeMembre
from app.models import Suggestion


def test_depot_reserve_aux_connectes_et_anonyme(client):
    idee = {"module": 0, "texte": "Ajouter un annuaire des couturières de Bacongo."}
    assert client.post("/api/suggestions", json=idee).status_code == 401
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/suggestions", json={"module": None, "texte": "court"}, headers=h)
    assert r.status_code == 400 and {"module", "texte"} <= set(r.json()["champs"])
    assert client.post("/api/suggestions", json={**idee, "module": 9}, headers=h).status_code == 400
    # « Accueil » (0) est accepté (correctif F-TRV-60)
    assert client.post("/api/suggestions", json=idee, headers=h).status_code == 201
    # doublon module + texte refusé, même texte sur un autre module accepté (F-TRV-61)
    r = client.post("/api/suggestions", json=idee, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette suggestion est déjà enregistrée."
    assert client.post("/api/suggestions", json={**idee, "module": 8}, headers=h).status_code == 201
    with SessionLocal() as db:
        colonnes = set(Suggestion.__table__.columns.keys())
        assert not {"membre_id", "auteur_id"} & colonnes  # aucune trace de l'auteur
        assert db.query(Suggestion).count() == 2


def test_gestion_reservee_aux_gestionnaires(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    client.post("/api/suggestions", json={"module": 2, "texte": "Afficher le salaire des offres d'emploi."}, headers=h)
    client.post("/api/suggestions", json={"module": 3, "texte": "Permettre le paiement Airtel Money."}, headers=h)
    assert client.get("/api/suggestions", headers=h).status_code == 403

    ha = entetes(client, "admin")
    liste = client.get("/api/suggestions", headers=ha).json()
    assert liste["total"] == 2 and liste["items"][0]["module"] == 3  # plus récente d'abord
    assert client.get("/api/suggestions?module=2", headers=ha).json()["total"] == 1
    assert client.get("/api/suggestions?q=airtel", headers=ha).json()["total"] == 1
    assert client.get("/api/suggestions/compteurs", headers=ha).json() == {"a_lire": 2, "total": 2}

    id_ = liste["items"][0]["id"]
    assert client.post(f"/api/suggestions/{id_}/etat", json={"etat": 2}, headers=h).status_code == 403
    assert client.post(f"/api/suggestions/{id_}/etat", json={"etat": 2}, headers=ha).status_code == 200
    assert client.get("/api/suggestions?etat=2", headers=ha).json()["total"] == 1
    assert client.get("/api/suggestions/compteurs", headers=ha).json() == {"a_lire": 1, "total": 2}
