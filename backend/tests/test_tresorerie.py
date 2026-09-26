import pytest
from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre
from app.services import emails


@pytest.fixture(autouse=True)
def banques():
    with SessionLocal() as db:
        db.add_all([
            m.Banque(id=1, nom="Autres"),
            m.Banque(id=2, sigle="BGFI", nom="BGFIBank Congo", email="ordres@bgfi.cg"),
            m.Banque(id=3, sigle="LCB", nom="LCB Bank"),
            m.Banque(id=25, sigle="UBA", nom="UBA"),  # id > 20 : impossible en legacy
        ])
        db.commit()


@pytest.fixture
def courriels(monkeypatch):
    envoyes = []
    monkeypatch.setattr(emails, "envoyer", lambda dest, sujet, texte, repondre_a=None: envoyes.append((dest, sujet, texte)) or True)
    return envoyes


PLACEMENT = {"type_placement": 1, "montant": 250000, "duree_mois": 6, "taux": 3.5, "banques": [2, 25], "observation": ""}
LIGNE = {
    "date_operation": "2026-10-01", "montant": 150000, "devise": 1, "type_operation": 5, "banque_emettrice_id": 2,
    "beneficiaire": "Ets Mabiala", "banque_beneficiaire_id": 3, "banque_beneficiaire_adresse": "Brazzaville",
}
CREDIT = {"montant": 5000000, "objet": "Achat d'un four", "duree_mois": 24, "niveau_realisation": 40,
          "garantie": "Nantissement du matériel", "delai_reponse_jours": 30, "devis_global": "6 000 000",
          "apport_propre": "1 000 000"}
CONTENTIEUX = {"dette_compromise": 3000000, "revenus_mensuels": 400000, "charges_fixes": 150000,
               "dette_compromise_detail": "Prêt 2024", "echeance_supportable": 120000}


def test_reserve_aux_connectes(client):
    for chemin in ("placements", "operations", "credits", "contentieux", "compteurs"):
        assert client.get(f"/api/tresorerie/{chemin}").status_code == 401


def test_placement_regles_banques_et_doublon(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/tresorerie/placements", json={"type_placement": 0, "montant": 0, "duree_mois": 0, "taux": 0}, headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "type_placement": "Indiquez le type de placement.", "montant": "Veuillez indiquer le montant à placer.",
        "duree_mois": "Veuillez indiquer la durée du placement.", "taux": "Veuillez indiquer le taux escompté.",
        "banques": "Veuillez indiquer la ou les banques.",
    }
    # la banque « Autres » n'est pas une banque de placement
    assert client.post("/api/tresorerie/placements", json={**PLACEMENT, "banques": [1]}, headers=h).status_code == 400
    r = client.post("/api/tresorerie/placements", json=PLACEMENT, headers=h)
    assert r.status_code == 201 and r.json()["reference"].startswith("PCM")
    assert r.json()["message"] == "Le placement est enregistré."
    d = client.get(f"/api/tresorerie/placements/{r.json()['id']}", headers=h).json()
    assert [b["sigle"] for b in d["banques"]] == ["BGFI", "UBA"] and d["peut_annuler"] is True
    # deux placements sans observation ne sont plus un doublon, deux placements identiques oui
    r2 = client.post("/api/tresorerie/placements", json={**PLACEMENT, "montant": 300000}, headers=h)
    assert r2.status_code == 201
    assert client.post("/api/tresorerie/placements", json=PLACEMENT, headers=h).json()["message"] == "Placement déjà effectué."


def test_placement_legacy_lisible():
    from app.services.tresorerie import ids_banques, serialiser_banques

    assert ids_banques("0*0*0*0*0*0*0*0*0*9*0*0*0*0*0*0*0*0*0*0*0*") == [9]
    assert serialiser_banques([25, 2]) == "2*25"


def test_listes_membre_et_gestionnaire_annulation(client):
    creer_membre("awa")
    creer_membre("autre")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h, ha, hg = entetes(client, "awa"), entetes(client, "autre"), entetes(client, "admin")
    id_ = client.post("/api/tresorerie/credits", json=CREDIT, headers=h).json()["id"]
    client.post("/api/tresorerie/credits", json={**CREDIT, "objet": "Autre projet"}, headers=ha)
    assert client.get("/api/tresorerie/credits", headers=h).json()["total"] == 1
    assert client.get("/api/tresorerie/credits", headers=hg).json()["total"] == 2
    assert client.get(f"/api/tresorerie/credits/{id_}", headers=ha).status_code == 404
    assert client.delete(f"/api/tresorerie/credits/{id_}", headers=ha).status_code == 404
    # état par le gestionnaire habilité : le membre est prévenu
    assert client.post(f"/api/tresorerie/credits/{id_}/etat", json={"etat": 4}, headers=h).status_code == 403
    assert client.post(f"/api/tresorerie/credits/{id_}/etat", json={"etat": 4}, headers=hg).status_code == 200
    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 1
    # une fiche traitée n'est plus modifiable par son titulaire, mais reste annulable
    assert client.put(f"/api/tresorerie/credits/{id_}", json=CREDIT, headers=h).status_code == 403
    assert client.delete(f"/api/tresorerie/credits/{id_}", headers=h).status_code == 200
    assert client.get("/api/tresorerie/credits", headers=h).json()["total"] == 0
    assert client.get("/api/tresorerie/compteurs", headers=hg).json()["credits"] == 1


def test_demande_credit_messages_et_apport(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    r = client.post("/api/tresorerie/credits", json={"montant": 0, "objet": "", "duree_mois": 0, "garantie": ""}, headers=h)
    assert set(r.json()["champs"]) == {"montant", "objet", "duree_mois", "garantie"}
    assert r.json()["champs"]["montant"] == "Indiquez le montant du crédit."
    r = client.post("/api/tresorerie/credits", json=CREDIT, headers=h)
    assert r.json()["message"] == "Votre demande de crédit est enregistrée." and r.json()["reference"].startswith("DDC")
    d = client.get(f"/api/tresorerie/credits/{r.json()['id']}", headers=h).json()
    assert d["apport_propre"] == "1 000 000" and d["devis_global"] == "6 000 000"  # correctif F-S7-35
    assert client.post("/api/tresorerie/credits", json=CREDIT, headers=h).json()["message"] == "Cette demande de crédit est déjà effectuée."
    r = client.post("/api/tresorerie/credits", json={**CREDIT, "delai_reponse_jours": 400}, headers=h)
    assert r.status_code == 422


def test_contentieux_regles_et_annulation(client):
    creer_membre("awa")
    creer_membre("autre")
    h = entetes(client, "awa")
    r = client.post("/api/tresorerie/contentieux", json={"dette_compromise": 0, "revenus_mensuels": 0}, headers=h)
    assert r.json()["champs"] == {
        "dette_compromise": "Veuillez indiquer le montant de la dette compromise.",
        "revenus_mensuels": "Veuillez indiquer le montant des revenus mensuels.",
    }
    r = client.post("/api/tresorerie/contentieux", json=CONTENTIEUX, headers=h)
    assert r.json()["message"] == "Ce contentieux est enregistré." and r.json()["reference"].startswith("CCT")
    id_ = r.json()["id"]
    assert client.post("/api/tresorerie/contentieux", json=CONTENTIEUX, headers=h).json()["message"] == \
        "Ce contentieux de crédit est déjà enregistré."
    # plus de boutons ouverts à tout connecté (F-S7-36)
    assert client.put(f"/api/tresorerie/contentieux/{id_}", json=CONTENTIEUX, headers=entetes(client, "autre")).status_code == 404
    r = client.put(f"/api/tresorerie/contentieux/{id_}", json={**CONTENTIEUX, "charges_variables": 50000}, headers=h)
    assert r.status_code == 200
    assert client.get(f"/api/tresorerie/contentieux/{id_}", headers=h).json()["charges_variables"] == 50000
    # l'annulation fonctionne enfin pour le contentieux (F-S7-24)
    assert client.delete(f"/api/tresorerie/contentieux/{id_}", headers=h).status_code == 200


def test_operations_lot_reference_commune_et_email(client, courriels):
    creer_membre("awa", nom="Awa Commerce")
    h = entetes(client, "awa")
    lot = {"lignes": [
        LIGNE,
        {**LIGNE, "montant": 90000, "type_operation": 2, "banque_emettrice_id": None, "banque_emettrice_nom": "HSBC Paris",
         "banque_emettrice_email": "ops@hsbc.fr", "banque_beneficiaire_id": 25},
        {},  # ligne vide ignorée
    ]}
    r = client.post("/api/tresorerie/operations", json=lot, headers=h)
    assert r.status_code == 201, r.text
    corps = r.json()
    assert corps["reference"].startswith("OPB") and len(corps["ids"]) == 2 and corps["emails"] == 2
    liste = client.get(f"/api/tresorerie/operations?reference={corps['reference']}", headers=h).json()
    assert liste["total"] == 2
    noms = {o["nom_banque_emettrice"] for o in liste["items"]}
    assert noms == {"BGFIBank Congo", "HSBC Paris"}
    # e-mail « Programmation opérations bancaires » à la banque émettrice (saisie ou référentiel)
    assert {c[0] for c in courriels} == {"ordres@bgfi.cg", "ops@hsbc.fr"}
    assert all(c[1] == "Programmation opérations bancaires" for c in courriels)
    assert "SOCIÉTÉ : Awa Commerce" in courriels[0][2] and "MONTANT : 150 000 FCFA" in courriels[0][2]
    # anti-doublon membre + date + montant + banque + bénéficiaire, signalé ligne par ligne
    r = client.post("/api/tresorerie/operations", json={"lignes": [LIGNE]}, headers=h)
    assert r.status_code == 400 and "lignes.0.montant" in r.json()["champs"]
    # renvoi du mail depuis la fiche
    d = client.get(f"/api/tresorerie/operations/{corps['ids'][0]}", headers=h).json()
    assert d["email_destinataire"] is True and len(d["lot"]) == 1 and d["sens"] == "debit"
    assert client.post(f"/api/tresorerie/operations/{corps['ids'][0]}/mail", headers=h).json()["message"] == "Mail envoyé."


def test_operations_lignes_incompletes_signalees(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.post("/api/tresorerie/operations", json={"lignes": [{}]}, headers=h).status_code == 400
    r = client.post("/api/tresorerie/operations", json={"lignes": [LIGNE, {"montant": 1000, "banque_emettrice_id": 1}]}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["lignes.1.date_operation"].startswith("Ligne 2 :")
    assert "lignes.1.banque_emettrice_id" in champs and "lignes.0.montant" not in champs
    # un versement n'exige pas de banque bénéficiaire
    r = client.post("/api/tresorerie/operations", json={"lignes": [{**LIGNE, "type_operation": 3, "banque_beneficiaire_id": None}]}, headers=h)
    assert r.status_code == 201


def test_operation_modification_date_et_vue_gestionnaire(client, courriels):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h, hg = entetes(client, "awa"), entetes(client, "admin")
    ids = client.post("/api/tresorerie/operations", json={"lignes": [LIGNE, {**LIGNE, "type_operation": 1, "montant": 70000}]},
                      headers=h).json()["ids"]
    r = client.put(f"/api/tresorerie/operations/{ids[0]}", json={**LIGNE, "date_operation": "2026-11-15"}, headers=h)
    assert r.status_code == 200
    assert client.get(f"/api/tresorerie/operations/{ids[0]}", headers=h).json()["date_operation"] == "2026-11-15"
    # filtres gestionnaire utilisables seuls ; banque opérante (émettrice ou bénéficiaire)
    assert client.get("/api/tresorerie/operations?montant_min=100000", headers=hg).json()["total"] == 1
    assert client.get("/api/tresorerie/operations?banque_id=3", headers=hg).json()["total"] == 2
    assert client.get("/api/tresorerie/operations?date_min=2026-11-01", headers=hg).json()["total"] == 1
    synthese = client.get("/api/tresorerie/operations/synthese", headers=hg).json()
    assert {(x["sens"], x["total"]) for x in synthese} == {("debit", 150000), ("credit", 70000)}
