from conftest import creer_membre, entetes

from app.enums import TypeMembre


def _nouveau(client, h, type_=3, objet="Renégocier le prêt du camion", envoyer=False, reponses=None):
    return client.post("/api/accompagnement", json={
        "type_dossier": type_, "objet": objet, "reponses": reponses or {}, "envoyer": envoyer,
    }, headers=h)


def test_questionnaires_libelles_et_decoupage(client):
    r = client.get("/api/accompagnement/questionnaires")
    assert r.status_code == 200
    q = {x["slug"]: x for x in r.json()}
    # F-S7-14 à F-S7-17 : 55, 77, 45 et 35 questions
    assert [q[k]["nombre_questions"] for k in ("business-plan", "projet-agricole", "restructuration-credit", "credit-immobilier")] == [55, 77, 45, 35]
    assert [x["prefixe"] for x in r.json()] == ["ABP", "APA", "ARC", "ACI"]
    bp = q["business-plan"]["sections"]
    assert len(bp) == 6 and bp[2]["titre"] == "Marché"
    assert [g["titre"] for g in bp[2]["groupes"]] == [None, "Le marché des produits finis", None, "Structure de la consommation", None]
    rc = q["restructuration-credit"]["sections"][-1]["groupes"][-1]
    assert rc["titre"] == "Point sur l'environnement du projet" and rc["questions"][-1]["zone"] == 48
    assert client.get("/api/accompagnement/questionnaires/inconnu").status_code == 404


def test_objet_minimum_et_doublon(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = _nouveau(client, h, objet="Trop cour")  # 9 caractères
    assert r.status_code == 400 and r.json()["message"] == "Veuillez indiquer l'objet avec 10 caractères minimum."
    r = _nouveau(client, h)
    assert r.status_code == 201 and r.json()["reference"].startswith("ARC")
    assert r.json()["message"] == "Votre accompagnement de restructuration de crédit est sauvegardé."
    r = _nouveau(client, h)
    assert r.status_code == 400 and "déjà enregistrée" in r.json()["message"]


def test_toutes_les_zones_enregistrees_et_rechargees(client):
    """Correctif S7a : les réponses sont rechargées et la question 48 enfin enregistrée."""
    creer_membre("awa")
    h = entetes(client, "awa")
    reponses = {str(z): f"Réponse {z}" for z in range(4, 49)}
    r = _nouveau(client, h, reponses={**reponses, "99": "zone inconnue"}, envoyer=True)
    assert r.status_code == 201 and "enregistré et envoyé" in r.json()["message"]
    d = client.get(f"/api/accompagnement/{r.json()['id']}", headers=h).json()
    assert d["reponses"]["48"] == "Réponse 48" and "99" not in d["reponses"]
    assert d["nombre_repondues"] == 45 and d["nombre_questions"] == 45 and d["etat"] == 2

    # Modification effective (le legacy ne modifiait rien)
    maj = {**reponses, "48": "Compte d'exploitation mis à jour", "10": ""}
    r = client.put(f"/api/accompagnement/{d['id']}", json={"objet": d["objet"], "reponses": maj}, headers=h)
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."
    d = client.get(f"/api/accompagnement/{d['id']}", headers=h).json()
    assert d["reponses"]["48"] == "Compte d'exploitation mis à jour" and d["nombre_repondues"] == 44
    assert d["etat"] == 2  # un dossier envoyé le reste


def test_brouillon_puis_envoi(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    id_ = _nouveau(client, h, type_=1, objet="Boulangerie de quartier").json()["id"]
    assert client.get(f"/api/accompagnement/{id_}", headers=h).json()["etat"] == 1
    r = client.put(f"/api/accompagnement/{id_}", json={"objet": "Boulangerie de quartier", "envoyer": True}, headers=h)
    assert "enregistré et envoyé" in r.json()["message"]
    assert client.get(f"/api/accompagnement/{id_}", headers=h).json()["etat"] == 2


def test_listes_droits_et_validation_conseiller(client):
    creer_membre("awa")
    creer_membre("autre")
    creer_membre("conseiller", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True, telephone="061234567")
    h, ha, hg = entetes(client, "awa"), entetes(client, "autre"), entetes(client, "conseiller")
    id_ = _nouveau(client, h, type_=4, objet="Immeuble de rapport à Moungali", envoyer=True).json()["id"]
    _nouveau(client, ha, type_=4, objet="Villa à louer à Pointe-Noire")
    assert client.get("/api/accompagnement?type=4", headers=h).json()["total"] == 1
    assert client.get("/api/accompagnement?type=4", headers=hg).json()["total"] == 2
    assert client.get("/api/accompagnement?type=4&q=Moungali", headers=hg).json()["total"] == 1
    # Pas de consultation du dossier d'un autre membre (correctif S7-3)
    assert client.get(f"/api/accompagnement/{id_}", headers=ha).status_code == 404
    assert client.get(f"/api/accompagnement/{id_}", headers=h).json()["contact"] is None
    assert client.get(f"/api/accompagnement/{id_}", headers=hg).json()["contact"]["pseudonyme"] == "awa"
    # Validation par le conseiller : le membre est prévenu et ne peut plus modifier un dossier traité
    assert client.post(f"/api/accompagnement/{id_}/etat", json={"etat": 4}, headers=h).status_code == 403
    assert client.post(f"/api/accompagnement/{id_}/etat", json={"etat": 4}, headers=hg).status_code == 200
    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 1
    r = client.put(f"/api/accompagnement/{id_}", json={"objet": "Immeuble de rapport à Moungali"}, headers=h)
    assert r.status_code in (400, 403)
    assert client.get("/api/accompagnement/compteurs", headers=h).json()["par_type"]["4"] == 1
    assert client.get("/api/accompagnement", headers={}).status_code == 401
