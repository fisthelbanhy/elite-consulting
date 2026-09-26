from conftest import creer_membre, entetes

from app.enums import TypeMembre

FICHE = {
    "type_activite": "Agribusiness",
    "description_projet": "Transformation du manioc en foufou et en chikwangue",
    "ambition": "Livrer les supermarchés de Brazzaville",
    "niveau_realisation": 40,
}


def test_regles_et_messages_legacy(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/business-plan", json={"type_activite": "Agr", "description_projet": "court"}, headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "type_activite": "Veuillez indiquer le type d'activité avec 5 caractères minimum.",
        "description_projet": "Veuillez décrire votre projet avec 10 caractères minimum.",
    }
    assert client.post("/api/business-plan", json={**FICHE, "niveau_realisation": 120}, headers=h).status_code == 422


def test_sauvegarder_brouillon_puis_envoyer(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    r = client.post("/api/business-plan", json=FICHE, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("BSP")
    assert r.json()["message"] == "Enregistrement effectué."
    id_ = r.json()["id"]
    mien = client.get("/api/business-plan/mien", headers=h).json()
    assert mien["etat"] == 1 and mien["niveau_realisation"] == 40 and mien["peut_modifier"] is True
    # une seule fiche par membre
    r = client.post("/api/business-plan", json=FICHE, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "La fiche de business plan du membre est déjà enregistrée."

    r = client.put(f"/api/business-plan/{id_}", json={**FICHE, "apport_prevu": "500 000 FCFA", "envoyer": True}, headers=h)
    assert r.status_code == 200 and "envoyé" in r.json()["message"]
    assert client.get(f"/api/business-plan/{id_}", headers=h).json()["etat"] == 2
    # la frangine est prévenue
    assert client.get("/api/espace/compteurs", headers=entetes(client, "admin")).json()["messages_non_lus"] == 1
    # « Sauvegarder » ne retire pas une fiche déjà envoyée
    client.put(f"/api/business-plan/{id_}", json=FICHE, headers=h)
    assert client.get(f"/api/business-plan/{id_}", headers=h).json()["etat"] == 2


def test_visibilite_liste_et_droits(client):
    creer_membre("awa")
    creer_membre("bob")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    id_ = client.post("/api/business-plan", json={**FICHE, "envoyer": True}, headers=entetes(client, "awa")).json()["id"]
    client.post("/api/business-plan", json={**FICHE, "description_projet": "Salon de coiffure à Moungali"},
                headers=entetes(client, "bob"))

    assert client.get("/api/business-plan").status_code == 401  # invisible des visiteurs
    hb = entetes(client, "bob")
    assert client.get("/api/business-plan", headers=hb).json()["total"] == 1  # le sien seulement
    assert client.get(f"/api/business-plan/{id_}", headers=hb).status_code == 404
    assert client.put(f"/api/business-plan/{id_}", json=FICHE, headers=hb).status_code == 404

    ha = entetes(client, "admin")
    tout = client.get("/api/business-plan", headers=ha).json()
    assert tout["total"] == 2 and tout["items"][0]["membre"]["pseudonyme"] in {"awa", "bob"}
    assert client.get("/api/business-plan?q=coiffure", headers=ha).json()["total"] == 1
    # le gestionnaire ne crée pas de business plan
    assert client.post("/api/business-plan", json=FICHE, headers=ha).status_code == 403
    # état : gestionnaire avec le droit Activation
    assert client.post(f"/api/business-plan/{id_}/etat", json={"etat": 3}, headers=entetes(client, "admin_sans_droit")).status_code == 403
    assert client.post(f"/api/business-plan/{id_}/etat", json={"etat": 3}, headers=ha).status_code == 200
    # fiche supprimée : le porteur peut en recréer une (même référence conservée)
    h = entetes(client, "awa")
    assert client.get("/api/business-plan/mien", headers=h).json() is None
    r = client.post("/api/business-plan", json=FICHE, headers=h)
    assert r.status_code == 201 and r.json()["id"] == id_
