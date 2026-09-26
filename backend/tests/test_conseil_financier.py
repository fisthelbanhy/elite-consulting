from conftest import creer_membre, entetes

from app.enums import TypeMembre

SUJET = {"rubrique": 1, "objet": "Ouvrir un compte épargne", "texte": "Quelle banque choisir pour épargner ?"}


def _gestionnaire(identifiant="conseiller", activation=True):
    creer_membre(identifiant, type_compte=TypeMembre.GESTIONNAIRE, droit_activation=activation)


def test_reserve_aux_connectes(client):
    assert client.get("/api/conseil-financier").status_code == 401
    assert client.post("/api/conseil-financier", json=SUJET).status_code == 401


def test_creation_reference_confidentialite_et_regles(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/conseil-financier", json={**SUJET, "objet": "x", "texte": ""}, headers=h)
    assert r.status_code == 400 and {"objet", "texte"} <= set(r.json()["champs"])

    r = client.post("/api/conseil-financier", json=SUJET, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("CFR")
    sujet = client.get(f"/api/conseil-financier/{r.json()['id']}", headers=h).json()
    assert sujet["confidentialite"] == 1 and sujet["etat"] == 2 and sujet["peut_modifier"] is True

    # Un seul sujet ouvert par rubrique pour un membre (F-S7-03)
    r = client.post("/api/conseil-financier", json={**SUJET, "objet": "Autre question"}, headers=h)
    assert r.status_code == 400 and "clôturer le précédent" in r.json()["message"]
    # … mais la rubrique « Rumeurs » est indépendante, et toujours publique
    r = client.post("/api/conseil-financier", json={**SUJET, "rubrique": 2, "confidentialite": 1}, headers=h)
    assert r.status_code == 201
    assert client.get(f"/api/conseil-financier/{r.json()['id']}", headers=h).json()["confidentialite"] == 2


def test_doublon_objet_signale(client):
    creer_membre("awa")
    _gestionnaire()
    client.post("/api/conseil-financier", json=SUJET, headers=entetes(client, "awa"))
    r = client.post("/api/conseil-financier", json={**SUJET, "objet": SUJET["objet"].upper()}, headers=entetes(client, "conseiller"))
    assert r.status_code == 400 and "même objet" in r.json()["message"]


def test_sujet_prive_visible_seulement_de_l_auteur_et_des_gestionnaires(client):
    creer_membre("awa")
    creer_membre("curieux")
    _gestionnaire()
    id_ = client.post("/api/conseil-financier", json=SUJET, headers=entetes(client, "awa")).json()["id"]
    hc = entetes(client, "curieux")
    assert client.get(f"/api/conseil-financier/{id_}", headers=hc).status_code == 404
    assert client.get("/api/conseil-financier?rubrique=1", headers=hc).json()["total"] == 0
    assert client.get("/api/conseil-financier?rubrique=1", headers=entetes(client, "conseiller")).json()["total"] == 1
    # Un sujet public est lisible et ouvert aux réponses de tous les membres
    pub = client.post("/api/conseil-financier", json={**SUJET, "rubrique": 2}, headers=entetes(client, "awa")).json()["id"]
    assert client.get(f"/api/conseil-financier/{pub}", headers=hc).json()["peut_modifier"] is False
    assert client.post(f"/api/conseil-financier/{pub}/reponses", json={"texte": "Très utile"}, headers=hc).status_code == 201


def test_reponses_heritage_doublon_compteur_et_notification(client):
    creer_membre("awa")
    _gestionnaire()
    h = entetes(client, "awa")
    id_ = client.post("/api/conseil-financier", json=SUJET, headers=h).json()["id"]
    hg = entetes(client, "conseiller")
    assert client.post(f"/api/conseil-financier/{id_}/reponses", json={"texte": "x"}, headers=hg).status_code == 400
    r = client.post(f"/api/conseil-financier/{id_}/reponses", json={"texte": "Regardez les dépôts à terme."}, headers=hg)
    assert r.status_code == 201
    r = client.post(f"/api/conseil-financier/{id_}/reponses", json={"texte": "Regardez les dépôts à terme."}, headers=hg)
    assert r.status_code == 400 and r.json()["message"] == "Ce message est déjà envoyé."
    sujet = client.get(f"/api/conseil-financier/{id_}", headers=h).json()
    assert sujet["nombre_reponses"] == 1 and sujet["repondu_par_conseiller"] is True
    assert sujet["reponses"][0]["de_la_frangine"] is True
    # L'auteur est prévenu dans sa messagerie
    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 1


def test_modification_par_l_auteur_membre_et_cloture(client):
    creer_membre("awa")
    creer_membre("autre")
    _gestionnaire("sans_droit", activation=False)
    h = entetes(client, "awa")
    id_ = client.post("/api/conseil-financier", json=SUJET, headers=h).json()["id"]
    modif = {"objet": "Ouvrir un compte épargne rémunéré", "texte": "Précision"}
    # correctif F-S7-08 : un simple membre modifie son sujet
    assert client.put(f"/api/conseil-financier/{id_}", json=modif, headers=h).status_code == 200
    assert client.put(f"/api/conseil-financier/{id_}", json=modif, headers=entetes(client, "autre")).status_code == 404
    # la clôture est réservée à l'auteur et aux gestionnaires ; un sujet clôturé refuse les réponses
    assert client.post(f"/api/conseil-financier/{id_}/etat", json={"etat": 4}, headers=entetes(client, "sans_droit")).status_code == 403
    assert client.post(f"/api/conseil-financier/{id_}/cloture", headers=h).status_code == 200
    r = client.post(f"/api/conseil-financier/{id_}/reponses", json={"texte": "Encore une question"}, headers=h)
    assert r.status_code == 400
    # une fois clôturé, un nouveau sujet est possible
    assert client.post("/api/conseil-financier", json={**SUJET, "objet": "Nouvelle question"}, headers=h).status_code == 201
    compteurs = client.get("/api/conseil-financier/compteurs", headers=h).json()
    assert compteurs["conseil"] == 2 and compteurs["sujet_ouvert_conseil"] is not None


def test_recherche_et_suppression_reponse(client):
    creer_membre("awa")
    _gestionnaire()
    h = entetes(client, "awa")
    id_ = client.post("/api/conseil-financier", json={**SUJET, "rubrique": 2}, headers=h).json()["id"]
    rep = client.post(f"/api/conseil-financier/{id_}/reponses", json={"texte": "Mon avis"}, headers=h).json()["id"]
    assert client.get("/api/conseil-financier?q=épargner", headers=h).json()["total"] == 1
    assert client.get("/api/conseil-financier?q=introuvable", headers=h).json()["total"] == 0
    assert client.delete(f"/api/conseil-financier/{rep}", headers=h).status_code == 200
    assert client.get(f"/api/conseil-financier/{id_}", headers=h).json()["nombre_reponses"] == 0
