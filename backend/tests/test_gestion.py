"""Back-office : accès, membres, droits, code de pointage, réinitialisations, tableau de bord,
file de modération (F-ADM-05 à F-ADM-15, F-ADM-39, F-ADM-40, F-TRV-06, F-TRV-70)."""

from datetime import datetime, timedelta

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre
from app.security import verifier_mot_de_passe

G = TypeMembre.GESTIONNAIRE
TOUS_DROITS = {"droit_attribution": True, "droit_caisse": True, "droit_activation": True}

NOUVEAU = {
    "type_compte": 3, "categorie": 1, "nom": "Mabiala Grace", "pseudonyme": "gracem", "identifiant": "grace.m",
    "telephone": "06 123 45 67", "ville_id": 2, "etat": 2,
}


def preparer(client, **droits) -> dict:
    """Compte système n° 1 (masqué) puis un gestionnaire « admin » (tous droits par défaut)."""
    creer_membre("systeme", type_compte=G, **TOUS_DROITS)
    creer_membre("admin", type_compte=G, **(droits or TOUS_DROITS))
    return entetes(client, "admin")


def test_acces_reserve_aux_gestionnaires(client):
    creer_membre("systeme", type_compte=G)
    creer_membre("simple")
    h = entetes(client, "simple")
    for url in ("/api/gestion/tableau-de-bord", "/api/gestion/membres", "/api/gestion/referentiels/villes",
                "/api/gestion/journaux/visites", "/api/gestion/parametres", "/api/gestion/moderation",
                "/api/gestion/reinitialisations"):
        assert client.get(url).status_code == 401, url
        assert client.get(url, headers=h).status_code == 403, url
    assert client.post("/api/gestion/membres", json=NOUVEAU, headers=h).status_code == 403


def test_liste_filtres_et_compte_systeme_masque(client):
    h = preparer(client)
    creer_membre("nouveau1", nom="Zola Kiminou", telephone="061112233", etat=1)
    creer_membre("entrep", nom="AGRI CONGO", categorie=2, observation="client fidèle")
    creer_membre("parti", nom="Parti Ancien", etat=3)
    liste = client.get("/api/gestion/membres", headers=h).json()
    noms = [x["nom"] for x in liste["items"]]
    assert liste["total"] == 3 and "Parti Ancien" not in noms  # supprimés et compte n° 1 exclus
    assert client.get("/api/gestion/membres?etat=3", headers=h).json()["total"] == 1
    assert client.get("/api/gestion/membres?etat=1", headers=h).json()["items"][0]["nom"] == "Zola Kiminou"
    assert client.get("/api/gestion/membres?q=06 111 22", headers=h).json()["total"] == 1  # téléphone
    assert client.get("/api/gestion/membres?q=fidèle", headers=h).json()["total"] == 1  # observation
    assert client.get("/api/gestion/membres?categorie=2", headers=h).json()["total"] == 1
    assert client.get("/api/gestion/membres?type_compte=1", headers=h).json()["total"] == 1
    recents = client.get("/api/gestion/membres?tri=recents", headers=h).json()["items"]
    assert recents[0]["nom"] == "AGRI CONGO"
    # masqué des listes, mais sa fiche reste consultable (des fiches y renvoient comme auteur)
    assert client.get("/api/gestion/membres/1", headers=h).status_code == 200
    # le compte système se voit lui-même
    hs = entetes(client, "systeme")
    assert client.get("/api/gestion/membres", headers=hs).json()["total"] == 4


def test_creation_avec_lien_activation(client):
    h = preparer(client)
    r = client.post("/api/gestion/membres", json={**NOUVEAU, "pseudonyme": "gra", "identifiant": "a b"}, headers=h)
    assert r.status_code == 400 and {"pseudonyme", "identifiant"} <= set(r.json()["champs"])

    r = client.post("/api/gestion/membres", json=NOUVEAU, headers=h)
    assert r.status_code == 201, r.text
    corps = r.json()
    assert corps["reference"].startswith("MBR")
    lien = corps["activation"]
    assert lien["chemin"].startswith("/reinitialiser/") and "grace.m" in lien["message_whatsapp"]
    # le mot de passe n'existe pas encore : le membre le choisit avec le lien
    jeton = lien["chemin"].rsplit("/", 1)[1]
    r = client.post("/api/auth/reinitialiser", json={"jeton": jeton, "nouveau": "monsecret1", "confirmation": "monsecret1"})
    assert r.status_code == 200, r.text
    assert client.post("/api/auth/login", json={"identifiant": "grace.m", "mot_de_passe": "monsecret1"}).status_code == 200

    # doublons (identifiant, téléphone)
    r = client.post("/api/gestion/membres", json={**NOUVEAU, "pseudonyme": "autrepseudo"}, headers=h)
    assert r.status_code == 400 and {"identifiant", "telephone"} <= set(r.json()["champs"])

    # mot de passe fourni : pas de lien
    r = client.post("/api/gestion/membres", json={
        **NOUVEAU, "identifiant": "comptoir", "pseudonyme": "SGC", "categorie": 2, "nom": "Société Générale",
        "telephone": "", "type_partenaire": 1, "mot_de_passe": "unmotdepasse"}, headers=h)
    assert r.status_code == 201 and r.json()["activation"] is None
    # F-TRV-23 : une personne morale « Banque » alimente le référentiel des banques
    with SessionLocal() as db:
        assert db.query(m.Banque).filter_by(membre_id=r.json()["id"]).count() == 1


def test_creation_gestionnaire_exige_attribution(client):
    h = preparer(client, droit_activation=True)
    r = client.post("/api/gestion/membres", json={**NOUVEAU, "type_compte": 1}, headers=h)
    assert r.status_code == 403
    assert client.post("/api/gestion/membres", json=NOUVEAU, headers=h).status_code == 201
    # sans droit Activation, aucune écriture
    creer_membre("lecteur", type_compte=G)
    assert client.post("/api/gestion/membres", json={**NOUVEAU, "identifiant": "x1234", "pseudonyme": "xxxxxx",
                                                      "telephone": ""}, headers=entetes(client, "lecteur")).status_code == 403


def test_modification_complete_sans_toucher_aux_droits(client):
    h = preparer(client)
    id_ = creer_membre("gest2", type_compte=G, droit_caisse=True)
    fiche = client.get(f"/api/gestion/membres/{id_}", headers=h).json()
    assert fiche["peut_modifier"] and "mot_de_passe_hash" not in fiche and "code_pointage_hash" not in fiche
    corps = {**NOUVEAU, "type_compte": 1, "identifiant": "gest2", "pseudonyme": "gestionnaire2", "nom": "Nouveau Nom",
             "telephone": "", "observation": "Caissière du samedi"}
    r = client.put(f"/api/gestion/membres/{id_}", json=corps, headers=h)
    assert r.status_code == 200, r.text
    fiche = client.get(f"/api/gestion/membres/{id_}", headers=h).json()
    assert fiche["nom"] == "Nouveau Nom" and fiche["droit_caisse"] is True  # correctif F-ADM-12

    # rétrogradé en membre : il perd ses droits d'administration
    client.put(f"/api/gestion/membres/{id_}", json={**corps, "type_compte": 3}, headers=h)
    assert client.get(f"/api/gestion/membres/{id_}", headers=h).json()["droit_caisse"] is False


def test_droits_reserves_a_l_attribution(client):
    h = preparer(client)
    id_ = creer_membre("gest2", type_compte=G, droit_activation=True)
    simple = creer_membre("simple")
    h2 = entetes(client, "gest2")
    droits = {"droit_attribution": False, "droit_caisse": True, "droit_activation": True}
    assert client.put(f"/api/gestion/membres/{id_}/droits", json=droits, headers=h2).status_code == 403
    assert client.put(f"/api/gestion/membres/{id_}/droits", json=droits, headers=h).status_code == 200
    assert client.get(f"/api/gestion/membres/{id_}", headers=h).json()["droit_caisse"] is True
    assert client.put(f"/api/gestion/membres/{simple}/droits", json=droits, headers=h).status_code == 400
    moi = client.get("/api/auth/me", headers=h).json()["id"]
    r = client.put(f"/api/gestion/membres/{moi}/droits", json=droits, headers=h)
    assert r.status_code == 403 and "propre droit" in r.json()["message"]
    # gest2 (activation sans attribution) ne peut pas agir sur le compte d'un autre gestionnaire
    assert client.post(f"/api/gestion/membres/{moi}/reinitialisation", headers=h2).status_code == 403
    assert client.post(f"/api/gestion/membres/{moi}/etat", json={"etat": 3}, headers=h2).status_code == 403


def test_validation_message_et_suppression_deconnecte(client):
    h = preparer(client)
    id_ = creer_membre("nouveau", etat=1)
    hm = entetes(client, "nouveau")
    assert client.post(f"/api/gestion/membres/{id_}/etat", json={"etat": 2}, headers=h).json()["message"] == "Membre validé."
    assert client.get("/api/espace/compteurs", headers=hm).json()["messages_non_lus"] == 1
    assert client.delete(f"/api/gestion/membres/{id_}", headers=h).status_code == 200
    assert client.get("/api/auth/me", headers=hm).status_code == 401
    moi = client.get("/api/auth/me", headers=h).json()["id"]
    assert client.delete(f"/api/gestion/membres/{moi}", headers=h).status_code == 403


def test_code_pointage_quatre_chiffres_hache(client):
    h = preparer(client)
    id_ = creer_membre("epargnant", point_caisse_actif=True)
    r = client.post(f"/api/gestion/membres/{id_}/code-pointage", headers=h)
    assert r.status_code == 200
    code = r.json()["code"]
    assert len(code) == 4 and code.isdigit()
    with SessionLocal() as db:
        h_code = db.get(m.Membre, id_).code_pointage_hash
    assert h_code != code and verifier_mot_de_passe(code, h_code)
    assert client.get(f"/api/gestion/membres/{id_}", headers=h).json()["a_code_pointage"] is True


def test_reinitialisation_depuis_demande_mot_de_passe_oublie(client):
    h = preparer(client)
    creer_membre("oubli", nom="Oubli Test", pseudonyme="oublieux", telephone="061112233")
    creer_membre("autre", nom="Autre Test", pseudonyme="autre1", telephone="061112244")
    for nom, pseudo, tel in (("oubli test", "oublieux", "061112233"), ("autre test", "autre1", "061112244")):
        client.post("/api/auth/mot-de-passe-oublie", json={"categorie": 1, "nom": nom, "pseudonyme": pseudo, "telephone": tel})
    attente = client.get("/api/gestion/reinitialisations", headers=h).json()
    assert attente["total"] == 2 and attente["items"][0]["statut"] == "en_attente"
    assert client.get("/api/gestion/compteurs", headers=h).json()["reinitialisations_en_attente"] == 2

    demande = next(x for x in attente["items"] if x["membre"]["pseudonyme"] == "oublieux")
    lien = client.post(f"/api/gestion/reinitialisations/{demande['id']}/traiter", headers=h).json()
    assert "motdepasse1" not in str(lien) and lien["telephone"] == "061112233"
    autre = next(x for x in attente["items"] if x["membre"]["pseudonyme"] == "autre1")
    assert client.post(f"/api/gestion/reinitialisations/{autre['id']}/ignorer", headers=h).status_code == 200
    assert client.get("/api/gestion/reinitialisations", headers=h).json()["total"] == 0

    # un second lien invalide le premier
    lien2 = client.post(f"/api/gestion/membres/{demande['membre']['id']}/reinitialisation", headers=h).json()
    ancien = lien["chemin"].rsplit("/", 1)[1]
    assert client.post("/api/auth/reinitialiser", json={"jeton": ancien, "nouveau": "nouveau123", "confirmation": "nouveau123"}).status_code == 400
    jeton = lien2["chemin"].rsplit("/", 1)[1]
    assert client.post("/api/auth/reinitialiser", json={"jeton": jeton, "nouveau": "nouveau123", "confirmation": "nouveau123"}).status_code == 200
    assert client.post("/api/auth/login", json={"identifiant": "oubli", "mot_de_passe": "nouveau123"}).status_code == 200
    historique = client.get("/api/gestion/reinitialisations?statut=toutes", headers=h).json()["items"]
    assert {x["statut"] for x in historique} >= {"utilise", "expire", "prise_en_charge", "ignoree"}


def test_tableau_de_bord_et_file_de_moderation(client):
    h = preparer(client)
    auteur = creer_membre("auteur", etat=1)
    with SessionLocal() as db:
        db.add(m.AnnonceEmploi(auteur_id=auteur, type_annonce=2, reference="OE1", poste_a_pourvoir="Comptable", etat=1))
        db.add(m.Immobilier(auteur_id=auteur, reference="IMB1", description="Villa à Bacongo", etat=1))
        db.add(m.Immobilier(auteur_id=auteur, reference="IMB2", description="Déjà publiée", etat=2))
        db.add(m.Paiement(membre_id=auteur, type_objet=4, mode=1, montant=5000, etat=2))
        db.add(m.Visite(adresse_ip="1.2.3.4", date_heure=datetime.now() - timedelta(days=2)))
        db.add(m.Visite(adresse_ip="1.2.3.5", date_heure=datetime.now() - timedelta(days=20)))
        db.commit()
    t = client.get("/api/gestion/tableau-de-bord", headers=h).json()
    assert t["nouveaux_membres"] == 1 and t["paiements_en_attente"] == 1 and t["montant_en_attente"] == 5000
    assert t["fiches_en_attente"] == 2 and t["visites_7j"] == 1 and t["visites_30j"] == 2 and len(t["serie"]) == 30
    assert t["derniers_inscrits"][0]["pseudonyme"] == "auteur" and t["droits"]["attribution"] is True
    file = client.get("/api/gestion/moderation", headers=h).json()
    assert file["total"] == 2 and {x["lien"] for x in file["items"]} >= {"/emplois/1"}
    assert file["items"][0]["auteur_pseudonyme"] == "auteur"
    immo = client.get("/api/gestion/moderation?module=immobilier", headers=h).json()
    assert immo["total"] == 1 and immo["items"][0]["titre"] == "Villa à Bacongo"
    assert client.get("/api/gestion/moderation?module=inconnu", headers=h).status_code == 400


def test_export_csv(client):
    h = preparer(client)
    creer_membre("formule", nom="=HYPERLINK(1)")
    r = client.get("/api/gestion/membres/export", headers=h)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    texte = r.content.decode("utf-8-sig")
    assert texte.startswith("Code;Type") and "'=HYPERLINK(1)" in texte
