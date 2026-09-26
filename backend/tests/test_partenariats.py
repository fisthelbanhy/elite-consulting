from conftest import creer_membre, entetes

from app.enums import TypeMembre

FICHE = {
    "actif": "120 hectares de manioc",
    "description": "Manioc à maturité, route praticable",
    "recherche": "Partenaire avec une unité de transformation",
    "objectif": "Produire de la pâte de manioc",
}


def test_creation_regles_et_reference(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "awa")
    r = client.post("/api/partenariats", json={**FICHE, "actif": "Toit"}, headers=h)
    assert r.status_code == 400 and r.json()["champs"]["actif"] == "Veuillez saisir l'actif avec 5 caractères minimum."
    r = client.post("/api/partenariats", json=FICHE, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("PTR")
    assert r.json()["message"] == "Votre recherche de partenariat & troc a bien été enregistrée."
    doublon = client.post("/api/partenariats", json={**FICHE, "actif": "120 HECTARES de manioc "}, headers=h)
    assert doublon.status_code == 400 and doublon.json()["message"] == "Cette recherche de partenariat & troc est déjà enregistrée."
    assert client.post("/api/partenariats", json=FICHE, headers=entetes(client, "admin")).status_code == 403
    assert client.post("/api/partenariats", json=FICHE).status_code == 401


def test_liste_publique_recherche_et_compteur(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "awa")
    id_ = client.post("/api/partenariats", json=FICHE, headers=h).json()["id"]
    client.post("/api/partenariats", json={"actif": "Un local commercial", "recherche": "Des associés", "objectif": "Ouvrir une boutique"}, headers=h)
    publique = client.get("/api/partenariats").json()
    assert publique["total"] == 2 and publique["items"][0]["actif"] == "Un local commercial"
    assert publique["items"][0]["auteur"]["pseudonyme"] == "awa"
    assert client.get("/api/partenariats?q=transformation").json()["total"] == 1
    assert client.get("/api/partenariats?q=boutique").json()["total"] == 1
    assert client.get("/api/partenariats/compteur").json() == {"publies": 2}

    client.post(f"/api/partenariats/{id_}/etat", json={"etat": 1}, headers=entetes(client, "admin"))
    assert client.get("/api/partenariats").json()["total"] == 1
    assert client.get(f"/api/partenariats/{id_}").status_code == 404
    assert client.get("/api/partenariats", headers=h).json()["total"] == 2  # l'auteur voit la sienne
    assert client.get("/api/partenariats/compteur").json() == {"publies": 1}


def test_modification_reservee(client):
    creer_membre("awa")
    creer_membre("bob")
    id_ = client.post("/api/partenariats", json=FICHE, headers=entetes(client, "awa")).json()["id"]
    hb = entetes(client, "bob")
    assert client.put(f"/api/partenariats/{id_}", json=FICHE, headers=hb).status_code == 403
    assert client.delete(f"/api/partenariats/{id_}", headers=hb).status_code == 403
    detail = client.get(f"/api/partenariats/{id_}", headers=hb).json()
    assert detail["peut_modifier"] is False and detail["interets"] is None
    ha = entetes(client, "awa")
    r = client.put(f"/api/partenariats/{id_}", json={**FICHE, "objectif": "Exporter"}, headers=ha)
    assert r.status_code == 200
    assert client.get(f"/api/partenariats/{id_}", headers=ha).json()["objectif"] == "Exporter"
    assert client.delete(f"/api/partenariats/{id_}", headers=ha).status_code == 200
    assert client.get("/api/partenariats").json()["total"] == 0


def test_interessement_unique_et_notification(client):
    creer_membre("awa")
    creer_membre("bob", nom="Bob Nkouka", telephone="055123456")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    ha = entetes(client, "awa")
    id_ = client.post("/api/partenariats", json=FICHE, headers=ha).json()["id"]
    hb = entetes(client, "bob")
    r = client.post(f"/api/partenariats/{id_}/interet", json={"message": "ok"}, headers=hb)
    assert r.status_code == 400 and r.json()["champs"]["message"] == "L'intéressement doit avoir 5 caractères minimum."
    r = client.post(f"/api/partenariats/{id_}/interet", json={"message": "J'ai une presse à manioc"}, headers=hb)
    assert r.status_code == 201 and r.json()["message"] == "Votre intéressement est pris en compte."
    assert client.post(f"/api/partenariats/{id_}/interet", json={"message": "Encore moi !"}, headers=hb).status_code == 400
    assert client.get(f"/api/partenariats/{id_}", headers=hb).json()["mon_interet"] is True
    # pas sur sa propre fiche, pas pour un gestionnaire
    assert client.post(f"/api/partenariats/{id_}/interet", json={"message": "Moi-même"}, headers=ha).status_code == 400
    assert client.post(f"/api/partenariats/{id_}/interet", json={"message": "Gestion"}, headers=entetes(client, "admin")).status_code == 403
    # l'auteur voit l'intéressement (avec les coordonnées) et a reçu un message
    detail = client.get(f"/api/partenariats/{id_}", headers=ha).json()
    assert detail["nombre_interets"] == 1 and detail["interets"][0]["membre"]["telephone"] == "055123456"
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1
    # le public ne voit que le nombre
    public = client.get(f"/api/partenariats/{id_}").json()
    assert public["interets"] is None and public["nombre_interets"] == 1
