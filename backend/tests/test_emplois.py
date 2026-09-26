from conftest import creer_membre, entetes

from app.enums import TypeMembre

DEMANDE = {
    "type_annonce": 1, "domaine_id": 1, "nom": "Mabiala", "prenom": "grace", "sexe": 1,
    "telephone": "061234567", "diplomes": "BAC", "competences": "Webdesign, infographie",
}
OFFRE = {"type_annonce": 2, "domaine_id": 1, "poste_a_pourvoir": "Développeur web", "competences": "Svelte"}


def test_creation_reference_et_regles(client):
    creer_membre("candidat")
    h = entetes(client, "candidat")
    r = client.post("/api/emplois", json={**DEMANDE, "nom": "Ma", "sexe": None, "telephone": ""}, headers=h)
    assert r.status_code == 400
    assert {"nom", "sexe", "telephone"} <= set(r.json()["champs"])

    r = client.post("/api/emplois", json=DEMANDE, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("DEI")
    # doublon
    assert client.post("/api/emplois", json=DEMANDE, headers=h).status_code == 400
    # l'offre n'exige pas le sexe (ADR-0007 S2b)
    r = client.post("/api/emplois", json=OFFRE, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("OE1")


def test_coordonnees_visibles_seulement_par_auteur_et_gestionnaire(client):
    creer_membre("candidat")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    id_ = client.post("/api/emplois", json=DEMANDE, headers=entetes(client, "candidat")).json()["id"]

    public = client.get(f"/api/emplois/{id_}").json()
    assert public["telephone"] is None and public["nom"] is None
    autre = client.get(f"/api/emplois/{id_}", headers=entetes(client, "curieux")).json()
    assert autre["telephone"] is None and autre["peut_modifier"] is False
    moi = client.get(f"/api/emplois/{id_}", headers=entetes(client, "candidat")).json()
    assert moi["telephone"] == "061234567" and moi["nom"] == "MABIALA" and moi["prenom"] == "Grace"
    admin = client.get(f"/api/emplois/{id_}", headers=entetes(client, "admin")).json()
    assert admin["peut_moderer"] is True and admin["telephone"] == "061234567"


def test_visites_comptees_pour_les_tiers_seulement(client):
    creer_membre("candidat")
    h = entetes(client, "candidat")
    id_ = client.post("/api/emplois", json=DEMANDE, headers=h).json()["id"]
    client.get(f"/api/emplois/{id_}", headers=h)
    client.get(f"/api/emplois/{id_}")
    client.get(f"/api/emplois/{id_}")
    assert client.get(f"/api/emplois/{id_}", headers=h).json()["nombre_visites"] == 2


def test_modification_reservee(client):
    creer_membre("candidat")
    creer_membre("autre")
    id_ = client.post("/api/emplois", json=DEMANDE, headers=entetes(client, "candidat")).json()["id"]
    r = client.put(f"/api/emplois/{id_}", json={**DEMANDE, "competences": "Pirate"}, headers=entetes(client, "autre"))
    assert r.status_code == 403
    # moderation : gestionnaire sans droit activation refusé
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    r = client.post(f"/api/emplois/{id_}/etat", json={"etat": 3}, headers=entetes(client, "admin_sans_droit"))
    assert r.status_code == 403


def test_interet_unique_et_notification(client):
    creer_membre("recruteur")
    creer_membre("candidat")
    id_ = client.post("/api/emplois", json=OFFRE, headers=entetes(client, "recruteur")).json()["id"]
    h = entetes(client, "candidat")
    r = client.post(f"/api/emplois/{id_}/interet", json={"message": ""}, headers=h)
    assert r.status_code == 201 and "Intéressement" in r.json()["message"]
    assert client.post(f"/api/emplois/{id_}/interet", json={"message": "encore"}, headers=h).status_code == 400
    # l'auteur voit la contribution et a reçu un message
    hr = entetes(client, "recruteur")
    detail = client.get(f"/api/emplois/{id_}", headers=hr).json()
    assert len(detail["interets"]) == 1 and detail["interets"][0]["membre"]["pseudonyme"] == "candidat"
    assert client.get("/api/espace/compteurs", headers=hr).json()["messages_non_lus"] == 1
    # impossible sur sa propre fiche
    assert client.post(f"/api/emplois/{id_}/interet", json={}, headers=hr).status_code == 400


def test_liste_publique_filtrée(client):
    creer_membre("candidat")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "candidat")
    id_ = client.post("/api/emplois", json=DEMANDE, headers=h).json()["id"]
    client.post("/api/emplois", json=OFFRE, headers=h)
    assert client.get("/api/emplois?type=2").json()["total"] == 1
    assert client.get("/api/emplois?q=webdesign").json()["total"] == 1
    client.post(f"/api/emplois/{id_}/etat", json={"etat": 1}, headers=entetes(client, "admin"))
    assert client.get("/api/emplois").json()["total"] == 1  # le public ne voit plus la fiche non publiée
    assert client.get("/api/emplois", headers=h).json()["total"] == 2  # l'auteur la voit toujours
    assert client.get("/api/emplois/compteurs").json() == {"demandes": 0, "offres": 1}
