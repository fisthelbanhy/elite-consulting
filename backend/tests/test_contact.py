import logging

from conftest import creer_membre, entetes

from app.db import SessionLocal
from app.enums import TypeMembre
from app.models import Contact

VISITEUR = {
    "nom": "Grace Mabiala", "email": "grace@example.com", "telephone": "",
    "objet": "Demande d'information", "texte": "Bonjour, comment fonctionne la Likelemba ?",
}


def test_visiteur_regles_et_anti_doublon(client):
    r = client.post("/api/contact", json={**VISITEUR, "nom": "Ab", "email": "", "objet": "Ok", "texte": "Court"})
    assert r.status_code == 400
    assert {"nom", "email", "objet", "texte"} <= set(r.json()["champs"])
    # format d'e-mail contrôlé, message en français
    r = client.post("/api/contact", json={**VISITEUR, "email": "pas-un-email"})
    assert r.status_code == 422 and "e-mail" in r.json()["champs"]["email"]

    r = client.post("/api/contact", json=VISITEUR)
    assert r.status_code == 201, r.text
    r = client.post("/api/contact", json={**VISITEUR, "nom": "Autre Personne", "email": "autre@example.com"})
    assert r.status_code == 400 and r.json()["message"] == "Ce message est déjà enregistré."


def test_anti_robot_et_limitation(client):
    assert client.post("/api/contact", json={**VISITEUR, "site_web": "http://spam"}).status_code == 400
    assert client.post("/api/contact", json={**VISITEUR, "duree_saisie_ms": 800}).status_code == 400
    for i in range(5):
        r = client.post("/api/contact", json={**VISITEUR, "texte": f"Message numéro {i} pour tester"})
        assert r.status_code == 201
    r = client.post("/api/contact", json={**VISITEUR, "texte": "Un sixième message aujourd'hui"})
    assert r.status_code == 400 and "plusieurs fois" in r.json()["message"]


def test_membre_nom_et_email_du_profil(client):
    creer_membre("awa", nom="Awa Nkounkou", email="awa@example.com", telephone="061234567")
    h = entetes(client, "awa")
    r = client.post("/api/contact", json={"nom": "Usurpateur", "email": "faux@example.com",
                                           "objet": "Question sur mon compte", "texte": "Je ne trouve pas mon profil."},
                    headers=h)
    assert r.status_code == 201, r.text
    with SessionLocal() as db:
        c = db.get(Contact, r.json()["id"])
        assert (c.nom, c.email, c.telephone, c.etat) == ("Awa Nkounkou", "awa@example.com", "061234567", 1)


def test_visibilite_des_listes(client):
    creer_membre("awa")
    creer_membre("bob")
    creer_membre("master", type_compte=TypeMembre.MASTER)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    client.post("/api/contact", json={**VISITEUR, "objet": "Message d'Awa"}, headers=entetes(client, "awa"))
    client.post("/api/contact", json={**VISITEUR, "objet": "Message de Bob"}, headers=entetes(client, "bob"))
    client.post("/api/contact", json=VISITEUR)

    assert client.get("/api/contact").status_code == 401
    awa = client.get("/api/contact", headers=entetes(client, "awa")).json()
    assert awa["total"] == 1 and awa["items"][0]["objet"] == "Message d'Awa"
    # Le Master ne voit plus tous les messages (ADR-0007 T7)
    assert client.get("/api/contact", headers=entetes(client, "master")).json()["total"] == 0
    ha = entetes(client, "admin")
    assert client.get("/api/contact", headers=ha).json()["total"] == 3
    assert client.get("/api/contact?q=bob", headers=ha).json()["total"] == 1
    id_bob = client.get("/api/contact?q=bob", headers=ha).json()["items"][0]["id"]
    # un membre ne peut ni lire ni modifier le message d'un autre
    assert client.get(f"/api/contact/{id_bob}", headers=entetes(client, "awa")).status_code == 404
    assert client.post(f"/api/contact/{id_bob}/etat", json={"etat": 2}, headers=entetes(client, "bob")).status_code == 403
    assert client.post(f"/api/contact/{id_bob}/reponse", json={"reponse": "x" * 10},
                       headers=entetes(client, "bob")).status_code == 403
    # filtre par membre
    expediteurs = client.get("/api/contact/expediteurs", headers=ha).json()
    assert len(expediteurs) == 2
    bob = next(o["value"] for o in expediteurs if "bob" in o["label"])
    assert client.get(f"/api/contact?membre_id={bob}", headers=ha).json()["total"] == 1
    assert client.get("/api/contact/compteurs", headers=ha).json() == {"a_traiter": 3}


def test_reponse_enregistree_puis_envoyee(client, caplog):
    creer_membre("awa", email="awa@example.com")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    id_ = client.post("/api/contact", json=VISITEUR, headers=entetes(client, "awa")).json()["id"]
    ha = entetes(client, "admin")
    assert client.post(f"/api/contact/{id_}/reponse", json={"reponse": " "}, headers=ha).status_code == 400
    with caplog.at_level(logging.WARNING, logger="lafrangine.emails"):
        r = client.post(f"/api/contact/{id_}/reponse", json={"reponse": "Bonjour Awa, voici comment faire."}, headers=ha)
    assert r.status_code == 200 and "awa@example.com" in r.json()["message"]
    assert any("Re : Demande d'information" in m for m in caplog.messages)
    # la réponse est conservée, visible du membre, et le message passe « traité »
    ha_awa = entetes(client, "awa")
    d = client.get(f"/api/contact/{id_}", headers=ha_awa).json()
    assert d["reponse"].startswith("Bonjour Awa") and d["repondu"] and d["etat"] == 2 and d["peut_repondre"] is False
    # le membre est prévenu dans sa messagerie
    assert client.get("/api/espace/compteurs", headers=ha_awa).json()["messages_non_lus"] == 1
    # changement d'état par un gestionnaire
    assert client.post(f"/api/contact/{id_}/etat", json={"etat": 3}, headers=ha).status_code == 200
    assert client.get("/api/contact", headers=ha).json()["total"] == 0
    assert client.get("/api/contact?etat=3", headers=ha).json()["total"] == 1
