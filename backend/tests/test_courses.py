from datetime import date, datetime, timedelta

from conftest import creer_membre, entetes

from app.enums import BanqueBoutique, CategorieMembre, TypeMembre

DEMAIN = date.today() + timedelta(days=1)
APRES_DEMAIN = DEMAIN + timedelta(days=1)


def course(**kw) -> dict:
    base = {
        "lieu_achat": "Marché Total, Bacongo", "date_achat": DEMAIN.isoformat(),
        "date_livraison": datetime.combine(APRES_DEMAIN, datetime.min.time()).replace(hour=11, minute=5).isoformat(),
        "lieu_livraison": "Rue Mbemba 12, Moungali — 06 123 45 67",
        "lignes": [
            {"nom_article": "Sac de riz 25 kg", "prix_plafond": 18000, "quantite": 1},
            {"nom_article": "Huile 5 L", "prix_plafond": 6500, "quantite": 2, "observation": "Marque locale"},
            {},
        ],
    }
    base.update(kw)
    return base


def boutique(identifiant="boutique") -> int:
    return creer_membre(identifiant, nom="Épicerie du Plateau", categorie=CategorieMembre.MORALE,
                        type_partenaire=BanqueBoutique.BOUTIQUE, adresse="Avenue de la Paix, Plateau des 15 ans")


def test_regles_de_validation(client):
    creer_membre("client")
    h = entetes(client, "client")
    r = client.post("/api/courses/verifier", json={"lignes": []}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["lieu_achat"] == "Veuillez indiquer le lieu des achats avec 10 caractères minimum."
    assert champs["date_achat"] == "Veuillez indiquer la date des achats."
    assert champs["date_livraison"] == "Veuillez indiquer la date de livraison ainsi que l'heure."
    assert champs["lieu_livraison"] == "Veuillez indiquer le numéro de téléphone et le lieu de livraison."
    assert champs["lignes"] == "Veuillez indiquer le montant des achats."

    hier = (date.today() - timedelta(days=1)).isoformat()
    r = client.post("/api/courses/verifier", json=course(date_achat=hier), headers=h)
    assert r.json()["champs"]["date_achat"] == "La date des courses ne peut être antérieure à la date du jour."
    r = client.post("/api/courses/verifier", json=course(date_livraison=f"{APRES_DEMAIN}T20:00"), headers=h)
    assert r.json()["champs"]["date_livraison"] == "Les livraisons se font entre 10 h 00 et 18 h 59."
    r = client.post("/api/courses/verifier", json=course(date_achat=APRES_DEMAIN.isoformat(),
                                                        date_livraison=f"{DEMAIN}T12:00"), headers=h)
    assert r.json()["champs"]["date_livraison"] == "La date de livraison ne peut être antérieure à la date des courses."
    r = client.post("/api/courses/verifier", json=course(lignes=[{"nom_article": "Pain", "quantite": 2}]), headers=h)
    assert "ligne_1" in r.json()["champs"]  # ligne incomplète signalée (et bloquante)
    r = client.post("/api/courses/verifier", json=course(lignes=[{"nom_article": "Pain", "prix_plafond": 500, "quantite": 2}]), headers=h)
    assert r.json()["champs"]["lignes"] == "Le montant des courses ne doit pas être inférieur à 5 000 FCFA."
    # La date du jour est acceptée (correctif : le legacy la refusait)
    r = client.post("/api/courses/verifier", json=course(date_achat=date.today().isoformat()), headers=h)
    assert r.status_code == 200, r.text


def test_verification_puis_enregistrement(client):
    creer_membre("client")
    h = entetes(client, "client")
    recap = client.post("/api/courses/verifier", json=course(), headers=h).json()
    assert recap["montant_achats"] == 31000 and recap["frais_service"] == 4000 and recap["net_a_payer"] == 35000
    assert recap["nombre_articles"] == 3 and len(recap["lignes"]) == 2
    r = client.post("/api/courses", json=course(), headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("CRS") and r.json()["message"] == "Votre course est bien enregistrée."
    id_ = r.json()["id"]
    assert client.post("/api/courses", json=course(), headers=h).json()["message"] == "Cette course est déjà faite."
    d = client.get(f"/api/courses/{id_}", headers=h).json()
    assert d["etat_course"] == 1 and d["paye"] == 2 and d["frais_service"] == 4000 and d["net_a_payer"] == 35000
    assert d["date_livraison"].startswith(f"{APRES_DEMAIN}T11:05")  # minutes sur 2 chiffres, vrai datetime
    assert d["peut_modifier"] and d["peut_annuler"] and d["peut_payer"] and not d["peut_gerer"]
    assert d["contact_client"] is None
    # Modification : les lignes sont réellement remplacées (F-S3-63)
    lignes = [{"nom_article": "Sac de riz 50 kg", "prix_plafond": 30000, "quantite": 1}]
    assert client.put(f"/api/courses/{id_}", json=course(lignes=lignes), headers=h).status_code == 200
    d = client.get(f"/api/courses/{id_}", headers=h).json()
    assert [li["nom_article"] for li in d["lignes"]] == ["Sac de riz 50 kg"] and d["montant_achats"] == 30000


def test_visibilite_et_filtres(client):
    creer_membre("client")
    creer_membre("voisin")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "client")
    id_ = client.post("/api/courses", json=course(), headers=h).json()["id"]
    client.post("/api/courses", json=course(lieu_achat="Supermarché Park'n'Shop, centre-ville"), headers=h)
    assert client.get("/api/courses").status_code == 401
    assert client.get("/api/courses", headers=entetes(client, "voisin")).json()["total"] == 0
    assert client.get(f"/api/courses/{id_}", headers=entetes(client, "voisin")).status_code == 404
    admin = entetes(client, "admin")
    assert client.get("/api/courses", headers=admin).json()["total"] == 2
    assert client.get(f"/api/courses/{id_}", headers=admin).json()["contact_client"]["pseudonyme"] == "client"
    # Filtres corrigés : chaque borne seule, jour inclus, livraison et « Livrée » filtrables
    aujourd_hui = date.today().isoformat()
    assert client.get(f"/api/courses?commande_min={aujourd_hui}&commande_max={aujourd_hui}", headers=h).json()["total"] == 2
    assert client.get(f"/api/courses?achat_min={APRES_DEMAIN}", headers=h).json()["total"] == 0
    assert client.get(f"/api/courses?livraison_max={APRES_DEMAIN}", headers=h).json()["total"] == 2
    assert client.get(f"/api/courses?livraison_min={APRES_DEMAIN + timedelta(days=1)}", headers=h).json()["total"] == 0
    assert client.get("/api/courses?q=park", headers=h).json()["total"] == 1
    client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 4}, headers=admin)
    assert client.get("/api/courses?etat_course=4", headers=h).json()["total"] == 1


def test_etats_de_course(client):
    creer_membre("client")
    boutique()
    hc, hb = entetes(client, "client"), entetes(client, "boutique")
    id_ = client.post("/api/courses", json=course(boutique_id=None), headers=hc).json()["id"]
    # Le client ne peut qu'annuler
    assert client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 3}, headers=hc).status_code == 403
    # Une boutique non concernée ne voit pas la course
    assert client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 3}, headers=hb).status_code == 404
    r = client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 2}, headers=hc)
    assert r.status_code == 200 and r.json()["message"] == "Votre course est annulée."
    d = client.get(f"/api/courses/{id_}", headers=hc).json()
    assert d["etat_course"] == 2 and not d["peut_modifier"] and not d["peut_payer"]
    # Plus en attente : plus modifiable (F-S3-65)
    assert client.put(f"/api/courses/{id_}", json=course(), headers=hc).status_code == 400
    # Suppression de la fiche : gestionnaire habilité seulement
    assert client.delete(f"/api/courses/{id_}", headers=hc).status_code == 403


def test_boutique_catalogue_et_commande(client):
    creer_membre("client")
    id_boutique = boutique()
    creer_membre("particulier")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    hc, hb = entetes(client, "client"), entetes(client, "boutique")
    # Catalogue réservé aux boutiques (et aux gestionnaires habilités, pour une boutique)
    article = {"code": "RIZ25", "nom": "Riz parfumé 25 kg", "marque": "Mama", "prix": 17500, "disponible": 1}
    assert client.post("/api/courses/catalogue", json=article, headers=entetes(client, "particulier")).status_code == 403
    r = client.post("/api/courses/catalogue", json={"nom": "Ri"}, headers=hb)
    assert r.json()["champs"] == {"nom": "Le nom de l'article doit avoir 3 caractères minimum.",
                                  "prix": "Veuillez indiquer le prix de vente."}
    riz = client.post("/api/courses/catalogue", json=article, headers=hb).json()["id"]
    assert client.post("/api/courses/catalogue", json=article, headers=hb).json()["message"] == "Cet article est déjà enregistré."
    r = client.post("/api/courses/catalogue", json={**article, "nom": "Savon"}, headers=entetes(client, "admin"))
    assert r.json()["champs"]["boutique_id"] == "Veuillez indiquer la boutique."
    savon = client.post("/api/courses/catalogue", json={**article, "nom": "Savon", "prix": 500, "disponible": 2,
                                                        "boutique_id": id_boutique}, headers=entetes(client, "admin")).json()["id"]
    assert client.get("/api/courses/catalogue?disponible=1").json()["total"] == 1
    assert client.get("/api/courses/catalogue?prix_min=1000").json()["total"] == 1  # une seule borne suffit
    assert client.get("/api/courses/catalogue?q=mama").json()["total"] == 2
    assert client.get("/api/courses/boutiques").json()[0]["nombre_articles"] == 1

    # Commande mixte : article du catalogue (prix du catalogue) + saisie libre ; lieu d'achat déduit
    lignes = [{"article_catalogue_id": riz, "quantite": 2, "prix_plafond": 1},
              {"article_catalogue_id": savon, "quantite": 0},
              {"nom_article": "Tomates fraîches", "prix_plafond": 2000, "quantite": 1}]
    r = client.post("/api/courses", json=course(boutique_id=id_boutique, lieu_achat="", lignes=lignes), headers=hc)
    assert r.status_code == 201, r.text
    id_ = r.json()["id"]
    d = client.get(f"/api/courses/{id_}", headers=hc).json()
    assert d["montant_achats"] == 37000 and d["lieu_achat"].startswith("Épicerie du Plateau")
    assert d["boutique"]["id"] == id_boutique and d["lignes"][0]["article_catalogue_id"] == riz
    # Article indisponible refusé
    r = client.post("/api/courses/verifier", json=course(boutique_id=id_boutique, lignes=[{"article_catalogue_id": savon, "quantite": 1}]), headers=hc)
    assert "ligne_1" in r.json()["champs"]
    # La boutique est prévenue, voit la commande et les coordonnées du client, et la fait avancer
    assert client.get("/api/espace/compteurs", headers=hb).json()["messages_non_lus"] == 1
    assert client.get("/api/courses?role=boutique", headers=hb).json()["total"] == 1
    vue = client.get(f"/api/courses/{id_}", headers=hb).json()
    assert vue["peut_gerer"] and not vue["peut_modifier"] and vue["contact_client"]["pseudonyme"] == "client"
    assert client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 3}, headers=hb).status_code == 200
    assert client.get("/api/espace/compteurs", headers=hc).json()["messages_non_lus"] == 1


def test_paiement_de_la_course(client):
    creer_membre("client")
    creer_membre("autre")
    creer_membre("caisse", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    h = entetes(client, "client")
    id_ = client.post("/api/courses", json=course(), headers=h).json()["id"]
    assert client.get(f"/api/paiements/preparer?type_objet=4&objet_id={id_}", headers=entetes(client, "autre")).status_code == 403
    prep = client.get(f"/api/paiements/preparer?type_objet=4&objet_id={id_}", headers=h).json()
    assert prep["montant"] == 35000 and prep["retour"] == f"/courses/{id_}"  # achats + frais
    r = client.post("/api/paiements", json={"type_objet": 4, "objet_id": id_, "mode": 1}, headers=h)
    assert r.status_code == 201, r.text
    paiement_id = r.json()["id"]
    d = client.get(f"/api/courses/{id_}", headers=h).json()
    assert d["paye"] == 1 and d["mode_paiement"] == 1 and d["paiement"]["etat"] == 2
    assert not d["peut_payer"] and not d["peut_modifier"] and not d["peut_annuler"]
    r = client.post("/api/paiements", json={"type_objet": 4, "objet_id": id_, "mode": 1}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette course est déjà payée."
    assert client.post(f"/api/courses/{id_}/etat-course", json={"etat_course": 2}, headers=h).status_code == 400
    # Rejet par la caisse : la course est de nouveau à payer
    assert client.post(f"/api/paiements/{paiement_id}/rejeter", headers=entetes(client, "caisse")).status_code == 200
    d = client.get(f"/api/courses/{id_}", headers=h).json()
    assert d["paye"] == 2 and d["peut_payer"] and d["paiement"] is None
