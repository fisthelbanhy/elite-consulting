"""« Mon espace » : tableau de bord, identifiant, code de pointage (F-TRV-25 à F-TRV-30)."""

from datetime import date

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.security import verifier_mot_de_passe

OFFRE = {"type_annonce": 2, "domaine_id": 1, "poste_a_pourvoir": "Développeur web", "competences": "Svelte"}


def test_tableau_reserve_aux_connectes(client):
    assert client.get("/api/espace/tableau").status_code == 401


def test_tableau_profil_fiches_et_paiements(client):
    moi = creer_membre("awa2024", pseudonyme="Awa K.", email="awa@exemple.cg", sexe=1)
    autre = creer_membre("autre")
    h = entetes(client, "awa2024")
    client.post("/api/emplois", json=OFFRE, headers=h)
    client.post("/api/emplois", json={**OFFRE, "poste_a_pourvoir": "Comptable"}, headers=h)
    with SessionLocal() as db:
        db.add(m.Immobilier(auteur_id=moi, reference="IMB1", description="Studio à Bacongo", etat=1))
        db.add(m.Immobilier(auteur_id=moi, reference="IMB2", description="Supprimée", etat=3))
        db.add(m.Immobilier(auteur_id=autre, reference="IMB3", description="Pas à moi", etat=2))
        groupe = m.GroupeLikelemba(code="LKB0512025", responsable_id=autre)
        db.add(groupe)
        db.flush()
        db.add(m.MembreLikelemba(groupe_id=groupe.id, membre_id=moi, code="1LKB0512025", date_entree=date.today()))
        db.add(m.Paiement(membre_id=moi, type_objet=4, mode=3, montant=5000, remarque="MP123456789", etat=2))
        db.add(m.Paiement(membre_id=autre, type_objet=4, mode=3, montant=7000, etat=2))
        db.add(m.Message(membre_id=moi, de_la_frangine=True, texte="Bienvenue"))
        db.commit()

    t = client.get("/api/espace/tableau", headers=h).json()
    p = t["profil"]
    assert p["pseudonyme"] == "Awa K." and 0 < p["profil_complet"] < 100
    assert "Adresse" in p["champs_manquants"] and "E-mail" not in p["champs_manquants"]
    modules = {x["cle"]: x for x in t["modules"]}
    assert modules["emplois"]["total"] == 2 and modules["emplois"]["fiches"][0]["lien"].startswith("/emplois/")
    assert modules["immobilier"]["total"] == 1 and modules["immobilier"]["fiches"][0]["statut"] == "En attente"
    assert modules["likelemba"]["fiches"][0]["lien"] == f"/likelemba/{groupe.id}"
    assert "annonces" not in modules  # seuls les modules utilisés sont renvoyés
    assert len(t["paiements"]) == 1 and t["paiements_en_attente"] == 1 and t["messages_non_lus"] == 1
    # l'endpoint des compteurs de l'en-tête est inchangé
    assert client.get("/api/espace/compteurs", headers=h).json()["messages_non_lus"] == 1


def test_changer_identifiant(client):
    creer_membre("awa2024")
    creer_membre("pris")
    h = entetes(client, "awa2024")
    r = client.put("/api/espace/identifiant", json={"identifiant": "awa.k", "mot_de_passe": "faux"}, headers=h)
    assert r.status_code == 400 and "mot_de_passe" in r.json()["champs"]
    r = client.put("/api/espace/identifiant", json={"identifiant": "PRIS", "mot_de_passe": "motdepasse1"}, headers=h)
    assert r.status_code == 400 and "identifiant" in r.json()["champs"]
    assert client.put("/api/espace/identifiant", json={"identifiant": "a b", "mot_de_passe": "motdepasse1"},
                      headers=h).status_code == 422
    assert client.put("/api/espace/identifiant", json={"identifiant": "awa.k", "mot_de_passe": "motdepasse1"},
                      headers=h).status_code == 200
    assert client.post("/api/auth/login", json={"identifiant": "awa.k", "mot_de_passe": "motdepasse1"}).status_code == 200


def test_code_pointage_du_titulaire(client):
    sans = creer_membre("sanscarte")
    avec = creer_membre("titulaire", point_caisse_actif=True)
    corps = {"mot_de_passe": "motdepasse1", "code": "0427", "confirmation": "0427"}
    assert client.put("/api/espace/code-pointage", json=corps, headers=entetes(client, "sanscarte")).status_code == 400
    h = entetes(client, "titulaire")
    assert client.put("/api/espace/code-pointage", json={**corps, "code": "12a4"}, headers=h).status_code == 422
    assert client.put("/api/espace/code-pointage", json={**corps, "confirmation": "0428"}, headers=h).status_code == 422
    assert client.put("/api/espace/code-pointage", json=corps, headers=h).status_code == 200
    with SessionLocal() as db:
        assert verifier_mot_de_passe("0427", db.get(m.Membre, avec).code_pointage_hash)
        assert db.get(m.Membre, sans).code_pointage_hash is None
    assert client.get("/api/espace/tableau", headers=h).json()["profil"]["a_code_pointage"] is True
