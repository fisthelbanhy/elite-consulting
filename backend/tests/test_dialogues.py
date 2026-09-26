from conftest import creer_membre, entetes

from app.enums import TypeMembre


def test_visiteur_ne_voit_rien(client):
    assert client.get("/api/dialogues?type=1").status_code == 401
    assert client.post("/api/dialogues", json={"type_dialogue": 1, "texte": "Bonjour"}).status_code == 401


def test_membre_ecrit_dans_les_4_rubriques(client):
    """Correctif F-S7-38 : le legacy ne laissait écrire que depuis Placement."""
    creer_membre("awa")
    h = entetes(client, "awa")
    for t in (1, 2, 3, 4):
        r = client.post("/api/dialogues", json={"type_dialogue": t, "texte": f"Question rubrique {t}"}, headers=h)
        assert r.status_code == 201, r.text
    r = client.post("/api/dialogues", json={"type_dialogue": 1, "texte": "x"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Votre message doit avoir 2 caractères minimum."
    fil = client.get("/api/dialogues?type=2", headers=h).json()
    assert fil["total"] == 1 and fil["items"][0]["de_moi"] and fil["items"][0]["a_la_frangine"]


def test_reponse_au_bon_membre_et_cloisonnement(client):
    """Correctif F-S7-39 / F-TRV-57 : la réponse part au membre visé (et non au membre n° 1)."""
    premier = creer_membre("premier")  # le « membre n° 1 » du bug legacy
    awa = creer_membre("awa")
    creer_membre("binta")
    creer_membre("conseiller", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    ha, hb, hg = entetes(client, "awa"), entetes(client, "binta"), entetes(client, "conseiller")
    client.post("/api/dialogues", json={"type_dialogue": 3, "texte": "Où en est mon crédit ?"}, headers=ha)
    client.post("/api/dialogues", json={"type_dialogue": 3, "texte": "Et le mien ?"}, headers=hb)

    # le gestionnaire voit les messages adressés à la frangine, avec leur auteur
    tout = client.get("/api/dialogues?type=3", headers=hg).json()
    assert tout["total"] == 2 and {m["auteur"]["pseudonyme"] for m in tout["items"]} == {"awa", "binta"}
    # une réponse sans destinataire est refusée
    r = client.post("/api/dialogues", json={"type_dialogue": 3, "texte": "Patience"}, headers=hg)
    assert r.status_code == 400 and r.json()["message"] == "Veuillez indiquer le destinataire du message."
    r = client.post("/api/dialogues", json={"type_dialogue": 3, "texte": "Votre dossier est en cours.", "destinataire_id": awa},
                    headers=hg)
    assert r.status_code == 201

    fil_awa = client.get("/api/dialogues?type=3", headers=ha).json()["items"]
    assert [m["texte"] for m in fil_awa] == ["Où en est mon crédit ?", "Votre dossier est en cours."]
    assert fil_awa[1]["de_la_frangine"] is True
    assert client.get("/api/dialogues?type=3", headers=hb).json()["total"] == 1
    assert client.get("/api/dialogues?type=3", headers=entetes(client, "premier")).json()["total"] == 0
    assert premier != awa
    # awa est prévenue dans sa messagerie
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1
    # conversations : binta attend une réponse, awa non
    conv = client.get("/api/dialogues/conversations?type=3", headers=hg).json()
    assert [(c["membre"]["pseudonyme"], c["en_attente"]) for c in conv] == [("binta", True), ("awa", False)]
    assert client.get("/api/dialogues/conversations?type=3", headers=ha).status_code == 403
    # fil d'un membre précis et recherche plein texte
    assert client.get(f"/api/dialogues?type=3&membre_id={awa}", headers=hg).json()["total"] == 2
    assert client.get("/api/dialogues?type=3&q=mien", headers=hg).json()["total"] == 1


def test_double_envoi_refuse(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.post("/api/dialogues", json={"type_dialogue": 1, "texte": "Bonjour"}, headers=h).status_code == 201
    r = client.post("/api/dialogues", json={"type_dialogue": 1, "texte": "Bonjour"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce message est déjà envoyé."
