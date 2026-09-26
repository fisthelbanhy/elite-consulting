"""Appels de fonds et engagements d'apport (F-S4-05 à F-S4-26, ADR-0004, ADR-0007 S4a)."""

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre

PROJET = {
    "secteur_id": 1, "ville_id": 2, "nom_projet": "Boulangerie de Bacongo", "objet_projet": "Achat d'un four à pain",
    "description_activite": "Boulangerie artisanale ouverte depuis 2019 à Bacongo, 4 employés.",
    "description_projet": "Remplacer le vieux four pour doubler la production quotidienne de pain.",
    "devis_projet": 2_000_000, "apport_fond_propre": 500_000, "besoin_financement": 1_500_000,
    "niveau_realisation": 30, "nom_promoteur": "Mabiala Grâce", "telephone_promoteur": "06 123 45 67",
    "email_promoteur": "grace@example.com", "adresse_promoteur": "59 rue Bétou - Moungali - Brazzaville",
}


def _projet(client, h, **kw) -> int:
    r = client.post("/api/projets", json={**PROJET, **kw}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_regles_de_creation_toutes_bloquantes(client):
    creer_membre("porteur")
    h = entetes(client, "porteur")
    mauvais = {
        **PROJET, "nom_projet": "Court", "objet_projet": "Four", "secteur_id": None, "ville_id": None,
        "description_activite": "Trop court", "description_projet": "Trop court", "devis_projet": 10_000,
        "besoin_financement": 5_000, "nom_promoteur": "Awa", "telephone_promoteur": "0712",
    }
    r = client.post("/api/projets", json=mauvais, headers=h)
    assert r.status_code == 400
    # Correctif F-S4-11 : un téléphone invalide n'efface plus les autres erreurs (et inversement)
    assert {"nom_projet", "objet_projet", "secteur_id", "ville_id", "description_activite", "description_projet",
            "devis_projet", "besoin_financement", "nom_promoteur", "telephone_promoteur"} <= set(r.json()["champs"])
    assert r.json()["champs"]["nom_projet"] == "Le nom du projet doit avoir plus de 10 caractères."

    # Cohérence du plan de financement (F-S4-13)
    r = client.post("/api/projets", json={**PROJET, "besoin_financement": 1_600_000}, headers=h)
    assert r.status_code == 400 and "différence" in r.json()["champs"]["besoin_financement"]
    r = client.post("/api/projets", json={**PROJET, "apport_fond_propre": 2_500_000}, headers=h)
    assert r.status_code == 400 and "inférieur" in r.json()["champs"]["devis_projet"]

    r = client.post("/api/projets", json=PROJET, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("ALF")
    # Nom unique, insensible à la casse (F-S4-14)
    r = client.post("/api/projets", json={**PROJET, "nom_projet": PROJET["nom_projet"].upper()}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce projet est déjà enregistré."


def test_projet_publie_promoteur_prive_et_visites(client):
    creer_membre("porteur")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "porteur")
    id_ = _projet(client, h)

    moi = client.get(f"/api/projets/{id_}", headers=h).json()
    # F-S4-15 : publié immédiatement, totaux à 0, e-mail et adresse dans les bons champs
    assert moi["etat"] == 2 and moi["montant_promis"] == 0 and moi["montant_collecte"] == 0
    assert moi["email_promoteur"] == "grace@example.com" and moi["adresse_promoteur"].startswith("59 rue")
    assert moi["telephone_promoteur"] == "061234567" and moi["peut_modifier"] is True
    assert moi["reste_a_collecter"] == 1_500_000 and moi["apports"] == []

    public = client.get(f"/api/projets/{id_}").json()
    assert public["nom_promoteur"] is None and public["telephone_promoteur"] is None and public["apports"] is None
    autre = client.get(f"/api/projets/{id_}", headers=entetes(client, "curieux")).json()
    assert autre["peut_apporter"] is True and autre["peut_modifier"] is False and autre["email_promoteur"] is None
    admin = client.get(f"/api/projets/{id_}", headers=entetes(client, "admin")).json()
    assert admin["nom_promoteur"] == "Mabiala Grâce" and admin["peut_moderer"] is True

    # F-S4-20 : visites comptées pour les tiers seulement
    assert client.get(f"/api/projets/{id_}", headers=h).json()["nombre_visites"] == 2
    liste = client.get("/api/projets").json()
    assert liste["total"] == 1 and liste["items"][0]["nom_promoteur"] is None
    assert client.get("/api/projets", headers=h).json()["items"][0]["nom_promoteur"] == "Mabiala Grâce"


def test_filtres_de_la_liste(client):
    creer_membre("porteur")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "porteur")
    id1 = _projet(client, h)
    _projet(client, h, nom_projet="Élevage de poulets à Kintélé", devis_projet=300_000, apport_fond_propre=0,
            besoin_financement=200_000, niveau_realisation=0, description_projet="Poulailler de 500 sujets pour la vente.")
    assert client.get("/api/projets?devis_min=1000000").json()["total"] == 1
    assert client.get("/api/projets?besoin_min=250000").json()["total"] == 1
    assert client.get("/api/projets?realisation_min=20").json()["total"] == 1
    assert client.get("/api/projets?q=poulailler").json()["total"] == 1
    assert client.get("/api/projets?secteur_id=1").json()["total"] == 2
    client.post(f"/api/projets/{id1}/etat", json={"etat": 1}, headers=entetes(client, "admin"))
    assert client.get("/api/projets").json()["total"] == 1  # le public ne voit plus le projet non publié
    assert client.get("/api/projets", headers=h).json()["total"] == 2  # le porteur le voit toujours
    assert client.get("/api/projets/compteurs").json()["projets"] == 1


def test_entreprise_du_membre_seulement(client):
    porteur = creer_membre("porteur")
    autre = creer_membre("autre")
    with SessionLocal() as db:
        db.add_all([m.Entreprise(id=1, membre_id=porteur, nom="Pains du Congo", etat=2),
                    m.Entreprise(id=2, membre_id=autre, nom="Autre SARL", etat=2)])
        db.commit()
    h = entetes(client, "porteur")
    assert [e["nom"] for e in client.get("/api/projets/mes-entreprises", headers=h).json()] == ["Pains du Congo"]
    r = client.post("/api/projets", json={**PROJET, "entreprise_id": 2}, headers=h)
    assert r.status_code == 400 and "entreprise_id" in r.json()["champs"]
    assert client.post("/api/projets", json={**PROJET, "entreprise_id": 1}, headers=h).status_code == 201


def test_modification_evaluation_et_moderation_reservees(client):
    creer_membre("porteur")
    creer_membre("autre")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    id_ = _projet(client, entetes(client, "porteur"))
    ha = entetes(client, "autre")
    assert client.put(f"/api/projets/{id_}", json=PROJET, headers=ha).status_code == 403
    assert client.post(f"/api/projets/{id_}/evaluation", json={"appreciation": 8}, headers=ha).status_code == 403
    hg = entetes(client, "admin_sans_droit")
    assert client.post(f"/api/projets/{id_}/etat", json={"etat": 3}, headers=hg).status_code == 403
    # L'appréciation /10 est saisie par un gestionnaire et visible de tous (F-S4-19)
    r = client.post(f"/api/projets/{id_}/evaluation",
                    json={"observation_gestionnaire": "Dossier solide.", "appreciation": 8}, headers=hg)
    assert r.status_code == 200
    assert client.post(f"/api/projets/{id_}/evaluation", json={"appreciation": 11}, headers=hg).status_code == 422
    public = client.get(f"/api/projets/{id_}").json()
    assert public["appreciation"] == 8 and public["observation_gestionnaire"] == "Dossier solide."
    # Le porteur modifie son projet
    r = client.put(f"/api/projets/{id_}", json={**PROJET, "niveau_realisation": 50}, headers=entetes(client, "porteur"))
    assert r.status_code == 200
    assert client.get(f"/api/projets/{id_}").json()["niveau_realisation"] == 50


def test_promesse_apport_comptee_immediatement(client):
    creer_membre("porteur")
    creer_membre("bailleur", pseudonyme="tonton")
    hp = entetes(client, "porteur")
    id_ = _projet(client, hp)
    hb = entetes(client, "bailleur")
    # F-S4-24 : pas d'apport sur son propre projet
    assert client.post(f"/api/projets/{id_}/apports", json={"type_apport": 1, "montant_promis": 1000}, headers=hp).status_code == 400
    r = client.post(f"/api/projets/{id_}/apports", json={"type_apport": None, "montant_promis": 0}, headers=hb)
    assert r.status_code == 400 and {"type_apport", "montant_promis"} <= set(r.json()["champs"])
    r = client.post(f"/api/projets/{id_}/apports", json={"type_apport": 2, "montant_promis": 1_600_000}, headers=hb)
    assert r.json()["champs"]["montant_promis"] == "Le montant de l'apport ne peut être supérieur au besoin de fonds."

    apport = {"type_apport": 2, "montant_promis": 300_000, "echeance_mois": 6, "remarque": "Remboursable en 6 mois"}
    r = client.post(f"/api/projets/{id_}/apports", json=apport, headers=hb)
    assert r.status_code == 201 and r.json()["reference"].startswith("ATF")
    # F-S4-22 : doublon (même projet, membre, jour, montant)
    r = client.post(f"/api/projets/{id_}/apports", json=apport, headers=hb)
    assert r.status_code == 400 and r.json()["message"] == "Cette fiche est déjà enregistrée."

    projet = client.get(f"/api/projets/{id_}", headers=hp).json()
    assert projet["montant_promis"] == 300_000 and projet["nombre_apports"] == 1  # ADR-0007 S4a
    assert projet["apports"][0]["creancier"]["pseudonyme"] == "tonton" and projet["apports"][0]["etat"] == 1
    vu_bailleur = client.get(f"/api/projets/{id_}", headers=hb).json()
    assert vu_bailleur["apports"] is None and len(vu_bailleur["mes_apports"]) == 1
    mes = client.get("/api/projets/apports", headers=hb).json()
    assert mes["total"] == 1 and mes["total_promis"] == 300_000 and mes["items"][0]["creancier"] is None
    # Le porteur est prévenu par la messagerie
    assert client.get("/api/espace/compteurs", headers=hp).json()["messages_non_lus"] == 1


def test_versements_et_annulation_tardive(client):
    creer_membre("porteur")
    creer_membre("bailleur")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    id_ = _projet(client, entetes(client, "porteur"))
    hb = entetes(client, "bailleur")
    apport = client.post(f"/api/projets/{id_}/apports", json={"type_apport": 1, "montant_promis": 100_000}, headers=hb).json()["id"]
    hg = entetes(client, "admin")

    assert client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 10}, headers=hb).status_code == 403
    assert client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 10},
                       headers=entetes(client, "admin_sans_droit")).status_code == 403
    r = client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 150_000}, headers=hg)
    assert r.status_code == 400 and r.json()["message"] == "Le versement est supérieur au montant promis."
    assert client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 40_000}, headers=hg).status_code == 201
    # Doublon de saisie refusé
    assert client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 40_000}, headers=hg).status_code == 400

    fiche = client.get(f"/api/projets/apports/{apport}", headers=hb).json()
    assert fiche["montant_verse"] == 40_000 and fiche["reste_a_verser"] == 60_000 and fiche["etat"] == 2
    assert len(fiche["versements"]) == 1 and fiche["peut_declarer"] is True
    projet = client.get(f"/api/projets/{id_}").json()
    assert projet["montant_promis"] == 100_000 and projet["montant_collecte"] == 40_000

    # ADR-0004 : l'annulation tardive ne retire que la part non versée ; promis ≥ collecté
    assert client.post(f"/api/projets/apports/{apport}/annuler", headers=hg).status_code == 200
    projet = client.get(f"/api/projets/{id_}").json()
    assert projet["montant_promis"] == 40_000 and projet["montant_collecte"] == 40_000
    assert client.post(f"/api/projets/apports/{apport}/versements", json={"montant": 1_000}, headers=hg).status_code == 400
    assert client.post(f"/api/projets/apports/{apport}/annuler", headers=hg).status_code == 400


def test_versement_declare_par_le_creancier_via_paiement(client):
    creer_membre("porteur")
    creer_membre("bailleur")
    creer_membre("intrus")
    creer_membre("caisse", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    id_ = _projet(client, entetes(client, "porteur"))
    hb = entetes(client, "bailleur")
    apport = client.post(f"/api/projets/{id_}/apports", json={"type_apport": 3, "montant_promis": 50_000}, headers=hb).json()["id"]

    prep = client.get(f"/api/paiements/preparer?type_objet=8&objet_id={apport}", headers=hb).json()
    assert prep["montant"] is None and prep["retour"] == f"/projets/apports/{apport}"
    corps = {"type_objet": 8, "objet_id": apport, "mode": 3, "remarque": "MP240101.1234"}
    assert client.post("/api/paiements", json={**corps, "montant": 1000}, headers=entetes(client, "intrus")).status_code == 403
    r = client.post("/api/paiements", json={**corps, "montant": 60_000}, headers=hb)
    assert r.status_code == 400 and r.json()["message"] == "Le versement est supérieur au montant promis."
    paiement = client.post("/api/paiements", json={**corps, "montant": 30_000}, headers=hb).json()["id"]
    # En attente : pas encore collecté, mais le reste déclarable diminue
    fiche = client.get(f"/api/projets/apports/{apport}", headers=hb).json()
    assert fiche["en_attente"] == 30_000 and fiche["montant_verse"] == 0
    r = client.post("/api/paiements", json={**corps, "montant": 25_000, "remarque": "MP240101.9999"}, headers=hb)
    assert r.status_code == 400
    assert client.get(f"/api/projets/{id_}").json()["montant_collecte"] == 0

    # Confirmation par la caisse → versement créé et compté
    assert client.post(f"/api/paiements/{paiement}/confirmer", headers=entetes(client, "caisse")).status_code == 200
    fiche = client.get(f"/api/projets/apports/{apport}", headers=hb).json()
    assert fiche["montant_verse"] == 30_000 and fiche["en_attente"] == 0 and len(fiche["versements"]) == 1
    assert client.get(f"/api/projets/{id_}").json()["montant_collecte"] == 30_000
