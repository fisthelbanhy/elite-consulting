"""Service de paiement central (ADR-0006) testé avec un traitement fictif."""

import pytest
from conftest import creer_membre, entetes

from app.enums import EtatPaiement, ModePaiement, TypeMembre
from app.services import paiements as svc

JOURNAL: list[str] = []
TYPE_TEST = 99


@pytest.fixture(autouse=True)
def traitement_fictif():
    JOURNAL.clear()
    svc.TRAITEMENTS[TYPE_TEST] = svc.Traitement(
        libelle=lambda db, m, o: f"Objet {o}",
        montant=lambda db, m, o: 5000 if o == 1 else None,
        retour=lambda db, m, o: f"/objets/{o}",
        enregistrer=lambda db, p: JOURNAL.append(f"enregistrer:{p.id}"),
        confirmer=lambda db, p: JOURNAL.append(f"confirmer:{p.id}"),
        rejeter=lambda db, p: JOURNAL.append(f"rejeter:{p.id}"),
    )
    yield
    svc.TRAITEMENTS.pop(TYPE_TEST, None)


def declarer(client, h, **kw):
    corps = {"type_objet": TYPE_TEST, "objet_id": 1, "mode": ModePaiement.CASH, "remarque": ""} | kw
    return client.post("/api/paiements", json=corps, headers=h)


def test_preparation_et_montant_impose(client):
    creer_membre("payeur")
    h = entetes(client, "payeur")
    prep = client.get(f"/api/paiements/preparer?type_objet={TYPE_TEST}&objet_id=1", headers=h).json()
    assert prep["montant"] == 5000 and prep["retour"] == "/objets/1" and prep["libelle"] == "Objet 1"
    r = declarer(client, h, montant=1)  # montant saisi ignoré : le montant dû fait foi
    assert r.status_code == 201
    assert client.get("/api/paiements/miens", headers=h).json()["items"][0]["montant"] == 5000
    assert [f"enregistrer:{r.json()['id']}"] == JOURNAL


def test_montant_libre_et_regles_legacy(client):
    creer_membre("payeur")
    h = entetes(client, "payeur")
    assert declarer(client, h, objet_id=2, montant=0).status_code == 400  # « Le montant ne peut être zéro. »
    r = declarer(client, h, objet_id=2, montant=2000, mode=ModePaiement.CHARDEN_FARELL, remarque="court")
    assert r.status_code == 400 and "12 caractères" in r.json()["champs"]["remarque"]
    r = declarer(client, h, objet_id=2, montant=2000, mode=ModePaiement.MOBILE_MONEY, remarque="0612")
    assert r.status_code == 400 and "9 caractères" in r.json()["champs"]["remarque"]
    ok = declarer(client, h, objet_id=2, montant=2000, mode=ModePaiement.MOBILE_MONEY, remarque="061234567 TX42")
    assert ok.status_code == 201
    # anti-doublon payeur + montant + remarque
    assert declarer(client, h, objet_id=2, montant=2000, mode=ModePaiement.MOBILE_MONEY, remarque="061234567 TX42").status_code == 400


def test_confirmation_et_rejet_reserves_a_la_caisse(client):
    creer_membre("payeur")
    creer_membre("sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("caissier", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    h = entetes(client, "payeur")
    p1 = declarer(client, h).json()["id"]
    p2 = declarer(client, h, objet_id=3, montant=700, remarque="espèces au bureau").json()["id"]

    assert client.post(f"/api/paiements/{p1}/confirmer", headers=h).status_code == 403
    assert client.post(f"/api/paiements/{p1}/confirmer", headers=entetes(client, "sans_droit")).status_code == 403

    hc = entetes(client, "caissier")
    liste = client.get("/api/paiements?etat=2", headers=hc).json()
    assert liste["total"] == 2 and liste["somme"] == 5700
    assert client.post(f"/api/paiements/{p1}/confirmer", headers=hc).status_code == 200
    assert client.post(f"/api/paiements/{p2}/rejeter", headers=hc).status_code == 200
    # on ne confirme pas deux fois, on ne rejette pas un paiement déjà traité
    assert client.post(f"/api/paiements/{p1}/confirmer", headers=hc).status_code == 400
    assert client.post(f"/api/paiements/{p2}/confirmer", headers=hc).status_code == 400
    assert f"confirmer:{p1}" in JOURNAL and f"rejeter:{p2}" in JOURNAL
    etats = {p["id"]: p["etat"] for p in client.get("/api/paiements", headers=hc).json()["items"]}
    assert etats == {p1: EtatPaiement.CONFIRME, p2: EtatPaiement.NON_PAYE}
