from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import Etat, TypeMembre
from app.services.boutique import MESSAGE_STOCK


def _catalogue():
    with SessionLocal() as db:
        db.add_all([
            m.Produit(id=1, reference="015", nom="Aloe Vera Gel", description="Pulpe d'aloès à boire", groupe=1,
                      prix_distributeur=10_000, prix_non_distributeur=12_000, prix_public=15_000, quantite_stock=5,
                      photo="produits/legacy-pdt1.jpg"),
            m.Produit(id=2, reference="027", nom="Forever Bee Pollen", groupe=100, prix_distributeur=6_500,
                      prix_public=9_000, quantite_stock=1),
            m.Produit(id=3, reference="051", nom="Produit retiré", groupe=1, prix_distributeur=1_000, prix_public=2_000,
                      quantite_stock=10, etat=Etat.SUPPRIME),
            m.Produit(id=4, reference="061", nom="Gelée aloès", groupe=13, prix_distributeur=0, prix_public=0, quantite_stock=3),
        ])
        db.commit()


def _distributeur(identifiant: str) -> int:
    mid = creer_membre(identifiant)
    with SessionLocal() as db:
        db.add(m.Souscription(membre_id=mid, reference="SOA0110126", etat=Etat.AUTORISE, etape_courante=8))
        db.commit()
    return mid


def test_catalogue_public_prix_selon_le_statut(client):
    _catalogue()
    _distributeur("distri")
    public = client.get("/api/boutique/produits").json()
    assert public["total"] == 3  # le produit retiré n'est pas proposé
    assert public["distributeur"] is False
    gel = next(p for p in public["items"] if p["id"] == 1)
    assert gel["prix"] == 15_000 and gel["prix_distributeur"] == 10_000
    assert gel["photo_url"] == "/media/produits/legacy-pdt1.jpg"
    # produits vendables d'abord (prix connu)
    assert public["items"][-1]["id"] == 4

    distri = client.get("/api/boutique/produits", headers=entetes(client, "distri")).json()
    assert distri["distributeur"] is True
    assert next(p for p in distri["items"] if p["id"] == 1)["prix"] == 10_000

    assert client.get("/api/boutique/produits?q=pollen").json()["total"] == 1
    assert client.get("/api/boutique/produits?groupe=1").json()["total"] == 1
    # groupe 0 = produits rangés hors des 20 groupes FLP
    assert [p["id"] for p in client.get("/api/boutique/produits?groupe=0").json()["items"]] == [2]


def test_groupes_et_populaires(client):
    _catalogue()
    groupes = client.get("/api/boutique/groupes").json()
    assert len(groupes) == 21  # 20 groupes FLP + « Autres produits »
    assert next(g for g in groupes if g["groupe"] == 1)["nombre"] == 1
    assert groupes[-1] == {"groupe": 0, "libelle": "Autres produits Forever", "nombre": 1}
    client.get("/api/boutique/produits/2")
    populaires = client.get("/api/boutique/produits/populaires").json()
    assert populaires[0]["id"] == 2 and len(populaires) == 3


def test_fiche_produit_compteur_et_produit_retire(client):
    _catalogue()
    client.get("/api/boutique/produits/1")
    fiche = client.get("/api/boutique/produits/1").json()
    assert fiche["nombre_visites"] == 2 and fiche["prix_non_distributeur"] == 12_000
    assert fiche["prix"] == 15_000 and fiche["distributeur"] is False
    assert client.get("/api/boutique/produits/3").status_code == 404


def test_panier_prix_fige_regroupement_et_produit_sans_prix(client):
    _catalogue()
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 2}]}).status_code == 401
    r = client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 2}, {"produit_id": 2, "quantite": 0}]}, headers=h)
    assert r.status_code == 201, r.text
    client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 1}]}, headers=h)
    # Le prix change après l'ajout : le panier garde le prix figé
    with SessionLocal() as db:
        db.get(m.Produit, 1).prix_public = 20_000
        db.commit()
    panier = client.get("/api/panier", headers=h).json()
    assert len(panier["lignes"]) == 1
    ligne = panier["lignes"][0]
    assert ligne["quantite"] == 3 and ligne["prix_unitaire"] == 15_000 and ligne["montant"] == 45_000
    assert panier["total"] == 45_000 and panier["payable"] is True
    assert client.get("/api/espace/compteurs", headers=h).json()["panier"] == 3
    # Produit sans prix ou retiré
    assert client.post("/api/panier", json={"lignes": [{"produit_id": 4, "quantite": 1}]}, headers=h).status_code == 400
    assert client.post("/api/panier", json={"lignes": [{"produit_id": 3, "quantite": 1}]}, headers=h).status_code == 400
    assert client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 0}]}, headers=h).status_code == 400


def test_ligne_modifiable_et_supprimable_par_son_seul_proprietaire(client):
    _catalogue()
    creer_membre("awa")
    creer_membre("intrus")
    h = entetes(client, "awa")
    client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 2}]}, headers=h)
    ligne = client.get("/api/panier", headers=h).json()["lignes"][0]["id"]
    hi = entetes(client, "intrus")
    assert client.delete(f"/api/panier/{ligne}", headers=hi).status_code == 403
    assert client.put(f"/api/panier/{ligne}", json={"quantite": 9}, headers=hi).status_code == 403
    assert client.put(f"/api/panier/{ligne}", json={"quantite": 4}, headers=h).status_code == 200
    assert client.get("/api/panier", headers=h).json()["quantite_totale"] == 4
    assert client.delete(f"/api/panier/{ligne}", headers=h).status_code == 200
    assert client.get("/api/panier", headers=h).json()["lignes"] == []


def test_stock_insuffisant_bloque_le_paiement(client):
    _catalogue()
    creer_membre("awa")
    h = entetes(client, "awa")
    client.post("/api/panier", json={"lignes": [{"produit_id": 2, "quantite": 1}]}, headers=h)
    client.post("/api/panier", json={"lignes": [{"produit_id": 2, "quantite": 1}]}, headers=h)
    panier = client.get("/api/panier", headers=h).json()
    assert panier["payable"] is False and panier["message"] == MESSAGE_STOCK
    assert all(li["bloquante"] for li in panier["lignes"])
    r = client.post("/api/paiements", json={"type_objet": 1, "mode": 1}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == MESSAGE_STOCK


def test_paiement_decremente_le_stock_et_le_rejet_le_restitue(client):
    _catalogue()
    creer_membre("awa")
    creer_membre("caisse", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    h = entetes(client, "awa")
    client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 2}]}, headers=h)
    prep = client.get("/api/paiements/preparer?type_objet=1", headers=h).json()
    assert prep["montant"] == 30_000 and prep["retour"] == "/panier" and "2 articles" in prep["libelle"]
    r = client.post("/api/paiements", json={"type_objet": 1, "mode": 3, "remarque": "066123456 TX889"}, headers=h)
    assert r.status_code == 201, r.text
    paiement = r.json()["id"]
    with SessionLocal() as db:
        assert db.get(m.Produit, 1).quantite_stock == 3
        ligne = db.query(m.LignePanier).one()
        assert ligne.paye and ligne.paiement_id == paiement and ligne.date_paiement is not None
    assert client.get("/api/panier", headers=h).json()["lignes"] == []
    # Panier vide : plus rien à payer
    assert client.post("/api/paiements", json={"type_objet": 1, "mode": 1}, headers=h).status_code == 400

    assert client.post(f"/api/paiements/{paiement}/rejeter", headers=entetes(client, "caisse")).status_code == 200
    with SessionLocal() as db:
        assert db.get(m.Produit, 1).quantite_stock == 5
        ligne = db.query(m.LignePanier).one()
        assert not ligne.paye and ligne.paiement_id is None
    assert client.get("/api/panier", headers=h).json()["total"] == 30_000


def test_suivi_des_paniers_reserve_aux_gestionnaires(client):
    _catalogue()
    creer_membre("awa", nom="Awa Mabiala", telephone="061234567")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 1}, {"produit_id": 2, "quantite": 1}]}, headers=h)
    client.post("/api/paiements", json={"type_objet": 1, "mode": 1}, headers=h)
    client.post("/api/panier", json={"lignes": [{"produit_id": 1, "quantite": 1}]}, headers=h)
    assert client.get("/api/panier/suivi", headers=h).status_code == 403
    ha = entetes(client, "admin")
    tout = client.get("/api/panier/suivi", headers=ha).json()
    assert tout["total"] == 3 and tout["somme"] == 15_000 + 9_000 + 15_000
    assert tout["items"][0]["membre"]["telephone"] == "061234567"
    assert client.get("/api/panier/suivi?etat_paiement=2", headers=ha).json()["total"] == 2
    assert client.get("/api/panier/suivi?etat_paiement=1", headers=ha).json()["total"] == 1
    assert client.get("/api/panier/suivi?q=pollen", headers=ha).json()["total"] == 1


def test_fiches_bien_etre_et_interrupteur(client):
    _catalogue()
    with SessionLocal() as db:
        db.add(m.Maladie(id=1, libelle="Fatigue passagère", description="Quelques repères."))
        db.add(m.Maladie(id=2, libelle="Fiche en attente", etat=Etat.NON_TRAITE))
        db.add_all([
            m.MaladieProduit(maladie_id=1, produit_id=1, posologie="Un verre le matin", ordre=1),
            m.MaladieProduit(maladie_id=1, produit_id=3, posologie="Retiré", ordre=2),
        ])
        db.commit()
    liste = client.get("/api/bien-etre").json()
    assert [f["libelle"] for f in liste] == ["Fatigue passagère"] and liste[0]["nombre_produits"] == 1
    fiche = client.get("/api/bien-etre/1").json()
    assert [p["produit"]["id"] for p in fiche["produits"]] == [1]
    assert fiche["produits"][0]["conseil_utilisation"] == "Un verre le matin"
    assert fiche["produits"][0]["produit"]["prix"] == 15_000
    assert client.get("/api/bien-etre/2").status_code == 404
    with SessionLocal() as db:
        db.get(m.Parametre, 1).module_sante_actif = False
        db.commit()
    r = client.get("/api/bien-etre")
    assert r.status_code == 404 and "bien-être" in r.json()["message"]
