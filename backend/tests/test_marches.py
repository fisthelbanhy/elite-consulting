from datetime import date, timedelta

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre

DANS_5_JOURS = (date.today() + timedelta(days=5)).isoformat()
MARCHE = {
    "numero_appel_offre": "AO-2026-014/MEF", "type_marche": 2, "libelle": "Réhabilitation du marché Total de Bacongo",
    "description": "Travaux de gros œuvre et de plomberie.", "montant": 150_000_000, "date_limite": DANS_5_JOURS,
    "dossier_a_fournir": "Offre technique, offre financière, attestation de régularité fiscale.",
    "lieu_depot": "Direction des marchés publics, Brazzaville", "email": "marches@exemple.cg",
    "maitre_ouvrage": "Mairie de Brazzaville", "publie_par": "Les Dépêches de Brazzaville", "beneficiaire": "Commerçants",
}
PROJET = {
    "responsable": "Ondoki", "promoteur": "Banque mondiale", "objet": "Soutien à l'agriculture",
    "libelle": "PDAC", "objectif": "Promotion des activités agricoles", "description": "Appui aux coopératives.",
    "adresse": "Centre-ville, Brazzaville", "duree_mois": 36, "date_lancement": "2026-10-01",
    "conditions": "Être une coopérative agréée.",
}


# --- Marchés -------------------------------------------------------------------------------------


def test_creation_validations_reference_et_unicite(client):
    creer_membre("acheteur")
    h = entetes(client, "acheteur")
    r = client.post("/api/marches", json={"numero_appel_offre": "A1", "libelle": "abc", "montant": 0}, headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "numero_appel_offre": "Veuillez indiquer le numéro d'appel d'offres.",
        "type_marche": "Veuillez indiquer marché privé ou public.",
        "libelle": "Veuillez indiquer le libellé du marché.",
        "montant": "Veuillez indiquer le montant du marché.",
    }
    hier = (date.today() - timedelta(days=1)).isoformat()
    r = client.post("/api/marches", json={**MARCHE, "date_limite": hier}, headers=h)
    assert r.status_code == 400 and "date_limite" in r.json()["champs"]
    assert client.post("/api/marches", json={**MARCHE, "email": "pas-un-mail"}, headers=h).status_code == 422

    r = client.post("/api/marches", json=MARCHE, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("MCH") and r.json()["message"] == "Opération effectuée avec succès."
    id1 = r.json()["id"]
    r = client.post("/api/marches", json={**MARCHE, "numero_appel_offre": "ao-2026-014/mef "}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce marché est déjà enregistré."

    # unicité aussi en modification (corrigé : le legacy ne contrôlait qu'à la création)
    id2 = client.post("/api/marches", json={**MARCHE, "numero_appel_offre": "AO-2026-020"}, headers=h).json()["id"]
    r = client.put(f"/api/marches/{id2}", json=MARCHE, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce marché est déjà enregistré."
    r = client.put(f"/api/marches/{id1}", json={**MARCHE, "montant": 160_000_000}, headers=h)
    assert r.status_code == 200 and r.json()["message"] == "Opération effectuée avec succès."

    fiche = client.get(f"/api/marches/{id1}").json()
    assert fiche["montant"] == 160_000_000 and fiche["jours_restants"] == 5 and fiche["ouvert"] is True
    assert fiche["email"] == "marches@exemple.cg" and fiche["auteur"]["pseudonyme"] == "acheteur"
    assert fiche["peut_modifier"] is False and fiche["document_url"] is None


def test_liste_filtres_ouverts_et_tri_par_cloture(client):
    creer_membre("acheteur")
    h = entetes(client, "acheteur")
    client.post("/api/marches", json=MARCHE, headers=h)
    client.post("/api/marches", json={**MARCHE, "numero_appel_offre": "PRIVE-001", "type_marche": 1, "montant": 2_000_000,
                                      "libelle": "Fourniture de ciment", "date_limite": None}, headers=h)
    id_clos = client.post("/api/marches", json={**MARCHE, "numero_appel_offre": "AO-2025-001", "libelle": "Ancien marché",
                                                "date_limite": (date.today() + timedelta(days=30)).isoformat()}, headers=h).json()["id"]
    with SessionLocal() as db:  # date limite dépassée (reprise legacy)
        db.get(m.Marche, id_clos).date_limite = date.today() - timedelta(days=3)
        db.commit()

    assert client.get("/api/marches").json()["total"] == 3
    ouverts = client.get("/api/marches?ouverts=true&tri=cloture").json()
    assert ouverts["total"] == 2
    assert [i["numero_appel_offre"] for i in ouverts["items"]] == ["AO-2026-014/MEF", "PRIVE-001"]  # sans date en dernier
    clos = client.get(f"/api/marches/{id_clos}").json()
    assert clos["ouvert"] is False and clos["jours_restants"] == -3
    assert client.get("/api/marches?type=1").json()["items"][0]["numero_appel_offre"] == "PRIVE-001"
    assert client.get("/api/marches?montant_min=100000000").json()["total"] == 2
    assert client.get("/api/marches?q=ciment").json()["total"] == 1
    assert client.get("/api/marches?q=régularité").json()["total"] == 3  # recherche dans le dossier à fournir
    assert client.get("/api/marches?tri=montant").json()["items"][-1]["montant"] == 2_000_000
    assert client.get("/api/marches/compteurs").json() == {"marches": 3, "marches_ouverts": 2, "projets": 0}


def test_modification_moderation_et_cloture(client):
    creer_membre("acheteur")
    creer_membre("autre")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "acheteur")
    id_ = client.post("/api/marches", json=MARCHE, headers=h).json()["id"]
    assert client.put(f"/api/marches/{id_}", json=MARCHE, headers=entetes(client, "autre")).status_code == 403
    assert client.post(f"/api/marches/{id_}/etat", json={"etat": 4}, headers=entetes(client, "admin_sans_droit")).status_code == 403
    assert client.post(f"/api/marches/{id_}/etat", json={"etat": 4}, headers=h).status_code == 403
    r = client.post(f"/api/marches/{id_}/etat", json={"etat": 4}, headers=entetes(client, "admin"))
    assert r.status_code == 200
    # un marché clôturé n'est plus « ouvert » ; il sort de la liste publique (état ≠ publié)
    fiche = client.get(f"/api/marches/{id_}", headers=h).json()
    assert fiche["ouvert"] is False and fiche["etat"] == 4
    assert client.get("/api/marches?ouverts=true").json()["total"] == 0
    assert client.get("/api/marches", headers=entetes(client, "autre")).json()["total"] == 0  # état 4 ≠ publié
    assert client.post(f"/api/marches/{id_}/etat", json={"etat": 2}, headers=entetes(client, "admin")).status_code == 200
    assert client.delete(f"/api/marches/{id_}", headers=entetes(client, "autre")).status_code == 403
    assert client.delete(f"/api/marches/{id_}", headers=h).status_code == 200
    assert client.get(f"/api/marches/{id_}").status_code == 404


def test_document_pdf(client):
    creer_membre("acheteur")
    h = entetes(client, "acheteur")
    id_ = client.post("/api/marches", json=MARCHE, headers=h).json()["id"]
    pdf = {"fichier": ("dao.pdf", b"%PDF-1.4\n%fin\n", "application/pdf")}
    r = client.post(f"/api/marches/{id_}/document", files=pdf, headers=h)
    assert r.status_code == 200, r.text
    assert client.get(f"/api/marches/{id_}").json()["document_url"].endswith(".pdf")
    r = client.post(f"/api/marches/{id_}/document", files={"fichier": ("x.txt", b"texte", "text/plain")}, headers=h)
    assert r.status_code == 400 and "document" in r.json()["champs"]
    assert client.delete(f"/api/marches/{id_}/document", headers=h).status_code == 200
    assert client.get(f"/api/marches/{id_}").json()["document_url"] is None


# --- Projets -------------------------------------------------------------------------------------


def test_projet_creation_validations_et_unicite(client):
    creer_membre("porteur")
    h = entetes(client, "porteur")
    r = client.post("/api/marches/projets", json={"responsable": "Ok", "duree_mois": 121}, headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "responsable": "Veuillez indiquer le responsable du projet.",
        "promoteur": "Veuillez indiquer le promoteur du projet.",
        "objet": "Veuillez indiquer l'objet du projet.",
        "libelle": "Veuillez indiquer le libellé du projet.",
        "duree_mois": "Veuillez indiquer la durée du projet.",
    }
    # durée 0 acceptée (legacy : select 0..120) ; champs de plus de 20 caractères acceptés (F-S6-32)
    r = client.post("/api/marches/projets", json={**PROJET, "duree_mois": 0}, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("PJT") and r.json()["message"] == "Enregistrement effectué."
    # unicité responsable + objet avec le bon libellé (corrigé)
    r = client.post("/api/marches/projets", json={**PROJET, "responsable": "ONDOKI", "libelle": "Autre"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Ce projet est déjà enregistré."
    assert client.post("/api/marches/projets", json={**PROJET, "objet": "Pistes rurales"}, headers=h).status_code == 201


def test_projets_liste_fiche_et_droits(client):
    creer_membre("porteur")
    creer_membre("autre")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "porteur")
    id_ = client.post("/api/marches/projets", json=PROJET, headers=h).json()["id"]
    client.post("/api/marches/projets", json={**PROJET, "objet": "Pistes rurales", "libelle": "Routes",
                                              "description": "Désenclavement"}, headers=h)
    assert client.get("/api/marches/projets").json()["total"] == 2
    assert client.get("/api/marches/projets?q=coopératives").json()["total"] == 1
    fiche = client.get(f"/api/marches/projets/{id_}").json()
    assert fiche["promoteur"] == "Banque mondiale" and fiche["duree_mois"] == 36 and fiche["conditions"]
    assert client.get("/api/marches/compteurs").json()["projets"] == 2

    assert client.put(f"/api/marches/projets/{id_}", json=PROJET, headers=entetes(client, "autre")).status_code == 403
    r = client.put(f"/api/marches/projets/{id_}", json={**PROJET, "duree_mois": 48}, headers=h)
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."
    assert client.post(f"/api/marches/projets/{id_}/etat", json={"etat": 1}, headers=h).status_code == 403
    assert client.post(f"/api/marches/projets/{id_}/etat", json={"etat": 1}, headers=entetes(client, "admin")).status_code == 200
    assert client.get("/api/marches/projets").json()["total"] == 1
    assert client.get(f"/api/marches/projets/{id_}", headers=h).json()["peut_modifier"] is True
    assert client.delete(f"/api/marches/projets/{id_}", headers=h).status_code == 200
    assert client.get(f"/api/marches/projets/{id_}", headers=h).status_code == 404


def test_routes_projets_et_marches_ne_se_masquent_pas(client):
    creer_membre("acheteur")
    h = entetes(client, "acheteur")
    id_ = client.post("/api/marches", json=MARCHE, headers=h).json()["id"]
    assert client.get("/api/marches/projets").status_code == 200
    assert client.get("/api/marches/compteurs").status_code == 200
    assert client.get(f"/api/marches/{id_}").status_code == 200
    assert client.get("/api/marches/999").status_code == 404
