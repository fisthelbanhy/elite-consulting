import pytest
from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre


@pytest.fixture(autouse=True)
def banques():
    with SessionLocal() as db:
        db.add_all([
            m.Banque(id=1, nom="Autres"),
            m.Banque(id=2, sigle="BGFI", nom="BGFIBank Congo"),
            m.Banque(id=3, sigle="LCB", nom="LCB Bank"),
        ])
        db.commit()


def _admin(client):
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    return entetes(client, "admin")


def test_consultation_reservee_aux_connectes(client):
    assert client.get("/api/tarifs-bancaires").status_code == 401
    creer_membre("awa")
    c = client.get("/api/tarifs-bancaires", headers=entetes(client, "awa")).json()
    assert c["referentiel_vide"] is True and c["peut_gerer_referentiel"] is False and c["banques_gerees"] == []
    # la banque « Autres » n'est pas une colonne du comparatif
    assert [b["sigle"] for b in c["banques"]] == ["BGFI", "LCB"]


def test_initialisation_depuis_les_tableaux_legacy(client):
    creer_membre("awa")
    assert client.post("/api/tarifs-bancaires/initialiser", headers=entetes(client, "awa")).status_code == 403
    hg = _admin(client)
    r = client.post("/api/tarifs-bancaires/initialiser", headers=hg)
    assert r.status_code == 201 and r.json()["message"] == "Référentiel initialisé : 9 types et 25 opérations."
    assert client.post("/api/tarifs-bancaires/initialiser", headers=hg).status_code == 400
    c = client.get("/api/tarifs-bancaires", headers=hg).json()
    assert len(c["types"]) == 9 and sum(len(t["operations"]) for t in c["types"]) == 25
    assert c["types"][1]["libelle"] == "Virements" and len(c["types"][1]["operations"]) == 2


def test_referentiel_trois_niveaux_regles_et_messages(client):
    hg = _admin(client)
    r = client.post("/api/tarifs-bancaires/types", json={"libelle": "Vir"}, headers=hg)
    assert r.json()["message"] == "Le type de l'opération doit avoir 4 caractères minimum."
    type_id = client.post("/api/tarifs-bancaires/types", json={"libelle": "Virements"}, headers=hg).json()["id"]
    assert client.post("/api/tarifs-bancaires/types", json={"libelle": "virements"}, headers=hg).status_code == 400
    r = client.post("/api/tarifs-bancaires/operations", json={"libelle": "Virement CEMAC"}, headers=hg)
    assert r.json()["champs"]["type_id"] == "Chaque opération doit être liée à un type."
    op = client.post("/api/tarifs-bancaires/operations", json={"type_id": type_id, "libelle": "Virement CEMAC"}, headers=hg).json()["id"]
    r = client.post("/api/tarifs-bancaires/operations", json={"type_id": type_id, "libelle": "Virement CEMAC"}, headers=hg)
    assert r.json()["message"] == "Opération déjà enregistrée."
    # niveau 3 : banque obligatoire, tarif ≥ 1 caractère, un seul tarif par banque et opération
    r = client.post("/api/tarifs-bancaires/tarifs", json={"operation_id": op, "tarif": "5 000 FCFA"}, headers=hg)
    assert r.json()["message"] == "Veuillez indiquer la banque concernée."
    r = client.post("/api/tarifs-bancaires/tarifs", json={"operation_id": op, "banque_id": 2, "tarif": " "}, headers=hg)
    assert r.json()["champs"]["tarif"] == "Le tarif doit avoir 1 caractère minimum."
    tarif = client.post("/api/tarifs-bancaires/tarifs", json={"operation_id": op, "banque_id": 2, "tarif": "5 000 FCFA"},
                        headers=hg).json()["id"]
    assert client.post("/api/tarifs-bancaires/tarifs", json={"operation_id": op, "banque_id": 2, "tarif": "5 000 FCFA"},
                       headers=hg).status_code == 400
    # modification effective (correctif F-S7-42)
    assert client.put(f"/api/tarifs-bancaires/tarifs/{tarif}", json={"tarif": "4 500 FCFA"}, headers=hg).status_code == 200
    c = client.get("/api/tarifs-bancaires", headers=hg).json()
    assert c["types"][0]["operations"][0]["tarifs"] == [{"id": tarif, "banque_id": 2, "tarif": "4 500 FCFA"}]
    # filtre par banque
    c = client.get("/api/tarifs-bancaires?banque_id=3", headers=hg).json()
    assert [b["id"] for b in c["banques"]] == [3] and c["nombre_tarifs"] == 0


def test_grille_par_banque_et_membre_banque(client):
    hg = _admin(client)
    client.post("/api/tarifs-bancaires/initialiser", headers=hg)
    banquier = creer_membre("lcb", categorie=2)
    with SessionLocal() as db:
        db.get(m.Banque, 3).membre_id = banquier
        db.commit()
    hb = entetes(client, "lcb")
    c = client.get("/api/tarifs-bancaires", headers=hb).json()
    assert c["banques_gerees"] == [3]
    ops = [o["id"] for t in c["types"] for o in t["operations"]]
    r = client.put("/api/tarifs-bancaires/banques/3", json={"tarifs": {str(ops[0]): "Gratuit", str(ops[1]): "1 %"}}, headers=hb)
    assert r.status_code == 200, r.text
    # un membre banque ne saisit pas les tarifs d'une autre banque
    assert client.put("/api/tarifs-bancaires/banques/2", json={"tarifs": {str(ops[0]): "0"}}, headers=hb).status_code == 403
    # vider une case retire le tarif
    client.put("/api/tarifs-bancaires/banques/3", json={"tarifs": {str(ops[1]): ""}}, headers=hb)
    c = client.get("/api/tarifs-bancaires", headers=hb).json()
    assert c["nombre_tarifs"] == 1
    # le membre banque ne gère pas le référentiel
    assert client.post("/api/tarifs-bancaires/types", json={"libelle": "Nouveau type"}, headers=hb).status_code == 403
