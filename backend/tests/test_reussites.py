import io

from conftest import creer_membre, entetes
from PIL import Image

from app.enums import TypeMembre

REUSSITE = {
    "secteur_id": 1,
    "situation_avant": "Sans emploi après mes études.",
    "projet": "Une agence de création de sites web pour les commerçants de Poto-Poto.",
    "fond_demarrage": 150000,
    "besoin_reel_demarrage": 400000,
    "succes": "Vingt clients fidèles en deux ans et deux salariés.",
    "conseil": "Commencez petit et notez chaque dépense.",
}


def _publier(client, id_):
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    r = client.post(f"/api/reussites/{id_}/etat", json={"etat": 2}, headers=entetes(client, "admin"))
    assert r.status_code == 200


def test_creation_regles_et_fiche_unique(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/reussites", json={**REUSSITE, "secteur_id": None, "projet": "Web"}, headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "secteur_id": "Veuillez indiquer le secteur d'activité.",
        "projet": "Veuillez décrire votre projet avec 10 caractères minimum.",
    }
    r = client.post("/api/reussites", json=REUSSITE, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("RST")
    r = client.post("/api/reussites", json=REUSSITE, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette fiche de réussite du membre est déjà enregistrée."
    moi = client.get("/api/reussites/moi", headers=h).json()
    assert moi["etat"] == 1 and moi["est_auteur"] is True and moi["fond_demarrage"] == 150000


def test_publication_apres_validation_et_contrat_accueil(client):
    creer_membre("awa", pseudonyme="awa_web")
    h = entetes(client, "awa")
    id_ = client.post("/api/reussites", json=REUSSITE, headers=h).json()["id"]
    # En attente : invisible du public, visible de l'auteur
    assert client.get("/api/reussites").json()["total"] == 0
    assert client.get(f"/api/reussites/{id_}").status_code == 404
    assert client.get(f"/api/reussites/{id_}", headers=h).status_code == 200
    # l'auteur ne peut pas se publier lui-même
    assert client.post(f"/api/reussites/{id_}/etat", json={"etat": 2}, headers=h).status_code == 403
    _publier(client, id_)

    liste = client.get("/api/reussites?taille=3").json()
    assert liste["total"] == 1 and liste["taille"] == 3 and liste["page"] == 1
    item = liste["items"][0]
    assert {"id", "projet", "succes", "conseil", "auteur", "secteur"} <= set(item)
    assert item["auteur"] == {"id": item["auteur"]["id"], "pseudonyme": "awa_web", "photo_url": None}
    assert item["secteur"] == "Informatique"
    # recherche (projet ou pseudonyme) et filtre secteur
    assert client.get("/api/reussites?q=poto").json()["total"] == 1
    assert client.get("/api/reussites?q=awa_web").json()["total"] == 1
    assert client.get("/api/reussites?q=boulangerie").json()["total"] == 0
    assert client.get("/api/reussites?secteur_id=99").json()["total"] == 0
    assert client.get("/api/reussites/compteurs").json() == {"publiees": 1, "a_valider": 0}


def test_modification_par_auteur_renvoie_en_relecture(client):
    creer_membre("awa")
    creer_membre("autre")
    h = entetes(client, "awa")
    id_ = client.post("/api/reussites", json=REUSSITE, headers=h).json()["id"]
    _publier(client, id_)
    assert client.put(f"/api/reussites/{id_}", json=REUSSITE, headers=entetes(client, "autre")).status_code == 403
    r = client.put(f"/api/reussites/{id_}", json={**REUSSITE, "conseil": "Soyez patients."}, headers=h)
    assert r.status_code == 200 and "relecture" in r.json()["message"]
    assert client.get("/api/reussites").json()["total"] == 0
    ha = entetes(client, "admin")
    assert client.get("/api/reussites?etat=1", headers=ha).json()["total"] == 1
    assert client.get("/api/reussites/compteurs", headers=ha).json()["a_valider"] == 1
    # un gestionnaire ne voit pas les fiches en attente dans la vitrine sans filtre explicite
    assert client.get("/api/reussites", headers=ha).json()["total"] == 0


def test_photo_et_suppression(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    id_ = client.post("/api/reussites", json=REUSSITE, headers=h).json()["id"]
    tampon = io.BytesIO()
    Image.new("RGB", (40, 40), "orange").save(tampon, "PNG")
    r = client.post(f"/api/reussites/{id_}/photo", files={"fichier": ("moi.png", tampon.getvalue(), "image/png")}, headers=h)
    assert r.status_code == 200, r.text
    moi = client.get("/api/reussites/moi", headers=h).json()
    assert moi["photo_url"] and moi["auteur"]["photo_url"] == moi["photo_url"]
    assert client.delete(f"/api/reussites/{id_}", headers=h).status_code == 200
    assert client.get("/api/reussites/moi", headers=h).json() is None
    # une nouvelle fiche reprend la fiche supprimée (une seule par membre)
    r = client.post("/api/reussites", json=REUSSITE, headers=h)
    assert r.status_code == 201 and r.json()["id"] == id_
