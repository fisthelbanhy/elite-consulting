from conftest import creer_membre, entetes

from app.enums import TypeMembre

OFFRE = {
    "offre_ou_recherche": 1, "type_transaction": 1, "type_bien": 2, "quartier_id": 1,
    "localisation": "63 rue Primera, Poto-Poto", "surface_m2": 1500, "nombre_pieces": 4, "nombre_chambres": 3,
    "situation": 1, "prix": 250000, "description": "Bel appartement lumineux avec balcon, proche du marché.",
}
RECHERCHE = {
    "offre_ou_recherche": 2, "type_transaction": 2, "type_bien": 3, "surface_m2": 400, "situation": 1,
    "prix": 15000000, "description": "Je cherche un terrain titré à Brazzaville sud.",
}


def test_creation_regles_reference_et_unicite(client):
    creer_membre("proprio")
    h = entetes(client, "proprio")
    r = client.post("/api/immobilier", json={"description": "Incomplet"}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["type_transaction"] == "Veuillez indiquer la transaction."
    assert champs["type_bien"] == "Veuillez indiquer le type de l'immobilier."
    assert champs["surface_m2"] == "Veuillez indiquer la surface."
    assert {"situation", "offre_ou_recherche"} <= set(champs)

    r = client.post("/api/immobilier", json=OFFRE, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("IMB") and r.json()["message"] == "Enregistrement effectué."
    id_ = r.json()["id"]
    fiche = client.get(f"/api/immobilier/{id_}", headers=h).json()
    assert fiche["surface_m2"] == 1500 and fiche["etat"] == 2  # sans troncature, publié immédiatement
    assert fiche["auteur"]["pseudonyme"] == "proprio"
    # Unicité de la description (F-S3-22)
    r = client.post("/api/immobilier", json={**OFFRE, "prix": 1}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette fiche existe déjà."
    # La modification de la fiche elle-même n'est pas un doublon
    r = client.put(f"/api/immobilier/{id_}", json={**OFFRE, "prix": 300000}, headers=h)
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."


def test_adresse_privee_et_visites_des_tiers(client):
    creer_membre("proprio")
    creer_membre("curieux")
    h = entetes(client, "proprio")
    id_ = client.post("/api/immobilier", json=OFFRE, headers=h).json()["id"]
    public = client.get(f"/api/immobilier/{id_}").json()
    assert public["localisation"] is None and public["interets"] is None
    assert public["quartier"]["nom"] == "Bacongo" and public["quartier"]["ville"]["nom"] == "Brazzaville"
    assert public["peut_modifier"] is False and public["peut_manifester"] is True
    client.get(f"/api/immobilier/{id_}", headers=entetes(client, "curieux"))
    moi = client.get(f"/api/immobilier/{id_}", headers=h).json()
    assert moi["localisation"] == OFFRE["localisation"] and moi["interets"] == []
    assert moi["nombre_visites"] == 2 and moi["peut_manifester"] is False


def test_liste_filtres_compteurs_et_encarts(client):
    creer_membre("proprio")
    h = entetes(client, "proprio")
    client.post("/api/immobilier", json=OFFRE, headers=h)
    client.post("/api/immobilier", json={**OFFRE, "description": "Studio meublé", "prix": 80000, "nombre_chambres": 1,
                                         "quartier_id": None}, headers=h)
    client.post("/api/immobilier", json=RECHERCHE, headers=h)
    assert client.get("/api/immobilier").json()["total"] == 3
    assert client.get("/api/immobilier?type=1").json()["total"] == 2
    assert client.get("/api/immobilier?type=2&transaction=2").json()["total"] == 1
    assert client.get("/api/immobilier?ville_id=2").json()["total"] == 1
    assert client.get("/api/immobilier?quartier_id=1&chambres=3").json()["total"] == 1
    assert client.get("/api/immobilier?prix_min=100000&prix_max=300000").json()["total"] == 1
    # Recherche texte correctement combinée avec les autres critères (correctif du OU legacy)
    assert client.get("/api/immobilier?q=studio&type=2").json()["total"] == 0
    assert client.get("/api/immobilier?q=studio").json()["total"] == 1
    # Tri legacy : prix croissant
    prix = [b["prix"] for b in client.get("/api/immobilier?type=1").json()["items"]]
    assert prix == sorted(prix)
    assert client.get("/api/immobilier/compteurs").json() == {"offres": 2, "recherches": 1, "total": 3}
    encarts = client.get("/api/immobilier/encarts").json()
    assert len(encarts["nouveautes"]) == 3 and len(encarts["plus_visites"]) == 3


def test_droits_modification_et_moderation(client):
    creer_membre("proprio")
    creer_membre("autre")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "proprio")
    id_ = client.post("/api/immobilier", json=OFFRE, headers=h).json()["id"]
    assert client.put(f"/api/immobilier/{id_}", json=OFFRE, headers=entetes(client, "autre")).status_code == 403
    assert client.delete(f"/api/immobilier/{id_}", headers=entetes(client, "autre")).status_code == 403
    r = client.post(f"/api/immobilier/{id_}/etat", json={"etat": 1}, headers=entetes(client, "admin_sans_droit"))
    assert r.status_code == 403
    ha = entetes(client, "admin")
    assert client.post(f"/api/immobilier/{id_}/etat", json={"etat": 1}, headers=ha).status_code == 200
    assert client.get(f"/api/immobilier/{id_}").status_code == 404  # plus publié : invisible du public
    assert client.get("/api/immobilier").json()["total"] == 0
    assert client.get("/api/immobilier", headers=h).json()["total"] == 1  # l'auteur la voit toujours
    admin = client.get(f"/api/immobilier/{id_}", headers=ha).json()
    assert admin["peut_moderer"] is True and admin["localisation"] is not None
    assert client.delete(f"/api/immobilier/{id_}", headers=h).status_code == 200
    assert client.get(f"/api/immobilier/{id_}", headers=h).status_code == 404


def test_besoin_et_interessement(client):
    creer_membre("proprio")
    creer_membre("locataire", telephone="061234567")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    hp = entetes(client, "proprio")
    offre = client.post("/api/immobilier", json=OFFRE, headers=hp).json()["id"]
    recherche = client.post("/api/immobilier", json=RECHERCHE, headers=hp).json()["id"]
    h = entetes(client, "locataire")
    r = client.post(f"/api/immobilier/{offre}/interet", json={"message": "Oui"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Présentation de besoin doit avoir 5 caractères minimum."
    r = client.post(f"/api/immobilier/{offre}/interet", json={"message": "Je souhaite visiter samedi."}, headers=h)
    assert r.status_code == 201 and r.json()["message"] == "Votre présentation de besoin est prise en compte."
    assert client.post(f"/api/immobilier/{offre}/interet", json={"message": "Encore moi !"}, headers=h).status_code == 400
    r = client.post(f"/api/immobilier/{recherche}/interet", json={"message": "J'ai un terrain à vendre."}, headers=h)
    assert r.status_code == 201 and r.json()["message"] == "Votre intéressement est pris en compte."
    assert client.get(f"/api/immobilier/{offre}", headers=h).json()["mon_interet"] is True
    # L'auteur voit les contributions avec les coordonnées et a été prévenu (ADR-0007 S2d)
    detail = client.get(f"/api/immobilier/{offre}", headers=hp).json()
    assert detail["interets"][0]["membre"]["telephone"] == "061234567" and detail["interets"][0]["sous_type"] == 1
    assert client.get("/api/espace/compteurs", headers=hp).json()["messages_non_lus"] == 2
    # Ni sur sa propre fiche, ni par un gestionnaire, ni sans être connecté
    assert client.post(f"/api/immobilier/{offre}/interet", json={"message": "Mon bien"}, headers=hp).status_code == 400
    r = client.post(f"/api/immobilier/{offre}/interet", json={"message": "Gestion"}, headers=entetes(client, "admin"))
    assert r.status_code == 403
    assert client.post(f"/api/immobilier/{offre}/interet", json={"message": "Visiteur"}).status_code == 401


def test_photo_image_seulement(client):
    creer_membre("proprio")
    h = entetes(client, "proprio")
    id_ = client.post("/api/immobilier", json=OFFRE, headers=h).json()["id"]
    r = client.post(f"/api/immobilier/{id_}/photo", files={"fichier": ("x.jpg", b"pas une image", "image/jpeg")}, headers=h)
    assert r.status_code == 400 and "photo" in r.json()["champs"]
    import io

    from PIL import Image

    tampon = io.BytesIO()
    Image.new("RGB", (40, 30), "orange").save(tampon, "PNG")
    r = client.post(f"/api/immobilier/{id_}/photo", files={"fichier": ("p.png", tampon.getvalue(), "image/png")}, headers=h)
    assert r.status_code == 200, r.text
    assert client.get(f"/api/immobilier/{id_}").json()["photo_url"].endswith(".jpg")
