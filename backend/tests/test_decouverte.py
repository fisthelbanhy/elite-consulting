from conftest import creer_membre, entetes

from app.db import SessionLocal
from app.enums import TypeMembre
from app.models import Message

FICHE = {
    "activite_actuelle": "Vendeuse de pagnes au marché Total",
    "savoir_faire": "Couture",
    "idee_vue_chez_autrui": 2,
    "est_meneur": 1,
    "pourcentage_implication": 80,
    "soutien_conjoint": 1,
    "confronte_aux_faits": 2,
    "notes_membre": "Je voudrais être rappelée le matin.",
}
DIAGNOSTIC = {
    "activite": "independant", "savoir_faire": "beaute", "stade": "debut", "besoin": "financement",
    "disponibilite": "plein", "moyens": "rien", "soutien": "oui", "ville": "2",
}


def _messages(membre_id: int) -> list[Message]:
    with SessionLocal() as db:
        return list(db.query(Message).filter(Message.membre_id == membre_id).order_by(Message.id))


def test_fiche_unique_reference_et_restitution_fidele(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.get("/api/decouverte/moi", headers=h).json() is None
    r = client.post("/api/decouverte", json=FICHE, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("LSG")
    # une seule fiche par membre
    r2 = client.post("/api/decouverte", json=FICHE, headers=h)
    assert r2.status_code == 400 and r2.json()["message"] == "Fiche de découverte de soi du membre déjà enregistrée."
    moi = client.get("/api/decouverte/moi", headers=h).json()
    # Oui/Non, pourcentage et question 26 restitués fidèlement (F-S1-21, bug legacy de la zone 26)
    assert moi["idee_vue_chez_autrui"] == 2 and moi["soutien_conjoint"] == 1 and moi["confronte_aux_faits"] == 2
    assert moi["pourcentage_implication"] == 80 and moi["peut_modifier"] is True and moi["est_proprietaire"] is True
    assert moi["notes_conseillere"] == "" and moi["cloturee"] == 2
    # valeurs hors bornes refusées
    r = client.put(f"/api/decouverte/{moi['id']}", json={**FICHE, "pourcentage_implication": 120, "est_sociable": 5}, headers=h)
    assert r.status_code == 422 and {"pourcentage_implication", "est_sociable"} <= set(r.json()["champs"])


def test_confidentialite_de_la_fiche(client):
    creer_membre("awa")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    id_ = client.post("/api/decouverte", json=FICHE, headers=entetes(client, "awa")).json()["id"]
    assert client.get(f"/api/decouverte/{id_}").status_code == 401
    assert client.get(f"/api/decouverte/{id_}", headers=entetes(client, "curieux")).status_code == 404
    assert client.get("/api/decouverte", headers=entetes(client, "curieux")).status_code == 403
    ha = entetes(client, "admin")
    liste = client.get("/api/decouverte", headers=ha).json()
    assert liste["total"] == 1 and liste["items"][0]["membre"]["nom"] == "Awa Test"
    assert client.get("/api/decouverte?q=awa", headers=ha).json()["total"] == 1
    assert client.get("/api/decouverte?q=zzz", headers=ha).json()["total"] == 0


def test_correspondance_la_frangine(client):
    membre_id = creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    id_ = client.post("/api/decouverte", json=FICHE, headers=h).json()["id"]
    # le membre ne peut pas écrire la correspondance de la frangine
    assert client.put(f"/api/decouverte/{id_}/correspondance", json={"notes_conseillere": "Moi"}, headers=h).status_code == 403
    client.put(f"/api/decouverte/{id_}", json={**FICHE, "notes_conseillere": "Tentative"}, headers=h)
    assert client.get("/api/decouverte/moi", headers=h).json()["notes_conseillere"] == ""
    r = client.put(f"/api/decouverte/{id_}/correspondance", json={"notes_conseillere": "Passez au bureau mardi."},
                   headers=entetes(client, "admin"))
    assert r.status_code == 200
    assert client.get("/api/decouverte/moi", headers=h).json()["notes_conseillere"] == "Passez au bureau mardi."
    assert _messages(membre_id)[-1].de_la_frangine is True


def test_cloture_et_reouverture(client):
    creer_membre("awa")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "awa")
    id_ = client.post("/api/decouverte", json=FICHE, headers=h).json()["id"]
    assert client.post(f"/api/decouverte/{id_}/cloture", json={"cloturee": True}, headers=h).status_code == 200
    moi = client.get("/api/decouverte/moi", headers=h).json()
    assert moi["cloturee"] == 1 and moi["peut_modifier"] is False
    r = client.put(f"/api/decouverte/{id_}", json=FICHE, headers=h)
    assert r.status_code == 400 and "rouvrez" in r.json()["message"]
    # pas de nouvelle fiche possible, mais réouverture (ADR-0007 S1c)
    assert client.post("/api/decouverte", json=FICHE, headers=h).status_code == 400
    assert client.post(f"/api/decouverte/{id_}/cloture", json={"cloturee": False}, headers=h).status_code == 200
    assert client.put(f"/api/decouverte/{id_}", json=FICHE, headers=h).status_code == 200
    # état de suivi : gestionnaire habilité seulement
    assert client.post(f"/api/decouverte/{id_}/etat", json={"etat": 1}, headers=h).status_code == 403
    ha = entetes(client, "admin")
    assert client.post(f"/api/decouverte/{id_}/etat", json={"etat": 1}, headers=ha).status_code == 200
    assert client.get(f"/api/decouverte/{id_}", headers=ha).json()["etat_fiche"] == 1


def test_suppression_par_gestionnaire_habilite(client):
    creer_membre("awa")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "awa")
    id_ = client.post("/api/decouverte", json=FICHE, headers=h).json()["id"]
    assert client.delete(f"/api/decouverte/{id_}", headers=h).status_code == 403
    assert client.delete(f"/api/decouverte/{id_}", headers=entetes(client, "admin_sans_droit")).status_code == 403
    ha = entetes(client, "admin")
    assert client.delete(f"/api/decouverte/{id_}", headers=ha).status_code == 200
    assert client.get("/api/decouverte", headers=ha).json()["total"] == 0
    assert client.get("/api/decouverte/moi", headers=h).json() is None
    # le membre peut repartir : la fiche (unique) est reprise à blanc, même référence
    r = client.post("/api/decouverte", json={"savoir_faire": "Cuisine"}, headers=h)
    assert r.status_code == 201 and r.json()["id"] == id_
    assert client.get("/api/decouverte/moi", headers=h).json()["activite_actuelle"] == ""


def test_diagnostic_questions_et_restitution_publiques(client):
    questions = client.get("/api/decouverte/diagnostic/questions").json()
    assert [q["cle"] for q in questions] == [
        "activite", "savoir_faire", "stade", "besoin", "disponibilite", "moyens", "soutien", "ville",
    ]
    assert questions[-1]["options"][0]["libelle"] == "Brazzaville"
    r = client.post("/api/decouverte/diagnostic/restitution", json={**DIAGNOSTIC, "stade": ""})
    assert r.status_code == 400 and "stade" in r.json()["champs"]
    r = client.post("/api/decouverte/diagnostic/restitution", json={**DIAGNOSTIC, "besoin": "pirater"})
    assert r.status_code == 400 and "besoin" in r.json()["champs"]
    res = client.post("/api/decouverte/diagnostic/restitution", json=DIAGNOSTIC).json()
    assert res["profil"]["titre"] == "Entrepreneur·e qui démarre"
    assert len(res["etapes"]) == 3 and res["etapes"][0]["href"] == "/likelemba"
    assert all(e["href"].startswith("/") for e in res["etapes"])
    assert "Brazzaville" in res["resume"] and len(res["reponses"]) == 8


def test_diagnostic_cree_puis_complete_la_fiche(client):
    membre_id = creer_membre("awa")
    h = entetes(client, "awa")
    assert client.post("/api/decouverte/diagnostic", json=DIAGNOSTIC).status_code == 401
    r = client.post("/api/decouverte/diagnostic", json=DIAGNOSTIC, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("LSG")
    moi = client.get("/api/decouverte/moi", headers=h).json()
    assert moi["activite_actuelle"] == "J'ai déjà une petite activité"
    assert moi["entourage_valorise_activite"] == 1 and moi["a_deja_fait_commerce"] == 1
    assert moi["diagnostic"]["codes"]["besoin"] == "financement" and moi["date_diagnostic"]
    messages = _messages(membre_id)
    assert len(messages) == 1 and messages[0].de_la_frangine is False
    assert messages[0].texte.startswith("Nouveau diagnostic")
    # double envoi : pas de second message
    client.post("/api/decouverte/diagnostic", json=DIAGNOSTIC, headers=h)
    assert len(_messages(membre_id)) == 1


def test_diagnostic_ne_remplace_pas_les_reponses_du_membre(client):
    membre_id = creer_membre("awa")
    h = entetes(client, "awa")
    id_ = client.post("/api/decouverte", json=FICHE, headers=h).json()["id"]
    client.post(f"/api/decouverte/{id_}/cloture", json={"cloturee": True}, headers=h)
    r = client.post("/api/decouverte/diagnostic", json={**DIAGNOSTIC, "besoin": "clients"}, headers=h)
    assert r.json()["id"] == id_
    moi = client.get("/api/decouverte/moi", headers=h).json()
    assert moi["activite_actuelle"] == FICHE["activite_actuelle"]  # conservé
    assert moi["moyens_disponibles"] == "Rien pour l'instant"  # complété
    assert moi["cloturee"] == 2  # un nouveau diagnostic rouvre le suivi
    assert moi["diagnostic"]["etapes"][0]["href"] == "/marches"
    assert len(_messages(membre_id)) == 1
