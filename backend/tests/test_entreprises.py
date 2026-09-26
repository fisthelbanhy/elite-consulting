import io

from conftest import creer_membre, entetes
from PIL import Image

import app.models as m
from app.db import SessionLocal
from app.enums import CategorieMembre, TypeMembre

ENTREPRISE = {
    "domaine_id": 1, "nom": "Bomoye Services", "forme_juridique": 2, "capital_social": 1_000_000,
    "description": "Maintenance informatique et développement web à Brazzaville.", "gerant": "Grâce Mabiala",
    "telephone": "06 123 45 67", "email": "contact@bomoye.cg", "site_web": "www.bomoye.cg",
    "adresse": "59 rue Bétou, Moungali", "ville_id": 2,
}


def _referentiel_supplementaire() -> None:
    with SessionLocal() as db:
        db.add(m.SecteurActivite(id=2, libelle="Agriculture"))
        db.add(m.DomaineActivite(id=2, secteur_id=2, libelle="Maraîchage"))
        db.commit()


def test_creation_reference_validations_et_unicite(client):
    creer_membre("patron")
    h = entetes(client, "patron")
    r = client.post("/api/entreprises", json={"nom": "Abc", "telephone": ""}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert {"domaine_id", "nom", "forme_juridique", "ville_id"} <= set(champs)
    assert champs["nom"] == "Le nom de l'entreprise doit avoir au moins 4 caractères."
    assert champs["ville_id"] == "Veuillez indiquer la ville où est située l'entreprise."

    # téléphone au format congolais, site normalisé en https
    r = client.post("/api/entreprises", json={**ENTREPRISE, "telephone": "12345"}, headers=h)
    assert r.status_code == 422 and "telephone" in r.json()["champs"]

    r = client.post("/api/entreprises", json=ENTREPRISE, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("ENT") and r.json()["message"] == "Enregistrement effectué."
    fiche = client.get(f"/api/entreprises/{r.json()['id']}").json()
    assert fiche["domaine"]["secteur"]["id"] == 1  # secteur déduit du domaine (ADR-0007)
    assert fiche["site_web"] == "https://www.bomoye.cg" and fiche["telephone"] == "061234567"
    with SessionLocal() as db:
        assert db.get(m.Entreprise, r.json()["id"]).secteur_id == 1

    # unicité nom + domaine, insensible à la casse ; même nom dans un autre domaine accepté
    r = client.post("/api/entreprises", json={**ENTREPRISE, "nom": "BOMOYE  services"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette entreprise est déjà enregistrée."
    _referentiel_supplementaire()
    assert client.post("/api/entreprises", json={**ENTREPRISE, "domaine_id": 2}, headers=h).status_code == 201


def test_site_web_dangereux_refuse(client):
    creer_membre("patron")
    r = client.post("/api/entreprises", json={**ENTREPRISE, "site_web": "javascript:alert(1)"}, headers=entetes(client, "patron"))
    assert r.status_code == 422 and "site_web" in r.json()["champs"]


def test_pre_remplissage_personne_morale(client):
    creer_membre(
        "societe", categorie=CategorieMembre.MORALE, nom="Société Kongo Bois", telephone="055123456",
        email="kongo@bois.cg", adresse="Mpila", domaine_activite_id=1, forme_juridique=1,
    )
    creer_membre("particulier", telephone="066000000")
    modele = client.get("/api/entreprises/modele", headers=entetes(client, "societe")).json()
    assert modele == {
        "nom": "Société Kongo Bois", "domaine_id": 1, "forme_juridique": 1, "telephone": "055123456",
        "email": "kongo@bois.cg", "adresse": "Mpila", "ville_id": 2, "personne_morale": True,
    }
    vide = client.get("/api/entreprises/modele", headers=entetes(client, "particulier")).json()
    assert vide["personne_morale"] is False and vide["telephone"] == "" and vide["nom"] == ""
    assert client.get("/api/entreprises/modele").status_code == 401


def test_liste_filtres_tri_et_visibilite(client):
    _referentiel_supplementaire()
    creer_membre("patron")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "patron")
    id1 = client.post("/api/entreprises", json=ENTREPRISE, headers=h).json()["id"]
    client.post("/api/entreprises", json={**ENTREPRISE, "nom": "Ferme du Pool", "domaine_id": 2, "ville_id": 3,
                                          "description": "Légumes bio"}, headers=h)
    client.post("/api/entreprises", json={**ENTREPRISE, "nom": "Atelier Web", "description": "Sites"}, headers=h)

    assert client.get("/api/entreprises").json()["total"] == 3
    assert client.get("/api/entreprises?secteur_id=2").json()["total"] == 1
    assert client.get("/api/entreprises?domaine_id=1").json()["total"] == 2
    assert client.get("/api/entreprises?ville_id=3").json()["items"][0]["nom"] == "Ferme du Pool"
    assert client.get("/api/entreprises?q=légumes").json()["total"] == 1
    # tri legacy : secteur (libellé) puis nom
    noms = [e["nom"] for e in client.get("/api/entreprises").json()["items"]]
    assert noms == ["Ferme du Pool", "Atelier Web", "Bomoye Services"]
    assert [e["nom"] for e in client.get("/api/entreprises?tri=nom").json()["items"]][0] == "Atelier Web"

    # une fiche retirée par la modération n'est plus publique, mais reste visible de son auteur
    r = client.post(f"/api/entreprises/{id1}/etat", json={"etat": 1}, headers=entetes(client, "admin"))
    assert r.status_code == 200
    assert client.get("/api/entreprises").json()["total"] == 2
    assert client.get("/api/entreprises", headers=h).json()["total"] == 3
    assert client.get(f"/api/entreprises/{id1}").status_code == 404
    assert client.get("/api/entreprises?miennes=true", headers=h).json()["total"] == 3


def test_fiche_publique_coordonnees_et_visites(client):
    creer_membre("patron")
    creer_membre("curieux")
    h = entetes(client, "patron")
    id_ = client.post("/api/entreprises", json=ENTREPRISE, headers=h).json()["id"]
    public = client.get(f"/api/entreprises/{id_}").json()
    # annuaire : les coordonnées de l'entreprise sont publiques ; l'auteur n'est montré que par son pseudonyme
    assert public["telephone"] == "061234567" and public["email"] == "contact@bomoye.cg"
    assert public["auteur"]["pseudonyme"] == "patron" and "telephone" not in public["auteur"]
    assert public["peut_modifier"] is False and public["comparateur"] == {"offres": 0, "demandes": 0}
    client.get(f"/api/entreprises/{id_}", headers=entetes(client, "curieux"))
    client.get(f"/api/entreprises/{id_}", headers=h)  # l'auteur ne compte pas
    fiche = client.get(f"/api/entreprises/{id_}", headers=h).json()
    assert fiche["nombre_visites"] == 2 and fiche["date_derniere_visite"] and fiche["peut_modifier"] is True


def test_modification_suppression_et_moderation_reservees(client):
    creer_membre("patron")
    creer_membre("autre")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "patron")
    id_ = client.post("/api/entreprises", json=ENTREPRISE, headers=h).json()["id"]

    assert client.put(f"/api/entreprises/{id_}", json=ENTREPRISE, headers=entetes(client, "autre")).status_code == 403
    assert client.delete(f"/api/entreprises/{id_}", headers=entetes(client, "autre")).status_code == 403
    r = client.post(f"/api/entreprises/{id_}/etat", json={"etat": 3}, headers=entetes(client, "admin_sans_droit"))
    assert r.status_code == 403

    r = client.put(f"/api/entreprises/{id_}", json={**ENTREPRISE, "gerant": "Nouvelle gérante"}, headers=entetes(client, "admin"))
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."
    # modifier sa fiche sans changer de nom n'est pas un doublon
    assert client.put(f"/api/entreprises/{id_}", json=ENTREPRISE, headers=h).status_code == 200

    assert client.delete(f"/api/entreprises/{id_}", headers=h).status_code == 200
    assert client.get(f"/api/entreprises/{id_}").status_code == 404
    assert client.get(f"/api/entreprises/{id_}", headers=h).status_code == 404  # supprimée : plus visible de l'auteur
    # le nom est de nouveau disponible
    assert client.post("/api/entreprises", json=ENTREPRISE, headers=h).status_code == 201


def test_mes_entreprises(client):
    creer_membre("patron")
    creer_membre("autre")
    h = entetes(client, "patron")
    id1 = client.post("/api/entreprises", json=ENTREPRISE, headers=h).json()["id"]
    id2 = client.post("/api/entreprises", json={**ENTREPRISE, "nom": "Atelier Web"}, headers=h).json()["id"]
    client.post("/api/entreprises", json={**ENTREPRISE, "nom": "Chez Autre"}, headers=entetes(client, "autre"))
    client.delete(f"/api/entreprises/{id2}", headers=h)
    miennes = client.get("/api/entreprises/miennes", headers=h).json()
    assert [e["id"] for e in miennes] == [id1]
    assert set(miennes[0]) >= {"id", "nom", "reference", "forme_juridique", "etat", "logo_url"}
    assert client.get("/api/entreprises/miennes").status_code == 401


def test_logo(client):
    creer_membre("patron")
    creer_membre("autre")
    h = entetes(client, "patron")
    id_ = client.post("/api/entreprises", json=ENTREPRISE, headers=h).json()["id"]
    tampon = io.BytesIO()
    Image.new("RGB", (40, 30), (31, 61, 99)).save(tampon, "PNG")
    fichier = {"fichier": ("logo.png", tampon.getvalue(), "image/png")}
    assert client.post(f"/api/entreprises/{id_}/logo", files=fichier, headers=entetes(client, "autre")).status_code == 403
    r = client.post(f"/api/entreprises/{id_}/logo", files=fichier, headers=h)
    assert r.status_code == 200, r.text
    assert client.get(f"/api/entreprises/{id_}").json()["logo_url"].startswith("/media/entreprises/")
    r = client.post(f"/api/entreprises/{id_}/logo", files={"fichier": ("x.txt", b"pas une image", "text/plain")}, headers=h)
    assert r.status_code == 400 and "logo" in r.json()["champs"]
