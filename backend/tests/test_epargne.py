"""Épargne solidaire : dons / placements (paiement type 7) et carte de pointage (F-S4-45 à
F-S4-67, ADR-0004, ADR-0007 S4c/S4d, ADR-0009)."""

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre
from app.security import hacher_mot_de_passe

PIN = hacher_mot_de_passe("1234")


def _compteur_reference() -> int:
    with SessionLocal() as db:
        return db.get(m.Parametre, 1).compteur_reference


def _solde(id_: int) -> int:
    with SessionLocal() as db:
        return db.get(m.Membre, id_).solde_point_caisse


def test_module_desactivable(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.get("/api/epargne/statut").json()["actif"] is True
    with SessionLocal() as db:
        db.get(m.Parametre, 1).module_epargne_actif = False
        db.commit()
    statut = client.get("/api/epargne/statut").json()
    assert statut["actif"] is False and "désactivée" in statut["message"]
    for r in (client.get("/api/epargne/fonds", headers=h), client.get("/api/epargne/pointages", headers=h),
              client.post("/api/epargne/fonds", json={"type_fond": 1, "montant": 500}, headers=h)):
        assert r.status_code == 403 and "désactivée" in r.json()["message"]


def test_regles_don_et_placement(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/epargne/fonds", json={"montant": 500}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Veuillez indiquer le type de l'épargne : don ou placement."
    r = client.post("/api/epargne/fonds", json={"type_fond": 1, "montant": 99, "souscripteur_nom": "Jo"}, headers=h)
    assert r.json()["champs"] == {
        "montant": "Le montant ne doit pas être inférieur à 100 francs CFA.",
        "souscripteur_nom": "Veuillez indiquer le nom du souscripteur.",
    }
    # Minimum de placement enfin contrôlé (ADR-0007 S4c) et durée 12–120 mois
    r = client.post("/api/epargne/fonds", json={"type_fond": 2, "montant": 50_000, "duree_mois": 6}, headers=h)
    assert r.json()["champs"] == {
        "montant": "Le montant ne doit pas être inférieur à 100 000 francs CFA.",
        "duree_mois": "La durée du placement doit être comprise entre 12 et 120 mois.",
    }
    r = client.post("/api/epargne/fonds", json={"type_fond": 1, "montant": 5_000, "duree_mois": 24,
                                                 "motivation": "Soutien aux orphelins"}, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("FDS")
    fiche = client.get(f"/api/epargne/fonds/{r.json()['id']}", headers=h).json()
    assert fiche["duree_mois"] == 0 and fiche["confirme"] == 2 and fiche["mode_paiement"] == 0 and fiche["etat"] == 2
    assert fiche["souscripteur"]["id"] == fiche["rapporteur"]["id"] and fiche["peut_payer"] is True
    # Anti-doublon : même jour, même motivation, même montant (F-S4-51)
    r = client.post("/api/epargne/fonds", json={"type_fond": 1, "montant": 5_000, "motivation": "Soutien aux orphelins"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette épargne est déjà enregistrée."


def test_placement_pour_un_autre_membre_email_et_liste(client, monkeypatch):
    envois = []
    monkeypatch.setattr("app.services.emails.envoyer", lambda dest, sujet, texte, *a, **k: envois.append((dest, sujet, texte)))
    creer_membre("rapporteur", nom="Tonton Paul")
    creer_membre("filleule", pseudonyme="mireille", email="mireille@example.com", telephone="061234567")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "rapporteur")
    r = client.post("/api/epargne/fonds", json={"type_fond": 2, "montant": 100_000, "duree_mois": 12,
                                                 "souscripteur_membre": "inconnu"}, headers=h)
    assert r.status_code == 400 and "souscripteur_membre" in r.json()["champs"]
    r = client.post("/api/epargne/fonds", json={"type_fond": 2, "montant": 150_000, "duree_mois": 24,
                                                 "souscripteur_membre": "06 123 45 67"}, headers=h)
    assert r.status_code == 201
    id_ = r.json()["id"]
    # F-S4-53 : e-mail « Souscription placement » enfin envoyé + message interne
    assert len(envois) == 1 and envois[0][0] == "mireille@example.com" and envois[0][1] == "Souscription placement"
    assert "150 000 francs CFA" in envois[0][2] and "24 mois" in envois[0][2]
    hf = entetes(client, "filleule")
    assert client.get("/api/espace/compteurs", headers=hf).json()["messages_non_lus"] == 1

    # Le souscripteur, le rapporteur et le gestionnaire voient la fiche ; pas un tiers
    fiche = client.get(f"/api/epargne/fonds/{id_}", headers=hf).json()
    assert fiche["souscripteur_nom"] == "Awa Test" and fiche["rapporteur_nom"] == "Tonton Paul"
    assert client.get(f"/api/epargne/fonds/{id_}", headers=entetes(client, "curieux")).status_code == 403
    assert client.get("/api/epargne/fonds", headers=hf).json()["total"] == 1
    assert client.get("/api/epargne/fonds", headers=entetes(client, "curieux")).json()["total"] == 0
    ha = entetes(client, "admin")
    assert client.get("/api/epargne/fonds", headers=ha).json()["total"] == 1
    assert client.get("/api/epargne/fonds?type_fond=1", headers=ha).json()["total"] == 0
    assert client.get("/api/epargne/fonds?montant_min=200000", headers=ha).json()["total"] == 0


def test_paiement_type_7_et_modification(client):
    creer_membre("awa")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True, droit_caisse=True)
    h = entetes(client, "awa")
    id_ = client.post("/api/epargne/fonds", json={"type_fond": 1, "montant": 2_500}, headers=h).json()["id"]
    prep = client.get(f"/api/paiements/preparer?type_objet=7&objet_id={id_}", headers=h).json()
    assert prep["montant"] == 2_500 and prep["retour"] == f"/epargne/dons-placements/{id_}"
    corps = {"type_objet": 7, "objet_id": id_, "mode": 3, "remarque": "MP987654321"}
    assert client.post("/api/paiements", json=corps, headers=entetes(client, "curieux")).status_code == 403
    paiement = client.post("/api/paiements", json=corps, headers=h).json()["id"]
    fiche = client.get(f"/api/epargne/fonds/{id_}", headers=h).json()
    assert fiche["confirme"] == 1 and fiche["mode_paiement"] == 3 and fiche["etat_paiement"] == 2
    assert fiche["peut_payer"] is False
    r = client.post("/api/paiements", json={**corps, "remarque": "MP111111111"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette épargne est déjà payée."

    ha = entetes(client, "admin")
    # F-S4-55 : modification réservée ; le montant d'une épargne payée n'est plus modifiable
    assert client.put(f"/api/epargne/fonds/{id_}", json={"montant": 3_000}, headers=h).status_code == 403
    r = client.put(f"/api/epargne/fonds/{id_}", json={"montant": 3_000}, headers=ha)
    assert r.status_code == 400 and "montant" in r.json()["champs"]
    # Rejet par la caisse : retour à « non payé », le montant redevient modifiable
    assert client.post(f"/api/paiements/{paiement}/rejeter", headers=ha).status_code == 200
    fiche = client.get(f"/api/epargne/fonds/{id_}", headers=h).json()
    assert fiche["confirme"] == 2 and fiche["mode_paiement"] == 0 and fiche["peut_payer"] is True
    r = client.put(f"/api/epargne/fonds/{id_}", json={"montant": 3_000, "motivation": "Cotisation solidaire"}, headers=ha)
    assert r.status_code == 200
    fiche = client.get(f"/api/epargne/fonds/{id_}", headers=h).json()
    assert fiche["montant"] == 3_000 and fiche["motivation"] == "Cotisation solidaire"


def _pointage_base():
    agent = creer_membre("agent", point_caisse_actif=True, nom="Agence Moungali")
    client_id = creer_membre("cliente", code_pointage_hash=PIN, pseudonyme="cliente")
    admin = creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    return agent, client_id, admin


def test_pointage_droits_et_messages(client):
    agent, cliente, _ = _pointage_base()
    creer_membre("simple")
    r = client.post("/api/epargne/pointages", json={}, headers=entetes(client, "simple"))
    assert r.status_code == 403
    h = entetes(client, "agent")
    r = client.post("/api/epargne/pointages", json={}, headers=h)
    assert r.status_code == 400 and r.json()["champs"] == {
        "type_operation": "Veuillez indiquer le type de l'opération.",
        "membre_id": "Veuillez indiquer le membre.",
        "montant": "Veuillez indiquer le montant.",
        "code_pin": "Veuillez indiquer le code de pointage.",
    }
    # Un agent ne pointe pas sa propre carte
    r = client.post("/api/epargne/pointages", json={"type_operation": 1, "membre_id": agent, "montant": 100, "code_pin": "1234"}, headers=h)
    assert r.status_code == 400 and "membre_id" in r.json()["champs"]
    # Mauvais PIN : refusé sans consommer de référence (ADR-0007 S4d)
    avant = _compteur_reference()
    r = client.post("/api/epargne/pointages", json={"type_operation": 1, "membre_id": cliente, "montant": 10_000, "code_pin": "0000"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Le code de pointage est incorrect."
    assert _compteur_reference() == avant and _solde(cliente) == 0


def test_pointage_versement_retrait_97_pourcent_et_miroir(client):
    agent, cliente, _ = _pointage_base()
    h = entetes(client, "agent")
    versement = {"type_operation": 1, "membre_id": cliente, "montant": 10_000, "motif": "Épargne du jour", "code_pin": "1234"}
    r = client.post("/api/epargne/pointages", json=versement, headers=h)
    assert r.status_code == 201 and r.json()["message"] == "Pointage effectué." and r.json()["reference"].startswith("PCS")
    assert _solde(cliente) == 10_000 and _solde(agent) == 10_000  # effet miroir (ADR-0004)
    r = client.post("/api/epargne/pointages", json=versement, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce pointage est déjà enregistré."

    # Règle des 97 % sur le solde lu en base : 9 700 = 97 % → refusé (égalité refusée)
    retrait = {**versement, "type_operation": 2, "montant": 9_700}
    r = client.post("/api/epargne/pointages", json=retrait, headers=h)
    assert r.status_code == 400
    assert r.json()["message"] == "Impossible de faire un retrait, Le solde est inférieur au montant demandé."
    r = client.post("/api/epargne/pointages", json={**retrait, "montant": 9_699}, headers=h)
    assert r.status_code == 201
    assert _solde(cliente) == 301 and _solde(agent) == 301
    # Le titulaire est prévenu de chaque opération
    hc = entetes(client, "cliente")
    assert client.get("/api/espace/compteurs", headers=hc).json()["messages_non_lus"] == 2

    liste = client.get("/api/epargne/pointages", headers=hc).json()
    assert liste["total"] == 2 and liste["mon_solde"] == 301 and liste["afficher_solde"] is True
    assert liste["items"][0]["solde_apres"] == 301 and liste["est_operateur"] is False
    vue_agent = client.get("/api/epargne/pointages", headers=h).json()
    assert vue_agent["total_versements"] == 10_000 and vue_agent["total_retraits"] == 9_699 and vue_agent["net"] == 301
    assert vue_agent["rentabilite"] == 300 and vue_agent["encaisse"] == 301  # 3 % des versements
    assert vue_agent["items"][0]["type_caisse"] == 1
    # Filtre par dates, jour maximum inclus
    from datetime import date
    jour = date.today().isoformat()
    assert client.get(f"/api/epargne/pointages?du={jour}&au={jour}", headers=h).json()["total"] == 2
    assert client.get("/api/epargne/pointages?type_operation=2", headers=h).json()["total"] == 1


def test_pointage_par_gestionnaire_sur_agent(client):
    agent, cliente, _ = _pointage_base()
    with SessionLocal() as db:
        db.get(m.Membre, agent).code_pointage_hash = PIN
        db.commit()
    hg = entetes(client, "admin")
    # Le gestionnaire ne pointe que des agents (F-S4-61)
    r = client.post("/api/epargne/pointages", json={"type_operation": 1, "membre_id": cliente, "montant": 500, "code_pin": "1234"}, headers=hg)
    assert r.status_code == 400 and "membre_id" in r.json()["champs"]
    assert [t["id"] for t in client.get("/api/epargne/pointages/titulaires", headers=hg).json()] == [agent]
    r = client.post("/api/epargne/pointages", json={"type_operation": 1, "membre_id": agent, "montant": 50_000, "code_pin": "1234"}, headers=hg)
    assert r.status_code == 201
    liste = client.get("/api/epargne/pointages", headers=hg).json()
    assert liste["items"][0]["type_caisse"] == 2 and liste["est_gestionnaire"] is True  # Encaisse
    assert liste["encaisse"] == 50_000  # encaisse totale des agents
    assert client.get("/api/epargne/pointages?type_caisse=1", headers=hg).json()["total"] == 0
    detail = client.get(f"/api/epargne/pointages/titulaires/{agent}", headers=hg).json()
    assert detail["solde_point_caisse"] == 50_000 and detail["a_un_code"] is True


def test_pin_bloque_apres_cinq_echecs(client):
    _, cliente, _ = _pointage_base()
    h = entetes(client, "agent")
    corps = {"type_operation": 1, "membre_id": cliente, "montant": 1_000, "code_pin": "9999"}
    for _ in range(5):
        assert client.post("/api/epargne/pointages", json=corps, headers=h).json()["message"] == "Le code de pointage est incorrect."
    r = client.post("/api/epargne/pointages", json={**corps, "code_pin": "1234"}, headers=h)
    assert r.status_code == 400 and "réessayez dans 15 minutes" in r.json()["message"]
    assert _solde(cliente) == 0
