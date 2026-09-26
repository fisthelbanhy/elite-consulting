from conftest import creer_membre, entetes

INSCRIPTION = {
    "categorie": 1, "nom": "Mabiala - Grace", "pseudonyme": "gracem", "telephone": "06 123 45 67",
    "ville_id": 2, "identifiant": "grace.m", "mot_de_passe": "unmotdepasse", "confirmation": "unmotdepasse",
    "accepte_conditions": True, "duree_saisie_ms": 20000,
}


def test_inscription_puis_connexion_par_telephone(client):
    r = client.post("/api/auth/inscription", json=INSCRIPTION)
    assert r.status_code == 201, r.text
    corps = r.json()
    assert corps["membre"]["type_compte"] == 3  # jamais gestionnaire à l'inscription
    assert corps["membre"]["telephone"] == "061234567"
    assert corps["membre"]["code_membre"].startswith("MBR")

    r = client.post("/api/auth/login", json={"identifiant": "061234567", "mot_de_passe": "unmotdepasse"})
    assert r.status_code == 200
    moi = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['jeton']}"})
    assert moi.json()["pseudonyme"] == "gracem"


def test_inscription_regles_legacy(client):
    mauvais = {**INSCRIPTION, "telephone": "0712345", "identifiant": "gracemabiala",
               "mot_de_passe": "gracemabiala", "confirmation": "autre"}
    r = client.post("/api/auth/inscription", json=mauvais)
    assert r.status_code == 422
    champs = r.json()["champs"]
    assert "telephone" in champs and "différent de l'identifiant" in champs["mot_de_passe"]

    r = client.post("/api/auth/inscription", json={**INSCRIPTION, "confirmation": "autre chose"})
    assert r.status_code == 422 and "confirmation" in r.json()["champs"]

    r = client.post("/api/auth/inscription", json={**INSCRIPTION, "pseudonyme": "gra"})
    assert r.status_code == 400
    assert "6 caractères" in r.json()["champs"]["pseudonyme"]

    # personne morale : sigle de 3 caractères accepté
    r = client.post("/api/auth/inscription", json={**INSCRIPTION, "categorie": 2, "pseudonyme": "SGC"})
    assert r.status_code == 201


def test_inscription_doublons_et_robot(client):
    assert client.post("/api/auth/inscription", json=INSCRIPTION).status_code == 201
    r = client.post("/api/auth/inscription", json={**INSCRIPTION, "identifiant": "autre"})
    assert r.status_code == 400
    assert {"pseudonyme", "telephone"} <= set(r.json()["champs"])
    r = client.post("/api/auth/inscription", json={**INSCRIPTION, "identifiant": "robot1", "site_web": "http://spam"})
    assert r.status_code == 400


def test_membre_supprime_ne_peut_pas_se_connecter(client):
    creer_membre("supprime", etat=3)
    creer_membre("nontraite", etat=1)
    r = client.post("/api/auth/login", json={"identifiant": "supprime", "mot_de_passe": "motdepasse1"})
    assert r.status_code == 400
    # l'état « Non traité » n'empêche pas la connexion (règle legacy)
    assert client.post("/api/auth/login", json={"identifiant": "nontraite", "mot_de_passe": "motdepasse1"}).status_code == 200


def test_limitation_des_tentatives(client):
    creer_membre("cible")
    for _ in range(5):
        client.post("/api/auth/login", json={"identifiant": "cible", "mot_de_passe": "faux"})
    r = client.post("/api/auth/login", json={"identifiant": "cible", "mot_de_passe": "motdepasse1"})
    assert r.status_code == 429


def test_deconnexion_invalide_le_jeton(client):
    creer_membre("sortie")
    h = entetes(client, "sortie")
    assert client.get("/api/auth/me", headers=h).status_code == 200
    client.post("/api/auth/logout", headers=h)
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_mot_de_passe_oublie_ne_revele_jamais_le_mot_de_passe(client):
    creer_membre("oubli", nom="Oubli Test", pseudonyme="oublieux", telephone="061112233")
    r = client.post("/api/auth/mot-de-passe-oublie", json={
        "categorie": 1, "nom": "oubli test", "pseudonyme": "OUBLIEUX", "telephone": "06 111 22 33"})
    assert r.status_code == 200
    assert "motdepasse1" not in r.text


def test_reference_format_legacy(client):
    from datetime import datetime

    from app.db import SessionLocal
    from app.services.references import nouvelle_reference

    with SessionLocal() as db:
        ref = nouvelle_reference(db, "dei", datetime(2017, 11, 5))
        db.commit()
    assert ref == "DEI1110117"  # préfixe + mois + compteur (100+1) + année


def test_inscription_minimale_deduit_identifiant_et_pseudonyme(client):
    corps = {"categorie": 1, "nom": "Mabiala - Grace", "telephone": "055551234", "ville_id": 2,
             "mot_de_passe": "unmotdepasse", "confirmation": "unmotdepasse", "accepte_conditions": True}
    r = client.post("/api/auth/inscription", json=corps)
    assert r.status_code == 201, r.text
    m = r.json()["membre"]
    assert m["identifiant"] == "055551234"
    assert m["pseudonyme"] == "Grace M."
    # homonyme : pseudonyme rendu unique, téléphone différent
    r = client.post("/api/auth/inscription", json={**corps, "telephone": "055551235"})
    assert r.status_code == 201 and r.json()["membre"]["pseudonyme"] == "Grace M.2"
    # entreprise : sigle
    r = client.post("/api/auth/inscription", json={**corps, "categorie": 2, "nom": "Société Générale Congo",
                                                    "telephone": "055551236"})
    assert r.json()["membre"]["pseudonyme"] == "SGC"
