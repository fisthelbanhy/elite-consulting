import pytest
from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre

OFFRE = {
    "offre_ou_recherche": 1, "famille_id": 1, "libelle": "Chaussures de ville en cuir", "prix": 15000,
    "quantite": 3, "neuf_ou_occasion": 1, "description": "Pointure 42, jamais portées.",
}
RECHERCHE = {
    "offre_ou_recherche": 2, "famille_id": 2, "libelle": "Sac à main en pagne", "prix": 10000,
    "neuf_ou_occasion": 2, "description": "Je cherche un sac artisanal.",
}


@pytest.fixture(autouse=True)
def familles():
    with SessionLocal() as db:
        db.add_all([m.FamilleArticle(id=1, libelle="Chaussure"), m.FamilleArticle(id=2, libelle="Sac à main")])
        db.commit()


def test_creation_regles_reference_et_unicite(client):
    creer_membre("vendeur")
    h = entetes(client, "vendeur")
    r = client.post("/api/annonces", json={"libelle": "Sac"}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["libelle"] == "Le libellé de l'article doit avoir 5 caractères minimum."
    assert champs["famille_id"] == "Veuillez indiquer la famille de l'article."
    assert {"neuf_ou_occasion", "offre_ou_recherche"} <= set(champs)

    r = client.post("/api/annonces", json={**OFFRE, "quantite": 500}, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("ACL")
    fiche = client.get(f"/api/annonces/{r.json()['id']}", headers=h).json()
    assert fiche["quantite"] == 500 and fiche["date_creation"] is not None and fiche["etat"] == 2
    # Unicité libellé + description (F-S3-38, inopérante dans le legacy)
    r = client.post("/api/annonces", json={**OFFRE, "prix": 1}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cet article est déjà enregistré."


def test_liste_filtres_et_visibilite(client):
    creer_membre("vendeur")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "vendeur")
    id_ = client.post("/api/annonces", json=OFFRE, headers=h).json()["id"]
    client.post("/api/annonces", json=RECHERCHE, headers=h)
    assert client.get("/api/annonces?type=1").json()["total"] == 1
    assert client.get("/api/annonces?famille_id=2&neuf_ou_occasion=2").json()["total"] == 1
    assert client.get("/api/annonces?prix_min=12000").json()["total"] == 1
    # Mot recherché dans le libellé OU la description, sans casser les autres critères (F-S3-30)
    assert client.get("/api/annonces?q=pointure").json()["total"] == 1
    assert client.get("/api/annonces?q=pointure&famille_id=2").json()["total"] == 0
    assert client.get("/api/annonces/compteurs").json() == {"offres": 1, "recherches": 1, "total": 2}
    # Tri legacy famille puis prix
    assert [a["famille"]["libelle"] for a in client.get("/api/annonces").json()["items"]] == ["Chaussure", "Sac à main"]
    # Un article supprimé n'est plus consultable par un tiers (F-S3-33)
    assert client.delete(f"/api/annonces/{id_}", headers=h).status_code == 200
    assert client.get(f"/api/annonces/{id_}", headers=entetes(client, "curieux")).status_code == 404
    assert client.get(f"/api/annonces/{id_}", headers=entetes(client, "admin")).status_code == 200


def test_panier_ajout_stock_et_droits(client):
    creer_membre("vendeur")
    creer_membre("acheteur")
    creer_membre("autre")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    hv, ha = entetes(client, "vendeur"), entetes(client, "acheteur")
    offre = client.post("/api/annonces", json=OFFRE, headers=hv).json()["id"]
    recherche = client.post("/api/annonces", json=RECHERCHE, headers=hv).json()["id"]

    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 0}, headers=ha).status_code == 400
    r = client.post(f"/api/annonces/{offre}/panier", json={"quantite": 4}, headers=ha)
    assert r.status_code == 400 and "Il reste 3" in r.json()["champs"]["quantite"]
    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 2}, headers=ha).status_code == 201
    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 1}, headers=ha).status_code == 201
    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 1}, headers=ha).status_code == 400
    assert client.get(f"/api/annonces/{offre}", headers=ha).json()["quantite_panier"] == 3
    # Ni son propre article, ni une recherche, ni un gestionnaire
    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 1}, headers=hv).status_code == 400
    assert client.post(f"/api/annonces/{recherche}/panier", json={"quantite": 1}, headers=ha).status_code == 400
    assert client.post(f"/api/annonces/{offre}/panier", json={"quantite": 1}, headers=entetes(client, "admin")).status_code == 403

    panier = client.get("/api/annonces/panier", headers=ha).json()
    assert len(panier["lignes"]) == 1  # même article, même prix : quantités cumulées
    ligne = panier["lignes"][0]
    assert ligne["quantite"] == 3 and ligne["prix_unitaire"] == 15000 and ligne["montant"] == 45000
    assert panier["total_montant"] == 45000 and panier["peut_payer"] is True
    # Le prix est figé : une hausse de prix ne change pas le panier
    client.put(f"/api/annonces/{offre}", json={**OFFRE, "prix": 20000}, headers=hv)
    assert client.get("/api/annonces/panier", headers=ha).json()["total_montant"] == 45000
    # Un autre membre ne touche pas aux lignes de l'acheteur (F-S3-43)
    assert client.delete(f"/api/annonces/panier/{ligne['id']}", headers=entetes(client, "autre")).status_code == 403
    # Le gestionnaire voit les paniers de tous, sans pouvoir payer (F-S3-44)
    gestion = client.get("/api/annonces/panier", headers=entetes(client, "admin")).json()
    assert gestion["lignes"][0]["membre"]["pseudonyme"] == "acheteur" and gestion["peut_payer"] is False
    # Stock réduit par le vendeur : paiement bloqué (ADR-0007 S3a)
    client.put(f"/api/annonces/{offre}", json={**OFFRE, "prix": 20000, "quantite": 2}, headers=hv)
    panier = client.get("/api/annonces/panier", headers=ha).json()
    assert panier["peut_payer"] is False and panier["lignes"][0]["stock_insuffisant"] is True
    r = client.post("/api/paiements", json={"type_objet": 2, "mode": 1}, headers=ha)
    assert r.status_code == 400 and "stock" in r.json()["message"]
    # Correction de la quantité puis retrait de la ligne
    assert client.put(f"/api/annonces/panier/{ligne['id']}", json={"quantite": 2}, headers=ha).status_code == 200
    assert client.get("/api/annonces/panier", headers=ha).json()["peut_payer"] is True
    assert client.delete(f"/api/annonces/panier/{ligne['id']}", headers=ha).status_code == 200
    assert client.get("/api/annonces/panier", headers=ha).json()["lignes"] == []


def test_paiement_decremente_puis_rejet_restitue(client):
    creer_membre("vendeur")
    creer_membre("acheteur")
    creer_membre("caisse", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    hv, ha = entetes(client, "vendeur"), entetes(client, "acheteur")
    offre = client.post("/api/annonces", json=OFFRE, headers=hv).json()["id"]
    client.post(f"/api/annonces/{offre}/panier", json={"quantite": 2}, headers=ha)

    prep = client.get("/api/paiements/preparer?type_objet=2", headers=ha).json()
    assert prep["montant"] == 30000 and prep["retour"] == "/annonces/panier" and "2 articles" in prep["libelle"]
    r = client.post("/api/paiements", json={"type_objet": 2, "mode": 3, "remarque": "061234567 TX998877"}, headers=ha)
    assert r.status_code == 201, r.text
    paiement_id = r.json()["id"]
    assert client.get(f"/api/annonces/{offre}", headers=hv).json()["quantite"] == 1  # stock réservé
    panier = client.get("/api/annonces/panier", headers=ha).json()
    assert panier["lignes"] == [] and panier["achats"][0]["etat_paiement"] == 2 and panier["achats"][0]["montant"] == 30000
    # Plus rien à payer : le formulaire n'est plus proposé (F-PAY-09)
    assert client.get("/api/paiements/preparer?type_objet=2", headers=ha).status_code == 400
    # Rejet par la caisse : stock restitué, lignes remises dans le panier (ADR-0007 S3b)
    assert client.post(f"/api/paiements/{paiement_id}/rejeter", headers=entetes(client, "caisse")).status_code == 200
    assert client.get(f"/api/annonces/{offre}", headers=hv).json()["quantite"] == 3
    panier = client.get("/api/annonces/panier", headers=ha).json()
    assert panier["total_quantite"] == 2 and panier["peut_payer"] is True
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1


def test_interessement_sur_recherche_seulement(client):
    creer_membre("vendeur")
    creer_membre("fournisseur")
    hv, hf = entetes(client, "vendeur"), entetes(client, "fournisseur")
    offre = client.post("/api/annonces", json=OFFRE, headers=hv).json()["id"]
    recherche = client.post("/api/annonces", json=RECHERCHE, headers=hv).json()["id"]
    assert client.post(f"/api/annonces/{offre}/interet", json={"message": "Je prends !"}, headers=hf).status_code == 400
    r = client.post(f"/api/annonces/{recherche}/interet", json={"message": "abc"}, headers=hf)
    assert r.json()["message"] == "Intéressement doit avoir 5 caractères minimum."
    r = client.post(f"/api/annonces/{recherche}/interet", json={"message": "J'en fabrique, passez à l'atelier."}, headers=hf)
    assert r.status_code == 201 and r.json()["message"] == "Votre intéressement est pris en compte."
    r = client.post(f"/api/annonces/{recherche}/interet", json={"message": "Une seconde fois"}, headers=hf)
    assert r.status_code == 400
    detail = client.get(f"/api/annonces/{recherche}", headers=hv).json()
    assert len(detail["interets"]) == 1 and detail["interets"][0]["membre"]["pseudonyme"] == "fournisseur"
    public = client.get(f"/api/annonces/{recherche}").json()
    assert public["interets"] is None and public["peut_manifester"] is True and public["peut_acheter"] is False
