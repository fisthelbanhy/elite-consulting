"""Référentiels, paramètres du site et journaux (F-ADM-01 à F-ADM-04, F-ADM-16 à F-ADM-33)."""

from datetime import date, datetime, timedelta

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre

G = TypeMembre.GESTIONNAIRE
R = "/api/gestion/referentiels"


def admin(client, **droits) -> dict:
    creer_membre("systeme", type_compte=G)
    creer_membre("admin", type_compte=G, **(droits or {"droit_activation": True, "droit_attribution": True}))
    return entetes(client, "admin")


def test_villes_et_quartiers(client):
    h = admin(client)
    r = client.post(f"{R}/villes", json={"nom": "Oyo"}, headers=h)
    assert r.status_code == 400 and "4 caractères" in r.json()["champs"]["nom"]
    assert client.post(f"{R}/villes", json={"nom": "brazzaville"}, headers=h).json()["message"] == "Cette ville est déjà enregistrée."
    id_ = client.post(f"{R}/villes", json={"nom": "Dolisie"}, headers=h).json()["id"]
    assert client.put(f"{R}/villes/{id_}", json={"nom": "Dolisie-Centre"}, headers=h).status_code == 200

    r = client.post(f"{R}/quartiers", json={"nom": "Tié-Tié"}, headers=h)
    assert "ville_id" in r.json()["champs"]
    q = client.post(f"{R}/quartiers", json={"ville_id": id_, "nom": "Bacongo"}, headers=h)  # même nom, autre ville
    assert q.status_code == 201
    assert client.post(f"{R}/quartiers", json={"ville_id": 2, "nom": "BACONGO"}, headers=h).status_code == 400
    assert client.get(f"{R}/quartiers?ville_id={id_}", headers=h).json()["total"] == 1

    # suppression physique refusée tant que la ville est utilisée
    r = client.delete(f"{R}/villes/{id_}", headers=h)
    assert r.status_code == 400 and "quartier" in r.json()["message"]
    assert client.delete(f"{R}/quartiers/{q.json()['id']}", headers=h).status_code == 200
    assert client.delete(f"{R}/villes/{id_}", headers=h).status_code == 200
    villes = client.get(f"{R}/villes", headers=h).json()
    assert villes["total"] == 2 and villes["items"][0]["nombre_quartiers"] == 1


def test_secteurs_domaines_diplomes_familles(client):
    h = admin(client)
    r = client.post(f"{R}/domaines", json={"libelle": "Agriculture vivrière"}, headers=h)
    assert r.status_code == 400 and "secteur" in r.json()["champs"]["secteur_id"]  # correctif F-ADM-20
    sid = client.post(f"{R}/secteurs", json={"libelle": "Agriculture", "etat": 2}, headers=h).json()["id"]
    did = client.post(f"{R}/domaines", json={"secteur_id": sid, "libelle": "Maraîchage"}, headers=h).json()["id"]
    assert client.post(f"{R}/domaines", json={"secteur_id": sid, "libelle": "maraîchage"}, headers=h).status_code == 400
    # suppression logique : disparaît des listes publiques
    assert client.delete(f"{R}/domaines/{did}", headers=h).status_code == 200
    publics = client.get("/api/referentiels/secteurs").json()
    assert next(s for s in publics if s["id"] == sid)["domaines"] == []
    assert client.get(f"{R}/domaines/{did}", headers=h).json()["etat"] == 3

    d = client.post(f"{R}/diplomes", json={"code": "bts", "libelle": "Brevet de technicien supérieur"}, headers=h)
    assert client.get(f"{R}/diplomes/{d.json()['id']}", headers=h).json()["code"] == "BTS"
    assert client.post(f"{R}/diplomes", json={"libelle": "BTS"}, headers=h).status_code == 400

    client.post(f"{R}/familles", json={"libelle": "Électroménager"}, headers=h)
    r = client.post(f"{R}/familles", json={"libelle": "électroménager"}, headers=h)
    assert r.json()["message"] == "Cette famille d'article est déjà enregistrée."


def test_produits_et_maladies(client):
    h = admin(client)
    p = {"groupe": 1, "reference": "015", "nom": "Aloe Vera Gel", "prix_distributeur": 15000, "prix_public": 20000,
         "quantite_stock": 12}
    ids = [client.post(f"{R}/produits", json={**p, "nom": f"Produit {i}"}, headers=h).json()["id"] for i in range(6)]
    assert client.post(f"{R}/produits", json={**p, "nom": "Produit 1"}, headers=h).json()["message"] == "Ce produit est déjà enregistré."
    assert client.post(f"{R}/produits", json={**p, "nom": "Produit 1", "groupe": 2}, headers=h).status_code == 201
    assert client.post(f"{R}/produits", json={**p, "groupe": 100}, headers=h).status_code == 400
    assert client.get(f"{R}/produits?prix_public_max=19999", headers=h).json()["total"] == 0
    assert client.get(f"{R}/produits?groupe=2&q=produit", headers=h).json()["total"] == 1

    # conseils d'utilisation : liste ordonnée, plus de 5 produits (F-ADM-23)
    conseils = [{"produit_id": i, "posologie": f"{n + 1} fois par jour"} for n, i in enumerate(reversed(ids))]
    r = client.post(f"{R}/maladies", json={"libelle": "Fatigue", "produits": conseils}, headers=h)
    assert r.status_code == 201, r.text
    mid = r.json()["id"]
    fiche = client.get(f"{R}/maladies/{mid}", headers=h).json()
    assert [x["produit_id"] for x in fiche["produits"]] == list(reversed(ids)) and fiche["nombre_produits"] == 6
    r = client.put(f"{R}/maladies/{mid}", json={"libelle": "Fatigue", "produits": conseils[:1] + conseils[:1]}, headers=h)
    assert r.status_code == 400 and "produits.1.produit_id" in r.json()["champs"]
    client.put(f"{R}/maladies/{mid}", json={"libelle": "Fatigue", "produits": conseils[:2]}, headers=h)
    with SessionLocal() as db:
        assert db.query(m.MaladieProduit).filter_by(maladie_id=mid).count() == 2
    assert client.post(f"{R}/maladies", json={"libelle": "fatigue"}, headers=h).json()["message"] == "Cette maladie est déjà enregistrée."


def test_comparateur_banques_et_sommaire(client):
    h = admin(client)
    assert client.post(f"{R}/produits-comparateur", json={"nom": "Riz"}, headers=h).status_code == 400
    assert client.post(f"{R}/produits-comparateur", json={"nom": "Ciment 50 kg"}, headers=h).status_code == 201
    b = client.post(f"{R}/banques", json={"sigle": "bgfi", "nom": "BGFI Bank Congo"}, headers=h)
    assert b.status_code == 201
    assert client.post(f"{R}/banques", json={"sigle": "BGFI", "nom": "bgfi bank congo"}, headers=h).status_code == 400
    assert client.get(f"{R}/banques/{b.json()['id']}", headers=h).json()["sigle"] == "BGFI"
    client.delete(f"{R}/banques/{b.json()['id']}", headers=h)
    assert client.get("/api/referentiels/banques").json() == []
    sommaire = {x["cle"]: x["total"] for x in client.get(R, headers=h).json()}
    assert sommaire["villes"] == 2 and sommaire["banques"] == 0 and sommaire["produits-comparateur"] == 1


def test_parametres(client):
    h = admin(client)
    params = client.get("/api/gestion/parametres", headers=h).json()
    r = client.put("/api/gestion/parametres", json={**params, "telephone_1": "0712"}, headers=h)
    assert r.status_code == 422 and "téléphone 1" in r.json()["champs"]["telephone_1"]
    corps = {**params, "nom_site": "La Frangine Congo", "whatsapp": "06 569 77 97", "module_sante_actif": False,
             "description_section_2": "Emplois au Congo"}
    assert client.put("/api/gestion/parametres", json=corps, headers=h).status_code == 200
    public = client.get("/api/referentiels/parametres").json()
    assert public["nom_site"] == "La Frangine Congo" and public["whatsapp"] == "065697797"  # correctif F-ADM-02
    assert public["module_sante_actif"] is False and public["description_section_2"] == "Emplois au Congo"
    assert client.put("/api/gestion/parametres", json={**corps, "nom_site": " "}, headers=h).status_code == 400


def test_journaux_filtres_et_purge(client):
    h = admin(client)
    membre = creer_membre("visiteur")
    hier = datetime.combine(date.today() - timedelta(days=1), datetime.min.time())
    with SessionLocal() as db:
        db.add_all([
            m.Visite(adresse_ip="10.0.0.1", date_heure=hier.replace(hour=8, minute=15)),
            m.Visite(adresse_ip="10.0.0.2", date_heure=hier.replace(hour=23, minute=30)),
            m.Visite(adresse_ip="192.168.1.9", date_heure=hier.replace(hour=12) - timedelta(days=40), membre_id=membre),
            m.VisiteMembre(membre_id=membre, adresse_ip="10.0.0.1", date_connexion=hier.replace(hour=9)),
        ])
        db.commit()
    V = "/api/gestion/journaux/visites"
    assert client.get(V, headers=h).json()["total"] == 3
    j = (date.today() - timedelta(days=1)).isoformat()
    assert client.get(f"{V}?du={j}&au={j}", headers=h).json()["total"] == 2  # correctif F-ADM-32
    assert client.get(f"{V}?heure_debut=08:00&heure_fin=09:00", headers=h).json()["total"] == 1
    assert client.get(f"{V}?heure_debut=22:00&heure_fin=06:00", headers=h).json()["total"] == 1  # passe minuit
    assert client.get(f"{V}?ip=192.168", headers=h).json()["items"][0]["membre"]["pseudonyme"] == "visiteur"
    assert client.get(f"{V}?heure_debut=25:00", headers=h).status_code == 400
    assert client.get(f"{V}?du={j}&au=2000-01-01", headers=h).status_code == 400
    c = client.get(f"/api/gestion/journaux/connexions?membre_id={membre}", headers=h).json()
    assert c["total"] == 1 and c["items"][0]["membre"]["pseudonyme"] == "visiteur"

    # purge : droit Activation, lignes cochées ou antérieures à une date
    creer_membre("lecteur", type_compte=G)
    ids = [x["id"] for x in client.get(f"{V}?ip=10.0.0", headers=h).json()["items"]]
    assert client.post("/api/gestion/journaux/visites/purger", json={"ids": ids}, headers=entetes(client, "lecteur")).status_code == 403
    r = client.post("/api/gestion/journaux/visites/purger", json={"ids": ids}, headers=h)
    assert r.json()["message"] == "2 lignes supprimées."
    avant = (date.today() - timedelta(days=30)).isoformat()
    assert client.post("/api/gestion/journaux/visites/purger", json={"avant": avant}, headers=h).json()["message"] == "1 ligne supprimée."
    assert client.post("/api/gestion/journaux/visites/purger", json={}, headers=h).status_code == 400
