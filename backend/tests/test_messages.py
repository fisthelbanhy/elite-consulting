from datetime import datetime, timedelta

from conftest import creer_membre, entetes

from app.db import SessionLocal
from app.enums import TypeMembre
from app.models import Membre


def test_fil_du_membre_et_marquage_lu(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    # message vide refusé avec un message visible (correctif F-TRV-54)
    r = client.post("/api/messages", json={"texte": "   "}, headers=h)
    assert r.status_code == 400 and "vide" in r.json()["message"] and "texte" in r.json()["champs"]
    assert client.post("/api/messages", json={"texte": "Bonjour la frangine !"}, headers=h).status_code == 201

    ha = entetes(client, "admin")
    awa_id = client.get("/api/messages/fils", headers=ha).json()["items"][0]["membre"]["id"]
    assert client.post(f"/api/messages/fils/{awa_id}", json={"texte": "Bonjour Awa, que puis-je faire ?"},
                       headers=ha).status_code == 201

    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 1
    fil = client.get("/api/messages", headers=h).json()
    assert [m["de_la_frangine"] for m in fil["messages"]] == [False, True]
    assert fil["non_lus"] == 1 and fil["messages"][1]["lu"] is False  # signalé comme nouveau
    assert fil["messages"][1]["auteur"] is None  # le membre voit « la frangine », pas le gestionnaire
    assert fil["frangine_en_ligne"] is True  # le gestionnaire vient d'être actif
    # ouvert : les réponses sont désormais lues (F-TRV-50)
    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 0
    assert client.get("/api/messages", headers=h).json()["messages"][1]["lu"] is True


def test_liste_des_fils_pour_la_gestion(client):
    creer_membre("awa", nom="Awa Nkounkou")
    creer_membre("bob", nom="Bob Mabiala")
    creer_membre("carine", nom="Carine Sans Fil")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    client.post("/api/messages", json={"texte": "Premier message d'Awa"}, headers=entetes(client, "awa"))
    hb = entetes(client, "bob")
    client.post("/api/messages", json={"texte": "Bob écrit"}, headers=hb)
    client.post("/api/messages", json={"texte": "Bob insiste"}, headers=hb)

    assert client.get("/api/messages/fils", headers=hb).status_code == 403
    ha = entetes(client, "admin")
    fils = client.get("/api/messages/fils", headers=ha).json()
    assert fils["total"] == 2
    bob = next(f for f in fils["items"] if f["membre"]["nom"] == "Bob Mabiala")
    assert bob["non_lus"] == 2 and bob["total"] == 2 and bob["dernier_message"]["texte"] == "Bob insiste"
    assert bob["membre"]["en_ligne"] is True  # actif il y a moins de 5 minutes (F-TRV-52)
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 3
    # recherche et membres sans fil (pour écrire le premier message)
    assert client.get("/api/messages/fils?q=carine", headers=ha).json()["total"] == 0
    tous = client.get("/api/messages/fils?q=carine&tous=true", headers=ha).json()
    assert tous["total"] == 1 and tous["items"][0]["total"] == 0

    # ouverture du fil : les messages du membre sont marqués lus (F-TRV-53)
    fil = client.get(f"/api/messages/fils/{bob['membre']['id']}", headers=ha).json()
    assert fil["non_lus"] == 2 and len(fil["messages"]) == 2
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1
    # les fils non lus remontent en tête
    assert client.get("/api/messages/fils", headers=ha).json()["items"][0]["membre"]["nom"] == "Awa Nkounkou"


def test_reponses_de_tous_les_gestionnaires_visibles(client):
    creer_membre("awa")
    creer_membre("admin1", type_compte=TypeMembre.GESTIONNAIRE, pseudonyme="Maman Rose")
    creer_membre("admin2", type_compte=TypeMembre.GESTIONNAIRE, pseudonyme="Tantine Julie")
    ha1, ha2 = entetes(client, "admin1"), entetes(client, "admin2")
    with SessionLocal() as db:
        awa = db.query(Membre).filter_by(identifiant="awa").one().id
        admin2 = db.query(Membre).filter_by(identifiant="admin2").one().id
    client.post(f"/api/messages/fils/{awa}", json={"texte": "Réponse de Rose"}, headers=ha1)
    client.post(f"/api/messages/fils/{awa}", json={"texte": "Réponse de Julie"}, headers=ha2)
    # correctif F-TRV-55 : chaque gestionnaire voit les réponses de ses collègues
    fil = client.get(f"/api/messages/fils/{awa}", headers=ha1).json()
    assert [m["auteur"]["pseudonyme"] for m in fil["messages"]] == ["Maman Rose", "Tantine Julie"]
    assert len(client.get("/api/messages", headers=entetes(client, "awa")).json()["messages"]) == 2
    # un gestionnaire n'a pas de fil propre ; on n'ouvre pas le fil d'un gestionnaire
    assert client.get("/api/messages", headers=ha1).status_code == 403
    assert client.get(f"/api/messages/fils/{admin2}", headers=ha1).status_code == 400
    assert client.get("/api/messages/fils/9999", headers=ha1).status_code == 404


def test_presence_de_la_frangine(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE,
                 derniere_activite=datetime.now() - timedelta(minutes=10))
    fil = client.get("/api/messages", headers=entetes(client, "awa")).json()
    assert fil["frangine_en_ligne"] is False and fil["messages"] == []
